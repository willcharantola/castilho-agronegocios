import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "@/lib/utils";
import styles from "./button.module.css";

type ButtonVariant = "default" | "brand" | "brand-secondary" | "ghost";
type ButtonSize = "default" | "xl";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: styles.default,
  brand: styles.brand,
  "brand-secondary": styles.brandSecondary,
  ghost: styles.ghost,
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  default: styles.sizeDefault,
  xl: styles.sizeXl,
};

function Button({
  className,
  variant = "default",
  size = "default",
  nativeButton,
  render,
  ...props
}: ButtonPrimitive.Props & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      // A `render` target (e.g. next/link's <Link>) is rarely a native
      // <button>, so default nativeButton to false whenever it's used —
      // callers can still override explicitly.
      nativeButton={nativeButton ?? !render}
      render={render}
      className={cn(styles.button, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...props}
    />
  );
}

export { Button };
