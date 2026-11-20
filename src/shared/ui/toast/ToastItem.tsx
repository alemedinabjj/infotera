"use client";

import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { useCommonMessages } from "../../i18n/common/useCommonMessages";
import { cn } from "../../lib/cn";
import { focusWhenReady } from "../../lib/focus";
import { motionPreset } from "../../lib/motion";
import { Button } from "../atoms/Button";
import { IconButton } from "../atoms/IconButton";
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XIcon } from "../icons";
import type { ToastItemData, ToastTone } from "./toast-model";
import { toast } from "./toast-store";

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

/** Conta o tempo restante; reinicia quando a `version` sobe e pausa enquanto `paused`. */
const useAutoDismiss = (item: ToastItemData, paused: boolean) => {
  const { id, version, duration } = item;
  const state = useRef({ version, remaining: duration });

  useEffect(() => {
    if (state.current.version !== version) state.current = { version, remaining: duration };
    // Persistente (`duration` infinita): nunca fecha sozinho.
    if (paused || !Number.isFinite(state.current.remaining)) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => toast.dismiss(id), state.current.remaining);
    return () => {
      clearTimeout(timer);
      state.current.remaining = Math.max(0, state.current.remaining - (Date.now() - startedAt));
    };
  }, [paused, id, version, duration]);
};

/** Depois de uma ação que desmonta o toast, devolve o foco ao controle de origem (nunca ao `body`). */
const restoreFocus = (item: ToastItemData): void => {
  const { action, origin } = item;
  if (!action || action.navigates) return;
  focusWhenReady(
    () => action.returnFocus?.() ?? (origin?.isConnected ? origin : null),
    () => undefined,
  );
};

/** Um toast animado (entrada `y`+fade, saída em fade). O tempo é pausado pela região. */
export const ToastItem = ({ item, paused }: { item: ToastItemData; paused: boolean }) => {
  const preset = motionPreset("toast", useReducedMotion() ?? false);
  const t = useCommonMessages().ui;
  const close = () => toast.dismiss(item.id);
  useAutoDismiss(item, paused);

  return (
    <m.div
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={preset.transition}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-overlay",
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
              restoreFocus(item);
            }}
          >
            {item.action.label}
          </Button>
        ) : null}
      </div>
      <IconButton
        aria-label={t.closeNotification}
        icon={<XIcon className="size-5" />}
        className="-m-2"
        onClick={close}
      />
    </m.div>
  );
};
