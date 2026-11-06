"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAviso } from "@/components/aviso";
import { BackLink } from "@/components/back-link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { PecuaristaFields, pecuaristaSchema, type PecuaristaFormValues } from "@/components/pecuarista-fields";
import { Button } from "@/components/ui/button";
import { deletePecuarista, desvincularFazenda, fetchPecuarista, updatePecuarista } from "@/lib/api/pecuaristas";
import type { Fazenda } from "@/lib/api/types";
import { ApiError } from "@/lib/api-client";
import { mensagemDeErro } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

export default function EditarPecuaristaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [fazendas, setFazendas] = React.useState<Fazenda[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const avisar = useAviso();
  const [desvinculando, setDesvinculando] = React.useState<number | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [nome, setNome] = React.useState("");
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PecuaristaFormValues>({ resolver: zodResolver(pecuaristaSchema) });

  React.useEffect(() => {
    let cancelled = false;
    fetchPecuarista(params.id)
      .then((pecuarista) => {
        if (cancelled) return;
        reset({
          nome_pecuarista: pecuarista.nome_pecuarista,
          fisico_juridico: pecuarista.fisico_juridico,
          cpf_cnpj: pecuarista.cpf_cnpj,
          banco: pecuarista.banco,
          agencia: pecuarista.agencia,
          conta: pecuarista.conta,
          chave_pix: pecuarista.chave_pix,
        });
        setFazendas((pecuarista.pecuarista_fazenda ?? []).map((v) => v.fazenda));
        setNome(pecuarista.nome_pecuarista);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError || err instanceof Error ? err.message : "Erro ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, reset]);

  async function onSubmit(values: PecuaristaFormValues) {
    setSubmitError(null);
    try {
      // Só os dados: os vínculos com fazendas têm ações próprias abaixo.
      await updatePecuarista(params.id, values);
      router.push("/pecuaristas");
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
    }
  }

  async function desvincular(fazenda: Fazenda) {
    if (!window.confirm(`Desvincular a fazenda "${fazenda.nome_fazenda}" deste pecuarista?`)) return;
    setDesvinculando(fazenda.fazenda_id);
    try {
      // A API recusa (409) se houver negócio deste pecuarista com esta fazenda.
      const atualizado = await desvincularFazenda(params.id, fazenda.fazenda_id);
      setFazendas((atualizado.pecuarista_fazenda ?? []).map((v) => v.fazenda));
    } catch (err) {
      avisar(mensagemDeErro(err, "Erro ao desvincular."), "aviso");
    } finally {
      setDesvinculando(null);
    }
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <div className="page-header-acoes">
        <BackLink href="/pecuaristas" />
        {loaded ? (
          <BotaoExcluir
            descricao={`o pecuarista "${nome}"`}
            excluir={() => deletePecuarista(params.id)}
            destino="/pecuaristas"
          />
        ) : null}
      </div>
      <h1 className="page-title">Editar Pecuarista</h1>

      {!loaded && !loadError ? <div className="state-box glass-panel">Carregando pecuarista...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {loaded ? (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
            <div className="form-fields">
              <p className="section-title">Dados do pecuarista</p>
              {submitError ? <p className="form-error">{submitError}</p> : null}
              <PecuaristaFields register={register} control={control} errors={errors} />
            </div>

            <section className={styles.fazendas}>
              <p className="section-title">Fazendas vinculadas</p>
              <Button
                variant="brand"
                className={styles.adicionarFazenda}
                render={<Link href={`/pecuaristas/${params.id}/fazendas/nova`} />}
              >
                <Plus size={16} aria-hidden /> Adicionar fazenda
              </Button>
              {fazendas.length === 0 ? (
                <div className="state-box glass-panel">Nenhuma fazenda vinculada.</div>
              ) : (
                <div className="card-list">
                  {fazendas.map((fazenda) => (
                    // O card inteiro abre a edição da fazenda (o link cobre o card); o botão
                    // Desvincular fica por cima do link.
                    <div key={fazenda.fazenda_id} className={cn("list-card", "glass-panel", styles.cardFazenda)}>
                      <span className="card-icon">
                        {fazenda.marca_url ? (
                          <img src={fazenda.marca_url} alt="" className={styles.cardImage} />
                        ) : (
                          <Warehouse size={18} />
                        )}
                      </span>
                      <div className="card-info">
                        <Link href={`/fazendas/${fazenda.fazenda_id}`} className={styles.linkFazenda}>
                          <p className="card-name">{fazenda.nome_fazenda}</p>
                        </Link>
                      </div>
                      {/* Precisa de ao menos uma fazenda: a última não é desvinculada. */}
                      {fazendas.length > 1 ? (
                        <button
                          type="button"
                          className={styles.desvincular}
                          onClick={() => desvincular(fazenda)}
                          disabled={desvinculando !== null}
                          aria-label={`Desvincular ${fazenda.nome_fazenda}`}
                        >
                          {desvinculando === fazenda.fazenda_id ? "Desvinculando..." : "Desvincular"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Dados"}
            </Button>
          </form>

        </>
      ) : null}
    </div>
  );
}
