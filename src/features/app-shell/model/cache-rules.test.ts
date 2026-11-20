import { describe, expect, it } from "vitest";
import { OFFLINE_PATHS } from "@/shared/i18n/paths";
import { type CacheRequest, type CacheRule, cacheRuleFor, offlinePathFor } from "./cache-rules";

const APP = "https://app.exemplo.com";
const API = "https://api.exemplo.com";

const request = (
  url: string,
  overrides: Partial<Omit<CacheRequest, "url">> & { rsc?: boolean } = {},
): CacheRequest => {
  const { rsc, ...rest } = overrides;
  return {
    url,
    method: "GET",
    isNavigation: false,
    headers: new Headers(rsc ? { RSC: "1" } : {}),
    apiOrigin: API,
    appOrigin: APP,
    ...rest,
  };
};
const doc = (path: string) => request(`${APP}${path}`, { isNavigation: true });
const rsc = (path: string) => request(`${APP}${path}`, { rsc: true });

const NETWORK_FIRST_PAGE = (offlinePath: string): CacheRule => ({
  kind: "network-first",
  cache: "pages",
  timeoutSeconds: 3,
  maxEntries: 40,
  maxAgeSeconds: 86_400,
  offlinePath,
});

describe("cacheRuleFor: 1. método diferente de GET passa direto", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("%s em /search", (method) => {
    expect(cacheRuleFor(request(`${APP}/search`, { method, isNavigation: true }))).toEqual({
      kind: "passthrough",
    });
  });

  it("Server Action (POST com next-action) e POST de reserva na API", () => {
    expect(cacheRuleFor({ ...doc("/checkout"), method: "POST" })).toEqual({ kind: "passthrough" });
    expect(cacheRuleFor(request(`${API}/bookings`, { method: "POST" }))).toEqual({
      kind: "passthrough",
    });
  });
});

describe("cacheRuleFor: 2. rotas privadas nunca gravam", () => {
  it.each([
    ["/checkout", "/offline/checkout"],
    ["/en/checkout", "/en/offline/checkout"],
    ["/checkout/", "/offline/checkout"],
    ["/confirmation/3f2a9c1e-7b4d-4e8a-9f12-6c0d3b2a1e57", "/offline/bookings"],
    ["/en/confirmation/x", "/en/offline/bookings"],
    ["/my-bookings", "/offline/bookings"],
    ["/en/my-bookings", "/en/offline/bookings"],
  ])("documento %s → rede, com a página offline %s", (path, offlinePath) => {
    expect(cacheRuleFor(doc(path))).toEqual({ kind: "network-only", offlinePath });
  });

  it.each(["/checkout", "/en/checkout", "/confirmation/x", "/en/confirmation/x", "/my-bookings"])(
    "RSC de %s → rede, sem fallback e sem gravar",
    (path) => {
      expect(cacheRuleFor(rsc(path))).toEqual({ kind: "network-only", offlinePath: null });
    },
  );

  it("o RSC com query de prefetch também é privado", () => {
    expect(cacheRuleFor(rsc("/en/checkout?_rsc=abc"))).toEqual({
      kind: "network-only",
      offlinePath: null,
    });
  });

  it("nenhuma rota privada produz regra que grava", () => {
    for (const path of ["/checkout", "/en/checkout", "/confirmation/1", "/my-bookings"]) {
      for (const candidate of [doc(path), rsc(path)]) {
        const rule = cacheRuleFor(candidate);
        expect(["network-only", "passthrough"]).toContain(rule.kind);
      }
    }
  });
});

describe("cacheRuleFor: 3. a API fica de fora", () => {
  it.each(["/hotels?destination=Rio", "/bookings/3f2a", "/suggestions?q=sao", "/hotels/1"])(
    "GET %s na origem da API",
    (path) => {
      expect(cacheRuleFor(request(`${API}${path}`))).toEqual({ kind: "passthrough" });
    },
  );
});

describe("cacheRuleFor: 4. /_next/static", () => {
  it("cache-first no cache de estáticos", () => {
    expect(cacheRuleFor(request(`${APP}/_next/static/chunks/abc.js`))).toEqual({
      kind: "cache-first",
      cache: "static",
      maxEntries: null,
      maxAgeSeconds: null,
    });
  });

  it("/_next/image e outras rotas internas passam direto", () => {
    expect(cacheRuleFor(request(`${APP}/_next/image?url=x`))).toEqual({ kind: "passthrough" });
  });
});

describe("cacheRuleFor: 5. documentos públicos: rede primeiro com página offline do idioma", () => {
  it.each([
    ["/", "/offline"],
    ["/search?destination=Rio", "/offline"],
    ["/hotel/1?checkIn=2026-12-01", "/offline"],
    ["/offline", "/offline"],
    ["/favorites", "/offline"],
    ["/compare?hotel=1", "/offline"],
    ["/en", "/en/offline"],
    ["/en/search?x=1", "/en/offline"],
    ["/en/hotel/7", "/en/offline"],
    ["/hotel/1/photos/3", "/offline"],
    ["/en/hotel/1/photos/3", "/en/offline"],
    ["/en/offline", "/en/offline"],
  ])("%s", (path, offlinePath) => {
    expect(cacheRuleFor(doc(path))).toEqual(NETWORK_FIRST_PAGE(offlinePath));
  });
});

describe("cacheRuleFor: 6. RSC público", () => {
  it.each(["/search?_rsc=1", "/hotel/1", "/en/hotel/1", "/hotel/1/photos/3", "/"])(
    "RSC de %s",
    (path) => {
      expect(cacheRuleFor(rsc(path))).toEqual({
        kind: "network-first",
        cache: "pages-rsc",
        timeoutSeconds: 3,
        maxEntries: 40,
        maxAgeSeconds: 86_400,
        offlinePath: null,
      });
    },
  );
});

describe("cacheRuleFor: 7 e 8. imagens e tiles", () => {
  it("Unsplash: cache-first, 60 entradas, 7 dias", () => {
    expect(cacheRuleFor(request("https://images.unsplash.com/photo-1?w=800"))).toEqual({
      kind: "cache-first",
      cache: "images",
      maxEntries: 60,
      maxAgeSeconds: 604_800,
    });
  });

  it("tiles do OSM: cache-first, 300 entradas, 7 dias", () => {
    expect(cacheRuleFor(request("https://tile.openstreetmap.org/15/12453/18532.png"))).toEqual({
      kind: "cache-first",
      cache: "tiles",
      maxEntries: 300,
      maxAgeSeconds: 604_800,
    });
  });
});

describe("cacheRuleFor: 9. o resto passa direto", () => {
  it.each([
    "https://i.pravatar.cc/150?img=1",
    `${APP}/serwist/sw.js`,
    `${APP}/manifest.webmanifest`,
    `${APP}/icon/192`,
    `${APP}/rota-desconhecida`,
    `${APP}/en/rota-desconhecida`,
    "https://outro-dominio.com/x",
  ])("%s", (url) => {
    expect(cacheRuleFor(request(url, { isNavigation: url.startsWith(APP) }))).toEqual({
      kind: "passthrough",
    });
  });

  it("URL inválida não derruba o service worker", () => {
    expect(cacheRuleFor(request("não é url"))).toEqual({ kind: "passthrough" });
  });

  it("subrequest sem documento nem RSC em rota pública passa direto", () => {
    expect(cacheRuleFor(request(`${APP}/search`))).toEqual({ kind: "passthrough" });
  });
});

describe("cacheRuleFor: o prefixo parecido não é privado nem público por engano", () => {
  it("/checkout-info e /confirmations não são rotas privadas nem públicas", () => {
    expect(cacheRuleFor(doc("/checkout-info"))).toEqual({ kind: "passthrough" });
    expect(cacheRuleFor(doc("/confirmations"))).toEqual({ kind: "passthrough" });
  });

  it("/hotel sem id não é rota pública", () => {
    expect(cacheRuleFor(doc("/hotel"))).toEqual({ kind: "passthrough" });
  });

  it("a rota da foto só é pública com o id e a foto: /hotel/1/photos e /hotel/1/photos/3/x não", () => {
    expect(cacheRuleFor(doc("/hotel/1/photos"))).toEqual({ kind: "passthrough" });
    expect(cacheRuleFor(doc("/hotel/1/photos/3/x"))).toEqual({ kind: "passthrough" });
  });
});

describe("offlinePathFor: a variante da página offline pela rota e pelo idioma", () => {
  it.each([
    ["/checkout", "/offline/checkout"],
    ["/en/checkout", "/en/offline/checkout"],
    ["/confirmation/abc", "/offline/bookings"],
    ["/en/confirmation/abc", "/en/offline/bookings"],
    ["/my-bookings", "/offline/bookings"],
    ["/en/my-bookings", "/en/offline/bookings"],
    ["/hotel/7", "/offline"],
    ["/en/hotel/7", "/en/offline"],
    ["/rota-desconhecida", "/offline"],
    ["/checkouts", "/offline"],
  ])("%s → %s", (pathname, expected) => {
    expect(offlinePathFor(pathname)).toBe(expected);
  });

  it("as seis páginas offline estão no precache (3 variantes × 2 idiomas)", () => {
    expect([...OFFLINE_PATHS].sort()).toEqual(
      [
        "/offline",
        "/offline/bookings",
        "/offline/checkout",
        "/en/offline",
        "/en/offline/bookings",
        "/en/offline/checkout",
      ].sort(),
    );
  });
});
