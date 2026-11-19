# src/shared — fundação compartilhada (F1)

Só entra aqui o que **duas ou mais features** usam, ou primitivos óbvios de UI. Código de uma
feature só fica na feature; promova para cá quando aparecer o segundo uso.
`shared/` nunca importa de `features/` nem de `app/`.

## Estrutura
```
shared/
  api/        env · http · errors · schemas · query-keys · endpoints · queries
              query-client · server-query-client (só para Server Components)
  lib/        cn · dates · currency · format · search-params · storage · pagination
  ui/         atoms/ (Button, IconButton, Input, Select, Checkbox, Radio, Skeleton, Spinner,
                       Badge, Stars, VisuallyHidden)
              molecules/ (Field, QuantityStepper, Pagination, EmptyState, ErrorState, Alert, Dialog)
              toast/ (toast-store, Toaster) · layout/ (SiteHeader, SkipLink) · icons.tsx · index.ts
  providers/  AppProviders (QueryClientProvider + BookingDraftHydrator + Toaster)
  stores/     booking-draft.ts (Zustand + persist em sessionStorage)
  testing/    render.tsx (renderWithProviders) · fixtures.ts (makeHotel/Room/Review/SearchCriteria)
```

## Decisões que valem para todas as features
- **Critérios de busca: a URL é a fonte da verdade até o hotel.** F2 serializa com
  `serializeSearchCriteria`, F3/F4 repetem os params nos links e leem com `parseSearchCriteria`; no
  "Selecionar" a F4 grava `{ hotelId, roomId, criteria }` no `booking-draft` e a F5 lê do store
  (URL do checkout sem dados manipuláveis).
- **"Check-in no passado" não está no schema da URL** (depende do relógio e do fuso). Use
  `isBeforeToday(checkIn, todayISO())` no cliente: F2/F5 bloqueiam, F3/F4 só avisam.
- **`booking-draft`**: `skipHydration` + `BookingDraftHydrator`; a F5 deve esperar
  `useBookingDraftHydrated()` antes de redirecionar "sem seleção". Guarda só ids e critérios, nunca PII.
- **Datas são `YYYY-MM-DD`** (`ISODate`); nunca `new Date("2026-12-01")`. Use `dates.ts`.
- **Query keys** vivem em `api/query-keys.ts`; query options só dos endpoints usados por 2+ features
  (`hotelQueryOptions`, `hotelRoomsQueryOptions`, `roomQueryOptions`). O resto fica na feature dona.
- **`http.ts`**: `apiGet`, `apiGetPage` (`X-Total-Count`, exposto via CORS pela mock-api), `apiPost`;
  falhas viram `ApiError { kind, status }`. Texto de UI vem de `toUserMessage`, nunca do corpo da API.
- **Mutations sem retry** (`POST /bookings` não é idempotente). Queries: sem retry em 4xx/parse.
- **`<main id="main-content">` é do layout raiz**; páginas não renderizam `<main>`.
- **Shared não tem tela de catálogo**: componentes são provados por testes de componente.
- `Button loading` usa `disabled` + `aria-busy` (o rótulo permanece no nome acessível).
- `EmptyState`/`ErrorState` aceitam `headingLevel` (use 1 quando ocupam a página).

## ui/
- Fonte da verdade visual: `docs/design/design-system.md`. Tokens viram o `@theme` do Tailwind;
  nada de cor ou espaçamento solto (`#3b82f6`, `mt-[13px]`) nos componentes.
- Atomic Design: atoms não importam molecules; molecules compõem atoms.
- Todo componente aceita `className` e mescla com `cn()`; `ref` como prop (React 19).
- Acessível por padrão: `Field` liga label/erro/descrição por `id` e `aria-describedby` (erro sem
  `role="alert"`); `Dialog` usa `<dialog>` nativo (foco preso, Esc); `Skeleton` tem `aria-hidden`.
- Sem texto de negócio nos componentes de `ui/` (recebem por props).
- Componentes com hooks têm `"use client"` (Dialog, Toaster, AppProviders); os demais servem em RSC.

## Testes
Unitário obrigatório para tudo em `lib/` e para os schemas (casos válidos e inválidos; o seed inteiro de `mock-api/db.seed.json` deve passar).
