import Link from "next/link";
import { ChevronRight, Percent, type LucideIcon } from "lucide-react";
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
    <div className="page-container page-narrow pt-safe">
      <h1 className="page-title">Configurações</h1>

      <nav className="card-list" aria-label="Configurações">
        {ITENS.map(({ href, icon: Icon, titulo, descricao }) => (
          <Link key={href} href={href} className="list-card glass-panel">
            <span className="card-icon">
              <Icon size={18} />
            </span>
            <span className={styles.cardInfo}>
              <span className="card-name">{titulo}</span>
              <span className={styles.cardMeta}>{descricao}</span>
            </span>
            <ChevronRight size={18} className={styles.chevron} aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}
