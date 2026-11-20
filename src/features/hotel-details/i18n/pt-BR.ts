/** Dicionário de hotel-details (pt-BR é a fonte). */
export const ptBR = {
  sections: {
    overview: "Visão geral",
    rooms: "Quartos",
    location: "Localização",
    policies: "Políticas",
    reviews: "Avaliações",
    similar: "Similares",
    navLabel: "Seções da página",
    similarIn: ({ destination }: { destination: string }) => `Hotéis similares em ${destination}`,
  },
  meta: {
    notFound: "Hotel não encontrado",
    generic: "Hotel",
  },
  breadcrumb: {
    label: "Você está aqui",
    home: "Início",
    hotelsIn: ({ destination }: { destination: string }) => `Hotéis em ${destination}`,
  },
  notFound: {
    title: "Hotel não encontrado",
    description: "O link pode estar errado ou o hotel não está mais disponível.",
  },
  loading: {
    hotel: "Carregando hotel…",
    slow: "Está demorando mais que o normal…",
    rooms: "Carregando quartos…",
    reviews: "Carregando avaliações…",
    similar: "Carregando hotéis similares…",
  },
  header: {
    featured: "Destaque",
    viewRooms: "Ver quartos",
    copyLink: "Copiar link",
  },
  fromPrice: {
    noRooms: "Sem quartos para reserva no momento.",
    unavailable: "Preços indisponíveis no momento.",
  },
  overview: { amenities: "Comodidades" },
  policies: {
    checkIn: "Check-in",
    checkOut: "Check-out",
    from: ({ time }: { time: string }) => `A partir de ${time}`,
    until: ({ time }: { time: string }) => `Até ${time}`,
    cancellation: "Cancelamento",
    rules: "Ver regras de cancelamento",
  },
  location: {
    /** Nome da região do mapa (o endereço é conteúdo da API, em português). */
    mapRegion: ({ address }: { address: string }) => `Mapa: ${address}`,
    openOsm: "Abrir no OpenStreetMap",
    newTab: "(abre em nova aba)",
  },
  stayBar: {
    change: "Alterar datas e hóspedes",
    stay: "Sua estadia",
    missingTitle: "Escolha as datas para reservar",
    missingBody:
      "Com as datas e os hóspedes, mostramos o preço total e a disponibilidade de cada quarto.",
    pastTitle: "As datas desta busca já passaram",
    pastBody:
      "Preços e disponibilidade podem ter mudado. Use “Alterar datas e hóspedes” para escolher novas datas.",
    submit: "Ver disponibilidade",
    submitLoading: "Atualizando…",
  },
  gallery: {
    seeAll: ({ count }: { count: number }) => `Ver todas as fotos (${count})`,
    extra: ({ count }: { count: number }) => `+${count} ${count === 1 ? "foto" : "fotos"}`,
    photoAlt: ({ name, index, total }: { name: string; index: number; total: number }) =>
      `${name}, foto ${index} de ${total}`,
    openPhoto: ({ index, total }: { index: number; total: number }) =>
      `Abrir foto ${index} de ${total}`,
    counter: ({ index, total }: { index: number; total: number }) => `Foto ${index} de ${total}`,
    lightboxTitle: ({ name }: { name: string }) => `Fotos de ${name}`,
    previous: "Foto anterior",
    next: "Próxima foto",
    failed: "Não foi possível carregar esta foto.",
    loading: "Carregando foto…",
    modalLoadingTitle: "Fotos do hotel",
    close: "Fechar",
    openError: "Não foi possível abrir a foto",
    openErrorBody: "Verifique sua conexão e tente de novo.",
    offlineTitle: "Você está sem internet",
    offlineBody: "A foto abre assim que a conexão voltar.",
  },
  build: {
    waiting: ({ attempt, total }: { attempt: number; total: number }) =>
      `Aguardando a mock-api (tentativa ${attempt}/${total})…`,
    unreachable: ({ url }: { url: string }) =>
      `Não foi possível listar os hotéis para o build: a mock-api em ${url} não respondeu. Suba a API (cd mock-api && npm run server) ou confira NEXT_PUBLIC_API_URL.`,
    noHotels: "A API não listou nenhum hotel: não há o que pré-renderizar.",
  },
  photoPage: {
    back: "Voltar para o hotel",
    metaTitle: ({ index, total, hotel }: { index: number; total: number; hotel: string }) =>
      `Foto ${index} de ${total} · ${hotel} | Infotera Hotéis`,
    metaNotFound: "Foto não encontrada | Infotera Hotéis",
    notFoundTitle: "Foto não encontrada",
    notFoundBody: ({ hotel }: { hotel: string }) =>
      `Este endereço não corresponde a nenhuma foto de ${hotel}.`,
    viewHotel: "Ver o hotel",
  },
  rooms: {
    emptyTitle: "Nenhum quarto para reserva",
    emptyBody:
      "Este hotel ainda não tem quartos cadastrados. Veja hotéis parecidos na mesma região.",
    seeSimilar: "Ver hotéis similares",
    loadError: "Não foi possível carregar os quartos.",
    types: ({ count }: { count: number }) => `${count} ${count === 1 ? "tipo" : "tipos"} de quarto`,
    squareMeters: ({ size }: { size: string }) => `${size} metros quadrados`,
    size: ({ size }: { size: string }) => `${size} m²`,
    capacityOne: "1 hóspede",
    capacityUpTo: ({ count }: { count: number }) => `Até ${count} hóspedes`,
    moreAmenities: ({ count }: { count: number }) =>
      `+${count} ${count === 1 ? "comodidade" : "comodidades"}`,
    select: "Selecionar quarto",
    selecting: "Selecionando…",
    pickDates: "Escolher datas",
    amenities: {
      ocean_view: "Vista para o mar",
      city_view: "Vista para a cidade",
      garden_view: "Vista para o jardim",
      balcony: "Varanda",
      terrace: "Terraço",
      bathtub: "Banheira",
      minibar: "Frigobar",
      safe: "Cofre",
      aircon: "Ar-condicionado",
      desk: "Mesa de trabalho",
      kitchen: "Cozinha",
      living_room: "Sala de estar",
      sound_system: "Sistema de som",
      butler: "Mordomo",
      pool_access: "Acesso à piscina",
      garden: "Jardim privativo",
      lounge_access: "Acesso ao lounge",
    },
  },
  selectability: {
    soldOutDates: "Sem quartos disponíveis para estas datas.",
    soldOutNow: "Sem quartos disponíveis no momento.",
    fitsOne: "Acomoda 1 hóspede.",
    fitsUpTo: ({ count }: { count: number }) => `Acomoda até ${count} hóspedes.`,
    adviceOther: "Escolha outro quarto ou altere os hóspedes.",
    adviceGuests: "Altere os hóspedes.",
    tooSmall: ({
      capacity,
      perRoom,
      advice,
    }: {
      capacity: string;
      perRoom: number;
      advice: string;
    }) => `${capacity} Sua busca tem ${perRoom} por quarto. ${advice}`,
    asks: ({ count }: { count: number }) =>
      `Sua busca pede ${count} ${count === 1 ? "quarto" : "quartos"}.`,
    reduceOther: "Diminua a quantidade de quartos ou escolha outro tipo.",
    reduce: "Diminua a quantidade de quartos.",
    pastDates: "As datas desta busca já passaram.",
    onlyOne: "Só 1 disponível",
    onlyMany: ({ count }: { count: number }) => `Só ${count} disponíveis`,
    scarce: ({ count }: { count: number }) =>
      `Apenas ${count} ${count === 1 ? "quarto" : "quartos"}!`,
  },
  comparison: {
    title: ({ count }: { count: number }) => `Comparar quartos (${count})`,
    caption: "Comparar quartos",
    corner: "Característica",
    onlyDifferences: "Mostrar só diferenças",
    legend: "Linhas marcadas mudam entre os quartos.",
    scrollHint: "Arraste para o lado para ver todos.",
    differs: ", diferente entre os quartos",
    empty: "Os quartos têm as mesmas características.",
    announceAll: ({ total }: { total: number }) => `Mostrando todas as ${total} características`,
    announceSome: ({ visible, total }: { visible: number; total: number }) =>
      `Mostrando ${visible} de ${total} características`,
    price: "Preço por noite",
    size: "Tamanho",
    guests: "Hóspedes",
    guestsUpTo: ({ count }: { count: number }) => `Até ${count}`,
    beds: "Camas",
    availability: "Disponibilidade",
    available: ({ count }: { count: number }) =>
      count === 1 ? "1 disponível" : `${count} disponíveis`,
  },
  reviews: {
    offlineTitle: "Você está sem internet.",
    offlineBody: "As avaliações aparecem assim que a conexão voltar.",
    emptyTitle: "Ainda sem comentários",
    emptyBody: "Este hotel ainda não recebeu comentários de hóspedes.",
    updating: "Atualizando avaliações…",
    loadError: "Não foi possível carregar as avaliações.",
    verified: "Hóspede verificado",
    one: "1 comentário",
    many: ({ count }: { count: number }) => `${count} comentários`,
    range: ({ from, to, total }: { from: number; to: number; total: number }) =>
      `Mostrando ${from}–${to} de ${total} comentários`,
    helpfulOne: "1 pessoa achou útil",
    helpfulMany: ({ count }: { count: string }) => `${count} pessoas acharam útil`,
  },
  similar: {
    failed: "Não foi possível carregar hotéis similares.",
    seeIn: ({ destination }: { destination: string }) => `Ver hotéis em ${destination}`,
    none: ({ destination }: { destination: string }) => `Nenhum outro hotel em ${destination}.`,
  },
  soldOut: {
    titleDates: "Este hotel está esgotado nestas datas",
    titleNow: "Este hotel está sem quartos disponíveis no momento",
    seeSimilar: "Ver hotéis similares",
    body: "Veja opções parecidas na mesma região.",
  },
  errors: {
    sectionRetry: "Verifique sua conexão e tente de novo.",
  },
};

export type HotelDetailsMessages = typeof ptBR;
