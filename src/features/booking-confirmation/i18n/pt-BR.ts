/** Microcopy da confirmação da reserva (pt-BR é a fonte). */
export const ptBR = {
  site: "Infotera Hotéis",
  titles: {
    found: "Reserva confirmada",
    notFound: "Reserva não encontrada",
    unreadable: "Reserva indisponível",
  },
  loading: "Carregando sua reserva…",
  slow: "Está demorando mais que o normal…",
  loadingStay: "Carregando dados do hotel…",
  retry: "Tentar de novo",
  retrying: "Tentando…",
  header: {
    title: "Reserva confirmada",
    sentTo: "Enviamos os detalhes para",
    bookedAt: (date: string) => `Reserva feita em ${date} (horário de Brasília)`,
  },
  number: {
    code: "Código",
    number: "Número da reserva",
    stay: "Estadia",
    total: "Total",
  },
  copy: {
    label: "Copiar número da reserva",
    copied: "Copiado",
    copiedAnnounce: "Número da reserva copiado.",
    failure: "Não foi possível copiar. Selecione o número e copie.",
  },
  stay: {
    title: "Sua estadia",
    checkIn: "Check-in",
    checkOut: "Check-out",
    room: "Quarto",
    viewHotel: "Ver página do hotel",
    cancellation: "Cancelamento",
    hotelFallback: (id: number) => `Hotel #${id}`,
    roomFallback: (id: number) => `Quarto #${id}`,
    hotelMissing: "Os dados deste hotel não estão mais disponíveis.",
    roomMissing: "Os dados deste quarto não estão mais disponíveis.",
    errorBoth: "Não foi possível carregar os dados do hotel e do quarto.",
    errorHotel: "Não foi possível carregar os dados do hotel.",
    errorRoom: "Não foi possível carregar os dados do quarto.",
    errorDescription: "Sua reserva está confirmada. Verifique sua conexão e tente de novo.",
    checkInFrom: (time: string) => `A partir de ${time}`,
    checkOutUntil: (time: string) => `Até ${time}`,
    askHotel: "Confirme com o hotel",
    unavailable: "Indisponível no momento",
  },
  guests: {
    title: "Hóspedes",
    holder: "titular",
    adult: "adulto",
    child: "criança",
  },
  payment: {
    title: "Pagamento",
    card: (last4: string) => `Cartão final ${last4}`,
    simulated: "Pagamento simulado: nenhum valor foi cobrado.",
  },
  nextSteps: {
    title: "Próximos passos",
    steps: [
      "Guarde o número da reserva. Ele também está no endereço desta página.",
      "No check-in, apresente um documento com foto de cada hóspede.",
      "Não compartilhe o link desta página: quem tiver o link vê os dados da reserva.",
      "Cancelar ou alterar a reserva não está disponível nesta demonstração.",
    ],
  },
  unreadable: {
    title: "Não foi possível exibir esta reserva",
    description:
      "Os dados desta reserva estão incompletos. Tentar de novo não resolve: faça uma nova busca.",
  },
  notFound: {
    title: "Reserva não encontrada",
    description:
      "Confira o número da reserva no link. Reservas de teste são apagadas quando o sistema reinicia.",
  },
};

export type ConfirmationMessages = typeof ptBR;
