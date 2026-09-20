import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./fab.module.css";

/**
 * Floating action button, anchored bottom-right of the same 28rem column
 * `MobileScreen`/`BottomNav` use, positioned above the fixed bottom nav.
 */
export function Fab({
  icon: Icon,
  label,
  href,
  onClick,
  disabled,
  disabledTitle = "Em breve",
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  return (
    <div className={styles.wrap}>
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
