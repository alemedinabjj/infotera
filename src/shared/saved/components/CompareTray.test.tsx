import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTestUrl } from "../../testing/next-navigation";
import { Toaster } from "../../ui/toast/Toaster";
import { useToastStore } from "../../ui/toast/toast-store";
import { useCompareAnnouncer } from "../stores/announcer";
import { useComparisonStore } from "../stores/comparison";
import { CompareTray } from "./CompareTray";

vi.mock(
  "next/navigation",
  async () => (await import("../../testing/next-navigation")).navigationMock,
);

const hotel = (id: number) => ({ id, name: `Hotel ${id}` });

const renderTray = () =>
  render(
    <>
      <main id="main-content" tabIndex={-1}>
        conteúdo
      </main>
      <CompareTray />
      <Toaster />
    </>,
  );

beforeEach(() => {
  window.localStorage.clear();
  setTestUrl("/search");
  useComparisonStore.setState({ items: [] });
  useToastStore.setState({ toasts: [] });
  useCompareAnnouncer.setState({ message: "" });
  document.documentElement.style.removeProperty("--bottom-bar-height");
});

describe("CompareTray", () => {
  it("não aparece sem hotéis, mas a região viva fica montada", () => {
    const { container } = renderTray();
    expect(screen.queryByRole("region", { name: "Comparação de hotéis" })).not.toBeInTheDocument();
    expect(container.querySelector("[aria-live='polite']")).toBeInTheDocument();
  });

  it("com 1 hotel mostra 'escolha mais 1' e o Comparar aria-disabled anuncia o motivo", async () => {
    const user = userEvent.setup();
    useComparisonStore.setState({ items: [hotel(1)] });
    const { container } = renderTray();
    expect(screen.getByText("1 de 3 hotéis · escolha mais 1")).toBeInTheDocument();
    const action = screen.getByRole("button", { name: "Comparar" });
    expect(action).toHaveAttribute("aria-disabled", "true");
    await user.click(action);
    expect(container.querySelector("[aria-live='polite']")).toHaveTextContent(
      "Escolha pelo menos 2 hotéis para comparar.",
    );
  });

  it("com 2 hotéis o Comparar é um link na ordem de inclusão", () => {
    useComparisonStore.setState({ items: [hotel(4), hotel(1)] });
    renderTray();
    expect(screen.getByText("2 de 3 hotéis")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Comparar 2 hotéis" })).toHaveAttribute(
      "href",
      "/compare?hotel=4&hotel=1",
    );
  });

  it.each(["/checkout", "/confirmation/abc123", "/compare"])("fica oculta em %s", (path) => {
    setTestUrl(path);
    useComparisonStore.setState({ items: [hotel(1), hotel(2)] });
    renderTray();
    expect(screen.queryByRole("link", { name: /Comparar/ })).not.toBeInTheDocument();
  });

  it("chips removem com nome acessível completo", async () => {
    const user = userEvent.setup();
    useComparisonStore.setState({ items: [hotel(1), hotel(2)] });
    renderTray();
    await user.click(screen.getByRole("button", { name: "Remover Hotel 1 da comparação" }));
    expect(useComparisonStore.getState().items.map((item) => item.id)).toEqual([2]);
    expect(useCompareAnnouncer.getState().message).toBe("Hotel 1 saiu da comparação.");
  });

  it("Limpar esvazia, leva o foco ao main e Desfazer restaura os 3", async () => {
    const user = userEvent.setup();
    useComparisonStore.setState({ items: [hotel(1), hotel(2), hotel(3)] });
    renderTray();
    const [clear] = screen.getAllByRole("button", { name: /Limpar/ });
    if (!clear) throw new Error("botão Limpar ausente");
    await user.click(clear);
    expect(useComparisonStore.getState().items).toEqual([]);
    expect(screen.getByRole("main")).toHaveFocus();
    const status = screen.getByRole("status");
    expect(within(status).getByText("Comparação limpa.")).toBeInTheDocument();
    await user.click(within(status).getByRole("button", { name: "Desfazer" }));
    expect(useComparisonStore.getState().items).toHaveLength(3);
  });

  it("grava a altura em --bottom-bar-height e volta a 0px ao sumir", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(68);
    useComparisonStore.setState({ items: [hotel(1), hotel(2)] });
    renderTray();
    expect(document.documentElement.style.getPropertyValue("--bottom-bar-height")).toBe("68px");
    act(() => useComparisonStore.setState({ items: [] }));
    expect(document.documentElement.style.getPropertyValue("--bottom-bar-height")).toBe("0px");
  });
});

describe("CompareTray: foco sob a bandeja", () => {
  const setup = () => {
    useComparisonStore.setState({ items: [hotel(1), hotel(2)] });
    render(
      <>
        <button type="button">alvo</button>
        <CompareTray />
      </>,
    );
    const tray = document.querySelector<HTMLElement>("[data-bottom-bar]");
    if (!tray) throw new Error("bandeja ausente");
    tray.getBoundingClientRect = () => new DOMRect(0, 700, 400, 80);
    const target = screen.getByRole("button", { name: "alvo" });
    target.getBoundingClientRect = () => new DOMRect(0, 680, 100, 44);
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    return { target, scrollIntoView };
  };

  it("foco por teclado sob a barra rola com block nearest", () => {
    const { target, scrollIntoView } = setup();
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => target.focus());
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("pointerdown seguido de foco (clique) nunca rola", () => {
    const { target, scrollIntoView } = setup();
    fireEvent.pointerDown(target);
    act(() => target.focus());
    fireEvent.pointerUp(target);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
