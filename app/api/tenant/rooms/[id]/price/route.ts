import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { Room } = await getDb();
    const body = await request.json();
    const resolvedParams = await params;
    const roomId = resolvedParams.id; // Ex: 'vm-standard'

    const room = await Room.findOne({
      where: { localRoomId: roomId, tenantId: 1 },
    });

    if (!room)
      return NextResponse.json(
        { error: "Quarto não encontrado" },
        { status: 404 },
      );

    await room.update({ price: body.price });

    return NextResponse.json({
      message: "Preço atualizado com sucesso",
      price: room.price,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
