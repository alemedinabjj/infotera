import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { type Hotel, hotelSchema, type Room, roomSchema } from "../api/schemas";

const seedSchema = z.object({ hotels: z.array(hotelSchema), rooms: z.array(roomSchema) });

const seed = seedSchema.parse(
  JSON.parse(readFileSync(join(process.cwd(), "mock-api/db.seed.json"), "utf-8")),
);

/** Hotel real do `mock-api/db.seed.json` (só para testes). Lança se o id não existe. */
export const seedHotel = (id: number): Hotel => {
  const hotel = seed.hotels.find((candidate) => candidate.id === id);
  if (!hotel) throw new Error(`Hotel ${id} não existe no seed.`);
  return hotel;
};

/** Quartos reais de um hotel do seed (só para testes). */
export const seedRooms = (hotelId: number): Room[] =>
  seed.rooms.filter((room) => room.hotelId === hotelId);
