import { type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { AlertCircleIcon } from "../icons";

/** Props que o controle (`Input`, `Select`...) deve receber para ficar ligado ao `Field`. */
export type FieldControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
};

type FieldProps = {
  label: ReactNode;
  description?: ReactNode;
  error?: string | undefined;
  required?: boolean;
  /** Mostra "(opcional)" ao lado do rótulo (use quando a maioria dos campos é obrigatória). */
  optional?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/**
 * Liga rótulo, controle, ajuda e erro por `id`/`aria-describedby`. A mensagem de erro não é
 * `aria-live` por campo (ruído); o resumo de erros no submit é responsabilidade da feature.
 */
export const Field = ({
  label,
  description,
  error,
  required,
  optional,
  className,
  children,
}: FieldProps) => {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required ? <span className="sr-only"> (obrigatório)</span> : null}
        {optional ? <span className="font-normal text-fg-subtle"> (opcional)</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {description ? (
        <p id={descriptionId} className="text-sm text-fg-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex animate-fade-in items-start gap-1.5 text-sm text-danger">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
};
