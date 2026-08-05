import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSessionToken, authConfig, shouldUseSecureCookies } from '@/lib/auth';
import { resolveDashboardPermissionsForRole, sanitizeDashboardPermissions } from '@/lib/dashboard-access';
import { getDb } from '@/lib/db';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
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
  // Limita por IP (contra scanners/bots) e por e-mail (contra um atacante
  // que distribua tentativas entre vários IPs mirando uma única conta).
  const ipLimit = checkRateLimit(getClientIp(request), 'login-ip', {
    limit: 20,
    windowMs: 60_000,
  });
  if (!ipLimit.allowed) {
    return rateLimitResponse(ipLimit.retryAfterSeconds);
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const secureCookie = shouldUseSecureCookies(request);

  if (!body.email || !body.password) {
    return NextResponse.json({ message: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const emailLimit = checkRateLimit(body.email.trim().toLowerCase(), 'login-email', {
    limit: 8,
    windowMs: 60_000,
  });
  if (!emailLimit.allowed) {
    return rateLimitResponse(emailLimit.retryAfterSeconds);
  }


  // Login demo só existe fora de produção — nunca deve valer para o tenant
  // real (DEMO_TENANT_ID coincide com o ID do cliente real "Pousada Viva
  // Mar" em produção). Gate por variável de servidor (não NEXT_PUBLIC_*,
  // que só controla se o botão aparece no front, não protege o backend).
  const demoLoginEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_LOGIN === 'true';

  if (demoLoginEnabled && body.email === DEMO_USER_EMAIL && body.password === DEMO_USER_PASSWORD) {
    const token = await createSessionToken({
      // O usuário demo não é um registro real da tabela users; usar id negativo
      // evita colisão com colaboradores reais e marcação incorreta de "Você".
      userId: -1,
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
      secure: secureCookie,
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
    secure: secureCookie,
    path: '/',
    maxAge: authConfig.tokenTtlSeconds,
  });

  return response;
}
