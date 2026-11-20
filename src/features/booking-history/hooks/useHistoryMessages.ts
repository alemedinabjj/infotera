"use client";

import { useLocale } from "@/shared/i18n/client";
import { historyMessages } from "../i18n/messages";

/** Dicionário do histórico de reservas no idioma da rota. */
export const useHistoryMessages = () => historyMessages.get(useLocale());
