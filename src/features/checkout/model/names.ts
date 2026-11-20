import { z } from "@/shared/lib/zod";

const NAME_CHARS = /^[\p{L}][\p{L}\s'’-]*$/u;
const LETTER = /\p{L}/gu;

/** Nome ou sobrenome: letras (com acento), espaços, hífen e apóstrofo; 2–60 caracteres. */
export const personNameSchema = (emptyMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .regex(NAME_CHARS, "Use só letras, espaços, hífen ou apóstrofo.")
    .refine((value) => (value.match(LETTER) ?? []).length >= 2, "Use pelo menos 2 letras.")
    .max(60, "Use no máximo 60 caracteres.");
