import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSessionToken, authConfig } from '@/lib/auth';
import { resolveDashboardPermissionsForRole, sanitizeDashboardPermissions } from '@/lib/dashboard-access';
import { getDb } from '@/lib/db';
import { DEMO_TENANT_ID, DEMO_TENANT_NAME, DEMO_USER_EMAIL, DEMO_USER_PASSWORD } from '@/services/demoData';

function parseDashboardPermissions(raw: string | null | undefined) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return sanitizeDashboardPermissions(parsed);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email || !body.password) {
    return NextResponse.json({ message: 'Informe e-mail e senha.' }, { status: 400 });
  }


  if (body.email === DEMO_USER_EMAIL && body.password === DEMO_USER_PASSWORD) {
    const token = await createSessionToken({
      userId: 1,
      tenantId: DEMO_TENANT_ID,
      plan: 'premium',
      tenantName: DEMO_TENANT_NAME,
      role: 'admin',
      permissions: [],
      active: true,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(authConfig.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: authConfig.tokenTtlSeconds,
    });

    return response;
  }

  const { User, Tenant } = await getDb();

  const user = await User.findOne({
    where: { email: body.email },
    include: [{ model: Tenant, as: 'tenant' }],
  });

  if (!user) {
    return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
  }

  const tenant = user.get('tenant') as InstanceType<typeof Tenant> | undefined;

  if (!tenant || tenant.status !== 'active') {
    return NextResponse.json({ message: 'Conta inativa ou inexistente.' }, { status: 403 });
  }

  if (user.employmentStatus === 'inactive') {
    return NextResponse.json({ message: 'Colaborador inativo. Solicite reativacao ao gestor.' }, { status: 403 });
  }

  const isValid = await bcrypt.compare(body.password, user.passwordHash);

  if (!isValid) {
    return NextResponse.json({ message: 'Credenciais inválidas.' }, { status: 401 });
  }

  const token = await createSessionToken({
    userId: user.id,
    tenantId: tenant.id,
    plan: tenant.plan,
    tenantName: tenant.name,
    role: user.role,
    permissions: resolveDashboardPermissionsForRole(user.role, parseDashboardPermissions(user.dashboardPermissions)),
    active: user.employmentStatus === 'active',
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(authConfig.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: authConfig.tokenTtlSeconds,
  });

  return response;
}
