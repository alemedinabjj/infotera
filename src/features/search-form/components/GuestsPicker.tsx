"use client";

import { useId, useState } from "react";
import { type Control, useController, useFormContext, useWatch } from "react-hook-form";
import { useLocale } from "@/shared/i18n/client";
import { AlertCircleIcon, QuantityStepper } from "@/shared/ui";
import { useSearchFormMessages } from "../hooks/useSearchFormMessages";
import { type GuestField, guestHints, guestLimits } from "../model/guests";
import type { SearchFormValues } from "../model/search-form.schema";

const ROW_NAMES = ["adults", "children", "rooms"] as const satisfies readonly GuestField[];

const DEPS: Record<GuestField, GuestField[]> = {
  rooms: ["adults", "children"],
  adults: ["rooms", "children"],
  children: ["rooms", "adults"],
};

const useGuestField = (control: Control<SearchFormValues>, name: GuestField) =>
  useController({ control, name, rules: { deps: DEPS[name] } });

/**
 * Adultos, crianças e quartos sempre à vista. Os limites de cada contador vêm de `guestLimits`,
 * então a UI não monta estado inválido; o erro do schema aparece só como rede de segurança.
 */
export const GuestsPicker = () => {
  const { control } = useFormContext<SearchFormValues>();
  const t = useSearchFormMessages().form;
  const locale = useLocale();
  const fields = {
    adults: useGuestField(control, "adults"),
    children: useGuestField(control, "children"),
    rooms: useGuestField(control, "rooms"),
  };
  const [rooms, adults, children] = useWatch({ control, name: ["rooms", "adults", "children"] });
  const counts = { rooms, adults, children };
  const limits = guestLimits(counts);
  // Dois controles no mesmo teto dariam a mesma frase duas vezes: só o último mexido a mostra.
  const [lastChanged, setLastChanged] = useState<GuestField | null>(null);
  const hints = guestHints(counts, lastChanged, locale);
  const errorId = useId();
  const error = ROW_NAMES.map((name) => fields[name].fieldState.error?.message).find(Boolean);

  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-3 text-base font-semibold text-fg">{t.guestsTitle}</legend>
      <div className="divide-y divide-border">
        {ROW_NAMES.map((name) => (
          <QuantityStepper
            key={name}
            className="py-3 first:pt-0 last:pb-0"
            label={t[name].label}
            description={name === "rooms" ? undefined : t[name].description}
            hint={hints[name]}
            value={counts[name]}
            min={limits[name].min}
            max={limits[name].max}
            onChange={(value) => {
              setLastChanged(name);
              fields[name].field.onChange(value);
            }}
            decreaseLabel={t[name].decrease}
            increaseLabel={t[name].increase}
          />
        ))}
      </div>
      <div
        id={errorId}
        tabIndex={-1}
        ref={(element) => {
          for (const name of ROW_NAMES) fields[name].field.ref(element);
        }}
        className="mt-2"
      >
        {error ? (
          <p className="flex items-start gap-1.5 text-sm text-danger">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </fieldset>
  );
};
