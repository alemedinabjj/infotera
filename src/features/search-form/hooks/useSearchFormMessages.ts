"use client";

import { useLocale } from "@/shared/i18n/client";
import { searchFormMessages } from "../i18n/messages";

/** Dicionário do formulário de busca no idioma da rota. */
export const useSearchFormMessages = () => searchFormMessages.get(useLocale());
