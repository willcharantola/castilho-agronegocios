"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { TintedInput } from "@/components/form/tinted-input";
import { cn } from "@/lib/utils";
import styles from "./password-field.module.css";

type PasswordFieldProps = React.ComponentProps<"input"> & {
  tint?: "green" | "pink" | "none";
};

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className={styles.wrapper}>
        <TintedInput
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(styles.input, className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          className={styles.toggle}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    );
  }
);
PasswordField.displayName = "PasswordField";
