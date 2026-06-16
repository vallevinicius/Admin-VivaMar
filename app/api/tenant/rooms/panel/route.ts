import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Op } from "sequelize";
import { getAuthenticatedSession } from "@/lib/auth";

type OperationalStatus =
  | "vacant"
  | "cleaning"
  | "awaiting_guest"
  | "maintenance"
  | "occupied";

function computeRoomStatus(
  roomDbStatus: "active" | "maintenance",
  reservationsToday: Array<{ checkIn: string; checkOut: string; status: string }>
): OperationalStatus {
  if (roomDbStatus === "maintenance") return "maintenance";

  const today = new Date().toISOString().slice(0, 10);

  const active = reservationsToday.filter((r) => r.status !== "cancelled");

  const blocked = active.find((r) => r.status === "blocked");
  if (blocked) return "maintenance";

  const checkingOut = active.find((r) => r.checkOut === today);
  if (checkingOut) return "cleaning";

  const checkingIn = active.find((r) => r.checkIn === today);
  if (checkingIn) return "awaiting_guest";

  const ongoing = active.find((r) => r.checkIn < today && r.checkOut > today);
  if (ongoing) return "occupied";

  return "vacant";
}

function autoNote(status: OperationalStatus): string {
  switch (status) {
    case "vacant":
      return "Disponível para novas reservas.";
    case "cleaning":
      return "Limpeza de saída em andamento.";
    case "awaiting_guest":
      return "Enxoval pronto e amenities conferidos.";
    case "maintenance":
      return "Quarto em manutenção.";
    case "occupied":
      return "Hóspede hospedado.";
  }
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function GET() {
  try {
    const session = await getAuthenticatedSession();
    const tenantId = session?.tenantId ?? 1;
    const { Room, Reservation, RoomUnitStatus } = await getDb();

    const today = new Date().toISOString().slice(0, 10);

    const [rooms, reservationsToday, overrides] = await Promise.all([
      Room.findAll({ where: { tenantId }, order: [["name", "ASC"]] }),
      Reservation.findAll({
        where: {
          tenantId,
          status: { [Op.ne]: "cancelled" },
          checkIn: { [Op.lte]: today },
          checkOut: { [Op.gte]: today },
        },
      }),
      RoomUnitStatus.findAll({ where: { tenantId } }),
    ]);

    // Map overrides keyed by "roomId_unitNumber"
    const overrideMap = new Map<
      string,
      { status: OperationalStatus; updatedAt: Date }
    >();
    for (const o of overrides) {
      overrideMap.set(`${o.roomId}_${o.unitNumber}`, {
        status: o.status as OperationalStatus,
        updatedAt: o.updatedAt,
      });
    }

    // Group reservations by roomId
    const reservationsByRoom = new Map<
      number,
      Array<{ checkIn: string; checkOut: string; status: string }>
    >();
    for (const r of reservationsToday) {
      const list = reservationsByRoom.get(r.roomId) ?? [];
      list.push({
        checkIn: typeof r.checkIn === "string" ? r.checkIn : new Date(r.checkIn).toISOString().slice(0, 10),
        checkOut: typeof r.checkOut === "string" ? r.checkOut : new Date(r.checkOut).toISOString().slice(0, 10),
        status: r.status,
      });
      reservationsByRoom.set(r.roomId, list);
    }

    const snapshots = [];
    for (const room of rooms) {
      const roomReservations = reservationsByRoom.get(room.id) ?? [];
      const computedStatus = computeRoomStatus(room.status, roomReservations);

      for (let unitNo = 1; unitNo <= room.quantity; unitNo++) {
        const overrideKey = `${room.id}_${unitNo}`;
        const override = overrideMap.get(overrideKey);

        const status = override?.status ?? computedStatus;
        const updatedAt = override?.updatedAt
          ? formatTime(override.updatedAt)
          : "Hoje";

        snapshots.push({
          id: `${room.localRoomId}_${unitNo}`,
          room:
            room.quantity === 1 ? room.name : `${room.name} #${unitNo}`,
          category: room.name,
          status,
          updatedAt,
          note: autoNote(status),
        });
      }
    }

    return NextResponse.json({ snapshots });
  } catch (error: any) {
    console.error("Erro ao buscar painel de quartos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
