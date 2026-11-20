"use client";

import { useLocale } from "@/shared/i18n/client";
import { hotelSearchMessages } from "../i18n/messages";

/** Dicionário da busca no idioma da rota (componentes cliente). */
export const useHotelSearchMessages = () => hotelSearchMessages.get(useLocale());
