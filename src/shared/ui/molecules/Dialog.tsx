"use client";

import { type ReactNode, type RefObject, useEffect, useId, useRef } from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "../atoms/IconButton";
import { XIcon } from "../icons";

type DialogSize = "sm" | "md";

const SIZES: Record<DialogSize, string> = { sm: "max-w-sm", md: "max-w-lg" };

type DialogPlacement = "center" | "sheet";

type PlacementStyle = { dialog: string; panel: string; footer: string };

const PLACEMENTS: Record<DialogPlacement, PlacementStyle> = {
  center: {
    dialog: "m-auto max-h-[85dvh] w-[calc(100%-2rem)] rounded-dialog",
    panel: "max-h-[85dvh]",
    footer: "flex-col-reverse px-5 py-4 sm:flex-row sm:justify-end",
  },
  // Bottom-sheet: colado embaixo; a partir de `sm` continua embaixo, mas com largura de dialog.
  sheet: {
    dialog:
      "mt-auto mb-0 max-h-[90dvh] w-full max-w-none animate-slide-up rounded-t-dialog rounded-b-none sm:mx-auto sm:max-w-lg",
    panel: "max-h-[90dvh]",
    footer: "flex-row gap-3 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
  },
};

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  /** `center` (padrão) ou `sheet` (bottom-sheet do mobile: filtros). */
  placement?: DialogPlacement;
  closeLabel?: string;
  /** Fecha ao clicar no backdrop (só para dialogs informativos). */
  closeOnBackdrop?: boolean;
  /** Seletor CSS do controle que recebe o foco ao abrir (padrão: o 1º focável, o "Fechar"). */
  initialFocus?: string;
  className?: string;
};

/** Abre/fecha o `<dialog>` nativo, devolve o foco ao gatilho e trava o scroll do body. */
const useDialogLifecycle = (
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
  initialFocus: string | undefined,
) => {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    // `showModal` foca o 1º focável (o "Fechar"); aqui a feature escolhe um controle mais útil.
    if (initialFocus) dialog.querySelector<HTMLElement>(initialFocus)?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [ref, open, initialFocus]);
};

/**
 * Modal sobre `<dialog>` nativo (`showModal`): foco preso, `Esc` e fundo inerte vêm do browser.
 * Conteúdo só é montado enquanto aberto.
 */
export const Dialog = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  placement = "center",
  closeLabel = "Fechar",
  closeOnBackdrop = false,
  initialFocus,
  className,
}: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressStartedOnBackdrop = useRef(false);
  useDialogLifecycle(ref, open, initialFocus);
  const layout = PLACEMENTS[placement];

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: clique no backdrop é atalho de mouse; o teclado fecha com Esc/botão
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (open) onClose();
      }}
      onCancel={(event) => {
        // O pai é a fonte da verdade: Esc só pede o fechamento, quem fecha é `open`.
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Arrastar de dentro do conteúdo até o backdrop não fecha: pointerdown e click no dialog.
        const startedOnBackdrop = pressStartedOnBackdrop.current;
        pressStartedOnBackdrop.current = false;
        if (closeOnBackdrop && startedOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "overflow-hidden bg-surface p-0 text-fg shadow-overlay",
        layout.dialog,
        placement === "center" && SIZES[size],
        className,
      )}
    >
      {open ? (
        <div className={cn("flex flex-col", layout.panel)}>
          <header className="flex items-center justify-between gap-2 border-b border-border py-2 pr-2 pl-5">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <IconButton
              aria-label={closeLabel}
              icon={<XIcon className="size-6" />}
              onClick={onClose}
            />
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <footer className={cn("flex gap-3 border-t border-border", layout.footer)}>
              {footer}
            </footer>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
};
