"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardIcon, type DashboardIconName } from "@/app/_components/dashboard-icons";

type DashboardNavLinkProps = {
  href: string;
  label: string;
  icon: DashboardIconName;
};

export function DashboardNavLink({ href, label, icon }: DashboardNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
        isActive
          ? "surface-strong text-foreground"
          : "text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
      }`}
    >
      <DashboardIcon
        name={icon}
        className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--accent)]" : ""}`}
      />
      <span>{label}</span>
    </Link>
  );
}
