"use client";

import { useLocale } from "../../i18n/client";
import { savedMessages } from "../i18n/messages";

/** Dicionário de favoritos/comparação no idioma da rota. */
export const useSavedMessages = () => savedMessages.get(useLocale());
