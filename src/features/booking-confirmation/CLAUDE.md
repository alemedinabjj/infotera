# feature: booking-confirmation (`/confirmation/[bookingId]`) — F6

Recibo da reserva. Lê **sempre** `GET /bookings/:id` no servidor (reload e outra aba funcionam), nunca o store.
Spec: `docs/specs/F6-booking-confirmation.md` (Decisões 1–12 e `## UI/UX`). `app/` importa só o `index.ts`
(`error.tsx` importa apenas `@/shared/ui`, para não levar código de servidor ao cliente).

## Estrutura
```
model/      booking-id (parseBookingId: UUID v4 minúsculo ou id curto do json-server) · load-result (BookingLoad, Settled, classifyLoadError) ·
            confirmation-view (toBookingView, toStayView) · guests · booked-at (America/Sao_Paulo) · metadata · booking-number
api/        booking (bookingQueryOptions) · confirmation.server (loadBooking, loadStayDetails) · confirmation-metadata.server
i18n/       pt-BR · en-US · messages (`confirmationMessages`); `hooks/useConfirmationMessages` nas ilhas cliente
components/ BookingConfirmation (RSC) → ConfirmationView → Header/BookingNumber/StaySummary/GuestList/PaymentSummary/NextSteps
            StayDetailsSection + CheckTimes (streaming, Suspense) · RefreshButton · ilhas: CopyBookingNumber, NewSearchLink, RememberBooking
```

## Decisões que valem daqui para frente
- **Rota sempre dinâmica** (`await connection()`), `no-store`, `noindex, nofollow`. **Nota para a F7:** não aplicar PPR/ISR/`use cache`
  nesta rota (tem PII). O histórico (`shared/lib/booking-history`, `infotera:booking-history`) guarda só `{ id, savedAt }`; a F7 lista
  com `GET /bookings/:id` por id e remove os 404 (`removeFromHistory`).
- Ids aceitos: UUID v4 (principal, normalizado para minúsculas) e o id curto que o json-server gera para
  reservas criadas pelo `curl` do README (`^[A-Za-z0-9_-]{6,36}$`, caixa preservada, ex.: `L-nHVI_`). Ids só com
  dígitos (e UUID de outra versão, ou sem hífens) continuam rejeitados: anti-enumeração.
- Id validado por `parseBookingId` antes de qualquer request; path com `encodeURIComponent` (`fetchBooking` em shared).
- Hotel e quarto começam juntos depois da reserva; a promessa (`loadStayDetails`, nunca rejeita) vai para o RSC em `<Suspense>`.
  `404` e quarto de outro hotel = `missing` (sem retry); o resto = `error` (um `ErrorState` e um `RefreshButton`; retry ok → foco no h2).
- Preço nunca recalculado: `priceBreakdown` só se `isBreakdownConsistent`, senão só `totalPrice`.
- PII mínima: sem telefone, idade nem documento na tela; título genérico; logs só `{ event, resource, kind, status }` (sem id).
- Copiar: **sem toast** (feedback no botão + linha `aria-live` abaixo, falha visível e número selecionado).
- `FocusOnMount` mora em `shared/ui` (usado também por `error.tsx`/`not-found.tsx`); "Está demorando…" é CSS puro (`animate-slow-notice`).
- Reservas somem ao reiniciar a mock-api (E2E cria a sua por `POST` direto). Hotel e quarto são requests do **servidor**: o E2E os segura/falha pelo
  control-proxy (`serverApi`, hotel exclusivo do worker via `controlledHotel`): `booking-confirmation.layout-shift.spec.ts`
  (segura, mede o skeleton, solta, mede o final) e `booking-confirmation.section-error.spec.ts` (critérios 13 e 19).
- **i18n (F7b)**: os Server Components recebem `locale` por prop (`BookingConfirmation` lê `getLocale()` uma vez); as funções de `model/` aceitam `locale`
  (padrão pt-BR): `toBookingView`, `toStayView`, `checkTimes`, `describeGuests`, `formatBookedAt` (sempre horário de Brasília; en-US em 12 h),
  `confirmationTitle`. `not-found.tsx` é async e renderiza `<title>`/`<meta robots>` (só o `not-found` raiz aceita `generateMetadata`).
  "Fazer nova busca" usa `common.routes.newSearch`; links de saída passam por `localizePath`. O e-mail mascarado e o código curto não mudam.
