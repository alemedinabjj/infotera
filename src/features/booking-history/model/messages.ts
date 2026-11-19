import { pluralize } from "@/shared/lib/format";

/** Microcopy do histórico de reservas (pt-BR). */
export const HISTORY_MESSAGES = {
  title: "Minhas reservas",
  intro: "Reservas confirmadas ou abertas neste navegador.",
  loading: "Carregando suas reservas…",
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
  vanished: (count: number) =>
    count === 1
      ? "1 reserva não existe mais e saiu da lista. Reservas de teste são apagadas quando o sistema reinicia."
      : `${count} reservas não existem mais e saíram da lista. Reservas de teste são apagadas quando o sistema reinicia.`,
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
    nights: (count: number) => pluralize(count, "noite", "noites"),
  },
} as const;
