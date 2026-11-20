import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatBRL } from "@/shared/lib/currency";
import { addDays, todayISO } from "@/shared/lib/dates";
import { useBookingDraft } from "@/shared/stores/booking-draft";
import { makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { seedRooms } from "@/shared/testing/seed";
import { setStayCriteria } from "../testing/stay-aware";
import { RoomsSection } from "./RoomsSection";
import { StayEditProvider } from "./StayEditContext";

vi.mock("./StayAware", async () => (await import("../testing/stay-aware")).stayAwareMock);
vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const criteria = makeSearchCriteria({
  checkIn: addDays(todayISO(), 30),
  checkOut: addDays(todayISO(), 33),
  rooms: 1,
  adults: 2,
  children: 0,
});

type Rooms = ReturnType<typeof seedRooms>;

const plain = (value: string) => value.replaceAll("\u00a0", " ");

const assignLocation = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/shared/lib/navigation", () => ({ assignLocation }));

const renderRooms = async ({
  hotelId = 1,
  rooms = seedRooms(hotelId),
  search = criteria,
  hotelAvailableRooms = 12,
}: {
  hotelId?: number;
  rooms?: Rooms;
  search?: typeof criteria | null;
  hotelAvailableRooms?: number;
} = {}) => {
  setStayCriteria(search);
  let view: ReturnType<typeof renderWithProviders> | null = null;
  // `await act` com o render dentro: o Suspense dos buracos resolve a promessa dos critérios.
  await act(async () => {
    view = renderWithProviders(
      <StayEditProvider>
        <RoomsSection
          locale="pt-BR"
          hotelId={hotelId}
          rooms={{ kind: "ok", value: rooms }}
          hotelAvailableRooms={hotelAvailableRooms}
          cancellationPolicy="free"
          criteria={Promise.resolve(search)}
        />
      </StayEditProvider>,
    );
  });
  if (view === null) throw new Error("render falhou");
  return view;
};

const card = (name: string) =>
  screen.getByRole("heading", { level: 3, name }).closest("article") as HTMLElement;

beforeEach(() => {
  assignLocation.mockReset();
  sessionStorage.clear();
  useBookingDraft.setState({ selection: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  setStayCriteria(null);
});

describe("RoomsSection: com critérios (critério 15)", () => {
  it("foto, nome, fatos, comodidades, cancelamento, diária e total", async () => {
    await renderRooms();
    const suite = card("Suíte Deluxe Ocean View");
    expect(suite).toHaveTextContent("45 m²");
    expect(within(suite).getByText("Até 3 hóspedes")).toBeInTheDocument();
    expect(within(suite).getByText("1 cama king")).toBeInTheDocument();
    expect(within(suite).getByText("Vista para o mar")).toBeInTheDocument();
    expect(within(suite).getByText("+2 comodidades")).toBeInTheDocument();
    expect(within(suite).getByText("Cancelamento grátis")).toBeInTheDocument();
    expect(suite).toHaveTextContent(plain(formatBRL(4140, { locale: "pt-BR" })));
    expect(suite).toHaveTextContent("total com taxas · 3 noites · 1 quarto");
    expect(suite).toHaveTextContent("R$ 1.200 por noite, sem taxas");
    expect(suite).not.toHaveTextContent("a partir de");
    expect(card("Quarto Standard")).toHaveTextContent(plain(formatBRL(2760, { locale: "pt-BR" })));
    expect(screen.getAllByText("2 tipos de quarto")).toHaveLength(1);
  });

  it("as comodidades restantes ficam num details abaixo (nada acima se move)", async () => {
    await renderRooms();
    const details = card("Suíte Deluxe Ocean View").querySelector("details");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("Cofre")).toBeInTheDocument();
  });
});

describe("RoomsSection: selecionar (critério 16)", () => {
  it("grava no booking-draft e navega para /checkout; segundo clique é ignorado", async () => {
    const user = userEvent.setup();
    await renderRooms();
    const button = within(card("Suíte Deluxe Ocean View")).getByRole("button", {
      name: "Selecionar quarto: Suíte Deluxe Ocean View",
    });
    await user.click(button);
    expect(assignLocation).toHaveBeenCalledWith("/checkout");
    // O storage já está gravado quando o documento troca.
    const stored: unknown = JSON.parse(sessionStorage.getItem("infotera:booking-draft") ?? "{}");
    expect(stored).toMatchObject({
      state: { selection: { hotelId: 1, roomId: 1, criteria } },
    });
    await user.click(button);
    await user.click(
      within(card("Quarto Standard")).getByRole("button", { name: /Selecionar quarto/ }),
    );
    expect(assignLocation).toHaveBeenCalledTimes(1);
    expect(useBookingDraft.getState().selection?.roomId).toBe(1);
  });

  it("durante a navegação o botão mostra 'Selecionando…' e o card fica selecionado", async () => {
    const user = userEvent.setup();
    await renderRooms();
    await user.click(
      within(card("Suíte Deluxe Ocean View")).getByRole("button", { name: /Selecionar quarto/ }),
    );
    const selecting = await screen.findByRole("button", { name: "Selecionando…" });
    expect(selecting).toHaveAttribute("aria-busy", "true");
    expect(card("Suíte Deluxe Ocean View").className).toContain("ring-primary");
  });
});

describe("RoomsSection: bfcache", () => {
  it("pageshow persistido zera o 'Selecionando…'", async () => {
    const user = userEvent.setup();
    await renderRooms();
    await user.click(
      within(card("Suíte Deluxe Ocean View")).getByRole("button", { name: /Selecionar quarto/ }),
    );
    await screen.findByRole("button", { name: "Selecionando…" });
    act(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    expect(screen.queryByRole("button", { name: "Selecionando…" })).not.toBeInTheDocument();
  });
});

describe("RoomsSection: disponibilidade (critérios 17–20)", () => {
  it("1 quarto restante: 'Apenas 1 quarto!' e continua selecionável (hotel 7)", async () => {
    await renderRooms({ hotelId: 7 });
    const room = card("Ocean Suite Premium");
    expect(within(room).getByText("Apenas 1 quarto!")).toBeInTheDocument();
    expect(within(room).getByRole("button", { name: /Selecionar quarto/ })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("hotel esgotado: alert com link, badge, botão 'Esgotado' aria-disabled e sem total (hotel 19)", async () => {
    await renderRooms({ hotelId: 19 });
    const alert = screen
      .getByText("Este hotel está esgotado nestas datas")
      .closest("[role]") as HTMLElement;
    expect(within(alert).getByRole("link", { name: "Ver hotéis similares" })).toHaveAttribute(
      "href",
      "#similares",
    );
    const room = card("Quarto Executivo");
    expect(within(room).getAllByText("Esgotado")).toHaveLength(2);
    const button = within(room).getByRole("button", { name: "Esgotado: Quarto Executivo" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(button).toHaveAccessibleDescription("Sem quartos disponíveis para estas datas.");
    expect(room).not.toHaveTextContent("total com taxas ·");
  });

  it("3 adultos num quarto: o Standard (máx. 2) bloqueia com o motivo e o foco fica", async () => {
    const user = userEvent.setup();
    await renderRooms({ search: { ...criteria, adults: 3 } });
    const standard = card("Quarto Standard");
    const button = within(standard).getByRole("button", { name: /Selecionar quarto/ });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(
      "Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.",
    );
    expect(standard).not.toHaveTextContent("total com taxas ·");
    button.focus();
    await user.click(button);
    expect(button).toHaveFocus();
    expect(assignLocation).not.toHaveBeenCalled();
    expect(
      within(card("Suíte Deluxe Ocean View")).getByRole("button", { name: /Selecionar quarto/ }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("3 quartos com 2 disponíveis: badge e motivo, sem selecionar", async () => {
    const user = userEvent.setup();
    await renderRooms({
      rooms: [
        makeRoom({ id: 5, name: "Quarto Duplo", available: 2, maxGuests: 4 }),
        makeRoom({ id: 6, name: "Quarto Triplo", available: 9, maxGuests: 4 }),
      ],
      search: { ...criteria, rooms: 3, adults: 3 },
    });
    const room = card("Quarto Duplo");
    // O selo estático ("Apenas 2 quartos!") dá lugar ao da estadia, no mesmo lugar.
    expect(within(room).getByText("Só 2 disponíveis")).toBeInTheDocument();
    expect(within(room).queryByText("Apenas 2 quartos!")).not.toBeInTheDocument();
    const button = within(room).getByRole("button", { name: /Selecionar quarto/ });
    expect(button).toHaveAccessibleDescription(
      "Sua busca pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.",
    );
    await user.click(button);
    expect(assignLocation).not.toHaveBeenCalled();
  });

  it("hotel com um só tipo de quarto não sugere 'outro tipo'", async () => {
    await renderRooms({
      rooms: [makeRoom({ id: 5, name: "Quarto Duplo", available: 2, maxGuests: 4 })],
      search: { ...criteria, rooms: 3, adults: 3 },
    });
    const button = within(card("Quarto Duplo")).getByRole("button", { name: /Selecionar quarto/ });
    expect(button).toHaveAccessibleDescription(
      "Sua busca pede 3 quartos. Diminua a quantidade de quartos.",
    );
  });
});

describe("RoomsSection: sem critérios (critério 21)", () => {
  it("diária e botão 'Escolher datas', sem total", async () => {
    await renderRooms({ search: null });
    const suite = card("Suíte Deluxe Ocean View");
    expect(suite).toHaveTextContent("R$ 1.200");
    expect(suite).toHaveTextContent("por noite");
    expect(suite).not.toHaveTextContent("total com taxas ·");
    expect(within(suite).getByRole("button", { name: /Escolher datas/ })).toBeInTheDocument();
  });

  it("'Escolher datas' leva o foco ao campo check-in, se ele existir", async () => {
    const user = userEvent.setup();
    const input = document.createElement("input");
    input.name = "checkIn";
    document.body.append(input);
    await renderRooms({ search: null });
    await user.click(
      within(card("Suíte Deluxe Ocean View")).getByRole("button", { name: /Escolher datas/ }),
    );
    expect(input).toHaveFocus();
    input.remove();
  });

  it("sem estoque e sem datas, o motivo diz 'no momento'", async () => {
    await renderRooms({ hotelId: 19, search: null, hotelAvailableRooms: 0 });
    expect(screen.getAllByText("Sem quartos disponíveis no momento.").length).toBeGreaterThan(0);
    // O aviso do hotel esgotado fica no topo de "Quartos" (HotelDetailsView), antes do formulário.
    expect(
      screen.queryByText("Este hotel está sem quartos disponíveis no momento"),
    ).not.toBeInTheDocument();
  });
});

describe("RoomsSection: datas passadas", () => {
  it("o botão vira 'Escolher datas' com o motivo visível e abre o formulário de datas", async () => {
    const user = userEvent.setup();
    await renderRooms({
      search: { ...criteria, checkIn: addDays(todayISO(), -3), checkOut: addDays(todayISO(), -1) },
    });
    const suite = card("Suíte Deluxe Ocean View");
    expect(within(suite).getByText("As datas desta busca já passaram.")).toBeVisible();
    expect(within(suite).queryByRole("button", { name: /Selecionar quarto/ })).toBeNull();
    const button = within(suite).getByRole("button", {
      name: "Escolher datas: Suíte Deluxe Ocean View",
    });
    const input = document.createElement("input");
    input.name = "checkIn";
    document.body.append(input);
    await user.click(button);
    expect(input).toHaveFocus();
    input.remove();
    expect(assignLocation).not.toHaveBeenCalled();
  });
});

describe("RoomsSection: estados", () => {
  it("sem quartos: vazio com link para similares", async () => {
    await renderRooms({ rooms: [] });
    expect(screen.getByRole("heading", { name: "Nenhum quarto para reserva" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver hotéis similares" })).toHaveAttribute(
      "href",
      "#similares",
    );
  });
});
