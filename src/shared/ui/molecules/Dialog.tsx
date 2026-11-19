"use client";

import {
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "../atoms/IconButton";
import { XIcon } from "../icons";

type DialogSize = "sm" | "md" | "full";

type DialogPlacement = "center" | "sheet";

type DialogLayout = {
  dialog: string;
  panel: string;
  header: string;
  title: string;
  body: string;
  footer: string;
};

const CENTER: DialogLayout = {
  dialog:
    "m-auto max-h-[85dvh] w-[calc(100%-2rem)] rounded-dialog bg-surface text-fg shadow-overlay",
  panel: "max-h-[85dvh]",
  header: "border-b border-border py-2 pr-2 pl-5",
  title: "text-lg",
  body: "overflow-y-auto px-5 py-4",
  footer: "flex-col-reverse border-t border-border px-5 py-4 sm:flex-row sm:justify-end",
};

// Bottom-sheet: colado embaixo; a partir de `sm` continua embaixo, mas com largura de dialog.
const SHEET: DialogLayout = {
  ...CENTER,
  dialog:
    "mt-auto mb-0 max-h-[90dvh] w-full max-w-none animate-slide-up rounded-t-dialog rounded-b-none bg-surface text-fg shadow-overlay sm:mx-auto sm:max-w-lg",
  panel: "max-h-[90dvh]",
  footer:
    "flex-row gap-3 border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
};

// Tela cheia (lightbox): fundo `fg`, anel de foco branco (o `primary` não passa 3:1 sobre `fg`).
const FULL: DialogLayout = {
  dialog:
    "fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none animate-fade-in rounded-none bg-fg text-fg-on-primary [&_:focus-visible]:outline-fg-on-primary",
  panel: "h-full",
  header: "h-14 shrink-0 pr-2 pl-4",
  title: "truncate text-base",
  body: "min-h-0 flex-1",
  footer: "h-16 shrink-0 items-center justify-between px-4 pb-[env(safe-area-inset-bottom)]",
};

const SIZE_CLASS: Record<"sm" | "md", string> = { sm: "max-w-sm", md: "max-w-lg" };

const layoutFor = (size: DialogSize, placement: DialogPlacement): DialogLayout => {
  if (size === "full") return FULL;
  return placement === "sheet" ? SHEET : CENTER;
};

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `sm`/`md` (largura) ou `full`: tela cheia com fundo escuro (lightbox; `placement` é ignorado). */
  size?: DialogSize;
  /** `center` (padrão) ou `sheet` (bottom-sheet do mobile: filtros). */
  placement?: DialogPlacement;
  closeLabel?: string;
  /** Fecha ao clicar no backdrop (só para dialogs informativos). */
  closeOnBackdrop?: boolean;
  /** Seletor CSS do controle que recebe o foco ao abrir (padrão: o 1º focável, o "Fechar"). */
  initialFocus?: string;
  /**
   * Texto longo (ex.: termos): o corpo rolável vira uma região focável (`tabIndex=0`,
   * `role="region"` nomeada pelo título) e recebe o foco inicial, para setas/PageDown rolarem.
   */
  focusableBody?: boolean;
  /** Teclas dentro do dialog (ex.: setas do lightbox). `Esc` e `Tab` já são nativos. */
  onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
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
  focusableBody = false,
  onKeyDown,
  className,
}: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressStartedOnBackdrop = useRef(false);
  useDialogLifecycle(ref, open, focusableBody ? "[data-dialog-body]" : initialFocus);
  const layout = layoutFor(size, placement);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
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
        "overflow-hidden p-0",
        layout.dialog,
        layout === CENTER && size !== "full" && SIZE_CLASS[size],
        className,
      )}
    >
      {open ? (
        <div className={cn("flex flex-col", layout.panel)}>
          <header className={cn("flex items-center justify-between gap-2", layout.header)}>
            <h2 id={titleId} className={cn("font-semibold", layout.title)}>
              {title}
            </h2>
            <IconButton
              aria-label={closeLabel}
              variant={size === "full" ? "overlay" : "ghost"}
              icon={<XIcon className="size-6" />}
              onClick={onClose}
            />
          </header>
          {focusableBody ? (
            <section
              data-dialog-body
              aria-labelledby={titleId}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável nomeada; o teclado precisa rolar o texto longo
              tabIndex={0}
              // Contorno por dentro: o `overflow-hidden` do dialog cortaria o anel de foco externo.
              className={cn(layout.body, "focus-visible:outline-offset-[-2px]")}
            >
              {children}
            </section>
          ) : (
            <div className={layout.body}>{children}</div>
          )}
          {footer ? <footer className={cn("flex gap-3", layout.footer)}>{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
};
