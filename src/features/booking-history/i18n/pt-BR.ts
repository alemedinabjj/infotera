/** Microcopy do histórico de reservas (pt-BR). */
export const ptBR = {
  metaTitle: "Minhas reservas | Infotera Hotéis",
  title: "Minhas reservas",
  intro: "Reservas confirmadas ou abertas neste navegador.",
  sharedComputer: "Em computador compartilhado, limpe o histórico ao terminar.",
  loading: "Carregando suas reservas…",
  slow: "Está demorando mais que o normal…",
  hotelUnavailable: "Hotel indisponível",
  thisBooking: "esta reserva",
  bookedOn: (date: string) => `Reservada em ${date}`,
  total: "total",
  viewBooking: "Ver reserva",
  viewBookingLabel: (hotel: string) => `Ver reserva em ${hotel}`,
  remove: "Remover do histórico",
  removeLabel: (hotel: string, dates: string) => `Remover do histórico: ${hotel}, ${dates}`,
  removed: "Reserva removida do histórico.",
  undo: "Desfazer",
  undoLabel: (hotel: string) => `Desfazer: ${hotel}`,
  failed: "Não foi possível carregar esta reserva.",
  unreadable: "Não foi possível exibir esta reserva.",
  retry: "Tentar de novo",
  retrying: "Tentando…",
  vanished: (count: number) =>
    count === 1
      ? "1 reserva não existe mais e saiu da lista. Reservas de demonstração são apagadas periodicamente."
      : `${count} reservas não existem mais e saíram da lista. Reservas de demonstração são apagadas periodicamente.`,
  offline: {
    title: "Você está sem internet.",
    description: "Suas reservas aparecem assim que a conexão voltar.",
  },
  empty: {
    title: "Nenhuma reserva neste navegador",
    description:
      "As reservas que você confirmar aparecem aqui. Elas ficam salvas só neste navegador.",
    action: "Buscar hotéis",
  },
  clear: {
    open: "Limpar histórico",
    title: "Limpar o histórico?",
    description: "As reservas continuam válidas. Elas só deixam de aparecer neste navegador.",
    cancel: "Cancelar",
    confirm: "Limpar histórico",
    done: "Histórico apagado.",
  },
  stay: {
    upcoming: "Próxima estadia",
    ongoing: "Em andamento",
    completed: "Concluída",
  },
};

export type HistoryMessages = typeof ptBR;
