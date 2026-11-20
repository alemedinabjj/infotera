import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { makeSearchFormSchema, type SearchFormValues } from "./search-form.schema";

/**
 * Resolver do RHF que lê "hoje" a cada validação (não na renderização): aba aberta depois da
 * meia-noite continua validando contra o dia certo.
 */
export const searchFormResolver: Resolver<SearchFormValues, unknown, SearchCriteria> = (
  values,
  context,
  options,
) => zodResolver(makeSearchFormSchema(todayISO()))(values, context, options);
