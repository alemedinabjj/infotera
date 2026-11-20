"use client";

import { useLocale } from "@/shared/i18n/client";
import { comparisonMessages } from "../i18n/messages";

/** Dicionário da comparação no idioma da rota. */
export const useComparisonMessages = () => comparisonMessages.get(useLocale());
