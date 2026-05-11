import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRooms } from "@/services/tenantService";

export async function GET() {
  try {
    const tenantId = 1;
    const rooms = await getRooms(tenantId);

    return NextResponse.json(rooms, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar quartos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function slugifyRoomName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function POST(request: Request) {
  try {
    const tenantId = 1;
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const price = Number(body.price);
    const quantity = Number(body.quantity);
    const maxGuests = Number(body.maxGuests);
    const amenities = Array.isArray(body.amenities) ? body.amenities : [];

    if (!name) {
      return NextResponse.json({ error: "Nome do quarto é obrigatório" }, { status: 400 });
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantidade deve ser um número inteiro maior que zero" }, { status: 400 });
    }

    if (!Number.isInteger(maxGuests) || maxGuests < 1) {
      return NextResponse.json({ error: "Capacidade deve ser um número inteiro maior que zero" }, { status: 400 });
    }

    const { Room } = await getDb();

    const localPrefix = slugifyRoomName(name) || "quarto";
    const uniqueSuffix = Date.now().toString(36);
    const localRoomId = `${localPrefix}-${uniqueSuffix}`;

    const room = await Room.create({
      tenantId,
      localRoomId,
      channexRoomTypeId: `local-${localRoomId}`,
      name,
      price,
      quantity,
      maxGuests,
      status: "active",
      amenities: amenities.length > 0 ? JSON.stringify(amenities) : null,
    });

    return NextResponse.json(
      {
        id: room.localRoomId,
        channexRoomTypeId: room.channexRoomTypeId,
        name: room.name,
        maxGuests: room.maxGuests,
        status: room.status,
        price: Number(room.price),
        quantity: room.quantity,
        amenities: amenities,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Erro ao criar quarto:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
