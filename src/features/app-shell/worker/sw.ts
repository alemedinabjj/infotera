/// <reference lib="webworker" />
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  type PrecacheEntry,
  type RouteMatchCallback,
  type RuntimeCaching,
  Serwist,
  type SerwistGlobalConfig,
} from "serwist";
import { parsePublicPath } from "@/shared/i18n/paths";
import { type CacheRule, cacheRuleFor } from "../model/cache-rules";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Definidos na compilação do service worker (`app/serwist/[path]/route.ts`, esbuild `define`).
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Caches com o build no nome: o `activate` apaga os de builds anteriores (HTML velho apontando para chunks removidos). */
const VERSIONED = ["pages", "pages-rsc", "static"] as const;
const versioned = (name: string): string => `${name}-${VERSION}`;

const ruleFor = ({ request, url }: Parameters<RouteMatchCallback>[0]): CacheRule =>
  cacheRuleFor({
    url: url.href,
    method: request.method,
    isNavigation: request.mode === "navigate",
    headers: request.headers,
    apiOrigin: API_ORIGIN,
    appOrigin: self.location.origin,
  });

const when =
  (predicate: (rule: CacheRule) => boolean): RouteMatchCallback =>
  (options) =>
    predicate(ruleFor(options));

const OK = new CacheableResponsePlugin({ statuses: [200] });
const expiration = (maxEntries: number, maxAgeSeconds: number) =>
  new ExpirationPlugin({ maxEntries, maxAgeSeconds, maxAgeFrom: "last-used" });

const runtimeCaching: RuntimeCaching[] = [
  // Rotas privadas (checkout com nonce, confirmação e histórico com dado pessoal): rede, nunca grava.
  { matcher: when((rule) => rule.kind === "network-only"), handler: new NetworkOnly() },
  {
    matcher: when((rule) => rule.kind === "cache-first" && rule.cache === "static"),
    handler: new CacheFirst({ cacheName: versioned("static"), plugins: [OK] }),
  },
  {
    matcher: when((rule) => rule.kind === "network-first" && rule.cache === "pages"),
    handler: new NetworkFirst({
      cacheName: versioned("pages"),
      networkTimeoutSeconds: 3,
      plugins: [OK, expiration(40, 86_400)],
    }),
  },
  {
    matcher: when((rule) => rule.kind === "network-first" && rule.cache === "pages-rsc"),
    handler: new NetworkFirst({
      cacheName: versioned("pages-rsc"),
      networkTimeoutSeconds: 3,
      plugins: [OK, expiration(40, 86_400)],
    }),
  },
  {
    matcher: when((rule) => rule.kind === "cache-first" && rule.cache === "images"),
    // Só status 200 (resposta CORS): nunca resposta opaca (status 0), que infla a cota de storage.
    handler: new CacheFirst({ cacheName: "images", plugins: [OK, expiration(60, 604_800)] }),
  },
  {
    matcher: when((rule) => rule.kind === "cache-first" && rule.cache === "tiles"),
    handler: new CacheFirst({ cacheName: "tiles", plugins: [OK, expiration(300, 604_800)] }),
  },
];

const isDocument = ({ request }: { request: Request }): boolean =>
  request.destination === "document";
const isEnglishDocument = ({ request }: { request: Request }): boolean =>
  isDocument({ request }) && parsePublicPath(new URL(request.url).pathname).locale === "en-US";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  // Sem `skipWaiting`: a versão nova espera o aviso "Nova versão disponível" (não troca chunks no meio da sessão).
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: false,
  runtimeCaching,
  // Documento sem rede e sem cópia: a página offline do idioma da URL (pré-cacheada no install).
  fallbacks: {
    entries: [
      { url: "/en/offline", matcher: isEnglishDocument },
      { url: "/offline", matcher: isDocument },
    ],
  },
});

/** Remove os caches de builds anteriores (`pages-*`, `pages-rsc-*`, `static-*` com outro sufixo). */
const deleteOldCaches = async (): Promise<void> => {
  const keep = new Set(VERSIONED.map(versioned));
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => VERSIONED.some((base) => name.startsWith(`${base}-`)) && !keep.has(name))
      .map((name) => caches.delete(name)),
  );
};

self.addEventListener("activate", (event) => event.waitUntil(deleteOldCaches()));

// O app avisa "Nova versão disponível" e, no clique, pede para a versão em espera assumir.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

serwist.addEventListeners();
