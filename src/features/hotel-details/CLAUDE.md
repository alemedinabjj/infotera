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
                         HotelNotFound
index.ts                 HotelDetailsView, HotelNotFound, loadHotel, parseHotelId, hotelPageTitle,
                         STAY_EDIT_TITLE_ID
```

## Decisões (valem daqui para frente)
- **Fetch paralelo (Decisão 1)**: `HotelDetailsView` dispara `void prefetchQuery` dos quartos e da 1ª página de
  avaliações **antes** do `await loadHotel`; `dehydrate` leva as promessas pendentes e as ilhas cliente usam
  `useSuspenseQuery` com as mesmas chaves (o prefetch do hover da F3 vale). O hotel também vai para o cache (F5).
- **404 "suave" (Decisão 2)**: hotel inexistente, id inválido (`parseHotelId`, sem chamar a API), foto de hotel
  inexistente e foto fora da faixa respondem `200` + `noindex` (`robots` no `generateMetadata`) com o "não encontrado"
  renderizado **inline** (`HotelNotFound`, `PhotoNotFoundView`), nunca por `notFound()`. Motivo (verificado no 16.4.6): sob
  `cacheComponents` todo `notFound()` sai como `<html id="__next_error__">` com corpo vazio e o conteúdo só no cliente
  (sem JS, tela em branco e sem título), e com `partialPrefetching: true` a 1ª visita a um id fora do `generateStaticParams`
  recebe uma casca de 0 byte. Por isso `partialPrefetching` fica `false` (explícito) e `[...rest]` também é inline. O custo é o
  status `200` no lugar de `404`; o `noindex` cobre o SEO. `e2e/not-found.prod.spec.ts` (`@prod`, sem JS) guarda isso.
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
- **"Selecionar quarto" entra no checkout com carga de documento** (`assignLocation("/checkout")`; a CSP com nonce é do
  documento); `pageshow` persistido zera o "Selecionando…". `cancellationDetails` vive em `shared/lib/cancellation`.
- **Sem barra de âncoras sticky, scrollspy nem barra de ação fixa.** O lightbox aceita swipe horizontal.

## Testes
Unit em `model/` e `api/` (seeds reais via `shared/testing/seed`); componente por seção; E2E em
`e2e/hotel-details*.spec.ts`. Falhas do **servidor** (hotel, quartos e 1ª página de avaliações) passam pelo
control-proxy do E2E: `serverApi.failServerRequests(hotelRoomsRequest(controlledHotel(parallelIndex)))` em
`e2e/hotel-details.rooms-error.spec.ts` (falha inicial dos quartos, retry de seção, axe; **só em dev**: no build os quartos vêm do cache ISR). Use sempre o hotel
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
- `osmLink`/`tileUrl` vieram de `shared/lib/geo` e `shared/lib/map-tiles`.

## F7b (i18n pt-BR + en-US)
- Todo texto vive em `i18n/` (`hotelDetailsMessages`, `Record<Locale, M>`). Client: `useHotelDetailsMessages()`. Server Components
  (`HotelHeader`, `HotelOverview`, `HotelPolicies`, `LocationMap`, `SectionNav`, `SoldOutAlert`, `SimilarHotels`) recebem `locale` por prop
  (vem dos `params` da página, via `HotelDetailsView`); `HotelNotFound` é client folha (usam o provider).
- Funções de `model/` aceitam `locale` (padrão pt-BR): rótulos de quarto, `selectabilityMessage/Badge`, comparação
  (`roomComparisonMessages(locale)` no lugar da constante), breadcrumb (já devolve `href` localizado e `navLabel`), `hotelPageTitle`, galeria, avaliações.
  `HOTEL_SECTIONS` guarda só `id` + `key`; o rótulo sai de `sectionLabel(key, locale)`.
- Links por `localizePath(locale, ...)`; `useSelectRoom` e o `HotelDatesForm` (app/) enviam para `/en/...` em inglês. Os textos do botão do formulário de datas
  vêm de `datesFormLabels(locale)` (exportado no `index.ts`, puro) e descem por prop até o client em `app/`.
- Conteúdo da API (descrição, comentários, nome e descrição do quarto, endereço, destino) é português: `lang={contentLang(locale)}`.
- `CompactHotelCard` (shared) virou client folha para ler o locale (link, tipo e selo de disponibilidade).
- E2E: `e2e/i18n.hotel.spec.ts` (sem português em `/en/hotel/:id`, links em `/en`, axe pt e en, 320 px).

## F7c (PPR + ISR + galeria como rota)
- **Catálogo em `"use cache"`** (`api/catalog.cached.ts`): `getHotelSnapshot` (hours), `getHotelRoomsSnapshot` (minutes), `getFirstReviewsSnapshot` (hours, com `fetchedAt`),
  `getSimilarHotelsSnapshot` (hours). Só sucesso ou `not-found` voltam do escopo cacheado (404 classificado **dentro**); erro é relançado, nunca guardado. Sem TanStack no
  servidor (`dehydrate`/`setQueryData` chamam `Date.now()`); `hotel.server.ts` e o `HydrationBoundary` saíram. `vitest.setup.ts` mocka `next/cache`.
- **Casca + 3 buracos**, todos de **uma promessa** `criteria: Promise<SearchCriteria | null>`: `HotelStayBar` (RSC async em Suspense; `StayBarView` é o cliente), `RoomStayAction`
  (cliente, `use(criteria)`, um Suspense por quarto; fallback `RoomStayActionSkeleton` com as alturas do total e do botão, `animate-none`, `aria-hidden`) e `StayAware`
  (render prop; fallback = o mesmo link sem critérios: breadcrumb, similares, alerta de esgotado). Diária `R$ … por noite, sem taxas` fica na casca (`PriceTag nightly-line withoutFees`);
  o selo da casca é do quarto (`roomStaticBadge`: esgotado ou "Apenas N"); com `insufficient` o `RoomStayAction` troca por `selectabilityBadge` ("Só N disponíveis", mesma posição e altura).
- `StayEditProvider` não recebe mais a chave dos critérios: `useStayEdit(criteriaKey)` (a chave só existe depois da promessa). `RoomSelectionProvider` guarda o "Selecionando…" da lista
  (atravessa as ilhas). `todayISO()` só depois de `await connection()` (servidor) ou depois do `use(criteria)` (cliente).
- **Falha de quartos/comentários não derruba a página (critério 24 da F4)**: `HotelDetailsView` resolve os dois **fora** do escopo cacheado com `settle()` (`api/settled.ts`:
  `{kind:"ok",value} | {kind:"error"}`, sem expor a causa); hotel continua relançando. O ramo de erro (`SectionRefreshError` nos quartos e nos comentários; "Preços indisponíveis no
  momento." no `FromPrice`) vai dentro de `RequestOnly` (Suspense + `await connection()`): nunca entra na casca estática. "Tentar de novo" = `useRefreshRetry` (`router.refresh()` em
  transition, botão fica em "Tentando…"; o foco vai ao h2 quando o componente desmonta depois de um retry). O `SectionBoundary`/`SectionError` (TanStack) ficou só para as páginas 2+ dos comentários.
- Avaliações: p.1 em `ReviewsStatic` (cliente sem TanStack, fallback e casca) e `ReviewsPager` (TanStack com `initialData`/`initialDataUpdatedAt = fetchedAt`) sob Suspense.
- **ISR**: `generateStaticParams = listPrerenderHotelIds` (todos os ids; 8 tentativas, 2 s → 15 s, `Aguardando a mock-api (tentativa n/8)…`; vazio ou esgotado = erro em pt-BR). Só falha de rede, timeout ou 5xx é repetida (`isRetryableBuildError`); `ApiError` `parse` (schema) e 4xx/404 falham na hora. O 404 do hotel (`getHotelSnapshot`) usa `cacheLife("minutes")`, não `hours`.
  `npm run build` precisa da API no ar. `/hotel/61` é gerado sob demanda e vai direto a "não encontrado" (sem skeleton antes).
- **Galeria como rota**: miniaturas são `PhotoLink` (`next/link`, `scroll={false}`, registra `data-photo-opener`). `PhotoModal` (`Dialog full`, prop nova `onClosed`/`describedBy`) fecha em
  `close()` → foco ao gatilho → **um** `router.back()`; `PhotoViewer` é a página cheia. Setas trocam o índice em estado e a URL por `history.replaceState` (sem request, sem entrada).
  `useCloseOnce` (trava, foco, um `router.back()`) é de `PhotoModal`, `PhotoModalLoading` e `PhotoModalError` (todos `Dialog full` via `PhotoModalFrame`). Activity preserva a rota escondida: o `Dialog` fecha de verdade ao esconder e reabre com `showModal()`; `usePhotoViewer` relê a foto da URL ao reexibir (`photoIndexFromPath`).
  `PhotoLink` abre a moldura de carregamento no clique (`usePhotoOpening`: o Next não mostra o loading do slot sem prefetch) e o estado offline sem navegar.
- Segunda entrada pública `client.ts` (`PhotoModalError`, `PhotoModalLoading`, `PhotoNotFound`, para `error.tsx`/`loading.tsx`/`not-found.tsx`). `PhotoNotFound` não linka para outra foto (seria interceptado) e pega o id do hotel por `useParams`.
- Trade-offs: reload na foto + "Voltar para o hotel" perde as datas (a galeria não depende de `searchParams`); cartão de erro do modal usa o anel `focus` padrão (claro).
- **Sem `loading.tsx` e sem Suspense nos similares (critério 5)**: o React põe fora do fluxo (`<div hidden id="S:…">`) toda boundary concluída maior que `progressiveChunkSize` (~12,8 KB); com o hotel inteiro num `loading.tsx` o conteúdo só aparecia com o script de troca. Os similares são `"use cache"` e já resolvem no prerender. Só os buracos da estadia suspendem. A página da foto também não tem `loading.tsx` (tem `generateStaticParams` e `instant = false`) e passa sem JS.

## F7c, rodada 4 (HTML sem JS, foco e avisos)
- **Paginação das avaliações** (`ReviewsPager`): os botões nascem `disabled` (`useHydrated`, snapshot de servidor `false`) e só habilitam depois de hidratar; o React troca o
  fallback pelo pager com o script inline antes do JS rodar e um clique nesse intervalo se perderia. `e2e/hotel-details.hydration.prod.spec.ts` segura os chunks por `page.route`.
- `settle(promise, { resource, hotelId })` registra `console.warn` estruturado (recurso, hotel, `kind` e `status` do `ApiError`; nunca corpo nem mensagem). Igual ao `logFailure` dos similares.
- `useRefreshRetry` guarda o h2 **da própria `<section>`** no clique (`anchorRef`) e só o foca no cleanup se `isConnected` e `checkVisibility()`: o Activity também dispara o cleanup ao
  esconder a rota, e `getElementById` poderia achar o h2 (mesmo id) de outro hotel.
- "Tentar de novo" que falha de novo: `useStillFailing(retrying)` + `StillFailingNotice` (`role="status"` sempre montado, `sr-only`) em `SectionRefreshError`, `SectionError` e
  `PhotoOpenError` (lógica em `model/retry-feedback.ts`). Cartão offline com a conexão de volta: título neutro `Conexão de volta` (`photoOpenStatus`). Limite: no `PhotoModalError`
  (`error.tsx`) o cartão remonta a cada falha e o estado se perde, então não há aviso de "ainda" ali.
- Página cheia sem JS: `<noscript><style>` esconde as setas (`data-photo-controls`); "Voltar para o hotel" usa anel de foco por dentro (`-outline-offset-2`).
