"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../atoms/Button";
import { IconButton } from "../atoms/IconButton";
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XIcon } from "../icons";
import { type ToastItemData, type ToastTone, toast, useToastStore } from "./toast-store";

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-l-4 border-l-success",
  error: "border-l-4 border-l-danger",
  info: "border-l-4 border-l-info",
};

const ToneIcon = ({ tone }: { tone: ToastTone }) => {
  switch (tone) {
    case "success":
      return <CheckCircleIcon className="size-5 shrink-0 text-success" />;
    case "error":
      return <AlertCircleIcon className="size-5 shrink-0 text-danger" />;
    case "info":
      return <InfoIcon className="size-5 shrink-0 text-info" />;
    default: {
      const unreachable: never = tone;
      return unreachable;
    }
  }
};

/** Conta o tempo restante e o pausa enquanto `paused` (hover/foco). */
const useAutoDismiss = (duration: number, paused: boolean, onDone: () => void) => {
  const remaining = useRef(duration);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onDoneRef.current(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused]);
};

const ToastItem = ({ item }: { item: ToastItemData }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const close = () => toast.dismiss(item.id);
  useAutoDismiss(item.duration, hovered || focused, close);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pausa passiva do timer; ações internas são botões focáveis
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(
        "pointer-events-auto flex animate-slide-up items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-overlay",
        TONE_STYLES[item.tone],
      )}
    >
      <ToneIcon tone={item.tone} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <p className="text-sm text-fg">{item.message}</p>
        {item.action ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              item.action?.onClick();
              close();
            }}
          >
            {item.action.label}
          </Button>
        ) : null}
      </div>
      <IconButton
        aria-label="Fechar notificação"
        icon={<XIcon className="size-5" />}
        className="-m-2"
        onClick={close}
      />
    </div>
  );
};

/**
 * Duas regiões vivas sempre montadas: `role="status"` (sucesso/info) e `role="alert"` (erro).
 * Nunca rouba o foco. Montar uma vez no layout raiz.
 */
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const regionClass = "flex flex-col gap-3";

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 sm:right-6 sm:bottom-6 sm:left-auto sm:w-96">
      <div role="status" aria-live="polite" className={regionClass}>
        {toasts
          .filter((item) => item.tone !== "error")
          .map((item) => (
            <ToastItem key={item.id} item={item} />
          ))}
      </div>
      <div role="alert" className={regionClass}>
        {toasts
          .filter((item) => item.tone === "error")
          .map((item) => (
            <ToastItem key={item.id} item={item} />
          ))}
      </div>
    </div>
  );
};
