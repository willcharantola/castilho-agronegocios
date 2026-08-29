import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import styles from "./back-link.module.css";

export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link href={href} className={styles.link}>
      <ChevronLeft size={16} strokeWidth={2.5} />
      {label}
    </Link>
  );
}
