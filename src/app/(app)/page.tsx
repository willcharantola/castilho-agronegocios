"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Building2, Handshake, TrendingUp, Users, DollarSign, Warehouse, type LucideIcon } from "lucide-react";
import Logo from "@/assets/logo-castilho.svg";
import { Button } from "@/components/ui/button";
import { TintedInput } from "@/components/form/tinted-input";
import { formatCurrency, startOfMonth, toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchResumoNegocios } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { fetchPecuaristas } from "@/lib/api/pecuaristas";
import { fetchCompradores } from "@/lib/api/compradores";
import { BotaoOlhoComissao, exibirComissao, useExibicaoComissao } from "@/lib/permissoes";
import type { ResumoNegocios } from "@/lib/api/types";
import styles from "./page.module.css";

function StatTile({
  icon: Icon,
  label,
  value,
  large,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className={cn(styles.tile, "glass-panel", large && styles.tileLarge)}>
      <Icon className={styles.tileIcon} size={20} />
      <div>
        <p className={styles.tileValue}>{value}</p>
        <p className={styles.tileLabel}>{label}</p>
      </div>
    </div>
  );
}

function NavShortcut({ icon: Icon, label, count, href }: { icon: LucideIcon; label: string; count: number; href: string }) {
  return (
    <Link href={href} className={cn(styles.shortcut, )}>
      <Icon size={20} className={styles.shortcutIcon} />
      <p className={styles.shortcutLabel}>{label}</p>
     
    </Link>
  );
}

export default function HomePage() {
  const hoje = React.useMemo(() => new Date(), []);
  const [dataInicio, setDataInicio] = React.useState(() => toDateInputValue(startOfMonth(hoje)));
  const [dataFim, setDataFim] = React.useState(() => toDateInputValue(hoje));

  // Para usuário Normal a API devolve as três métricas null (tiles com "-").
  const [resumo, setResumo] = React.useState<ResumoNegocios | null>(null);
  // Olho de privacidade (só Admin): os três números começam cobertos ("••••").
  const privacidade = useExibicaoComissao();
  const [fazendasCount, setFazendasCount] = React.useState<number | null>(null);
  const [pecuaristasCount, setPecuaristasCount] = React.useState<number | null>(null);
  const [compradoresCount, setCompradoresCount] = React.useState<number | null>(null);

  // Bento (tiles do topo) segue o período do filtro; atalhos de navegação
  // (fazendas/pecuaristas/negócios totais) não são vinculados a data.
  React.useEffect(() => {
    fetchResumoNegocios({ data_inicio: dataInicio, data_fim: dataFim })
      .then(setResumo)
      .catch(() => {
        // Dashboard é só leitura de conveniência — falha silenciosa, os
        // tiles ficam com "—" e o usuário ainda navega normalmente.
      });
  }, [dataInicio, dataFim]);

  React.useEffect(() => {
    Promise.all([fetchFazendas(), fetchPecuaristas(), fetchCompradores()])
      .then(([fazendas, pecuaristas, compradores]) => {
        setFazendasCount(fazendas.length);
        setPecuaristasCount(pecuaristas.length);
        setCompradoresCount(compradores.length);
      })
      .catch(() => {
        // Idem — falha silenciosa.
      });
  }, []);

  function resetarPeriodo() {
    setDataInicio(toDateInputValue(startOfMonth(hoje)));
    setDataFim(toDateInputValue(hoje));
  }

  return (
    <div className={cn(styles.page, "pt-safe")}>

      <Image src={Logo} alt="Logo" className={styles.logo} />

 {/* 
      <div className={styles.filterRow}>
        <div className={styles.filterField}>
          <label htmlFor="dataInicio" className={styles.filterLabel}>
            De
          </label>
          <TintedInput
            id="dataInicio"
            tint="none"
            type="date"
            value={dataInicio}
            max={dataFim}
            onChange={(e) => setDataInicio(e.target.value)}
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterField}>
          <label htmlFor="dataFim" className={styles.filterLabel}>
            Até
          </label>
          <TintedInput
            id="dataFim"
            tint="none"
            type="date"
            value={dataFim}
            min={dataInicio}
            max={toDateInputValue(hoje)}
            onChange={(e) => setDataFim(e.target.value)}
            className={styles.filterInput}
          />
        </div>

         
        <button type="button" className={styles.filterReset} onClick={resetarPeriodo}>
          Este mês
        </button>  
              </div>  */}

      {privacidade.admin ? (
        <div className={styles.gridAcoes}>
          <BotaoOlhoComissao
            visivel={privacidade.visivel}
            onAlternar={privacidade.alternar}
            assunto="valores do resumo"
          />
        </div>
      ) : null}

      <div className={styles.grid}>
        <StatTile
          icon={TrendingUp}
          label="Negócios realizados"
          value={resumo ? exibirComissao(resumo.negocios_realizados, privacidade.exibicao, String) : "—"}

        />
        <StatTile
          icon={DollarSign}
          label="Comissão total"
          value={resumo ? exibirComissao(resumo.comissao_total, privacidade.exibicao, formatCurrency) : "—"}
        />
        <StatTile
          icon={Users}
          label="Total de cabeças"
          value={resumo ? exibirComissao(resumo.total_cabecas, privacidade.exibicao, String) : "—"}
        />
      </div>

      <div className={styles.shortcuts}>
        <NavShortcut icon={Warehouse} label="Fazendas" count={fazendasCount ?? 0} href="/fazendas" />
        <NavShortcut icon={Users} label="Pecuaristas" count={pecuaristasCount ?? 0} href="/pecuaristas" />
        <NavShortcut icon={Building2} label="Frigoríficos" count={compradoresCount ?? 0} href="/compradores" />
        <NavShortcut icon={Handshake} label="Negócios" count={resumo?.negocios_realizados ?? 0} href="/negocios" />
      </div>

      <div className={styles.actions}>
      
        <Button
          className={styles.bottons}
          render={<Link href="/negocios/novo" />}

        >
          Cadastrar Novo Negócio
        </Button>
      </div>
    </div>
  );
}
