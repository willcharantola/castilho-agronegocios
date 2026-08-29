import { cn } from "@/lib/utils";
import styles from "./mobile-screen.module.css";

/**
 * Constrains every screen to a phone-sized column. The product targets
 * iPhone/Safari exclusively, so we keep the layout mobile-first everywhere
 * instead of building a separate desktop layout.
 */
export function MobileScreen({
  className,
  fill = true,
  children,
}: {
  className?: string;
  /** Stretch to the full viewport height. Disable when a parent layout already manages height (e.g. the app shell with a bottom nav). */
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(styles.outer, fill && styles.fill)}>
      <div className={cn(styles.inner, "pt-safe", className)}>{children}</div>
    </div>
  );
}
