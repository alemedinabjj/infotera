import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../atoms/Button";
import { AlertCircleIcon } from "../icons";

type ErrorStateProps = {
  title: string;
  description?: ReactNode;
  onRetry?: () => void;
  /** Enquanto `true`, o botão fica em loading. */
  retrying?: boolean;
  retryLabel?: string;
  /** `inline` dentro de uma seção; `page` ocupa a rota inteira. */
  variant?: "inline" | "page";
  /** Ações extras ao lado do retry. */
  action?: ReactNode;
  /** Nível do título; use 1 quando o estado ocupa a página inteira. */
  headingLevel?: 1 | 2 | 3;
  className?: string;
};

/** Estado de erro com `role="alert"` e botão de nova tentativa. */
export const ErrorState = ({
  title,
  description,
  onRetry,
  retrying = false,
  retryLabel = "Tentar de novo",
  variant = "inline",
  action,
  headingLevel = 2,
  className,
}: ErrorStateProps) => {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        variant === "page" ? "py-16" : "py-8",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertCircleIcon className="size-8" />
      </span>
      <Heading className="text-lg font-semibold text-fg">{title}</Heading>
      {description ? <p className="max-w-prose text-fg-muted">{description}</p> : null}
      {onRetry || action ? (
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry} loading={retrying}>
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
};
