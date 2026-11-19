"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { revealBlock } from "@/shared/lib/scroll";
import type { CheckoutFieldPath, CheckoutValues } from "../model/checkout.schema";

/** Atributo que marca o contêiner de um campo (rótulo, controle, descrição e erro). */
export const REVEAL_BLOCK_ATTRIBUTE = "data-reveal-block";

/** Contêiner do campo em foco (ou o próprio elemento, se o campo não tiver contêiner marcado). */
const blockOf = (element: Element | null): Element | null =>
  element?.closest(`[${REVEAL_BLOCK_ATTRIBUTE}]`) ?? element;

/**
 * Onde o foco cai no checkout: no título do passo ao trocar de passo (revela o bloco "Passo N de 3"
 * + título) e no 1º campo inválido depois de uma tentativa (revela o contêiner do campo inteiro,
 * acima da barra fixa e abaixo do header). O campo vence o resumo de erros, que se revela ao montar.
 */
export const useCheckoutFocus = (
  form: UseFormReturn<CheckoutValues>,
  firstInvalidId: CheckoutFieldPath | undefined,
) => {
  const [headingTick, setHeadingTick] = useState(0);
  const [fieldFocus, setFieldFocus] = useState<{ path: CheckoutFieldPath; tick: number } | null>(
    null,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const wantsFocus = useRef(false);

  useEffect(() => {
    if (headingTick === 0) return;
    headingRef.current?.focus({ preventScroll: true });
    revealBlock(titleRef.current);
  }, [headingTick]);

  useEffect(() => {
    if (fieldFocus) form.setFocus(fieldFocus.path);
  }, [fieldFocus, form]);

  useEffect(() => {
    if (!wantsFocus.current || !firstInvalidId) return;
    wantsFocus.current = false;
    form.setFocus(firstInvalidId);
    // O resumo acabou de rolar a página (e em desenvolvimento o StrictMode reexecuta o efeito dele):
    // adiado um frame, traz o campo inteiro de volta à vista.
    requestAnimationFrame(() => revealBlock(blockOf(document.activeElement)));
  });

  return {
    headingRef,
    titleRef,
    focusHeading: () => setHeadingTick((tick) => tick + 1),
    /** O próximo render com erros foca o 1º campo inválido. */
    requestFieldFocus: () => {
      wantsFocus.current = true;
    },
    focusField: (path: CheckoutFieldPath) =>
      setFieldFocus((current) => ({ path, tick: (current?.tick ?? 0) + 1 })),
  };
};
