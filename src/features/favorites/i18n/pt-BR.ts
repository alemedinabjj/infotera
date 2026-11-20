import { plural } from "@/shared/i18n/messages";

/** Microcopy da página de favoritos (pt-BR é a fonte). */
export const ptBR = {
  metaTitle: "Favoritos | Infotera Hotéis",
  title: "Favoritos",
  count: (count: number) =>
    `${count} ${plural(count, { one: "hotel salvo", other: "hotéis salvos" })}`,
  loading: "Carregando seus favoritos…",
  slow: "Está demorando mais que o normal…",
  empty: {
    title: "Nenhum hotel salvo ainda",
    description:
      "Toque no coração de um hotel para guardá-lo aqui. Seus favoritos ficam salvos neste navegador.",
    action: "Buscar hotéis",
  },
  error: {
    title: "Não foi possível carregar seus favoritos",
    description: "Verifique sua conexão e tente de novo.",
  },
  offline: {
    title: "Você está sem internet.",
    description: "Seus favoritos aparecem assim que a conexão voltar.",
  },
  priceUnavailable: "Preço indisponível no momento",
  removed: "Removido dos favoritos.",
  undo: "Desfazer",
  undoLabel: (name: string) => `Desfazer: ${name}`,
};

export type FavoritesMessages = typeof ptBR;
