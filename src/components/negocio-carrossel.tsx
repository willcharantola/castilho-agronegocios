"use client";

import * as React from "react";
import { BotaoMapa } from "@/components/botao-mapa";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import { formatCurrency, formatDate, formatHora, formatNumber, formatPercent } from "@/lib/format";
import {
  GENERO_LABELS,
  MODALIDADE_LABELS,
  TIPO_GADO_LABELS,
  TIPO_LOTE_LABELS,
  TIPO_NEGOCIO_LABELS,
  VALOR_UNIDADE_LABELS,
} from "@/lib/labels";
import type { AgregadosPeso, Fazenda, Gado } from "@/lib/api/types";
import type { ComPendencia, LoteComPendencia, NegocioComPendencias } from "@/lib/offline/pendentes";
import { formatarCriterioComissao, modoDoNegocio } from "@/lib/comissao";
import { exibirComissao, type ExibicaoComissao } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

type Item = { label: string; valor: string };

const ou = <T,>(valor: T | null | undefined, formatar: (v: T) => string) =>
  valor !== null && valor !== undefined ? formatar(valor) : "—";
const kg = (v: number) => `${formatNumber(v)} kg`;
const arroba = (v: number) => `${formatNumber(v)} @`;

/** Pesos, médias, extremos e rendimento médio (não se aplicam à modalidade "cabeca"). */
function itensPeso(a: AgregadosPeso): Item[] {
  return [
    { label: "Peso total", valor: ou(a.peso_total_quilos, kg) },
    { label: "Peso total (@)", valor: ou(a.peso_total_arroba, arroba) },
    { label: "Peso médio", valor: ou(a.peso_medio_quilos, kg) },
    { label: "Peso médio (@)", valor: ou(a.peso_medio_arroba, arroba) },
    { label: "Mais pesado", valor: ou(a.mais_pesado_quilos, kg) },
    { label: "Mais pesado (@)", valor: ou(a.mais_pesado_arroba, arroba) },
    { label: "Mais leve", valor: ou(a.mais_leve_quilos, kg) },
    { label: "Mais leve (@)", valor: ou(a.mais_leve_arroba, arroba) },
    { label: "Rendimento médio", valor: ou(a.rendimento_medio, formatPercent) },
  ];
}

function Grade({ itens }: { itens: Item[] }) {
  return (
    <dl className="carrossel-grade">
      {itens.map((item) => (
        <div key={item.label} className="carrossel-item">
          <dt>{item.label}</dt>
          <dd>{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Demais dados, fora do quadro verde: um quadro branco com borda verde por item. */
function Detalhes({ itens }: { itens: Item[] }) {
  return (
    <dl className="carrossel-detalhes">
      {itens.map((item) => (
        <div key={item.label} className="carrossel-detalhe">
          <dt>{item.label}</dt>
          <dd>{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function rotuloAliquota(nome: string, aliquota: number | null) {
  return aliquota !== null ? `${nome} (${formatPercent(aliquota)})` : nome;
}

/**
 * "Geral": o quadro verde traz só os destaques (fazenda, partes, data, modalidade e tipos);
 * os demais dados ficam abaixo, em quadros brancos. `children` entra no fim do quadro verde.
 */
function CartaoGeral({
  negocio,
  fazenda,
  comissao,
  children,
}: {
  negocio: NegocioComPendencias;
  fazenda: Fazenda | null;
  comissao: ExibicaoComissao;
  children?: React.ReactNode;
}) {
  const porCabeca = negocio.modalidade === "cabeca";
  const destaques: Item[] = [
    { label: "Pecuarista", valor: negocio.pecuarista?.nome_pecuarista ?? "—" },
    { label: "Comprador", valor: negocio.comprador?.nome ?? "—" },
    { label: "Data", valor: formatDate(negocio.data_negocio) },
    { label: "Modalidade", valor: MODALIDADE_LABELS[negocio.modalidade] },
    { label: "Tipo de gado", valor: TIPO_GADO_LABELS[negocio.tipo_gado] ?? negocio.tipo_gado },
    { label: "Tipo de negócio", valor: TIPO_NEGOCIO_LABELS[negocio.tipo_negocio] ?? "—" },
  ];
  const detalhes: Item[] = [
    { label: VALOR_UNIDADE_LABELS[negocio.modalidade], valor: formatCurrency(negocio.valor_unidade) },
    { label: "Cabeças", valor: ou(negocio.qtd_animais, String) },
    { label: "Valor total", valor: ou(negocio.valor_total, formatCurrency) },
    { label: "Valor médio por cabeça", valor: ou(negocio.valor_medio, formatCurrency) },
    ...(porCabeca
      ? []
      : [
          ...itensPeso(negocio),
          { label: "Início da pesagem", valor: negocio.hora_inicio_pesagem ? formatHora(negocio.hora_inicio_pesagem) : "—" },
          { label: "Fim da pesagem", valor: negocio.hora_fim_pesagem ? formatHora(negocio.hora_fim_pesagem) : "—" },
        ]),
    { label: rotuloAliquota("Funrural", negocio.aliquota_funrural), valor: ou(negocio.funrural, formatCurrency) },
    { label: rotuloAliquota("Senar", negocio.aliquota_senar), valor: ou(negocio.senar, formatCurrency) },
    {
      label: "Critério da comissão",
      valor: exibirComissao(negocio.porcentagem_comissao, comissao, (v) =>
        formatarCriterioComissao(v, modoDoNegocio(negocio))
      ),
    },
    { label: "Comissão", valor: exibirComissao(negocio.comissao, comissao, formatCurrency) },
    { label: "Observação", valor: negocio.observacao || "—" },
  ];
  const nomeFazenda = fazenda?.nome_fazenda ?? negocio.fazenda?.nome_fazenda ?? `Fazenda #${negocio.fazenda_id}`;
  return (
    <>
      <div className="carrossel-cartao glass-dark">
        <div className="carrossel-cabecalho">
          <div>
            <p className="carrossel-titulo">{nomeFazenda}</p>
            {negocio.pendente ? <PendenteBadge pendente={negocio.pendente} /> : null}
          </div>
          <BotaoMapa
            localizacao={fazenda?.localizacao_google ?? negocio.fazenda?.localizacao_google}
            endereco={fazenda?.endereco_fazenda ?? negocio.fazenda?.endereco_fazenda}
            claro
          />
        </div>
        <Grade itens={destaques} />
        {children}
      </div>
      <Detalhes itens={detalhes} />
    </>
  );
}

/** Lote: no quadro verde, nome, tipo, gênero e carimbo; valores e pesos ficam abaixo. */
function CartaoLote({
  lote,
  negocio,
  children,
}: {
  lote: LoteComPendencia;
  negocio: NegocioComPendencias;
  children?: React.ReactNode;
}) {
  const { modalidade } = negocio;
  const porCabeca = modalidade === "cabeca";
  const destaques: Item[] = [
    { label: "Tipo de lote", valor: TIPO_LOTE_LABELS[lote.tipo_lote] },
    { label: "Gênero", valor: GENERO_LABELS[lote.genero] },
    { label: "Média do carimbo", valor: lote.media_carimbo || "—" },
    { label: "Ano do carimbo", valor: lote.ano_carimbo || "—" },
  ];
  const detalhes: Item[] = [
    ...(modalidade === "arroba" ? [{ label: "Rendimento de carcaça", valor: formatPercent(lote.rendimento_carcaca) }] : []),
    { label: "Cabeças", valor: String(lote.qtd_animais) },
    { label: "Valor total do lote", valor: formatCurrency(lote.valor_total_lote) },
    { label: "Valor médio por cabeça", valor: ou(lote.valor_medio_cabeca_lote, formatCurrency) },
    ...(porCabeca ? [] : itensPeso(lote)),
  ];
  return (
    <>
      <div className="carrossel-cartao glass-dark">
        <div className="carrossel-cabecalho">
          <div>
            <p className="carrossel-titulo">{lote.nome_lote}</p>
            {lote.pendente ? <PendenteBadge pendente={lote.pendente} /> : null}
          </div>
        </div>
        <Grade itens={destaques} />
        {children}
      </div>
      <Detalhes itens={detalhes} />
    </>
  );
}

type CabecaListada = { gado: ComPendencia<Gado>; lote: LoteComPendencia };

/** Cabeças do filtro ativo: todas (com a coluna "Lote") no "Geral" ou só as do lote. */
function ListaCabecas({
  cabecas,
  mostrarLote,
  vazio,
  onGadoClick,
}: {
  cabecas: CabecaListada[];
  mostrarLote: boolean;
  vazio: string;
  onGadoClick?: (gado: ComPendencia<Gado>) => void;
}) {
  return (
    <>
      {cabecas.length === 0 ? (
        <p className="carrossel-vazio">{vazio}</p>
      ) : (
        <div className="carrossel-cabecas">
          <p className="carrossel-subtitulo">Cabeças ({cabecas.length})</p>
          <table>
            <thead>
              <tr>
                {mostrarLote ? <th scope="col">Lote</th> : null}
                <th scope="col">Horário</th>
                <th scope="col">Peso</th>
                <th scope="col">Arrobas</th>
                <th scope="col">Valor</th>
              </tr>
            </thead>
            <tbody>
              {cabecas.map(({ gado, lote }) => {
                const editavel = onGadoClick !== undefined;
                return (
                  <tr
                    key={gado.gado_id}
                    className={cn(editavel && "carrossel-linha-editavel", gado.pendente && "carrossel-linha-pendente")}
                    onClick={editavel ? () => onGadoClick(gado) : undefined}
                    onKeyDown={
                      editavel
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onGadoClick(gado);
                            }
                          }
                        : undefined
                    }
                    tabIndex={editavel ? 0 : undefined}
                    aria-label={editavel ? `Editar cabeça de ${formatNumber(gado.peso_total)} kg` : undefined}
                  >
                    {mostrarLote ? <td>{lote.nome_lote}</td> : null}
                    <td>{gado.horario_pesagem ? formatHora(gado.horario_pesagem) : "—"}</td>
                    <td>{formatNumber(gado.peso_total)}</td>
                    <td>{formatNumber(gado.peso_arroba)}</td>
                    <td>{ou(gado.valor_total, formatCurrency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/**
 * Dados do negócio: um quadro verde com os destaques (e a lista de cabeças) e, abaixo, os
 * demais dados em quadros brancos. Os chips acima ("Geral" e um por lote) funcionam como
 * filtro e trocam o conteúdo. Setas
 * esquerda/direita, Home e End navegam entre os chips.
 *
 * Com `ativo`/`onAtivoChange` o filtro fica com a página (ex.: para listar as cabeças fora
 * do quadro, com `cabecasNoQuadro={false}`).
 */
export function NegocioCarrossel({
  negocio,
  fazenda,
  onGadoClick,
  comissao,
  ativo: ativoControlado,
  onAtivoChange,
  cabecasNoQuadro = true,
}: {
  negocio: NegocioComPendencias;
  fazenda: Fazenda | null;
  /** Como mostrar a comissão no cartão "Geral" (perfil e botão do olho). */
  comissao: ExibicaoComissao;
  /** Torna as cabeças clicáveis (ex.: abrir a edição). */
  onGadoClick?: (gado: ComPendencia<Gado>) => void;
  /** Chip ativo: 0 = "Geral", i = i-ésimo lote. */
  ativo?: number;
  onAtivoChange?: (indice: number) => void;
  cabecasNoQuadro?: boolean;
}) {
  const idBase = React.useId();
  const [ativoInterno, setAtivoInterno] = React.useState(0);
  const ativo = ativoControlado ?? ativoInterno;
  const setAtivo = (indice: number) => {
    setAtivoInterno(indice);
    onAtivoChange?.(indice);
  };
  const chipsRef = React.useRef<(HTMLButtonElement | null)[]>([]);
  const titulos = ["Geral", ...negocio.lotes.map((l) => l.nome_lote)];
  const total = titulos.length;
  // Se o lote ativo for excluído, volta ao último disponível.
  const indiceAtivo = Math.min(ativo, total - 1);

  // Mantém o chip ativo visível quando a faixa rola (muitos lotes).
  React.useEffect(() => {
    const chip = chipsRef.current[indiceAtivo];
    const faixa = chip?.parentElement;
    if (!chip || !faixa) return;
    const fora = chip.offsetLeft < faixa.scrollLeft || chip.offsetLeft + chip.offsetWidth > faixa.scrollLeft + faixa.clientWidth;
    if (fora) faixa.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [indiceAtivo]);

  function irPara(indice: number) {
    const alvo = Math.max(0, Math.min(total - 1, indice));
    setAtivo(alvo);
    chipsRef.current[alvo]?.focus();
  }

  function aoTeclar(e: React.KeyboardEvent) {
    const destino =
      e.key === "ArrowRight"
        ? indiceAtivo + 1
        : e.key === "ArrowLeft"
          ? indiceAtivo - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? total - 1
              : null;
    if (destino === null) return;
    e.preventDefault();
    irPara(destino);
  }

  const estimado = Boolean(negocio.pendente) || negocio.lotes.some((l) => l.pendente);
  const loteAtivo = indiceAtivo > 0 ? negocio.lotes[indiceAtivo - 1] : null;
  const cabecas: CabecaListada[] = (loteAtivo ? [loteAtivo] : negocio.lotes).flatMap((lote) =>
    lote.gados.map((gado) => ({ gado, lote }))
  );

  // Negócios "cabeca" não têm pesagem individual. A lista continua dentro do quadro verde.
  const listaCabecas =
    cabecasNoQuadro && negocio.modalidade !== "cabeca" && negocio.lotes.length > 0 ? (
      <ListaCabecas
        cabecas={cabecas}
        mostrarLote={!loteAtivo && negocio.lotes.length > 1}
        vazio={loteAtivo ? "Nenhuma cabeça pesada neste lote." : "Nenhuma cabeça pesada neste negócio."}
        onGadoClick={onGadoClick}
      />
    ) : null;

  return (
    <section className="carrossel" aria-label="Dados do negócio">
      <div className="carrossel-chips" role="tablist" aria-label="Geral e lotes" onKeyDown={aoTeclar}>
        {titulos.map((titulo, i) => (
          <button
            key={`${i}-${titulo}`}
            ref={(el) => {
              chipsRef.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${idBase}-chip-${i}`}
            aria-selected={i === indiceAtivo}
            aria-controls={`${idBase}-cartao`}
            tabIndex={i === indiceAtivo ? 0 : -1}
            className={cn("carrossel-chip", i === indiceAtivo && "carrossel-chip-ativo")}
            onClick={() => setAtivo(i)}
          >
            {titulo}
          </button>
        ))}
      </div>

      {estimado ? <p className="carrossel-aviso">Há dados ainda não sincronizados: os totais são estimados.</p> : null}

      <article
        role="tabpanel"
        id={`${idBase}-cartao`}
        aria-labelledby={`${idBase}-chip-${indiceAtivo}`}
        tabIndex={0}
        className="carrossel-painel"
      >
        {loteAtivo ? (
          <CartaoLote key={loteAtivo.lote_id} lote={loteAtivo} negocio={negocio}>
            {listaCabecas}
          </CartaoLote>
        ) : (
          <CartaoGeral negocio={negocio} fazenda={fazenda} comissao={comissao}>
            {listaCabecas}
          </CartaoGeral>
        )}
      </article>

      {negocio.lotes.length === 0 ? (
        <p className="carrossel-vazio carrossel-vazio-claro">
          {negocio.modalidade === "cabeca"
            ? "O lote único ainda não foi informado."
            : "Este negócio ainda não tem lotes."}
        </p>
      ) : null}
    </section>
  );
}
