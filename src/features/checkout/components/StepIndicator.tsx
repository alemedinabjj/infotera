import { cn } from "@/shared/lib/cn";
import { CheckIcon } from "@/shared/ui";
import {
  CHECKOUT_STEPS,
  type CheckoutStep,
  isStepDone,
  STEP_LABELS,
  stepNumber,
} from "../model/steps";

type StepIndicatorProps = {
  current: CheckoutStep;
  /** Durante o envio os passos concluídos ficam `aria-disabled` e ignoram o clique. */
  locked: boolean;
  onGoTo: (step: CheckoutStep) => void;
};

const Circle = ({ step, state }: { step: CheckoutStep; state: "done" | "current" | "future" }) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
      state === "done" && "bg-primary text-fg-on-primary",
      state === "current" && "border-2 border-primary bg-surface text-primary",
      state === "future" && "border border-border-strong bg-surface text-fg-muted",
    )}
  >
    {state === "done" ? <CheckIcon className="size-4" /> : stepNumber(step)}
  </span>
);

type StepState = "done" | "current" | "future";

const stateOf = (step: CheckoutStep, current: CheckoutStep): StepState => {
  if (isStepDone(step, current)) return "done";
  return step === current ? "current" : "future";
};

type StepItemProps = {
  step: CheckoutStep;
  state: StepState;
  first: boolean;
  locked: boolean;
  onGoTo: (step: CheckoutStep) => void;
};

const StepItem = ({ step, state, first, locked, onGoTo }: StepItemProps) => {
  const link = first
    ? ""
    : cn(
        "before:absolute before:top-4 before:right-1/2 before:h-0.5 before:w-full before:-translate-y-1/2",
        state === "future" ? "before:bg-border" : "before:bg-primary",
      );
  const column = "relative flex min-h-11 w-full flex-col items-center gap-1 text-sm";
  return (
    <li className={cn("relative flex justify-center", link)}>
      {state === "done" ? (
        <button
          type="button"
          aria-disabled={locked || undefined}
          onClick={() => {
            if (!locked) onGoTo(step);
          }}
          className={cn(column, "font-medium text-primary hover:underline")}
        >
          <Circle step={step} state={state} />
          <span>
            {STEP_LABELS[step]}
            <span className="sr-only">, concluído</span>
          </span>
        </button>
      ) : (
        <span aria-current={state === "current" ? "step" : undefined} className={column}>
          <Circle step={step} state={state} />
          <span className={state === "current" ? "font-semibold text-fg" : "text-fg-muted"}>
            {STEP_LABELS[step]}
          </span>
        </span>
      )}
    </li>
  );
};

/** `<ol>` de 3 passos: concluídos são botões, o atual leva `aria-current="step"`, futuros não clicam. */
export const StepIndicator = ({ current, locked, onGoTo }: StepIndicatorProps) => (
  <ol aria-label="Etapas da reserva" className="grid grid-cols-3 lg:max-w-2xl">
    {CHECKOUT_STEPS.map((step, index) => (
      <StepItem
        key={step}
        step={step}
        state={stateOf(step, current)}
        first={index === 0}
        locked={locked}
        onGoTo={onGoTo}
      />
    ))}
  </ol>
);
