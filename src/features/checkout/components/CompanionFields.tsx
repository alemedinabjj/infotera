"use client";

import { useController, useFormContext } from "react-hook-form";
import { useLocale } from "@/shared/i18n/client";
import { Field, Select } from "@/shared/ui";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import type { CheckoutValues } from "../model/checkout.schema";
import { AGE_OPTIONS, ageLabel, companionLabel, type GuestKind } from "../model/companions";
import { useDeferBlur } from "./blur-context";
import { TextField } from "./TextField";

const AgeSelect = ({ index }: { index: number }) => {
  const locale = useLocale();
  const t = useCheckoutMessages().fields;
  const { control } = useFormContext<CheckoutValues>();
  const deferBlur = useDeferBlur();
  const { field, fieldState } = useController({ control, name: `companions.${index}.age` });
  return (
    <Field label={t.age} error={fieldState.error?.message}>
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
          <option value="">{t.agePlaceholder}</option>
          {AGE_OPTIONS.map((age) => (
            <option key={age} value={String(age)}>
              {ageLabel(age, locale)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
};

type CompanionBlockProps = { index: number; kind: GuestKind };

/** Um bloco por acompanhante: valida sozinho; criança tem idade obrigatória. */
const CompanionBlock = ({ index, kind }: CompanionBlockProps) => {
  const locale = useLocale();
  const t = useCheckoutMessages().fields;
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <legend className="mb-2 text-base font-semibold text-fg">
        {companionLabel(index, kind, locale)}
      </legend>
      <div
        className={
          kind === "child" ? "grid gap-4 sm:grid-cols-[1fr_1fr_9rem]" : "grid gap-4 sm:grid-cols-2"
        }
      >
        <TextField
          name={`companions.${index}.firstName`}
          label={t.firstName}
          autoComplete="off"
          autoCapitalize="words"
        />
        <TextField
          name={`companions.${index}.lastName`}
          label={t.lastName}
          autoComplete="off"
          autoCapitalize="words"
        />
        {kind === "child" ? <AgeSelect index={index} /> : null}
      </div>
    </fieldset>
  );
};

type CompanionFieldsProps = { companions: { id: string; kind: GuestKind }[] };

export const CompanionFields = ({ companions }: CompanionFieldsProps) => {
  const t = useCheckoutMessages().personal;
  if (companions.length === 0) return null;
  return (
    <section className="flex flex-col gap-5 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-fg">{t.othersTitle}</h3>
        <p className="text-sm text-fg-muted">{t.othersHint}</p>
      </div>
      {companions.map((companion, index) => (
        <CompanionBlock key={companion.id} index={index} kind={companion.kind} />
      ))}
    </section>
  );
};
