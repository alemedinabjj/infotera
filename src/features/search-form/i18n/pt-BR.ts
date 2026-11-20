export const ptBR = {
  form: {
    title: "Buscar hotéis",
    destination: "Destino",
    placeholder: "Cidade, praia ou ilha",
    clearDestination: "Limpar destino",
    searching: "Buscando…",
    submit: "Buscar hotéis",
    recentCleared: "Buscas recentes apagadas.",
    stayDates: "Datas da estadia",
    checkIn: "Check-in",
    checkOut: "Check-out",
    pickDates: "Escolha as datas para ver o total de noites.",
    guestsTitle: "Quartos e hóspedes",
    adults: {
      label: "Adultos",
      description: "A partir de 18 anos",
      decrease: "Diminuir adultos",
      increase: "Aumentar adultos",
    },
    children: {
      label: "Crianças",
      description: "Até 17 anos",
      decrease: "Diminuir crianças",
      increase: "Aumentar crianças",
    },
    rooms: { label: "Quartos", decrease: "Diminuir quartos", increase: "Aumentar quartos" },
    guestsSummary: "Hóspedes",
    summaryDateRange: ({ nights, from, to }: { nights: string; from: string; to: string }) =>
      `${nights} · ${from} a ${to}`,
  },
  suggestions: {
    listLabel: "Destinos sugeridos",
    loading: "Buscando destinos…",
    retry: "Tentar de novo",
    retrying: "Tentando…",
    none: ({ query }: { query: string }) => `Nenhum destino encontrado para "${query}"`,
    checkSpelling: "Confira a grafia ou tente o nome da cidade.",
    oneFound: "1 destino encontrado",
    manyFound: ({ count }: { count: number }) => `${count} destinos encontrados`,
    loadError: "Não foi possível carregar os destinos.",
    offline: "Você está sem internet. Assim que a conexão voltar, tente de novo.",
    types: { city: "Cidade", beach: "Praia", island: "Ilha", nature: "Natureza" },
  },
  recent: {
    title: "Buscas recentes",
    hint: "Preenche o formulário com esta busca.",
    expired: "Datas passadas",
    expiredLabel: ({ label }: { label: string }) => `${label}, datas passadas`,
    clear: "Limpar buscas recentes",
  },
  notices: {
    checkOutAdjusted: ({ date }: { date: string }) => `Check‑out ajustado para ${date}.`,
    expiredDates: "As datas dessa busca já passaram. Escolha novas datas.",
    restored: ({ destination }: { destination: string }) =>
      `Busca preenchida: ${destination}. Confira e busque hotéis.`,
  },
  validation: {
    checkInRequired: "Escolha a data de check‑in.",
    checkOutRequired: "Escolha a data de check‑out.",
    checkInPast: "Escolha uma data a partir de hoje.",
  },
  guestHints: {
    capacityMore: ({ max }: { max: number }) =>
      `Até ${max} hóspedes por quarto. Adicione um quarto para incluir mais pessoas.`,
    capacityMax: ({ max, rooms }: { max: number; rooms: number }) =>
      `Até ${max} hóspedes por quarto, em no máximo ${rooms} quartos.`,
    maxAdults: ({ max }: { max: number }) => `Máximo de ${max} adultos por busca.`,
    maxChildren: ({ max }: { max: number }) => `Máximo de ${max} crianças por busca.`,
    maxRooms: ({ max }: { max: number }) => `Máximo de ${max} quartos por busca.`,
    adultPerRoom: "Cada quarto precisa de pelo menos 1 adulto.",
    addAdultForRooms:
      "Cada quarto precisa de pelo menos 1 adulto. Adicione um adulto para incluir mais quartos.",
    needRooms: ({ guests, min }: { guests: number; min: number }) =>
      `Com ${guests} hóspedes, são necessários pelo menos ${min} quartos.`,
  },
};

export type SearchFormMessages = typeof ptBR;
