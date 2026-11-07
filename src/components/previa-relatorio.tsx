"use client";

import * as React from "react";
import { saveAs } from "file-saver";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Share2, X } from "lucide-react";
import { useAviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { compartilharArquivo, podeCompartilhar } from "@/lib/entregar-arquivo";
import styles from "./previa-relatorio.module.css";

type Relatorio = { arquivo: File; folhas: string[] };

const PreviaContext = React.createContext<((relatorio: Relatorio) => void) | null>(null);

/**
 * Entrega do relatório gerado (ver gerarRomaneios). No celular, o PDF abre numa prévia em
 * tela cheia (as folhas como imagem) com o botão "Compartilhar", que manda só o arquivo; o
 * .zip (vários negócios) não tem prévia: um aviso oferece o mesmo botão. O compartilhamento
 * sempre parte de um toque, como o navegador exige. No computador, baixa direto.
 */
export function PreviaRelatorioProvider({ children }: { children: React.ReactNode }) {
  const avisar = useAviso();
  const [aberto, setAberto] = React.useState<Relatorio | null>(null);
  // Mantém as folhas durante a animação de saída.
  const [exibido, setExibido] = React.useState<Relatorio | null>(null);
  if (aberto && aberto !== exibido) setExibido(aberto);

  const compartilhar = React.useCallback(
    (arquivo: File) => {
      compartilharArquivo(arquivo).catch(() => {
        avisar("Não foi possível compartilhar. O arquivo foi baixado no aparelho.", "aviso");
        saveAs(arquivo, arquivo.name);
      });
    },
    [avisar]
  );

  const entregar = React.useCallback(
    ({ arquivo, folhas }: Relatorio) => {
      if (!podeCompartilhar(arquivo)) saveAs(arquivo, arquivo.name);
      else if (folhas.length > 0) setAberto({ arquivo, folhas });
      else avisar("Relatório pronto.", "sucesso", { rotulo: "Compartilhar", executar: () => compartilhar(arquivo) });
    },
    [avisar, compartilhar]
  );

  return (
    <PreviaContext.Provider value={entregar}>
      {children}
      <DialogPrimitive.Root open={aberto !== null} onOpenChange={(abrir) => !abrir && setAberto(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Popup className={styles.tela}>
            <header className={styles.topo}>
              <DialogPrimitive.Title className={styles.titulo}>{exibido?.arquivo.name}</DialogPrimitive.Title>
              <DialogPrimitive.Close className={styles.fechar} aria-label="Fechar">
                <X size={22} />
              </DialogPrimitive.Close>
            </header>
            <div className={styles.folhas}>
              {exibido?.folhas.map((folha, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- data URL gerada no aparelho
                <img key={i} src={folha} alt={`Página ${i + 1}`} className={styles.folha} />
              ))}
            </div>
            <footer className={styles.rodape}>
              <Button
                type="button"
                variant="brand"
                className={styles.compartilhar}
                onClick={() => exibido && compartilhar(exibido.arquivo)}
              >
                <Share2 size={18} />
                Compartilhar
              </Button>
            </footer>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </PreviaContext.Provider>
  );
}

/** `entregar(await gerarRomaneios(...))`: prévia e compartilhamento no celular, download no computador. */
export function useEntregarRelatorio() {
  const entregar = React.useContext(PreviaContext);
  if (!entregar) throw new Error("useEntregarRelatorio precisa estar dentro de <PreviaRelatorioProvider>.");
  return entregar;
}
