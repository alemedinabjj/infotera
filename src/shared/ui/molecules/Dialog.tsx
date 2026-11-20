"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { useCommonMessages } from "../../i18n/common/useCommonMessages";
import { cn } from "../../lib/cn";
import { type MotionPresetName, motionPreset } from "../../lib/motion";
import { IconButton } from "../atoms/IconButton";
import { XIcon } from "../icons";

type DialogSize = "sm" | "md" | "full";

type DialogPlacement = "center" | "sheet";

type DialogLayout = {
  dialog: string;
  panel: string;
  preset: MotionPresetName;
  header: string;
  title: string;
  body: string;
  footer: string;
};

const CENTER: DialogLayout = {
  dialog: "m-auto max-h-[85dvh] w-[calc(100%-2rem)] text-fg",
  panel: "max-h-[85dvh] overflow-hidden rounded-dialog bg-surface shadow-overlay",
  preset: "dialog-center",
  header: "border-b border-border py-2 pr-2 pl-5",
  title: "text-lg",
  body: "overflow-y-auto px-5 py-4",
  footer: "flex-col-reverse border-t border-border px-5 py-4 sm:flex-row sm:justify-end",
};

// Bottom-sheet: colado embaixo; a partir de `sm` continua embaixo, mas com largura de dialog.
const SHEET: DialogLayout = {
  ...CENTER,
  dialog: "mt-auto mb-0 max-h-[90dvh] w-full max-w-none text-fg sm:mx-auto sm:max-w-lg",
  panel: "max-h-[90dvh] overflow-hidden rounded-t-dialog bg-surface shadow-overlay",
  preset: "dialog-sheet",
  footer:
    "flex-row gap-3 border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
};

// Tela cheia (lightbox): fundo `fg`, anel de foco branco (o `primary` não passa 3:1 sobre `fg`).
const FULL: DialogLayout = {
  dialog:
    "fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none text-fg-on-primary [&_:focus-visible]:outline-fg-on-primary",
  panel: "h-full bg-fg",
  preset: "dialog-full",
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
  /** `id` do texto que descreve o diálogo (`aria-describedby`): ex.: o contador "Foto 3 de 5". */
  describedBy?: string;
  /** Depois da saída animada e de o `<dialog>` fechar (o foco já voltou ao gatilho). */
  onClosed?: () => void;
  /** Teclas dentro do dialog (ex.: setas do lightbox). `Esc` e `Tab` já são nativos. */
  onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
  className?: string;
};

type DialogSession = {
  /** Fecha o `<dialog>` nativo, destrava o scroll e devolve o foco ao gatilho (depois da saída). */
  finish: () => void;
};

/**
 * Abre o `<dialog>` nativo e trava o scroll do body. O fechamento é do `finish`, que o painel
 * chama no `onExitComplete`: a saída anima antes do `close()`.
 */
const useDialogLifecycle = (
  ref: RefObject<HTMLDialogElement | null>,
  open: boolean,
  initialFocus: string | undefined,
  onClosed: (() => void) | undefined,
): DialogSession => {
  const trigger = useRef<Element | null>(null);
  const previousOverflow = useRef<string | null>(null);

  const finish = () => {
    const dialog = ref.current;
    if (dialog?.open) dialog.close();
    if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current;
    previousOverflow.current = null;
    if (trigger.current instanceof HTMLElement) trigger.current.focus();
    trigger.current = null;
    onClosed?.();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) {
      trigger.current = document.activeElement;
      previousOverflow.current = document.body.style.overflow;
      dialog.showModal();
    }
    // `showModal` foca o 1º focável (o "Fechar"); aqui a feature escolhe um controle mais útil.
    if (initialFocus) dialog.querySelector<HTMLElement>(initialFocus)?.focus();
    document.body.style.overflow = "hidden";
  }, [ref, open, initialFocus]);

  // Desmontou com o dialog aberto (ex.: troca de rota): destrava o scroll sem esperar animação.
  useEffect(() => {
    const dialog = ref;
    return () => {
      if (dialog.current?.open) dialog.current.close();
      if (previousOverflow.current !== null) {
        document.body.style.overflow = previousOverflow.current;
      }
    };
  }, [ref]);

  return { finish };
};

type PanelProps = {
  layout: DialogLayout;
  size: DialogSize;
  titleId: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer: ReactNode;
  focusableBody: boolean;
  children: ReactNode;
};

/** Visual do dialog (fundo, raio, sombra): o `<dialog>` é só o contêiner transparente. */
const DialogPanel = ({
  layout,
  size,
  titleId,
  title,
  closeLabel,
  onClose,
  footer,
  focusableBody,
  children,
}: PanelProps) => {
  const preset = motionPreset(layout.preset, useReducedMotion() ?? false);
  return (
    <m.div
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={preset.transition}
      className={cn("flex flex-col", layout.panel)}
    >
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
          // Contorno por dentro: o `overflow-hidden` do painel cortaria o anel de foco externo.
          className={cn(layout.body, "focus-visible:outline-offset-[-2px]")}
        >
          {children}
        </section>
      ) : (
        <div className={layout.body}>{children}</div>
      )}
      {footer ? <footer className={cn("flex gap-3", layout.footer)}>{footer}</footer> : null}
    </m.div>
  );
};

/**
 * Modal sobre `<dialog>` nativo (`showModal`): foco preso, `Esc` e fundo inerte vêm do browser.
 * O painel anima a entrada e a **saída**; o `<dialog>` só fecha (e o foco volta ao gatilho) depois
 * da saída. Conteúdo só é montado enquanto aberto.
 */
export const Dialog = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  placement = "center",
  closeLabel,
  closeOnBackdrop = false,
  initialFocus,
  focusableBody = false,
  describedBy,
  onClosed,
  onKeyDown,
  className,
}: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);
  const commonClose = useCommonMessages().dialog.close;
  const titleId = useId();
  const pressStartedOnBackdrop = useRef(false);
  const { finish } = useDialogLifecycle(
    ref,
    open,
    focusableBody ? "[data-dialog-body]" : initialFocus,
    onClosed,
  );
  const layout = layoutFor(size, placement);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      data-closing={open ? undefined : ""}
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
        "overflow-visible bg-transparent p-0",
        layout.dialog,
        layout.preset === "dialog-center" && SIZE_CLASS[size === "sm" ? "sm" : "md"],
        className,
      )}
    >
      <AnimatePresence initial={false} onExitComplete={finish}>
        {open ? (
          <DialogPanel
            key="panel"
            layout={layout}
            size={size}
            titleId={titleId}
            title={title}
            closeLabel={closeLabel ?? commonClose}
            onClose={onClose}
            footer={footer}
            focusableBody={focusableBody}
          >
            {children}
          </DialogPanel>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
};
