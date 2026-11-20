import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import { ResolvedStayBar } from "./HotelStayBar";
import { StayEditProvider } from "./StayEditContext";

const calls = vi.hoisted(() => ({ order: [] as string[] }));
vi.mock("next/server", () => ({
  connection: async () => {
    calls.order.push("connection");
  },
}));
vi.mock("@/shared/lib/dates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/dates")>()),
  todayISO: () => {
    calls.order.push("todayISO");
    return "2026-06-10";
  },
}));

const future = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });
const past = makeSearchCriteria({ checkIn: "2026-05-01", checkOut: "2026-05-04" });

const renderBar = async (criteria: typeof future | null) => {
  const element = await ResolvedStayBar({
    locale: "pt-BR",
    criteria: Promise.resolve(criteria),
    renderDatesForm: () => <form aria-label="Datas" />,
  });
  return render(<StayEditProvider>{element}</StayEditProvider>);
};

beforeEach(() => {
  calls.order.length = 0;
});

describe("HotelStayBar (buraco 1)", () => {
  it("com datas: resumo da estadia e o botão de alterar, sem aviso", async () => {
    await renderBar(future);
    expect(screen.getByText("12–15 dez · 3 noites · 2 adultos · 1 quarto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alterar datas e hóspedes/ })).toBeInTheDocument();
    expect(screen.queryByText("As datas desta busca já passaram")).not.toBeInTheDocument();
  });

  it("sem datas: 'Escolha as datas' e o formulário já aberto", async () => {
    await renderBar(null);
    expect(screen.getByText("Escolha as datas para reservar")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Datas" })).toBeInTheDocument();
  });

  it("com datas passadas: avisa que já passaram", async () => {
    await renderBar(past);
    expect(screen.getByText("As datas desta busca já passaram")).toBeInTheDocument();
  });

  it("'hoje' só é lido depois de connection() (nunca na casca estática)", async () => {
    await renderBar(future);
    expect(calls.order.slice(0, 2)).toEqual(["connection", "todayISO"]);
  });
});
