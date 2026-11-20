import { describe, expect, it } from "vitest";
import {
  contentLang,
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_PREFIX,
  LOCALES,
  localeSchema,
} from "./config";

describe("config de i18n", () => {
  it("pt-BR é o padrão e não tem prefixo; en-US usa /en", () => {
    expect(LOCALES).toEqual(["pt-BR", "en-US"]);
    expect(DEFAULT_LOCALE).toBe("pt-BR");
    expect(LOCALE_PREFIX).toEqual({ "pt-BR": "", "en-US": "/en" });
    expect(LOCALE_COOKIE).toBe("infotera-locale");
  });

  it.each([
    ["pt-BR", true],
    ["en-US", true],
    ["en", false],
    ["EN-us", false],
    ["", false],
    [undefined, false],
    [42, false],
  ])("isLocale(%j) = %s", (value, expected) => {
    expect(isLocale(value)).toBe(expected);
    expect(localeSchema.safeParse(value).success).toBe(expected);
  });

  it("contentLang marca o conteúdo em português só fora do pt-BR", () => {
    expect(contentLang("pt-BR")).toBeUndefined();
    expect(contentLang("en-US")).toBe("pt-BR");
  });
});
