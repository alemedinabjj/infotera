import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { DEFAULT_LOCALE, type Locale } from "@/shared/i18n/config";
import { todayISO } from "@/shared/lib/dates";
import { type CheckoutValues, makeCheckoutSchema } from "./checkout.schema";

/**
 * Resolver do RHF no idioma da rota: lê "hoje" a cada validação (validade do cartão contra o dia
 * certo) e devolve as mensagens do `locale`.
 */
export const makeCheckoutResolver =
  (locale: Locale = DEFAULT_LOCALE): Resolver<CheckoutValues, unknown, CheckoutValues> =>
  (values, context, options) =>
    zodResolver(makeCheckoutSchema(todayISO(), locale))(values, context, options);
