"use client";

import * as React from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { TintedInput } from "@/components/form/tinted-input";
import { Button } from "@/components/ui/button";
import { createTipoGado, deleteTipoGado, fetchTiposGado, updateTipoGado } from "@/lib/api/tipos-gado";
import type { TipoGadoCatalogo } from "@/lib/api/types";
import { mensagemDeErro } from "@/lib/offline/rede";
import { useIsAdmin } from "@/lib/permissoes";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

const ordenar = (tipos: TipoGadoCatalogo[]) =>
  [...tipos].sort((a, b) => a.nome_gado.localeCompare(b.nome_gado, "pt-BR"));

/**
 * Nomes sugeridos para os lotes (ex.: Nelore, Angus): no cadastro do lote, tocar em um
 * preenche o nome. Renomear ou excluir não muda os lotes já cadastrados. Só Admin altera
 * (a API responde 403 aos demais); Normal vê a lista.
 */
export default function TiposDeGadoPage() {
  const admin = useIsAdmin();
  const [tipos, setTipos] = React.useState<TipoGadoCatalogo[] | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [novoNome, setNovoNome] = React.useState("");
  const [editando, setEditando] = React.useState<{ id: number; nome: string } | null>(null);
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    fetchTiposGado()
      .then((lista) => setTipos(ordenar(lista)))
      .catch((err: unknown) => setErro(mensagemDeErro(err, "Erro ao carregar.")));
  }, []);

  async function executar(acao: () => Promise<void>) {
    setErro(null);
    setSalvando(true);
    try {
      await acao();
    } catch (err) {
      setErro(mensagemDeErro(err, "Erro ao salvar."));
    } finally {
      setSalvando(false);
    }
  }

  function adicionar(event: React.FormEvent) {
    event.preventDefault();
    const nome = novoNome.trim();
    if (!nome) return;
    executar(async () => {
      const criado = await createTipoGado(nome);
      setTipos((atuais) => ordenar([...(atuais ?? []), criado]));
      setNovoNome("");
    });
  }

  function renomear(event: React.FormEvent) {
    event.preventDefault();
    if (!editando) return;
    const nome = editando.nome.trim();
    if (!nome) return;
    executar(async () => {
      const salvo = await updateTipoGado(editando.id, nome);
      setTipos((atuais) => ordenar((atuais ?? []).map((t) => (t.tipo_gado_id === salvo.tipo_gado_id ? salvo : t))));
      setEditando(null);
    });
  }

  function excluir(tipo: TipoGadoCatalogo) {
    if (!window.confirm(`Excluir o tipo de gado "${tipo.nome_gado}"? Os lotes já cadastrados não mudam.`)) return;
    executar(async () => {
      await deleteTipoGado(tipo.tipo_gado_id);
      setTipos((atuais) => (atuais ?? []).filter((t) => t.tipo_gado_id !== tipo.tipo_gado_id));
    });
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/configuracoes" />
      <h1 className="page-title">Tipos de gado</h1>
      <p className={styles.subtitle}>
        Nomes sugeridos ao cadastrar um lote. Renomear ou excluir não altera os lotes já cadastrados.
      </p>

      {admin ? (
        <form onSubmit={adicionar} className={styles.linha}>
          <TintedInput
            tint="pink"
            maxLength={30}
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Ex: Nelore"
            aria-label="Novo tipo de gado"
            className={styles.input}
          />
          <Button type="submit" variant="brand" disabled={salvando || !novoNome.trim()}>
            <Plus size={16} aria-hidden /> Adicionar
          </Button>
        </form>
      ) : (
        <p className={styles.subtitle}>Apenas administradores podem alterar esta lista.</p>
      )}

      {erro ? <p className="form-error">{erro}</p> : null}
      {tipos === null && !erro ? <div className="state-box glass-panel">Carregando...</div> : null}
      {tipos && tipos.length === 0 ? <div className="state-box glass-panel">Nenhum tipo de gado cadastrado.</div> : null}

      {tipos && tipos.length > 0 ? (
        <div className="card-list">
          {tipos.map((tipo) =>
            editando?.id === tipo.tipo_gado_id ? (
              <form key={tipo.tipo_gado_id} onSubmit={renomear} className={cn("list-card glass-panel", styles.linha)}>
                <TintedInput
                  tint="pink"
                  maxLength={30}
                  autoFocus
                  value={editando.nome}
                  onChange={(e) => setEditando({ id: tipo.tipo_gado_id, nome: e.target.value })}
                  aria-label={`Novo nome de ${tipo.nome_gado}`}
                  className={styles.input}
                />
                <Button type="submit" variant="brand" disabled={salvando || !editando.nome.trim()}>
                  Salvar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditando(null)} disabled={salvando}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <div key={tipo.tipo_gado_id} className="list-card glass-panel">
                <span className="card-icon">
                  <Tags size={18} />
                </span>
                <div className="card-info">
                  <p className="card-name">{tipo.nome_gado}</p>
                </div>
                {admin ? (
                  <>
                    <button
                      type="button"
                      className={styles.acao}
                      onClick={() => setEditando({ id: tipo.tipo_gado_id, nome: tipo.nome_gado })}
                      disabled={salvando}
                      aria-label={`Renomear ${tipo.nome_gado}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.acao}
                      onClick={() => excluir(tipo)}
                      disabled={salvando}
                      aria-label={`Excluir ${tipo.nome_gado}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : null}
              </div>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
