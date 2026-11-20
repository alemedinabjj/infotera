"use server";

import type { CreateBookingResult } from "../model/create-booking-result";
import { createBooking } from "./create-booking.server";

/**
 * Server Action da reserva. Recebe `unknown` (entrada não confiável, validada com Zod no servidor)
 * e **não lança**: o resultado é uma union por `status` (o Next esconde mensagens de erro em
 * produção).
 */
export const createBookingAction = async (input: unknown): Promise<CreateBookingResult> =>
  createBooking(input);
