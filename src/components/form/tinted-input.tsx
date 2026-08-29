import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import styles from "./field-box.module.css";

type TintedInputProps = React.ComponentProps<"input"> & {
  tint?: "green" | "pink" | "none";
};

const TINT_CLASS = {
  green: styles.green,
  pink: styles.pink,
  none: styles.plain,
};

export const TintedInput = React.forwardRef<HTMLInputElement, TintedInputProps>(
  ({ className, tint = "green", ...props }, ref) => {
    return (
      <Input ref={ref} className={cn(styles.box, TINT_CLASS[tint], className)} {...props} />
    );
  }
);
TintedInput.displayName = "TintedInput";
