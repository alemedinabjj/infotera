import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationSpies } from "../../testing/next-navigation";
import { Toaster } from "../../ui/toast/Toaster";
import { useToastStore } from "../../ui/toast/toast-store";
import { useFavoritesStore } from "../stores/favorites";
import { FavoriteButton } from "./FavoriteButton";

vi.mock(
  "next/navigation",
  async () => (await import("../../testing/next-navigation")).navigationMock,
);

beforeEach(() => {
  window.localStorage.clear();
  useFavoritesStore.setState({ items: [] });
  useToastStore.setState({ toasts: [] });
});

const setup = (onCardClick = vi.fn()) => {
  render(
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: só observa que o clique não vaza para o card */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: idem */}
      <div onClick={onCardClick}>
        <FavoriteButton hotelId={4} hotelName="Hotel Fasano" />
      </div>
      <Toaster />
    </>,
  );
  return screen.getByRole("button", { name: "Salvar nos favoritos: Hotel Fasano" });
};

describe("FavoriteButton", () => {
  it("favorita: aria-pressed, nome fixo e 1 toast com Ver favoritos", async () => {
    const user = userEvent.setup();
    const button = setup();
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("Salvar nos favoritos: Hotel Fasano");
    const status = screen.getByRole("status");
    expect(within(status).getByText("Hotel salvo nos favoritos.")).toBeInTheDocument();
    await user.click(within(status).getByRole("button", { name: "Ver favoritos" }));
    expect(navigationSpies.push).toHaveBeenCalledWith("/favorites");
  });

  it("5 cliques seguidos mantêm no máximo 1 toast desse hotel", async () => {
    const user = userEvent.setup();
    const button = setup();
    for (let index = 0; index < 5; index++) await user.click(button);
    expect(screen.getAllByText(/Hotel (salvo nos|removido dos) favoritos\./)).toHaveLength(1);
  });

  it("desfavoritar oferece Desfazer, que restaura com o addedAt original", async () => {
    const user = userEvent.setup();
    const button = setup();
    await user.click(button);
    const original = useFavoritesStore.getState().items[0]?.addedAt;
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(useFavoritesStore.getState().items[0]?.addedAt).toBe(original);
  });

  it("o clique não chega ao contêiner (o link do card não navega)", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const button = setup(onCardClick);
    await user.click(button);
    // o botão é irmão do link, não filho dele: o clique borbulha só para ancestrais comuns
    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(button.closest("a")).toBeNull();
  });

  it("no teto de 100 mostra o aviso e não marca", async () => {
    const user = userEvent.setup();
    useFavoritesStore.setState({
      items: Array.from({ length: 100 }, (_, index) => ({
        id: index + 100,
        addedAt: "2026-11-01T10:00:00.000Z",
      })),
    });
    const button = setup();
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(/100 hotéis nos favoritos/)).toBeInTheDocument();
    act(() => useToastStore.setState({ toasts: [] }));
  });
});
