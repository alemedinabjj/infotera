import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import * as navigation from "@/shared/lib/navigation";
import { Toaster } from "@/shared/ui/toast/Toaster";
import { useToastStore } from "@/shared/ui/toast/toast-store";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";

type Listener = () => void;

const ORIGINAL_NAVIGATOR = { ...window.navigator };

const mock = vi.hoisted(() => ({
  instances: [] as {
    url: string;
    options: unknown;
    listeners: Map<string, Listener>;
    register: () => Promise<undefined>;
    messageSkipWaiting: () => void;
  }[],
  skip: undefined as (() => void) | undefined,
}));

vi.mock("@serwist/window", () => ({
  Serwist: class {
    listeners = new Map<string, Listener>();
    register = vi.fn(async () => undefined);
    messageSkipWaiting = vi.fn(() => mock.skip?.());
    constructor(
      readonly url: string,
      readonly options: unknown,
    ) {
      mock.instances.push(this);
    }
    addEventListener(type: string, listener: Listener) {
      this.listeners.set(type, listener);
    }
    removeEventListener(type: string) {
      this.listeners.delete(type);
    }
  },
}));

const renderRegistrar = (locale: "pt-BR" | "en-US" = "pt-BR") =>
  render(
    <I18nProvider locale={locale}>
      <ServiceWorkerRegistrar />
      <Toaster />
    </I18nProvider>,
  );

describe("ServiceWorkerRegistrar", () => {
  beforeEach(() => {
    mock.instances.length = 0;
    useToastStore.setState({ toasts: [] });
    vi.stubGlobal("navigator", { ...ORIGINAL_NAVIGATOR, serviceWorker: {} });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("em desenvolvimento não registra nada", () => {
    renderRegistrar();
    expect(mock.instances).toHaveLength(0);
  });

  it("sem suporte a service worker não registra", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("navigator", { ...ORIGINAL_NAVIGATOR });
    renderRegistrar();
    expect(mock.instances).toHaveLength(0);
  });

  it("em produção registra /serwist/sw.js com escopo /", () => {
    vi.stubEnv("NODE_ENV", "production");
    renderRegistrar();
    expect(mock.instances).toHaveLength(1);
    expect(mock.instances[0]).toMatchObject({
      url: "/serwist/sw.js",
      options: { scope: "/", type: "classic" },
    });
    expect(mock.instances[0]?.register).toHaveBeenCalled();
  });

  it("versão em espera vira toast persistente com 'Atualizar'", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NODE_ENV", "production");
    renderRegistrar();
    act(() => mock.instances[0]?.listeners.get("waiting")?.());
    expect(screen.getByText("Nova versão disponível.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeInTheDocument();
    // Persistente: continua depois de muito mais que os 10 s de um toast com ação.
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(screen.getByText("Nova versão disponível.")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("'Atualizar' manda SKIP_WAITING e recarrega quando a versão nova assume", async () => {
    const reload = vi.spyOn(navigation, "reloadPage").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    renderRegistrar();
    act(() => mock.instances[0]?.listeners.get("waiting")?.());
    mock.skip = () => mock.instances[0]?.listeners.get("controlling")?.();
    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(mock.instances[0]?.messageSkipWaiting).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    mock.skip = undefined;
  });

  it("dois avisos seguidos não empilham (mesma chave)", () => {
    vi.stubEnv("NODE_ENV", "production");
    renderRegistrar();
    act(() => {
      mock.instances[0]?.listeners.get("waiting")?.();
      mock.instances[0]?.listeners.get("waiting")?.();
    });
    expect(screen.getAllByText("Nova versão disponível.")).toHaveLength(1);
  });

  it("em inglês o aviso e a ação vêm em inglês", () => {
    vi.stubEnv("NODE_ENV", "production");
    renderRegistrar("en-US");
    act(() => mock.instances[0]?.listeners.get("waiting")?.());
    expect(screen.getByText("New version available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
  });
});
