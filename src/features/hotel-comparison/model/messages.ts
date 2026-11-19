import { pluralize } from "@/shared/lib/format";

/** Microcopy da comparação (pt-BR). */
export const COMPARISON_MESSAGES = {
  title: "Comparar hotéis",
  legend: "Linhas marcadas mudam entre os hotéis.",
  onlyDifferences: "Mostrar só diferenças",
  scrollHint: "Arraste para o lado para ver todos.",
  cornerLabel: "Característica",
  differs: ", diferente entre os hotéis",
  noDifferences: "Os hotéis têm as mesmas características.",
  announce: (visible: number, total: number) => `Mostrando ${visible} de ${total} linhas.`,
  caption: (names: readonly string[]) => {
    const head = names.slice(0, -1).join(", ");
    const last = names.at(-1) ?? "";
    return `Comparação entre ${head ? `${head} e ${last}` : last}`;
  },
  remove: "Remover",
  removeFor: (name: string) => ` ${name} da comparação`,
  loading: "Carregando a comparação…",
  slow: "Está demorando mais que o normal…",
  badges: { cheapest: "Menor preço", bestRated: "Melhor nota" },
  needTwo: {
    title: "Escolha pelo menos 2 hotéis para comparar",
    description: "Adicione hotéis pela busca ou pelos favoritos.",
    search: (destination: string) => `Buscar hotéis em ${destination}`,
    searchAny: "Buscar hotéis",
    favorites: "Ver favoritos",
  },
  empty: {
    title: "Nenhum hotel para comparar",
    description: 'Marque "Comparar" em até 3 hotéis na busca ou nos favoritos.',
    search: "Buscar hotéis",
    tray: (count: number) => `Comparar os ${count} hotéis selecionados`,
  },
  notFound: (count: number) =>
    count === 1
      ? "1 hotel não foi encontrado e saiu da comparação."
      : `${count} hotéis não foram encontrados e saíram da comparação.`,
  error: {
    title: "Não foi possível carregar a comparação",
    description: "Verifique sua conexão e tente de novo.",
  },
  offline: {
    title: "Você está sem internet.",
    description: "A comparação aparece assim que a conexão voltar.",
  },
  rows: {
    price: "Preço por noite",
    priceFrom: (price: string) => `a partir de ${price}`,
    soldOutNote: "Esgotado",
    rating: "Avaliação",
    reviews: "Avaliações",
    type: "Tipo",
    destination: "Destino",
    cancellation: "Cancelamento",
    checkIn: "Check-in",
    checkInValue: (time: string) => `A partir de ${time}`,
    checkOut: "Check-out",
    checkOutValue: (time: string) => `Até ${time}`,
    availability: "Disponibilidade",
    soldOut: "Esgotado",
    scarce: (count: number) => `Apenas ${pluralize(count, "quarto", "quartos")}!`,
    available: "Disponível",
    roomTypes: "Tipos de quarto",
    roomTypesValue: (count: number) => pluralize(count, "tipo", "tipos"),
    guests: "Hóspedes por quarto",
    guestsValue: (max: number) => `Até ${max}`,
    unknown: "—",
  },
} as const;
