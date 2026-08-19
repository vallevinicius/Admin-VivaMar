import { NextRequest, NextResponse } from 'next/server';
import { bookingClient } from '@/lib/booking-client';
import { syncBookingReservationsWithRetry } from '@/services/bookingSyncService';
import { getDb } from '@/lib/db';

/**
 * POST /api/webhooks/booking
 *
 * Webhook receiver para eventos do Booking.com
 *
 * SEGURANÇA:
 * ✓ Validar assinatura HMAC-SHA256
 * ✓ Processar async (não bloquear resposta)
 * ✓ Retornar 200 para Booking não retentar, mesmo se erro
 * ✓ Logging de todas as operações
 *
 * ⚠️ IMPORTANTE:
 * - Sempre retornar 200 para Booking (não fazer retry)
 * - Processar síncronamente é melhor com job queue (Bull, RabbitMQ)
 * - Aqui usamos setImmediate (simples, mas perde jobs em crash)
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1️⃣ Ler body como texto para validar assinatura
    const body = await request.text();
    const signature = request.headers.get('x-booking-signature');

    console.log(
      `[Booking Webhook] Recebido evento`,
      {
        requestId,
        contentLength: body.length,
        hasSignature: !!signature,
      }
    );

    // 2️⃣ Validar assinatura
    if (!signature || !bookingClient.verifyWebhookSignature(body, signature)) {
      console.warn(
        `[Booking Webhook] Assinatura inválida`,
        { requestId, signature }
      );
      // ⚠️ Retornar 401 para Booking saber que falhou
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // 3️⃣ Parse JSON
    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      console.error(
        `[Booking Webhook] JSON malformado`,
        { requestId }
      );
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // 4️⃣ Extrair dados da reserva
    // ⚠️ Booking pode enviar em diferentes formatos
    const eventData = event as Record<string, unknown>;
    const reservation =
      (eventData.reservation as Record<string, unknown>) ||
      (eventData.data as Record<string, unknown>);

    if (!reservation) {
      console.warn(
        `[Booking Webhook] Evento mal formatado (sem reservation/data)`,
        { requestId }
      );
      // ⚠️ Ainda retornar 200 porque é problema de formato, Booking não vai consertar
      return NextResponse.json({ ok: true });
    }

    const bookingHotelId = (eventData.property_id || eventData.hotel_id) as string;
    if (!bookingHotelId) {
      console.warn(
        `[Booking Webhook] Sem property_id/hotel_id`,
        { requestId }
      );
      return NextResponse.json({ ok: true });
    }

    // 5️⃣ Encontrar tenant pelo hotel_id
    const { Tenant } = await getDb();
    const tenant = await Tenant.findOne({
      where: { bookingHotelId },
    });

    if (!tenant) {
      console.warn(
        `[Booking Webhook] Tenant não encontrado para hotel ${bookingHotelId}`,
        { requestId, bookingHotelId }
      );
      // ⚠️ Retornar 200 mesmo assim (sem tenant = sem erro do nosso lado)
      return NextResponse.json({ ok: true });
    }

    console.log(
      `[Booking Webhook] Encontrado tenant`,
      { requestId, tenantId: tenant.id, tenantName: tenant.name }
    );

    // 6️⃣ Sincronizar em BACKGROUND (não bloquear resposta)
    // ⚠️ IMPORTANTE: Retornar 200 ANTES de processar
    const response = NextResponse.json({ ok: true }, { status: 200 });

    // Processar após resposta ser enviada
    // ⚠️ NOTA: Isso pode perder jobs se o app crashar
    // Para produção robusta, usar job queue
    setImmediate(async () => {
      try {
        const checkInDate = (reservation.check_in_date as string) || new Date().toISOString().split('T')[0];
        const checkOutDate = (reservation.check_out_date as string) || new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // Sincronizar ±7 dias do evento
        const start = new Date(checkInDate);
        start.setDate(start.getDate() - 7);
        const end = new Date(checkOutDate);
        end.setDate(end.getDate() + 7);

        const result = await syncBookingReservationsWithRetry(
          tenant.id,
          start.toISOString().split('T')[0],
          end.toISOString().split('T')[0],
          3 // max 3 retries
        );

        const duration = Date.now() - startTime;
        console.log(
          `[Booking Webhook] Sincronização concluída`,
          { requestId, tenantId: tenant.id, duration, ...result }
        );
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(
          `[Booking Webhook] Erro na sincronização`,
          { requestId, tenantId: tenant.id, duration, error }
        );
        // ⚠️ Não fazer throw aqui — resposta ao Booking já foi enviada
      }
    });

    return response;
  } catch (error) {
    console.error(
      `[Booking Webhook] Erro fatal`,
      { requestId, error }
    );
    // ⚠️ Retornar 500 apenas em erros fatais
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS para CORS pré-flight (se necessário)
 */
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
