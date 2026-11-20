import { describe, expect, it } from "vitest";
import { makeBooking } from "@/shared/testing/fixtures";
import { CONFIRMATION_ROBOTS, confirmationTitle, fallbackConfirmationTitle } from "./metadata";

describe("confirmationTitle", () => {
  it("um título genérico por estado", () => {
    expect(confirmationTitle({ kind: "found", booking: makeBooking() }, "pt-BR")).toBe(
      "Reserva confirmada | Infotera Hotéis",
    );
    expect(confirmationTitle({ kind: "not-found" }, "pt-BR")).toBe(
      "Reserva não encontrada | Infotera Hotéis",
    );
    expect(confirmationTitle({ kind: "unreadable" }, "pt-BR")).toBe(
      "Reserva indisponível | Infotera Hotéis",
    );
  });

  it("o título da reserva não leva nome, e-mail nem id", () => {
    const booking = makeBooking();
    const title = confirmationTitle({ kind: "found", booking }, "pt-BR");
    expect(title).not.toContain("Ana");
    expect(title).not.toContain("exemplo.com");
    expect(title).not.toContain(String(booking.id));
  });

  it("o título de reserva padrão serve de reserva para erro no metadata", () => {
    expect(fallbackConfirmationTitle("pt-BR")).toBe("Reserva confirmada | Infotera Hotéis");
  });
});

describe("CONFIRMATION_ROBOTS", () => {
  it("não indexa e não segue", () => {
    expect(CONFIRMATION_ROBOTS).toEqual({ index: false, follow: false });
  });
});

describe("títulos em en-US", () => {
  it("um título por estado e o padrão de erro", () => {
    expect(confirmationTitle({ kind: "not-found" }, "en-US")).toBe(
      "Booking not found | Infotera Hotéis",
    );
    expect(confirmationTitle({ kind: "unreadable" }, "en-US")).toBe(
      "Booking unavailable | Infotera Hotéis",
    );
    expect(fallbackConfirmationTitle("en-US")).toBe("Booking confirmed | Infotera Hotéis");
  });
});
