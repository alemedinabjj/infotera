"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { roomQueryOptions } from "@/shared/api/queries";
import type { Room } from "@/shared/api/schemas";
import { nightsBetween, todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { couponQueryOptions } from "../api/coupons";
import {
  COUPON_FORMAT_MESSAGE,
  type Coupon,
  type CouponRejection,
  couponCodeSchema,
  couponMessage,
  evaluateCoupon,
  normalizeCouponCode,
} from "../model/coupons";
import { calculatePrice } from "../model/price";

/** Aviso quando o cupom guardado no rascunho deixou de valer (outra data, outro quarto, expirou). */
export const restoredCouponMessage = (code: string): string =>
  `Seu cupom ${code} não vale mais para esta reserva.`;

export const COUPON_LOOKUP_FAILED = "Não foi possível validar o cupom. Tente de novo.";

export type CouponView =
  | { kind: "idle" }
  | { kind: "validating"; code: string }
  | { kind: "applied"; coupon: Coupon }
  | { kind: "error"; code: string; message: string; restored?: true };

/** Resultado de aplicar `coupon` (já consultado) a esta reserva. */
const settle = (
  code: string,
  coupon: Coupon | null,
  room: Room,
  criteria: SearchCriteria,
  restored = false,
): CouponView => {
  const nights = nightsBetween(criteria.checkIn, criteria.checkOut);
  const subtotalCents = calculatePrice({
    pricePerNight: room.pricePerNight,
    nights,
    rooms: criteria.rooms,
  }).subtotalCents;
  const result = evaluateCoupon(coupon, { today: todayISO(), nights, subtotalCents });
  if (result.ok && coupon) return { kind: "applied", coupon };
  const reason: CouponRejection = result.ok ? { kind: "not-found" } : result.reason;
  if (restored)
    return { kind: "error", code, message: restoredCouponMessage(code), restored: true };
  return { kind: "error", code, message: couponMessage(reason) };
};

/**
 * Cupom: formato validado na hora (Zod, sem "chamar o servidor"), consulta simulada com cache por
 * código (reaplicar é instantâneo, sem "Aplicando…") e cancelamento quando o código muda. A
 * elegibilidade é reavaliada por `buildQuote` quando os quartos mudam.
 */
export const useCoupon = (
  roomId: number,
  criteria: SearchCriteria,
  restoredCode: string | null,
) => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<CouponView>(
    restoredCode ? { kind: "validating", code: restoredCode } : { kind: "idle" },
  );
  const token = useRef(0);
  // Os critérios mudam enquanto o cupom valida (quartos otimistas): a consulta assenta com os atuais.
  const latestCriteria = useRef(criteria);
  useEffect(() => {
    latestCriteria.current = criteria;
  });
  const roomKey = roomQueryOptions(roomId).queryKey;

  const lookup = async (code: string, restored = false): Promise<void> => {
    const mine = ++token.current;
    setView({ kind: "validating", code });
    try {
      const coupon = await queryClient.fetchQuery(couponQueryOptions(code));
      const room = await queryClient.ensureQueryData(roomQueryOptions(roomId));
      if (mine === token.current)
        setView(settle(code, coupon, room, latestCriteria.current, restored));
    } catch {
      if (mine === token.current) {
        setView({ kind: "error", code, message: COUPON_LOOKUP_FAILED });
      }
    }
  };

  // Rascunho com cupom: revalida (mesma consulta e regras) antes de aplicar; se não vale, avisa.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só na montagem
  useEffect(() => {
    if (!restoredCode) return;
    const code = normalizeCouponCode(restoredCode);
    if (couponCodeSchema.safeParse(code).success) void lookup(code, true);
    else setView({ kind: "error", code, message: restoredCouponMessage(code), restored: true });
  }, []);

  const apply = (raw: string): void => {
    const code = normalizeCouponCode(raw);
    if (!couponCodeSchema.safeParse(code).success) {
      token.current += 1;
      setView({ kind: "error", code: raw, message: COUPON_FORMAT_MESSAGE });
      return;
    }
    const cachedCoupon = queryClient.getQueryData(couponQueryOptions(code).queryKey);
    const cachedRoom = queryClient.getQueryData(roomKey);
    if (cachedCoupon !== undefined && cachedRoom) {
      token.current += 1;
      setView(settle(code, cachedCoupon, cachedRoom, criteria)); // cache: sem "Aplicando…"
      return;
    }
    void lookup(code);
  };

  /** Trocar o texto cancela a consulta em andamento. */
  const cancel = (): void => {
    if (view.kind !== "validating") return;
    token.current += 1;
    void queryClient.cancelQueries({ queryKey: couponQueryOptions(view.code).queryKey });
    setView({ kind: "idle" });
  };

  const remove = (): void => {
    token.current += 1;
    setView({ kind: "idle" });
  };

  /** O servidor recusou o cupom (`coupon-invalid`): sai do cálculo e o motivo vai para o campo. */
  const reject = (code: string, reason: CouponRejection): void => {
    token.current += 1;
    setView({ kind: "error", code, message: couponMessage(reason) });
  };

  return {
    view,
    coupon: view.kind === "applied" ? view.coupon : null,
    /** Código a guardar no rascunho: aplicado ou em validação. */
    savedCode:
      view.kind === "applied" ? view.coupon.code : view.kind === "validating" ? view.code : null,
    apply,
    cancel,
    remove,
    reject,
  };
};
