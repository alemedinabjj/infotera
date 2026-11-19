import { describe, expect, it } from "vitest";
import { BASELINE_DIRECTIVES, buildCsp, IMAGE_HOSTS, serializeCsp } from "./csp";

const NONCE = "bm9uY2U=";
const build = (mode: "production" | "development", apiOrigin = "https://api.exemplo.com") =>
  buildCsp({ nonce: NONCE, apiOrigin, mode });

const directive = (csp: string, name: string): string[] => {
  const found = csp.split("; ").find((part) => part.startsWith(`${name} `) || part === name);
  return found ? found.split(" ").slice(1) : [];
};

describe("buildCsp", () => {
  it("produção: política exata da decisão 3", () => {
    expect(build("production")).toBe(
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`,
        `style-src 'self' 'nonce-${NONCE}'`,
        `style-src-elem 'self' 'nonce-${NONCE}'`,
        "style-src-attr 'unsafe-inline'",
        "img-src 'self' data: blob: https://images.unsplash.com https://i.pravatar.cc https://tile.openstreetmap.org",
        "font-src 'self'",
        "connect-src 'self' https://api.exemplo.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  });

  it("produção: script-src sem unsafe-inline nem unsafe-eval", () => {
    const scripts = directive(build("production"), "script-src");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it("desenvolvimento: unsafe-eval, ws: e estilos inline para o HMR", () => {
    const csp = build("development");
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
    expect(directive(csp, "style-src")).toContain("'unsafe-inline'");
    expect(directive(csp, "style-src-elem")).toContain("'unsafe-inline'");
  });

  it("upgrade-insecure-requests só com API https", () => {
    expect(build("production", "https://api.exemplo.com")).toContain("upgrade-insecure-requests");
    expect(build("production", "http://localhost:3333")).not.toContain("upgrade-insecure-requests");
  });

  it("usa só a origem da API (sem path nem barra final)", () => {
    const csp = build("production", "https://api.exemplo.com/v1/");
    expect(directive(csp, "connect-src")).toEqual(["'self'", "https://api.exemplo.com"]);
  });

  it("o nonce só aparece em script-src e style-src*", () => {
    const csp = build("production");
    const withNonce = csp
      .split("; ")
      .filter((part) => part.includes("nonce-"))
      .map((part) => part.split(" ")[0]);
    expect(withNonce).toEqual(["script-src", "style-src", "style-src-elem"]);
  });

  it("img-src libera os hosts de imagem do app", () => {
    for (const host of IMAGE_HOSTS) {
      expect(directive(build("production"), "img-src")).toContain(host);
    }
  });
});

describe("política base", () => {
  it("serializa as diretivas que não dependem de nonce", () => {
    expect(serializeCsp(BASELINE_DIRECTIVES)).toBe(
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
    );
  });
});
