import { env } from "@/shared/api/env";
import { apiGet } from "@/shared/api/http";
import { hotelSchema } from "@/shared/api/schemas";
import { z } from "@/shared/lib/zod";
import { hotelDetailsMessages } from "../i18n/messages";
import { backoffDelays, withRetry } from "../model/build-retry";
import { type PrerenderParam, toPrerenderParams } from "../model/prerender";

// Log do build: sempre em pt-BR (idioma do projeto).
const t = hotelDetailsMessages.get("pt-BR").build;
const hotelsSchema = z.array(hotelSchema);
const ATTEMPTS = 8;
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 15_000;

type LoaderOptions = {
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `generateStaticParams` de `/hotel/[hotelId]`: lista todos os hotéis (`GET /hotels`, sem `_page` a API
 * devolve todos) e devolve um param por id. Roda no build, que pode acontecer com a mock-api ainda
 * acordando (cold start no Render, API subindo em paralelo no E2E): 8 tentativas, 2 s → 15 s
 * (~1,5 min). Esgotou, o build falha alto com o que fazer, sem publicar páginas vazias.
 */
export const listPrerenderHotelIds = async ({
  sleep = defaultSleep,
  log = (message) => console.warn(message),
}: LoaderOptions = {}): Promise<PrerenderParam[]> => {
  const hotels = await withRetry(
    () => apiGet("/hotels", hotelsSchema, { query: { _sort: "id", _order: "asc" } }),
    {
      delays: backoffDelays(ATTEMPTS, BASE_DELAY_MS, MAX_DELAY_MS),
      sleep,
      onRetry: ({ attempt, total }) => log(t.waiting({ attempt, total })),
    },
  ).catch((cause: unknown) => {
    throw new Error(t.unreachable({ url: env.NEXT_PUBLIC_API_URL }), { cause });
  });
  return toPrerenderParams(hotels);
};
