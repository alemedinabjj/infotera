# feature: hotel-search (`/search`) — F3

Lista de hotéis do destino com filtros, ordenação e paginação. **A URL é a fonte da verdade**:
filtros, ordenação e página vivem nos search params, nada disso vai para o Zustand.
Spec: `docs/specs/F3-hotel-search.md` (inclui `## UI/UX` e os "Ajustes aos critérios").

## Estrutura
```
model/search-filters.ts   tipos, PRICE_RANGE, parse tolerante por chave, serialização canônica, withFilters, contadores
model/filter-change.ts    applyFilterChange (reducer exaustivo; toda ação zera a página; clear mantém a ordenação)
model/to-api-query.ts     filtros → query da mock-api; amenitiesPattern (regex com lookaheads = E); SORT_TO_API
model/search-page.ts      parseSearchPage (missing-destination | browse | stay), hotelHref, título, resumo, key
model/card-pricing.ts     bloco de preço do card (disponibilidade + total) · stay-price.ts (centavos) · availability.ts
model/results-view.ts     deriveResultsView, toolbar, anúncios, rótulo do primário do sheet, página fora do intervalo
model/price-range.ts      limite entre os dois sliders, aria-valuetext, resumo · labels.ts · card-amenities.ts · image.ts
api/hotels.ts             hotelsQueryOptions(destination, filters) → { items, total } + keepPreviousIfSameDestination
hooks/useSearchFilters    lê (useSearchParams) e grava (history.replaceState) · useHotelResults · usePrefetchHotel
hooks/usePriceDraft       sliders locais, commit 400 ms, ressincroniza com a URL · useFocusOnPageChange · useSlowLoading
hooks/useCopyLink · useCloseOnDesktop · useFocusAfterEdit
components/               HotelSearchResults (cliente) · ResultsToolbar/Section/List/Skeleton/Empty/Error · HotelCard(+Footer,
                          Image, Skeleton) · RatingScore · PriceTag · FiltersPanel/Fields/Drawer + um componente por filtro ·
                          SearchHeader · MissingDestination
index.ts                  API pública usada por app/search
```

## Decisões que valem daqui para frente
- **Comodidades com E no servidor**: `amenities_like` repetido é OU; uma única regex com lookaheads
  (`^(?=.*\bpool\b)(?=.*\bspa\b)`) sobre `String(array)` exige todas. Montada só com o enum
  `amenitySchema` (sem injeção). Teste unitário roda a regex contra o seed inteiro. Plano B (se o
  backend trocar): buscar o destino inteiro (máx. 14) e filtrar/paginar no cliente.
- **Lista buscada no cliente** (`useQuery`); o RSC só valida critérios e renderiza a casca. Nada no
  RSC pode depender de filtro. Critérios entram por props; filtros por `useSearchParams`.
- **Escrita por `window.history.replaceState`** (Next 16 integra a History API; sem roundtrip ao
  servidor). O Next atualiza `useSearchParams` numa transition: `useSearchFilters` guarda o valor
  otimista enquanto a URL lida ainda é a de antes (senão o checkbox "desmarca" por um instante).
  Paginação usa links reais (`Pagination getHref`): empilha no histórico, Voltar funciona.
- **Vocabulário próprio na URL** (`minPrice`, `maxPrice`, `minRating`, `type`, `amenity`, `sort`, `page`),
  parse tolerante por chave, serialização canônica (omite padrões, ordem do enum). Nova busca = filtros zerados.
- **Preço do card = `pricePerNight` do hotel** (coerente com filtro/ordenação); "a partir de" pelos quartos é da F4.
  Total do card = `stayTotal` em centavos, sem taxas (rótulo "total · N noites · N quartos").
- **Sliders**: dois `<input type="range">` (0–3.000, passo 50), 3.000 = sem máximo. Valor local imediato,
  URL 400 ms depois do último movimento; nunca regrava um valor debounced que ficou para trás.
- **Placeholder só do mesmo destino** e nunca em erro/offline (`deriveResultsView`): lista dos filtros
  antigos não fica sob os controles novos. Offline = `fetchStatus === "paused"`.
- **Erros**: retry do query client + `ErrorState` com "Tentar de novo"; erro de renderização cai na
  `ErrorBoundary` (shared) só na seção de resultados; `error.tsx` da rota usa `retry` (Next 16.4).
- **Prefetch do detalhe** com intenção (mouse 150 ms; foco na hora) usando `hotelQueryOptions` e
  `hotelRoomsQueryOptions` de `shared`. **Sem `router.prefetch`** (o `<Link>` já prefetcha a rota).
  Contrato para a F4: ler hotel/quartos com essas mesmas options nas partes cliente (ou hidratar com a mesma chave).
- **Imagem**: `unsplashLoader` (imgix redimensiona na borda) + blur constante. A CSP da F5 precisa
  liberar `images.unsplash.com` direto em `img-src`.
- **Três modos** (`parseSearchPage`): sem destino (formulário com recentes), `browse` (lista sem total, painel
  aberto) e `stay`. "Alterar busca" é o `SearchForm` da F2 compondo por slot em `app/search/page.tsx`
  (`showRecentSearches={false}`); `key` = critérios remonta e fecha o painel; foco vai ao h1 (`useFocusAfterEdit`).
- **Sheet de filtros** = `Dialog placement="sheet"` com `initialFocus` no slider Mínimo; o anunciador principal
  fica mudo com o sheet aberto (o sheet tem o seu).
- Fora do escopo (ver spec): ordenação por distância, virtualização/infinite scroll (entram no incremento F3b), facets, chips.

## Acessibilidade
- Filtros em `fieldset`/`legend`; h1 → h2 (`Alterar busca` sr-only, `Filtros`, contagem) → h3 (nomes).
- Card: um único link (nome) com `::after` cobrindo o card; foco no `article` por `has-[a:focus-visible]`.
- Foco programático sempre com `preventScroll` + `revealBelowHeader` (header fixo).
- Anunciador `aria-live` separado do h2; carregando → demorando → contagem; troca em andamento não anuncia.

## Testes
- Unit em `model/` e `api/` (tabelas; regex contra o seed). Componente com `shared/testing/next-navigation`
  (URL do jsdom, `replaceState`/`popstate`) e `fetch` stubado por URL.
- E2E (`hotel-search.spec.ts`, `.states.spec.ts`, `.mobile.spec.ts`): mock-api real, `_delay`/`_fail`
  pelos fixtures, offline, axe (lista, sheet, vazio, erro, sem destino), 320 px.
