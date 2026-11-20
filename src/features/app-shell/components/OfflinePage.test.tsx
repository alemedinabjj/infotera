import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import { OFFLINE_ROUTES } from "@/shared/i18n/paths";
import * as navigation from "@/shared/lib/navigation";
import type { OfflineVariant } from "../model/cache-rules";
import { OfflinePage } from "./OfflinePage";

const renderPage = (locale: "pt-BR" | "en-US", variant: OfflineVariant = "public") =>
  render(
    <I18nProvider locale={locale}>
      <OfflinePage variant={variant} />
    </I18nProvider>,
  );

const BANNER = /Você está sem internet|You're offline/;

describe("OfflinePage", () => {
  it.each([
    ["public", "Esta página não está disponível offline", /ainda não foi salva neste aparelho/],
    ["checkout", "A reserva precisa de internet", /Nada foi cobrado/],
    ["bookings", "Suas reservas precisam de internet", /não ficam salvos neste aparelho/],
  ] as const)("pt-BR %s: h1 próprio (nunca o do banner) e orientação", (variant, title, text) => {
    renderPage("pt-BR", variant);
    const heading = screen.getByRole("heading", { level: 1, name: title });
    expect(heading).not.toHaveTextContent(BANNER);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
  });

  it.each([
    ["public", "This page isn't available offline"],
    ["checkout", "Booking needs an internet connection"],
    ["bookings", "Your bookings need an internet connection"],
  ] as const)("en-US %s: título em inglês, 'Go to homepage' e link para /en", (variant, title) => {
    renderPage("en-US", variant);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to homepage" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("'Tentar de novo' é o primário, 'Ir para o início' é ghost, e as ações ocupam a largura no celular", () => {
    renderPage("pt-BR");
    const retry = screen.getByRole("button", { name: "Tentar de novo" });
    expect(retry.className).toContain("bg-primary");
    expect(retry).toHaveClass("w-full");
    const home = screen.getByRole("link", { name: "Ir para o início" });
    expect(home.className).not.toContain("bg-primary ");
    expect(home).toHaveClass("w-full");
  });

  it("'Tentar de novo' recarrega a página e mostra 'Tentando…'", async () => {
    const reload = vi.spyOn(navigation, "reloadPage").mockImplementation(() => undefined);
    renderPage("pt-BR");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Tentando…" })).toHaveAttribute("aria-busy", "true");
  });

  it("as três rotas offline existem no roteamento", () => {
    expect(OFFLINE_ROUTES).toEqual(["/offline", "/offline/checkout", "/offline/bookings"]);
  });
});
