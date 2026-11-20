import type { CancellationPolicy } from "@/shared/api/schemas";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { cancellationDetails } from "@/shared/lib/cancellation";
import { checkoutMessages } from "../i18n/messages";

export type TermsSection = { title: string; paragraphs: string[] };

type TermsInput = {
  policy: CancellationPolicy | null;
  checkInTime: string | null;
  checkOutTime: string | null;
};

/** Texto dos termos (dados, sem JSX). Cancelamento e horários vêm do hotel quando já carregou. */
export const termsSections = (
  { policy, checkInTime, checkOutTime }: TermsInput,
  locale: Locale = DEFAULT_LOCALE,
): TermsSection[] => {
  const t = checkoutMessages.get(locale).terms;
  return [
    { title: t.booking.title, paragraphs: [t.booking.text] },
    { title: t.payment.title, paragraphs: [t.payment.text] },
    {
      title: t.cancellation.title,
      paragraphs: policy ? cancellationDetails(policy, locale).details : [t.cancellation.fallback],
    },
    {
      title: t.schedule.title,
      paragraphs: [t.schedule.text(checkInTime ?? "15:00", checkOutTime ?? "12:00")],
    },
    { title: t.data.title, paragraphs: [t.data.text] },
  ];
};
