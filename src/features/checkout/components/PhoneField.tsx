"use client";

import { useId } from "react";
import { useController, useFormContext } from "react-hook-form";
import { AlertCircleIcon, Input, Select } from "@/shared/ui";
import type { CheckoutValues } from "../model/checkout.schema";
import { applyMask } from "../model/masked-input";
import {
  formatPhone,
  PHONE_COUNTRIES,
  PHONE_COUNTRY_CODES,
  type PhoneCountry,
} from "../model/phone";
import { useDeferBlur } from "./blur-context";

const isCountry = (value: string): value is PhoneCountry =>
  PHONE_COUNTRY_CODES.some((code) => code === value);

/**
 * Campo composto (país + número): `<fieldset>` com legend no estilo do label. Trocar o país
 * reaplica a máscara aos dígitos já digitados, revalida se o campo já foi tocado e mantém o foco
 * no `Select`.
 */
export const PhoneField = () => {
  const { control, setValue } = useFormContext<CheckoutValues>();
  const deferBlur = useDeferBlur();
  const country = useController({ control, name: "contact.phoneCountry" });
  const phone = useController({ control, name: "contact.phone" });
  const id = useId();
  const info = PHONE_COUNTRIES[country.field.value];
  const error = phone.fieldState.error?.message;
  const describedBy = [`${id}-description`, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-fg">Telefone</legend>
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <Select
          aria-label="País do telefone"
          autoComplete="tel-country-code"
          value={country.field.value}
          ref={country.field.ref}
          onChange={(event) => {
            const next = event.target.value;
            if (!isCountry(next)) return;
            country.field.onChange(next);
            setValue("contact.phone", formatPhone(next, phone.field.value), {
              shouldValidate: phone.fieldState.isTouched,
            });
          }}
        >
          {PHONE_COUNTRY_CODES.map((code) => (
            <option key={code} value={code}>
              {PHONE_COUNTRIES[code].label}
            </option>
          ))}
        </Select>
        <Input
          ref={phone.field.ref}
          id={`${id}-number`}
          name={phone.field.name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          aria-label="Número de telefone"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          placeholder={info.example}
          value={phone.field.value}
          onChange={(event) => {
            const input = event.target;
            const masked = applyMask(
              input.value,
              input.selectionStart ?? input.value.length,
              (text) => formatPhone(country.field.value, text),
            );
            input.value = masked.value;
            input.setSelectionRange(masked.caret, masked.caret);
            phone.field.onChange(masked.value);
          }}
          onBlur={() => deferBlur(phone.field.onBlur)}
        />
      </div>
      <p id={`${id}-description`} className="text-sm text-fg-muted">
        {info.hint}
      </p>
      {error ? (
        <p
          id={`${id}-error`}
          className="flex animate-fade-in items-start gap-1.5 text-sm text-danger"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
};
