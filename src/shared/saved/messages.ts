import { pluralize } from "../lib/format";
import { MAX_COMPARE } from "./model/comparison";

/** Microcopy de favoritos, comparação, bandeja e header (pt-BR). Nenhuma string de UI solta no JSX. */
export const SAVED_MESSAGES = {
  favorite: {
    label: (name: string) => `Salvar nos favoritos: ${name}`,
    added: "Hotel salvo nos favoritos.",
    removed: "Hotel removido dos favoritos.",
    limit: "Você já tem 100 hotéis nos favoritos. Remova algum para salvar outro.",
    viewAction: "Ver favoritos",
    undoAction: "Desfazer",
  },
  compare: {
    label: "Comparar",
    ariaLabel: (name: string) => `Comparar: ${name}`,
    limitHint: `Limite de ${MAX_COMPARE} hotéis na comparação.`,
    limitToast: `Você já está comparando ${MAX_COMPARE} hotéis. Remova um para adicionar outro.`,
    viewAction: "Ver comparação",
    entered: (name: string, count: number) =>
      `${name} entrou na comparação. ${count} de ${MAX_COMPARE}.`,
    left: (name: string) => `${name} saiu da comparação.`,
    needTwo: "Escolha pelo menos 2 hotéis para comparar.",
    cleared: "Comparação limpa.",
    undoAction: "Desfazer",
  },
  tray: {
    title: "Comparação de hotéis",
    counter: (count: number) =>
      count === 1
        ? `1 de ${MAX_COMPARE} hotéis · escolha mais 1`
        : `${count} de ${MAX_COMPARE} hotéis`,
    action: "Comparar",
    actionCount: (count: number) => `${count} hotéis`,
    actionLabel: (count: number) => `Comparar ${count} hotéis`,
    clearLabel: "Limpar comparação",
    clear: "Limpar",
    removeChip: (name: string) => `Remover ${name} da comparação`,
  },
  nav: {
    label: "Atalhos",
    favorites: "Favoritos",
    myBookings: "Minhas reservas",
    favoritesLabel: (count: number) =>
      count === 0 ? "Favoritos, nenhum hotel" : `Favoritos, ${pluralize(count, "hotel", "hotéis")}`,
  },
} as const;
