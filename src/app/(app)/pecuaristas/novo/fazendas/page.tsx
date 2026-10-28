"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, User, Warehouse, X } from "lucide-react";
import { AdicionarFazenda, type FazendaEscolhida } from "@/components/adicionar-fazenda";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { Button } from "@/components/ui/button";
import { createPecuarista } from "@/lib/api/pecuaristas";
import type { CreatePecuaristaInput } from "@/lib/api/types";
import { FISICO_JURIDICO_LABELS } from "@/lib/labels";
import { usePecuaristaFlow, type FazendaNoCadastro } from "@/lib/flows/pecuarista-flow";
import { enviarOuEnfileirar, referencia } from "@/lib/offline/fila";
import type { ExibicaoPecuarista } from "@/lib/offline/pendentes";
import { mensagemDeErro, novoUuid } from "@/lib/offline/rede";
import { cn } from "@/lib/utils";
import styles from "../page.module.css";

const nomeDa = (f: FazendaNoCadastro) => (f.tipo === "nova" ? f.dados.nome_fazenda : f.fazenda.nome_fazenda);
const municipioDa = (f: FazendaNoCadastro) => (f.tipo === "nova" ? f.dados.municipio : f.fazenda.municipio);

/**
 * Etapa 2 de 2: fazendas do pecuarista (ao menos uma). O cadastro todo — pecuarista,
 * fazendas novas e vínculos — vai num único envio (um único item da fila offline),
 * gravado pela API numa transação.
 */
export default function NovoPecuaristaFazendasPage() {
  const router = useRouter();
  const { data, update, reset } = usePecuaristaFlow();
  const [adicionando, setAdicionando] = React.useState(data.fazendas.length === 0);
  const [salvando, setSalvando] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Guarda o valor da primeira renderização — `reset()` ao concluir zera `data.dados`
  // antes de navegar, e isso não deve disparar o redirecionamento para a etapa 1.
  const dadosRef = React.useRef(data.dados);
  React.useEffect(() => {
    if (!dadosRef.current) router.replace("/pecuaristas/novo");
  }, [router]);

  if (!data.dados) return null;
  const dados = data.dados;

  function adicionar(escolha: FazendaEscolhida) {
    const nova: FazendaNoCadastro =
      escolha.tipo === "nova"
        ? { tipo: "nova", uuid: novoUuid(), dados: escolha.dados }
        : { tipo: "existente", fazenda: escolha.fazenda };
    update({ fazendas: [...data.fazendas, nova] });
    setAdicionando(false);
  }

  function remover(indice: number) {
    const fazendas = data.fazendas.filter((_, i) => i !== indice);
    update({ fazendas });
    if (fazendas.length === 0) setAdicionando(true);
  }

  async function concluir() {
    if (data.fazendas.length === 0) {
      setSubmitError("Cadastre ao menos uma fazenda.");
      return;
    }
    setSubmitError(null);
    setSalvando(true);
    try {
      // Fazenda existente ainda só no aparelho (id negativo) vira referência pelo uuid
      // local, resolvida na sincronização.
      const fazendas = await Promise.all(
        data.fazendas.map(async (f) =>
          f.tipo === "nova" ? { ...f.dados, uuid_origem: f.uuid } : await referencia("fazenda", f.fazenda.fazenda_id)
        )
      );
      const exibicao: ExibicaoPecuarista = {
        fazendas: data.fazendas.map((f) =>
          f.tipo === "nova" ? { ...f.dados } : { ...f.fazenda }
        ),
      };
      await enviarOuEnfileirar(
        "pecuarista",
        { ...dados, fazendas },
        (payload, uuid) => createPecuarista({ ...(payload as CreatePecuaristaInput), uuid_origem: uuid }),
        { exibicao }
      );
      const returnTo = data.returnTo;
      reset();
      router.push(returnTo ?? "/pecuaristas");
    } catch (err) {
      setSubmitError(mensagemDeErro(err));
      setSalvando(false);
    }
  }

  return (
    <div className="page-container page-narrow pt-safe">
      <BackLink href="/pecuaristas/novo" label="Dados do pecuarista" />
      <h1 className="page-title">Cadastrar Pecuarista</h1>
      <ProgressSteps current={2} total={2} />
      <p className={styles.subtitle}>Etapa 2 de 2 — Fazendas vinculadas</p>

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <User size={18} />
        </span>
        <div className={styles.resumo}>
          <p className={styles.fazendaNome}>{dados.nome_pecuarista}</p>
          <p className="card-meta-on-dark">
            {FISICO_JURIDICO_LABELS[dados.fisico_juridico]} · {dados.cpf_cnpj}
          </p>
        </div>
        <Link href="/pecuaristas/novo" className={styles.editarDados} aria-label="Editar dados do pecuarista">
          <Pencil size={16} />
        </Link>
      </div>

      {data.fazendas.length > 0 ? (
        <>
          <p className="section-title">Fazendas ({data.fazendas.length})</p>
          <div className="card-list">
            {data.fazendas.map((f, indice) => (
              <div key={indice} className={cn("list-card", "glass-panel")}>
                <span className="card-icon">
                  <Warehouse size={18} />
                </span>
                <div className="card-info">
                  <p className="card-name">{nomeDa(f)}</p>
                  <p className="card-meta">
                    {municipioDa(f)} · {f.tipo === "nova" ? "Nova" : "Já cadastrada"}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.remover}
                  onClick={() => remover(indice)}
                  aria-label={`Remover ${nomeDa(f)}`}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {adicionando ? (
        <AdicionarFazenda
          ignorar={data.fazendas.flatMap((f) => (f.tipo === "existente" ? [f.fazenda.fazenda_id] : []))}
          onAdd={adicionar}
          onCancel={data.fazendas.length > 0 ? () => setAdicionando(false) : undefined}
        />
      ) : (
        <div className="form-fields">
          {submitError ? <p className="form-error">{submitError}</p> : null}
          <Button type="button" variant="ghost" size="xl" className="w-full" onClick={() => setAdicionando(true)}>
            Adicionar outra fazenda
          </Button>
          <Button type="button" variant="brand" size="xl" className="w-full" onClick={concluir} disabled={salvando}>
            {salvando ? "Salvando..." : "Concluir cadastro"}
          </Button>
        </div>
      )}
    </div>
  );
}
