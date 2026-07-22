import type { ReactNode } from "react";
import { redirect } from "next/navigation";
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
    redirect('/');
  }

  const navItems = getVisibleDashboardNavItems(
    session.plan,
    session.role,
    session.permissions,
  );

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 lg:flex-row">
        <DashboardSidebar tenantName={session.tenantName} navItems={navItems} />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-end">
            <LogoutButton />
          </div>
          <section className="min-w-0 space-y-4">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
