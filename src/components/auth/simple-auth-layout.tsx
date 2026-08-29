import { BackLink } from "@/components/back-link";
import { MobileScreen } from "@/components/mobile-screen";
import styles from "./simple-auth-layout.module.css";

export function SimpleAuthLayout({
  backHref,
  title,
  subtitle,
  children,
}: {
  backHref: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <MobileScreen className={styles.screen}>
      <BackLink href={backHref} />
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      <div className={styles.body}>{children}</div>
    </MobileScreen>
  );
}
