import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

const call = () => proxy(new NextRequest("http://localhost:3000/checkout"));
const nonceOf = (csp: string | null): string | undefined => csp?.match(/'nonce-([^']+)'/)?.[1];

describe("proxy", () => {
  it("devolve a CSP com nonce e Cache-Control no-store na resposta", () => {
    const response = call();
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("'strict-dynamic'");
    expect(nonceOf(csp)).toBeTruthy();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("repassa a mesma política na request (o Next extrai o nonce dela)", () => {
    const response = call();
    const forwarded = response.headers.get("x-middleware-request-content-security-policy");
    expect(forwarded).toBe(response.headers.get("Content-Security-Policy"));
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(
      nonceOf(response.headers.get("Content-Security-Policy")),
    );
  });

  it("gera um nonce diferente a cada chamada", () => {
    expect(nonceOf(call().headers.get("Content-Security-Policy"))).not.toBe(
      nonceOf(call().headers.get("Content-Security-Policy")),
    );
  });

  it("o matcher cobre só /checkout e ignora prefetch", () => {
    expect(config.matcher).toHaveLength(1);
    const [rule] = config.matcher;
    expect(rule?.source).toBe("/checkout");
    expect(rule?.missing?.map((m) => m.key)).toEqual(["next-router-prefetch", "purpose"]);
  });
});
