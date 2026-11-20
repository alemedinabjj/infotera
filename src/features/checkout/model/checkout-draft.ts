import { z } from "zod";
import type { CheckoutValues } from "./checkout.schema";
import { PHONE_COUNTRY_CODES } from "./phone";
import { CHECKOUT_STEPS, type CheckoutStep } from "./steps";

/** Chave no `sessionStorage` (com o prefixo `infotera:` do wrapper de storage). */
export const CHECKOUT_DRAFT_KEY = "checkout-draft";
export const CHECKOUT_DRAFT_VERSION = 1;

export const persistedDraftSchema = z.object({
  v: z.literal(CHECKOUT_DRAFT_VERSION),
  /** Passo mais adiante já alcançado (não o atual): independe de o passo 1 estar válido. */
  step: z.enum(CHECKOUT_STEPS),
  contact: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phoneCountry: z.enum(PHONE_COUNTRY_CODES),
    phone: z.string(),
  }),
  companions: z.array(
    z.object({ kind: z.enum(["adult", "child"]), firstName: z.string(), lastName: z.string() }),
  ),
  /** Código do cupom aplicado (não é PII). Revalidado ao restaurar: nunca confiamos no desconto. */
  coupon: z.string().max(40).optional(),
});

export type PersistedDraft = z.infer<typeof persistedDraftSchema>;

/**
 * Rascunho a gravar. A **whitelist é explícita** (campo por campo): um campo novo de cartão nunca
 * vaza por padrão. Fora: cartão, validade, CVV, documento, idade da criança e termos. O **código** do
 * cupom entra (não é dado pessoal); o desconto em si é sempre recalculado.
 */
export const toPersistedDraft = (
  values: CheckoutValues,
  step: CheckoutStep,
  couponCode: string | null = null,
): PersistedDraft => ({
  v: CHECKOUT_DRAFT_VERSION,
  step,
  contact: {
    firstName: values.contact.firstName,
    lastName: values.contact.lastName,
    email: values.contact.email,
    phoneCountry: values.contact.phoneCountry,
    phone: values.contact.phone,
  },
  companions: values.companions.map(({ kind, firstName, lastName }) => ({
    kind,
    firstName,
    lastName,
  })),
  ...(couponCode ? { coupon: couponCode } : {}),
});

export type RestoredDraft = {
  step: CheckoutStep;
  contact: CheckoutValues["contact"];
  companions: CheckoutValues["companions"];
};

/** Rascunho lido → valores do formulário (idade volta vazia: nunca foi gravada). */
export const fromPersistedDraft = (draft: PersistedDraft): RestoredDraft => ({
  step: draft.step,
  contact: { ...draft.contact },
  companions: draft.companions.map((companion) => ({ ...companion, age: "" })),
});
