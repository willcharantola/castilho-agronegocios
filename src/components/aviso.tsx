"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./aviso.module.css";

/** "sucesso": confirmação (check); "aviso": algo não deu certo ou precisa de atenção. */
export type TipoAviso = "sucesso" | "aviso";

/** Botão extra acima do OK (ex.: "Compartilhar"); o clique dele também fecha o aviso. */
export type AcaoAviso = { rotulo: string; executar: () => void };

type Aviso = { mensagem: string; tipo: TipoAviso; acao?: AcaoAviso };

type Avisar = (mensagem: string, tipo?: TipoAviso, acao?: AcaoAviso) => void;

const AvisoContext = React.createContext<Avisar | null>(null);

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

  const avisar = React.useCallback<Avisar>((mensagem, tipo = "sucesso", acao) => {
    setFila((anteriores) => [...anteriores, { mensagem, tipo, acao }]);
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
            {exibido?.acao && (
              <Button
                type="button"
                variant="brand"
                className={cn(styles.ok, styles.acao)}
                onClick={() => {
                  // Chamado direto no clique: o compartilhamento do celular exige um toque recente.
                  exibido.acao?.executar();
                  fechar();
                }}
                autoFocus
              >
                {exibido.acao.rotulo}
              </Button>
            )}
            <Button
              type="button"
              variant={exibido?.acao ? "ghost" : "brand"}
              className={cn(styles.ok, exibido?.acao && styles.secundario)}
              onClick={fechar}
              autoFocus={!exibido?.acao}
            >
              OK
            </Button>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </AvisoContext.Provider>
  );
}

/**
 * `avisar(mensagem)` mostra uma confirmação; `avisar(mensagem, "aviso")`, um alerta;
 * `avisar(mensagem, tipo, { rotulo, executar })` acrescenta um botão de ação.
 */
export function useAviso() {
  const avisar = React.useContext(AvisoContext);
  if (!avisar) throw new Error("useAviso precisa estar dentro de <AvisoProvider>.");
  return avisar;
}
