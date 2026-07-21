'use server';

import { Op } from 'sequelize';
import { getVerifiedTenantSession, hasFeatureAccess } from '@/lib/tenant-session';
import { getDb } from '@/lib/db';
import type { Reservation } from '@/types/domain';
import {
  differenceInNights,
  findBlockingClosure,
  getRoomEffectivePrice,
  getRoomMinimumStay,
  type RoomSeasonalRate,
} from '@/lib/room-policies';

type ManualReservationInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  entryType: 'manual_reservation' | 'blocked';
  amount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCpf?: string;
  notes: string;
};

type ReservationCreationContext = ManualReservationInput & {
  tenantId: number;
  createdByUserId?: number | null;
  // Quando true, o preço enviado pelo cliente é ignorado e recalculado no
  // servidor (usado pelo fluxo público, onde o `amount` não é confiável).
  recomputePrice?: boolean;
  couponCode?: string;
};

function parseStoredPolicyArray(input: unknown) {
  if (Array.isArray(input)) {
    return input;
  }

  if (typeof input !== 'string' || input.trim().length === 0) {
    return [] as unknown[];
  }

  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as unknown[];
  }
}

function normalizeCpf(input: string | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) {
    return null;
  }

  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length !== 11) {
    throw new Error('CPF inválido. Informe 11 dígitos.');
  }

  return digitsOnly;
}

async function createReservationWithRules(input: ReservationCreationContext): Promise<Reservation> {
  const { sequelize, Room, Reservation, Coupon } = await getDb();
  const normalizedCpf = normalizeCpf(input.guestCpf);

  return sequelize.transaction(async (transaction) => {
    // Trava a linha do quarto para serializar tentativas concorrentes de reserva
    // do mesmo quarto e evitar overbooking em requisições simultâneas.
    const room = await Room.findOne({
      where: { tenantId: input.tenantId, localRoomId: input.roomId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!room) {
      throw new Error('Quarto não encontrado para o tenant.');
    }

    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      throw new Error('Período inválido para a reserva.');
    }

    const roomPolicy = {
      minStayNights: room.minStayNights,
      minStayDays: room.minStayDays,
      seasonalRates: parseStoredPolicyArray(room.seasonalRates),
      closurePeriods: parseStoredPolicyArray(room.closurePeriods),
    };

    const minimumStay = getRoomMinimumStay(roomPolicy, checkIn);
    const stayLength = differenceInNights(checkIn, checkOut);

    if (minimumStay.nights > 0 && stayLength < minimumStay.nights) {
      throw new Error(`Este quarto exige pelo menos ${minimumStay.nights} noites.`);
    }

    if (minimumStay.days > 0 && stayLength < minimumStay.days) {
      throw new Error(`Este quarto exige pelo menos ${minimumStay.days} dias.`);
    }

    const blockingClosure = findBlockingClosure(roomPolicy, checkIn, checkOut);
    if (blockingClosure) {
      throw new Error('Este quarto está fechado ou bloqueado para o período informado.');
    }

    const overlappingReservations = await Reservation.findAll({
      where: {
        tenantId: input.tenantId,
        roomId: room.id,
        status: { [Op.ne]: 'cancelled' },
        checkIn: { [Op.lt]: checkOut },
        checkOut: { [Op.gt]: checkIn },
      },
      attributes: ['unitNumber'],
      transaction,
    });

    if (overlappingReservations.length >= room.quantity) {
      throw new Error('Não há unidades disponíveis deste quarto para este período.');
    }

    const takenUnits = new Set(overlappingReservations.map((reservation) => reservation.unitNumber ?? 1));
    let assignedUnit = 1;
    while (takenUnits.has(assignedUnit) && assignedUnit <= room.quantity) {
      assignedUnit += 1;
    }

    let amount = input.amount;

    if (input.recomputePrice) {
      const pricePerNight = getRoomEffectivePrice(
        { price: Number(room.price), seasonalRates: roomPolicy.seasonalRates as RoomSeasonalRate[] },
        checkIn,
      );
      let computedAmount = pricePerNight * stayLength;

      if (input.couponCode) {
        const coupon = await Coupon.findOne({
          where: { tenantId: input.tenantId, code: input.couponCode.toUpperCase() },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!coupon || coupon.status !== 'active') {
          throw new Error('Cupom inválido ou inativo.');
        }

        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw new Error('Este cupom já atingiu o limite de uso.');
        }

        computedAmount = computedAmount * (1 - Number(coupon.discountPercentage) / 100);
        await coupon.increment('usedCount', { by: 1, transaction });
      }

      amount = Math.max(0, Math.round(computedAmount * 100) / 100);
    }

    const created = await Reservation.create(
      {
        roomId: room.id,
        tenantId: input.tenantId,
        channexReservationId: `manual_${Date.now()}`,
        otaSource: 'manual',
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        status: input.entryType === 'manual_reservation' ? 'confirmed' : 'blocked',
        channelReference: input.entryType === 'manual_reservation' ? 'MANUAL-RES' : 'MANUAL-BLOCK',
        amount: input.entryType === 'manual_reservation' ? amount : 0,
        currency: 'BRL',
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone,
        guestCpf: normalizedCpf,
        notes: input.notes,
        createdByUserId: input.createdByUserId ?? null,
        unitNumber: assignedUnit,
      },
      { transaction },
    );

    return {
      id: created.channexReservationId,
      roomId: room.localRoomId,
      checkIn: created.checkIn.slice(0, 10),
      checkOut: created.checkOut.slice(0, 10),
      status: created.status,
      otaSource: created.otaSource,
      channelReference: created.channelReference,
      amount: Number(created.amount),
      currency: created.currency,
      customer: {
        name: created.guestName,
        email: created.guestEmail,
        phone: created.guestPhone,
        cpf: (created.guestCpf as string | null) ?? undefined,
      },
      notes: created.notes,
    };
  });
}

export async function createManualReservationAction(input: ManualReservationInput): Promise<Reservation> {
  const session = await getVerifiedTenantSession();

  if (!session) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  if (!hasFeatureAccess(session, 'reservations')) {
    throw new Error('Sem permissão para esta ação.');
  }

  if (input.entryType === 'manual_reservation') {
    if (
      !input.roomId ||
      !input.checkIn ||
      !input.checkOut ||
      !input.guestName ||
      !input.guestEmail ||
      !input.guestPhone ||
      !input.guestCpf ||
      input.amount <= 0 ||
      !input.notes
    ) {
      throw new Error('Na reserva manual, todos os campos são obrigatórios.');
    }
  }

  return createReservationWithRules({
    ...input,
    tenantId: session.tenantId,
    createdByUserId: session.userId ?? null,
  });
}

export async function createPublicReservation(
  input: Omit<ReservationCreationContext, 'tenantId' | 'amount' | 'recomputePrice'> & { tenantId: number },
) {
  if (
    !input.roomId ||
    !input.checkIn ||
    !input.checkOut ||
    !input.guestName ||
    !input.guestEmail ||
    !input.guestPhone ||
    !input.guestCpf
  ) {
    throw new Error('Todos os campos são obrigatórios para concluir a reserva.');
  }

  // O preço nunca vem do cliente: é sempre recalculado a partir do quarto,
  // das datas e (se houver) de um cupom válido, dentro da mesma transação.
  return createReservationWithRules({
    ...input,
    amount: 0,
    recomputePrice: true,
  });
}
