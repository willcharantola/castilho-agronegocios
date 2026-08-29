import Link from "next/link";
import Image from "next/image";
import { TrendingUp, Users, DollarSign, Percent, BarChart3, type LucideIcon } from "lucide-react";
import  Logo from "../../../assets/logo-castilho.svg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export default function HomePage() {
  return (
    <div className={cn(styles.page, "pt-safe")}>

      <Image src={Logo} alt="Logo" className={styles.logo} />


      <div className={styles.grid}>
        <StatTile icon={TrendingUp} label="Negócios no período" value="56" large />
        <StatTile icon={DollarSign} label="Comissão total" value="10.000,00" />
        <StatTile icon={Users} label="Clientes ativos" value="15" />
        
      </div>

      <div className={styles.actions}>
        <Button className={styles.bottons} render={<Link href="/negocios" />} variant="brand-secondary" size="xl">
          Negócios Cadastrados
        </Button>
        <Button
          className={styles.bottons}
          render={<Link href="/negocios/novo" />}
          variant="brand-secondary"
          size="xl"
        >
          Cadastrar Novo Negócio
        </Button>
      </div>
    </div>
  );
}
