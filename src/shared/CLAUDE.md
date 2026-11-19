# src/shared — fundação compartilhada (F1)

Só entra aqui o que **duas ou mais features** usam, ou primitivos óbvios de UI. Código de uma
feature só fica na feature; promova para cá quando aparecer o segundo uso.
`shared/` nunca importa de `features/` nem de `app/`.

## Estrutura
```
shared/
  api/        env · http · errors · schemas · query-keys · endpoints · queries
              query-client · server-query-client (só para Server Components)
  hooks/      useToday · useDebouncedValue · useOnline (F2) · useSlowLoading (F3)
  lib/        cn · dates · currency · format · search-params · storage · pagination · image · pricing · availability
              labels · links (`hotelHref`) · stay-summary (`describeStay`)
  ui/         atoms/ (Button (+button-styles), IconButton, Input, Select, Checkbox, Radio, Skeleton, Spinner,
                       Badge, Stars, VisuallyHidden)
              molecules/ (Field, QuantityStepper, Pagination, EmptyState, ErrorState, Alert, Dialog, RatingScore, PriceTag, card-styles)
                       atoms/RemoteImage (`next/image` + loader Unsplash + blur + fallback)
              ErrorBoundary (classe, `fallback({ error, reset })`, `resetKeys`)
              toast/ (toast-store, Toaster, copyCurrentUrl) · layout/ (SiteHeader, SkipLink) · icons.tsx · index.ts
  providers/  AppProviders (QueryClientProvider + BookingDraftHydrator + Toaster)
  stores/     booking-draft.ts (Zustand + persist em sessionStorage)
  testing/    render.tsx (renderWithProviders) · fixtures.ts (makeHotel/Room/Review/SearchCriteria) · seed.ts (hotéis/quartos reais do seed, só em testes)
              next-navigation.ts (mock de `next/navigation` sobre o `window.location`: `setTestUrl`, `navigationSpies`)
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
- `Button loading` usa `aria-disabled` + `aria-busy` + guarda no clique (nunca `disabled`: mantém o foco);
  `loadingText` troca o rótulo em `aria-live="polite"`. `QuantityStepper` usa o mesmo padrão nos limites.
- `EmptyState`/`ErrorState` aceitam `headingLevel` (use 1 quando ocupam a página).
- `QuantityStepper` aceita `hint` (motivo do limite): região `aria-live` sempre montada e `aria-describedby` (descrição + hint) nos dois botões.
- `search-params.ts` exporta `SEARCH_MESSAGES` e `applySearchCriteriaRules` (formulário da F2 e schema da URL compartilham as regras); `dates.ts` tem `formatDateRange(checkIn, checkOut, today)`.

- `Dialog` tem `placement: "center" | "sheet"` (bottom-sheet) e `initialFocus` (seletor do controle que recebe o foco ao abrir).
- `search-params.ts` também exporta `parseDestinationParam`; `format.ts` exporta `ratingLabel` (Excelente/Muito bom/Bom/Regular).
- Testes de componente que usam `next/navigation`: `vi.mock("next/navigation", async () => (await import("@/shared/testing/next-navigation")).navigationMock)`.

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

- `Dialog` ganhou `size="full"` (lightbox: tela cheia, fundo `fg`, anel de foco branco) e `onKeyDown`.
- `PriceTag`: `nightly-inline`, `room-nightly`, `stay` com `exactNightly` e `nightly-line` com `exact`. `RatingScore`:
  `reviewCount` opcional (nota solta de um comentário) e `size`.
- **CSP (F5)**: `img-src` precisa de `images.unsplash.com`, `i.pravatar.cc` e `tile.openstreetmap.org` (mapa do detalhe).

- `lib/focus-after-navigation`: `markFocusAfterNavigation(href)` no envio **válido** + `consumeFocusAfterNavigation()`
  em toda montagem (zera sempre; `true` só se `pathname+search === href`). Usado pela F4. **TODO hotel-search**:
  `useFocusAfterEdit` ainda usa o `pendingEdit` de módulo (marca antes de validar e sobrevive a envio inválido);
  migrar para este utilitário.
- `todayISO()` é sempre do fuso `America/Sao_Paulo` (servidor em UTC).

## Pendentes para features
Componentes do design system que a F1 não entrega; nascem na feature que os usa primeiro e sobem
para `shared/` quando aparecer o segundo uso.
- **Breadcrumb** (hoje em `hotel-details`) e a **tabela de comparação**: sobem quando a F5/F6 usar.
- **Avatar** (`ReviewAvatar`, em `hotel-details`) e **Combobox/DateRange** (`search-form`): promover no segundo uso.
