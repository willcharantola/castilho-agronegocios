"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Settings } from "lucide-react";
import { useIsAdmin } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import styles from "./bottom-nav.module.css";

const TABS = [
  // Dashboard lista negócios: para Normal aparece desativado (a API recusa com 403).
  { href: "/dashboard", icon: BarChart3, label: "Dashboard", somenteAdmin: true },
  { href: "/", icon: Home, label: "Início" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

export function BottomNav() {
  const pathname = usePathname();
  const admin = useIsAdmin();

  return (
    <nav className={cn(styles.nav, "pb-safe")}>
      <div className={cn(styles.bar, "glass-nav")}>
        {TABS.map(({ href, icon: Icon, label, somenteAdmin }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          if (somenteAdmin && !admin) {
            return (
              <span
                key={href}
                aria-disabled="true"
                aria-label={`${label} (disponível apenas para administradores)`}
                title="Disponível apenas para administradores"
                className={cn(styles.tab, "item-bloqueado")}
              >
                <Icon size={20} strokeWidth={2.25} />
                <span className={styles.label}>{label}</span>
              </span>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(styles.tab, active && styles.tabActive)}
            >
              <Icon size={20} strokeWidth={2.25} />
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
