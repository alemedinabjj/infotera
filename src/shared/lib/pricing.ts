import { centsToReais, reaisToCents } from "@/shared/lib/currency";

type StayTotalInput = { pricePerNight: number; nights: number; rooms: number };

/**
 * Total da estadia sem taxas: `diária × noites × quartos`. A conta é em centavos inteiros (sem erro
 * de ponto flutuante) e o resultado volta em reais.
 */
export const stayTotal = ({ pricePerNight, nights, rooms }: StayTotalInput): number =>
  centsToReais(reaisToCents(pricePerNight) * nights * rooms);
