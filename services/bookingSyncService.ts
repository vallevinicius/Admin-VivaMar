import { getDb } from '@/lib/db';
import { bookingClient, type BookingReservation } from '@/lib/booking-client';

/**
 * Mapear status Booking → nosso modelo
 */
function mapBookingStatus(
  bookingStatus: string
): 'confirmed' | 'pending' | 'cancelled' {
  const mapping: Record<string, 'confirmed' | 'pending' | 'cancelled'> = {
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    CANCELLED: 'cancelled',
  };
  return mapping[bookingStatus] || 'pending';
}

/**
 * ⚠️ CRÍTICO: Sincronização deve ser ATÔMICA
 * Se falhar no meio, precisa de rollback automático
 *
 * Abordagem de Conflito:
 * 1. Se reserva local foi editada nos últimos 5 min → não sobrescrever
 * 2. Senão → Booking vence (fonte da verdade)
 */
export async function syncBookingReservations(
  tenantId: number,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
) {
  const { sequelize, Reservation, Room, Tenant } = await getDb();

  return sequelize.transaction(async (transaction) => {
    try {
      // 1️⃣ Validar que tenant tem bookingHotelId configurado
      const tenant = await Tenant.findOne({
        where: { id: tenantId },
        transaction,
      });

      if (!tenant || !tenant.bookingHotelId) {
        throw new Error(`Tenant ${tenantId} não tem Booking configurado`);
      }

      // 2️⃣ Buscar reservas do Booking para o período
      console.log(
        `[Booking Sync] Sincronizando ${startDate} a ${endDate} para tenant ${tenantId}`
      );
      const bookingReservations = await bookingClient.getReservations(
        startDate,
        endDate
      );

      let created = 0;
      let updated = 0;
      let conflicted = 0;

      // 3️⃣ Para cada reserva do Booking
      for (const bookingRes of bookingReservations) {
        try {
          // 🔍 Encontrar quarto no nosso sistema pelo nome
          const room = await Room.findOne({
            where: { tenantId, name: bookingRes.room_name },
            transaction,
            lock: transaction.LOCK.UPDATE, // ⚠️ Lock pessimista
          });

          if (!room) {
            console.warn(
              `[Booking Sync] Quarto não encontrado: "${bookingRes.room_name}" (tenant ${tenantId})`
            );
            continue;
          }

          // 🔍 Procurar reserva existente
          // ⚠️ IMPORTANTE: Usar booking ID como chave única
          let reservation = await Reservation.findOne({
            where: {
              tenantId,
              channelReference: bookingRes.id, // ID único do Booking
              otaSource: 'booking',
            },
            transaction,
            lock: transaction.LOCK.UPDATE, // ⚠️ Lock pessimista
          });

          if (!reservation) {
            // ✅ CRIAR nova reserva
            reservation = await Reservation.create(
              {
                tenantId,
                roomId: room.id,
                // ⚠️ channexReservationId é usado internamente (Channex é um agregador)
                // Para Booking direto, usamos formato: booking-{booking_id}
                channexReservationId: `booking-${bookingRes.id}-${Date.now()}`,
                channelReference: bookingRes.id,
                otaSource: 'booking',
                guestName: bookingRes.guest_name,
                guestEmail: bookingRes.guest_email,
                guestPhone: bookingRes.guest_phone,
                guestCpf: null, // Booking não fornece CPF brasileiro
                checkIn: bookingRes.check_in_date,
                checkOut: bookingRes.check_out_date,
                status: mapBookingStatus(bookingRes.status),
                amount: bookingRes.total_price,
                currency: bookingRes.currency,
                notes: bookingRes.special_requests || '',
              },
              { transaction }
            );

            console.log(
              `[Booking Sync] Criada reserva ${bookingRes.id} (tenant ${tenantId})`
            );
            created++;
          } else {
            // ⚠️ CONFLITO POTENCIAL: Decidir qual versão usar
            const locallyEditedRecently =
              reservation.updatedAt &&
              reservation.updatedAt > new Date(Date.now() - 5 * 60000); // 5 min

            if (locallyEditedRecently) {
              // ❌ Não sobrescrever — local foi editado recentemente
              console.warn(
                `[Booking Sync] Conflito! Booking ID ${bookingRes.id} foi editado localmente em ${reservation.updatedAt.toISOString()}`
              );
              conflicted++;
              continue;
            }

            // ✅ ATUALIZAR com dados do Booking (Booking é fonte de verdade)
            await reservation.update(
              {
                checkIn: bookingRes.check_in_date,
                checkOut: bookingRes.check_out_date,
                status: mapBookingStatus(bookingRes.status),
                amount: bookingRes.total_price,
                currency: bookingRes.currency,
                notes: bookingRes.special_requests || '',
              },
              { transaction }
            );

            console.log(
              `[Booking Sync] Atualizada reserva ${bookingRes.id} (tenant ${tenantId})`
            );
            updated++;
          }
        } catch (error) {
          // ❌ Erro em UMA reserva não cancela toda sincronização
          console.error(
            `[Booking Sync] Erro ao processar ${bookingRes.id}:`,
            error
          );
        }
      }

      console.log(
        `[Booking Sync] Resumo - Criadas: ${created}, Atualizadas: ${updated}, Conflitos: ${conflicted}`
      );

      return { created, updated, conflicted };
    } catch (error) {
      console.error('[Booking Sync] Erro crítico:', error);
      // Rollback automático da transação
      throw error;
    }
  });
}

/**
 * Sincronizar com retry e exponential backoff
 * Útil para job de cron que pode falhar temporariamente
 */
export async function syncBookingReservationsWithRetry(
  tenantId: number,
  startDate: string,
  endDate: string,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await syncBookingReservations(tenantId, startDate, endDate);
    } catch (error) {
      lastError = error as Error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
      console.warn(
        `[Booking Sync Retry] Tentativa ${attempt}/${maxRetries} falhou, aguardando ${delay}ms`,
        error
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
