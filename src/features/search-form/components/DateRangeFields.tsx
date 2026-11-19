"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useToday } from "@/shared/hooks/useToday";
import { formatDate } from "@/shared/lib/dates";
import { CalendarIcon, Field, InfoIcon, Input } from "@/shared/ui";
import { type DateNotice, formatCheckOutAdjusted } from "../model/notices";
import type { SearchFormValues } from "../model/search-form.schema";
import { adjustCheckOut, dateBounds, stayNights } from "../model/stay-dates";

type DateRangeFieldsProps = {
  /** Aviso visível (ajuste automático / datas passadas) mostrado como `description` do campo. */
  notice: DateNotice | null;
  /** Avisa o formulário (que também anuncia) ou limpa (`null`). */
  onNotice: (notice: DateNotice | null) => void;
  /** Envolve a validação do blur: ela espera o clique de um botão em andamento terminar. */
  deferBlur: (run: () => void) => void;
};

const NoticeText = ({ text }: { text: string }) => (
  <span className="flex items-start gap-1.5">
    <InfoIcon className="mt-0.5 size-4 shrink-0" />
    <span>{text}</span>
  </span>
);

const DATE_INPUT_CLASS = "[&::-webkit-date-and-time-value]:text-left";

const summarize = (checkIn: string, checkOut: string): string => {
  const nights = stayNights(checkIn, checkOut);
  if (nights !== null) {
    const label = nights === 1 ? "1 noite" : `${nights} noites`;
    return `${label} · ${formatDate(checkIn, "long")} a ${formatDate(checkOut, "long")}`;
  }
  return checkIn === "" || checkOut === "" ? "Escolha as datas para ver o total de noites." : "";
};

/** Check-in e check-out nativos (`type="date"`) com `min`/`max` coerentes e resumo de noites. */
export const DateRangeFields = ({ notice, onNotice, deferBlur }: DateRangeFieldsProps) => {
  const { control, getValues, setValue, getFieldState, trigger } =
    useFormContext<SearchFormValues>();
  const today = useToday();
  const [checkIn, checkOut] = useWatch({ control, name: ["checkIn", "checkOut"] });
  const bounds = dateBounds(today, checkIn);

  const changeCheckIn = (value: string, apply: (value: string) => void) => {
    apply(value);
    const adjusted = adjustCheckOut(value, getValues("checkOut"));
    // Check-out ainda intocado e sem erro não é revalidado: o erro dele não aparece "do nada".
    const checkOutState = getFieldState("checkOut");
    const revalidate = checkOutState.isTouched || checkOutState.error !== undefined;
    if (adjusted.checkOut !== getValues("checkOut")) {
      setValue("checkOut", adjusted.checkOut, { shouldDirty: true, shouldValidate: revalidate });
    } else if (revalidate) {
      void trigger("checkOut");
    }
    onNotice(
      adjusted.adjusted
        ? { field: "checkOut", text: formatCheckOutAdjusted(adjusted.checkOut) }
        : null,
    );
  };

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-base font-semibold text-fg">Datas da estadia</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="checkIn"
          render={({ field, fieldState }) => (
            <Field
              label="Check-in"
              required
              error={fieldState.error?.message}
              description={
                notice?.field === "checkIn" ? <NoticeText text={notice.text} /> : undefined
              }
            >
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  min={bounds.checkInMin}
                  onBlur={() => deferBlur(field.onBlur)}
                  onChange={(event) => changeCheckIn(event.target.value, field.onChange)}
                  startIcon={<CalendarIcon className="size-5" />}
                  className={DATE_INPUT_CLASS}
                />
              )}
            </Field>
          )}
        />
        <Controller
          control={control}
          name="checkOut"
          render={({ field, fieldState }) => (
            <Field
              label="Check-out"
              required
              error={fieldState.error?.message}
              description={
                notice?.field === "checkOut" ? <NoticeText text={notice.text} /> : undefined
              }
            >
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  min={bounds.checkOutMin}
                  max={bounds.checkOutMax}
                  onBlur={() => deferBlur(field.onBlur)}
                  onChange={(event) => {
                    // Só apaga o aviso deste campo; o do check-in segue visível.
                    if (notice?.field === "checkOut") onNotice(null);
                    field.onChange(event.target.value);
                  }}
                  startIcon={<CalendarIcon className="size-5" />}
                  className={DATE_INPUT_CLASS}
                />
              )}
            </Field>
          )}
        />
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-fg-muted tabular-nums">
        {summarize(checkIn, checkOut)}
      </p>
    </fieldset>
  );
};
