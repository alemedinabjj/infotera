"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { revealBlock } from "@/shared/lib/scroll";
import { Alert, Button, buttonClassName } from "@/shared/ui";
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
          title="Não foi possível calcular o total"
          action={
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              loading={priceRetrying}
              loadingText="Tentando…"
              onClick={onReloadPrice}
            >
              Tentar de novo
            </Button>
          }
        >
          Carregue o preço do quarto de novo para confirmar a reserva.
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
              loadingText="Tentando…"
              onClick={onRetry}
            >
              Tentar de novo
            </Button>
          ) : feedback.action === "view-rooms" ? (
            <Link
              href={backHref}
              className={`${buttonClassName({ variant: "secondary", size: "sm" })} self-start`}
            >
              Ver quartos
            </Link>
          ) : undefined
        }
      >
        {feedback.description}
      </Alert>
    </div>
  );
};
