import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeRoom } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { RoomCard } from "./RoomCard";
import { RoomSelectionProvider } from "./RoomSelectionContext";
import { StayEditProvider } from "./StayEditContext";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const pendingCriteria = new Promise<never>(() => undefined);

describe("RoomStayAction: o buraco na casca (critério 5)", () => {
  it("com os critérios pendentes o card mostra o fallback: aria-hidden, sem pulso e sem 'Selecionar'", () => {
    const { container } = renderWithProviders(
      <StayEditProvider>
        <RoomSelectionProvider>
          <ul>
            <RoomCard
              locale="pt-BR"
              hotelId={1}
              room={makeRoom({ id: 5, name: "Quarto Duplo", available: 9 })}
              otherRooms
              cancellationPolicy="free"
              criteria={pendingCriteria}
            />
          </ul>
        </RoomSelectionProvider>
      </StayEditProvider>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Quarto Duplo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Selecionar quarto/ })).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll("[aria-hidden='true'].animate-none");
    expect(skeletons.length).toBeGreaterThan(0);
    // Nenhum pulso (que diria "carregando" para sempre sem JS).
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });
});
