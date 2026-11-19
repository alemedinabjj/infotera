import { hydrate } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, use, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import { formatBRL } from "@/shared/lib/currency";
import { addDays, todayISO } from "@/shared/lib/dates";
import { useBookingDraft } from "@/shared/stores/booking-draft";
import { makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { makeTestQueryClient, renderWithProviders } from "@/shared/testing/render";
import { seedRooms } from "@/shared/testing/seed";
import { RoomsSection } from "./RoomsSection";

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

/**
 * Simula a navegação do Next: o `router.push` dentro da transition só termina quando a rota nova
 * chega. Aqui ela nunca chega (a transition fica pendente, como no clique real).
 */
const NEVER = new Promise<never>(() => undefined);
let blockNavigation: () => void = () => undefined;
const NavigationGate = ({ children }: { children: ReactNode }) => {
  const [blocked, setBlocked] = useState(false);
  blockNavigation = () => setBlocked(true);
  if (blocked) use(NEVER);
  return children;
};

const renderRooms = ({
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
  const queryClient = makeTestQueryClient();
  queryClient.setQueryData(hotelRoomsQueryOptions(hotelId).queryKey, rooms);
  return renderWithProviders(
    <NavigationGate>
      <RoomsSection
        hotelId={hotelId}
        hotelAvailableRooms={hotelAvailableRooms}
        cancellationPolicy="free"
        criteria={search}
      />
    </NavigationGate>,
    { queryClient },
  );
};

const card = (name: string) =>
  screen.getByRole("heading", { level: 3, name }).closest("article") as HTMLElement;

beforeEach(() => {
  navigationSpies.push.mockReset();
  navigationSpies.push.mockImplementation(() => blockNavigation());
  sessionStorage.clear();
  useBookingDraft.setState({ selection: null });
});
afterEach(() => vi.unstubAllGlobals());

describe("RoomsSection: com critérios (critério 15)", () => {
  it("foto, nome, fatos, comodidades, cancelamento, diária e total", () => {
    renderRooms();
    const suite = card("Suíte Deluxe Ocean View");
    expect(suite).toHaveTextContent("45 m²");
    expect(within(suite).getByText("Até 3 hóspedes")).toBeInTheDocument();
    expect(within(suite).getByText("1 cama king")).toBeInTheDocument();
    expect(within(suite).getByText("Vista para o mar")).toBeInTheDocument();
    expect(within(suite).getByText("+2 comodidades")).toBeInTheDocument();
    expect(within(suite).getByText("Cancelamento grátis")).toBeInTheDocument();
    expect(suite).toHaveTextContent(plain(formatBRL(3600)));
    expect(suite).toHaveTextContent("total · 3 noites · 1 quarto");
    expect(suite).toHaveTextContent("R$ 1.200 por noite");
    expect(suite).not.toHaveTextContent("a partir de");
    expect(card("Quarto Standard")).toHaveTextContent(plain(formatBRL(2400)));
    expect(screen.getAllByText("2 tipos de quarto")).toHaveLength(2); // status visível + anunciador
  });

  it("as comodidades restantes ficam num details abaixo (nada acima se move)", () => {
    renderRooms();
    const details = card("Suíte Deluxe Ocean View").querySelector("details");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("Cofre")).toBeInTheDocument();
  });
});

describe("RoomsSection: selecionar (critério 16)", () => {
  it("grava no booking-draft e navega para /checkout; segundo clique é ignorado", async () => {
    const user = userEvent.setup();
    renderRooms();
    const button = within(card("Suíte Deluxe Ocean View")).getByRole("button", {
      name: "Selecionar quarto: Suíte Deluxe Ocean View",
    });
    await user.click(button);
    expect(navigationSpies.push).toHaveBeenCalledWith("/checkout");
    const stored: unknown = JSON.parse(sessionStorage.getItem("infotera:booking-draft") ?? "{}");
    expect(stored).toMatchObject({
      state: { selection: { hotelId: 1, roomId: 1, criteria } },
    });
    await user.click(button);
    await user.click(
      within(card("Quarto Standard")).getByRole("button", { name: /Selecionar quarto/ }),
    );
    expect(navigationSpies.push).toHaveBeenCalledTimes(1);
    expect(useBookingDraft.getState().selection?.roomId).toBe(1);
  });

  it("durante a navegação o botão mostra 'Selecionando…' e o card fica selecionado", async () => {
    const user = userEvent.setup();
    renderRooms();
    await user.click(
      within(card("Suíte Deluxe Ocean View")).getByRole("button", { name: /Selecionar quarto/ }),
    );
    const selecting = await screen.findByRole("button", { name: "Selecionando…" });
    expect(selecting).toHaveAttribute("aria-busy", "true");
    expect(card("Suíte Deluxe Ocean View").className).toContain("ring-primary");
  });
});

describe("RoomsSection: disponibilidade (critérios 17–20)", () => {
  it("1 quarto restante: 'Apenas 1 quarto!' e continua selecionável (hotel 7)", () => {
    renderRooms({ hotelId: 7 });
    const room = card("Ocean Suite Premium");
    expect(within(room).getByText("Apenas 1 quarto!")).toBeInTheDocument();
    expect(within(room).getByRole("button", { name: /Selecionar quarto/ })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("hotel esgotado: alert com link, badge, botão 'Esgotado' aria-disabled e sem total (hotel 19)", () => {
    renderRooms({ hotelId: 19, hotelAvailableRooms: 0 });
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
    expect(room).not.toHaveTextContent("total ·");
  });

  it("3 adultos num quarto: o Standard (máx. 2) bloqueia com o motivo e o foco fica", async () => {
    const user = userEvent.setup();
    renderRooms({ search: { ...criteria, adults: 3 } });
    const standard = card("Quarto Standard");
    const button = within(standard).getByRole("button", { name: /Selecionar quarto/ });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(
      "Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.",
    );
    expect(standard).not.toHaveTextContent("total ·");
    button.focus();
    await user.click(button);
    expect(button).toHaveFocus();
    expect(navigationSpies.push).not.toHaveBeenCalled();
    expect(
      within(card("Suíte Deluxe Ocean View")).getByRole("button", { name: /Selecionar quarto/ }),
    ).not.toHaveAttribute("aria-disabled");
  });

  it("3 quartos com 2 disponíveis: badge e motivo, sem selecionar", async () => {
    const user = userEvent.setup();
    renderRooms({
      rooms: [makeRoom({ id: 5, name: "Quarto Duplo", available: 2, maxGuests: 4 })],
      search: { ...criteria, rooms: 3, adults: 3 },
    });
    const room = card("Quarto Duplo");
    expect(within(room).getByText("Só 2 disponíveis")).toBeInTheDocument();
    const button = within(room).getByRole("button", { name: /Selecionar quarto/ });
    expect(button).toHaveAccessibleDescription(
      "Sua busca pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.",
    );
    await user.click(button);
    expect(navigationSpies.push).not.toHaveBeenCalled();
  });
});

describe("RoomsSection: sem critérios (critério 21)", () => {
  it("diária e botão 'Escolher datas', sem total", () => {
    renderRooms({ search: null });
    const suite = card("Suíte Deluxe Ocean View");
    expect(suite).toHaveTextContent("R$ 1.200");
    expect(suite).toHaveTextContent("por noite");
    expect(suite).not.toHaveTextContent("total ·");
    expect(within(suite).getByRole("button", { name: /Escolher datas/ })).toBeInTheDocument();
  });

  it("'Escolher datas' leva o foco ao campo check-in, se ele existir", async () => {
    const user = userEvent.setup();
    const input = document.createElement("input");
    input.name = "checkIn";
    document.body.append(input);
    renderRooms({ search: null });
    await user.click(
      within(card("Suíte Deluxe Ocean View")).getByRole("button", { name: /Escolher datas/ }),
    );
    expect(input).toHaveFocus();
    input.remove();
  });

  it("sem estoque e sem datas, o motivo diz 'no momento'", () => {
    renderRooms({ hotelId: 19, search: null, hotelAvailableRooms: 0 });
    expect(screen.getAllByText("Sem quartos disponíveis no momento.").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Este hotel está sem quartos disponíveis no momento"),
    ).toBeInTheDocument();
  });
});

describe("RoomsSection: estados (critérios 23–24)", () => {
  it("loading: skeleton aria-busy, 'Carregando quartos…' e 'demorando' depois de 5 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined));
    const { container } = renderWithProviders(
      <RoomsSection
        hotelId={1}
        hotelAvailableRooms={3}
        cancellationPolicy="free"
        criteria={criteria}
      />,
    );
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.getAllByText("Carregando quartos…").length).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(5000));
    expect(await screen.findByText("Está demorando mais que o normal…")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("sem quartos: vazio com link para similares", () => {
    renderRooms({ rooms: [] });
    expect(screen.getByRole("heading", { name: "Nenhum quarto para reserva" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver hotéis similares" })).toHaveAttribute(
      "href",
      "#similares",
    );
  });

  it("falha na hidratação (SSR rejeitado) cai no erro com retry e os quartos entram no lugar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    const queryClient = makeTestQueryClient();
    const rejected = Promise.reject(new Error("redacted"));
    rejected.catch(() => undefined);
    hydrate(queryClient, {
      mutations: [],
      queries: [
        {
          queryKey: hotelRoomsQueryOptions(1).queryKey,
          queryHash: JSON.stringify(hotelRoomsQueryOptions(1).queryKey),
          state: {
            data: undefined,
            dataUpdateCount: 0,
            dataUpdatedAt: 0,
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            isInvalidated: false,
            status: "pending",
            fetchStatus: "fetching",
          },
          dehydratedAt: Date.now(),
          promise: rejected,
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(seedRooms(1)), { status: 200 })),
    );
    renderWithProviders(
      <>
        <h2 id="quartos-titulo" tabIndex={-1}>
          Quartos
        </h2>
        <RoomsSection
          hotelId={1}
          hotelAvailableRooms={12}
          cancellationPolicy="free"
          criteria={criteria}
        />
      </>,
      { queryClient },
    );
    expect(
      await screen.findByRole("heading", { name: "Não foi possível carregar os quartos." }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(
      await screen.findByRole("heading", { name: "Suíte Deluxe Ocean View" }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Quartos" })).toHaveFocus());
  });
});
