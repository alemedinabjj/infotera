"use client";

import { useLocale } from "@/shared/i18n/client";
import { confirmationMessages } from "../i18n/messages";

/** Dicionário da confirmação no idioma da rota (ilhas cliente). */
export const useConfirmationMessages = () => confirmationMessages.get(useLocale());
