import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_URL, parseSiteUrl } from "./site-url";

describe("parseSiteUrl", () => {
  it("usa o valor válido", () => {
    expect(parseSiteUrl("https://infotera.example.com").href).toBe("https://infotera.example.com/");
  });

  it.each([undefined, "", "não é url", "ftp://x.org", "javascript:alert(1)"])(
    "valor ausente ou inválido (%s) cai no padrão local",
    (raw) => {
      expect(parseSiteUrl(raw).href).toBe(`${DEFAULT_SITE_URL}/`);
    },
  );
});
