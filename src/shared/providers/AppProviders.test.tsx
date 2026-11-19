import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useBookingDraft } from "../stores/booking-draft";
import { AppProviders } from "./AppProviders";

const Probe = () => {
  const client = useQueryClient();
  return (
    <p>{client.getDefaultOptions().queries?.staleTime === 60_000 ? "client ok" : "client?"}</p>
  );
};

describe("AppProviders", () => {
  it("disponibiliza o QueryClient e monta as regiões do Toaster", () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByText("client ok")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("reidrata o rascunho no mount", () => {
    window.sessionStorage.setItem(
      "infotera:booking-draft",
      JSON.stringify({ state: { selection: null }, version: 1 }),
    );
    render(<AppProviders>{null}</AppProviders>);
    expect(useBookingDraft.persist.hasHydrated()).toBe(true);
  });
});
