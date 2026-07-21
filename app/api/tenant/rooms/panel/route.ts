import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Op } from "sequelize";
import { getVerifiedTenantSession, hasFeatureAccess } from "@/lib/tenant-session";

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
    const session = await getVerifiedTenantSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (!hasFeatureAccess(session, "rooms")) {
      return NextResponse.json({ error: "Sem permissão para esta ação." }, { status: 403 });
    }
    const tenantId = session.tenantId;
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

    // Agrupa reservas por unidade física (roomId_unitNumber). Reservas
    // antigas sem unitNumber (criadas antes desse controle existir) caem
    // por padrão na unidade 1 do quarto.
    const reservationsByUnit = new Map<
      string,
      Array<{ checkIn: string; checkOut: string; status: string }>
    >();
    for (const r of reservationsToday) {
      const key = `${r.roomId}_${r.unitNumber ?? 1}`;
      const list = reservationsByUnit.get(key) ?? [];
      list.push({
        checkIn: typeof r.checkIn === "string" ? r.checkIn : new Date(r.checkIn).toISOString().slice(0, 10),
        checkOut: typeof r.checkOut === "string" ? r.checkOut : new Date(r.checkOut).toISOString().slice(0, 10),
        status: r.status,
      });
      reservationsByUnit.set(key, list);
    }

    const snapshots = [];
    for (const room of rooms) {
      for (let unitNo = 1; unitNo <= room.quantity; unitNo++) {
        const unitReservations = reservationsByUnit.get(`${room.id}_${unitNo}`) ?? [];
        const computedStatus = computeRoomStatus(room.status, unitReservations);

        const overrideKey = `${room.id}_${unitNo}`;
        const override = overrideMap.get(overrideKey);

        // Um override manual (ex.: "Limpando") só vale enquanto a unidade
        // estiver de fato entre reservas. Assim que a próxima reserva
        // aponta um hóspede chegando/hospedado, a apuração real substitui
        // a anotação manual, que já pode estar desatualizada.
        const canUseOverride = computedStatus === "vacant" || computedStatus === "cleaning";
        const status = override && canUseOverride ? override.status : computedStatus;
        const updatedAt = override?.updatedAt && canUseOverride
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
