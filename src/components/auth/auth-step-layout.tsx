import type { LucideIcon } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { IconBadge } from "@/components/icon-badge";
import { ProgressSteps } from "@/components/progress-steps";
import { MobileScreen } from "@/components/mobile-screen";
import styles from "./auth-step-layout.module.css";

export function AuthStepLayout({
  backHref,
  icon,
  title,
  step,
  children,
}: {
  backHref: string;
  icon: LucideIcon;
  title: React.ReactNode;
  step: { current: number; total: number };
  children: React.ReactNode;
}) {
  return (
    <MobileScreen className={styles.screen}>
      <BackLink href={backHref} />
      <div className={styles.header}>
        <IconBadge icon={icon} />
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.progressWrap}>
          <ProgressSteps current={step.current} total={step.total} />
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </MobileScreen>
  );
}
