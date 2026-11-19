import { todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { createStorage } from "@/shared/lib/storage";
import {
  type CheckoutValues,
  defaultCheckoutValues,
  isPersonalValid,
} from "../model/checkout.schema";
import {
  CHECKOUT_DRAFT_KEY,
  fromPersistedDraft,
  persistedDraftSchema,
} from "../model/checkout-draft";
import { buildCompanions } from "../model/companions";
import { type CheckoutStep, restoreStep } from "../model/steps";

/** Aviso de restauração: `restored` (passo 1) ou `payment-wiped` (cartão nunca é restaurado). */
export type CheckoutNotice = { kind: "restored" | "payment-wiped"; step: CheckoutStep };

export type InitialCheckout = {
  values: CheckoutValues;
  step: CheckoutStep;
  notice: CheckoutNotice | null;
};

/** Valores iniciais: rascunho válido da sessão (se houver) ou o formulário vazio. */
export const loadInitialCheckout = (criteria: SearchCriteria): InitialCheckout => {
  const stored = createStorage("session").read(
    CHECKOUT_DRAFT_KEY,
    persistedDraftSchema.nullable(),
    null,
  );
  if (!stored) {
    return {
      values: { ...defaultCheckoutValues, companions: buildCompanions(criteria, []) },
      step: "personal",
      notice: null,
    };
  }
  const draft = fromPersistedDraft(stored);
  const values: CheckoutValues = {
    ...defaultCheckoutValues,
    contact: draft.contact,
    companions: buildCompanions(criteria, draft.companions),
  };
  const step = restoreStep(draft.step, isPersonalValid(values, todayISO()));
  const kind = step === "personal" ? "restored" : "payment-wiped";
  return { values, step, notice: { kind, step } };
};
