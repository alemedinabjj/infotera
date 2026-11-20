import { z } from "@/shared/lib/zod";
import { isoDateSchema } from "../lib/dates";

/**
 * Schemas de toda resposta da API (porte de `mock-api/types.ts`). Os tipos saem de `z.infer`.
 * Enums estritos de propósito: o teste do seed garante que 100% dos registros passam.
 */

/** Fotos só vêm de hosts conhecidos (a CSP da F5 libera os mesmos): nada de URL arbitrária em `<img>`. */
const photoUrlSchema = z.url({ protocol: /^https$/, hostname: /^images\.unsplash\.com$/ });
const avatarUrlSchema = z.url({ protocol: /^https$/, hostname: /^i\.pravatar\.cc$/ });
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido. Use HH:MM.");
const countSchema = z.number().int().nonnegative();

export const amenitySchema = z.enum([
  "wifi",
  "breakfast",
  "pool",
  "spa",
  "restaurant",
  "gym",
  "parking",
  "bar",
  "room_service",
  "beach_access",
  "kids_club",
  "business_center",
  "concierge",
  "valet",
  "lounge_access",
]);
export type Amenity = z.infer<typeof amenitySchema>;

export const roomAmenitySchema = z.enum([
  "ocean_view",
  "city_view",
  "garden_view",
  "balcony",
  "terrace",
  "bathtub",
  "minibar",
  "safe",
  "aircon",
  "desk",
  "kitchen",
  "living_room",
  "sound_system",
  "butler",
  "pool_access",
  "garden",
  "lounge_access",
]);
export type RoomAmenity = z.infer<typeof roomAmenitySchema>;

export const propertyTypeSchema = z.enum(["hotel", "pousada", "resort"]);
export type PropertyType = z.infer<typeof propertyTypeSchema>;

export const cancellationPolicySchema = z.enum(["free", "moderate", "strict"]);
export type CancellationPolicy = z.infer<typeof cancellationPolicySchema>;

export const bedSchema = z.object({
  type: z.enum(["single", "double", "queen", "king", "twin", "sofa_bed"]),
  quantity: z.number().int().positive(),
});
export type Bed = z.infer<typeof bedSchema>;

export const suggestionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  type: z.enum(["city", "beach", "island", "nature"]),
  country: z.string(),
  /** Nome sem acentos e em minúsculas, usado pela busca `?q=`. */
  searchName: z.string(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

export const hotelSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  destination: z.string(),
  description: z.string(),
  rating: z.number().min(0).max(5),
  reviewCount: countSchema,
  pricePerNight: z.number().nonnegative(),
  currency: z.literal("BRL"),
  propertyType: propertyTypeSchema,
  address: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  images: z.array(photoUrlSchema),
  thumbnail: photoUrlSchema,
  amenities: z.array(amenitySchema),
  checkInTime: timeSchema,
  checkOutTime: timeSchema,
  cancellationPolicy: cancellationPolicySchema,
  availableRooms: countSchema,
  featured: z.boolean(),
});
export type Hotel = z.infer<typeof hotelSchema>;

export const roomSchema = z.object({
  id: z.number().int(),
  hotelId: z.number().int(),
  name: z.string(),
  description: z.string(),
  size: z.number().positive(),
  maxGuests: z.number().int().positive(),
  beds: z.array(bedSchema),
  pricePerNight: z.number().nonnegative(),
  amenities: z.array(roomAmenitySchema),
  images: z.array(photoUrlSchema),
  available: countSchema,
});
export type Room = z.infer<typeof roomSchema>;

export const reviewSchema = z.object({
  id: z.number().int(),
  hotelId: z.number().int(),
  guestName: z.string(),
  guestAvatar: avatarUrlSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  comment: z.string(),
  date: isoDateSchema,
  helpful: countSchema,
  verified: z.boolean(),
});
export type Review = z.infer<typeof reviewSchema>;

/**
 * Hóspede da reserva. Sem CPF e sem dados de cartão: `GET /bookings/:id` é público no mock.
 * Só o titular (`guests[0]`) tem contato; acompanhantes trazem `kind` (e `age` quando criança).
 */
export const bookingGuestSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  kind: z.enum(["adult", "child"]).optional(),
  age: z.number().int().min(0).max(17).optional(),
});
export type BookingGuest = z.infer<typeof bookingGuestSchema>;

const cents = z.number().int().nonnegative();

/** Detalhamento do preço gravado com a reserva (centavos), para a F6 mostrar sem recalcular. */
export const priceBreakdownSchema = z.object({
  nightlyCents: cents,
  nights: z.number().int().positive(),
  rooms: z.number().int().positive(),
  subtotalCents: cents,
  discountCents: cents,
  serviceFeeCents: cents,
  taxCents: cents,
  totalCents: cents,
  couponCode: z.string().optional(),
});
export type PriceBreakdown = z.infer<typeof priceBreakdownSchema>;

/** Corpo de `POST /bookings` (sem `id`). */
export const bookingInputSchema = z.object({
  hotelId: z.number().int(),
  roomId: z.number().int(),
  checkIn: isoDateSchema,
  checkOut: isoDateSchema,
  rooms: z.number().int().positive(),
  adults: z.number().int().positive(),
  children: countSchema,
  guests: z.array(bookingGuestSchema),
  totalPrice: z.number().nonnegative(),
  payment: z
    .object({ method: z.literal("credit_card"), cardLast4: z.string().regex(/^\d{4}$/) })
    .optional(),
  priceBreakdown: priceBreakdownSchema.optional(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

/** Reserva salva. `id` aceita `number | string` (a F5 pode enviar um UUID não sequencial). */
export const bookingSchema = bookingInputSchema.extend({ id: z.union([z.number(), z.string()]) });
export type Booking = z.infer<typeof bookingSchema>;

/** Corpo de erro do json-server mockado (`{ error }`). Nunca vira texto de UI. */
export const apiErrorBodySchema = z.object({ error: z.string() });
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
