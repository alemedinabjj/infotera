"use client";

import { useLocale } from "@/shared/i18n/client";
import { hotelDetailsMessages } from "../i18n/messages";

/** Dicionário da página do hotel no idioma da rota (componentes cliente). */
export const useHotelDetailsMessages = () => hotelDetailsMessages.get(useLocale());
