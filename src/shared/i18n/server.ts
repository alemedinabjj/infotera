import { notFound } from "next/navigation";
import { locale } from "next/root-params";
import { isLocale, type Locale } from "./config";

/**
 * Locale da rota (`app/[locale]`) em qualquer Server Component, sem passar por props e sem ler
 * `cookies()` (a página continua estática/PPR). Valor fora de `LOCALES` vira 404.
 */
export const getLocale = async (): Promise<Locale> => {
  const value = await locale();
  if (!isLocale(value)) notFound();
  return value;
};
