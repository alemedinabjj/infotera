# feature: hotel-details (`/hotel/[hotelId]`) — F4

Página do hotel. Server-first: o hotel é renderizado no servidor; quartos e avaliações são prefetchados
no servidor e lidos no cliente. Spec: `docs/specs/F4-hotel-details.md` (inclui `## UI/UX`).

## Estrutura
```
api/hotel.server.ts      loadHotel(id, queryClient?) (404 → { kind: "not-found" }; outros erros relançados)
api/reviews.ts           fetchReviewsPage · reviewsQueryOptions(hotelId, page) · REVIEWS_PAGE_SIZE (_sort=date,id desc)
api/similar.ts           fetchSimilarHotels(destination, excludeId) (RSC, sem cache do cliente)
model/                   hotel-id (parseHotelId) · metadata · room-selectability · room-labels ·
                         room-comparison · gallery · static-map (Web Mercator) · cancellation · breadcrumb ·
                         sections (HOTEL_SECTIONS, ids) · reviews
hooks/                   useSelectRoom · useSectionRetry · useReviewsPage (+ useFocusOnNewPage) · useLightbox ·
                         useFocusAfterDates · useSwipe · focus-heading · focus-dates
components/              HotelDetailsView (RSC) · HotelHeader · Breadcrumb · SectionNav · Section · Gallery/Lightbox ·
                         HotelOverview/Policies/LocationMap (RSC) · HotelStayBar · RoomsSection/RoomList/RoomCard ·
                         StayEditContext (painel de datas) · RoomComparison/ComparisonTable · MapTile · ReviewsSection · SimilarHotels (RSC async) · SectionBoundary/SectionError ·
                         HotelDetailsSkeleton · HotelNotFound
index.ts                 HotelDetailsView, HotelDetailsSkeleton, HotelNotFound, loadHotel, parseHotelId, hotelPageTitle,
                         STAY_EDIT_TITLE_ID
```

## Decisões (valem daqui para frente)
- **Fetch paralelo (Decisão 1)**: `HotelDetailsView` dispara `void prefetchQuery` dos quartos e da 1ª página de
  avaliações **antes** do `await loadHotel`; `dehydrate` leva as promessas pendentes e as ilhas cliente usam
  `useSuspenseQuery` com as mesmas chaves (o prefetch do hover da F3 vale). O hotel também vai para o cache (F5).
- **`loading.tsx` + 404 "suave" (Decisão 2)**: o skeleton aparece na hora (cold start da API), então hotel
  inexistente responde `200` + `<meta name="robots" content="noindex">` (vem no HTML do servidor; o React a
  move no cliente). Id inválido (`parseHotelId`) → `notFound()` sem chamar a API.
- **Formulário de datas por `app/`**: `renderDatesForm(destination)` (função servidor→servidor; o destino só se
  conhece depois do hotel) monta `app/hotel/[hotelId]/HotelDatesForm` (client, porque `getSubmitHref` é função)
  sobre o `SearchForm` da F2 (`fixedDestination`, `getSubmitHref`, envio sem rolar).
- **Datas passadas no servidor**: como na F3, `pastDates` vem pronto por prop (sem `useToday`, sem layout shift).
- **Retry no lugar (Decisão 17, ajustada)**: `SectionBoundary` = `ErrorBoundary` + `Suspense` por seção. "Tentar
  de novo" usa `queryClient.fetchQuery` (não depende de observadores; `refetchQueries` ignora query só com
  observador desabilitado) e mantém o botão em "Tentando…"; só no sucesso reseta a boundary e foca o h2. Sem
  `QueryErrorResetBoundary` (não é necessário com `fetchQuery`). `FromPrice` observa a mesma query e reseta a sua.
- **Avaliações**: `page` em estado local + `startTransition` (a paginação só marca a página quando o dado chega);
  offline = `Alert` acima da lista atual; erro troca a lista pelo `ErrorState`. Foco no h2 ao chegar a página.
- **Similares**: RSC assíncrono sob Suspense; falha vira texto + link (nunca derruba a página).
- **Mapa**: tiles OSM por `staticMapLayout` (`next/image unoptimized`); `LocationMap` isolado para trocar por Leaflet.
  Atribuição fora do `role="img"`.
- **Texto de cancelamento é ilustrativo**: a API só informa a categoria; os prazos ficam em `cancellationDetails`.
- **Regra de import**: `app/hotel/[hotelId]/error.tsx` é client e usa só `@/shared/ui` (o `index.ts` leva
  `loadHotel` ao bundle do cliente). Constantes usadas por RSC (`STAY_EDIT_TITLE_ID`) ficam em `model/`, nunca em
  arquivo `"use client"`.
- **Foco após enviar datas**: `markFocusAfterNavigation(href)` (shared) é chamado em `HotelDatesForm` só no
  envio válido; `useFocusAfterDates` consome o sinal. Nada de sinal de módulo próprio.
- **Painel de datas**: `StayEditProvider` (client) liga `HotelStayBar` e os botões "Escolher datas" dos quartos
  (sem datas ou datas passadas = `needs-dates`/`past-dates`). Nome acessível do botão do quarto é `aria-label`.
- **Aviso de demora no `loading.tsx`**: CSS (`animate-slow-notice`) numa região `role="status"`; sem hook.
- **"Selecionar quarto" entra no checkout com carga de documento** (`assignLocation("/checkout")`; a CSP com nonce é do
  documento); `pageshow` persistido zera o "Selecionando…". `cancellationDetails` vive em `shared/lib/cancellation`.
- **Sem barra de âncoras sticky, scrollspy nem barra de ação fixa.** O lightbox aceita swipe horizontal.

## Testes
Unit em `model/` e `api/` (seeds reais via `shared/testing/seed`); componente por seção; E2E em
`e2e/hotel-details*.spec.ts`. Falhas do **servidor** (hotel, quartos e 1ª página de avaliações) passam pelo
control-proxy do E2E: `serverApi.failServerRequests(hotelRoomsRequest(controlledHotel(parallelIndex)))` em
`e2e/hotel-details.rooms-error.spec.ts` (falha inicial dos quartos, retry de seção, axe). Use sempre o hotel
exclusivo do worker (`controlledHotel`, ids 31-40) para não afetar testes em paralelo.

## F7a (extras)
- `HotelHeader` ganhou `FavoriteButton` (ao lado do h1) e `CompareCheckbox` (na linha de ações, antes de "Copiar link"):
  importados direto de `@/shared/saved/components/*` porque o header é Server Component (o barrel `saved/index.ts` puxa os stores).
- Promovidos para `shared`: `lowestNightlyPrice` (`lib/pricing`), `searchHref` (`lib/links`), `makeRow`/`ComparisonRow`/`onlyDifferences`
  (`lib/comparison`), a tabela (`ui/molecules/ComparisonTable`, com "Mostrar só diferenças", legenda e anúncio) e o card
  compacto (`ui/molecules/CompactHotelCard`, que substituiu o `SimilarHotelCard`). Os textos da tabela de quartos ficam em
  `ROOM_COMPARISON_MESSAGES` (`model/room-comparison.ts`).

## F7b (mapa interativo)
- `LocationMap` (RSC) envolve o mapa estático (`StaticMap`) em `InteractiveLocationMap` (ilha cliente): a moldura `aspect-[2/1]` é a mesma, o
  Leaflet carrega por cima quando a moldura chega a 200 px da viewport **e** há rede (`useNearViewport` + `useOnline` + `useInteractiveMap`), e o estático
  só sai depois do primeiro lote de tiles (`onTilesLoad`). Chunk ou tiles com erro (`onTilesError`): o estático fica, sem mensagem.
- `osmLink`/`tileUrl` vieram de `shared/lib/geo` e `shared/lib/map-tiles`. `i18n/` começa só com `location.mapRegion` (resto na parte 2).
