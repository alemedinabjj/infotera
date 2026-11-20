"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import type { CheckoutMessages } from "../i18n/pt-BR";
import {
  brandLabel,
  cardDigits,
  cvvLength,
  detectCardBrand,
  formatCardNumber,
} from "../model/card";
import type { CheckoutValues } from "../model/checkout.schema";
import { formatExpiry } from "../model/expiry";
import { TextField } from "./TextField";

const MIN_DIGITS_FOR_UNKNOWN_BRAND = 6;

const brandDescription = (digits: string, t: CheckoutMessages["payment"]): string => {
  const brand = detectCardBrand(digits);
  if (brand) return t.brand(brandLabel(brand));
  return digits.length >= MIN_DIGITS_FOR_UNKNOWN_BRAND ? t.brandUnknown : t.brandHint;
};

const digitsOnly = (text: string): string => text.replace(/\D/g, "").slice(0, 4);

/** Número (máscara + bandeira), nome impresso, validade e CVV. Nada disso sai do navegador. */
export const CardFields = () => {
  const t = useCheckoutMessages().payment;
  const { control, getFieldState, trigger } = useFormContext<CheckoutValues>();
  const number = useWatch({ control, name: "payment.cardNumber" });
  const brand = detectCardBrand(number);
  const cvvHint = cvvLength(brand) === 4 ? t.cvvFront : t.cvvBack;

  return (
    <div className="flex flex-col gap-4">
      <TextField
        name="payment.cardNumber"
        label={t.number}
        format={formatCardNumber}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        description={<span aria-live="polite">{brandDescription(cardDigits(number), t)}</span>}
        onValueChange={() => {
          // A bandeira define o tamanho do CVV: revalida se ele já foi tocado.
          if (getFieldState("payment.cvv").isTouched) void trigger("payment.cvv");
        }}
      />
      <TextField
        name="payment.cardName"
        label={t.name}
        autoComplete="cc-name"
        autoCapitalize="characters"
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="payment.expiry"
          label={t.expiry}
          format={formatExpiry}
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder={t.expiryPlaceholder}
        />
        <TextField
          name="payment.cvv"
          label={t.cvv}
          format={digitsOnly}
          inputMode="numeric"
          autoComplete="cc-csc"
          description={cvvHint}
        />
      </div>
    </div>
  );
};
