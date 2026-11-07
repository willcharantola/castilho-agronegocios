import { fetchImpostos } from "@/lib/api/configuracoes";
import { fetchCompradores } from "@/lib/api/compradores";
import { fetchFazendas } from "@/lib/api/fazendas";
import { fetchPecuaristas } from "@/lib/api/pecuaristas";
import type { Comprador, Fazenda, NegocioDetail, Pecuarista } from "@/lib/api/types";
import { centavos, estimarImpostos } from "@/lib/calculo-gado";
import type { NegocioComPendencias } from "@/lib/offline/pendentes";

/** Algo do negócio (ou só do lote, quando `loteId` vem) ainda está na fila offline. */
export function temPendenciaNoRomaneio(negocio: NegocioComPendencias, loteId?: number) {
  const lotes = loteId === undefined ? negocio.lotes : negocio.lotes.filter((l) => l.lote_id === loteId);
  return (
    Boolean(negocio.pendente && loteId === undefined) ||
    lotes.some((lote) => lote.pendente || lote.gados.some((gado) => gado.pendente))
  );
}

/** Leitura que pode falhar sem rede e sem cópia no aparelho: o campo sai em branco. */
async function talvez<T>(buscar: () => Promise<T>): Promise<T | null> {
  try {
    return await buscar();
  } catch {
    return null;
  }
}

/**
 * O negócio como aparece na tela (servidor + fila offline) no formato do romaneio. Os
 * valores do que ainda não sincronizou já vêm estimados de `comPendencias`; aqui só se
 * completa o que um negócio criado offline não tem:
 * - fazenda, pecuarista e comprador completos (I.E., município, documentos, dados
 *   bancários), das listas guardadas no aparelho ou dos cadastros pendentes (`pendentes`);
 * - alíquotas da empresa (as que a API vai gravar ao sincronizar), para Funrural, Senar e líquido;
 * - horários inicial e final (negócio criado offline), pela primeira e pela última cabeça pesada.
 */
export async function negocioParaRomaneio(
  negocio: NegocioComPendencias,
  pendentes: { fazendas: Fazenda[]; pecuaristas: Pecuarista[]; compradores: Comprador[] }
): Promise<NegocioDetail> {
  const resultado: NegocioDetail = { ...negocio };

  if (!resultado.fazenda?.inscricao_estadual) {
    const fazendas = [...pendentes.fazendas, ...((await talvez(fetchFazendas)) ?? [])];
    resultado.fazenda = fazendas.find((f) => f.fazenda_id === negocio.fazenda_id) ?? resultado.fazenda;
  }
  const listaPecuaristas = async () => [...pendentes.pecuaristas, ...((await talvez(fetchPecuaristas)) ?? [])];
  if (!resultado.pecuarista?.cpf_cnpj) {
    const pecuarista = (await listaPecuaristas()).find((p) => p.pecuarista_id === negocio.pecuarista_id);
    if (pecuarista) resultado.pecuarista = pecuarista as NegocioDetail["pecuarista"];
  }

  // Negócio criado offline só guarda o nome do comprador.
  const comprador = resultado.comprador;
  if (comprador && !comprador.documento) {
    if (comprador.tipo === "frigorifico") {
      const lista = [...pendentes.compradores, ...((await talvez(fetchCompradores)) ?? [])];
      const achado = lista.find((c) => c.comprador_id === comprador.id);
      if (achado) {
        resultado.comprador = {
          ...comprador,
          documento: achado.cnpj,
          inscricao_estadual: achado.inscricao_estadual,
          municipio: achado.municipio,
        };
      }
    } else {
      const achado = (await listaPecuaristas()).find((p) => p.pecuarista_id === comprador.id);
      if (achado) {
        // Como a API: município da primeira fazenda do pecuarista, sem inscrição estadual.
        resultado.comprador = {
          ...comprador,
          documento: achado.cpf_cnpj,
          municipio: achado.pecuarista_fazenda?.[0]?.fazenda.municipio ?? null,
        };
      }
    }
  }

  if (resultado.aliquota_funrural === null || resultado.aliquota_senar === null) {
    const impostos = await talvez(fetchImpostos);
    if (impostos) {
      resultado.aliquota_funrural = impostos.aliquota_funrural;
      resultado.aliquota_senar = impostos.aliquota_senar;
    }
  }
  if (resultado.valor_total_bruto !== null && (resultado.funrural === null || resultado.valor_total_liquido === null)) {
    resultado.valor_total_bruto = centavos(resultado.valor_total_bruto);
    Object.assign(resultado, estimarImpostos(resultado, resultado.valor_total_bruto));
  }

  // Negócio criado offline: a API ainda não registrou os horários da pesagem.
  if (negocio.pendente) {
    const horarios = negocio.lotes
      .flatMap((lote) => lote.gados.map((gado) => gado.horario_pesagem))
      .filter((h): h is string => h !== null)
      .sort();
    resultado.hora_inicio_pesagem ??= horarios[0] ?? null;
    resultado.hora_fim_pesagem ??= horarios[horarios.length - 1] ?? null;
  }
  return resultado;
}
