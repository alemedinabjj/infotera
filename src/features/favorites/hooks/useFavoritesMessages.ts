"use client";

import { useLocale } from "@/shared/i18n/client";
import { favoritesMessages } from "../i18n/messages";

/** Dicionário dos favoritos no idioma da rota. */
export const useFavoritesMessages = () => favoritesMessages.get(useLocale());
