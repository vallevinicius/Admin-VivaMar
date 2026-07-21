import { NextResponse } from "next/server";
import { getRooms } from "@/services/tenantService";
import { resolvePublicTenantId } from "@/lib/public-tenant";

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