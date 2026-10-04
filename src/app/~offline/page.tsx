import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Sem conexão — Castilho Agronegócios" };

/** Servida pelo service worker quando uma página ainda não salva no aparelho é aberta sem internet. */
export default function OfflinePage() {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "100dvh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "1.5rem",
        textAlign: "center",
        color: "var(--color-dark)",
      }}
    >
      <WifiOff size={40} aria-hidden />
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Sem conexão</h1>
      <p style={{ maxWidth: "22rem" }}>
        Esta tela ainda não foi salva no aparelho. Os cadastros de fazenda, vendedor, comprador,
        negócio e gado continuam funcionando offline.
      </p>
      <Link href="/" style={{ fontWeight: 700, textDecoration: "underline" }}>
        Voltar ao início
      </Link>
    </main>
  );
}
