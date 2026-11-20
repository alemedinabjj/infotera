"use client";

import { useId, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useResetOnHide } from "@/shared/hooks/useResetOnHide";
import { AlertCircleIcon, Button, Checkbox } from "@/shared/ui";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import type { CheckoutValues } from "../model/checkout.schema";
import type { TermsSection } from "../model/terms";
import { TermsDialog } from "./TermsDialog";

/**
 * Aceite dos termos: checkbox com o rótulo completo, "Ler termos" **fora** do `<label>` e erro
 * ligado ao checkbox por `aria-describedby`. Só valida no envio (sem `onBlur`: passar com Tab não gera erro). O dialog devolve o foco ao gatilho ao fechar.
 */
export const TermsField = ({ sections }: { sections: TermsSection[] }) => {
  const { control, clearErrors } = useFormContext<CheckoutValues>();
  const { field, fieldState } = useController({ control, name: "termsAccepted" });
  const [open, setOpen] = useState(false);
  useResetOnHide(() => setOpen(false)); // Activity: o modal de termos não volta aberto
  const errorId = useId();
  const t = useCheckoutMessages().terms;
  const error = fieldState.error?.message;

  return (
    <div data-reveal-block className="flex flex-col gap-1 border-t border-border pt-5">
      <Checkbox
        ref={field.ref}
        name={field.name}
        label={t.checkbox}
        checked={field.value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => field.onChange(event.target.checked)}
      />
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setOpen(true)}>
        {t.read}
      </Button>
      {error ? (
        <p id={errorId} className="flex animate-fade-in items-start gap-1.5 text-sm text-danger">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
      <TermsDialog
        open={open}
        sections={sections}
        onClose={() => setOpen(false)}
        onAccept={() => {
          field.onChange(true);
          clearErrors("termsAccepted");
          setOpen(false);
        }}
      />
    </div>
  );
};
