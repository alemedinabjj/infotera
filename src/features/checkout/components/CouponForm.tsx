"use client";

import { type FormEvent, type RefObject, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import {
  AlertCircleIcon,
  Button,
  CheckIcon,
  ChevronDownIcon,
  Field,
  Input,
  TagIcon,
} from "@/shared/ui";
import type { CouponView } from "../hooks/useCoupon";
import { type CouponSnapshot, describeCouponTransition } from "../model/coupon-announcement";
import { couponBenefit, couponMessage } from "../model/coupons";
import type { CouponStatus } from "../model/quote";

type CouponFormProps = {
  view: CouponView;
  status: CouponStatus;
  /** Durante o envio da reserva "Aplicar" e "Remover" ficam `aria-disabled`. */
  locked: boolean;
  onApply: (raw: string) => void;
  onCancel: () => void;
  onRemove: () => void;
};

const snapshotOf = (view: CouponView, status: CouponStatus): CouponSnapshot => {
  if (view.kind === "error") return { kind: "error", message: view.message };
  if (status.state === "valid") return { kind: "valid", code: status.coupon.code };
  if (status.state === "ineligible") {
    return { kind: "ineligible", code: status.coupon.code, message: couponMessage(status.reason) };
  }
  return { kind: "none" };
};

const AppliedRow = ({ status }: { status: Exclude<CouponStatus, { state: "none" }> }) => {
  const valid = status.state === "valid";
  return (
    <div
      className={cn(
        "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-control px-3 text-sm",
        valid ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
      )}
    >
      {valid ? (
        <CheckIcon className="size-4 shrink-0" />
      ) : (
        <AlertCircleIcon className="size-4 shrink-0" />
      )}
      <span className="min-w-0 break-words">
        {valid
          ? `${status.coupon.code} · ${couponBenefit(status.coupon)}`
          : `${status.coupon.code} não vale para esta reserva`}
      </span>
    </div>
  );
};

type AppliedBlockProps = {
  status: Exclude<CouponStatus, { state: "none" }>;
  locked: boolean;
  removeRef: RefObject<HTMLButtonElement | null>;
  onRemove: () => void;
};

const AppliedBlock = ({ status, locked, removeRef, onRemove }: AppliedBlockProps) => (
  <fieldset className="flex min-w-0 flex-col gap-1.5">
    <legend className="mb-1.5 text-sm font-medium text-fg">Cupom de desconto</legend>
    <div className="flex items-start gap-2">
      <AppliedRow status={status} />
      <Button
        ref={removeRef}
        variant="ghost"
        size="sm"
        aria-disabled={locked || undefined}
        onClick={() => {
          if (!locked) onRemove();
        }}
      >
        Remover<span className="sr-only"> cupom</span>
      </Button>
    </div>
    {status.state === "ineligible" ? (
      <p className="text-sm text-fg">{couponMessage(status.reason)}</p>
    ) : null}
  </fieldset>
);

type InputBlockProps = {
  text: string;
  error: string | undefined;
  validating: boolean;
  locked: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
};

const InputBlock = ({ text, error, validating, locked, inputRef, onChange }: InputBlockProps) => (
  <Field label="Cupom de desconto" description="Letras e números, sem espaços." error={error}>
    {(control) => (
      <div className="flex items-start gap-2">
        <Input
          {...control}
          ref={inputRef}
          value={text}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-w-0 flex-1"
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          loading={validating}
          loadingText="Aplicando…"
          aria-disabled={locked || undefined}
          className="min-w-28 shrink-0"
        >
          Aplicar<span className="sr-only"> cupom</span>
        </Button>
      </div>
    )}
  </Field>
);

type FocusTarget = "input" | "remove" | null;

/**
 * Anúncio (região viva) e foco seguem as transições do cupom. Ajuste de estado durante a
 * renderização (padrão do React), sem efeito para "avisar" o pai.
 */
const useCouponFeedback = (
  view: CouponView,
  status: CouponStatus,
  setText: (text: string) => void,
) => {
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [announcement, setAnnouncement] = useState("");
  const [previous, setPrevious] = useState({ view, snapshot: snapshotOf(view, status) });

  const snapshot = snapshotOf(view, status);
  if (previous.view !== view || previous.snapshot.kind !== snapshot.kind) {
    const message = describeCouponTransition(previous.snapshot, snapshot);
    // O texto alterna um caractere invisível para a leitura se repetir quando o erro é o mesmo.
    if (message) setAnnouncement((now) => (now.endsWith("\u200b") ? message : `${message}\u200b`));
    if (view.kind === "applied" && previous.view.kind !== "applied") setFocusTarget("remove");
    if (view.kind === "error" && previous.view !== view) {
      setText(view.code);
      // Cupom restaurado que não vale mais: avisa, mas não rouba o foco de quem acabou de abrir a página.
      if (!view.restored) setFocusTarget("input");
    }
    setPrevious({ view, snapshot });
  }
  return { announcement, focusTarget, setFocusTarget };
};

const useFocusTarget = (
  target: FocusTarget,
  clear: () => void,
  inputRef: RefObject<HTMLInputElement | null>,
  removeRef: RefObject<HTMLButtonElement | null>,
) => {
  useEffect(() => {
    if (!target) return;
    (target === "input" ? inputRef : removeRef).current?.focus();
    clear();
  }, [target, clear, inputRef, removeRef]);
};

/**
 * Cupom de desconto (form próprio, fora do `<form>` principal). Recolhido por padrão; o campo
 * entra abaixo do toggle. Aplicado ocupa o lugar e a altura do campo e "Remover" recebe o foco.
 */
export const CouponForm = ({
  view,
  status,
  locked,
  onApply,
  onCancel,
  onRemove,
}: CouponFormProps) => {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);
  const feedback = useCouponFeedback(view, status, setText);
  useFocusTarget(feedback.focusTarget, () => feedback.setFocusTarget(null), inputRef, removeRef);

  const applied = status.state !== "none";
  const open = expanded || applied || view.kind !== "idle";
  const validating = view.kind === "validating";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (locked || validating) return;
    onApply(text);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls="coupon-panel"
        leftIcon={<TagIcon className="size-4" />}
        rightIcon={
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        }
        className="self-start"
        onClick={() => setExpanded((value) => !value)}
      >
        Tenho um cupom de desconto
      </Button>
      <div id="coupon-panel" hidden={!open}>
        {status.state !== "none" ? (
          <AppliedBlock
            status={status}
            locked={locked}
            removeRef={removeRef}
            onRemove={() => {
              onRemove();
              setText("");
              feedback.setFocusTarget("input");
            }}
          />
        ) : (
          <InputBlock
            text={text}
            error={view.kind === "error" ? view.message : undefined}
            validating={validating}
            locked={locked}
            inputRef={inputRef}
            onChange={(value) => {
              setText(value);
              onCancel();
            }}
          />
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {feedback.announcement}
      </p>
    </form>
  );
};
