import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./placeholder-screen.module.css";

export function PlaceholderScreen({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.screen}>
      <div className={cn(styles.icon, "glass-panel")}>
        <Icon size={28} color="var(--color-olive)" />
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {action}
    </div>
  );
}
