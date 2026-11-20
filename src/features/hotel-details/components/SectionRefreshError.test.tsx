import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { setStayCriteria } from "../testing/stay-aware";
import { FromPrice } from "./FromPrice";
import { ReviewsSection } from "./ReviewsSection";
import { RoomsSection } from "./RoomsSection";

// O ramo de erro só existe por request (`RequestOnly`, RSC assíncrono): aqui o conteúdo entra direto.
vi.mock("./RequestOnly", () => ({
  RequestOnly: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./StayAware", async () => (await import("../testing/stay-aware")).stayAwareMock);
vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

afterEach(() => {
  setStayCriteria(null);
  navigationSpies.refresh.mockClear();
});

describe("falha do catálogo no servidor (critério 24 da F4)", () => {
  it("quartos: erro da seção com 'Tentar de novo', que refaz a página; foco no h2 ao recuperar", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(
      <>
        <h2 id="quartos-titulo" tabIndex={-1}>
          Quartos
        </h2>
        <RoomsSection
          locale="pt-BR"
          hotelId={1}
          rooms={{ kind: "error" }}
          hotelAvailableRooms={3}
          cancellationPolicy="free"
          criteria={Promise.resolve(null)}
        />
      </>,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Não foi possível carregar os quartos." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(navigationSpies.refresh).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("comentários: erro da seção, a nota agregada continua", () => {
    const { container } = renderWithProviders(
      <ReviewsSection
        locale="pt-BR"
        hotelId={1}
        rating={4.7}
        reviewCount={2000}
        first={{ kind: "error" }}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Não foi possível carregar as avaliações." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(container).toHaveTextContent("2.000 avaliações");
  });

  it("'a partir de': 'Preços indisponíveis no momento.'", () => {
    renderWithProviders(<FromPrice locale="pt-BR" rooms={{ kind: "error" }} />);
    expect(screen.getByText("Preços indisponíveis no momento.")).toBeInTheDocument();
  });
});
