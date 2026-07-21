import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getVerifiedTenantSession, hasFeatureAccess } from "@/lib/tenant-session";

// ATUALIZAR: Liga ou desliga o cupom
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getVerifiedTenantSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (!hasFeatureAccess(session, "promotions")) {
      return NextResponse.json({ error: "Sem permissão para esta ação." }, { status: 403 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { Coupon } = await getDb();

    if (body.status !== "active" && body.status !== "inactive") {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const coupon = await Coupon.findOne({
      where: { id: resolvedParams.id, tenantId: session.tenantId },
    });
    if (!coupon)
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 },
      );

    await coupon.update({ status: body.status });

    return NextResponse.json(coupon, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETAR: Remove o cupom do banco
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getVerifiedTenantSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (!hasFeatureAccess(session, "promotions")) {
      return NextResponse.json({ error: "Sem permissão para esta ação." }, { status: 403 });
    }

    const resolvedParams = await params;
    const { Coupon } = await getDb();
    const coupon = await Coupon.findOne({
      where: { id: resolvedParams.id, tenantId: session.tenantId },
    });

    if (!coupon)
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 },
      );

    await coupon.destroy();

    return NextResponse.json(
      { message: "Cupom excluído com sucesso" },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
