"use client";

import { useFormContext, useWatch } from "react-hook-form";
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

const brandDescription = (digits: string): string => {
  const brand = detectCardBrand(digits);
  if (brand) return `Bandeira: ${brandLabel(brand)}`;
  return digits.length >= MIN_DIGITS_FOR_UNKNOWN_BRAND
    ? "Bandeira não identificada. Confira o número."
    : "Bandeira identificada pelo número.";
};

const digitsOnly = (text: string): string => text.replace(/\D/g, "").slice(0, 4);

/** Número (máscara + bandeira), nome impresso, validade e CVV. Nada disso sai do navegador. */
export const CardFields = () => {
  const { control, getFieldState, trigger } = useFormContext<CheckoutValues>();
  const number = useWatch({ control, name: "payment.cardNumber" });
  const brand = detectCardBrand(number);
  const cvvHint = cvvLength(brand) === 4 ? "4 números na frente" : "3 números no verso";

  return (
    <div className="flex flex-col gap-4">
      <TextField
        name="payment.cardNumber"
        label="Número do cartão"
        format={formatCardNumber}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        description={<span aria-live="polite">{brandDescription(cardDigits(number))}</span>}
        onValueChange={() => {
          // A bandeira define o tamanho do CVV: revalida se ele já foi tocado.
          if (getFieldState("payment.cvv").isTouched) void trigger("payment.cvv");
        }}
      />
      <TextField
        name="payment.cardName"
        label="Nome impresso no cartão"
        autoComplete="cc-name"
        autoCapitalize="characters"
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="payment.expiry"
          label="Validade"
          format={formatExpiry}
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/AA"
        />
        <TextField
          name="payment.cvv"
          label="CVV"
          format={digitsOnly}
          inputMode="numeric"
          autoComplete="cc-csc"
          description={cvvHint}
        />
      </div>
    </div>
  );
};
