"use client";

import { Button } from "@/shared/ui";
import type { CheckoutPrice } from "../hooks/checkout-price";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import type { CheckoutStep } from "../model/steps";
import { ActionBar } from "./ActionBar";

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
  const t = useCheckoutMessages();
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
          {t.back}
        </Button>
      )}
      <ActionBar price={price} rooms={rooms}>
        <Button
          type="submit"
          fullWidth
          className="min-w-56"
          loading={submitting || calculating}
          loadingText={submitting ? t.steps.confirming : t.steps.calculating}
        >
          {t.steps.primary[step]}
        </Button>
      </ActionBar>
    </div>
  );
};
