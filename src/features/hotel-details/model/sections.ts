export type HotelSection = { id: string; label: string };

/** Seções da página na ordem em que aparecem; a barra de âncoras usa os mesmos rótulos. */
export const HOTEL_SECTIONS = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "quartos", label: "Quartos" },
  { id: "localizacao", label: "Localização" },
  { id: "politicas", label: "Políticas" },
  { id: "avaliacoes", label: "Avaliações" },
  { id: "similares", label: "Similares" },
] as const satisfies readonly HotelSection[];

export type HotelSectionId = (typeof HOTEL_SECTIONS)[number]["id"];

/** `id` do h3 do painel de datas: o formulário o usa como `labelledBy` (nome acessível do `<form>`). */
export const STAY_EDIT_TITLE_ID = "stay-edit-title";

/** `id` do h2 de uma seção (alvo de foco programático). */
export const sectionHeadingId = (id: HotelSectionId): string => `${id}-titulo`;
