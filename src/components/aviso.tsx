"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./aviso.module.css";

/** "sucesso": confirmação (check); "aviso": algo não deu certo ou precisa de atenção. */
export type TipoAviso = "sucesso" | "aviso";

type Aviso = { mensagem: string; tipo: TipoAviso };

const AvisoContext = React.createContext<((mensagem: string, tipo?: TipoAviso) => void) | null>(null);

/**
 * Pop-up de aviso do sistema: ícone (check ou alerta), a mensagem e o botão OK. Avisos
 * disparados enquanto um está aberto entram na fila e aparecem um depois do outro.
 */
export function AvisoProvider({ children }: { children: React.ReactNode }) {
  const [fila, setFila] = React.useState<Aviso[]>([]);
  const atual = fila[0] ?? null;
  // Mantém o conteúdo durante a animação de saída (a fila já esvaziou).
  const [exibido, setExibido] = React.useState<Aviso | null>(null);
  if (atual && atual !== exibido) setExibido(atual);

  const avisar = React.useCallback((mensagem: string, tipo: TipoAviso = "sucesso") => {
    setFila((anteriores) => [...anteriores, { mensagem, tipo }]);
  }, []);

  const fechar = () => setFila((anteriores) => anteriores.slice(1));
  const sucesso = exibido?.tipo !== "aviso";
  const Icone = sucesso ? CircleCheck : TriangleAlert;

  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      <DialogPrimitive.Root open={atual !== null} onOpenChange={(aberto) => !aberto && fechar()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className={styles.backdrop} />
          <DialogPrimitive.Popup className={styles.popup} role="alertdialog">
            <Icone size={44} className={cn(styles.icone, sucesso ? styles.iconeSucesso : styles.iconeAviso)} aria-hidden />
            {/* Só o ícone e a mensagem: a própria mensagem é o título do diálogo. */}
            <DialogPrimitive.Title className={styles.mensagem}>{exibido?.mensagem}</DialogPrimitive.Title>
            <Button type="button" variant="brand" className={styles.ok} onClick={fechar} autoFocus>
              OK
            </Button>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </AvisoContext.Provider>
  );
}

/** `avisar(mensagem)` mostra uma confirmação; `avisar(mensagem, "aviso")`, um alerta. */
export function useAviso() {
  const avisar = React.useContext(AvisoContext);
  if (!avisar) throw new Error("useAviso precisa estar dentro de <AvisoProvider>.");
  return avisar;
}
