"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { AcessoNegocioForm } from "@/components/acesso-negocio-form";
import { useAviso } from "@/components/aviso";
import { PesagemNegocio } from "@/components/pesagem/pesagem-negocio";
import { BackLink } from "@/components/back-link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Fab } from "@/components/fab";
import { ComissaoForm } from "@/components/comissao-form";
import { ListaGados } from "@/components/lista-gados";
import { NegocioCarrossel } from "@/components/negocio-carrossel";
import { TipoNegocioForm } from "@/components/tipo-negocio-form";
import { cn } from "@/lib/utils";
import { modoDoNegocio } from "@/lib/comissao";
import { deleteNegocio } from "@/lib/api/negocios";
import { gerarRomaneios, type TipoRelatorio } from "@/lib/relatorio-romaneio";
import { useEntregarRelatorio } from "@/components/previa-relatorio";
import { negocioParaRomaneio, temPendenciaNoRomaneio } from "@/lib/flows/romaneio-local";
import { useNegocioComPendencias } from "@/lib/flows/use-negocio-com-pendencias";
import { useCompradoresPendentes, useFazendasPendentes, usePecuaristasPendentes } from "@/lib/offline/pendentes";
import { mensagemDeErro } from "@/lib/offline/rede";
import { BotaoOlhoComissao, useExibicaoComissao, useUsuario } from "@/lib/permissoes";
import styles from "./page.module.css";

/**
 * Admin: detalhe completo do negócio. Normal: a tela de pesagem (lotes e pesos, sem
 * valores) — a API só lhe devolve os negócios liberados para ele; os demais, 404.
 */
export default function NegocioDetailPage() {
  const params = useParams<{ id: string }>();
  const usuario = useUsuario();
  if (!usuario) return null;
  return usuario.nivel_acesso === "Admin" ? <NegocioDetailAdmin /> : <PesagemNegocio negocioId={Number(params.id)} />;
}

function NegocioDetailAdmin() {
  const params = useParams<{ id: string }>();
  const { negocio, erro, recarregar } = useNegocioComPendencias(Number(params.id));

  const [gerandoRelatorio, setGerandoRelatorio] = React.useState(false);
  const avisar = useAviso();
  const entregarRelatorio = useEntregarRelatorio();
  // Cadastros ainda na fila: completam o romaneio de um negócio criado offline.
  const fazendasPendentes = useFazendasPendentes();
  const pecuaristasPendentes = usePecuaristasPendentes();
  const compradoresPendentes = useCompradoresPendentes();

  // Comissão: "-" para Normal; para Admin começa escondida e o olho revela.
  const comissao = useExibicaoComissao();
  const porCabeca = negocio?.modalidade === "cabeca";
  const sincronizado = (negocio?.negocio_id ?? 0) > 0;

  // Filtro dos chips do carrossel: 0 = "Geral", i = i-ésimo lote.
  const [filtro, setFiltro] = React.useState(0);
  const lotes = negocio?.lotes ?? [];
  const loteFiltrado = filtro > 0 ? (lotes[Math.min(filtro, lotes.length) - 1] ?? null) : null;
  // Lotes ou cabeças ainda na fila offline seriam enviados a um negócio que não existe mais.
  const temPendencias = lotes.some((lote) => lote.pendente || lote.gados.some((gado) => gado.pendente));

  // Na aba "Geral" o botão pergunta qual documento gerar; num lote, gera direto o romaneio dele.
  const [escolhaRelatorioAberta, setEscolhaRelatorioAberta] = React.useState(false);

  function handleBotaoRelatorio() {
    if (loteFiltrado) void handleGerarRelatorio("romaneio");
    else setEscolhaRelatorioAberta(true);
  }

  async function handleGerarRelatorio(tipo: TipoRelatorio) {
    if (!negocio) return;
    setEscolhaRelatorioAberta(false);
    setGerandoRelatorio(true);
    try {
      // O que está na tela, inclusive o que ainda está na fila offline (valores estimados).
      // Com um lote selecionado nos chips, o romaneio sai só com ele.
      const loteId = loteFiltrado?.lote_id;
      const dados = await negocioParaRomaneio(negocio, {
        fazendas: fazendasPendentes,
        pecuaristas: pecuaristasPendentes,
        compradores: compradoresPendentes,
      });
      const { avisos, ...relatorio } = await gerarRomaneios(
        [dados],
        dados.fazenda ? { [dados.fazenda_id]: dados.fazenda } : {},
        { loteId, tipo },
      );
      entregarRelatorio(relatorio);
      for (const aviso of avisos) avisar(aviso, "aviso");
      if (temPendenciaNoRomaneio(negocio, loteId)) {
        avisar(
          "Relatório gerado com dados ainda não sincronizados: os valores são estimados e podem mudar na sincronização.",
          "aviso",
        );
      }
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao gerar relatório."), "aviso");
    } finally {
      setGerandoRelatorio(false);
    }
  }

  return (
    <div className={cn("page-wide", styles.page, "pt-safe")}>
      <div className="page-header-acoes">
        <BackLink href="/negocios" />
        {/* Olho e exclusão só para Admin (a API também recusa a exclusão com 403). */}
        {comissao.admin ? (
          <div className="page-header-botoes">
            <BotaoOlhoComissao visivel={comissao.visivel} onAlternar={comissao.alternar} />
            {negocio ? (
              <BotaoExcluir
                descricao="este negócio, com todos os lotes e cabeças"
                excluir={() => deleteNegocio(negocio.negocio_id)}
                destino="/negocios"
                bloqueio={!sincronizado || temPendencias ? "Disponível após a sincronização" : null}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {!negocio && !erro ? <div className="state-box glass-panel">Carregando negócio...</div> : null}

      {erro && !negocio ? (
        <div className="state-box state-error glass-panel">
          {erro}
          <div>
            <Button className="retry-button" variant="brand" onClick={() => recarregar()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : null}

      {negocio ? (
        <>
          <NegocioCarrossel
            negocio={negocio}
            fazenda={negocio.fazenda ?? null}
            comissao={comissao.exibicao}
            ativo={filtro}
            onAtivoChange={setFiltro}
            cabecasNoQuadro={false}
          />

          {sincronizado ? (
            <TipoNegocioForm
              key={negocio.tipo_negocio}
              negocioId={negocio.negocio_id}
              tipoNegocio={negocio.tipo_negocio}
              onUpdated={() => recarregar()}
            />
          ) : null}

          {/* Responsável e visualização (Público/Privado): só Admin, negócio já no servidor. */}
          {sincronizado && comissao.admin ? (
            <AcessoNegocioForm
              key={`${negocio.responsavel_id}-${negocio.status_visualizacao}`}
              negocio={negocio}
              onUpdated={() => recarregar()}
            />
          ) : null}

          {/* Normal não vê nem altera a comissão (a API também ignora o que ele enviar). */}
          {comissao.admin ? (
            <ComissaoForm
              negocioId={negocio.negocio_id}
              porcentagem={negocio.porcentagem_comissao}
              comissao={negocio.comissao}
              modo={modoDoNegocio(negocio)}
              tipoGado={negocio.tipo_gado}
              modalidade={negocio.modalidade}
              valorTotal={negocio.valor_total_bruto}
              pesoTotalQuilos={negocio.peso_total_quilos}
              // Na fila desde a versão anterior: o valor foi digitado como percentual.
              revisar={
                !sincronizado && negocio.porcentagem_comissao !== null && modoDoNegocio(negocio) === "por_arroba"
              }
              visivel={comissao.visivel}
              onUpdated={() => recarregar()}
            />
          ) : null}

          {/* Cabeças do filtro ativo ("Geral" = todas). Negócios "cabeca" não têm pesagem. */}
          {porCabeca ? null : (
            <ListaGados negocioId={negocio.negocio_id} lotes={lotes} loteFiltrado={loteFiltrado} editavel />
          )}
        </>
      ) : null}

      <Fab
        icon={FileText}
        label="Gerar relatório"
        onClick={handleBotaoRelatorio}
        disabled={gerandoRelatorio || !negocio}
        disabledTitle={gerandoRelatorio ? "Gerando relatório..." : "Carregando negócio..."}
      />

      <Dialog open={escolhaRelatorioAberta} onOpenChange={setEscolhaRelatorioAberta} title="Gerar relatório">
        <div className={styles.escolhaRelatorio}>
          <Button type="button" variant="brand" size="xl" onClick={() => handleGerarRelatorio("romaneio")}>
            Gerar Romaneio Geral
          </Button>
          <Button type="button" variant="brand" size="xl" onClick={() => handleGerarRelatorio("fechamento")}>
            Gerar Fechamento de Negociação
          </Button>
        </div>
      </Dialog>

      {/* Negócios "cabeca" não têm pesagem; sem lote não há onde registrar a cabeça. */}
      {negocio && !porCabeca && negocio.lotes.length > 0 ? (
        <Fab icon={Plus} label="Adicionar gado" href={`/negocios/${negocio.negocio_id}/gado/novo`} stacked />
      ) : null}
    </div>
  );
}
