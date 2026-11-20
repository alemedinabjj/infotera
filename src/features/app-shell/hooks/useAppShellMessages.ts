"use client";

import { useLocale } from "@/shared/i18n/client";
import { appShellMessages } from "../i18n/messages";

/** Dicionário do casco do app (idioma da rota). */
export const useAppShellMessages = () => appShellMessages.get(useLocale());
