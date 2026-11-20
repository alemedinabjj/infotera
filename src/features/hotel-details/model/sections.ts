import type { Locale } from "@/shared/i18n/config";
import { hotelDetailsMessages } from "../i18n/messages";

/** Seções da página na ordem em que aparecem; `key` indexa o rótulo no dicionário. */
export const HOTEL_SECTIONS = [
  { id: "visao-geral", key: "overview" },
  { id: "quartos", key: "rooms" },
  { id: "localizacao", key: "location" },
  { id: "politicas", key: "policies" },
  { id: "avaliacoes", key: "reviews" },
  { id: "similares", key: "similar" },
] as const;

export type HotelSectionId = (typeof HOTEL_SECTIONS)[number]["id"];

type SectionKey = (typeof HOTEL_SECTIONS)[number]["key"];

/** Rótulo da seção no idioma (barra de âncoras e título). */
export const sectionLabel = (key: SectionKey, locale: Locale): string =>
  hotelDetailsMessages.get(locale).sections[key];

/** `id` do h3 do painel de datas: o formulário o usa como `labelledBy` (nome acessível do `<form>`). */
export const STAY_EDIT_TITLE_ID = "stay-edit-title";

/** `id` do h2 de uma seção (alvo de foco programático). */
export const sectionHeadingId = (id: HotelSectionId): string => `${id}-titulo`;
