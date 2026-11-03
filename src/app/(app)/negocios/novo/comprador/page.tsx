"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, User, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BackLink } from "@/components/back-link";
import { CompradorFields, compradorSchema, type CompradorFormValues } from "@/components/comprador-fields";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createComprador, fetchCompradores } from "@/lib/api/compradores";
import { fetchPecuaristas } from "@/lib/api/pecuaristas";
import type { Comprador, Pecuarista } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { PASSOS_NOVO_NEGOCIO, useNegocioFlow } from "@/lib/flows/negocio-flow";
import { enviarOuEnfileirar, idTemporario } from "@/lib/offline/fila";
import { mensagemDeErro } from "@/lib/offline/rede";
import { PendenteBadge } from "@/components/offline/pendente-badge";
import {
  mesclarPendentes,
  useCompradoresPendentes,
  usePecuaristasPendentes,
  type ComPendencia,
} from "@/lib/offline/pendentes";
import styles from "./page.module.css";

/** Só os dígitos do CPF/CNPJ, para reconhecer o pecuarista que já virou comprador. */
const documento = (valor: string) => valor.replace(/\D/g, "");

/** Item da lista: um comprador, ou um pecuarista que ainda não existe como comprador. */
type Opcao =
  | { tipo: "comprador"; nome: string; comprador: ComPendencia<Comprador> }
  | { tipo: "pecuarista"; nome: string; pecuarista: ComPendencia<Pecuarista> };

export default function NovoNegocioCompradorPage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();
  const [compradoresServidor, setCompradores] = React.useState<Comprador[] | null>(null);
  const [pecuaristasServidor, setPecuaristas] = React.useState<Pecuarista[] | null>(null);
  // Inclui cadastros feitos offline ainda não sincronizados (id negativo).
  const compradoresPendentes = useCompradoresPendentes();
  const pecuaristasPendentes = usePecuaristasPendentes();
  const compradores = React.useMemo(
    () => mesclarPendentes(compradoresServidor, compradoresPendentes),
    [compradoresServidor, compradoresPendentes]
  );
  const pecuaristas = React.useMemo(
    () => mesclarPendentes(pecuaristasServidor, pecuaristasPendentes),
    [pecuaristasServidor, pecuaristasPendentes]
  );
  const [error, setError] = React.useState<string | null>(null);
  // Pecuarista escolhido como comprador: abre o formulário dos dados que faltam.
  const [pecuaristaComprador, setPecuaristaComprador] = React.useState<Pecuarista | null>(null);

  React.useEffect(() => {
    if (!data.pecuaristaId || !data.fazendaId) {
      router.replace(data.pecuaristaId ? "/negocios/novo/fazenda" : "/negocios/novo");
      return;
    }
    fetchCompradores()
      .then(setCompradores)
      .catch((err: unknown) => {
        setError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    // Sem a lista de pecuaristas, a tela continua só com os compradores.
    fetchPecuaristas()
      .then(setPecuaristas)
      .catch(() => setPecuaristas([]));
  }, [data.pecuaristaId, data.fazendaId, router]);

  /**
   * Compradores e pecuaristas juntos, em ordem alfabética. Fica de fora o próprio vendedor
   * do negócio e o pecuarista que já tem um comprador com o mesmo CPF/CNPJ (ele aparece
   * pelo comprador).
   */
  const opcoes = React.useMemo<Opcao[] | null>(() => {
    if (!compradores) return null;
    const documentosDeCompradores = new Set(compradores.map((c) => documento(c.cnpj)).filter(Boolean));
    const lista: Opcao[] = [
      ...compradores.map((comprador) => ({ tipo: "comprador" as const, nome: comprador.nome_empresa, comprador })),
      ...(pecuaristas ?? [])
        .filter(
          (p) => p.pecuarista_id !== data.pecuaristaId && !documentosDeCompradores.has(documento(p.cpf_cnpj))
        )
        .map((pecuarista) => ({ tipo: "pecuarista" as const, nome: pecuarista.nome_pecuarista, pecuarista })),
    ];
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [compradores, pecuaristas, data.pecuaristaId]);

  if (!data.fazendaId) return null;

  function selecionar(compradorId: number, nome: string) {
    update({ compradorId, compradorNome: nome });
    router.push("/negocios/novo/modalidade");
  }

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href="/negocios/novo/fazenda" />
      <h1 className={cn("page-title", styles.title)}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={3} total={PASSOS_NOVO_NEGOCIO} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <p className="section-title">Selecione o comprador</p>

      {opcoes === null && !error ? <div className="state-box glass-panel">Carregando compradores...</div> : null}

      {error && !opcoes ? <div className="state-box state-error glass-panel">{error}</div> : null}

      {opcoes && opcoes.length === 0 ? (
        <div className="state-box glass-panel">Nenhum comprador cadastrado ainda.</div>
      ) : null}

      {opcoes && opcoes.length > 0 ? (
        <div className="card-list">
          {opcoes.map((opcao) =>
            opcao.tipo === "comprador" ? (
              <button
                key={`c${opcao.comprador.comprador_id}`}
                type="button"
                onClick={() => selecionar(opcao.comprador.comprador_id, opcao.comprador.nome_empresa)}
                className={cn("list-card", styles.card, "glass-dark")}
              >
                <span className="card-icon-on-dark">
                  <Building2 size={18} />
                </span>
                <div className="card-info">
                  <p className={styles.cardName}>{opcao.comprador.nome_empresa}</p>
                  <p className="card-meta-on-dark"> {opcao.comprador.municipio}</p>
                  <p className="card-meta-on-dark">Contato: {opcao.comprador.pessoa_contato}</p>
                  {opcao.comprador.pendente ? <PendenteBadge pendente={opcao.comprador.pendente} /> : null}
                </div>
              </button>
            ) : (
              <button
                key={`p${opcao.pecuarista.pecuarista_id}`}
                type="button"
                onClick={() => setPecuaristaComprador(opcao.pecuarista)}
                className={cn("list-card", styles.card, "glass-dark")}
              >
                <span className="card-icon-on-dark">
                  <User size={18} />
                </span>
                <div className="card-info">
                  <p className={styles.cardName}>{opcao.pecuarista.nome_pecuarista}</p>
                  <p className="card-meta-on-dark">CPF/CNPJ: {opcao.pecuarista.cpf_cnpj}</p>
                  {opcao.pecuarista.pendente ? <PendenteBadge pendente={opcao.pecuarista.pendente} /> : null}
                </div>
              </button>
            )
          )}
        </div>
      ) : null}

      {opcoes ? (
        <Button
          className={styles.novoPecuaristaButton}
          variant="brand"
          render={<Link href="/compradores/novo?returnTo=/negocios/novo/comprador" />}
        >
          Cadastrar comprador
        </Button>
      ) : null}

      <Dialog
        open={pecuaristaComprador !== null}
        onOpenChange={(aberto) => !aberto && setPecuaristaComprador(null)}
        title="Dados do comprador"
      >
        {pecuaristaComprador ? (
          <CompradorDePecuaristaForm
            key={pecuaristaComprador.pecuarista_id}
            pecuarista={pecuaristaComprador}
            onCriado={(compradorId, nome) => {
              setPecuaristaComprador(null);
              selecionar(compradorId, nome);
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

/**
 * Pecuarista escolhido como comprador: o negócio só aceita um comprador, então ele é
 * cadastrado como comprador (uma vez; depois aparece na lista pelo comprador). Nome e
 * CPF/CNPJ vêm do pecuarista; telefone, município e contato, que o pecuarista não tem,
 * são pedidos aqui. Sem conexão, o comprador vai para a fila como no cadastro normal.
 */
function CompradorDePecuaristaForm({
  pecuarista,
  onCriado,
}: {
  pecuarista: Pecuarista;
  onCriado: (compradorId: number, nome: string) => void;
}) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompradorFormValues>({
    resolver: zodResolver(compradorSchema),
    defaultValues: {
      nome_empresa: pecuarista.nome_pecuarista.slice(0, 50),
      cnpj: pecuarista.cpf_cnpj.slice(0, 18),
      telefone: "",
      municipio: (pecuarista.pecuarista_fazenda?.[0]?.fazenda.municipio ?? "").slice(0, 30),
      pessoa_contato: pecuarista.nome_pecuarista.slice(0, 30),
    },
  });

  async function onSubmit(values: CompradorFormValues) {
    setSubmitError(null);
    try {
      const envio = await enviarOuEnfileirar("comprador", values, (payload, uuid) =>
        createComprador({ ...(payload as CompradorFormValues), uuid_origem: uuid })
      );
      onCriado(
        envio.sincronizado ? envio.resultado.comprador_id : idTemporario(envio.registro),
        values.nome_empresa
      );
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
      <div className="form-fields">
        <p className="form-hint">
          Para usar {pecuarista.nome_pecuarista} como comprador, complete os dados abaixo. Isso é feito uma vez
          só: depois ele aparece na lista de compradores.
        </p>
        {submitError ? <p className="form-error">{submitError}</p> : null}
        <CompradorFields register={register} errors={errors} />
      </div>
      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Usar como comprador"}
      </Button>
    </form>
  );
}
