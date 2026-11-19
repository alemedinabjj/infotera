"use client";

import type {
  ChangeEvent,
  HTMLInputAutoCompleteAttribute,
  HTMLInputTypeAttribute,
  ReactNode,
} from "react";
import { type FieldPathByValue, useController, useFormContext } from "react-hook-form";
import { Field, Input } from "@/shared/ui";
import type { CheckoutValues } from "../model/checkout.schema";
import { applyMask } from "../model/masked-input";
import { useDeferBlur } from "./blur-context";

export type TextFieldName = FieldPathByValue<CheckoutValues, string>;

type TextFieldProps = {
  name: TextFieldName;
  label: string;
  description?: ReactNode;
  /** Máscara (texto cru → formatado). O cursor não pula: ver `applyMask`. */
  format?: (text: string) => string;
  type?: HTMLInputTypeAttribute;
  inputMode?: "text" | "numeric" | "email" | "tel";
  autoComplete?: HTMLInputAutoCompleteAttribute;
  placeholder?: string;
  autoCapitalize?: "none" | "words" | "characters";
  /** Avisa do valor já formatado (ex.: revalidar o CVV quando a bandeira muda). */
  onValueChange?: (value: string) => void;
};

/**
 * Campo de texto ligado ao RHF: `Field` (label, descrição, erro por `aria-describedby`), blur
 * adiado e máscara opcional. Sem `maxLength` (quebraria o colar com formatação).
 */
export const TextField = ({
  name,
  label,
  description,
  format,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  autoCapitalize,
  onValueChange,
}: TextFieldProps) => {
  const { control } = useFormContext<CheckoutValues>();
  const deferBlur = useDeferBlur();
  const { field, fieldState } = useController({ control, name });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!format) {
      field.onChange(input.value);
      onValueChange?.(input.value);
      return;
    }
    const masked = applyMask(input.value, input.selectionStart ?? input.value.length, format);
    input.value = masked.value;
    input.setSelectionRange(masked.caret, masked.caret);
    field.onChange(masked.value);
    onValueChange?.(masked.value);
  };

  return (
    <Field label={label} description={description} error={fieldState.error?.message}>
      {(control) => (
        <Input
          {...control}
          ref={field.ref}
          name={field.name}
          type={type}
          value={field.value}
          inputMode={inputMode}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          spellCheck={false}
          onChange={handleChange}
          onBlur={() => deferBlur(field.onBlur)}
        />
      )}
    </Field>
  );
};
