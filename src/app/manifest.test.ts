import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateImageMetadata } from "./icon";
import manifest from "./manifest";

const css = readFileSync(path.join(__dirname, "globals.css"), "utf8");
const token = (name: string): string | undefined =>
  new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1]?.toLowerCase();

describe("manifest()", () => {
  const result = manifest();

  it("instalável: nome, start_url, escopo e standalone", () => {
    expect(result).toMatchObject({
      name: "Infotera Hotéis",
      short_name: "Infotera",
      start_url: "/",
      scope: "/",
      display: "standalone",
      lang: "pt-BR",
    });
  });

  it("as cores são os tokens do design system", () => {
    expect(result.theme_color?.toLowerCase()).toBe(token("primary"));
    expect(result.background_color?.toLowerCase()).toBe(token("canvas"));
  });

  it("tem ícones 192, 512 e 512 maskable", () => {
    expect(result.icons).toEqual([
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });

  it("cada ícone do manifest existe em generateImageMetadata (mesmo id e tamanho)", () => {
    const generated = generateImageMetadata();
    for (const icon of result.icons ?? []) {
      const id = icon.src.split("/").pop();
      const match = generated.find((item) => item.id === id);
      expect(match, `ícone ${icon.src}`).toBeDefined();
      expect(`${match?.size.width}x${match?.size.height}`).toBe(icon.sizes);
      expect(match?.contentType).toBe(icon.type);
    }
  });
});
