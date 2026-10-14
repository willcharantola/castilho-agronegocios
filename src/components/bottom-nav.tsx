"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Home, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./bottom-nav.module.css";

const TABS = [
  { href: "/perfil", icon: User, label: "Perfil" },
  { href: "/", icon: Home, label: "Início" },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={cn(styles.nav, "pb-safe")}>
      <div className={cn(styles.bar, "glass-nav")}>
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
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