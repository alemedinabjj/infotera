"use client";

import { useController, useFormContext } from "react-hook-form";
import { Field, Select } from "@/shared/ui";
import type { CheckoutValues } from "../model/checkout.schema";
import { AGE_OPTIONS, ageLabel, companionLabel, type GuestKind } from "../model/companions";
import { useDeferBlur } from "./blur-context";
import { TextField } from "./TextField";

const AgeSelect = ({ index }: { index: number }) => {
  const { control } = useFormContext<CheckoutValues>();
  const deferBlur = useDeferBlur();
  const { field, fieldState } = useController({ control, name: `companions.${index}.age` });
  return (
    <Field label="Idade no check-in" error={fieldState.error?.message}>
      {(c) => (
        <Select
          {...c}
          ref={field.ref}
          name={field.name}
          autoComplete="off"
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          onBlur={() => deferBlur(field.onBlur)}
        >
          <option value="">Selecione a idade</option>
          {AGE_OPTIONS.map((age) => (
            <option key={age} value={String(age)}>
              {ageLabel(age)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
};

type CompanionBlockProps = { index: number; kind: GuestKind };

/** Um bloco por acompanhante: valida sozinho; criança tem idade obrigatória. */
const CompanionBlock = ({ index, kind }: CompanionBlockProps) => (
  <fieldset className="flex min-w-0 flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
    <legend className="mb-2 text-base font-semibold text-fg">{companionLabel(index, kind)}</legend>
    <div
      className={
        kind === "child" ? "grid gap-4 sm:grid-cols-[1fr_1fr_9rem]" : "grid gap-4 sm:grid-cols-2"
      }
    >
      <TextField
        name={`companions.${index}.firstName`}
        label="Nome"
        autoComplete="off"
        autoCapitalize="words"
      />
      <TextField
        name={`companions.${index}.lastName`}
        label="Sobrenome"
        autoComplete="off"
        autoCapitalize="words"
      />
      {kind === "child" ? <AgeSelect index={index} /> : null}
    </div>
  </fieldset>
);

type CompanionFieldsProps = { companions: { id: string; kind: GuestKind }[] };

export const CompanionFields = ({ companions }: CompanionFieldsProps) => {
  if (companions.length === 0) return null;
  return (
    <section className="flex flex-col gap-5 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-fg">Outros hóspedes</h3>
        <p className="text-sm text-fg-muted">
          Só precisamos do nome. O hotel pode pedir documento no check-in.
        </p>
      </div>
      {companions.map((companion, index) => (
        <CompanionBlock key={companion.id} index={index} kind={companion.kind} />
      ))}
    </section>
  );
};
