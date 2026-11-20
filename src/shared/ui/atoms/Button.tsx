import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { type ButtonStyleOptions, buttonClassName } from "./button-styles";
import { Spinner } from "./Spinner";

type ButtonProps = ComponentProps<"button"> &
  ButtonStyleOptions & {
    /**
     * Mantém o foco (sem `disabled`), marca `aria-disabled` + `aria-busy`, ignora cliques e troca
     * o ícone esquerdo por um spinner.
     */
    loading?: boolean;
    /** Rótulo visível durante o `loading` (ex.: "Confirmando…"), anunciado via `aria-live`. */
    loadingText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
  };

/** Botão com variantes do design system. `type="button"` por padrão. */
export const Button = ({
  variant,
  size,
  fullWidth,
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  type = "button",
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) => {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonClassName({ variant, size, fullWidth }), className)}
      onClick={handleClick}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      <span aria-live="polite">{loading && loadingText ? loadingText : children}</span>
      {loading ? null : rightIcon}
    </button>
  );
};
