import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTestUrl } from "../../testing/next-navigation";
import { useFavoritesStore } from "../stores/favorites";
import { SavedNav } from "./SavedNav";

vi.mock(
  "next/navigation",
  async () => (await import("../../testing/next-navigation")).navigationMock,
);

beforeEach(() => {
  setTestUrl("/");
  useFavoritesStore.setState({ items: [] });
});

describe("SavedNav", () => {
  it("sem favoritos: nome acessível 'nenhum hotel' e contador reservado e invisível", () => {
    render(<SavedNav />);
    const link = screen.getByRole("link", { name: "Favoritos, nenhum hotel" });
    expect(link).toHaveAttribute("href", "/favorites");
    expect(link.querySelector("span[aria-hidden]")).toHaveClass("invisible", "min-w-5");
  });

  it.each([
    [1, "Favoritos, 1 hotel"],
    [3, "Favoritos, 3 hotéis"],
  ])("com %s favorito(s): %s", (count, name) => {
    useFavoritesStore.setState({
      items: Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        addedAt: "2026-11-01T10:00:00.000Z",
      })),
    });
    render(<SavedNav />);
    const link = screen.getByRole("link", { name });
    expect(link).toHaveTextContent(String(count));
    expect(link.querySelector("span[aria-hidden]")).not.toHaveClass("invisible");
  });

  it("marca a rota atual com aria-current", () => {
    setTestUrl("/my-bookings");
    render(<SavedNav />);
    expect(screen.getByRole("link", { name: "Minhas reservas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Favoritos/ })).not.toHaveAttribute("aria-current");
  });
});
