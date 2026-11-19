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
    const hosts = patterns.map((p) => (p instanceof URL ? p.hostname : p.hostname));
    expect(hosts.sort()).toEqual(["i.pravatar.cc", "images.unsplash.com"]);
    for (const p of patterns) {
      expect(p instanceof URL ? p.protocol : `${p.protocol}:`).toBe("https:");
    }
  });

  it("aplica os 4 headers de segurança em /:path*", async () => {
    expect(nextConfig.headers).toBeDefined();
    const rules = headersSchema.parse(await nextConfig.headers?.());
    expect(rules).toHaveLength(1);
    const [rule] = rules;
    expect(rule?.source).toBe("/:path*");
    expect(rule?.headers.map((h) => h.key).sort()).toEqual([
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ]);
  });
});
