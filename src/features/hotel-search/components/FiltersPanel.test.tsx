import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { useSearchFilters } from "../hooks/useSearchFilters";
import { FiltersPanel } from "./FiltersPanel";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const CRITERIA =
  "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";

const Harness = () => {
  const { filters, update } = useSearchFilters();
  return <FiltersPanel filters={filters} onChange={update} />;
};

const start = (query = "") => {
  setTestUrl(`/search?${CRITERIA}${query}`);
  return render(<Harness />);
};

const search = () => window.location.search.slice(1);
const plain = (text: string | null | undefined) => (text ?? "").replaceAll(" ", " ");

describe("FiltersPanel: estrutura e acessibilidade", () => {
  it("grupos em fieldset com legend e controles rotulados", () => {
    start();
    for (const name of ["Preço por noite", "Nota mínima", "Tipo de hospedagem", "Comodidades"]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("checkbox", { name: "Piscina" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3 + 15);
    expect(screen.getByLabelText("Mínimo")).toHaveAttribute("type", "range");
    expect(screen.getByRole("radio", { name: "Qualquer nota" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "4,5 ou mais Excelente" })).toBeInTheDocument();
  });
});

describe("FiltersPanel: comodidades, tipos e nota (critérios 9 a 11)", () => {
  it("Piscina e Spa gravam amenity repetido, voltam à página 1 e o foco fica no checkbox", async () => {
    const user = userEvent.setup();
    start("&page=2");
    const pool = screen.getByRole("checkbox", { name: "Piscina" });
    await user.click(pool);
    await user.click(screen.getByRole("checkbox", { name: "Spa" }));
    expect(search()).toBe(`${CRITERIA}&amenity=pool&amenity=spa`);
    expect(screen.getByRole("checkbox", { name: "Spa" })).toHaveFocus();
    expect(pool).toBeChecked();
  });

  it("tipos: Pousada e Resort (OU) gravam type repetido; desmarcar remove", async () => {
    const user = userEvent.setup();
    start();
    await user.click(screen.getByRole("checkbox", { name: "Resort" }));
    await user.click(screen.getByRole("checkbox", { name: "Pousada" }));
    expect(search()).toBe(`${CRITERIA}&type=pousada&type=resort`);
    await user.click(screen.getByRole("checkbox", { name: "Pousada" }));
    expect(search()).toBe(`${CRITERIA}&type=resort`);
  });

  it("nota: radio grava minRating e 'Qualquer nota' remove", async () => {
    const user = userEvent.setup();
    start();
    await user.click(screen.getByRole("radio", { name: "4,5 ou mais Excelente" }));
    expect(search()).toBe(`${CRITERIA}&minRating=4.5`);
    expect(screen.getByRole("radio", { name: "4,5 ou mais Excelente" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Qualquer nota" }));
    expect(search()).toBe(CRITERIA);
  });

  it("recarregar a URL restaura os controles marcados (critério 14)", () => {
    start("&minRating=4&type=hotel&amenity=wifi&amenity=bar&minPrice=200&maxPrice=900");
    expect(screen.getByRole("radio", { name: "4,0 ou mais Muito bom" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hotel" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Wi-Fi" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Bar" })).toBeChecked();
    expect(screen.getByLabelText("Mínimo")).toHaveValue("200");
    expect(screen.getByLabelText("Máximo")).toHaveValue("900");
  });
});

describe("FiltersPanel: sliders de preço (critério 12)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("rótulo, aria-valuetext em reais e topo 'ou mais'", () => {
    start();
    expect(plain(screen.getByLabelText("Mínimo").getAttribute("aria-valuetext"))).toBe("R$ 0");
    expect(plain(screen.getByLabelText("Máximo").getAttribute("aria-valuetext"))).toBe(
      "R$ 3.000 ou mais",
    );
  });

  it("mover o máximo atualiza o texto na hora e grava a URL uma vez, 400 ms depois", async () => {
    start();
    const replaceState = vi.spyOn(window.history, "replaceState");
    const max = screen.getByLabelText("Máximo");
    fireEvent.change(max, { target: { value: "1000" } });
    fireEvent.change(max, { target: { value: "500" } });
    expect(plain(max.getAttribute("aria-valuetext"))).toBe("R$ 500");
    expect(screen.getByText("Até R$ 500", { exact: false })).toBeInTheDocument();
    expect(search()).toBe(CRITERIA);
    await act(() => vi.advanceTimersByTimeAsync(399));
    expect(replaceState).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(search()).toBe(`${CRITERIA}&maxPrice=500`);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(replaceState).toHaveBeenCalledTimes(1);
  });

  it("o mínimo nunca ultrapassa o máximo", async () => {
    start("&minPrice=200&maxPrice=900");
    fireEvent.change(screen.getByLabelText("Mínimo"), { target: { value: "2000" } });
    expect(screen.getByLabelText("Mínimo")).toHaveValue("900");
    expect(screen.getByLabelText("Máximo")).toHaveValue("900");
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(search()).toBe(`${CRITERIA}&minPrice=900&maxPrice=900`);
  });

  it("voltar ao topo do máximo omite o param", async () => {
    start("&maxPrice=500");
    fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "3000" } });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(search()).toBe(CRITERIA);
  });

  it("o foco fica no slider depois da gravação", async () => {
    start();
    const max = screen.getByLabelText("Máximo");
    max.focus();
    fireEvent.change(max, { target: { value: "800" } });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(max).toHaveFocus();
  });
});

describe("FiltersPanel: limpar filtros (critério 16)", () => {
  it("fica aria-disabled sem filtros ativos e não faz nada", async () => {
    const user = userEvent.setup();
    start("&sort=price-asc");
    const clear = screen.getByRole("button", { name: "Limpar filtros" });
    expect(clear).toHaveAttribute("aria-disabled", "true");
    await user.click(clear);
    expect(search()).toBe(`${CRITERIA}&sort=price-asc`);
  });

  it("zera tudo, mantém a ordenação, devolve os controles ao padrão e o foco fica no botão", async () => {
    const user = userEvent.setup();
    start("&minPrice=200&maxPrice=900&minRating=4&type=hotel&amenity=pool&sort=price-asc&page=2");
    const clear = screen.getByRole("button", { name: "Limpar filtros" });
    expect(clear).not.toHaveAttribute("aria-disabled");
    await user.click(clear);
    expect(search()).toBe(`${CRITERIA}&sort=price-asc`);
    expect(screen.getByLabelText("Mínimo")).toHaveValue("0");
    expect(screen.getByLabelText("Máximo")).toHaveValue("3000");
    expect(screen.getByText("Qualquer preço")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Qualquer nota" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Piscina" })).not.toBeChecked();
    expect(clear).toHaveFocus();
    expect(clear).toHaveAttribute("aria-disabled", "true");
  });

  it("Voltar do navegador ressincroniza os sliders", () => {
    start("&maxPrice=500");
    expect(screen.getByLabelText("Máximo")).toHaveValue("500");
    act(() => {
      window.history.replaceState(null, "", `/search?${CRITERIA}&maxPrice=1500`);
    });
    expect(screen.getByLabelText("Máximo")).toHaveValue("1500");
    const priceGroup = screen.getByRole("group", { name: "Preço por noite" });
    expect(plain(within(priceGroup).getByText(/Até/).textContent)).toBe("Até R$ 1.500");
  });
});
