import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import type { Transaction } from 'sequelize';
import type { TenantPlan } from '@/models/Tenant';
import { getDb } from '@/lib/db';

const validPlans: TenantPlan[] = ['basic', 'pro', 'premium'];

type ProvisionPayload = {
  tenantName?: string;
  adminEmail?: string;
  adminPassword?: string;
  plan?: string;
  webhookSecret?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ProvisionPayload;

  if (payload.webhookSecret !== process.env.PROVISION_WEBHOOK_SECRET) {
    return NextResponse.json({ message: 'Webhook inválido.' }, { status: 401 });
  }

  if (!payload.tenantName || !payload.adminEmail || !payload.adminPassword || !payload.plan) {
    return NextResponse.json({ message: 'Payload incompleto.' }, { status: 400 });
  }

  if (!validPlans.includes(payload.plan as TenantPlan)) {
    return NextResponse.json({ message: 'Plano inválido.' }, { status: 400 });
  }

  const { sequelize, Tenant, User } = await getDb();

  try {
    await sequelize.transaction(async (transaction: Transaction) => {
      const tenant = await Tenant.create(
        {
          name: payload.tenantName!,
          plan: payload.plan as TenantPlan,
        },
        { transaction },
      );

      const passwordHash = await bcrypt.hash(payload.adminPassword!, 10);

      await User.create(
        {
          name: payload.adminEmail!.split('@')[0],
          email: payload.adminEmail!,
          passwordHash,
          role: 'admin',
          tenantId: tenant.id,
        },
        { transaction },
      );
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Falha ao provisionar tenant.', detail: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 },
    );
  }
}
