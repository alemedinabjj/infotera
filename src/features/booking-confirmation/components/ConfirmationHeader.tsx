import { CheckCircleIcon, FocusOnMount } from "@/shared/ui";

export const CONFIRMATION_TITLE_ID = "reserva-confirmada";

type ConfirmationHeaderProps = {
  /** E-mail do titular; `null` omite a frase (reserva sem hóspedes). */
  email: string | null;
  bookedAt: string;
};

/** Topo do recibo: ícone de sucesso, `h1` (recebe o foco ao carregar), e-mail e data da reserva. */
export const ConfirmationHeader = ({ email, bookedAt }: ConfirmationHeaderProps) => (
  <header className="flex flex-col items-start gap-3">
    <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
      <CheckCircleIcon className="size-6" />
    </span>
    <h1 id={CONFIRMATION_TITLE_ID} tabIndex={-1} className="text-2xl font-bold text-fg lg:text-3xl">
      Reserva confirmada
    </h1>
    {email ? (
      <p className="max-w-prose text-base text-fg-muted">
        Enviamos os detalhes para <span className="font-medium wrap-anywhere text-fg">{email}</span>
        .
      </p>
    ) : null}
    <p className="text-sm text-fg-subtle tabular-nums">
      Reserva feita em {bookedAt} (horário de Brasília)
    </p>
    <FocusOnMount selector={`#${CONFIRMATION_TITLE_ID}`} />
  </header>
);
