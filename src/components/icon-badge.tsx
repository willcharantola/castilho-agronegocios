import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import styles from "./icon-badge.module.css";

export function IconBadge({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn(styles.badge, "glass-panel", className)}>
      <Icon className={styles.icon} size={36} strokeWidth={2} />
    </div>
  );
}
