import { centsToReais, reaisToCents } from "@/shared/lib/currency";
import type { Room } from "../api/schemas";
import { feesOnBase } from "./price-breakdown";

type StayTotalInput = { pricePerNight: number; nights: number; rooms: number };

/**
 * Total da estadia sem taxas: `diária × noites × quartos`. A conta é em centavos inteiros (sem erro
 * de ponto flutuante) e o resultado volta em reais.
 */
export const stayTotal = ({ pricePerNight, nights, rooms }: StayTotalInput): number =>
  centsToReais(reaisToCents(pricePerNight) * nights * rooms);

/**
 * Total com taxa de serviço e ISS (sem cupom): é o valor que o checkout cobra, pela mesma conta
 * (`feesOnBase`). Busca, hotel e checkout mostram este número.
 */
export const stayTotalWithFees = ({ pricePerNight, nights, rooms }: StayTotalInput): number =>
  centsToReais(feesOnBase(reaisToCents(pricePerNight) * nights * rooms).totalCents);

export type FromPrice = { price: number; soldOut: boolean } | null;

/**
 * "A partir de" calculado pelos quartos: a menor diária entre os que têm estoque; se todos estão
 * esgotados, a menor de todas com `soldOut: true`; sem quartos, `null`. (O `pricePerNight` do hotel
 * diverge dos quartos nos hotéis 1 e 4.)
 */
export const lowestNightlyPrice = (rooms: readonly Room[]): FromPrice => {
  if (rooms.length === 0) return null;
  const available = rooms.filter((room) => room.available > 0);
  const pool = available.length > 0 ? available : rooms;
  return {
    price: Math.min(...pool.map((room) => room.pricePerNight)),
    soldOut: available.length === 0,
  };
};
