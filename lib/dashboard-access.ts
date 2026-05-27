import type { Route } from 'next';

export type DashboardFeatureKey =
  | 'calendar'
  | 'promotions'
  | 'reservations'
  | 'check'
  | 'rooms'
  | 'team'
  | 'finance'
  | 'guests';

export type UserAccessRole = 'admin' | 'staff' | 'customer';

export type DashboardNavItem = {
  key: DashboardFeatureKey;
  href: Route;
  label: string;
  description: string;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  {
    key: 'calendar',
    href: '/dashboard/calendar',
    label: 'Calendario',
    description: 'Operacao e moderacao de reservas',
  },
  {
    key: 'promotions',
    href: '/dashboard/promotions',
    label: 'Promocoes',
    description: 'Gerenciamento de cupons e descontos',
  },
  {
    key: 'reservations',
    href: '/dashboard/reservations',
    label: 'Reserva',
    description: 'Cadastro e registro de reservas',
  },
  {
    key: 'check',
    href: '/dashboard/check',
    label: 'Check-in e Check-out',
    description: 'Fluxo operacional da recepcao',
  },
  {
    key: 'rooms',
    href: '/dashboard/rooms',
    label: 'Quartos',
    description: 'Status operacional e governanca',
  },
  {
    key: 'team',
    href: '/dashboard/team',
    label: 'Equipe',
    description: 'Escala, turnos e gestao de pessoas',
  },
  {
    key: 'finance',
    href: '/dashboard/finance',
    label: 'Financeiro',
    description: 'KPIs, despesas e margem liquida',
  },
  {
    key: 'guests',
    href: '/dashboard/guests',
    label: 'Historico de hospedes',
    description: 'Dados cadastrais e historico de estadias',
  },
];

const FEATURE_BY_KEY = new Map(
  DASHBOARD_NAV_ITEMS.map((item) => [item.key, item]),
);

export const DEFAULT_STAFF_FEATURES: DashboardFeatureKey[] = [
  'calendar',
  'reservations',
  'check',
  'rooms',
  'guests',
];

function asFeatureKey(value: string): DashboardFeatureKey | null {
  return FEATURE_BY_KEY.has(value as DashboardFeatureKey)
    ? (value as DashboardFeatureKey)
    : null;
}

export function sanitizeDashboardPermissions(
  permissions: unknown,
): DashboardFeatureKey[] {
  if (!Array.isArray(permissions)) {
    return [];
  }

  const unique = new Set<DashboardFeatureKey>();

  for (const permission of permissions) {
    if (typeof permission !== 'string') {
      continue;
    }

    const feature = asFeatureKey(permission);
    if (feature) {
      unique.add(feature);
    }
  }

  return [...unique];
}

export function resolveDashboardPermissionsForRole(
  role: UserAccessRole,
  permissions: unknown,
): DashboardFeatureKey[] {
  if (role === 'admin') {
    return DASHBOARD_NAV_ITEMS.map((item) => item.key);
  }

  const sanitized = sanitizeDashboardPermissions(permissions);
  if (sanitized.length > 0) {
    return sanitized;
  }

  if (role === 'staff') {
    return [...DEFAULT_STAFF_FEATURES];
  }

  return ['reservations'];
}

export function getVisibleDashboardNavItems(
  plan: 'basic' | 'pro' | 'premium',
  role: UserAccessRole,
  permissions: unknown,
): DashboardNavItem[] {
  const allowed = new Set(resolveDashboardPermissionsForRole(role, permissions));

  return DASHBOARD_NAV_ITEMS.filter((item) => {
    if (item.key === 'finance' && plan === 'basic') {
      return false;
    }

    return allowed.has(item.key);
  });
}

export function canAccessDashboardPath(
  pathname: string,
  plan: 'basic' | 'pro' | 'premium',
  role: UserAccessRole,
  permissions: unknown,
): boolean {
  if (pathname === '/dashboard') {
    return true;
  }

  const visible = getVisibleDashboardNavItems(plan, role, permissions);
  return visible.some((item) => pathname.startsWith(item.href));
}

export function getDefaultDashboardHref(
  plan: 'basic' | 'pro' | 'premium',
  role: UserAccessRole,
  permissions: unknown,
): Route {
  const firstAllowed = getVisibleDashboardNavItems(plan, role, permissions)[0];
  return firstAllowed?.href ?? '/dashboard/calendar';
}
