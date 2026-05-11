import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAvailableRooms } from "@/services/tenantService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const tenantId = 1; // Pousada Viva Mar

    const rooms = await getAvailableRooms(tenantId);

    const { Reservation, Room } = await getDb();

    // 1. MUDANÇA: Agora pedimos para o banco trazer os dados do Quarto (Room) junto com a Reserva
    const dbReservations = await Reservation.findAll({
      where: { tenantId },
      include: [
        {
          model: Room,
          as: "room",
          attributes: ["localRoomId"], // Trazemos o ID de texto que o frontend entende!
        },
      ],
      order: [["checkIn", "ASC"]],
    });

    const reservations = dbReservations.map((res: any) => ({
      id: res.id.toString(),
      // 2. MUDANÇA: Usamos o localRoomId (ex: 'vm-standard') em vez do número
      roomId: res.room ? res.room.localRoomId : res.roomId,
      checkIn: res.checkIn,
      checkOut: res.checkOut,
      status: res.status,
      otaSource: res.otaSource || "manual",
      channelReference: res.channelReference || "Site Direto",
      amount: Number(res.amount),
      currency: res.currency || "BRL",
      customer: {
        name: res.guestName || "Hóspede Não Identificado",
        email: res.guestEmail || "",
        phone: res.guestPhone || "",
      },
      notes: res.notes || "",
    }));

    return NextResponse.json(
      {
        rooms,
        reservations,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error: any) {
    console.error("Erro no Inventory:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
