import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { hotelDetailsMessages } from "../i18n/messages";

export type DatesFormLabels = { submit: string; submitLoading: string };

/** Textos do botão do formulário de datas (o formulário é montado por `app/`, fora da feature). */
export const datesFormLabels = (locale: Locale = DEFAULT_LOCALE): DatesFormLabels => {
  const { submit, submitLoading } = hotelDetailsMessages.get(locale).stayBar;
  return { submit, submitLoading };
};
