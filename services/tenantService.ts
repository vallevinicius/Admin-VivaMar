import { getDb } from "@/lib/db";
import {
  DEMO_TENANT_ID,
  createDemoExpense,
  deleteDemoReservation,
  getDemoExpenses,
  getDemoReservations,
  getDemoRooms,
  updateDemoReservation,
} from "@/services/demoData";
import type { Expense, Reservation, Room } from "@/types/channex";
import { isChannexConfigured } from "@/lib/channex";
import {
  fetchChannexBookings,
  fetchChannexRoomTypes,
} from "@/services/channex/api";
import { Op } from "sequelize";

function mapRoom(
  room: InstanceType<Awaited<ReturnType<typeof getDb>>["Room"]>,
): Room {
  return {
    id: room.localRoomId,
    channexRoomTypeId: room.channexRoomTypeId,
    name: room.name,
    maxGuests: room.maxGuests,
    status: room.status,
    price: Number(room.price),
    quantity: room.quantity,
    amenities: room.amenities,
  };
}

function mapReservation(
  reservation: InstanceType<Awaited<ReturnType<typeof getDb>>["Reservation"]>,
  roomLocalRoomId: string,
): Reservation {
  const formatDbDate = (val: any) => {
    if (!val) return "";
    const str = typeof val === "string" ? val : new Date(val).toISOString();
    return str.substring(0, 10);
  };
  return {
    id: reservation.channexReservationId,
    roomId: roomLocalRoomId,
    checkIn: formatDbDate(reservation.checkIn),
    checkOut: formatDbDate(reservation.checkOut),
    status: reservation.status,
    otaSource: reservation.otaSource,
    channelReference: reservation.channelReference,
    amount: Number(reservation.amount),
    currency: reservation.currency,
    customer: {
      name: reservation.guestName,
      email: reservation.guestEmail,
      phone: reservation.guestPhone,
    },
    notes: reservation.notes,
  };
}

function mapExpense(
  expense: InstanceType<Awaited<ReturnType<typeof getDb>>["Expense"]>,
): Expense {
  return {
    id: String(expense.id),
    description: expense.description,
    amount: Number(expense.amount),
    date: expense.date,
    category: expense.category,
  };
}

function shouldUseChannexLiveData(tenantId: number) {
  return (
    tenantId !== DEMO_TENANT_ID &&
    isChannexConfigured() &&
    process.env.CHANNEX_PROPERTY_ID
  );
}

export async function getReservations(
  tenantId: number,
): Promise<Reservation[]> {
  if (tenantId === DEMO_TENANT_ID) {
    return getDemoReservations();
  }

  if (shouldUseChannexLiveData(tenantId)) {
    try {
      const channexReservations = await fetchChannexBookings(
        {
          propertyId: process.env.CHANNEX_PROPERTY_ID,
          dateGte: new Date().toISOString().slice(0, 10),
        },
        { page: 1, limit: 100 },
      );

      if (channexReservations.length > 0) {
        return channexReservations;
      }
    } catch {
      // fallback para banco local/mock
    }
  }

  try {
    const { Room, Reservation } = await getDb();
    const reservations = await Reservation.findAll({
      where: { tenantId },
      include: [{ model: Room, as: "room" }],
      order: [["checkIn", "ASC"]],
    });

    return reservations.map((reservation) => {
      const room = reservation.get("room") as InstanceType<typeof Room>;
      return mapReservation(reservation, room.localRoomId);
    });
  } catch {
    return getDemoReservations();
  }
}

export async function getRooms(tenantId: number): Promise<Room[]> {
  if (tenantId === DEMO_TENANT_ID) {
    return getDemoRooms();
  }

  try {
    const { Room } = await getDb();
    const rooms = await Room.findAll({
      where: { tenantId },
      order: [["name", "ASC"]],
    });

    return rooms.map((room) => mapRoom(room));
  } catch {
    return getDemoRooms();
  }
}

export async function updateReservation(
  tenantId: number,
  updatedReservation: Reservation,
): Promise<Reservation> {
  if (tenantId === DEMO_TENANT_ID) {
    return updateDemoReservation(updatedReservation);
  }

  const { Room, Reservation } = await getDb();

  const room = await Room.findOne({
    where: { tenantId, localRoomId: updatedReservation.roomId },
  });

  if (!room) {
    throw new Error("Quarto não encontrado para este tenant.");
  }

  const reservation = await Reservation.findOne({
    where: {
      tenantId,
      channexReservationId: updatedReservation.id,
    },
  });

  if (!reservation) {
    throw new Error("Reserva não encontrada para este tenant.");
  }

  await reservation.update({
    roomId: room.id,
    checkIn: updatedReservation.checkIn,
    checkOut: updatedReservation.checkOut,
    status: updatedReservation.status,
    otaSource: updatedReservation.otaSource,
    channelReference: updatedReservation.channelReference,
    amount: updatedReservation.amount,
    currency: updatedReservation.currency,
    guestName: updatedReservation.customer.name,
    guestEmail: updatedReservation.customer.email,
    guestPhone: updatedReservation.customer.phone,
    notes: updatedReservation.notes,
  });

  return mapReservation(reservation, room.localRoomId);
}

export async function deleteReservation(
  tenantId: number,
  reservationId: string,
): Promise<void> {
  if (tenantId === DEMO_TENANT_ID) {
    deleteDemoReservation(reservationId);
    return;
  }

  const { Reservation } = await getDb();
  const parsedId = Number(reservationId);

  const deletedCount = await Reservation.destroy({
    where: {
      tenantId,
      [Op.or]: [
        { channexReservationId: reservationId },
        ...(Number.isInteger(parsedId) ? [{ id: parsedId }] : []),
      ],
    },
  });

  if (deletedCount === 0) {
    throw new Error("Reserva não encontrada para este tenant.");
  }
}

export async function getExpenses(tenantId: number): Promise<Expense[]> {
  if (tenantId === DEMO_TENANT_ID) {
    return getDemoExpenses();
  }

  try {
    const { Expense } = await getDb();
    const expenses = await Expense.findAll({
      where: { tenantId },
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
    });
    return expenses.map((expense) => mapExpense(expense));
  } catch {
    return getDemoExpenses();
  }
}

export async function createExpense(
  tenantId: number,
  input: Omit<Expense, "id">,
): Promise<Expense> {
  if (tenantId === DEMO_TENANT_ID) {
    return createDemoExpense(input);
  }

  const { Expense } = await getDb();

  const expense = await Expense.create({
    ...input,
    tenantId,
    createdByUserId: 1,
  });

  return mapExpense(expense);
}

export async function getUnifiedInventory(tenantId: number) {
  const [roomList, reservationList, expenseList] = await Promise.all([
    getAvailableRooms(tenantId),
    getReservations(tenantId),
    getExpenses(tenantId),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    rooms: roomList,
    reservations: reservationList,
    expenses: expenseList,
  };
}

export async function updateRoomPrice(
  tenantId: number,
  localRoomId: string,
  newPrice: number,
) {
  const { Room } = await getDb();

  const room = await Room.findOne({
    where: { tenantId, localRoomId },
  });

  if (!room) {
    throw new Error("Quarto não encontrado para esta pousada.");
  }

  await room.update({
    price: newPrice,
  });

  return mapRoom(room);
}

export async function getAvailableRooms(
  tenantId: number,
  checkIn?: string,
  checkOut?: string,
) {
  const { Room, Reservation } = await getDb();
  const allRooms = await Room.findAll({ where: { tenantId } });

  if (!checkIn || !checkOut) {
    return allRooms.map((room) => ({
      ...mapRoom(room),
      remainingQuantity: room.quantity,
    }));
  }

  const reservations = await Reservation.findAll({
    where: {
      tenantId,
      status: "confirmed",
      [Op.or]: [
        { checkIn: { [Op.lt]: checkOut }, checkOut: { [Op.gt]: checkIn } },
      ],
    },
  });

  return allRooms.map((room) => {
    const occupiedCount = reservations.filter(
      (res) => res.roomId === room.id,
    ).length;
    const remaining = room.quantity - occupiedCount;

    return {
      ...mapRoom(room),
      remainingQuantity: remaining,
    };
  });
}

export async function getTenantReservations(tenantId: number) {
  const { Reservation, Room } = await getDb();

  const reservations = await Reservation.findAll({
    where: { tenantId },
    include: [
      {
        model: Room,
        as: "room",
        attributes: ["name", "localRoomId"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  return reservations;
}
