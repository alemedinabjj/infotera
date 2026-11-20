import { act, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { navigationSpies, setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { PhotoLink } from "./PhotoLink";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const setOnline = (online: boolean) => {
  vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
};

const renderLink = () =>
  renderWithProviders(
    <PhotoLink href="/hotel/1/photos/3" label="Abrir foto 3 de 5">
      foto
    </PhotoLink>,
  );

afterEach(() => {
  vi.restoreAllMocks();
  navigationSpies.push.mockReset();
});

describe("PhotoLink offline (critério 18, U6)", () => {
  it("sem internet o clique não navega: mostra 'Você está sem internet' com 'Tentar de novo' focado", async () => {
    renderLink();
    setOnline(false);
    const link = screen.getByRole("link", { name: "Abrir foto 3 de 5" });
    // `fireEvent` devolve `false` quando o clique teve `preventDefault`.
    expect(fireEvent.click(link)).toBe(false);
    const dialog = await screen.findByRole("dialog", { name: "Fotos do hotel" });
    expect(dialog).toHaveTextContent("Você está sem internet");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveFocus();
    expect(navigationSpies.push).not.toHaveBeenCalled();
  });

  it("'Tentar de novo' continua offline sem navegar e, com a conexão de volta, abre a foto", async () => {
    const user = userEvent.setup();
    renderLink();
    setOnline(false);
    await user.click(screen.getByRole("link", { name: "Abrir foto 3 de 5" }));
    await user.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(navigationSpies.push).not.toHaveBeenCalled();
    setOnline(true);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(navigationSpies.push).toHaveBeenCalledWith("/hotel/1/photos/3", { scroll: false });
  });

  it("retry ainda offline anuncia 'Ainda não foi possível'; com a conexão de volta o cartão fica neutro", async () => {
    const user = userEvent.setup();
    renderLink();
    setOnline(false);
    await user.click(screen.getByRole("link", { name: "Abrir foto 3 de 5" }));
    const dialog = await screen.findByRole("dialog", { name: "Fotos do hotel" });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ainda não foi possível abrir a foto. Tente de novo.",
    );
    setOnline(true);
    expect(dialog).toHaveTextContent("Conexão de volta");
    expect(dialog).toHaveTextContent("Tente de novo.");
    expect(dialog).not.toHaveTextContent("Não foi possível abrir a foto");
  });

  it("'Fechar' fecha o estado offline e devolve o foco ao link", async () => {
    const user = userEvent.setup();
    renderLink();
    setOnline(false);
    const link = screen.getByRole("link", { name: "Abrir foto 3 de 5" });
    await user.click(link);
    await user.click(await screen.findByRole("button", { name: "Fechar" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(link).toHaveFocus();
  });
});

describe("PhotoLink: carregamento na hora do clique (critério 18)", () => {
  it("o clique abre o modal 'Fotos do hotel' com 'Carregando foto…'; ele some quando o caminho muda", async () => {
    const user = userEvent.setup();
    setTestUrl("/hotel/1");
    renderLink();
    await user.click(screen.getByRole("link", { name: "Abrir foto 3 de 5" }));
    const dialog = await screen.findByRole("dialog", { name: "Fotos do hotel" });
    expect(dialog).toHaveTextContent("Carregando foto…");
    act(() => setTestUrl("/hotel/1/photos/3"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Fechar antes de a rota chegar esconde o modal e, quando ela chega, volta uma entrada", async () => {
    const user = userEvent.setup();
    navigationSpies.back.mockClear();
    setTestUrl("/hotel/1");
    renderLink();
    const link = screen.getByRole("link", { name: "Abrir foto 3 de 5" });
    await user.click(link);
    await user.click(await screen.findByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(navigationSpies.back).not.toHaveBeenCalled();
    act(() => setTestUrl("/hotel/1/photos/3"));
    expect(navigationSpies.back).toHaveBeenCalledOnce();
  });

  it("clique com Ctrl (nova aba) não abre nada", async () => {
    const user = userEvent.setup();
    setTestUrl("/hotel/1");
    renderLink();
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: "Abrir foto 3 de 5" }));
    await user.keyboard("{/Control}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
