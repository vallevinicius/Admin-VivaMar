import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = 1;
    const resolvedParams = await params;
    const localRoomId = resolvedParams.id;
    const body = await request.json();

    const { Room } = await getDb();

    const room = await Room.findOne({
      where: { tenantId, localRoomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Quarto não encontrado" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const nextName = String(body.name).trim();
      if (!nextName) {
        return NextResponse.json({ error: "Nome do quarto inválido" }, { status: 400 });
      }
      updates.name = nextName;
    }

    if (body.price !== undefined) {
      const nextPrice = Number(body.price);
      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
      }
      updates.price = nextPrice;
    }

    if (body.quantity !== undefined) {
      const nextQuantity = Number(body.quantity);
      if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
        return NextResponse.json({ error: "Quantidade deve ser um número inteiro maior que zero" }, { status: 400 });
      }
      updates.quantity = nextQuantity;
    }

    if (body.maxGuests !== undefined) {
      const nextMaxGuests = Number(body.maxGuests);
      if (!Number.isInteger(nextMaxGuests) || nextMaxGuests < 1) {
        return NextResponse.json({ error: "Capacidade deve ser um número inteiro maior que zero" }, { status: 400 });
      }
      updates.maxGuests = nextMaxGuests;
    }

    if (body.amenities !== undefined && Array.isArray(body.amenities)) {
      updates.amenities = JSON.stringify(body.amenities);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido para atualizar" }, { status: 400 });
    }

    await room.update(updates);

    return NextResponse.json(
      {
        id: room.localRoomId,
        channexRoomTypeId: room.channexRoomTypeId,
        name: room.name,
        maxGuests: room.maxGuests,
        status: room.status,
        price: Number(room.price),
        quantity: room.quantity,
        amenities: room.amenities,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Erro ao atualizar quarto:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = 1;
    const resolvedParams = await params;
    const localRoomId = resolvedParams.id;

    const { Room, Reservation } = await getDb();

    const room = await Room.findOne({
      where: { tenantId, localRoomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Quarto não encontrado" }, { status: 404 });
    }

    const reservationsCount = await Reservation.count({
      where: { tenantId, roomId: room.id },
    });

    if (reservationsCount > 0) {
      return NextResponse.json(
        { error: "Não é possível remover quarto com reservas vinculadas" },
        { status: 409 },
      );
    }

    await room.destroy();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao remover quarto:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
