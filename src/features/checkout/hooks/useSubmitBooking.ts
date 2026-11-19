"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { roomQueryOptions } from "@/shared/api/queries";
import { useOnline } from "@/shared/hooks/useOnline";
import type { RoomSelection } from "@/shared/stores/booking-draft";
import { toast } from "@/shared/ui";
import { createBookingAction } from "../api/create-booking.action";
import {
  type Attempt,
  nextAttemptId,
  requestFingerprint,
  toBookingRequest,
} from "../model/booking-request";
import type { CheckoutFieldPath, CheckoutValues } from "../model/checkout.schema";
import type { CouponRejection } from "../model/coupons";
import {
  type CreateBookingResult,
  type FailedResult,
  type SubmitFeedback,
  submitFeedback,
} from "../model/create-booking-result";
import type { QuoteResult } from "../model/quote";
import type { CheckoutPrice } from "./checkout-price";

type SubmitOptions = {
  selection: RoomSelection;
  price: CheckoutPrice;
  onCreated: (bookingId: string) => void;
  onCouponRejected: (code: string, reason: CouponRejection) => void;
  /** O servidor recusou um campo: o formulário mostra o erro e leva ao passo dele. */
  onInvalidField: (path: CheckoutFieldPath) => void;
};

export type SubmitState =
  | { kind: "none" }
  | { kind: "price-unavailable"; key: number }
  | { kind: "feedback"; feedback: SubmitFeedback; key: number };

const FAILED_ON_TRANSPORT: FailedResult = { status: "failed", kind: "unknown" };

/**
 * Envio por Server Action (`useMutation`, sem retry automático). O `attemptId` é gerado por tentativa
 * e reusado enquanto o pedido não muda (retry idempotente). Sem duplo envio: guarda em `isPending`
 * e o botão em `loading`. Nada de texto do servidor: o feedback sai de `submitFeedback`.
 */
export const useSubmitBooking = ({
  selection,
  price,
  onCreated,
  onCouponRejected,
  onInvalidField,
}: SubmitOptions) => {
  const queryClient = useQueryClient();
  const online = useOnline();
  const attempt = useRef<Attempt | null>(null);
  const keyRef = useRef(0);
  const [state, setState] = useState<SubmitState>({ kind: "none" });
  const mutation = useMutation({ mutationFn: createBookingAction });

  const show = (next: (key: number) => SubmitState) => {
    keyRef.current += 1;
    setState(next(keyRef.current));
  };

  const handle = (result: CreateBookingResult, quote: QuoteResult) => {
    if (result.status === "created") {
      onCreated(result.bookingId);
      return;
    }
    // Preço mudou: busca o preço novo. `unavailable` não refaz a consulta (a tela não pode virar o
    // estado bloqueante no meio do alerta com a ação "Ver quartos").
    if (result.status === "price-changed") {
      void queryClient.invalidateQueries({ queryKey: roomQueryOptions(selection.roomId).queryKey });
    }
    if (result.status === "coupon-invalid")
      onCouponRejected(quote.quote.couponCode ?? "", result.reason);
    const [firstField] = result.status === "invalid" ? result.fields : [];
    if (firstField) {
      onInvalidField(firstField);
      setState({ kind: "none" });
      return;
    }
    const feedback = submitFeedback(result, {
      previousTotalCents: quote.quote.totalCents,
      totalWithoutCouponCents: quote.baseQuote.totalCents,
      couponCode: quote.quote.couponCode,
      online,
    });
    if (feedback.toast) toast.error(feedback.toast);
    show((key) => ({ kind: "feedback", feedback, key }));
  };

  const submit = (values: CheckoutValues): void => {
    if (mutation.isPending) return;
    if (price.status === "loading") return;
    if (price.status === "error") {
      show((key) => ({ kind: "price-unavailable", key }));
      return;
    }
    const quote = price.result;
    const draftRequest = toBookingRequest(values, selection, quote.quote, "");
    attempt.current = nextAttemptId(attempt.current, requestFingerprint(draftRequest));
    const request = { ...draftRequest, attemptId: attempt.current.id };
    mutation.mutate(request, {
      onSuccess: (result) => handle(result, quote),
      onError: () => handle(FAILED_ON_TRANSPORT, quote),
    });
  };

  return {
    submit,
    isPending: mutation.isPending,
    state,
    dismiss: () => setState({ kind: "none" }),
  };
};
