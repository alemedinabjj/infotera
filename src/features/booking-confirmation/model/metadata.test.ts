import { describe, expect, it } from "vitest";
import { makeBooking } from "@/shared/testing/fixtures";
import { CONFIRMATION_ROBOTS, confirmationTitle, FALLBACK_CONFIRMATION_TITLE } from "./metadata";

describe("confirmationTitle", () => {
  it("um título genérico por estado", () => {
    expect(confirmationTitle({ kind: "found", booking: makeBooking() })).toBe(
      "Reserva confirmada | Infotera Hotéis",
    );
    expect(confirmationTitle({ kind: "not-found" })).toBe(
      "Reserva não encontrada | Infotera Hotéis",
    );
    expect(confirmationTitle({ kind: "unreadable" })).toBe(
      "Reserva indisponível | Infotera Hotéis",
    );
  });

  it("o título da reserva não leva nome, e-mail nem id", () => {
    const booking = makeBooking();
    const title = confirmationTitle({ kind: "found", booking });
    expect(title).not.toContain("Ana");
    expect(title).not.toContain("exemplo.com");
    expect(title).not.toContain(String(booking.id));
  });

  it("o título de reserva padrão serve de reserva para erro no metadata", () => {
    expect(FALLBACK_CONFIRMATION_TITLE).toBe("Reserva confirmada | Infotera Hotéis");
  });
});

describe("CONFIRMATION_ROBOTS", () => {
  it("não indexa e não segue", () => {
    expect(CONFIRMATION_ROBOTS).toEqual({ index: false, follow: false });
  });
});
