import type { ReactNode } from "react";
import { getAuthenticatedSession } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getVisibleDashboardNavItems } from "@/lib/dashboard-access";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return null;
  }

  const navItems = getVisibleDashboardNavItems(
    session.plan,
    session.role,
    session.permissions,
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <DashboardSidebar tenantName={session.tenantName} navItems={navItems} />
        <section className="min-w-0 space-y-4">
          <div className="flex justify-end">
            <LogoutButton />
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
