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
    [avisar],
  );

  const entregar = React.useCallback(
    ({ arquivo, folhas }: Relatorio) => {
      if (!podeCompartilhar(arquivo)) saveAs(arquivo, arquivo.name);
      else if (folhas.length > 0) setAberto({ arquivo, folhas });
      else avisar("Relatório pronto.", "sucesso", { rotulo: "Compartilhar", executar: () => compartilhar(arquivo) });
    },
    [avisar, compartilhar],
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
            {exibido && <FolhasComZoom key={exibido.arquivo.name} folhas={exibido.folhas} />}
            <footer className={styles.rodape}>
              <Button
                type="button"
                variant="brand"
                size="xl"
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

const ZOOM_MAXIMO = 4;
const ZOOM_TOQUE_DUPLO = 2.5;

/**
 * As folhas, roláveis, com zoom próprio: o app bloqueia o zoom do navegador (maximumScale: 1
 * no viewport). Pinça amplia/reduz em torno dos dedos; toque duplo alterna entre o tamanho
 * normal e 2,5×. O zoom muda a largura do conteúdo (não um transform), então a rolagem
 * nativa continua funcionando para andar pela folha ampliada.
 */
function FolhasComZoom({ folhas }: { folhas: string[] }) {
  const areaRef = React.useRef<HTMLDivElement>(null);
  const conteudoRef = React.useRef<HTMLDivElement>(null);
  const escala = React.useRef(1);

  /** Nova escala mantendo parado o ponto da tela (x, y) que está sob os dedos. */
  const aplicar = React.useCallback((nova: number, x: number, y: number) => {
    const area = areaRef.current;
    const conteudo = conteudoRef.current;
    if (!area || !conteudo) return;
    const limitada = Math.min(ZOOM_MAXIMO, Math.max(1, nova));
    const razao = limitada / escala.current;
    if (razao === 1) return;
    const caixa = area.getBoundingClientRect();
    const px = x - caixa.left;
    const py = y - caixa.top;
    const cx = area.scrollLeft + px;
    const cy = area.scrollTop + py;
    escala.current = limitada;
    conteudo.style.width = `calc(min(100%, 48rem) * ${limitada})`;
    area.scrollLeft = cx * razao - px;
    area.scrollTop = cy * razao - py;
  }, []);

  React.useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    let pinca: { distancia: number; escala: number } | null = null;
    let ultimoToque = 0;
    const distancia = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    function inicio(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinca = { distancia: distancia(e.touches), escala: escala.current };
      } else if (e.touches.length === 1) {
        const agora = Date.now();
        if (agora - ultimoToque < 300) {
          e.preventDefault();
          const toque = e.touches[0];
          aplicar(escala.current > 1 ? 1 : ZOOM_TOQUE_DUPLO, toque.clientX, toque.clientY);
          ultimoToque = 0;
        } else {
          ultimoToque = agora;
        }
      }
    }
    function movimento(e: TouchEvent) {
      if (!pinca || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      aplicar(
        (pinca.escala * distancia(e.touches)) / pinca.distancia,
        (a.clientX + b.clientX) / 2,
        (a.clientY + b.clientY) / 2,
      );
    }
    function fim(e: TouchEvent) {
      if (e.touches.length < 2) pinca = null;
    }
    // Safari: os eventos de gesto próprios dele também tentariam dar zoom na página.
    const bloquear = (e: Event) => e.preventDefault();

    // passive: false para poder cancelar o zoom/rolagem do navegador durante a pinça.
    area.addEventListener("touchstart", inicio, { passive: false });
    area.addEventListener("touchmove", movimento, { passive: false });
    area.addEventListener("touchend", fim);
    area.addEventListener("touchcancel", fim);
    area.addEventListener("gesturestart", bloquear);
    area.addEventListener("gesturechange", bloquear);
    return () => {
      area.removeEventListener("touchstart", inicio);
      area.removeEventListener("touchmove", movimento);
      area.removeEventListener("touchend", fim);
      area.removeEventListener("touchcancel", fim);
      area.removeEventListener("gesturestart", bloquear);
      area.removeEventListener("gesturechange", bloquear);
    };
  }, [aplicar]);

  return (
    <div ref={areaRef} className={styles.folhas}>
      <div ref={conteudoRef} className={styles.conteudo}>
        {folhas.map((folha, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- data URL gerada no aparelho
          <img key={i} src={folha} alt={`Página ${i + 1}`} className={styles.folha} draggable={false} />
        ))}
      </div>
    </div>
  );
}

/** `entregar(await gerarRomaneios(...))`: prévia e compartilhamento no celular, download no computador. */
export function useEntregarRelatorio() {
  const entregar = React.useContext(PreviaContext);
  if (!entregar) throw new Error("useEntregarRelatorio precisa estar dentro de <PreviaRelatorioProvider>.");
  return entregar;
}
