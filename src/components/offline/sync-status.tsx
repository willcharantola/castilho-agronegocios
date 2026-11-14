"use client";

import * as React from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePendentes } from "@/lib/offline/fila";
import { sincronizar } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import styles from "./offline.module.css";

/**
 * Dispara a sincronização ao abrir o app, ao voltar a conexão e ao voltar o app para
 * o primeiro plano. No iOS (Safari não tem Background Sync) é isso que garante o envio:
 * nada sincroniza com o app fechado — só ao reabri-lo com internet, ou pelo botão.
 */
function useSincronizacaoAutomatica() {
  React.useEffect(() => {
    const tentar = () => {
      if (navigator.onLine) void sincronizar();
    };
    const aoVoltarAoApp = () => {
      if (document.visibilityState === "visible") tentar();
    };
    tentar();
    window.addEventListener("online", tentar);
    document.addEventListener("visibilitychange", aoVoltarAoApp);
    return () => {
      window.removeEventListener("online", tentar);
      document.removeEventListener("visibilitychange", aoVoltarAoApp);
    };
  }, []);
}

/**
 * Barra fixa no topo, só com internet e cadastros na fila: quantos aguardam e "Sincronizar
 * agora". Offline ela não aparece (os registros já trazem o selo "Pendente de
 * sincronização"), e os cadastros recusados pela API ficam no sino de notificações da home
 * (ver Notificacoes), não aqui.
 */
export function SyncStatus() {
  useSincronizacaoAutomatica();
  const online = useOnlineStatus();
  const registros = usePendentes();
  const [sincronizando, setSincronizando] = React.useState(false);

  // Os com erro ou para revisar não saem da fila sozinhos: ficam nas notificações.
  const aguardando = registros.filter((r) => r.status !== "erro" && r.status !== "revisao").length;

  if (!online || aguardando === 0) return null;

  async function sincronizarAgora() {
    setSincronizando(true);
    try {
      await sincronizar();
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className={styles.bar} role="status">
      <div className={styles.barRow}>
        <CloudOff size={16} aria-hidden />
        <p className={styles.barText}>{aguardando} cadastro(s) salvo(s) no aparelho aguardando sincronização.</p>
        <Button
          type="button"
          variant="brand"
          className={styles.barButton}
          onClick={sincronizarAgora}
          disabled={sincronizando}
        >
          <RefreshCw size={14} aria-hidden className={sincronizando ? styles.girando : undefined} />
          {sincronizando ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </div>
    </div>
  );
}
