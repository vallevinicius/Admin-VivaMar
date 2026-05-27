import {
  channexRequest,
  toBookingFilterQuery,
  toPaginationQuery,
  type BookingFilters,
  type PaginationOptions,
} from '@/lib/channex';
import type {
  ChannexBooking,
  ChannexBookingPayload,
  ChannexRoomType,
  Reservation,
  Room,
} from '@/types/channex';


function normalizeOtaSource(value: string | undefined): Reservation['otaSource'] {
  if (value === 'booking' || value === 'expedia' || value === 'hotels_com' || value === 'manual') {
    return value;
  }

  return 'manual';
}

function toNumber(value: string | number | undefined) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function mapChannexRoomType(roomType: ChannexRoomType): Room {
  return {
    id: roomType.id,
    channexRoomTypeId: roomType.id,
    name: roomType.attributes?.title ?? roomType.attributes?.name ?? 'Room Type',
    maxGuests: roomType.attributes?.max_occupancy?.adults ?? 1,
    price: 0,
    quantity: 1,
    status: roomType.attributes?.status === 'active' ? 'active' : 'maintenance',
  };
}

export function mapChannexBooking(booking: ChannexBooking): Reservation {
  const attrs = booking.attributes;
  const firstRoom = attrs.rooms?.[0];
  const customer = attrs.customer ?? {};

  return {
    id: booking.id,
    roomId: firstRoom?.room_type_id ?? 'unknown-room-type',
    checkIn: (attrs.arrival_date ?? firstRoom?.checkin_date ?? '').slice(0, 10),
    checkOut: (attrs.departure_date ?? firstRoom?.checkout_date ?? '').slice(0, 10),
    status:
      attrs.status === 'cancelled'
        ? 'cancelled'
        : attrs.status === 'modified'
          ? 'pending'
          : 'confirmed',
    otaSource: normalizeOtaSource(attrs.ota_source),
    channelReference: attrs.channel_reference ?? attrs.reference ?? booking.id,
    amount: toNumber(attrs.amount),
    currency: attrs.currency ?? 'BRL',
    customer: {
      name: [customer.name, customer.surname].filter(Boolean).join(' ').trim() || 'Hóspede',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
    },
    notes: attrs.notes ?? '',
  };
}

export async function fetchChannexRoomTypes(pagination?: PaginationOptions): Promise<Room[]> {
  const payload = await channexRequest<ChannexRoomType>('/room_types', {}, toPaginationQuery(pagination));
  const roomTypes = Array.isArray(payload.data) ? payload.data : [payload.data];
  return roomTypes.map(mapChannexRoomType);
}

export async function fetchChannexBookings(
  filters?: BookingFilters,
  pagination?: PaginationOptions,
): Promise<Reservation[]> {
  const payload = await channexRequest<ChannexBooking>('/bookings', {}, {
    ...toBookingFilterQuery(filters),
    ...toPaginationQuery(pagination),
    'order[arrival_date]': 'desc',
  });

  const bookings = Array.isArray(payload.data) ? payload.data : [payload.data];
  return bookings.map(mapChannexBooking);
}

export async function createChannexBooking(body: ChannexBookingPayload): Promise<Reservation> {
  const payload = await channexRequest<ChannexBooking>('/bookings', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const booking = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  return mapChannexBooking(booking);
}

export async function acknowledgeBookingRevision(revisionId: string): Promise<void> {
  await channexRequest(`/booking_revisions/${revisionId}/acknowledge`, {
    method: 'POST',
  });
}
