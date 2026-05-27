import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// ATUALIZAR: Liga ou desliga o cupom
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { Coupon } = await getDb();

    const coupon = await Coupon.findOne({
      where: { id: resolvedParams.id, tenantId: 1 },
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
    const resolvedParams = await params;
    const { Coupon } = await getDb();
    const coupon = await Coupon.findOne({
      where: { id: resolvedParams.id, tenantId: 1 },
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
