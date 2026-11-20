import { pluralize } from "@/shared/lib/format";

/** Microcopy da página de favoritos (pt-BR). */
export const FAVORITES_MESSAGES = {
  title: "Favoritos",
  count: (count: number) => `${pluralize(count, "hotel salvo", "hotéis salvos")}`,
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
} as const;
