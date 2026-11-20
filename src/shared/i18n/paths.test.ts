import { describe, expect, it } from "vitest";
import {
  alternatesFor,
  isCheckoutPath,
  localizePath,
  parsePublicPath,
  resolveLocaleRequest,
  switchLocalePath,
} from "./paths";

describe("localizePath", () => {
  it.each([
    ["pt-BR", "/", "/"],
    ["pt-BR", "/search?destination=Rio", "/search?destination=Rio"],
    ["en-US", "/", "/en"],
    ["en-US", "/?notice=choose-room", "/en?notice=choose-room"],
    [
      "en-US",
      "/search?destination=Rio%20de%20Janeiro%2C%20RJ&adults=2",
      "/en/search?destination=Rio%20de%20Janeiro%2C%20RJ&adults=2",
    ],
    ["en-US", "/hotel/1#reviews", "/en/hotel/1#reviews"],
    ["en-US", "/hotel/1?a=1#reviews", "/en/hotel/1?a=1#reviews"],
    ["en-US", "https://openstreetmap.org/x", "https://openstreetmap.org/x"],
    ["en-US", "//evil.example/x", "//evil.example/x"],
    ["en-US", "#top", "#top"],
  ] as const)("%s %s → %s", (locale, href, expected) => {
    expect(localizePath(locale, href)).toBe(expected);
  });
});

describe("parsePublicPath", () => {
  it.each([
    ["/", "pt-BR", "/"],
    ["/en", "en-US", "/"],
    ["/en/", "en-US", "/"],
    ["/en/search", "en-US", "/search"],
    ["/en/hotel/1", "en-US", "/hotel/1"],
    ["/english", "pt-BR", "/english"],
    ["/search", "pt-BR", "/search"],
    ["/EN/search", "pt-BR", "/EN/search"],
  ] as const)("%s → %s %s", (pathname, locale, path) => {
    expect(parsePublicPath(pathname)).toEqual({ locale, path });
  });
});

describe("switchLocalePath", () => {
  it("preserva caminho, query e hash ao trocar de idioma", () => {
    expect(switchLocalePath("pt-BR", "/en/hotel/1?checkIn=2026-12-01#rooms")).toBe(
      "/hotel/1?checkIn=2026-12-01#rooms",
    );
    expect(switchLocalePath("en-US", "/hotel/1?checkIn=2026-12-01")).toBe(
      "/en/hotel/1?checkIn=2026-12-01",
    );
    expect(switchLocalePath("en-US", "/")).toBe("/en");
    expect(switchLocalePath("pt-BR", "/en")).toBe("/");
    expect(switchLocalePath("en-US", "/en/search?x=1")).toBe("/en/search?x=1");
  });
});

describe("isCheckoutPath", () => {
  it.each([
    ["/checkout", true],
    ["/en/checkout", true],
    ["/checkout/", true],
    ["/en/checkout/x", true],
    ["/checkout-info", false],
    ["/en", false],
    ["/hotel/1", false],
    ["/en/confirmation/1", false],
  ])("%s → %s", (pathname, expected) => {
    expect(isCheckoutPath(pathname)).toBe(expected);
  });
});

describe("alternatesFor", () => {
  it("devolve pt-BR, en-US e x-default em pt-BR", () => {
    expect(alternatesFor("/hotel/1")).toEqual({
      "pt-BR": "/hotel/1",
      "en-US": "/en/hotel/1",
      "x-default": "/hotel/1",
    });
    expect(alternatesFor("/")["en-US"]).toBe("/en");
  });
});

describe("resolveLocaleRequest", () => {
  const rewrite = (locale: string, pathname: string) => ({ action: "rewrite", locale, pathname });
  const redirect = (status: number, pathname: string) => ({ action: "redirect", status, pathname });
  it.each([
    ["/", undefined, rewrite("pt-BR", "/pt-BR")],
    ["/search", undefined, rewrite("pt-BR", "/pt-BR/search")],
    ["/hotel/1", undefined, rewrite("pt-BR", "/pt-BR/hotel/1")],
    ["/checkout", "pt-BR", rewrite("pt-BR", "/pt-BR/checkout")],
    ["/en", undefined, rewrite("en-US", "/en-US")],
    ["/en/", undefined, rewrite("en-US", "/en-US")],
    ["/en/search", undefined, rewrite("en-US", "/en-US/search")],
    ["/en/search", "pt-BR", rewrite("en-US", "/en-US/search")],
    ["/en/search", "en-US", rewrite("en-US", "/en-US/search")],
    ["/enx", undefined, rewrite("pt-BR", "/pt-BR/enx")],
    ["/EN/search", undefined, rewrite("pt-BR", "/pt-BR/EN/search")],
    ["/pt-BR", undefined, redirect(308, "/")],
    ["/pt-BR/search", undefined, redirect(308, "/search")],
    ["/en-US", undefined, redirect(308, "/en")],
    ["/en-US/hotel/1", "pt-BR", redirect(308, "/en/hotel/1")],
    ["/hotel/1", "en-US", redirect(307, "/en/hotel/1")],
    ["/", "en-US", redirect(307, "/en")],
    ["/checkout", "en-US", redirect(307, "/en/checkout")],
    ["/offline", "en-US", rewrite("pt-BR", "/pt-BR/offline")],
    ["/offline/checkout", "en-US", rewrite("pt-BR", "/pt-BR/offline/checkout")],
    ["/offline/bookings", "en-US", rewrite("pt-BR", "/pt-BR/offline/bookings")],
    ["/hotel/1", "fr-FR", rewrite("pt-BR", "/pt-BR/hotel/1")],
    ["/hotel/1", "", rewrite("pt-BR", "/pt-BR/hotel/1")],
  ] as const)("%s com cookie %j", (pathname, cookie, expected) => {
    expect(resolveLocaleRequest({ pathname, cookie })).toEqual(expected);
  });
});
