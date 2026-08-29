import { cn } from "@/lib/utils";
import styles from "./step-form.module.css";

export function StepForm({
  onSubmit,
  fields,
  footer,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  fields: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.fields}>{fields}</div>
      <div className={cn(styles.footer, "pb-safe")}>{footer}</div>
    </form>
  );
}
