import { plural } from "@/shared/i18n/messages";
import { ptBRForm } from "./pt-BR.form";

const roomsAvailable = (count: number): string =>
  `${count} ${plural(count, { one: "quarto disponível", other: "quartos disponíveis" })}`;

/** Microcopy do checkout (pt-BR é a fonte). Contagens chegam já formatadas pelo `model/`. */
export const ptBR = {
  pageTitle: "Finalizar reserva",
  demoNotice: "Ambiente de demonstração — não use dados reais.",
  loading: "Carregando sua reserva…",
  retry: "Tentar de novo",
  trying: "Tentando…",
  back: "Voltar",
  edit: "Editar",
  viewRooms: "Ver quartos",
  newSearch: "Fazer nova busca",
  layout: { backToHotel: "Voltar ao hotel", heading: "Finalizar reserva" },
  steps: {
    listLabel: "Etapas da reserva",
    labels: { personal: "Hóspedes", payment: "Pagamento", review: "Revisão" },
    titles: { personal: "Dados dos hóspedes", payment: "Pagamento", review: "Revise e confirme" },
    counter: (step: number, total: number) => `Passo ${step} de ${total}`,
    done: (label: string) => `${label}, concluído`,
    primary: {
      personal: "Continuar para pagamento",
      payment: "Revisar reserva",
      review: "Confirmar reserva",
    },
    confirming: "Confirmando reserva…",
    calculating: "Calculando total…",
  },
  price: {
    totalPrefix: "Total ·",
    notLoaded: "Total não carregado — tente de novo",
    calculating: "Calculando o total…",
    slow: "Está demorando mais que o normal…",
  },
  summary: {
    title: "Sua reserva",
    loadErrorTitle: "Não foi possível carregar os dados da reserva.",
    loadErrorDescription: "Verifique sua conexão e tente de novo.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    from: (time: string) => `A partir de ${time}`,
    until: (time: string) => `Até ${time}`,
    changeDates: "Alterar datas e hóspedes",
    viewDetails: "Ver detalhes da reserva",
    and: "e",
    capacityOne: "Acomoda 1 hóspede por quarto",
    capacity: (max: string) => `Até ${max} por quarto`,
    rooms: "Quartos",
    decreaseRoom: "Remover quarto",
    increaseRoom: "Adicionar quarto",
  },
  blocked: {
    roomFallback: "O quarto",
    chooseDates: "Escolher novas datas",
    soldOut: {
      title: "Este quarto esgotou",
      description: (room: string, range: string) =>
        `Não há mais unidades de ${room} para ${range}. Escolha outro quarto no mesmo hotel.`,
    },
    insufficient: {
      title: (left: number) => `Só ${roomsAvailable(left)}`,
      description: (rooms: number, room: string) =>
        `Sua reserva pede ${rooms} quartos de ${room}. Volte ao hotel para escolher outro quarto ou reduzir a quantidade de quartos.`,
    },
    tooSmall: {
      title: "Este quarto não acomoda sua busca",
      description: (room: string, max: number, guests: number) =>
        `${room} acomoda até ${max} hóspedes por quarto e sua busca tem ${guests}. Escolha outro quarto ou altere os hóspedes.`,
    },
    staleDates: {
      title: "As datas desta reserva já passaram",
      description: (date: string) =>
        `O check-in era em ${date}. Escolha novas datas para ver preço e disponibilidade.`,
    },
  },
  roomCount: {
    available: (count: number) => `Só ${roomsAvailable(count)}.`,
    needsAdult: "Cada quarto precisa de pelo menos 1 adulto.",
    maxRooms: (max: number) => `Máximo de ${max} quartos por reserva.`,
    minRooms: (maxGuests: string, guests: string, rooms: string) =>
      `Este quarto acomoda até ${maxGuests}: ${guests} precisam de pelo menos ${rooms}.`,
    confirmFailed: "Não foi possível confirmar a disponibilidade. Tente de novo.",
    confirming: "Confirmando disponibilidade…",
  },
  coupon: {
    toggle: "Tenho um cupom de desconto",
    label: "Cupom de desconto",
    hint: "Letras e números, sem espaços.",
    apply: "Aplicar",
    applySr: " cupom",
    applying: "Aplicando…",
    remove: "Remover",
    removeSr: " cupom",
    notValidHere: (code: string) => `${code} não vale para esta reserva`,
    percentOff: (percent: number) => `${percent}% de desconto`,
    amountOff: (amount: string) => `${amount} de desconto`,
    format: "Use de 4 a 12 letras ou números, sem espaços.",
    notFound: "Cupom não encontrado. Confira o código.",
    expired: "Este cupom expirou.",
    minNights: (nights: number) => `Válido para estadias a partir de ${nights} noites.`,
    minSubtotal: (amount: string) => `Válido para reservas a partir de ${amount}.`,
    lookupFailed: "Não foi possível validar o cupom. Tente de novo.",
    restoredInvalid: (code: string) => `Seu cupom ${code} não vale mais para esta reserva.`,
    applied: (code: string) => `Cupom ${code} aplicado.`,
    appliedAgain: (code: string) => `Cupom ${code} aplicado de novo.`,
    stoppedWorking: (code: string, reason: string) =>
      `O cupom ${code} deixou de valer: ${reason} O total foi atualizado.`,
    removed: "Cupom removido.",
  },
  notices: {
    paymentWiped:
      "Por segurança, os dados do cartão não ficam salvos. Preencha o pagamento de novo.",
    restored: "Recuperamos os dados que você preencheu nesta sessão.",
    restoredChildren:
      "Recuperamos os dados que você preencheu nesta sessão. Confira a idade das crianças.",
  },
  errorSummary: {
    holder: "Titular",
    guest: (guest: number) => `Hóspede ${guest}`,
    age: "Idade",
    cardName: "Nome no cartão",
    terms: "Termos",
    cpf: "CPF",
    passport: "Passaporte",
  },
  submit: {
    transportToast: "Não foi possível confirmar a reserva.",
    nothingCharged: "Nada foi cobrado.",
    priceUnavailableTitle: "Não foi possível calcular o total",
    priceUnavailableBody: "Carregue o preço do quarto de novo para confirmar a reserva.",
    soldOutTitle: "Este quarto esgotou enquanto você reservava",
    soldOutBody: "Escolha outro quarto no mesmo hotel.",
    fewLeftTitle: (count: number) => `Só ${roomsAvailable(count)} agora`,
    fewLeftBody: "Diminua a quantidade de quartos no resumo da reserva ou escolha outro quarto.",
    failedTitle: "Não foi possível confirmar sua reserva",
    failedBody:
      "Nenhuma cobrança foi feita. Seus dados foram mantidos; tente de novo em instantes.",
    offlineTitle: "Você está sem conexão.",
    offlineBody: "Nada foi cobrado. Tente de novo quando a conexão voltar.",
    priceChangedTitle: "O total da reserva mudou",
    priceChangedBody: (previous: string, next: string) =>
      `Passou de ${previous} para ${next}. Confira o novo valor e confirme de novo.`,
    couponTitle: (code: string | null) => `O cupom ${code ?? "informado"} não vale mais`,
    couponBody: (total: string) =>
      `Removemos o desconto e o total agora é ${total}. Confira e confirme de novo.`,
    invalidTitle: "Confira os dados da reserva",
    invalidField: "Confira este dado e tente de novo.",
  },
  ...ptBRForm,
};

export type CheckoutMessages = typeof ptBR;
