"use client";

import { useController, useFormContext } from "react-hook-form";
import { Radio } from "@/shared/ui";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import type { CheckoutValues } from "../model/checkout.schema";
import { formatCpf } from "../model/cpf";
import { normalizePassport } from "../model/passport";
import { TextField } from "./TextField";

const MAX_PASSPORT = 9;
const formatPassport = (text: string): string => normalizePassport(text).slice(0, MAX_PASSPORT);

/**
 * Documento do titular do cartão (CPF ou Passaporte), validado e **descartado**: não é salvo nem
 * enviado. Trocar o tipo limpa o valor e o erro (as máscaras são incompatíveis) e mantém o foco.
 */
export const DocumentField = () => {
  const t = useCheckoutMessages().payment;
  const { control, setValue, clearErrors } = useFormContext<CheckoutValues>();
  const { field } = useController({ control, name: "payment.documentType" });
  const isCpf = field.value === "cpf";

  const choose = (type: "cpf" | "passport") => {
    if (type === field.value) return;
    field.onChange(type);
    setValue("payment.document", "");
    clearErrors("payment.document");
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-lg font-semibold text-fg">{t.documentLegend}</legend>
        <div className="flex flex-wrap gap-x-6">
          <Radio
            name={field.name}
            label={t.cpf}
            checked={isCpf}
            onChange={() => choose("cpf")}
            ref={field.ref}
          />
          <Radio
            name={field.name}
            label={t.passport}
            checked={!isCpf}
            onChange={() => choose("passport")}
          />
        </div>
      </fieldset>
      <TextField
        name="payment.document"
        label={isCpf ? t.cpf : t.passportNumber}
        format={isCpf ? formatCpf : formatPassport}
        inputMode={isCpf ? "numeric" : "text"}
        autoComplete="off"
        autoCapitalize={isCpf ? "none" : "characters"}
        placeholder={isCpf ? "000.000.000-00" : "FZ123456"}
        description={t.documentHint}
      />
    </div>
  );
};
