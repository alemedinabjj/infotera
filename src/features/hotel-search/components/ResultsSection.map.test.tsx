import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import type { ResultsView } from "../model/results-view";
import { ResultsSection } from "./ResultsSection";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);
vi.mock("@/shared/hooks/useOnline", () => ({ useOnline: () => true }));
vi.mock("@/shared/ui/map", () => ({
  useInteractiveMap: () => ({ status: "loading" }),
  MapHint: ({ id }: { id: string }) => <p id={id} />,
}));

const hotels = [makeHotel({ id: 1 }), makeHotel({ id: 2, name: "Outro" })];

const renderSection = (view: ResultsView, mapOpen: boolean) =>
  renderWithProviders(
    <ResultsSection
      view={view}
      hotels={hotels}
      center={null}
      total={2}
      page={1}
      destination="Rio de Janeiro, RJ"
      criteria={null}
      selectedAmenities={[]}
      pageHref={() => "/search"}
      onRetry={() => undefined}
      retrying={false}
      onClearFilters={() => undefined}
      headingId="h"
      feed={null}
      mapOpen={mapOpen}
      mapPanelId="painel"
    />,
  );

describe("ResultsSection: painel do mapa", () => {
  it("visão results com o mapa aberto mostra o painel acima da lista", () => {
    renderSection(
      { kind: "results", stale: false, offlineWithData: false, staleOffline: false },
      true,
    );
    const panel = document.getElementById("painel");
    const list = screen.getAllByRole("list")[0];
    expect(panel).toBeInTheDocument();
    expect(list && panel?.compareDocumentPosition(list)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("mapa fechado: sem painel", () => {
    renderSection(
      { kind: "results", stale: false, offlineWithData: false, staleOffline: false },
      false,
    );
    expect(document.getElementById("painel")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pular o mapa" })).not.toBeInTheDocument();
  });

  it.each<ResultsView>([
    { kind: "loading" },
    { kind: "error" },
    { kind: "offline" },
    { kind: "empty-filters" },
    { kind: "empty-destination" },
  ])("visão %j com o mapa aberto não mostra o painel", (view) => {
    renderSection(view, true);
    expect(document.getElementById("painel")).not.toBeInTheDocument();
  });
});
