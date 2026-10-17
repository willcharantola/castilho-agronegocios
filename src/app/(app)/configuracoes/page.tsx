import Link from "next/link";
import { ChevronRight, Percent, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./page.module.css";

type ItemConfiguracao = { href: string; icon: LucideIcon; titulo: string; descricao: string };

/** Uma linha por opção: novas configurações entram aqui. */
const ITENS: ItemConfiguracao[] = [
  {
    href: "/configuracoes/impostos-e-taxas",
    icon: Percent,
    titulo: "Impostos e taxas",
    descricao: "Alíquotas de Funrural e Senar dos negócios",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className={cn(styles.page, "pt-safe")}>
      <h1 className={styles.title}>Configurações</h1>

      <nav className={styles.list} aria-label="Configurações">
        {ITENS.map(({ href, icon: Icon, titulo, descricao }) => (
          <Link key={href} href={href} className={cn(styles.card, "glass-panel")}>
            <span className={styles.cardIcon}>
              <Icon size={18} />
            </span>
            <span className={styles.cardInfo}>
              <span className={styles.cardName}>{titulo}</span>
              <span className={styles.cardMeta}>{descricao}</span>
            </span>
            <ChevronRight size={18} className={styles.chevron} aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}
