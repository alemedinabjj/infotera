import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { Locale } from "@/shared/i18n/config";
import { todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { makeSearchFormSchema, type SearchFormValues } from "./search-form.schema";

/**
 * Resolver do RHF que lê "hoje" a cada validação (não na renderização): aba aberta depois da
 * meia-noite continua validando contra o dia certo. As mensagens vêm do idioma da rota.
 */
export const makeSearchFormResolver =
  (locale: Locale): Resolver<SearchFormValues, unknown, SearchCriteria> =>
  (values, context, options) =>
    zodResolver(makeSearchFormSchema(todayISO(), locale))(values, context, options);

/** Resolver em pt-BR (padrão dos testes de componente). */
export const searchFormResolver = makeSearchFormResolver("pt-BR");
