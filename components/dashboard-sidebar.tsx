"use client";

import { useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BedDouble,
  CalendarRange,
  CalendarPlus2,
  ClipboardCheck,
  History,
  Landmark,
  Menu,
  PanelLeftClose,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: Route;
  label: string;
  description: string;
};

const ICONS: Record<string, LucideIcon> = {
  "/dashboard/calendar": CalendarRange,
  "/dashboard/promotions": BadgePercent,
  "/dashboard/reservations": CalendarPlus2,
  "/dashboard/check": ClipboardCheck,
  "/dashboard/rooms": BedDouble,
  "/dashboard/team": UsersRound,
  "/dashboard/finance": Landmark,
  "/dashboard/guests": History,
};

export function DashboardSidebar({
  tenantName,
  navItems,
}: {
  tenantName: string;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600 dark:text-sky-300">
            Pousada Viva Mar
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
            {tenantName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Painel operacional para disponibilidade, moderação de reservas e
            controle financeiro.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 text-slate-500 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-300">
          <PanelLeftClose className="h-5 w-5" />
        </div>
      </div>

      <nav className="mt-5 space-y-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = ICONS[item.href] ?? CalendarRange;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block rounded-[24px] border px-4 py-4 transition-all",
                isActive
                  ? "border-sky-300/70 bg-sky-50 shadow-lg shadow-sky-200/70 dark:border-sky-400/40 dark:bg-sky-500/10 dark:shadow-sky-950/20"
                  : "border-slate-200 bg-white/80 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-white/15 dark:hover:bg-slate-800/80",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "rounded-2xl p-3",
                    isActive
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-300",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Barra com hambúrguer — todas as telas */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/85">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600 dark:text-sky-300">
            Pousada Viva Mar
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{tenantName}</p>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700/70"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Painel lateral */}
          <aside className="fixed inset-y-0 left-0 z-50 w-80 overflow-y-auto rounded-r-[28px] border-r border-slate-200/80 bg-white/95 p-5 shadow-2xl shadow-slate-900/20 backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:shadow-slate-950/50">
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700/70"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
