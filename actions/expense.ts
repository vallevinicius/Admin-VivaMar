'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
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

  const { Expense } = await getDb();

  await Expense.create({
    tenantId: session.tenantId,
    createdByUserId: session.userId,
    description: input.description,
    amount: input.amount,
    date: input.date,
    category: input.category,
  });

  revalidatePath('/dashboard/finance');
}
