import type { CancellationPolicy } from "@/shared/api/schemas";
import { cancellationDetails } from "@/shared/lib/cancellation";

export type TermsSection = { title: string; paragraphs: string[] };

type TermsInput = {
  policy: CancellationPolicy | null;
  checkInTime: string | null;
  checkOutTime: string | null;
};

/** Texto dos termos (dados, sem JSX). Cancelamento e horários vêm do hotel quando já carregou. */
export const termsSections = ({
  policy,
  checkInTime,
  checkOutTime,
}: TermsInput): TermsSection[] => [
  {
    title: "Reserva",
    paragraphs: [
      "A reserva vale para o hotel, o quarto, as datas e os hóspedes mostrados no resumo. O hotel pode pedir documento com foto de todos os hóspedes no check-in.",
    ],
  },
  {
    title: "Pagamento",
    paragraphs: [
      "Este é um ambiente de demonstração: o pagamento é simulado e nenhum valor é cobrado. O total inclui taxa de serviço de 10% e ISS de 5%.",
    ],
  },
  {
    title: "Cancelamento",
    paragraphs: policy
      ? cancellationDetails(policy).details
      : ["As regras de cancelamento são as da política do hotel mostrada no resumo."],
  },
  {
    title: "Horários",
    paragraphs: [
      `Check-in a partir de ${checkInTime ?? "15:00"} e check-out até ${checkOutTime ?? "12:00"}, no horário local do hotel.`,
    ],
  },
  {
    title: "Seus dados",
    paragraphs: [
      "Usamos nome, e-mail e telefone só para esta reserva. Os dados do cartão e o documento não são salvos nem enviados.",
    ],
  },
];
