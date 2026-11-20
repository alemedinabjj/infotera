// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "@/shared/lib/zod";
import {
  bookingInputSchema,
  bookingSchema,
  hotelSchema,
  reviewSchema,
  roomSchema,
  suggestionSchema,
} from "./schemas";

const seedSchema = z.object({
  suggestions: z.array(z.unknown()),
  hotels: z.array(z.unknown()),
  rooms: z.array(z.unknown()),
  reviews: z.array(z.unknown()),
});

const seed = seedSchema.parse(
  JSON.parse(readFileSync(join(process.cwd(), "mock-api/db.seed.json"), "utf-8")),
);

const firstHotel = hotelSchema.parse(seed.hotels[0]);

describe("schemas aceitam 100% do seed", () => {
  it.each([
    ["suggestions", suggestionSchema, seed.suggestions],
    ["hotels", hotelSchema, seed.hotels],
    ["rooms", roomSchema, seed.rooms],
    ["reviews", reviewSchema, seed.reviews],
  ] as const)("%s", (_name, schema, records) => {
    expect(records.length).toBeGreaterThan(0);
    const failures = records.flatMap((record) => {
      const result = schema.safeParse(record);
      return result.success ? [] : [result.error.issues[0]];
    });
    expect(failures).toEqual([]);
  });
});

describe("hotelSchema rejeita dados fora do contrato", () => {
  it.each([
    ["amenity desconhecida", { amenities: ["wifi", "heliport"] }],
    ["propertyType hostel", { propertyType: "hostel" }],
    ["rating como string", { rating: "4" }],
    ["rating acima de 5", { rating: 5.1 }],
    ["images inválidas", { images: ["nao-url"] }],
    ["images http", { images: ["http://example.com/a.jpg"] }],
    ["images de host desconhecido", { images: ["https://evil.example.com/a.jpg"] }],
    ["thumbnail de host desconhecido", { thumbnail: "https://images.unsplash.com.evil.io/a" }],
    ["horário inválido", { checkInTime: "25:00" }],
    ["moeda diferente", { currency: "USD" }],
    ["latitude acima de 90", { latitude: 90.5 }],
    ["latitude abaixo de -90", { latitude: -91 }],
    ["longitude acima de 180", { longitude: 181 }],
    ["longitude abaixo de -180", { longitude: -180.1 }],
  ])("%s", (_name, override) => {
    expect(hotelSchema.safeParse({ ...firstHotel, ...override }).success).toBe(false);
  });
});

describe("reviewSchema aceita só avatares de host conhecido", () => {
  const review = reviewSchema.parse(seed.reviews[0]);
  it("rejeita outro host", () => {
    const parsed = reviewSchema.safeParse({ ...review, guestAvatar: "https://evil.example.com/a" });
    expect(parsed.success).toBe(false);
  });
});

describe("bookingInputSchema / bookingSchema", () => {
  const curlBody = {
    hotelId: 1,
    roomId: 1,
    checkIn: "2026-12-01",
    checkOut: "2026-12-04",
    rooms: 1,
    adults: 2,
    children: 0,
    guests: [],
    totalPrice: 3600,
    createdAt: "2026-11-10T12:00:00Z",
  };

  it("aceita o corpo do exemplo curl do README", () => {
    expect(bookingInputSchema.safeParse(curlBody).success).toBe(true);
  });

  it("rejeita checkIn inexistente no calendário", () => {
    expect(bookingInputSchema.safeParse({ ...curlBody, checkIn: "2026-02-30" }).success).toBe(
      false,
    );
  });

  it("aceita id numérico ou string e descarta campos extras como cpf", () => {
    const guest = { firstName: "Ana", lastName: "Souza", email: "a@b.co", phone: "11999999999" };
    const withString = bookingSchema.parse({
      ...curlBody,
      id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      guests: [{ ...guest, cpf: "12345678909" }],
    });
    expect(withString.guests[0]).toEqual(guest);
    expect(bookingSchema.safeParse({ ...curlBody, id: 12 }).success).toBe(true);
  });

  describe("hóspedes e detalhamento (F5)", () => {
    const holder = {
      firstName: "Ana",
      lastName: "Souza",
      email: "ana@exemplo.com",
      phone: "+5511987654321",
      kind: "adult",
    };

    it("titular com contato e acompanhante sem contato", () => {
      const guests = [holder, { firstName: "Bruno", lastName: "Souza", kind: "adult" }];
      expect(bookingInputSchema.safeParse({ ...curlBody, guests }).success).toBe(true);
    });

    it("criança com idade de 0 a 17; fora disso falha", () => {
      const child = (age: number) => ({ firstName: "C", lastName: "S", kind: "child", age });
      expect(bookingInputSchema.safeParse({ ...curlBody, guests: [child(0)] }).success).toBe(true);
      expect(bookingInputSchema.safeParse({ ...curlBody, guests: [child(17)] }).success).toBe(true);
      expect(bookingInputSchema.safeParse({ ...curlBody, guests: [child(18)] }).success).toBe(
        false,
      );
      expect(bookingInputSchema.safeParse({ ...curlBody, guests: [child(-1)] }).success).toBe(
        false,
      );
    });

    it("priceBreakdown é opcional e valida centavos inteiros", () => {
      const priceBreakdown = {
        nightlyCents: 120000,
        nights: 3,
        rooms: 1,
        subtotalCents: 360000,
        discountCents: 0,
        serviceFeeCents: 36000,
        taxCents: 18000,
        totalCents: 414000,
      };
      expect(bookingInputSchema.safeParse({ ...curlBody, priceBreakdown }).success).toBe(true);
      expect(
        bookingInputSchema.safeParse({
          ...curlBody,
          priceBreakdown: { ...priceBreakdown, totalCents: 10.5 },
        }).success,
      ).toBe(false);
    });

    it("aceita id UUID", () => {
      const id = "8b0e4d2a-6f3c-4a1b-9c7d-2e5f8a1b3c4d";
      expect(bookingSchema.parse({ ...curlBody, id }).id).toBe(id);
    });
  });
});
