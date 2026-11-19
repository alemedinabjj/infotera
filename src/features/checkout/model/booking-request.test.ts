import { describe, expect, it } from "vitest";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import {
  type BookingRequest,
  bookingRequestSchema,
  nextAttemptId,
  requestFingerprint,
  toBookingRequest,
} from "./booking-request";
import { type CheckoutValues, defaultCheckoutValues } from "./checkout.schema";
import { calculatePrice } from "./price";

const ATTEMPT = "8b0e4d2a-6f3c-4a1b-9c7d-2e5f8a1b3c4d";
const criteria = makeSearchCriteria({
  checkIn: "2026-12-20",
  checkOut: "2026-12-23",
  adults: 2,
  children: 1,
});
const selection = { hotelId: 1, roomId: 1, criteria };
const quote = calculatePrice({ pricePerNight: 1200, nights: 3, rooms: 1 });

const values: CheckoutValues = {
  ...defaultCheckoutValues,
  contact: {
    firstName: " Ana ",
    lastName: "Souza",
    email: "ana@exemplo.com",
    phoneCountry: "BR",
    phone: "(11) 98765-4321",
  },
  companions: [
    { kind: "adult", firstName: "Bruno", lastName: "Souza", age: "" },
    { kind: "child", firstName: "Clara", lastName: "Souza", age: "7" },
  ],
  payment: {
    cardNumber: "4111 1111 1111 1111",
    cardName: "ANA SOUZA",
    expiry: "12/30",
    cvv: "123",
    documentType: "cpf",
    document: "529.982.247-25",
  },
  termsAccepted: true,
};

describe("toBookingRequest", () => {
  const request = toBookingRequest(values, selection, quote, ATTEMPT);

  it("só leva os últimos 4 dígitos do cartão", () => {
    expect(request.cardLast4).toBe("1111");
    const serialized = JSON.stringify(request);
    for (const forbidden of [
      "4111111111111111",
      "4111 1111",
      '123"',
      "12/30",
      "52998224725",
      "529.982",
      "ANA SOUZA",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("telefone em E.164, nomes aparados e idade numérica só para criança", () => {
    expect(request.contact).toMatchObject({ firstName: "Ana", phone: "+5511987654321" });
    expect(request.companions.map((c) => c.age)).toEqual([null, 7]);
    expect(request.expectedTotalCents).toBe(414000);
    expect(request.couponCode).toBeNull();
  });

  it("passa pelo schema da action", () => {
    expect(bookingRequestSchema.safeParse(request).success).toBe(true);
  });
});

describe("bookingRequestSchema", () => {
  const valid = toBookingRequest(values, selection, quote, ATTEMPT);
  const parse = (patch: Partial<BookingRequest>) =>
    bookingRequestSchema.safeParse({ ...valid, ...patch });

  it("rejeita attemptId que não é UUID v4", () => {
    expect(parse({ attemptId: "123" }).success).toBe(false);
    expect(parse({ attemptId: "8b0e4d2a-6f3c-1a1b-9c7d-2e5f8a1b3c4d" }).success).toBe(false);
  });

  it("acompanhantes precisam bater com a busca", () => {
    expect(parse({ companions: valid.companions.slice(1) }).success).toBe(false);
  });

  it("criança sem idade é inválida", () => {
    const companions = valid.companions.map((c) => (c.kind === "child" ? { ...c, age: null } : c));
    expect(parse({ companions }).success).toBe(false);
  });

  it("rejeita cupom mal formatado, últimos 4 errados e total negativo", () => {
    expect(parse({ couponCode: "a b" }).success).toBe(false);
    expect(parse({ cardLast4: "12345" }).success).toBe(false);
    expect(parse({ expectedTotalCents: -1 }).success).toBe(false);
  });

  it("ignora campos extras como número do cartão (não são lidos)", () => {
    const result = bookingRequestSchema.safeParse({ ...valid, cardNumber: "4111111111111111" });
    expect(result.success).toBe(true);
    expect(JSON.stringify(result.data)).not.toContain("4111111111111111");
  });
});

describe("requestFingerprint / nextAttemptId", () => {
  const request = toBookingRequest(values, selection, quote, ATTEMPT);
  const ids = ["id-1", "id-2", "id-3"];
  const generate = () => ids.shift() ?? "id-x";

  it("o fingerprint ignora o attemptId", () => {
    expect(requestFingerprint(request)).toBe(
      requestFingerprint({ ...request, attemptId: "outro" }),
    );
  });

  it("mantém o id com o mesmo pedido e troca com outro", () => {
    const first = nextAttemptId(null, requestFingerprint(request), generate);
    expect(first.id).toBe("id-1");
    expect(nextAttemptId(first, requestFingerprint(request), generate).id).toBe("id-1");
    const changed = { ...request, cardLast4: "0000" };
    expect(nextAttemptId(first, requestFingerprint(changed), generate).id).toBe("id-2");
  });

  it("gera um UUID de verdade por padrão", () => {
    expect(nextAttemptId(null, "x").id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
