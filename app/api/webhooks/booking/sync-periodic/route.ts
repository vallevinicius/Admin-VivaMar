import { NextRequest, NextResponse } from 'next/server';
import { syncBookingReservationsWithRetry } from '@/services/bookingSyncService';
import { getDb } from '@/lib/db';

/**
 * POST /api/webhooks/booking/sync-periodic
 *
 * Background sync job para sincronizar todas as reservas dos próximos 90 dias
 *
 * ⚠️ SEGURANÇA: Proteger com API_KEY
 * - Pode ser acionado por: Vercel Cron, n8n, Zapier, AWS Lambda, etc.
 * - NUNCA exponha esse endpoint sem autenticação
 *
 * Uso:
 * curl -X POST https://vivamarpousada.com/api/webhooks/booking/sync-periodic \
 *   -H "X-API-Key: $INTERNAL_API_KEY"
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // 1️⃣ Validar API key
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      console.warn(
        `[Booking Sync Periodic] Chave API inválida`,
        { requestId, hasKey: !!apiKey }
      );
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(
      `[Booking Sync Periodic] Iniciando sincronização periódica`,
      { requestId }
    );

    // 2️⃣ Calcular período: hoje até +90 dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(
      `[Booking Sync Periodic] Sincronizando período`,
      { requestId, startDateStr, endDateStr }
    );

    // 3️⃣ Sincronizar para TODOS os tenants com Booking configurado
    const { Tenant } = await getDb();
    const tenants = await Tenant.findAll({
      where: {
        status: 'active',
        // ⚠️ Apenas tenants com Booking configurado
        bookingHotelId: {
          [require('sequelize').Op.not]: null,
        },
      },
      attributes: ['id', 'name', 'bookingHotelId'],
    });

    console.log(
      `[Booking Sync Periodic] Encontrados ${tenants.length} tenants para sincronizar`,
      { requestId }
    );

    let synced = 0;
    const errors: Array<{ tenantId: number; error: string }> = [];

    // 4️⃣ Sincronizar cada tenant em paralelo (com limite)
    // ⚠️ Não usar Promise.all() — pode sobrecarregar DB
    const batchSize = 5;
    for (let i = 0; i < tenants.length; i += batchSize) {
      const batch = tenants.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((tenant) =>
          syncBookingReservationsWithRetry(
            tenant.id,
            startDateStr,
            endDateStr,
            3 // max retries
          ).then(() => tenant.id)
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          synced++;
          console.log(
            `[Booking Sync Periodic] Tenant sincronizado`,
            { requestId, tenantId: result.value }
          );
        } else {
          const tenantId = batch[results.indexOf(result)]?.id;
          const errorMsg = result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);

          errors.push({
            tenantId: tenantId || 0,
            error: errorMsg,
          });

          console.error(
            `[Booking Sync Periodic] Erro ao sincronizar tenant`,
            { requestId, tenantId, error: errorMsg }
          );
        }
      }
    }

    // 5️⃣ Responder com resumo
    const duration = Date.now() - startTime;
    const response = {
      requestId,
      status: 'completed',
      synced,
      failed: errors.length,
      total: tenants.length,
      duration: `${duration}ms`,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(
      `[Booking Sync Periodic] Completado`,
      response
    );

    return NextResponse.json(response, {
      status: errors.length === 0 ? 200 : 207, // 207 Multi-Status se houver erros parciais
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Booking Sync Periodic] Erro fatal`,
      { requestId, duration, error }
    );

    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}
