import type { Locale } from "@/shared/i18n/config";
import { CheckCircleIcon, FocusOnMount } from "@/shared/ui";
import { confirmationMessages } from "../i18n/messages";

export const CONFIRMATION_TITLE_ID = "reserva-confirmada";

type ConfirmationHeaderProps = {
  /** E-mail do titular; `null` omite a frase (reserva sem hóspedes). */
  email: string | null;
  bookedAt: string;
  locale: Locale;
};

/** Topo do recibo: ícone de sucesso, `h1` (recebe o foco ao carregar), e-mail e data da reserva. */
export const ConfirmationHeader = ({ email, bookedAt, locale }: ConfirmationHeaderProps) => {
  const t = confirmationMessages.get(locale).header;
  return (
    <header className="flex flex-col items-start gap-3">
      <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircleIcon className="size-6" />
      </span>
      <h1
        id={CONFIRMATION_TITLE_ID}
        tabIndex={-1}
        className="text-2xl font-bold text-fg lg:text-3xl"
      >
        {t.title}
      </h1>
      {email ? (
        <p className="max-w-prose text-base text-fg-muted">
          {t.sentTo} <span className="font-medium wrap-anywhere text-fg">{email}</span>.
        </p>
      ) : null}
      <p className="text-sm text-fg-subtle tabular-nums">{t.bookedAt(bookedAt)}</p>
      <FocusOnMount selector={`#${CONFIRMATION_TITLE_ID}`} />
    </header>
  );
};
