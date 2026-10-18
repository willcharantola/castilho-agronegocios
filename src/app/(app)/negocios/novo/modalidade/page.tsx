"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Beef, Check, Scale, Warehouse, Weight, type LucideIcon } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { ProgressSteps } from "@/components/progress-steps";
import { cn } from "@/lib/utils";
import type { Modalidade } from "@/lib/api/types";
import { MODALIDADE_LABELS } from "@/lib/labels";
import { useNegocioFlow } from "@/lib/flows/negocio-flow";
import styles from "./page.module.css";

const OPCOES: { modalidade: Modalidade; icon: LucideIcon; descricao: string }[] = [
  { modalidade: "arroba", icon: Scale, descricao: "Pesagem individual, valor por arroba (com rendimento de carcaça)." },
  { modalidade: "kg", icon: Weight, descricao: "Pesagem individual, valor por quilo." },
  { modalidade: "cabeca", icon: Beef, descricao: "Sem pesagem: informe só a quantidade de cabeças e o valor por cabeça." },
];

export default function NovoNegocioModalidadePage() {
  const router = useRouter();
  const { data, update } = useNegocioFlow();

  React.useEffect(() => {
    if (!data.fazendaId) router.replace("/negocios/novo");
    else if (!data.pecuaristaId) router.replace("/negocios/novo/pecuarista");
    else if (!data.compradorId) router.replace("/negocios/novo/comprador");
  }, [data.fazendaId, data.pecuaristaId, data.compradorId, router]);

  if (!data.fazendaId || !data.pecuaristaId || !data.compradorId) return null;

  function selecionar(modalidade: Modalidade) {
    update({ modalidade });
    router.push("/negocios/novo/informacoes");
  }

  return (
    <div className="page-container page-wide pt-safe">
      <BackLink href="/negocios/novo/comprador" />
      <h1 className={cn("page-title", styles.title)}>Cadastrar Novo Negócio</h1>
      <ProgressSteps current={4} total={6} />

      <div className="summary-card glass-dark">
        <span className="card-icon-on-dark">
          <Warehouse size={18} />
        </span>
        <p className={styles.fazendaNome}>{data.fazendaNome}</p>
      </div>

      <p className="section-title">Selecione a modalidade</p>

      <div className="card-list">
        {OPCOES.map(({ modalidade, icon: Icon, descricao }) => {
          const selecionada = data.modalidade === modalidade;
          return (
            <button
              key={modalidade}
              type="button"
              onClick={() => selecionar(modalidade)}
              className={cn("list-card", styles.card, "glass-dark", selecionada && styles.cardSelected)}
              aria-pressed={selecionada}
            >
              <span className="card-icon-on-dark">
                <Icon size={18} />
              </span>
              <div className="card-info">
                <p className={styles.cardName}>{MODALIDADE_LABELS[modalidade]}</p>
               
              </div>
              {selecionada ? <Check size={18} className={styles.cardCheck} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
