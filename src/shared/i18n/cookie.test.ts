import { describe, expect, it } from "vitest";
import { localeCookie, writeLocaleCookie } from "./cookie";

describe("cookie de idioma", () => {
  it("monta o valor com os atributos da spec", () => {
    expect(localeCookie("en-US")).toBe(
      "infotera-locale=en-US; Path=/; SameSite=Lax; Max-Age=31536000",
    );
  });

  it("grava e lê em document.cookie", () => {
    writeLocaleCookie("pt-BR");
    expect(document.cookie).toContain("infotera-locale=pt-BR");
  });
});
