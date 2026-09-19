"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Handshake, TrendingUp, Users, DollarSign, Warehouse, type LucideIcon } from "lucide-react";
import Logo from "@/assets/logo-castilho.svg";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { fetchNegocios } from "@/lib/api/negocios";
import { fetchFazendas } from "@/lib/api/fazendas";
import { fetchVendedores } from "@/lib/api/vendedores";
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
    <Link href={href} className={cn(styles.shortcut, "glass-panel")}>
      <Icon size={20} className={styles.shortcutIcon} />
      <p className={styles.shortcutLabel}>{label}</p>
      <p className={styles.shortcutCount}>{count}</p>
    </Link>
  );
}

export default function HomePage() {
  const [negociosCount, setNegociosCount] = React.useState<number | null>(null);
  const [comissaoTotal, setComissaoTotal] = React.useState<number | null>(null);
  const [cabecasTotal, setCabecasTotal] = React.useState<number | null>(null);
  const [fazendasCount, setFazendasCount] = React.useState<number | null>(null);
  const [vendedoresCount, setVendedoresCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    Promise.all([fetchNegocios(), fetchFazendas(), fetchVendedores()])
      .then(([negocios, fazendas, vendedores]) => {
        setNegociosCount(negocios.length);
        setComissaoTotal(negocios.reduce((sum, n) => sum + n.comissao, 0));
        setCabecasTotal(negocios.reduce((sum, n) => sum + (n.qtd_animais ?? 0), 0));
        setFazendasCount(fazendas.length);
        setVendedoresCount(vendedores.length);
      })
      .catch(() => {
        // Dashboard é só leitura de conveniência — falha silenciosa, os
        // tiles ficam com "—" e o usuário ainda navega normalmente.
      });
  }, []);

  return (
    <div className={cn(styles.page, "pt-safe")}>

      <Image src={Logo} alt="Logo" className={styles.logo} />


      <div className={styles.grid}>
        <StatTile
          icon={TrendingUp}
          label="Negócios realizados"
          value={negociosCount !== null ? String(negociosCount) : "—"}
          large
        />
        <StatTile
          icon={DollarSign}
          label="Comissão total"
          value={comissaoTotal !== null ? formatCurrency(comissaoTotal) : "—"}
        />
        <StatTile
          icon={Users}
          label="Total de cabeças"
          value={cabecasTotal !== null ? String(cabecasTotal) : "—"}
        />
      </div>

      <div className={styles.shortcuts}>
        <NavShortcut icon={Warehouse} label="Fazendas" count={fazendasCount ?? 0} href="/fazendas" />
        <NavShortcut icon={Users} label="Vendedores" count={vendedoresCount ?? 0} href="/vendedores" />
        <NavShortcut icon={Handshake} label="Negócios" count={negociosCount ?? 0} href="/negocios" />
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
