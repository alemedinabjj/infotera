import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayISO } from "@/shared/lib/dates";
import { renderWithProviders } from "@/shared/testing/render";
import { SearchForm } from "./SearchForm";

const push = vi.fn<(url: string, options?: { scroll?: boolean }) => void>();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => localStorage.clear());
afterEach(() => push.mockReset());

const fillDates = (checkIn: string, checkOut: string) => {
  fireEvent.change(screen.getByLabelText(/Check-in/), { target: { value: checkIn } });
  fireEvent.change(screen.getByLabelText(/Check-out/), { target: { value: checkOut } });
};

describe("SearchForm: destino fixo e envio customizado", () => {
  it("destino fixo vira texto, sem combobox", () => {
    renderWithProviders(<SearchForm fixedDestination="Rio de Janeiro, RJ" />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Destino")).toBeInTheDocument();
    expect(screen.getByText("Rio de Janeiro, RJ")).toBeInTheDocument();
  });

  it("envia para o href da prop, sem rolar a página, com os rótulos customizados", async () => {
    const user = userEvent.setup();
    const getSubmitHref = vi.fn((c: { checkIn: string }) => `/hotel/1?checkIn=${c.checkIn}`);
    renderWithProviders(
      <SearchForm
        fixedDestination="Rio de Janeiro, RJ"
        getSubmitHref={getSubmitHref}
        submitLabel="Ver disponibilidade"
        submitLoadingText="Atualizando…"
        showRecentSearches={false}
      />,
    );
    const checkIn = addDays(todayISO(), 30);
    fillDates(checkIn, addDays(todayISO(), 33));
    await user.click(screen.getByRole("button", { name: "Ver disponibilidade" }));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith(`/hotel/1?checkIn=${checkIn}`, { scroll: false });
    expect(getSubmitHref).toHaveBeenCalledWith(
      expect.objectContaining({ destination: "Rio de Janeiro, RJ", rooms: 1, adults: 2 }),
    );
  });

  it("sem destino fixo nem href, o envio continua indo para /search", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SearchForm initialCriteria={{ destination: "Gramado, RS" }} showRecentSearches={false} />,
    );
    const checkIn = addDays(todayISO(), 5);
    const checkOut = addDays(todayISO(), 7);
    fillDates(checkIn, checkOut);
    await user.click(screen.getByRole("button", { name: "Buscar hotéis" }));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith(
      `/search?destination=Gramado%2C+RS&checkIn=${checkIn}&checkOut=${checkOut}&rooms=1&adults=2&children=0`,
    );
  });

  it("em /en, o envio padrão fica em /en/search", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SearchForm initialCriteria={{ destination: "Gramado, RS" }} showRecentSearches={false} />,
      { locale: "en-US" },
    );
    const checkIn = addDays(todayISO(), 5);
    const checkOut = addDays(todayISO(), 7);
    fillDates(checkIn, checkOut);
    await user.click(screen.getByRole("button", { name: "Search hotels" }));
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith(
      `/en/search?destination=Gramado%2C+RS&checkIn=${checkIn}&checkOut=${checkOut}&rooms=1&adults=2&children=0`,
    );
  });
});
