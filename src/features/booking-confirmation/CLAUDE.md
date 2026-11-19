# feature: booking-confirmation (`/confirmation/[bookingId]`) — F6

Recibo da reserva. Lê **sempre** `GET /bookings/:id` no servidor (reload e outra aba funcionam), nunca o store.
Spec: `docs/specs/F6-booking-confirmation.md` (Decisões 1–12 e `## UI/UX`). `app/` importa só o `index.ts`
(`error.tsx` importa apenas `@/shared/ui`, para não levar código de servidor ao cliente).

## Estrutura
```
model/      booking-id (parseBookingId: UUID v4 minúsculo) · load-result (BookingLoad, Settled, classifyLoadError) ·
            confirmation-view (toBookingView, toStayView) · guests · booked-at (America/Sao_Paulo) · metadata · booking-number
api/        booking (bookingQueryOptions) · confirmation.server (loadBooking, loadStayDetails) · confirmation-metadata.server
components/ BookingConfirmation (RSC) → ConfirmationView → Header/BookingNumber/StaySummary/GuestList/PaymentSummary/NextSteps
            StayDetailsSection + CheckTimes (streaming, Suspense) · RefreshButton · ilhas: CopyBookingNumber, NewSearchLink, RememberBooking
```

## Decisões que valem daqui para frente
- **Rota sempre dinâmica** (`await connection()`), `no-store`, `noindex, nofollow`. **Nota para a F7:** não aplicar PPR/ISR/`use cache`
  nesta rota (tem PII). O histórico (`shared/lib/booking-history`, `infotera:booking-history`) guarda só `{ id, savedAt }`; a F7 lista
  com `GET /bookings/:id` por id e remove os 404 (`removeFromHistory`).
- Id validado por `parseBookingId` antes de qualquer request; path com `encodeURIComponent` (`fetchBooking` em shared).
- Hotel e quarto começam juntos depois da reserva; a promessa (`loadStayDetails`, nunca rejeita) vai para o RSC em `<Suspense>`.
  `404` e quarto de outro hotel = `missing` (sem retry); o resto = `error` (um `ErrorState` e um `RefreshButton`; retry ok → foco no h2).
- Preço nunca recalculado: `priceBreakdown` só se `isBreakdownConsistent`, senão só `totalPrice`.
- PII mínima: sem telefone, idade nem documento na tela; título genérico; logs só `{ event, resource, kind, status }` (sem id).
- Copiar: **sem toast** (feedback no botão + linha `aria-live` abaixo, falha visível e número selecionado).
- `FocusOnMount` mora em `shared/ui` (usado também por `error.tsx`/`not-found.tsx`); "Está demorando…" é CSS puro (`animate-slow-notice`).
- Reservas somem ao reiniciar a mock-api (E2E cria a sua por `POST` direto; `_delay`/`_fail` não passam pelo `page.route` do servidor).
