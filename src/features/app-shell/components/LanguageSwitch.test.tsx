import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import type { Locale } from "@/shared/i18n/config";
import * as navigation from "@/shared/lib/navigation";
import { LanguageSwitch } from "./LanguageSwitch";

const renderSwitch = (locale: Locale) =>
  render(
    <I18nProvider locale={locale}>
      <LanguageSwitch />
    </I18nProvider>,
  );

const clearCookie = () => {
  // biome-ignore lint/suspicious/noDocumentCookie: limpeza síncrona entre testes.
  document.cookie = "infotera-locale=; Path=/; Max-Age=0";
};

describe("LanguageSwitch", () => {
  beforeEach(() => {
    clearCookie();
    window.history.replaceState(null, "", "/");
  });
  afterEach(clearCookie);

  it("em pt-BR oferece English, com lang e hreflang do destino", () => {
    renderSwitch("pt-BR");
    const link = screen.getByRole("link", { name: "Mudar idioma para English" });
    expect(link).toHaveAttribute("hreflang", "en-US");
    expect(screen.getByText("English")).toHaveAttribute("lang", "en-US");
  });

  it("em en-US oferece Português", () => {
    renderSwitch("en-US");
    const link = screen.getByRole("link", { name: "Switch language to Português" });
    expect(link).toHaveAttribute("hreflang", "pt-BR");
    expect(screen.getByText("Português")).toHaveAttribute("lang", "pt-BR");
  });

  it("depois de montar o href é a mesma página no outro idioma, com query e hash", () => {
    window.history.replaceState(null, "", "/hotel/1?checkIn=2026-12-01#rooms");
    renderSwitch("pt-BR");
    expect(screen.getByRole("link", { name: /English/ })).toHaveAttribute(
      "href",
      "/en/hotel/1?checkIn=2026-12-01#rooms",
    );
  });

  it("de en-US para pt-BR remove o prefixo", () => {
    window.history.replaceState(null, "", "/en/search?destination=Rio");
    renderSwitch("en-US");
    expect(screen.getByRole("link", { name: /Português/ })).toHaveAttribute(
      "href",
      "/search?destination=Rio",
    );
  });

  it("no render do servidor o href aponta para a home do outro idioma", async () => {
    const { renderToString } = await import("react-dom/server");
    const html = renderToString(
      <I18nProvider locale="pt-BR">
        <LanguageSwitch />
      </I18nProvider>,
    );
    expect(html).toContain('href="/en"');
  });

  it("o clique grava o cookie e navega com carga de documento", async () => {
    const assign = vi.spyOn(navigation, "assignLocation").mockImplementation(() => undefined);
    window.history.replaceState(null, "", "/hotel/1?a=1");
    renderSwitch("pt-BR");
    await userEvent.click(screen.getByRole("link", { name: /English/ }));
    expect(document.cookie).toContain("infotera-locale=en-US");
    expect(assign).toHaveBeenCalledWith("/en/hotel/1?a=1");
  });

  it("recalcula o href ao entrar no link depois de uma navegação", async () => {
    renderSwitch("pt-BR");
    window.history.replaceState(null, "", "/search?x=1");
    await userEvent.hover(screen.getByRole("link", { name: /English/ }));
    expect(screen.getByRole("link", { name: /English/ })).toHaveAttribute("href", "/en/search?x=1");
  });
});
