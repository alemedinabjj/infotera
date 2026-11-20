/** Dicionário de hotel-search (pt-BR é a fonte). Por ora só o mapa; o resto entra na tradução da feature. */
export const ptBR = {
  map: {
    show: "Mostrar mapa",
    hide: "Ocultar mapa",
    region: "Mapa dos resultados",
    skip: "Pular o mapa",
    loading: "Carregando mapa…",
    loadError: "Não foi possível carregar o mapa.",
    retry: "Tentar de novo",
    offline: "O mapa precisa de internet. A lista continua disponível.",
    keyboardHint: "Setas movem o mapa; + e − mudam o zoom; Tab percorre os hotéis.",
    soldOut: "Esgotado",
    markerLabel: ({ name, price }: { name: string; price: string }) =>
      `${name}, ${price} por noite`,
    soldOutLabel: ({ name }: { name: string }) => `${name}, esgotado`,
    popupRating: ({ rating }: { rating: string }) => `Nota ${rating}`,
    popupPerNight: ({ price }: { price: string }) => `${price} por noite`,
    viewHotel: "Ver hotel",
    showInList: "Mostrar na lista",
  },
};

export type HotelSearchMessages = typeof ptBR;
