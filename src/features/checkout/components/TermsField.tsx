"use client";

import { useId, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { AlertCircleIcon, Button, Checkbox } from "@/shared/ui";
import type { CheckoutValues } from "../model/checkout.schema";
import type { TermsSection } from "../model/terms";
import { TermsDialog } from "./TermsDialog";

/**
 * Aceite dos termos: checkbox com o rótulo completo, "Ler termos" **fora** do `<label>` e erro
 * ligado ao checkbox por `aria-describedby`. O dialog devolve o foco ao gatilho ao fechar.
 */
export const TermsField = ({ sections }: { sections: TermsSection[] }) => {
  const { control, clearErrors } = useFormContext<CheckoutValues>();
  const { field, fieldState } = useController({ control, name: "termsAccepted" });
  const [open, setOpen] = useState(false);
  const errorId = useId();
  const error = fieldState.error?.message;

  return (
    <div className="flex flex-col gap-1 border-t border-border pt-5">
      <Checkbox
        ref={field.ref}
        name={field.name}
        label="Li e aceito os termos e condições da reserva, incluindo a política de cancelamento."
        checked={field.value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => field.onChange(event.target.checked)}
        onBlur={field.onBlur}
      />
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setOpen(true)}>
        Ler termos e condições
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
