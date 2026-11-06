"use client";

import * as React from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { TintedInput } from "@/components/form/tinted-input";

/**
 * Campo de texto com máscara aplicada enquanto digita (CPF, CNPJ, inscrição estadual): o
 * valor guardado no formulário já sai formatado.
 */
export function MaskedTextField<T extends FieldValues>({
  control,
  name,
  mascara,
  ...props
}: {
  control: Control<T>;
  name: Path<T>;
  mascara: (valor: string) => string;
} & Omit<React.ComponentProps<typeof TintedInput>, "name" | "value" | "onChange" | "onBlur" | "ref">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TintedInput
          tint="pink"
          inputMode="numeric"
          {...props}
          name={field.name}
          ref={field.ref}
          value={(field.value as string | undefined) ?? ""}
          onChange={(e) => field.onChange(mascara(e.target.value))}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}
