"use client";

import { Button, Dialog } from "@/shared/ui";
import type { TermsSection } from "../model/terms";

type TermsDialogProps = {
  open: boolean;
  sections: TermsSection[];
  onClose: () => void;
  onAccept: () => void;
};

/** Termos num `Dialog` com corpo focável (setas/PageDown rolam o texto). "Li e aceito" marca o checkbox. */
export const TermsDialog = ({ open, sections, onClose, onAccept }: TermsDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    title="Termos e condições da reserva"
    size="md"
    placement="center"
    closeOnBackdrop
    focusableBody
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
        <Button variant="primary" onClick={onAccept}>
          Li e aceito
        </Button>
      </>
    }
  >
    <div className="flex flex-col gap-4 px-5 py-4">
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-fg">{section.title}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-prose text-sm text-fg">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  </Dialog>
);
