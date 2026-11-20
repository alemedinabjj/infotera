import {
  type Hotel,
  hotelSchema,
  type Review,
  type Room,
  reviewSchema,
  roomSchema,
} from "../api/schemas";
import { type SearchCriteria, searchCriteriaSchema } from "../lib/search-params";

/** Fixtures tipadas; a saída passa pelo schema, então nunca divergem do contrato. */

export const makeHotel = (overrides: Partial<Hotel> = {}): Hotel =>
  hotelSchema.parse({
    id: 1,
    name: "Hotel Copacabana Palace",
    slug: "copacabana-palace",
    destination: "Rio de Janeiro, RJ",
    description: "Hotel de luxo em frente à praia.",
    rating: 4.8,
    reviewCount: 2847,
    pricePerNight: 1200,
    currency: "BRL",
    propertyType: "hotel",
    address: "Av. Atlântica, 1702 - Copacabana, Rio de Janeiro - RJ",
    latitude: -22.9683,
    longitude: -43.1792,
    images: ["https://images.unsplash.com/h1", "https://images.unsplash.com/h2"],
    thumbnail: "https://images.unsplash.com/h1-thumb",
    amenities: ["wifi", "pool"],
    checkInTime: "15:00",
    checkOutTime: "12:00",
    cancellationPolicy: "free",
    availableRooms: 12,
    featured: false,
    ...overrides,
  });

export const makeRoom = (overrides: Partial<Room> = {}): Room =>
  roomSchema.parse({
    id: 1,
    hotelId: 1,
    name: "Suíte Deluxe",
    description: "Suíte com vista para o mar.",
    size: 45,
    maxGuests: 3,
    beds: [{ type: "king", quantity: 1 }],
    pricePerNight: 1200,
    amenities: ["ocean_view", "aircon"],
    images: ["https://images.unsplash.com/r1"],
    available: 8,
    ...overrides,
  });

export const makeReview = (overrides: Partial<Review> = {}): Review =>
  reviewSchema.parse({
    id: 1,
    hotelId: 1,
    guestName: "Maria Silva",
    guestAvatar: "https://i.pravatar.cc/avatar",
    rating: 5,
    title: "Experiência inesquecível",
    comment: "Tudo perfeito.",
    date: "2024-03-10",
    helpful: 4,
    verified: true,
    ...overrides,
  });

export const makeSearchCriteria = (overrides: Partial<SearchCriteria> = {}): SearchCriteria =>
  searchCriteriaSchema.parse({
    destination: "Rio de Janeiro, RJ",
    checkIn: "2026-12-10",
    checkOut: "2026-12-13",
    rooms: 1,
    adults: 2,
    children: 0,
    ...overrides,
  });
