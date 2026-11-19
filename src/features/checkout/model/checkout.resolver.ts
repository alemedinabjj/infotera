import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { todayISO } from "@/shared/lib/dates";
import { type CheckoutValues, makeCheckoutSchema } from "./checkout.schema";

/** Resolver do RHF que lê "hoje" a cada validação (validade do cartão contra o dia certo). */
export const checkoutResolver: Resolver<CheckoutValues, unknown, CheckoutValues> = (
  values,
  context,
  options,
) => zodResolver(makeCheckoutSchema(todayISO()))(values, context, options);
