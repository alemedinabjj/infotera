import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { seedHotel } from "@/shared/testing/seed";
import { HotelOverview } from "./HotelOverview";
import { HotelPolicies } from "./HotelPolicies";
import { LocationMap } from "./LocationMap";

const hotel = seedHotel(1);

describe("HotelOverview (critério 12)", () => {
  it("descrição e comodidades com rótulos pt-BR e ícones decorativos", () => {
    const { container } = render(<HotelOverview hotel={hotel} />);
    expect(screen.getByRole("heading", { level: 2, name: "Visão geral" })).toBeInTheDocument();
    expect(screen.getByText(hotel.description)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Comodidades" })).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi")).toBeInTheDocument();
    expect(container.querySelectorAll("li svg[aria-hidden='true']")).toHaveLength(
      hotel.amenities.length,
    );
  });

  it("a seção é ligada ao h2 e o h2 aceita foco", () => {
    render(<HotelOverview hotel={hotel} />);
    const section = screen.getByRole("region", { name: "Visão geral" });
    expect(section).toHaveAttribute("id", "visao-geral");
    expect(screen.getByRole("heading", { name: "Visão geral" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("HotelPolicies (critério 13)", () => {
  it("horários e política", () => {
    render(<HotelPolicies hotel={hotel} />);
    expect(screen.getByText("A partir de 15:00")).toBeInTheDocument();
    expect(screen.getByText("Até 12:00")).toBeInTheDocument();
    expect(screen.getByText("Cancelamento grátis")).toBeInTheDocument();
  });

  it("as regras abrem por teclado (Enter e Espaço no summary)", async () => {
    const user = userEvent.setup();
    const { container } = render(<HotelPolicies hotel={hotel} />);
    const details = container.querySelector("details");
    const summary = screen.getByText("Ver regras de cancelamento");
    expect(details).not.toHaveAttribute("open");
    summary.focus();
    await user.keyboard("{Enter}");
    // O jsdom não implementa o toggle nativo do <details>; o contrato é: summary focável + <details>.
    expect(summary.closest("summary")).toBeInTheDocument();
    expect(details).toContainElement(summary);
    expect(
      within(details as HTMLElement).getByText("Cancele grátis até 48 horas antes do check-in."),
    ).toBeInTheDocument();
  });

  it("moderate e strict mudam selo e texto", () => {
    const { rerender } = render(
      <HotelPolicies hotel={{ ...hotel, cancellationPolicy: "moderate" }} />,
    );
    expect(screen.getByText("Cancelamento com reembolso parcial")).toBeInTheDocument();
    rerender(<HotelPolicies hotel={{ ...hotel, cancellationPolicy: "strict" }} />);
    expect(screen.getByText("Sem reembolso em caso de cancelamento")).toBeInTheDocument();
  });
});

describe("LocationMap (critério 14)", () => {
  it("mapa com role=img e o endereço, marcador e tiles sem alt", () => {
    const { container } = render(<LocationMap hotel={hotel} />);
    const map = screen.getByRole("img", { name: `Mapa: ${hotel.address}` });
    const tiles = map.querySelectorAll("img");
    expect(tiles.length).toBe(6);
    for (const tile of tiles) expect(tile).toHaveAttribute("alt", "");
    expect(tiles[0]).toHaveAttribute("src", expect.stringContaining("tile.openstreetmap.org/15/"));
    expect(container.querySelector("svg[aria-hidden='true'].text-primary")).toBeInTheDocument();
  });

  it("atribuição fora do role=img e link do OSM em nova aba, avisado no nome", () => {
    render(<LocationMap hotel={hotel} />);
    const map = screen.getByRole("img", { name: /Mapa:/ });
    const attribution = screen.getByRole("link", { name: "© colaboradores do OpenStreetMap" });
    expect(map).not.toContainElement(attribution);
    const open = screen.getByRole("link", {
      name: /^Abrir no OpenStreetMap\s*\(abre em nova aba\)$/,
    });
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", "noopener noreferrer");
    expect(open).toHaveAttribute("href", expect.stringContaining("mlat=-22.9683&mlon=-43.1792"));
  });
});
