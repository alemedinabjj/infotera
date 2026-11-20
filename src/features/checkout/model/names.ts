import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { z } from "@/shared/lib/zod";
import { checkoutMessages } from "../i18n/messages";

const NAME_CHARS = /^[\p{L}][\p{L}\s'’-]*$/u;
const LETTER = /\p{L}/gu;

/** Nome ou sobrenome: letras (com acento), espaços, hífen e apóstrofo; 2–60 caracteres. */
export const personNameSchema = (emptyMessage: string, locale: Locale = DEFAULT_LOCALE) => {
  const t = checkoutMessages.get(locale).validation;
  return z
    .string()
    .trim()
    .min(1, emptyMessage)
    .regex(NAME_CHARS, t.nameChars)
    .refine((value) => (value.match(LETTER) ?? []).length >= 2, t.nameMin)
    .max(60, t.nameMax);
};
