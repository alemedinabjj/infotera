"use client";

import { type FormEvent, useId } from "react";
import { FormProvider } from "react-hook-form";
import { hotelHref } from "@/shared/lib/links";
import { revealBelowHeader } from "@/shared/lib/scroll";
import { Alert, ErrorSummary } from "@/shared/ui";
import type { CheckoutFlow } from "../hooks/useCheckoutFlow";
import { stepCounter, stepDocumentTitle, stepTitle } from "../model/steps";
import { SUMMARY_TOGGLE_ID } from "./BookingSummary";
import { DeferBlurProvider } from "./blur-context";
import { PaymentStep } from "./PaymentStep";
import { PersonalStep } from "./PersonalStep";
import { ReviewStep } from "./ReviewStep";
import { StepActions } from "./StepActions";
import { SubmitError } from "./SubmitError";

export const DEMO_NOTICE = "Ambiente de demonstração — não use dados reais.";

const NOTICE_TEXT = {
  restored: "Recuperamos os dados que você preencheu nesta sessão.",
  "payment-wiped":
    "Por segurança, os dados do cartão não ficam salvos. Preencha o pagamento de novo.",
} as const;

/**
 * `<form>` dos 3 passos: aviso de demonstração, título do passo (alvo do foco), resumo de erros,
 * passo atual, alerta do envio e ações. Um `useForm` para tudo; só o passo atual fica montado.
 */
export const CheckoutForm = ({ flow }: { flow: CheckoutFlow }) => {
  const { checkout, submit, price, selection, roomCount } = flow;
  const { form, step } = checkout;
  const headingId = useId();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submit.isPending) return;
    if (step !== "review") {
      void checkout.goNext();
      return;
    }
    void form.handleSubmit(submit.submit, (errors) => {
      if (errors.contact || errors.companions) checkout.goTo("personal");
      else if (errors.payment) checkout.goTo("payment");
      else checkout.markAttempt();
    })();
  };

  return (
    <FormProvider {...form}>
      <DeferBlurProvider value={checkout.deferBlur}>
        <title>{`${stepDocumentTitle(step)} | Infotera Hotéis`}</title>
        <form
          ref={checkout.containerRef}
          noValidate
          aria-labelledby={headingId}
          onSubmit={onSubmit}
          className="flex max-w-2xl flex-col gap-5 rounded-card border border-border bg-surface p-4 shadow-card lg:col-start-1 lg:row-start-2 lg:p-5"
        >
          <Alert tone="info">{DEMO_NOTICE}</Alert>
          <div className="flex flex-col gap-1">
            <span className="block text-sm font-medium text-fg-muted">{stepCounter(step)}</span>
            <h2
              id={headingId}
              ref={checkout.headingRef}
              tabIndex={-1}
              className="text-xl font-semibold text-fg"
            >
              {stepTitle(step)}
            </h2>
          </div>
          {checkout.notice ? <Alert tone="info">{NOTICE_TEXT[checkout.notice.kind]}</Alert> : null}
          {checkout.summary.length > 0 ? (
            <ErrorSummary
              key={checkout.attempts}
              items={checkout.summary}
              onSelect={(id) => form.setFocus(id)}
            />
          ) : null}
          <StepBody flow={flow} />
          {step === "review" && submit.state.kind !== "none" ? (
            <SubmitError
              key={submit.state.key}
              state={submit.state}
              retrying={submit.isPending}
              backHref={hotelHref(selection.hotelId, selection.criteria)}
              onRetry={() => void form.handleSubmit(submit.submit)()}
              onReloadPrice={price.status === "error" ? price.retry : () => undefined}
              priceRetrying={price.status === "error" && price.retrying}
            />
          ) : null}
          <StepActions
            step={step}
            price={price}
            rooms={roomCount.rooms}
            submitting={submit.isPending}
            onBack={checkout.goBack}
          />
        </form>
      </DeferBlurProvider>
    </FormProvider>
  );
};

const StepBody = ({ flow }: { flow: CheckoutFlow }) => {
  const { checkout, hotel, room, selection, price } = flow;
  switch (checkout.step) {
    case "personal":
      return <PersonalStep companions={checkout.fields} />;
    case "payment":
      return <PaymentStep />;
    case "review":
      return (
        <ReviewStep
          hotel={hotel}
          room={room}
          criteria={selection.criteria}
          price={price}
          onEdit={checkout.goTo}
          onOpenSummary={() => {
            flow.setSummaryOpen(true);
            const toggle = document.getElementById(SUMMARY_TOGGLE_ID);
            toggle?.focus({ preventScroll: true });
            revealBelowHeader(toggle);
          }}
        />
      );
    default: {
      const unreachable: never = checkout.step;
      return unreachable;
    }
  }
};
