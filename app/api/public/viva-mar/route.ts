import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAvailableRooms } from "@/services/tenantService";

function removeInternalRoomFields(room: Record<string, unknown>) {
  const { channexRoomTypeId: _channexRoomTypeId, ...publicRoom } = room;
  return publicRoom;
}

// 1. GET: Busca os quartos e calcula a disponibilidade
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  try {
    const rooms = (await getAvailableRooms(
      1,
      checkIn || undefined,
      checkOut || undefined,
    )).map((room) => removeInternalRoomFields(room as Record<string, unknown>));

    return NextResponse.json(rooms, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Erro no GET Viva Mar:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Cria a reserva vinda da Landing Page
export async function POST(request: Request) {
  const body = await request.json();
  const { Reservation, Room } = await getDb();

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  try {
    const room = await Room.findOne({
      where: { localRoomId: body.roomId, tenantId: 1 },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Quarto não encontrado" },
        { status: 404, headers: corsHeaders },
      );
    }

    const novaReserva = await Reservation.create({
      tenantId: 1,
      roomId: room.id,
      channexReservationId: `site-direto-${Date.now()}`,
      otaSource: "manual",
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestPhone: body.guestPhone,
      guestCpf: body.guestCpf,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      status: "confirmed",
      channelReference: "website-direto",
      amount: body.amount,
      currency: "BRL",
      notes: body.notes,
      createdByUserId: null,
    });

    return NextResponse.json(novaReserva, {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Erro no POST Viva Mar:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar reserva" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}
