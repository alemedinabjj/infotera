import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it.each([undefined, "", "ftp://x", "localhost:3333", "   "])(
    "lança citando a variável e o .env.example para %j",
    (value) => {
      expect(() => parseEnv({ NEXT_PUBLIC_API_URL: value })).toThrow(
        /NEXT_PUBLIC_API_URL.*\.env\.example/,
      );
    },
  );

  it("remove a barra final", () => {
    expect(parseEnv({ NEXT_PUBLIC_API_URL: "http://localhost:3333/" }).NEXT_PUBLIC_API_URL).toBe(
      "http://localhost:3333",
    );
  });

  it("aceita http e https", () => {
    expect(parseEnv({ NEXT_PUBLIC_API_URL: "https://api.example.com" }).NEXT_PUBLIC_API_URL).toBe(
      "https://api.example.com",
    );
  });
});
