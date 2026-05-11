import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth";
import {
  deleteReservation,
  getTenantReservations,
  updateReservation,
} from "@/services/tenantService";
import type { Reservation } from "@/types/channex";

function resolveTenantId(session: Awaited<ReturnType<typeof getAuthenticatedSession>>) {
  // O calendário atualmente opera com tenant fixo 1.
  // Mantemos esse valor para evitar inconsistência entre listar/editar/excluir.
  return session?.tenantId ?? 1;
}

export async function PATCH(request: Request) {
  const session = await getAuthenticatedSession();
  const tenantId = resolveTenantId(session);

  const body = (await request.json()) as { reservation?: Reservation };

  if (!body.reservation) {
    return NextResponse.json({ message: "Reserva inválida." }, { status: 400 });
  }

  try {
    const reservation = await updateReservation(tenantId, body.reservation);
    return NextResponse.json({ reservation });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar reserva.",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    // Por enquanto forçamos o ID 1 (Pousada Viva Mar).
    // Quando o login for ativado, pegaremos o ID do usuário logado.
    const tenantId = 1;

    const reservations = await getTenantReservations(tenantId);

    return NextResponse.json(reservations, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar reservas do SaaS:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getAuthenticatedSession();
  const tenantId = resolveTenantId(session);

  const body = (await request.json()) as { reservationId?: string };
  const reservationId = body.reservationId?.trim();

  if (!reservationId) {
    return NextResponse.json({ message: "ID da reserva é obrigatório." }, { status: 400 });
  }

  try {
    await deleteReservation(tenantId, reservationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Falha ao excluir reserva.",
      },
      { status: 400 },
    );
  }
}
