import type { ReactNode } from "react";
import { getAuthenticatedSession } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

const NAV_ITEMS = [
  {
    href: "/dashboard/calendar",
    label: "Calendário",
    description: "Operação e moderação de reservas",
  },
  {
    href: "/dashboard/promotions",
    label: "Promoções",
    description: "Gerenciamento de cupons e descontos",
  },
  {
    href: "/dashboard/reservations",
    label: "Reserva",
    description: "Cadastro e registro de reservas",
  },
  {
    href: "/dashboard/check",
    label: "Check-in e Check-out",
    description: "Fluxo operacional da recepção",
  },
  {
    href: "/dashboard/rooms",
    label: "Quartos",
    description: "Status operacional e governança",
  },
  {
    href: "/dashboard/team",
    label: "Equipe",
    description: "Escala, turnos e gestão de pessoas",
  },
  {
    href: "/dashboard/finance",
    label: "Financeiro",
    description: "KPIs, despesas e margem líquida",
  },
  {
    href: "/dashboard/guests",
    label: "Histórico de hóspedes",
    description: "Dados cadastrais e histórico de estadias",
  },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return null;
  }

  const navItems = NAV_ITEMS.filter((item) => {
    if (item.href !== "/dashboard/finance") {
      return true;
    }

    return session.plan === "pro" || session.plan === "premium";
  });

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <DashboardSidebar tenantName={session.tenantName} navItems={navItems} />
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
