import type { QuoteResult } from "../model/quote";

/** Estado do preço para a UI (skeleton, erro com retry, pronto). */
export type CheckoutPrice =
  | { status: "loading"; nights: number }
  | { status: "error"; nights: number; retry: () => void; retrying: boolean }
  | { status: "ready"; nights: number; result: QuoteResult };
