import { describe, expect, it } from "vitest";
import { toUserMessage } from "../api/errors";
import { describeAvailability } from "../lib/availability";
import { cancellationDetails } from "../lib/cancellation";
import { formatGuests, ratingLabel } from "../lib/format";
import { amenityLabel } from "../lib/labels";
import { priceLineLabel } from "../lib/price-breakdown";
import { bedsLabel } from "../lib/room-labels";
import { formatUnit } from "./units";

describe("textos compartilhados por idioma", () => {
  it("unidades: zero é plural nos dois idiomas", () => {
    expect(formatUnit(0, "night", "pt-BR")).toBe("0 noites");
    expect(formatUnit(1, "night", "en-US")).toBe("1 night");
    expect(formatUnit(1200, "review", "en-US")).toBe("1,200 reviews");
  });

  it("rótulos, erros, camas, nota e hóspedes em inglês", () => {
    expect(amenityLabel("breakfast", "en-US")).toBe("Breakfast");
    expect(toUserMessage(new Error("x"), "en-US")).toBe("Something went wrong. Please try again.");
    expect(
      bedsLabel(
        [
          { type: "king", quantity: 1 },
          { type: "sofa_bed", quantity: 2 },
        ],
        "en-US",
      ),
    ).toBe("1 king bed and 2 sofa beds");
    expect(ratingLabel(4.6, "en-US")).toBe("Excellent");
    expect(formatGuests({ adults: 2, children: 1, rooms: 1 }, "en-US")).toBe(
      "2 adults, 1 child · 1 room",
    );
  });

  it("disponibilidade, cancelamento e linhas de preço em inglês", () => {
    expect(
      describeAvailability({
        status: "scarce",
        availableRooms: 2,
        requestedRooms: 1,
        hasDates: true,
        locale: "en-US",
      }).badge?.text,
    ).toBe("Only 2 rooms left!");
    expect(cancellationDetails("free", "en-US").label).toBe("Free cancellation");
    expect(priceLineLabel({ kind: "tax", bps: 500, amountCents: 1 }, "en-US")).toBe("ISS tax (5%)");
  });
});
