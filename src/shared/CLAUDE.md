# src/shared — fundação compartilhada (F1)

Só entra aqui o que **duas ou mais features** usam, ou primitivos óbvios de UI. Código de uma
feature só fica na feature; promova para cá quando aparecer o segundo uso.
`shared/` nunca importa de `features/` nem de `app/`.

## Estrutura
```
shared/
  api/        env · http · errors · schemas · query-keys · endpoints · queries
              query-client · server-query-client (só para Server Components)
  hooks/      useToday · useDebouncedValue · useOnline (F2) · useSlowLoading (F3) · useDeferredBlur (promovido da F2 na F5)
  lib/        cn · dates · currency · format · search-params · storage · pagination · image · pricing · availability
              labels · links (`hotelHref`) · stay-summary (`describeStay`) · csp (`buildCsp`, `BASELINE_DIRECTIVES`, `IMAGE_HOSTS`) ·
              navigation (`assignLocation`: carga de documento) · cancellation (`cancellationDetails`, promovido da F4)
  ui/         atoms/ (Button (+button-styles), IconButton, Input, Select, Checkbox, Radio, Skeleton, Spinner,
                       Badge, Stars, VisuallyHidden)
              molecules/ (Field, QuantityStepper, ErrorSummary (promovido da F2), Pagination, EmptyState, ErrorState, Alert, Dialog, RatingScore, PriceTag, card-styles)
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
- **Query keys** vivem em `api/query-keys.ts` (`hotels.infinite` é a rolagem contínua da F3b, com `InfiniteData`); query options só dos endpoints usados por 2+ features
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
  em toda montagem (zera sempre; `true` só se `pathname+search === href`). Usado pela F4 (`useFocusAfterDates`) e pela hotel-search
  (`useFocusAfterEdit`, via `app/search/SearchEditForm`).
- `todayISO()` é sempre do fuso `America/Sao_Paulo` (servidor em UTC).

## Pendentes para features
Componentes do design system que a F1 não entrega; nascem na feature que os usa primeiro e sobem
para `shared/` quando aparecer o segundo uso.
- **Breadcrumb** (hoje em `hotel-details`) e a **tabela de comparação**: sobem quando a F5/F6 usar.
- **Avatar** (`ReviewAvatar`, em `hotel-details`) e **Combobox/DateRange** (`search-form`): promover no segundo uso.

## F5 (checkout)
- `booking-draft.setRoomCount(rooms): boolean` valida os critérios resultantes com `searchCriteriaSchema` (inválido ou
  sem seleção não muda e devolve `false`).
- `bookingGuestSchema` tem contato opcional (só o titular), `kind` e `age`; `bookingInputSchema` aceita
  `priceBreakdown?` (centavos). `queryKeys.coupons.detail(code)`.
- `Dialog focusableBody` (corpo rolável vira região focável com foco inicial), `QuantityStepper locked`
  (`aria-disabled` nos dois botões), `Toaster data-toaster`, ícones `credit-card`/`lock`/`tag`, e o CSS da barra de
  ação fixa (`[data-action-bar]`) em `globals.css`.
- `ErrorSummary<Id>` é genérico por `id` (`{ id, label, message }[]` + `onSelect(id)`) e exporta `describeErrorCount`.
- `lib/scroll.ts`: `revealBelowHeader` (topo acima do header), `revealNearest` e `revealBlock` (revela um
  **bloco** entre o header e a barra fixa `[data-action-bar]` medida no DOM; usa `revealDelta`, função pura).
  `Field` marca o contêiner com `data-reveal-block` para o foco revelar rótulo, controle e erro inteiros.

## F6 (booking-confirmation)
- `lib/price-breakdown` (`SERVICE_FEE_BPS`, `ISS_BPS`, `PriceLine`, `priceLineLabel/Amount`, `priceBreakdownLines`, `isBreakdownConsistent`,
  `formatCents`), `ui/molecules/PriceBreakdown` (só apresentação; `afterStay`, `showTaxNote`), `lib/room-labels` (`bedsLabel`).
- `api/endpoints.fetchBooking` (id com `encodeURIComponent`), `lib/clipboard.copyText` (nunca lança; `copyCurrentUrl` usa),
  `lib/booking-history` (só ids, máx. 10, `localStorage`), `ui/FocusOnMount`, `CopyIcon`, `print:hidden` no header e no toaster.
- `testing/fixtures`: `makeBooking`, `BOOKING_ID`.

## F7a (extras de produto)
- **`saved/`** (favoritos e comparação, estrutura `model/ stores/ components/ hooks/ messages.ts`, mesmas regras de `shared`):
  stores Zustand `persist` em `localStorage` (`infotera:favorites` `{id,addedAt}` ≤ 100; `infotera:comparison` `{id,name}` ≤ 3), sempre
  `skipHydration`, saneados **por item** (`sanitizeFavorites`/`sanitizeComparison`). `StoreHydrator` (no lugar do
  `BookingDraftHydrator`) reidrata os três stores e ouve o evento `storage`. Componentes: `FavoriteButton` (`notify`, `onToggle`, `ref`),
  `CompareCheckbox` (limite com `aria-disabled`), `CompareTray` (+ `CompareTrayChips`/`CompareTrayAction`, região viva sempre montada,
  `--bottom-bar-height` por `ResizeObserver`, foco por teclado nunca coberto), `SavedNav` (header). **Server Components importam direto de
  `saved/components/*`**: o barrel `saved/index.ts` reexporta stores (client) e só serve a árvores cliente.
- Rotas em inglês: `/favorites`, `/compare`, `/my-bookings` (`saved/model/routes.ts` é a única fonte; `compareHref`).
- **Motion** (`motion@14.14.0`, só `motion/react`): `MotionProvider` = `LazyMotion` assíncrono + `strict` (só `m.*`) + `reducedMotion="user"`;
  `lib/motion.ts` tem os presets puros (`motionPreset(name, reduced, direction)`), `staggerDelay`, `shouldAnimateItem`, `stepDirection`.
  Política: só `opacity`/`transform`; nada renderizado no servidor começa invisível; listas só em opacidade. Os testes de componente que
  usam `m.*` renderizam com `renderWithProviders` (que traz `LazyMotion` síncrono): sem features, `m.*` nunca sai do `initial`.
  `MotionGlobalConfig.skipAnimations = true` no `vitest.setup.ts`. O `layout="position"` do toast da spec **não** foi usado: exige `domMax`.
- **Toast**: `toast.*(msg, { action?, key?, duration? })`; `key` igual substitui no lugar (`pushToast`, `version` reinicia o timer); 5 s,
  8 s (erro), 10 s com ação; o tempo pausa com hover/foco em **qualquer** toast da região e com a aba oculta (`useRegionPause`).
- **Dialog**: o painel é um `m.div` dentro de `AnimatePresence`; o `<dialog>` só fecha (e o foco volta ao gatilho) no `onExitComplete`
  (`finish`); `data-closing` esmaece o backdrop. Fechamento forçado (`close` nativo) sincroniza sem animar.
- `lib/focus.focusWhenReady`: foca quando o navegador deixar (controle que acabou de sair de `invisible`/`inert`; com reduced motion a regra
  global de `transition-duration` atrasa `visibility` por alguns quadros).
- `lib/booking-history` ganhou `removeManyFromHistory`, `clearBookingHistory`, `restoreHistoryEntry`/`restoreBookingHistory`,
  `subscribeBookingHistory` e `getBookingHistorySnapshot` (estável, para `useSyncExternalStore`); aceita UUID v4 **ou** o id curto do json-server.
- `api`: `fetchHotelsByIds` (nunca chama com lista vazia), `hotelsByIdsQueryOptions`, `bookingQueryOptions` (promovida, `meta.sensitive`
  para o cache offline da F7b não persistir PII), chaves `hotels.byIds`/`rooms.byHotels` (ids canônicos: `api/ids.ts`).
- `ComparisonTable`, `CompactHotelCard` e `lib/comparison` foram promovidos da F4; `ComparisonRow` tem `best`/`bestLabel`.

## F7b (plataforma: i18n, mapas, offline)
- **`i18n/`**: `config` (`LOCALES`, `Locale`, `isLocale`, `contentLang`), `paths` (`localizePath`, `parsePublicPath`, `switchLocalePath`, `isCheckoutPath`,
  `alternatesFor`, `resolveLocaleRequest` do proxy), `messages` (`defineMessages`, `plural`), `client` (`I18nProvider`, `useLocale`), `server` (`getLocale` por
  `next/root-params`), `cookie`, `common/` (dicionário comum + `useCommonMessages`). Rotas: pt-BR sem prefixo, en-US em `/en`; o `app/[locale]` recebe a
  URL reescrita pelo `proxy.ts`. **Nunca derive `href` de `usePathname()` em render** (rewrite do proxy): use `localizePath(useLocale(), "/rota")`.
  Todo texto novo nasce em `i18n/` (a catraca `src/i18n-guard.test.ts` conta o que ainda está fora).
- Formatadores (`formatBRL`, `formatRating`, `formatDate`, `formatDateRange`, `formatCount`) aceitam `locale` (opcional, padrão pt-BR).
- **Mapa**: `lib/map-tiles` (`TILE_ORIGIN`/`TILE_URL`/`MAX_ZOOM`/`tileUrl`, única fonte da CSP e do cache do SW), `lib/geo` (`boundsOf`, `fitPlan`, `osmLink`),
  `ui/map/` (`InteractiveMapImpl` react-leaflet + `MapMarkerElement` (DOM por `textContent`, nunca HTML) + `map.css` + `useInteractiveMap` que carrega o
  chunk sob demanda com `retry`). `leaflet.css` é CSS sem camada e vence os utilitários do Tailwind (cor de `a` dentro do mapa usa `!`).
- **Offline**: `api/persist.ts` (allowlist `PERSISTABLE_ROOTS` = suggestions/hotels/rooms/reviews, **nunca** `meta.sensitive === true` nem `bookings`;
  `serializeClient` refiltra), `AppProviders` usa `PersistQueryClientProvider` (24 h, `buster` = `APP_VERSION`), `makeQueryClient` tem `gcTime` 24 h no navegador.
  `hooks/useHydrated` evita divergência de hidratação com dado restaurado. Toast aceita `persistent: true`.
- `lib/brand` (cores de marca fora do CSS; um teste compara com os tokens de `globals.css`) e `lib/app-version` (`NEXT_PUBLIC_APP_VERSION`).
- **CSP do checkout**: ganhou `worker-src 'self'` (com `strict-dynamic` o fallback ignoraria `'self'`) e `manifest-src 'self'`; `img-src` vem de `TILE_ORIGIN`.
