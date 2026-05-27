import { cookies } from 'next/headers';
import type { TenantPlan } from '@/models/Tenant';
import type { DashboardFeatureKey, UserAccessRole } from '@/lib/dashboard-access';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const authConfig = {
  cookieName: 'vivamar_session',
  tokenTtlSeconds: 60 * 60 * 8,
};

export type SessionPayload = {
  userId: number;
  tenantId: number;
  plan: TenantPlan;
  tenantName: string;
  role: UserAccessRole;
  permissions: DashboardFeatureKey[];
  active: boolean;
  exp: number;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não foi configurado.');
  }
  return secret;
}

function base64UrlEncodeBytes(buffer: Uint8Array) {
  return Buffer.from(buffer).toString('base64url');
}

function base64UrlEncodeText(input: string) {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function base64UrlDecodeText(input: string) {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function sign(value: string, secret: string) {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + authConfig.tokenTtlSeconds;
  const header = base64UrlEncodeText(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncodeText(JSON.stringify({ ...payload, exp } satisfies SessionPayload));
  const unsigned = `${header}.${body}`;
  const signature = await sign(unsigned, getSecret());
  return `${unsigned}.${signature}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) {
      return null;
    }

    const unsigned = `${header}.${body}`;
    const expected = await sign(unsigned, getSecret());

    if (signature !== expected) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecodeText(body)) as Partial<SessionPayload>;

    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!payload.userId || !payload.tenantId || !payload.plan || !payload.tenantName) {
      return null;
    }

    return {
      userId: payload.userId,
      tenantId: payload.tenantId,
      plan: payload.plan,
      tenantName: payload.tenantName,
      role: payload.role ?? 'admin',
      permissions: payload.permissions ?? [],
      active: payload.active ?? true,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConfig.cookieName)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
