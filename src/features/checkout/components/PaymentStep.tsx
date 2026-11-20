"use client";

import { Alert, CreditCardIcon, LockIcon } from "@/shared/ui";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import { CardFields } from "./CardFields";
import { DocumentField } from "./DocumentField";

/** Passo 2: pagamento **simulado**; dados de cartão só em memória. */
export const PaymentStep = () => {
  const t = useCheckoutMessages().payment;
  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" title={t.simulatedTitle}>
        {t.simulatedBody}
      </Alert>
      <section className="flex flex-col gap-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-fg">
          <CreditCardIcon className="size-5" />
          {t.cardTitle}
        </h3>
        <CardFields />
      </section>
      <DocumentField />
      <p className="flex gap-2 text-sm text-fg-muted">
        <LockIcon className="mt-0.5 size-4 shrink-0" />
        {t.localOnly}
      </p>
    </div>
  );
};
