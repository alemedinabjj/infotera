"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { revealBlock } from "@/shared/lib/scroll";
import { Alert, Button, buttonClassName } from "@/shared/ui";
import { useCheckoutMessages } from "../hooks/useCheckoutMessages";
import type { SubmitState } from "../hooks/useSubmitBooking";

type SubmitErrorProps = {
  state: Exclude<SubmitState, { kind: "none" }>;
  retrying: boolean;
  backHref: string;
  onRetry: () => void;
  onReloadPrice: () => void;
  priceRetrying: boolean;
};

/**
 * Alerta global do envio (falha, preço mudou, esgotou, cupom, sem preço). Remontado a cada
 * resultado (`key`): recebe o foco ao montar, e é revelado por inteiro entre o header e a barra fixa.
 */
export const SubmitError = ({
  state,
  retrying,
  backHref,
  onRetry,
  onReloadPrice,
  priceRetrying,
}: SubmitErrorProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const t = useCheckoutMessages();
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    // Depois do commit: o alerta INTEIRO (não só o título) fica acima da barra fixa e abaixo do header.
    const frame = requestAnimationFrame(() => revealBlock(ref.current));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (state.kind === "price-unavailable") {
    return (
      <div ref={ref} tabIndex={-1}>
        <Alert
          tone="danger"
          title={t.submit.priceUnavailableTitle}
          action={
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              loading={priceRetrying}
              loadingText={t.trying}
              onClick={onReloadPrice}
            >
              {t.retry}
            </Button>
          }
        >
          {t.submit.priceUnavailableBody}
        </Alert>
      </div>
    );
  }
  const { feedback } = state;
  return (
    <div ref={ref} tabIndex={-1}>
      <Alert
        tone={feedback.tone}
        title={feedback.title}
        action={
          feedback.action === "retry" ? (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              loading={retrying}
              loadingText={t.trying}
              onClick={onRetry}
            >
              {t.retry}
            </Button>
          ) : feedback.action === "view-rooms" ? (
            <Link
              href={backHref}
              className={`${buttonClassName({ variant: "secondary", size: "sm" })} self-start`}
            >
              {t.viewRooms}
            </Link>
          ) : undefined
        }
      >
        {feedback.description}
      </Alert>
    </div>
  );
};
