import { CloudOff } from "lucide-react";
import type { InfoPendente } from "@/lib/offline/pendentes";
import { cn } from "@/lib/utils";
import styles from "./offline.module.css";

/** Selo para itens ainda na fila offline (não enviados ao servidor). */
export function PendenteBadge({ pendente, className }: { pendente: InfoPendente; className?: string }) {
  const erro = pendente.status === "erro";
  return (
    <span
      className={cn(styles.badge, erro && styles.badgeErro, className)}
      title={erro ? pendente.erroMensagem : undefined}
    >
      <CloudOff size={12} aria-hidden />
      {erro ? "Erro ao sincronizar" : "Pendente de sincronização"}
    </span>
  );
}
