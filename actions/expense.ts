'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedSession } from '@/lib/auth';
import { createExpense, deleteExpense } from '@/services/tenantService';
import type { ExpenseCategory } from '@/types/channex';

type ExpenseInput = {
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
};

export async function createExpenseAction(input: ExpenseInput) {
  const session = await getAuthenticatedSession();

  if (!session) {
    throw new Error('Sessão inválida.');
  }

  await createExpense(
    session.tenantId,
    {
      description: input.description,
      amount: input.amount,
      date: input.date,
      category: input.category,
    },
    session.userId,
  );

  revalidatePath('/dashboard/finance');
}

export async function deleteExpenseAction(expenseId: string) {
  const session = await getAuthenticatedSession();

  if (!session) {
    throw new Error('Sessão inválida.');
  }

  await deleteExpense(session.tenantId, expenseId);

  revalidatePath('/dashboard/finance');
}
