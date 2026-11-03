"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { NegocioCarrossel } from "@/components/negocio-carrossel";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { concluirNegocio } from "@/lib/api/negocios";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { enviarOuEnfileirar, referencia } from "@/lib/offline/fila";
import { useIsAdmin } from "@/lib/permissoes";
import { horaLocalAtual, mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

/** Passo 8: revisão (Geral + um cartão por lote) e conclusão do negócio. */
export default function NovoNegocioRevisaoPage() {
  const router = useRouter();
  const { data, update, reset } = useNegocioFlow();
  const { negocio, erro, idReal } = useNegocioComPendencias(data.negocioId);
  const admin = useIsAdmin();
  const [concluindo, setConcluindo] = React.useState(false);
  const [erroConcluir, setErroConcluir] = React.useState<string | null>(null);

  // `concluir` zera o fluxo antes de navegar: isso não deve mandar de volta ao início.
  const negocioIdRef = React.useRef(data.negocioId);
  React.useEffect(() => {
    if (!negocioIdRef.current) router.replace("/negocios/novo");
  }, [router]);

  React.useEffect(() => {
    if (idReal) update({ negocioId: idReal });
  }, [idReal, update]);

  const porCabeca = negocio?.modalidade === "cabeca";
  const voltar = porCabeca ? "/negocios/novo/lote-unico" : "/negocios/novo/gado";
  // "arroba"/"kg" exigem pelo menos um lote; "cabeca", o lote único.
  const semLote = negocio !== null && negocio.lotes.length === 0;

  async function concluir() {
    const negocioId = data.negocioId;
    if (!negocioId || !negocio) return;
    setErroConcluir(null);
    setConcluindo(true);
    let sincronizado = true;
    try {
      // Com pesagem: registra hora_fim_pesagem (hora local). Offline, vai para a fila com a
      // hora capturada agora no aparelho. "cabeca" não tem pesagem.
      if (!porCabeca) {
        const envio = await enviarOuEnfileirar(
          "conclusao",
          await referencia("negocio", negocioId),
          (payload) => concluirNegocio(payload.negocio_id as number),
          { extrasFila: { hora_fim_pesagem: horaLocalAtual() } }
        );
        sincronizado = envio.sincronizado;
      } else {
        sincronizado = negocioId > 0 && !negocio.lotes.some((l) => l.pendente);
      }
    } catch (err) {
      setErroConcluir(mensagemDeErro(err, "Erro ao concluir."));
      setConcluindo(false);
      return;
    }
    reset();
    // Offline, o detalhe pode não estar salvo no aparelho: volta para a listagem, que mostra
    // o negócio como pendente de sincronização.
    router.push(sincronizado ? `/negocios/${negocioId}` : "/negocios");
  }

  if (!data.negocioId) return null;

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href={voltar} label={porCabeca ? "Lote único" : "Pesagem"} />
      <h1 className={cn("page-title", styles.title)}>Revisão do negócio</h1>
      <ProgressSteps current={8} total={PASSOS_NOVO_NEGOCIO} />

      {erro && !negocio ? <div className="state-box state-error glass-panel">{erro}</div> : null}
      {!negocio && !erro ? <div className="state-box glass-panel">Carregando negócio...</div> : null}

      {negocio ? (
        // Na revisão do cadastro não há botão do olho: Admin vê a comissão, Normal vê "-".
        <NegocioCarrossel negocio={negocio} fazenda={null} comissao={admin ? "visivel" : "restrita"} />
      ) : null}

      <div className={styles.acoes}>
        {semLote ? (
          <p className="form-error">
            {porCabeca ? "Informe o lote único antes de concluir." : "Adicione pelo menos um lote antes de concluir."}
          </p>
        ) : null}
        {erroConcluir ? <p className="form-error">{erroConcluir}</p> : null}
        <Button
          type="button"
          variant="brand"
          size="xl"
          className="w-full"
          onClick={concluir}
          disabled={concluindo || !negocio || semLote}
        >
          {concluindo ? "Concluindo..." : "Concluir"}
        </Button>
        <Button type="button" variant="ghost" size="xl" className="w-full" onClick={() => router.push(voltar)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
