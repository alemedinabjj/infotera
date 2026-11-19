import { cache } from "react";
import { makeQueryClient } from "./query-client";

/** Um QueryClient por request, só para Server Components (nunca importar em código de cliente). */
export const getServerQueryClient = cache(makeQueryClient);
