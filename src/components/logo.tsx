import { cn } from "@/lib/utils";
import styles from "./logo.module.css";

/**
 * Placeholder crest logo (shield with "CA" monogram) standing in for the
 * Castilho Agronegócios artwork shown in the mockups until the real asset is
 * provided.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 132"
      className={cn(styles.logo, className)}
      role="img"
      aria-label="Castilho Agronegócios"
    >
      <path
        d="M60 4 L112 22 V64 C112 96 90 118 60 128 C30 118 8 96 8 64 V22 Z"
        fill="var(--color-cream-soft)"
        stroke="var(--color-dark)"
        strokeWidth="4"
      />
      <path
        d="M60 14 L102 29 V64 C102 90 84 108 60 117 C36 108 18 90 18 64 V29 Z"
        fill="none"
        stroke="var(--color-olive)"
        strokeWidth="2"
      />
      <text
        x="60"
        y="76"
        textAnchor="middle"
        fontFamily="var(--font-heading)"
        fontWeight="700"
        fontSize="44"
        fill="var(--color-dark)"
      >
        CA
      </text>
      <path
        d="M28 96 C42 86 78 86 92 96"
        fill="none"
        stroke="var(--color-olive)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
