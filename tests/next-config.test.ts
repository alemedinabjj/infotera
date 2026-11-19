import { describe, expect, it } from "vitest";
import { z } from "zod";
import nextConfig from "../next.config";

const headersSchema = z.array(
  z.object({
    source: z.string(),
    headers: z.array(z.object({ key: z.string(), value: z.string() })),
  }),
);

describe("next.config", () => {
  it("desliga x-powered-by e a geração de AGENTS.md", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.agentRules).toBe(false);
  });

  it("libera só unsplash e pravatar via https", () => {
    const patterns = nextConfig.images?.remotePatterns ?? [];
    const hosts = patterns.map((p) => p.hostname);
    expect(hosts.sort()).toEqual(["i.pravatar.cc", "images.unsplash.com"]);
    for (const p of patterns) {
      expect(p instanceof URL ? p.protocol : `${p.protocol}:`).toBe("https:");
    }
  });

  it("aplica os 4 headers de segurança em /:path*", async () => {
    const rules = headersSchema.parse(await nextConfig.headers?.());
    const rule = rules.find((r) => r.source === "/:path*");
    expect(Object.fromEntries(rule?.headers.map((h) => [h.key, h.value]) ?? [])).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
  });

  it("a CSP base vale para tudo menos /checkout (que usa a do proxy)", async () => {
    const rules = headersSchema.parse(await nextConfig.headers?.());
    const rule = rules.find((r) => r.source !== "/:path*");
    expect(rule?.headers).toEqual([
      {
        key: "Content-Security-Policy",
        value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
      },
    ]);
    const matcher = new RegExp(`^${rule?.source}$`);
    expect(matcher.test("/checkout")).toBe(false);
    expect(matcher.test("/checkout/")).toBe(false);
    expect(matcher.test("/checkoutx")).toBe(true);
    expect(matcher.test("/search")).toBe(true);
  });
});
