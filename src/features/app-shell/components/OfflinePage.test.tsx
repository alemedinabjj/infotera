import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import * as navigation from "@/shared/lib/navigation";
import { OfflinePage } from "./OfflinePage";

const renderPage = (locale: "pt-BR" | "en-US") =>
  render(
    <I18nProvider locale={locale}>
      <OfflinePage />
    </I18nProvider>,
  );

describe("OfflinePage", () => {
  it("pt-BR: título h1, orientação e as duas saídas", () => {
    renderPage("pt-BR");
    expect(
      screen.getByRole("heading", { level: 1, name: "Você está sem internet" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ainda não foi salva para uso offline/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o início" })).toHaveAttribute("href", "/");
  });

  it("en-US: texto em inglês e link para /en", () => {
    renderPage("en-US");
    expect(screen.getByRole("heading", { level: 1, name: "You're offline" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the start page" })).toHaveAttribute(
      "href",
      "/en",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("'Tentar de novo' recarrega a página", async () => {
    const reload = vi.spyOn(navigation, "reloadPage").mockImplementation(() => undefined);
    renderPage("pt-BR");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
