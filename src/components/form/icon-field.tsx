import type { LucideIcon } from "lucide-react";
import styles from "./icon-field.module.css";

export function IconField({
  icon: Icon,
  label,
  htmlFor,
  error,
  children,
}: {
  icon: LucideIcon;
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        <span className={styles.iconWrap}>
          <Icon size={14} strokeWidth={2.5} />
        </span>
        {label}
      </label>
      {children}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
