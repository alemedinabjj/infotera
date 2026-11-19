"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { copyText } from "@/shared/lib/clipboard";
import { cn } from "@/shared/lib/cn";
import { buttonClassName, CheckIcon, CopyIcon, InfoIcon } from "@/shared/ui";

const COPIED_MS = 2000;
const COPY_LABEL = "Copiar número da reserva";
const FAILURE_TEXT = "Não foi possível copiar. Selecione o número e copie.";

type CopyState = { status: "idle" | "copied" | "failed"; attempt: number };

const subscribeNothing = () => () => undefined;

/** `false` no servidor e na hidratação, `true` depois: o botão só existe com JS. */
const useMounted = (): boolean =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

type CopyBookingNumberProps = {
  value: string;
  /** Id do elemento com o número, selecionado quando a cópia falha. */
  numberId: string;
};

/**
 * Botão "Copiar número da reserva". O feedback fica no controle (sem toast): "Copiado" por 2 s na
 * mesma largura, e uma linha `aria-live` **abaixo** do botão anuncia o sucesso ou mostra, visível,
 * o que fazer quando a cópia falha (o número fica selecionado). O foco nunca sai do botão.
 */
export const CopyBookingNumber = ({ value, numberId }: CopyBookingNumberProps) => {
  const mounted = useMounted();
  const [state, setState] = useState<CopyState>({ status: "idle", attempt: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = async () => {
    if (timer.current) clearTimeout(timer.current);
    const copied = await copyText(value);
    setState((current) => ({ status: copied ? "copied" : "failed", attempt: current.attempt + 1 }));
    if (copied) {
      timer.current = setTimeout(
        () => setState((current) => ({ ...current, status: "idle" })),
        COPIED_MS,
      );
      return;
    }
    const target = document.getElementById(numberId);
    if (target) window.getSelection()?.selectAllChildren(target);
  };

  const copied = state.status === "copied";
  return (
    <div className="print:hidden">
      <div className="mt-3 min-h-11">
        {mounted ? (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              buttonClassName({ variant: "secondary", size: "sm" }),
              "w-full py-2 sm:w-auto",
            )}
          >
            {copied ? (
              <CheckIcon className="size-5 shrink-0" />
            ) : (
              <CopyIcon className="size-5 shrink-0" />
            )}
            <span className="inline-grid text-center">
              <span
                aria-hidden={copied || undefined}
                className={`col-start-1 row-start-1 ${copied ? "invisible" : ""}`}
              >
                {COPY_LABEL}
              </span>
              <span
                aria-hidden={!copied || undefined}
                className={`col-start-1 row-start-1 ${copied ? "" : "invisible"}`}
              >
                Copiado
              </span>
            </span>
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-sm text-fg-muted">
        {copied ? (
          <span key={state.attempt} className="sr-only">
            Número da reserva copiado.
          </span>
        ) : null}
        {state.status === "failed" ? (
          <span key={state.attempt} className="flex items-start gap-1.5">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            {FAILURE_TEXT}
          </span>
        ) : null}
      </p>
    </div>
  );
};
