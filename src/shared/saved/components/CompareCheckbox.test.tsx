import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "../../ui/toast/Toaster";
import { useToastStore } from "../../ui/toast/toast-store";
import { useCompareAnnouncer } from "../stores/announcer";
import { useComparisonStore } from "../stores/comparison";
import { CompareCheckbox } from "./CompareCheckbox";

vi.mock(
  "next/navigation",
  async () => (await import("../../testing/next-navigation")).navigationMock,
);

const hotel = (id: number) => ({ id, name: `Hotel ${id}` });

beforeEach(() => {
  window.localStorage.clear();
  useComparisonStore.setState({ items: [] });
  useToastStore.setState({ toasts: [] });
  useCompareAnnouncer.setState({ message: "" });
});

describe("CompareCheckbox", () => {
  it("marca, desmarca e anuncia entrada e saída", async () => {
    const user = userEvent.setup();
    render(<CompareCheckbox hotelId={1} hotelName="Hotel 1" />);
    const checkbox = screen.getByRole("checkbox", { name: "Comparar: Hotel 1" });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(useCompareAnnouncer.getState().message).toBe("Hotel 1 entrou na comparação. 1 de 3.");
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(useCompareAnnouncer.getState().message).toBe("Hotel 1 saiu da comparação.");
  });

  it("o 4º continua focável, com aria-disabled e dica, e clicar não marca e mostra o toast", async () => {
    const user = userEvent.setup();
    useComparisonStore.setState({ items: [hotel(1), hotel(2), hotel(3)] });
    render(
      <>
        <CompareCheckbox hotelId={9} hotelName="Hotel 9" />
        <Toaster />
      </>,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Comparar: Hotel 9" });
    expect(checkbox).toHaveAttribute("aria-disabled", "true");
    expect(checkbox).not.toBeDisabled();
    expect(checkbox).toHaveAccessibleDescription("Limite de 3 hotéis na comparação.");
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(/Você já está comparando 3 hotéis/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver comparação" })).toBeInTheDocument();
  });

  it("um hotel já marcado continua desmarcável com 3 na lista", async () => {
    const user = userEvent.setup();
    useComparisonStore.setState({ items: [hotel(1), hotel(2), hotel(3)] });
    render(<CompareCheckbox hotelId={2} hotelName="Hotel 2" />);
    const checkbox = screen.getByRole("checkbox", { name: "Comparar: Hotel 2" });
    expect(checkbox).not.toHaveAttribute("aria-disabled");
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
