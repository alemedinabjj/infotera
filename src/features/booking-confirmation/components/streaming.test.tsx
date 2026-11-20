import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeBooking, makeHotel, makeRoom } from "@/shared/testing/fixtures";
import { navigationSpies } from "@/shared/testing/next-navigation";
import type { StayDetails } from "../api/confirmation.server";
import { CheckTimes } from "./CheckTimes";
import { RefreshButton } from "./RefreshButton";
import { StayDetailsSection } from "./StayDetailsSection";
import { StayDetailsSkeleton } from "./StayDetailsSkeleton";
import { STAY_TITLE_ID } from "./stay-ids";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const booking = makeBooking();
const OK: StayDetails = {
  hotel: { status: "ok", data: makeHotel() },
  room: {
    status: "ok",
    data: makeRoom({
      beds: [
        { type: "king", quantity: 1 },
        { type: "sofa_bed", quantity: 1 },
      ],
    }),
  },
};

const renderSection = async (details: StayDetails, forBooking = booking) =>
  render(await StayDetailsSection({ booking: forBooking, details: Promise.resolve(details) }));

beforeEach(() => navigationSpies.refresh.mockClear());

describe("StayDetailsSection com tudo certo (critérios 1 e 6)", () => {
  it("hotel, endereço, quarto, camas, cancelamento aberto e link do hotel", async () => {
    await renderSection(OK);
    expect(
      screen.getByRole("heading", { level: 3, name: "Hotel Copacabana Palace" }),
    ).toBeVisible();
    expect(screen.getByText(/Av\. Atlântica, 1702/)).toBeVisible();
    expect(screen.getByText("Suíte Deluxe")).toBeVisible();
    expect(screen.getByText("1 cama king e 1 sofá-cama")).toBeVisible();
    expect(screen.getByRole("heading", { level: 3, name: "Cancelamento" })).toBeVisible();
    expect(screen.getByText("Cancelamento grátis")).toBeVisible();
    expect(screen.getByText("Cancele grátis até 48 horas antes do check-in.")).toBeVisible();
    expect(screen.getByRole("link", { name: /Ver página do hotel/ })).toHaveAttribute(
      "href",
      "/hotel/1",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a foto é decorativa (o nome está ao lado)", async () => {
    const { container } = await renderSection(OK);
    for (const image of container.querySelectorAll("img")) expect(image).toHaveAttribute("alt", "");
  });
});

describe("hotel ou quarto inexistente (critério 12)", () => {
  it("hotel missing: Hotel #id + aviso, sem link nem cancelamento e sem retry", async () => {
    await renderSection(
      { hotel: { status: "missing" }, room: { status: "ok", data: makeRoom({ hotelId: 9999 }) } },
      makeBooking({ hotelId: 9999 }),
    );
    expect(screen.getByRole("heading", { level: 3, name: "Hotel #9999" })).toBeVisible();
    expect(screen.getByText("Os dados deste hotel não estão mais disponíveis.")).toBeVisible();
    expect(screen.queryByRole("link", { name: /Ver página do hotel/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelamento")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Suíte Deluxe")).toBeVisible();
  });

  it("quarto missing: Quarto #id + aviso e o hotel continua", async () => {
    await renderSection({ ...OK, room: { status: "missing" } }, makeBooking({ roomId: 77 }));
    expect(screen.getByText("Quarto #77")).toBeVisible();
    expect(screen.getByText("Os dados deste quarto não estão mais disponíveis.")).toBeVisible();
    expect(screen.getByText("Hotel Copacabana Palace")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("quarto de outro hotel (reserva forjada) vira missing", async () => {
    await renderSection({ ...OK, room: { status: "ok", data: makeRoom({ hotelId: 2 }) } });
    expect(screen.getByText("Quarto #1")).toBeVisible();
    expect(screen.queryByText("Suíte Deluxe")).not.toBeInTheDocument();
  });
});

describe("hotel ou quarto com erro (critério 13)", () => {
  it("só o hotel: um alerta com um retry e o quarto abaixo", async () => {
    await renderSection({ ...OK, hotel: { status: "error" } });
    const alert = screen.getByRole("alert");
    expect(within(alert).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Não foi possível carregar os dados do hotel.",
    );
    expect(alert).toHaveTextContent(
      "Sua reserva está confirmada. Verifique sua conexão e tente de novo.",
    );
    expect(within(alert).getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Suíte Deluxe")).toBeVisible();
    expect(screen.queryByText("Hotel Copacabana Palace")).not.toBeInTheDocument();
  });

  it("só o quarto", async () => {
    await renderSection({ ...OK, room: { status: "error" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os dados do quarto.",
    );
    expect(screen.getByText("Hotel Copacabana Palace")).toBeVisible();
  });

  it("os dois: um único alerta, um único botão", async () => {
    await renderSection({ hotel: { status: "error" }, room: { status: "error" } });
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os dados do hotel e do quarto.",
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("nunca mostra a mensagem da API", async () => {
    const { container } = await renderSection({
      hotel: { status: "error" },
      room: { status: "error" },
    });
    expect(container.textContent).not.toMatch(/Falha simulada|500|ApiError/);
  });
});

describe("RefreshButton", () => {
  it("chama router.refresh e o foco fica no botão", async () => {
    const user = userEvent.setup();
    render(<RefreshButton />);
    const button = screen.getByRole("button", { name: "Tentar de novo" });
    await user.click(button);
    expect(navigationSpies.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveFocus();
  });

  it("retry que dá certo (botão some): o foco vai para o h2 Sua estadia", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <h2 id={STAY_TITLE_ID} tabIndex={-1}>
          Sua estadia
        </h2>
        <RefreshButton />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    rerender(
      <h2 id={STAY_TITLE_ID} tabIndex={-1}>
        Sua estadia
      </h2>,
    );
    expect(screen.getByRole("heading", { name: "Sua estadia" })).toHaveFocus();
  });

  it("sair da página sem ter tentado não mexe no foco", () => {
    const { unmount } = render(
      <>
        <h2 id={STAY_TITLE_ID} tabIndex={-1}>
          Sua estadia
        </h2>
        <RefreshButton />
      </>,
    );
    unmount();
    expect(document.body).toHaveFocus();
  });
});

describe("CheckTimes e skeleton (critério 6)", () => {
  it.each([
    ["check-in", "A partir de 15:00"],
    ["check-out", "Até 12:00"],
  ] as const)("%s com hotel ok", async (which, text) => {
    render(await CheckTimes({ details: Promise.resolve(OK), which }));
    expect(screen.getByText(text)).toBeVisible();
  });

  it("hotel missing: Confirme com o hotel", async () => {
    render(
      await CheckTimes({
        details: Promise.resolve({ ...OK, hotel: { status: "missing" } }),
        which: "check-in",
      }),
    );
    expect(screen.getByText("Confirme com o hotel")).toBeVisible();
  });

  it("hotel com erro: Indisponível no momento", async () => {
    render(
      await CheckTimes({
        details: Promise.resolve({ ...OK, hotel: { status: "error" } }),
        which: "check-out",
      }),
    );
    expect(screen.getByText("Indisponível no momento")).toBeVisible();
  });

  it("o skeleton é aria-busy e anuncia o carregamento uma vez", () => {
    const { container } = render(<StayDetailsSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Carregando dados do hotel…")).toHaveClass("sr-only");
  });

  it("dentro do skeleton da rota não repete o anúncio", () => {
    render(<StayDetailsSkeleton announce={false} />);
    expect(screen.queryByText("Carregando dados do hotel…")).not.toBeInTheDocument();
  });
});
