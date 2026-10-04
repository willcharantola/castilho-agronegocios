"use client";

import * as React from "react";
import { NumericFormat } from "react-number-format";
import { TintedInput } from "@/components/form/tinted-input";

type MaskedNumberInputProps = {
  id: string;
  /** "moeda" → R$ 1.234,56 · "percentual" → 12,5% (limitado a 0–100). */
  formato: "moeda" | "percentual";
  value: number | string | null | undefined;
  /** Recebe o número puro (sem máscara), ou `undefined` quando o campo é apagado. */
  onValueChange: (value: number | undefined) => void;
  onBlur?: () => void;
  name?: string;
  tint?: "green" | "pink" | "none";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Input numérico com máscara em tempo real (pt-BR). A máscara é só visual: o valor
 * repassado ao formulário/API continua sendo um `number`.
 */
export const MaskedNumberInput = React.forwardRef<HTMLInputElement, MaskedNumberInputProps>(
  ({ formato, value, onValueChange, tint = "pink", placeholder, ...props }, ref) => {
    const moeda = formato === "moeda";
    return (
      <NumericFormat
        {...props}
        getInputRef={ref}
        customInput={TintedInput}
        tint={tint}
        inputMode="decimal"
        // "" limpa o campo; NaN/strings vazias vindas do formulário também.
        value={value === null || value === undefined || value === "" || Number.isNaN(value) ? "" : value}
        onValueChange={(values) => onValueChange(values.floatValue)}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale={moeda}
        allowNegative={false}
        prefix={moeda ? "R$ " : undefined}
        suffix={moeda ? undefined : "%"}
        isAllowed={moeda ? undefined : ({ floatValue }) => floatValue === undefined || floatValue <= 100}
        placeholder={placeholder ?? (moeda ? "R$ 0,00" : "0%")}
      />
    );
  }
);
MaskedNumberInput.displayName = "MaskedNumberInput";
