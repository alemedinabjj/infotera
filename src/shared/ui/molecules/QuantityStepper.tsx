import { type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "../atoms/IconButton";
import { MinusIcon, PlusIcon } from "../icons";

type QuantityStepperProps = {
  label: ReactNode;
  description?: ReactNode;
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

/** Contador com botões −/+. Desabilita no limite; o valor é anunciado via `<output>`. */
export const QuantityStepper = ({
  label,
  description,
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
  return (
    <fieldset
      aria-labelledby={labelId}
      className={cn("flex min-w-0 items-center justify-between gap-4", className)}
    >
      <div>
        <p id={labelId} className="text-base font-medium text-fg">
          {label}
        </p>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <IconButton
          variant="secondary"
          aria-label={decreaseLabel}
          icon={<MinusIcon className="size-5" />}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        />
        <output aria-live="polite" className="w-8 text-center font-semibold text-fg tabular-nums">
          {value}
        </output>
        <IconButton
          variant="secondary"
          aria-label={increaseLabel}
          icon={<PlusIcon className="size-5" />}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        />
      </div>
    </fieldset>
  );
};
