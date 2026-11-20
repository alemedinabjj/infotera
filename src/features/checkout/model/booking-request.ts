import { DEFAULT_LOCALE } from "@/shared/i18n/config";
import { searchCriteriaSchema } from "@/shared/lib/search-params";
import { z } from "@/shared/lib/zod";
import type { RoomSelection } from "@/shared/stores/booking-draft";
import { cardLast4 } from "./card";
import type { CheckoutValues } from "./checkout.schema";
import { couponCodeSchema } from "./coupons";
import { personNameSchema } from "./names";
import { toE164 } from "./phone";
import type { PriceQuote } from "./price";

/** Mensagens técnicas: a Server Action devolve só `status`, nada disto chega à tela. */
const guestName = (message: string) => personNameSchema(message, DEFAULT_LOCALE);

/**
 * Entrada da Server Action (não confiável: validada no servidor). Só **referências e escolhas**:
 * nada de número de cartão, validade, CVV, nome impresso nem documento.
 */
export const bookingRequestSchema = z
  .object({
    attemptId: z.uuidv4(),
    hotelId: z.number().int().positive(),
    roomId: z.number().int().positive(),
    criteria: searchCriteriaSchema,
    couponCode: couponCodeSchema.nullable(),
    contact: z.object({
      firstName: guestName("First name is required."),
      lastName: guestName("Last name is required."),
      email: z.email(),
      phone: z.string().regex(/^\+\d{8,15}$/),
    }),
    companions: z.array(
      z.object({
        kind: z.enum(["adult", "child"]),
        firstName: guestName("First name is required."),
        lastName: guestName("Last name is required."),
        age: z.number().int().min(0).max(17).nullable(),
      }),
    ),
    cardLast4: z.string().regex(/^\d{4}$/),
    expectedTotalCents: z.number().int().nonnegative(),
  })
  .superRefine((request, ctx) => {
    const adults = request.companions.filter((c) => c.kind === "adult").length;
    const children = request.companions.filter((c) => c.kind === "child");
    if (adults !== request.criteria.adults - 1 || children.length !== request.criteria.children) {
      ctx.addIssue({
        code: "custom",
        path: ["companions"],
        message: "Guest counts differ from the search.",
      });
    }
    request.companions.forEach((child, index) => {
      if (child.kind === "child" && child.age === null) {
        ctx.addIssue({
          code: "custom",
          path: ["companions", index, "age"],
          message: "Child age is required.",
        });
      }
    });
  });

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

/**
 * Formulário + seleção + preço calculado → pedido da Server Action. Só os últimos 4 dígitos do
 * cartão saem do navegador; o documento é validado e descartado.
 */
export const toBookingRequest = (
  values: CheckoutValues,
  selection: RoomSelection,
  quote: PriceQuote,
  attemptId: string,
): BookingRequest => ({
  attemptId,
  hotelId: selection.hotelId,
  roomId: selection.roomId,
  criteria: selection.criteria,
  couponCode: quote.couponCode,
  contact: {
    firstName: values.contact.firstName.trim(),
    lastName: values.contact.lastName.trim(),
    email: values.contact.email.trim(),
    phone: toE164(values.contact.phoneCountry, values.contact.phone),
  },
  companions: values.companions.map((companion) => ({
    kind: companion.kind,
    firstName: companion.firstName.trim(),
    lastName: companion.lastName.trim(),
    age: companion.kind === "child" ? Number(companion.age) : null,
  })),
  cardLast4: cardLast4(values.payment.cardNumber),
  expectedTotalCents: quote.totalCents,
});

/** Identidade do pedido sem o `attemptId`: mesmo pedido → mesmo id de tentativa (retry idempotente). */
export const requestFingerprint = (request: BookingRequest): string => {
  const { attemptId: _ignored, ...rest } = request;
  return JSON.stringify(rest);
};

export type Attempt = { id: string; fingerprint: string };

/** Mantém o `attemptId` enquanto o pedido não muda; pedido diferente gera um id novo. */
export const nextAttemptId = (
  previous: Attempt | null,
  fingerprint: string,
  generate: () => string = () => crypto.randomUUID(),
): Attempt =>
  previous && previous.fingerprint === fingerprint ? previous : { id: generate(), fingerprint };
