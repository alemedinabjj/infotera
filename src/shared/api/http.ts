import { z } from "@/shared/lib/zod";
import { env } from "./env";
import { apiErrorBodySchema } from "./schemas";

export type ApiErrorKind = "http" | "network" | "timeout" | "parse";

const REQUEST_TIMEOUT_MS = 10_000;

/** Erro único do cliente HTTP. `status` é `null` quando não houve resposta. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(kind: ApiErrorKind, status: number | null, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }

  isNotFound(): boolean {
    return this.kind === "http" && this.status === 404;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

export type RequestOptions = {
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  init?: RequestInit;
};

/** Monta a query string: arrays repetem a chave; `null`, `undefined` e `""` são omitidos. */
export const buildQuery = (query: Record<string, QueryValue>): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "object") {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  return params;
};

const buildUrl = (path: string, query: RequestOptions["query"]): string => {
  const search = query ? buildQuery(query).toString() : "";
  return `${env.NEXT_PUBLIC_API_URL}${path}${search ? `?${search}` : ""}`;
};

const isTimeoutError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "TimeoutError";

const errorBodyMessage = async (response: Response): Promise<string> => {
  try {
    const body = apiErrorBodySchema.safeParse(await response.json());
    return body.success ? body.data.error : "";
  } catch {
    return "";
  }
};

const send = async (
  path: string,
  { query, signal, init }: RequestOptions,
  override: RequestInit = {},
): Promise<Response> => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { ...init, ...override, signal: combined });
  } catch (error) {
    // Cancelamento do chamador (ex.: TanStack Query) é relançado como está.
    if (signal?.aborted) throw error;
    if (timeout.aborted || isTimeoutError(error)) {
      throw new ApiError("timeout", null, "A requisição excedeu o tempo limite.", error);
    }
    throw new ApiError("network", null, "Falha de rede ao chamar a API.", error);
  }

  if (!response.ok) {
    const detail = await errorBodyMessage(response);
    throw new ApiError(
      "http",
      response.status,
      `HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  return response;
};

const parseBody = async <T>(
  response: Response,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> => {
  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    // Cancelamento do chamador durante a leitura do corpo é relançado como está.
    if (signal?.aborted) throw error;
    if (isTimeoutError(error)) {
      throw new ApiError("timeout", response.status, "A requisição excedeu o tempo limite.", error);
    }
    throw new ApiError("parse", response.status, "Resposta da API fora do contrato.", error);
  }
  try {
    return schema.parse(data);
  } catch (error) {
    throw new ApiError("parse", response.status, "Resposta da API fora do contrato.", error);
  }
};

/** GET tipado: toda resposta passa por `schema.parse`. */
export const apiGet = async <T>(
  path: string,
  schema: z.ZodType<T>,
  opts: RequestOptions = {},
): Promise<T> => parseBody(await send(path, opts), schema, opts.signal);

const readTotal = (header: string | null, fallback: number): number => {
  if (header === null) return fallback;
  const total = Number(header);
  return Number.isInteger(total) && total >= 0 ? total : fallback;
};

/** GET de lista paginada: itens do corpo e total do header `X-Total-Count`. */
export const apiGetPage = async <T>(
  path: string,
  itemSchema: z.ZodType<T>,
  opts: RequestOptions = {},
): Promise<{ items: T[]; total: number }> => {
  const response = await send(path, opts);
  const items = await parseBody(response, z.array(itemSchema), opts.signal);
  return { items, total: readTotal(response.headers.get("X-Total-Count"), items.length) };
};

/** POST JSON tipado. Não repete automaticamente (não é idempotente). */
export const apiPost = async <T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  opts: RequestOptions = {},
): Promise<T> => {
  const headers = new Headers(opts.init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await send(path, opts, { method: "POST", headers, body: JSON.stringify(body) });
  return parseBody(response, schema, opts.signal);
};
