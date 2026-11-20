import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import { OfflineBanner } from "./OfflineBanner";

const setOnline = (online: boolean) => {
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
};

const renderBanner = (locale: "pt-BR" | "en-US" = "pt-BR") =>
  render(
    <I18nProvider locale={locale}>
      <OfflineBanner />
    </I18nProvider>,
  );

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("online: a região de status fica montada e vazia", () => {
    renderBanner();
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();
  });

  it("offline: mostra o aviso na mesma região (que já existia) e não é sticky", () => {
    renderBanner();
    const region = screen.getByRole("status");
    setOnline(false);
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent(/Você está sem internet\./);
    expect(region.innerHTML).not.toContain("sticky");
    expect(region.innerHTML).not.toContain("fixed");
  });

  it("ao voltar mostra 'Conexão restabelecida.' e some em 4 s", () => {
    renderBanner();
    setOnline(false);
    setOnline(true);
    expect(screen.getByRole("status")).toHaveTextContent("Conexão restabelecida.");
    act(() => {
      vi.advanceTimersByTime(3999);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Conexão restabelecida.");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("cair de novo durante a confirmação troca de volta para o aviso de offline", () => {
    renderBanner();
    setOnline(false);
    setOnline(true);
    setOnline(false);
    expect(screen.getByRole("status")).toHaveTextContent(/sem internet/);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/sem internet/);
  });

  it("em inglês usa os textos em inglês", () => {
    renderBanner("en-US");
    setOnline(false);
    expect(screen.getByRole("status")).toHaveTextContent("You're offline.");
    setOnline(true);
    expect(screen.getByRole("status")).toHaveTextContent("Connection restored.");
  });
});
