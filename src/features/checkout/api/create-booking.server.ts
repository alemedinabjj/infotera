import { type ApiErrorKind, apiGet, apiPost, isApiError } from "@/shared/api/http";
import { bookingSchema, hotelSchema, roomSchema } from "@/shared/api/schemas";
import { todayISO } from "@/shared/lib/dates";
import { bookingRequestSchema } from "../model/booking-request";
import type { CheckoutFieldPath } from "../model/checkout.schema";
import type { CreateBookingResult } from "../model/create-booking-result";
import { toBookingInput } from "../model/to-booking-input";
import { verifyBookingRequest } from "../model/verify-booking";

const FIELD_PATTERN =
  /^(contact\.(firstName|lastName|email|phone)|companions\.\d+\.(firstName|lastName|age)|payment\.cardNumber|termsAccepted)$/;

const isFieldPath = (path: string): path is CheckoutFieldPath => FIELD_PATTERN.test(path);

/** Caminhos do formulário citados pelos problemas do Zod (o que não é campo é descartado). */
const toFieldPaths = (issuePaths: readonly (readonly PropertyKey[])[]): CheckoutFieldPath[] => {
  const paths = issuePaths.map((path) => path.join("."));
  return [...new Set(paths.filter(isFieldPath))];
};

type FailureKind = ApiErrorKind | "unknown";

const failureOf = (error: unknown): { kind: FailureKind; status: number | null } =>
  isApiError(error)
    ? { kind: error.kind, status: error.status }
    : { kind: "unknown", status: null };

/** Só `{ event, kind, status }`: nada de PII nos logs do servidor. */
const logFailure = (event: string, error: unknown): FailureKind => {
  const { kind, status } = failureOf(error);
  console.error({ event, kind, status });
  return kind;
};

const isNotFound = (error: unknown): boolean => isApiError(error) && error.isNotFound();

/** Resposta perdida ou duplicata no retry: erro de rede, timeout ou 5xx. */
const isAmbiguousFailure = (error: unknown): boolean =>
  isApiError(error) &&
  (error.kind === "network" ||
    error.kind === "timeout" ||
    (error.kind === "http" && error.status !== null && error.status >= 500));

const bookingExists = async (id: string): Promise<boolean> => {
  try {
    await apiGet(`/bookings/${id}`, bookingSchema);
    return true;
  } catch {
    return false;
  }
};

/**
 * Cria a reserva no servidor (a Server Action só delega para cá). O cliente envia referências e
 * escolhas; hotel, quarto e preço são relidos/recalculados aqui e o `totalPrice` nunca vem do
 * cliente. O `id` é o `attemptId`: se o `POST` falhar de forma ambígua, um `GET /bookings/:id`
 * decide entre `created` (a reserva existe) e `failed`, então o retry não duplica.
 */
export const createBooking = async (
  input: unknown,
  now: Date = new Date(),
): Promise<CreateBookingResult> => {
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", fields: toFieldPaths(parsed.error.issues.map((i) => i.path)) };
  }
  const request = parsed.data;

  let verification: ReturnType<typeof verifyBookingRequest>;
  try {
    const [hotel, room] = await Promise.all([
      apiGet(`/hotels/${request.hotelId}`, hotelSchema),
      apiGet(`/rooms/${request.roomId}`, roomSchema),
    ]);
    verification = verifyBookingRequest(request, hotel, room, todayISO(now));
  } catch (error) {
    if (isNotFound(error)) return { status: "unavailable", available: 0 };
    return { status: "failed", kind: logFailure("create-booking:load", error) };
  }
  if (!verification.ok) return verification.rejection;

  const body = toBookingInput(request, verification.quote, now);
  try {
    await apiPost("/bookings", body, bookingSchema);
    return { status: "created", bookingId: body.id };
  } catch (error) {
    if (isAmbiguousFailure(error) && (await bookingExists(body.id))) {
      return { status: "created", bookingId: body.id };
    }
    return { status: "failed", kind: logFailure("create-booking:post", error) };
  }
};
