"use client";

import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import { PhoneField } from "./PhoneField";
import { TextField } from "./TextField";

/** Hóspede 1: o titular da reserva (a confirmação vai para o e-mail dele). */
export const ContactFields = () => {
  const t = useCheckoutMessages();
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 md:gap-5">
      <legend className="mb-2 text-lg font-semibold text-fg">{t.personal.holderLegend}</legend>
      <p className="-mt-1 text-sm text-fg-muted">{t.personal.holderHint}</p>
      <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
        <TextField
          name="contact.firstName"
          label={t.fields.firstName}
          autoComplete="given-name"
          autoCapitalize="words"
        />
        <TextField
          name="contact.lastName"
          label={t.fields.lastName}
          autoComplete="family-name"
          autoCapitalize="words"
        />
      </div>
      <TextField
        name="contact.email"
        label={t.fields.email}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
      />
      <PhoneField />
    </fieldset>
  );
};
