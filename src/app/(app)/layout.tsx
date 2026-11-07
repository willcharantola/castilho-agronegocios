import { AuthGuard } from "@/components/auth-guard";
import { AvisoProvider } from "@/components/aviso";
import { BottomNav } from "@/components/bottom-nav";
import { MobileScreen } from "@/components/mobile-screen";
import { PreviaRelatorioProvider } from "@/components/previa-relatorio";
import { SyncStatus } from "@/components/offline/sync-status";
import styles from "./layout.module.css";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <AuthGuard>
        <AvisoProvider>
          <PreviaRelatorioProvider>
            <MobileScreen fill={false} className={styles.content}>
              <SyncStatus />
              {children}
            </MobileScreen>
            <BottomNav />
          </PreviaRelatorioProvider>
        </AvisoProvider>
      </AuthGuard>
    </div>
  );
}
