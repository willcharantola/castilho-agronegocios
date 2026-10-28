"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Plus, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BackLink } from "@/components/back-link";
import { PecuaristaFields, pecuaristaSchema, type PecuaristaFormValues } from "@/components/pecuarista-fields";
import { Button } from "@/components/ui/button";
import { desvincularFazenda, fetchPecuarista, updatePecuarista } from "@/lib/api/pecuaristas";
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
  const [vinculoError, setVinculoError] = React.useState<string | null>(null);
  const [desvinculando, setDesvinculando] = React.useState<number | null>(null);
  const [loaded, setLoaded] = React.useState(false);
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
    setVinculoError(null);
    setDesvinculando(fazenda.fazenda_id);
    try {
      // A API recusa (409) se houver negócio deste pecuarista com esta fazenda.
      const atualizado = await desvincularFazenda(params.id, fazenda.fazenda_id);
      setFazendas((atualizado.pecuarista_fazenda ?? []).map((v) => v.fazenda));
    } catch (err) {
      setVinculoError(mensagemDeErro(err, "Erro ao desvincular."));
    } finally {
      setDesvinculando(null);
    }
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/pecuaristas" />
      <h1 className="page-title">Editar Pecuarista</h1>

      {!loaded && !loadError ? <div className="state-box glass-panel">Carregando pecuarista...</div> : null}
      {loadError ? <div className="state-box state-error glass-panel">{loadError}</div> : null}

      {loaded ? (
        <>
          <section className={styles.fazendas}>
            <p className="section-title">Fazendas vinculadas</p>
            {vinculoError ? <p className="form-error">{vinculoError}</p> : null}
            {fazendas.length === 0 ? (
              <div className="state-box glass-panel">Nenhuma fazenda vinculada.</div>
            ) : (
              <div className="card-list">
                {fazendas.map((fazenda) => (
                  <div key={fazenda.fazenda_id} className={cn("list-card", "glass-panel")}>
                    <span className="card-icon">
                      {fazenda.marca_url ? (
                        <img src={fazenda.marca_url} alt={fazenda.nome_fazenda} className={styles.cardImage} />
                      ) : (
                        <Warehouse size={18} />
                      )}
                    </span>
                    <div className="card-info">
                      <p className="card-name">{fazenda.nome_fazenda}</p>
                      <p className="card-meta">
                        {fazenda.municipio} · I.E.: {fazenda.inscricao_estadual}
                      </p>
                      {/* Precisa de ao menos uma fazenda: a última não é desvinculada. */}
                      {fazendas.length > 1 ? (
                        <button
                          type="button"
                          className={styles.desvincular}
                          onClick={() => desvincular(fazenda)}
                          disabled={desvinculando !== null}
                        >
                          {desvinculando === fazenda.fazenda_id ? "Desvinculando..." : "Desvincular"}
                        </button>
                      ) : null}
                    </div>
                    <Link
                      href={`/fazendas/${fazenda.fazenda_id}`}
                      className={styles.editarFazenda}
                      aria-label={`Editar ${fazenda.nome_fazenda}`}
                    >
                      <Pencil size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="brand"
              className={styles.adicionarFazenda}
              render={<Link href={`/pecuaristas/${params.id}/fazendas/nova`} />}
            >
              <Plus size={16} aria-hidden /> Adicionar fazenda
            </Button>
          </section>

          <form onSubmit={handleSubmit(onSubmit)} className="form-stack">
            <div className="form-fields">
              <p className="section-title">Dados do pecuarista</p>
              {submitError ? <p className="form-error">{submitError}</p> : null}
              <PecuaristaFields register={register} control={control} errors={errors} />
            </div>

            <Button type="submit" variant="brand" size="xl" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar Dados"}
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
