import { Alert, CreditCardIcon, LockIcon } from "@/shared/ui";
import { CardFields } from "./CardFields";
import { DocumentField } from "./DocumentField";

/** Passo 2: pagamento **simulado**; dados de cartão só em memória. */
export const PaymentStep = () => (
  <div className="flex flex-col gap-6">
    <Alert tone="info" title="Pagamento simulado">
      Nenhum valor é cobrado. Para testar, use o cartão 4111 1111 1111 1111, qualquer validade
      futura e qualquer CVV.
    </Alert>
    <section className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-fg">
        <CreditCardIcon className="size-5" />
        Cartão de crédito
      </h3>
      <CardFields />
    </section>
    <DocumentField />
    <p className="flex gap-2 text-sm text-fg-muted">
      <LockIcon className="mt-0.5 size-4 shrink-0" />
      Os dados do cartão ficam só neste navegador e são apagados quando você sai da página.
    </p>
  </div>
);
