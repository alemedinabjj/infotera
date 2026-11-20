import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

const BASE = "http://localhost:3000";
const call = (path: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(`${BASE}${path}`, { headers }));
const nonceOf = (csp: string | null): string | undefined => csp?.match(/'nonce-([^']+)'/)?.[1];
const rewriteOf = (response: Response): string | null =>
  response.headers.get("x-middleware-rewrite");

describe("proxy: idioma", () => {
  it.each([
    ["/", `${BASE}/pt-BR`],
    ["/search?destination=Rio", `${BASE}/pt-BR/search?destination=Rio`],
    ["/hotel/1", `${BASE}/pt-BR/hotel/1`],
    ["/en", `${BASE}/en-US`],
    ["/en/search?x=1", `${BASE}/en-US/search?x=1`],
  ])("reescreve %s sem mudar a URL do navegador", (path, rewritten) => {
    const response = call(path);
    expect(rewriteOf(response)).toBe(rewritten);
    expect(response.status).toBe(200);
  });

  it.each([
    ["/pt-BR/search?x", 308, `${BASE}/search?x`],
    ["/en-US/hotel/1", 308, `${BASE}/en/hotel/1`],
  ])("redireciona %s para a URL canônica", (path, status, location) => {
    const response = call(path);
    expect(response.status).toBe(status);
    expect(response.headers.get("location")).toBe(location);
  });

  it("cookie en-US em caminho sem prefixo redireciona (307) preservando a query", () => {
    const response = call("/hotel/1?checkIn=2026-12-01", { cookie: "infotera-locale=en-US" });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${BASE}/en/hotel/1?checkIn=2026-12-01`);
  });

  it("ignora Accept-Language e cookie inválido", () => {
    const response = call("/hotel/1", {
      "accept-language": "en-US,en;q=0.9",
      cookie: "infotera-locale=fr-FR",
    });
    expect(rewriteOf(response)).toBe(`${BASE}/pt-BR/hotel/1`);
  });

  it("não aplica CSP fora do checkout", () => {
    const response = call("/hotel/1");
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBeNull();
  });
});

describe("proxy: CSP do checkout", () => {
  it.each(["/checkout", "/en/checkout"])("%s recebe CSP com nonce e no-store", (path) => {
    const response = call(path);
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("'strict-dynamic'");
    expect(nonceOf(csp)).toBeTruthy();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(rewriteOf(response)).toBe(
      `${BASE}${path === "/checkout" ? "/pt-BR/checkout" : "/en-US/checkout"}`,
    );
  });

  it("repassa a mesma política na request (o Next extrai o nonce dela)", () => {
    const response = call("/checkout");
    const forwarded = response.headers.get("x-middleware-request-content-security-policy");
    expect(forwarded).toBe(response.headers.get("Content-Security-Policy"));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(
      nonceOf(response.headers.get("Content-Security-Policy")),
    );
  });

  it("gera um nonce diferente a cada chamada", () => {
    expect(nonceOf(call("/checkout").headers.get("Content-Security-Policy"))).not.toBe(
      nonceOf(call("/checkout").headers.get("Content-Security-Policy")),
    );
  });

  const PREFETCH_HEADERS: Record<string, string>[] = [
    { "next-router-prefetch": "1" },
    { purpose: "prefetch" },
  ];
  it.each(PREFETCH_HEADERS)("prefetch (%j) reescreve sem CSP", (headers) => {
    const response = call("/en/checkout", headers);
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
    expect(rewriteOf(response)).toBe(`${BASE}/en-US/checkout`);
  });

  it("com cookie en-US o checkout sem prefixo vai para /en/checkout sem CSP no redirect", () => {
    const response = call("/checkout", { cookie: "infotera-locale=en-US" });
    expect(response.status).toBe(307);
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });
});

describe("matcher", () => {
  const regex = new RegExp(`^${config.matcher[0]}$`);
  it.each(["/", "/search", "/hotel/1", "/en", "/en/checkout", "/confirmation/abc", "/offline"])(
    "cobre %s",
    (path) => {
      expect(regex.test(path)).toBe(true);
    },
  );

  it.each([
    "/_next/static/chunks/a.js",
    "/serwist/sw.js",
    "/manifest.webmanifest",
    "/icon/192",
    "/apple-icon",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/logo.png",
  ])("ignora %s", (path) => {
    expect(regex.test(path)).toBe(false);
  });
});
