import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getRooms } from "@/services/tenantService";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

function removeInternalRoomFields(room: Record<string, unknown>) {
  const { channexRoomTypeId: _channexRoomTypeId, ...publicRoom } = room;
  return publicRoom;
}

async function resolvePublicTenantId(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromQuery = searchParams.get("tenantId");
  const fromEnv = process.env.PUBLIC_ROOMS_TENANT_ID;

  const parsedQuery = fromQuery ? Number(fromQuery) : NaN;
  if (Number.isInteger(parsedQuery) && parsedQuery > 0) {
    return parsedQuery;
  }

  const parsedEnv = fromEnv ? Number(fromEnv) : NaN;
  if (Number.isInteger(parsedEnv) && parsedEnv > 0) {
    return parsedEnv;
  }

  const { Room } = await getDb();
  const firstRoom = await Room.findOne({
    attributes: ["tenantId"],
    order: [["tenantId", "ASC"], ["id", "ASC"]],
  });

  if (firstRoom?.tenantId) {
    return firstRoom.tenantId;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const tenantId = await resolvePublicTenantId(request);

    if (!tenantId) {
      return NextResponse.json(
        [],
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    }

    const rooms = (await getRooms(tenantId)).map((room) => removeInternalRoomFields(room as Record<string, unknown>));

    return NextResponse.json(rooms, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error("Erro ao buscar quartos públicos:", error);
    return NextResponse.json(
      { error: error.message ?? "Erro interno ao buscar quartos" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}