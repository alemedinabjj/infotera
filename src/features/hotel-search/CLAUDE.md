# feature: hotel-search (`/search`) — F3 + F3b

Lista de hotéis do destino com filtros, ordenação e paginação. **A URL é a fonte da verdade**:
filtros, ordenação e página vivem nos search params, nada disso vai para o Zustand.
Spec: `docs/specs/F3-hotel-search.md` (inclui `## UI/UX` e os "Ajustes aos critérios") e
`docs/specs/F3b-hotel-search-optionals.md` (distância, rolagem contínua, virtualização, boundaries).

## Estrutura
```
model/search-filters.ts   tipos, PRICE_RANGE, parse tolerante por chave, serialização canônica, withFilters, contadores
model/filter-change.ts    applyFilterChange (reducer exaustivo; toda ação zera a página; clear mantém a ordenação)
model/to-api-query.ts     filtros → query da mock-api; amenitiesPattern (regex com lookaheads = E); SORT_TO_API;
                          toHotelsRequest (server | distance) + hotelsRequestKey
model/distance.ts         centroide, haversine, sortByDistance, formatDistanceFromCenter, slicePage
model/feed.ts             rodapé do feed, anúncio do lote, withPinnedIndex, feedKeyTarget (teclado do feed)
model/search-page.ts      parseSearchPage (missing-destination | browse | stay), hotelHref, título, resumo, key
model/card-pricing.ts     bloco de preço do card (disponibilidade + total) · stay-price.ts (centavos) · availability.ts
model/results-view.ts     deriveResultsView, toolbar, anúncios, rótulo do primário do sheet, página fora do intervalo
model/price-range.ts      limite entre os dois sliders, aria-valuetext, resumo · labels.ts · card-amenities.ts · image.ts
api/hotels.ts             fetchHotelsPage → { items, total, center }, hotelsQueryOptions, keepPreviousIfSameDestination<T>
api/hotels-infinite.ts    hotelsInfiniteQueryOptions (lotes de 10) · api/view-switch.ts (cache cruzado páginas ↔ feed)
hooks/useSearchFilters    lê (useSearchParams) e grava (history.replaceState) · useHotelResults · usePrefetchHotel
hooks/usePriceDraft       sliders locais, timer de 400 ms no handler (cancelado por mudança externa) · useSlowLoading
hooks/useResultsController  liga filtros + query + foco/altura · useFocusOnPageChange · useFocusAfterRetry · useKeepResultsHeight
hooks/useHotelFeed · results-model (ResultsModel/FeedState) · useResultsText · useFeedVirtualizer (+ useFeedGeometry,
  useFocusedIndex, useMediaQuery) · useFeedKeyboard · useAutoLoadMore · useFocusFeedItem · useFeedAnnouncement
hooks/useCloseOnDesktop · useFocusAfterEdit
components/               HotelSearchResults (cliente) · ResultsToolbar/Section/List/Skeleton/Empty/Error · HotelCard(+Footer,
                          Image, Skeleton) · RatingScore · PriceTag · FiltersPanel/Fields/Drawer + um componente por filtro ·
                          SearchHeader · MissingDestination
                          F3b: HotelFeed/FeedItems/FeedFooter · ListModeSelect · DistanceHelp · HotelCardDistance ·
                          ResultsControls · FiltersBoundary/FiltersError
testing/                  harness (API stubada, render) e IntersectionObserver falso para os testes de componente
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
- **Foco só por navegação**: o foco vai ao h2 quando a página muda com os mesmos filtros (link, Voltar);
  filtro/ordenação/preço na página ≥ 2 volta à 1 mas o foco fica no controle (`filtersKey`). Depois de
  "Tentar de novo" o foco vai ao h2 quando a lista chega (`useFocusAfterRetry`).
- **Retry**: no TanStack v5 o refetch de query sem dados volta a `pending`; `useHotelResults` mantém a
  visão `error` (botão "Tentando…") enquanto `errorUpdateCount > 0` e ainda sem dado.
- **Altura segurada (≥ lg)**: antes de aplicar um filtro guardamos `offsetHeight` da coluna de resultados
  como `min-height` (o controle não pula quando a lista encolhe); liberada na paginação, Voltar ou outro
  destino. Escolhida em vez de rolar para o h2 porque o controle fica parado sob o cursor. Sem efeito no sheet.
- **Fotos**: schemas só aceitam `images.unsplash.com` (fotos) e `i.pravatar.cc` (avatares); o loader devolve o
  placeholder cinza para host desconhecido. Aviso de datas passadas é calculado no RSC (sem deslocar a página).
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
- Fora do escopo: facets, chips, Web Share (F4), geolocalização do usuário ("perto de mim"), persistir o modo de exibição.

## F3b: distância, rolagem contínua e virtualização
- **Centro = centroide (média de lat/long) de TODOS os hotéis do destino, sem filtros** (a mock-api não tem
  coordenada de destino). `computeCentroid` devolve `null` com < 2 hotéis: sem linha de distância e
  `sort=distance` cai para `id`. Distância em linha reta (haversine); formato em `formatDistanceFromCenter` (`a 2,3 km do ponto central`; `title` + ", em linha reta" no card)
  (50 m < 1 km; 1 casa até 10 km; inteiro depois; a unidade é escolhida depois de arredondar).
- **`sort=distance`**: busca a lista inteira com os filtros de servidor (sem `_sort/_page/_limit`) e ordena/pagina no
  cliente; página 2 e lote 2 saem do cache. Nas ordenações de API o centroide vem em paralelo e é OPCIONAL
  (falha → sem distância); em `distance` é obrigatório (erro + retry). **Retry só na query externa**: os `fetchQuery`
  internos (lista inteira e centroide) têm `retry: false`; senão o retry se multiplicava (9 requests, ~15 s até o
  erro). O centroide e a lista sem filtros têm a MESMA chave: um request só. `fetchQuery` interno não herda o `signal`.
- **`view=infinite` na URL** (padrão `pages` omitido): preferência de exibição, não conta em "Filtros (n)", `clear`
  mantém `sort` e `view`, trocar volta à página 1; no feed `page` é ignorado/omitido.
- **Dois hooks sempre montados** (`useHotelResults` e `useHotelFeed`, só um com `enabled`) para a toolbar e o foco
  no select "Exibir" nunca desmontarem. Troca de modo sem skeleton: `seedViewSwitch` copia a página 1 ↔ 1º lote
  no cache ao trocar (não por `initialData`: a query inativa já existe quando o modo muda).
- **Carregamento híbrido**: `IntersectionObserver` (margem de 600 px) + botão "Carregar mais hotéis" sempre
  presente. Erro no lote nunca re-dispara sozinho. O botão é O MESMO elemento em `more`/`loading-more`/`error-more`
  (vira "Tentar de novo"/"Tentando…"): o foco não se perde e nada se move sob o clique. Foco no 1º card novo quando
  o lote chega e o foco estava no botão: a decisão é tomada ao PEDIR o lote (com cache o lote chega antes de
  qualquer render intermediário, e no último o botão sai do DOM junto com a chegada dos cards). O pedido de foco
  é cancelado por erro no lote e por troca de filtro (`FeedState.queryKey`): só o crescimento vindo de
  `fetchNextPage` move o foco. Lote com itens na tela tenta 1 vez a mais (`nextBatchRetry`), não 2.
  A mensagem de erro do lote (e erro/offline da lista) é trazida à vista com `revealNearest` (`RevealOnMount`),
  sem mover o foco. Com troca de filtro em andamento o rodapé fica `invisible` e sem carregamento automático.
  O anúncio "Mais N hotéis carregados" só vale quando o nº de lotes cresce na MESMA consulta; durante o lote
  o anunciador geral fica mudo (o botão já diz "Carregando mais hotéis…").
- **Padrão ARIA `feed`**: `role="feed"` rotulado pelo h2, `article` com `aria-posinset/setsize/labelledby` e
  `tabIndex=-1`; PageDown/PageUp, Ctrl+End (rodapé) e Ctrl+Home (h2) por `addEventListener` num contêiner que envolve feed + rodapé
  (Ctrl+Home vale a partir do rodapé); `scrollPaddingEnd` de 24 px evita o anel de foco cortado no PageDown.
- **Virtualização** (`@tanstack/react-virtual@3.14.26`, `useWindowVirtualizer`): rolagem da janela, `scrollMargin`
  medido (ResizeObserver no `body`), `scrollPaddingStart` = `scroll-padding-top` do `html`, card com foco sempre
  montado (`withPinnedIndex` no `rangeExtractor`), cada `article` posicionado por `transform` (sem `div` extra entre
  `feed` e `article`). O virtualizador mede por `offsetHeight` (jsdom: stub nos testes) e limita a rolagem a
  `documentElement.scrollHeight - innerHeight`. Demonstra o requisito: com 14 hotéis ficam ~6–7 `article` no DOM.
  Trade-offs: Ctrl+F não acha card fora da janela e o modo navegação do leitor percorre só os montados (mitigado por
  `aria-setsize/posinset`, teclado do feed e paginação como padrão).
- **Error boundary por seção**: resultados, sidebar de filtros e corpo do sheet (`FiltersBoundary`), cada uma com
  `resetKeys` = query canônica dos filtros.
- **E2E**: sem F4 nesta branch a rota `/hotel/[id]` não existe (navegação dura); o teste de "voltar mostra os 14"
  sai pelo header (soft). `selectOption` do Playwright não move o foco: use `focus()` + teclado.

### Notas para o README
- "Centro" é o ponto médio dos hotéis cadastrados, não o centro oficial da cidade (Florianópolis: o Costão do
  Santinho puxa o centroide e fica a 20 km). Melhoria: mediana/medoide (mais robusta a outlier).
- A virtualização é demonstração do requisito (14 hotéis/destino); o padrão continua sendo a paginação. A
  complexidade do feed virtualizado (geometria, foco fixado, teclado) é INTENCIONAL: demonstra a técnica com ≤ 14
  itens; num produto real com esse volume bastaria a paginação.
- Teto conhecido: com backend maior, a ordenação por distância viraria endpoint no servidor.

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
