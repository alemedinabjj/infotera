import { describe, expect, it } from "vitest";
import { attributionHtml } from "./attribution";

describe("attributionHtml", () => {
  it("é um link seguro para a página de copyright do OpenStreetMap", () => {
    const html = attributionHtml("© colaboradores do OpenStreetMap");
    expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("© colaboradores do OpenStreetMap");
  });

  it("escapa HTML no texto", () => {
    const html = attributionHtml('<img src=x onerror="1">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
