"use client";

import { useLocale } from "@/shared/i18n/client";
import { checkoutMessages } from "../i18n/messages";

/** Dicionário do checkout no idioma da rota. */
export const useCheckoutMessages = () => checkoutMessages.get(useLocale());
