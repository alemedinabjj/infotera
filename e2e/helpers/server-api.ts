import { randomUUID } from "node:crypto";
import { type APIRequestContext, test as base } from "@playwright/test";
import { API_URL } from "./hotel-search";

// Controle dos requests que o SERVIDOR do Next faz à mock-api (o `page.route` só vê o navegador).
// Veja `control-proxy.mjs` para o protocolo e a estratégia de isolamento: toda regra leva o `owner`
// do teste (o `reset` só remove as dele) e só casa recursos exclusivos do teste.

type Action = { delay: number } | { fail: number } | { hold: string };

type RuleOptions = {
  /** Método HTTP; sem ele, qualquer um. */
  method?: string;
  /** Regex (string) testada no corpo do request, para POSTs com marcador único. */
  body?: string;
  /** Quantas vezes a regra age; depois, os requests passam (ex.: `1` = falha uma vez). */
  times?: number;
  /** Responde este JSON no lugar da mock-api (depois do atraso/hold): dados sob medida e exclusivos. */
  reply?: { status?: number; body: unknown };
};

/** Regra criada: `release()` solta o que estiver preso; `waitForHit()` espera o request chegar. */
export type Rule = {
  id: string;
  hold: string | undefined;
  release: () => Promise<void>;
  /** Espera até `count` requests casarem com a regra (para `hold`, até estarem presos). */
  waitForHit: (count?: number) => Promise<void>;
};

export type ServerApi = {
  /** Segura os requests que casam até `release` (ou o `reset` do fim do teste). */
  holdServerRequests: (pattern: RegExp, options?: RuleOptions) => Promise<Rule>;
  /** Responde `status` (padrão 500) sem chamar a mock-api. */
  failServerRequests: (
    pattern: RegExp,
    options?: RuleOptions & { status?: number },
  ) => Promise<Rule>;
  /** Atrasa `ms` antes de repassar. */
  delayServerRequests: (pattern: RegExp, ms: number, options?: RuleOptions) => Promise<Rule>;
  /** Solta os requests presos de uma regra e deixa os seguintes passarem. */
  release: (rule: Rule) => Promise<void>;
  /** Remove todas as regras deste teste (roda sozinho no fim de cada teste). */
  reset: () => Promise<void>;
};

const CONTROL = `${API_URL}/__control`;

const post = async (request: APIRequestContext, path: string, data: unknown) => {
  const response = await request.post(`${CONTROL}${path}`, { data });
  if (!response.ok()) throw new Error(`proxy de controle ${path}: ${response.status()}`);
  return response;
};

const readHits = async (request: APIRequestContext, id: string) => {
  const body: unknown = await (await request.get(`${CONTROL}/hits/${id}`)).json();
  if (typeof body === "object" && body !== null && "hits" in body && "waiting" in body) {
    return { hits: Number(body.hits), waiting: Number(body.waiting) };
  }
  throw new Error("resposta inesperada do proxy de controle");
};

const readId = async (response: { json: () => Promise<unknown> }): Promise<string> => {
  const body = await response.json();
  if (typeof body === "object" && body !== null && "id" in body && typeof body.id === "string") {
    return body.id;
  }
  throw new Error("o proxy de controle não devolveu o id da regra");
};

/** Cria a API de controle de um teste. Use a fixture `serverApi` (reset automático). */
export const createServerApi = (request: APIRequestContext): ServerApi => {
  const owner = randomUUID();
  const add = async (pattern: RegExp, action: Action, options: RuleOptions = {}): Promise<Rule> => {
    const response = await post(request, "/rules", {
      owner,
      pattern: pattern.source,
      action,
      ...options,
    });
    const id = await readId(response);
    const hold = "hold" in action ? action.hold : undefined;
    const release = async () => {
      if (hold) await post(request, `/release/${encodeURIComponent(hold)}`, {});
    };
    const waitForHit = async (count = 1) => {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const state = await readHits(request, id);
        if ((hold ? state.waiting : state.hits) >= count) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error(`o request esperado não chegou ao proxy (regra ${pattern})`);
    };
    return { id, hold, release, waitForHit };
  };
  return {
    holdServerRequests: (pattern, options) => add(pattern, { hold: randomUUID() }, options),
    failServerRequests: (pattern, { status = 500, ...options } = {}) =>
      add(pattern, { fail: status }, options),
    delayServerRequests: (pattern, ms, options) => add(pattern, { delay: ms }, options),
    release: (rule) => rule.release(),
    reset: async () => {
      await post(request, "/reset", { owner });
    },
  };
};

/** Hotéis reservados aos testes com controle (um por worker vivo; ids estáveis do seed). */
const CONTROLLED_HOTELS = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40] as const;

/**
 * Hotel exclusivo do worker: nenhum outro teste o usa, então regras por id de hotel/quarto não
 * afetam testes em paralelo. Os testes seguintes do mesmo worker rodam em série (e resetam).
 */
export const controlledHotel = (parallelIndex: number): number => {
  const hotelId = CONTROLLED_HOTELS[parallelIndex];
  if (hotelId === undefined) throw new Error("mais workers do que hotéis reservados (31-40)");
  return hotelId;
};

/** Regex de `path+query` dos requests do servidor ao hotel, ao quarto e aos quartos do hotel. */
export const hotelRequest = (hotelId: number): RegExp => new RegExp(`^/hotels/${hotelId}$`);
export const roomRequest = (roomId: number): RegExp => new RegExp(`^/rooms/${roomId}$`);
export const hotelRoomsRequest = (hotelId: number): RegExp =>
  new RegExp(`^/rooms\\?hotelId=${hotelId}$`);

type Fixtures = { serverApi: ServerApi };

export const test = base.extend<Fixtures>({
  serverApi: async ({ request }, use, testInfo) => {
    const probe = await request.post(`${CONTROL}/reset`, { data: { owner: "probe" } });
    testInfo.skip(
      !probe.ok(),
      "precisa do proxy de controle (NEXT_PUBLIC_API_URL apontando para control-proxy.mjs)",
    );
    const api = createServerApi(request);
    await use(api);
    await api.reset();
  },
});
