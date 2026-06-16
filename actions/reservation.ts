'use server';

import { Op } from 'sequelize';
import { getAuthenticatedSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createChannexBooking } from '@/services/channex/api';
import type { Reservation } from '@/types/channex';


function shouldCreateInChannex() {
  return process.env.CHANNEX_WRITE_ENABLED === 'true';
}

type ManualReservationInput = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  entryType: 'manual_reservation' | 'blocked';
  amount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;
};

export async function createManualReservationAction(input: ManualReservationInput): Promise<Reservation> {
  const session = await getAuthenticatedSession();

  if (!session) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const { Room, Reservation } = await getDb();
  const room = await Room.findOne({ where: { tenantId: session.tenantId, localRoomId: input.roomId } });

  if (!room) {
    throw new Error('Quarto não encontrado para o tenant.');
  }

  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    throw new Error('Período inválido para a reserva.');
  }

  const conflict = await Reservation.findOne({
    where: {
      tenantId: session.tenantId,
      roomId: room.id,
      status: { [Op.ne]: 'cancelled' },
      checkIn: { [Op.lt]: checkOut },
      checkOut: { [Op.gt]: checkIn },
    },
  });

  if (conflict) {
    throw new Error('Já existe uma reserva para este quarto neste período.');
  }

  if (shouldCreateInChannex()) {
    if (!process.env.CHANNEX_PROPERTY_ID) {
      throw new Error('Defina CHANNEX_PROPERTY_ID para criar reservas reais na Channex.');
    }

    if (!process.env.CHANNEX_DEFAULT_RATE_PLAN_ID) {
      throw new Error('Defina CHANNEX_DEFAULT_RATE_PLAN_ID para criar reservas reais na Channex.');
    }

    if (!room.channexRoomTypeId) {
      throw new Error('Quarto sem channexRoomTypeId.');
    }

    const remoteReservation = await createChannexBooking({
      booking: {
        property_id: process.env.CHANNEX_PROPERTY_ID,
        arrival_date: input.checkIn.slice(0, 10),
        departure_date: input.checkOut.slice(0, 10),
        status: 'new',
        currency: 'BRL',
        amount: Number(input.amount).toFixed(2),
        notes: input.notes,
        customer: {
          name: input.guestName,
          email: input.guestEmail,
          phone: input.guestPhone,
        },
        rooms: [
          {
            checkin_date: input.checkIn.slice(0, 10),
            checkout_date: input.checkOut.slice(0, 10),
            room_type_id: room.channexRoomTypeId,
            rate_plan_id: process.env.CHANNEX_DEFAULT_RATE_PLAN_ID,
            amount: Number(input.amount).toFixed(2),
            occupancy: {
              adults: 2,
              children: 0,
              infants: 0,
            },
          },
        ],
      },
    });

    return {
      ...remoteReservation,
      roomId: room.localRoomId,
      status: input.entryType === 'manual_reservation' ? 'confirmed' : 'blocked',
      otaSource: 'manual',
      notes: input.notes,
      customer: {
        name: input.guestName,
        email: input.guestEmail,
        phone: input.guestPhone,
      },
    };
  }

  const created = await Reservation.create({
    roomId: room.id,
    tenantId: session.tenantId,
    channexReservationId: `manual_${Date.now()}`,
    otaSource: 'manual',
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    status: input.entryType === 'manual_reservation' ? 'confirmed' : 'blocked',
    channelReference: input.entryType === 'manual_reservation' ? 'MANUAL-RES' : 'MANUAL-BLOCK',
    amount: input.entryType === 'manual_reservation' ? input.amount : 0,
    currency: 'BRL',
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    guestPhone: input.guestPhone,
    notes: input.notes,
  });

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
    },
    notes: created.notes,
  };
}
