"use client";

import { useId } from "react";
import { type Control, useController, useFormContext, useWatch } from "react-hook-form";
import { AlertCircleIcon, QuantityStepper } from "@/shared/ui";
import { type GuestField, guestHint, guestLimits } from "../model/guests";
import type { SearchFormValues } from "../model/search-form.schema";

const ROWS = [
  {
    name: "adults",
    label: "Adultos",
    description: "A partir de 18 anos",
    decrease: "Diminuir adultos",
    increase: "Aumentar adultos",
  },
  {
    name: "children",
    label: "Crianças",
    description: "Até 17 anos",
    decrease: "Diminuir crianças",
    increase: "Aumentar crianças",
  },
  {
    name: "rooms",
    label: "Quartos",
    description: undefined,
    decrease: "Diminuir quartos",
    increase: "Aumentar quartos",
  },
] as const satisfies readonly {
  name: GuestField;
  label: string;
  description: string | undefined;
  decrease: string;
  increase: string;
}[];

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
  const fields = {
    adults: useGuestField(control, "adults"),
    children: useGuestField(control, "children"),
    rooms: useGuestField(control, "rooms"),
  };
  const [rooms, adults, children] = useWatch({ control, name: ["rooms", "adults", "children"] });
  const counts = { rooms, adults, children };
  const limits = guestLimits(counts);
  const errorId = useId();
  const error = ROWS.map((row) => fields[row.name].fieldState.error?.message).find(Boolean);

  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-3 text-base font-semibold text-fg">Quartos e hóspedes</legend>
      <div className="divide-y divide-border">
        {ROWS.map((row) => (
          <QuantityStepper
            key={row.name}
            className="py-3 first:pt-0 last:pb-0"
            label={row.label}
            description={row.description}
            hint={guestHint(row.name, counts)}
            value={counts[row.name]}
            min={limits[row.name].min}
            max={limits[row.name].max}
            onChange={fields[row.name].field.onChange}
            decreaseLabel={row.decrease}
            increaseLabel={row.increase}
          />
        ))}
      </div>
      <div
        id={errorId}
        tabIndex={-1}
        ref={(element) => {
          for (const row of ROWS) fields[row.name].field.ref(element);
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
