import { Button } from "@/shared/ui";
import type { CheckoutPrice } from "../hooks/checkout-price";
import type { CheckoutStep } from "../model/steps";
import { ActionBar } from "./ActionBar";

const PRIMARY_LABELS: Record<CheckoutStep, string> = {
  personal: "Continuar para pagamento",
  payment: "Revisar reserva",
  review: "Confirmar reserva",
};

type StepActionsProps = {
  step: CheckoutStep;
  price: CheckoutPrice;
  rooms: number;
  submitting: boolean;
  onBack: () => void;
};

/**
 * "Voltar" no fim do card (todas as larguras) e o primário do passo no `ActionBar`. O primário é
 * sempre o `submit` do formulário e **nunca `disabled`**: carregando/enviando usa `loading`.
 */
export const StepActions = ({ step, price, rooms, submitting, onBack }: StepActionsProps) => {
  const calculating = step === "review" && price.status === "loading";
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
      {step === "personal" ? null : (
        <Button
          variant="secondary"
          fullWidth
          className="sm:w-auto"
          aria-disabled={submitting || undefined}
          onClick={() => {
            if (!submitting) onBack();
          }}
        >
          Voltar
        </Button>
      )}
      <ActionBar price={price} rooms={rooms}>
        <Button
          type="submit"
          fullWidth
          loading={submitting || calculating}
          loadingText={submitting ? "Confirmando reserva…" : "Calculando total…"}
        >
          {PRIMARY_LABELS[step]}
        </Button>
      </ActionBar>
    </div>
  );
};
