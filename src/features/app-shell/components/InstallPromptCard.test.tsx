import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import { Toaster } from "@/shared/ui/toast/Toaster";
import { useToastStore } from "@/shared/ui/toast/toast-store";
import { useInstallStore } from "../store/install-store";
import { InstallPromptCard } from "./InstallPromptCard";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";

vi.mock("@serwist/window", () => ({
  Serwist: class {
    addEventListener() {}
    removeEventListener() {}
    register() {
      return Promise.resolve(undefined);
    }
  },
}));

const DISMISSED_KEY = "infotera:install-dismissed-at";

const mockStandalone = (standalone: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: standalone,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
};

/** O evento do Chromium: sintético, com `prompt()` e `userChoice`. */
const fireInstallPrompt = () => {
  const prompt = vi.fn(async () => undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
};

const renderCard = (locale: "pt-BR" | "en-US" = "pt-BR") =>
  render(
    <I18nProvider locale={locale}>
      <InstallPromptCard />
    </I18nProvider>,
  );

describe("InstallPromptCard", () => {
  beforeEach(() => {
    useInstallStore.setState({ event: null, installed: false });
    window.localStorage.clear();
    mockStandalone(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sem o evento do navegador não aparece", () => {
    renderCard();
    expect(screen.queryByText("Instale o Infotera Hotéis")).not.toBeInTheDocument();
  });

  it("com beforeinstallprompt mostra o cartão (e impede o mini-infobar do navegador)", () => {
    renderCard();
    const { event } = fireInstallPrompt();
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("heading", { name: "Instale o Infotera Hotéis" })).toBeInTheDocument();
    expect(screen.getByText("Abra suas buscas mais rápido, até sem internet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Instalar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agora não" })).toBeInTheDocument();
  });

  it("'Instalar' chama prompt() uma vez e o cartão some", async () => {
    renderCard();
    const { prompt } = fireInstallPrompt();
    await userEvent.click(screen.getByRole("button", { name: "Instalar" }));
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("heading", { name: "Instale o Infotera Hotéis" }),
    ).not.toBeInTheDocument();
  });

  it("'Agora não' grava o momento (ISO), esconde e sobrevive a um recarregamento", async () => {
    const { unmount } = renderCard();
    fireInstallPrompt();
    await userEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(screen.queryByRole("button", { name: "Instalar" })).not.toBeInTheDocument();
    const stored = window.localStorage.getItem(DISMISSED_KEY);
    expect(JSON.parse(stored ?? "null")).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    unmount();

    // Recarregou: o navegador entrega o evento de novo, mas a dispensa vale 30 dias.
    useInstallStore.setState({ event: null });
    renderCard();
    fireInstallPrompt();
    expect(screen.queryByRole("button", { name: "Instalar" })).not.toBeInTheDocument();
  });

  it("dispensa de mais de 30 dias não vale mais", () => {
    const old = new Date(Date.now() - 31 * 86_400_000).toISOString();
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(old));
    renderCard();
    fireInstallPrompt();
    expect(screen.getByRole("button", { name: "Instalar" })).toBeInTheDocument();
  });

  it("já em modo standalone nunca aparece", () => {
    mockStandalone(true);
    renderCard();
    fireInstallPrompt();
    expect(screen.queryByRole("button", { name: "Instalar" })).not.toBeInTheDocument();
  });

  it("em inglês", () => {
    renderCard("en-US");
    fireInstallPrompt();
    expect(screen.getByRole("heading", { name: "Install Infotera Hotéis" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("appinstalled esconde o cartão e mostra o toast 'App instalado.'", () => {
    useToastStore.setState({ toasts: [] });
    render(
      <I18nProvider locale="pt-BR">
        <InstallPromptCard />
        <ServiceWorkerRegistrar />
        <Toaster />
      </I18nProvider>,
    );
    fireInstallPrompt();
    expect(screen.getByRole("button", { name: "Instalar" })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(screen.queryByRole("button", { name: "Instalar" })).not.toBeInTheDocument();
    expect(screen.getByText("App instalado.")).toBeInTheDocument();
  });
});
