import { MapPin } from "lucide-react";
import { resolverLinkMapa } from "@/lib/mapa";
import { cn } from "@/lib/utils";
import styles from "./botao-mapa.module.css";

/**
 * "Ver no mapa": abre o Google Maps em nova aba (no celular, o app do Maps quando
 * instalado). Só aparece com localização ou endereço; o link é sempre montado por
 * `resolverLinkMapa`, nunca a partir de texto livre.
 */
export function BotaoMapa({
  localizacao,
  endereco,
  className,
  claro = false,
}: {
  localizacao: string | null | undefined;
  endereco: string | null | undefined;
  className?: string;
  /** Sobre cartões escuros (glass-dark). */
  claro?: boolean;
}) {
  const href = resolverLinkMapa(localizacao, endereco);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(styles.botao, claro && styles.claro, className)}
    >
      <MapPin size={16} aria-hidden /> Ver no mapa
    </a>
  );
}
