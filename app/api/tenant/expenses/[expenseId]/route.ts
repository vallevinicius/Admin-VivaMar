import { NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth';
import { deleteExpense } from '@/services/tenantService';

type RouteContext = {
  params: Promise<{
    expenseId: string;
  }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const { expenseId } = await context.params;

  if (!expenseId) {
    return NextResponse.json({ message: 'Despesa inválida.' }, { status: 400 });
  }

  try {
    await deleteExpense(session.tenantId, expenseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir despesa.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
