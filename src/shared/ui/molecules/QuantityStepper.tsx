import { type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "../atoms/IconButton";
import { InfoIcon, MinusIcon, PlusIcon } from "../icons";

type QuantityStepperProps = {
  label: ReactNode;
  description?: ReactNode;
  /** Motivo do limite atual (texto vem da feature). Região `aria-live` sempre montada. */
  hint?: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Nome acessível do botão "−" (ex.: "Remover adulto"). */
  decreaseLabel: string;
  /** Nome acessível do botão "+" (ex.: "Adicionar adulto"). */
  increaseLabel: string;
  className?: string;
};

/** Contador com botões −/+. No limite usa `aria-disabled` (mantém o foco) e ignora cliques; o valor é anunciado via `<output>`. */
export const QuantityStepper = ({
  label,
  description,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
  decreaseLabel,
  increaseLabel,
  className,
}: QuantityStepperProps) => {
  const labelId = useId();
  const descriptionId = useId();
  const hintId = useId();
  const atMin = value <= min;
  const atMax = value >= max;
  const describedBy = [description ? descriptionId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <fieldset aria-labelledby={labelId} className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id={labelId} className="text-base font-medium text-fg">
            {label}
          </p>
          {description ? (
            <p id={descriptionId} className="text-sm text-fg-muted">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <IconButton
            variant="secondary"
            aria-label={decreaseLabel}
            aria-describedby={describedBy || undefined}
            icon={<MinusIcon className="size-5" />}
            aria-disabled={atMin || undefined}
            onClick={() => {
              if (!atMin) onChange(Math.max(min, value - step));
            }}
          />
          <output aria-live="polite" className="w-8 text-center font-semibold text-fg tabular-nums">
            {value}
          </output>
          <IconButton
            variant="secondary"
            aria-label={increaseLabel}
            aria-describedby={describedBy || undefined}
            icon={<PlusIcon className="size-5" />}
            aria-disabled={atMax || undefined}
            onClick={() => {
              if (!atMax) onChange(Math.min(max, value + step));
            }}
          />
        </div>
      </div>
      <div aria-live="polite">
        {hint ? (
          <p id={hintId} className="mt-1 flex items-start gap-1.5 text-sm text-fg-muted">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <span>{hint}</span>
          </p>
        ) : null}
      </div>
    </fieldset>
  );
};
