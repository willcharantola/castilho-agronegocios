"use client";

import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { fetchNegocio } from "@/lib/api/negocios";
import type { NegocioDetail } from "@/lib/api/types";
import { offlineDb } from "@/lib/offline/db";
import { ehIdTemporario, useVersaoSincronizacao, type RegistroSalvo } from "@/lib/offline/fila";
import {
  comPendencias,
  negocioDetailDePendente,
  usePendenciasNegocio,
  type NegocioComPendencias,
} from "@/lib/offline/pendentes";
import { mensagemDeErro } from "@/lib/offline/rede";

/**
 * Negócio com lotes e cabeças, já somando o que ainda está na fila offline. Funciona com
 * id real (busca na API, com cache) ou temporário (negócio criado offline, lido da fila).
 * `idReal` aparece quando um negócio temporário é sincronizado com a tela aberta.
 */
export function useNegocioComPendencias(negocioId: number | null | undefined) {
  const [servidor, setServidor] = React.useState<NegocioDetail | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const versaoSincronizacao = useVersaoSincronizacao();
  const temporario = ehIdTemporario(negocioId);

  const local = useLiveQuery(async () => {
    if (!negocioId || !temporario) return null;
    const registro = (await offlineDb.pendentes.get(-negocioId)) as RegistroSalvo | undefined;
    const mapeado = registro
      ? undefined
      : await offlineDb.mapeamentos.where("idLocal").equals(-negocioId).first();
    return { registro, idReal: mapeado?.idReal };
  }, [negocioId, temporario]);

  const recarregar = React.useCallback(async () => {
    if (!negocioId || temporario) return;
    try {
      setServidor(await fetchNegocio(negocioId));
      setErro(null);
    } catch (err) {
      setErro(mensagemDeErro(err, "Erro ao carregar o negócio."));
    }
  }, [negocioId, temporario]);

  React.useEffect(() => {
    // Busca de dados ao montar/trocar de negócio e após cada sincronização da fila.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
  }, [recarregar, versaoSincronizacao]);

  const pendencias = usePendenciasNegocio(negocioId);
  const base = temporario ? (local?.registro ? negocioDetailDePendente(local.registro) : null) : servidor;
  const negocio: NegocioComPendencias | null = React.useMemo(
    () => (base ? comPendencias(base, pendencias) : null),
    [base, pendencias]
  );

  return { negocio, erro, recarregar, idReal: local?.idReal ?? null };
}
