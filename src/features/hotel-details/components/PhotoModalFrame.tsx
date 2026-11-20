"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/shared/ui";
import { useCloseOnce } from "../hooks/useCloseOnce";

type PhotoModalFrameProps = {
  title: string;
  /** Seletor do controle que recebe o foco ao abrir (padrão: "Fechar"). */
  initialFocus?: string;
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Moldura do modal da foto para os estados sem foto (carregando e erro da rota): o mesmo
 * `Dialog size="full"` do `PhotoModal`, então Esc, "Fechar" e Voltar se comportam igual.
 */
export const PhotoModalFrame = ({
  title,
  initialFocus,
  footer,
  children,
}: PhotoModalFrameProps) => {
  const { open, requestClose, onClosed } = useCloseOnce();
  return (
    <Dialog
      open={open}
      onClose={requestClose}
      onClosed={onClosed}
      size="full"
      title={title}
      initialFocus={initialFocus}
      footer={footer}
    >
      {children}
    </Dialog>
  );
};
