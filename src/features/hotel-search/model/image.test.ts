import { describe, expect, it } from "vitest";
import { BLUR_DATA_URL, unsplashLoader } from "./image";

const SRC = "https://images.unsplash.com/photo-123?w=400&ixlib=rb-4.0";

describe("unsplashLoader", () => {
  it("reescreve w, h (4:3), fit, q e auto=format", () => {
    const url = new URL(unsplashLoader({ src: SRC, width: 640, quality: 80 }));
    expect(url.searchParams.get("w")).toBe("640");
    expect(url.searchParams.get("h")).toBe("480");
    expect(url.searchParams.get("fit")).toBe("crop");
    expect(url.searchParams.get("q")).toBe("80");
    expect(url.searchParams.get("auto")).toBe("format");
  });

  it("usa qualidade padrão e arredonda a altura", () => {
    const url = new URL(unsplashLoader({ src: SRC, width: 250 }));
    expect(url.searchParams.get("q")).toBe("75");
    expect(url.searchParams.get("h")).toBe("188");
  });

  it("preserva outros params e não duplica w", () => {
    const url = new URL(unsplashLoader({ src: SRC, width: 800 }));
    expect(url.searchParams.get("ixlib")).toBe("rb-4.0");
    expect(url.searchParams.getAll("w")).toEqual(["800"]);
  });

  it("host desconhecido, http ou URL inválida nunca vira src: cai no placeholder", () => {
    for (const src of [
      "https://images.example.com/h1.jpg?w=400",
      "http://images.unsplash.com/photo-1",
      "/local.png",
    ]) {
      expect(unsplashLoader({ src, width: 640 })).toBe(BLUR_DATA_URL);
    }
  });
});

describe("BLUR_DATA_URL", () => {
  it("é um SVG em base64", () => {
    expect(BLUR_DATA_URL.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(atob(BLUR_DATA_URL.split(",")[1] ?? "")).toContain("<svg");
  });
});
