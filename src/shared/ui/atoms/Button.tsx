import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus " +
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-sunken disabled:text-fg-subtle";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-fg-on-primary hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "border border-primary bg-surface text-primary hover:bg-primary-soft active:border-primary-active active:bg-primary-soft",
  ghost: "text-primary hover:bg-primary-soft active:bg-primary-soft",
  danger: "bg-danger text-fg-on-primary hover:brightness-95 active:brightness-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm font-medium",
  md: "h-11 px-4 text-base font-medium",
  lg: "h-12 px-6 text-lg font-semibold",
};

/** Classes do botão, para estilizar `<Link>` com a mesma aparência. */
export const buttonClassName = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: ButtonStyleOptions = {}): string =>
  cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full");

type ButtonProps = ComponentProps<"button"> &
  ButtonStyleOptions & {
    /** Desabilita, marca `aria-busy` e troca o ícone esquerdo por um spinner. */
    loading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

/** Botão com variantes do design system. `type="button"` por padrão. */
export const Button = ({
  variant,
  size,
  fullWidth,
  loading = false,
  leftIcon,
  rightIcon,
  type = "button",
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cn(buttonClassName({ variant, size, fullWidth }), className)}
    {...rest}
  >
    {loading ? <Spinner /> : leftIcon}
    {children}
    {rightIcon}
  </button>
);
