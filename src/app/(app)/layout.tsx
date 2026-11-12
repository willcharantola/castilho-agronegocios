import { AuthGuard } from "@/components/auth-guard";
import { AvisoProvider } from "@/components/aviso";
import { BottomNav } from "@/components/bottom-nav";
import { MobileScreen } from "@/components/mobile-screen";
import { PreviaRelatorioProvider } from "@/components/previa-relatorio";
import { RotasPorPerfil } from "@/components/rotas-por-perfil";
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
              <RotasPorPerfil>{children}</RotasPorPerfil>
            </MobileScreen>
            <BottomNav />
          </PreviaRelatorioProvider>
        </AvisoProvider>
      </AuthGuard>
    </div>
  );
}
