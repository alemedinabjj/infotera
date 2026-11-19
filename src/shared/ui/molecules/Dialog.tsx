import { type ReactNode, type RefObject, useEffect, useId, useRef } from "react";
import { cn } from "../../lib/cn";
import { IconButton } from "../atoms/IconButton";
import { XIcon } from "../icons";

type DialogSize = "sm" | "md";

const SIZES: Record<DialogSize, string> = { sm: "max-w-sm", md: "max-w-lg" };

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  closeLabel?: string;
  /** Fecha ao clicar no backdrop (só para dialogs informativos). */
  closeOnBackdrop?: boolean;
  className?: string;
};

/** Abre/fecha o `<dialog>` nativo, devolve o foco ao gatilho e trava o scroll do body. */
const useDialogLifecycle = (ref: RefObject<HTMLDialogElement | null>, open: boolean) => {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, [ref, open]);
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
  closeLabel = "Fechar",
  closeOnBackdrop = false,
  className,
}: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useDialogLifecycle(ref, open);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: clique no backdrop é atalho de mouse; o teclado fecha com Esc/botão
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-h-[85dvh] w-[calc(100%-2rem)] overflow-hidden rounded-dialog bg-surface p-0 text-fg shadow-overlay",
        SIZES[size],
        className,
      )}
    >
      {open ? (
        <div className="flex max-h-[85dvh] flex-col">
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
            <footer className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
};
