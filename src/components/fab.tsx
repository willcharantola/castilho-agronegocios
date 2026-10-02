import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./fab.module.css";

/**
 * Floating action button, anchored bottom-right of the same 28rem column
 * `MobileScreen`/`BottomNav` use, positioned above the fixed bottom nav.
 * `stacked` places a second FAB right below the main one.
 */
export function Fab({
  icon: Icon,
  label,
  href,
  onClick,
  disabled,
  disabledTitle = "Em breve",
  stacked = false,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledTitle?: string;
  stacked?: boolean;
}) {
  return (
    <div className={cn(styles.wrap, stacked && styles.stacked)}>
      <Button
        className={styles.button}
        aria-label={label}
        title={disabled ? disabledTitle : label}
        disabled={disabled}
        onClick={onClick}
        render={href && !disabled ? <Link href={href} /> : undefined}
      >
        <Icon size={22} />
      </Button>
    </div>
  );
}
