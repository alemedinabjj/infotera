/**
 * Proxy HTTP de controle para o E2E (Node puro, sem dependências).
 *
 * Fica entre quem chama (o navegador E o servidor do Next, via `NEXT_PUBLIC_API_URL`) e a
 * mock-api. Sem regras, repassa tudo como está (método, corpo, status, headers de CORS e
 * `X-Total-Count`). Os testes adicionam regras para atrasar, falhar ou segurar requests que o
 * servidor do Next faz e que o `page.route` nunca vê.
 *
 * Uso: PROXY_PORT=3334 UPSTREAM_URL=http://localhost:3333 node e2e/helpers/control-proxy.mjs
 *
 * Endpoints de controle (JSON):
 *   GET    /__control/health             -> { ok: true }
 *   GET    /__control/rules              -> regras ativas e contadores (depuração)
 *   POST   /__control/rules              -> adiciona uma regra; responde { id, hold }
 *            { owner?: string, method?: "GET"|"POST"|..., pattern: string (regex),
 *              body?: string (regex testada no corpo), times?: number,
 *              reply?: { status?: number, body: json } (responde isto, sem chamar a mock-api, depois
 *              do delay/hold; serve para dar ao hotel exclusivo do teste o conteúdo de outro),
 *              action: { delay: ms } | { fail: status } | { hold: id } }
 *   DELETE /__control/rules/:id          -> remove a regra
 *   GET    /__control/hits/:id           -> { hits, waiting } (quantos casaram / estão presos)
 *   POST   /__control/release/:holdId    -> solta os requests presos e deixa os próximos passarem
 *   POST   /__control/reset              -> { owner? }: remove as regras do dono (ou todas) e solta
 *                                           o que estiver preso
 *
 * Casamento: `pattern` é testada contra `path + query` (ex.: `/hotels/31`, `/rooms?hotelId=31`).
 * Vale a primeira regra ativa que casa. `times` limita quantas vezes a regra age (depois dela
 * os requests passam): "falha uma vez e o retry funciona".
 *
 * Isolamento entre testes em paralelo (estratégia): (1) cada regra tem um `owner` (id do teste) e o
 * `reset` só remove as dele; (2) a regra só casa o recurso que o teste usa com exclusividade: ids
 * de hotel/quarto reservados por worker (veja `controlledHotel` em server-api.ts) ou um marcador
 * no corpo (`body`), como o sobrenome único de um POST /bookings. Nunca use uma regra ampla.
 */
import http from "node:http";

const port = Number(process.env.PROXY_PORT ?? 3334);
const upstream = new URL(process.env.UPSTREAM_URL ?? "http://localhost:3333");
const HOLD_TIMEOUT_MS = 60_000;

/** @type {Map<string, any>} */
const rules = new Map();
/** @type {Map<string, Set<() => void>>} holdId -> resolvers dos requests presos */
const waiting = new Map();
/** holdIds já liberados: os próximos requests passam direto. */
const released = new Set();
let counter = 0;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-expose-headers": "X-Total-Count",
  });
  res.end(JSON.stringify(body));
};

const holdCount = (holdId) => waiting.get(holdId)?.size ?? 0;

const releaseHold = (holdId) => {
  released.add(holdId);
  for (const resolve of waiting.get(holdId) ?? []) resolve();
  waiting.delete(holdId);
};

const addRule = (input) => {
  if (typeof input?.pattern !== "string" || typeof input.action !== "object") {
    return { error: "pattern e action são obrigatórios" };
  }
  const { action } = input;
  const kinds = ["delay", "fail", "hold"].filter((kind) => action[kind] !== undefined);
  if (kinds.length !== 1) return { error: "action: exatamente um de delay | fail | hold" };
  counter += 1;
  const id = `r${counter}`;
  const hold = action.hold === undefined ? undefined : String(action.hold);
  if (hold) released.delete(hold);
  rules.set(id, {
    id,
    owner: input.owner ?? null,
    method: input.method ? String(input.method).toUpperCase() : null,
    pattern: new RegExp(input.pattern),
    patternSource: input.pattern,
    body: input.body ? new RegExp(input.body) : null,
    times: typeof input.times === "number" ? input.times : Number.POSITIVE_INFINITY,
    action,
    hold,
    reply: input.reply ?? null,
    hits: 0,
  });
  return { id, hold };
};

const removeRules = (owner) => {
  for (const [id, rule] of rules) {
    if (owner && rule.owner !== owner) continue;
    if (rule.hold) releaseHold(rule.hold);
    rules.delete(id);
  }
};

const listRules = () =>
  [...rules.values()].map((rule) => ({
    ...rule,
    pattern: rule.patternSource,
    body: rule.body?.source ?? null,
    waiting: rule.hold ? holdCount(rule.hold) : 0,
  }));

const removeRule = (id) => {
  const rule = rules.get(id);
  if (rule?.hold) releaseHold(rule.hold);
  rules.delete(id);
};

const hitsOf = (id) => {
  const rule = rules.get(id);
  if (!rule) return [404, { error: "regra inexistente" }];
  return [200, { hits: rule.hits, waiting: rule.hold ? holdCount(rule.hold) : 0 }];
};

/** Tabela de rotas de controle: "MÉTODO /caminho" -> (json, chave) => [status, corpo]. */
const routes = {
  "GET health": () => [200, { ok: true }],
  "GET rules": () => [200, listRules()],
  "POST rules": (json) => {
    const result = addRule(json);
    return [result.error ? 400 : 201, result];
  },
  "DELETE rules": (_json, key) => {
    removeRule(key);
    return [200, { ok: true }];
  },
  "GET hits": (_json, key) => hitsOf(key),
  "POST release": (_json, key) => {
    releaseHold(decodeURIComponent(key));
    return [200, { ok: true }];
  },
  "POST reset": (json) => {
    removeRules(json.owner);
    return [200, { ok: true }];
  },
};

const control = async (req, res, url) => {
  const [, resource, key] = url.pathname.replace("/__control", "").split("/");
  const text = (await readBody(req)).toString();
  const route = routes[`${req.method} ${resource}`];
  if (!route) return sendJson(res, 404, { error: "controle desconhecido" });
  const [status, body] = route(text ? JSON.parse(text) : {}, key);
  return sendJson(res, status, body);
};

const findRule = (req, target, body) => {
  for (const rule of rules.values()) {
    if (rule.hits >= rule.times) continue;
    if (rule.method && rule.method !== req.method) continue;
    if (!rule.pattern.test(target)) continue;
    if (rule.body && !rule.body.test(body)) continue;
    return rule;
  }
  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hold = (holdId) =>
  new Promise((resolve) => {
    const set = waiting.get(holdId) ?? new Set();
    waiting.set(holdId, set);
    const done = () => {
      clearTimeout(timer);
      set.delete(done);
      resolve();
    };
    // Rede de segurança: um teste que morreu não pode deixar o servidor do Next preso.
    const timer = setTimeout(done, HOLD_TIMEOUT_MS);
    set.add(done);
  });

const forward = (req, res, body) => {
  const headers = { ...req.headers, host: upstream.host };
  const proxied = http.request(
    {
      hostname: upstream.hostname,
      port: upstream.port,
      path: req.url,
      method: req.method,
      headers,
      agent: false,
    },
    (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    },
  );
  proxied.on("error", () => sendJson(res, 502, { error: "mock-api indisponível" }));
  proxied.end(body);
};

const handle = async (req, res) => {
  const url = new URL(req.url ?? "/", "http://proxy");
  if (url.pathname.startsWith("/__control/")) return control(req, res, url);
  const body = await readBody(req);
  const rule = findRule(req, url.pathname + url.search, body.toString());
  if (rule) {
    rule.hits += 1;
    const { action } = rule;
    if (action.delay !== undefined) await sleep(Number(action.delay));
    if (action.hold !== undefined && !released.has(rule.hold)) await hold(rule.hold);
    if (action.fail !== undefined) {
      return sendJson(res, Number(action.fail), { error: "Falha simulada pelo proxy de controle" });
    }
    if (rule.reply !== null) return sendJson(res, rule.reply.status ?? 200, rule.reply.body);
  }
  return forward(req, res, body);
};

http
  .createServer((req, res) => {
    handle(req, res).catch((error) => sendJson(res, 500, { error: String(error) }));
  })
  .listen(port, () => console.log(`control-proxy :${port} -> ${upstream.origin}`));
