# F3b — hotel-search: opcionais restantes de `/search`

## Objetivo

Fechar os avançados da seção 2 do enunciado que a F3 deixou de fora: **ordenação por distância**
(centro = centroide dos hotéis do destino, distância exibida no card), **modo de listagem "rolagem
contínua"** (`useInfiniteQuery`) com **virtualização** (`@tanstack/react-virtual`) como alternativa
à paginação, que continua sendo o padrão, e **error boundaries por seção** também nos filtros.
Toda regra nova (centroide, distância, ordenação/fatiamento no cliente, rodapé do feed, foco
preservado na virtualização, anúncios) é função pura em `model/`. A URL continua sendo a fonte da
verdade (`sort=distance`, `view=infinite`).

## Escopo

**Entra (avançados da seção 2 ainda não cobertos)**
- Ordenação **"Distância do centro"** (`sort=distance`): centroide de lat/long de **todos** os hotéis
  do destino (sem filtros), distância em linha reta (haversine), ordenação + paginação no cliente.
- **Distância no card** em qualquer ordenação: `2,3 km do centro` (com ícone `MapPinIcon`).
- **Modo "Rolagem contínua"** (`view=infinite`): `useInfiniteQuery`, carregamento automático perto
  do fim + botão "Carregar mais hotéis" (fallback de teclado/leitor de tela), padrão ARIA **feed**.
- **Virtualização** do feed com `@tanstack/react-virtual@3.14.26` (`useWindowVirtualizer`, rolagem
  da janela, alturas medidas), mantendo vivo o card que tem foco.
- **Error boundaries específicas por seção**: além da seção de resultados (F3), a sidebar de filtros
  e o corpo do sheet ganham boundary própria.

**Já cobertos pela F3 (sem mudança, só herdados pelo modo novo)**: filtros simultâneos, ordenações
de API, URL state sync, share por "Copiar link", retry, prefetch no hover/focus, `next/image` com
blur. O card do feed é o mesmo `HotelCard` (prefetch e blur valem nos dois modos).

**Fora (e por quê)**
- **Web Share API (`navigator.share`)**: o "Copiar link" já cumpre "link pode ser compartilhado com
  filtros". O botão de compartilhar com Web Share é da F4 (TEST_MAP: "Share button"); quando nascer
  lá e for promovido para `shared/`, a F3 troca o botão (segundo uso).
- **Virtualizar o modo páginas**: 10 cards por página não justificam; virtualização só no feed.
- **Persistir na URL quantos lotes foram carregados no feed**: viraria paginação de novo. Voltar do
  detalhe reaproveita o cache do TanStack (lotes carregados ficam); recarregar volta ao 1º lote.
- **"Perto de mim" (geolocalização do usuário)**: exige permissão e a CSP/`Permissions-Policy` do
  projeto bloqueia `geolocation=()` de propósito (next.config).
- **Prefetch da próxima página**: não é pedido; dobraria requests na API (Render free).
- **Persistir a preferência de exibição** (localStorage): nova busca volta ao padrão, como os
  filtros (F3 Decisão 12).

## Decisões

1. **Centro = centroide (média aritmética de lat/long) de todos os hotéis do destino, sem filtros.**
   A mock-api não tem coordenada de destino (`/suggestions` não traz lat/long) e o TEST_MAP fixou o
   centroide. Calculado sobre o destino **inteiro** para que a distância de um hotel não mude quando
   o usuário filtra (Rio + Piscina + Spa continua mostrando "2,3 km" para o hotel 11). Média simples é
   válida para regiões de poucos km (erro desprezível; não atravessa antimeridiano nem polos).
   `computeCentroid` devolve `null` com menos de 2 hotéis (um hotel "a 0 m do centro" não informa
   nada): sem linha de distância e ordenação por distância cai para `id`. **Aproximação documentada
   no README**: "centro" é o ponto médio dos hotéis cadastrados, não o centro oficial da cidade; em
   Florianópolis o Costão do Santinho (hotel 4, norte da ilha) puxa o centroide e fica a 20 km.
   Descartados: (a) tabela própria de coordenadas por cidade (dado inventado fora da mock-api); (b)
   mediana/medoide (mais robusta a outlier, mas mais difícil de explicar em uma linha de UI; fica
   como melhoria no README); (c) geolocalização do usuário (ver Fora); (d) ordenar no servidor
   (json-server 0.17 não ordena por campo calculado). Isto **reverte** a decisão "❓ → ⏭️" da F3:
   o usuário decidiu implementar todos os opcionais e o texto da UI deixa a aproximação explícita.

2. **Distância: haversine (R = 6.371 km), linha reta.** Formato (`formatDistanceFromCenter`):
   arredonda para 50 m; `< 100 m` → `a menos de 100 m do centro`; `< 1 km` → `500 m do centro`;
   `< 10 km` → uma casa (`2,3 km do centro`); `≥ 10 km` → inteiro (`20 km do centro`). A unidade e
   o número de casas são escolhidos **depois** de arredondar (0,975 km → `1,0 km`; 9,96 km → `10 km`).
   `Intl.NumberFormat("pt-BR")`. Descartado: distância por rota (exige API de mapas e chave).

3. **`sort=distance` busca o destino inteiro com os filtros no servidor e ordena/pagina no cliente.**
   O teto real é 14 hotéis por destino. O request vai **sem** `_sort`/`_page`/`_limit`, mas **com**
   os filtros de servidor (preço, nota, tipo, regex de comodidades): a lógica de filtro continua num
   lugar só (F3 Decisão 1), e só ordenação + fatiamento vão para o cliente (`sortByDistance` com
   desempate por `id`, `slicePage`). `total` = tamanho da lista filtrada (sem `X-Total-Count`).
   Descartado: filtrar também no cliente (duplicaria a regra de filtros, o "plano B" da F3, sem
   ganho). Teto conhecido: se o backend crescer, isso vira endpoint de ordenação no servidor (README).

4. **Uma query só por página, com o centroide resolvido dentro do `queryFn` pelo cache.**
   `fetchHotelsPage(request, { client, signal })` usa o `client` do `QueryFunctionContext`
   (TanStack 5.108) e `client.fetchQuery(destinationHotelsQueryOptions({ destination }))` para o
   centroide (cache de 5 min: coordenadas não mudam). Assim:
   - **ordenações de API** (`popular`, `price-asc`, `rating-desc`): `Promise.all([fetchHotels(query),
     centro.catch(() => null)])` em paralelo. Falha do centroide **não** derruba a lista: o card só
     omite a distância (dado opcional).
   - **`distance`**: lista filtrada sem paginação (`destinationHotelsQueryOptions(filterQuery)`, mesma
     cache entre páginas: página 2 é instantânea) + centroide; aqui o centroide é **obrigatório** (falha
     → erro da query, com retry e "Tentar de novo"). Sem filtros, os dois `fetchQuery` têm a mesma
     chave: **um** request só.
   - O formato devolvido é sempre `HotelsPage = { items, total, center }`: `deriveResultsView`,
     placeholder, página fora do intervalo, foco e paginação da F3 funcionam sem mudança.
   Descartado: uma segunda `useQuery` para o centroide no componente (a linha de distância chegaria
   depois da lista e empurraria cada card ~20 px: layout shift) e dois `useQuery` alternados por
   ordenação (perderia o `placeholderData` ao trocar para "Distância").

5. **Chave de cache explícita por tipo de request.** `toHotelsRequest(destination, filters)` (switch
   exaustivo em `sort`) devolve `{ kind: "server"; query: HotelsApiQuery }` ou `{ kind: "distance";
   filterQuery; page; limit }`. Chaves: `server` → `queryKeys.hotels.list(query)` (igual à F3);
   `distance` → `queryKeys.hotels.list({ ...filterQuery, sort: "distance", page, limit })`; lista
   inteira → `queryKeys.hotels.list(filterQuery)` (sem `_page`: nunca colide com as paginadas).

6. **Modo de exibição na URL: `view=infinite`; padrão `pages` (omitido).** É preferência de
   exibição, não filtro: não conta em "Filtros (n)", `clear` mantém `sort` **e** `view`, e trocar
   `view` volta para a página 1 (nova ação `setView` no reducer). Em `view=infinite` o `page` é
   ignorado no parse e omitido na serialização (URL canônica). Escrita por `replaceState`, como os
   filtros. A **paginação continua o padrão**: é o básico do TEST_MAP, dá URL por página e tem todos
   os itens no DOM (Ctrl+F, leitor de tela em modo navegação, impressão).

7. **Rolagem contínua = `useInfiniteQuery` com lotes de 10 (`PAGE_SIZE`).** `initialPageParam: 1`;
   `getNextPageParam`: carregados < `total` → `allPages.length + 1`. Mesmo `fetchHotelsPage` do modo
   páginas (com `distance`, os lotes saem do cache da lista inteira: instantâneos). Chave nova em
   `shared`: `queryKeys.hotels.infinite(params)` (dados `InfiniteData`, formato diferente da lista).
   `placeholderData` = `keepPreviousIfSameDestination` (agora genérico). **Troca de modo sem
   skeleton:** `initialData` do feed vem da página 1 do modo páginas em cache (`{ pages: [p1],
   pageParams: [1] }` + `initialDataUpdatedAt`), e a página 1 do modo páginas vem do 1º lote do feed
   em cache. Os dois hooks (`useHotelResults` e `useHotelFeed`) ficam montados com `enabled` pelo
   modo, para a toolbar (e o foco no select "Exibir") nunca desmontar. Descartado: componentes
   separados por modo (o select perderia o foco ao trocar), `_limit=5` para "mostrar mais lotes"
   (artificial; 10 mantém "Mostrando 10 de 14" coerente com a paginação).

8. **Carregamento híbrido: automático perto do fim + botão "Carregar mais hotéis" sempre presente.**
   Um `IntersectionObserver` no rodapé do feed (`rootMargin: "0px 0px 600px 0px"`) chama
   `fetchNextPage` quando há próxima página, sem fetch em andamento e **sem erro** no último lote (erro
   nunca re-dispara sozinho: sem laço de falhas). O botão é o fallback para teclado, leitor de tela e
   navegador sem IO. **Foco:** quando um lote chega e o foco está no botão (o usuário clicou, teclou
   Enter, ou chegou nele por Tab e o automático disparou), o foco vai para o **primeiro card novo**
   (`scrollToIndex` + `focus({ preventScroll })` + `revealBelowHeader`); carga por rolagem não mexe
   no foco. Descartado: só automático (rodapé inalcançável e WCAG 2.1.1 fraco) e só botão (perde a
   demonstração de infinite scroll pedida).

9. **Padrão ARIA feed (APG) no modo contínuo.** `div role="feed" aria-labelledby={h2}
   aria-busy={buscando próximo lote ou stale}`; cada card é `article` com `aria-posinset` (1-based),
   `aria-setsize={total}` (conhecido pelo `X-Total-Count`), `aria-labelledby` = id do `h3` e
   `tabIndex={-1}` (alvo programático, `focus-visible:outline`). Teclado do APG: `PageDown`/`PageUp`
   movem o foco para o próximo/anterior card; `Ctrl+End` foca o rodapé do feed; `Ctrl+Home` foca o h2
   da contagem. Decisão do alvo em função pura (`feedKeyTarget`). O handler é ligado por
   `addEventListener` no `ref` do feed (delegação), não por `onKeyDown` em elemento não interativo.
   No modo páginas a lista continua `ul > li > article` (sem mudança).

10. **Virtualização: `@tanstack/react-virtual@3.14.26`, `useWindowVirtualizer`, só no feed.**
    A página já rola na janela (header sticky, sheet, Voltar do navegador): um contêiner com rolagem
    própria seria scroll aninhado no celular e atrapalharia teclado e scroll restoration. Itens com
    altura medida (`measureElement` + `data-index`), `estimateSize` por breakpoint (≈ 520 px < `sm`,
    ≈ 240 px ≥ `sm`), `gap` 16/24 px (= `gap-4`/`lg:gap-6` da lista), `overscan: 2`,
    `scrollMargin` = topo do feed no documento (recalculado por `ResizeObserver` no `body`: alertas e
    o painel "Alterar busca" mudam o topo), `scrollPaddingStart` = `scroll-padding-top` do `html`
    (header sticky). **Card com foco nunca é desmontado:** `rangeExtractor` = `defaultRangeExtractor`
    + índice focado (`withPinnedIndex`, pura), senão rolar com o mouse com foco num card jogaria o
    foco para o `body`. `prefers-reduced-motion`: `scrollToIndex` sem `smooth`.
    **Por que, com 14 hotéis por destino:** é demonstração do requisito "Virtualization para listas
    longas", documentada como tal no README. Com 14 cards de ~240 px num viewport de 720 px ficam
    ~6–7 `article` no DOM; o E2E prova o janelamento. Trade-offs aceitos e documentados: Ctrl+F não
    acha card fora da janela e o modo navegação do leitor de tela só percorre os montados (mitigado
    por `aria-setsize`/`aria-posinset`, teclado do feed e pela paginação como padrão). Descartados:
    `react-window` (o TEST_MAP fixou react-virtual; API de alturas fixas), `content-visibility: auto`
    (ótimo para custo de render, mas não reduz o DOM: não é virtualização), virtualizar a partir de
    um limiar > 14 (o código nunca rodaria com os dados reais).

11. **`HotelCard` vira `article` puro; a lista decide o invólucro.** Hoje o card renderiza
    `<li><article>`. Passa a renderizar só o `article` e aceitar `feed?: { posInSet; setSize; index;
    ref }`; `ResultsList` envolve em `<li>`. Mesmo DOM no modo páginas (testes da F3 continuam).

12. **Error boundary também na sidebar de filtros e no corpo do sheet.** Fallback compacto
    `Alert danger` "Não foi possível mostrar os filtros." com ação "Tentar de novo" (`reset`);
    `resetKeys` = query canônica dos filtros. A lista continua funcionando se os filtros quebrarem, e
    vice-versa. Usa o `ErrorBoundary` de `shared/ui` (F3).

13. **Dependência nova com versão exata** (`"@tanstack/react-virtual": "3.14.26"`, peer React
    ^19 ok), como o resto do `package.json`. Sem React Compiler no projeto (o virtualizer devolve a
    mesma instância entre renders; com compiler exigiria opt-out).

## Contrato de dados

| Uso | Endpoint | Schema | Query key / options | Onde |
|---|---|---|---|---|
| Página (ordenação de API) | `GET /hotels?…&_sort&_order&_page&_limit=10` | `apiGetPage(hotelSchema)` | `queryKeys.hotels.list(apiQuery)` · `hotelsQueryOptions(destination, filters, client?)` | `api/hotels.ts` |
| Centroide | `GET /hotels?destination=<exato>` (sem paginação) | `apiGet(z.array(hotelSchema))` → `computeCentroid` | `queryKeys.hotels.list({ destination })` · `destinationHotelsQueryOptions({ destination })` · `staleTime: 5 min` | `api/hotels.ts` (via `fetchQuery` no `queryFn`) |
| Lista inteira filtrada (`sort=distance`) | `GET /hotels?destination&<filtros>` (sem `_sort`/`_page`/`_limit`) | `apiGet(z.array(hotelSchema))` | `queryKeys.hotels.list(filterQuery)` · `destinationHotelsQueryOptions(filterQuery)` | idem |
| Página por distância | — (derivada das duas acima) | `HotelsPage` | `queryKeys.hotels.list({ ...filterQuery, sort: "distance", page, limit })` | idem |
| Feed | mesmos requests, lote = página | `InfiniteData<HotelsPage, number>` | **novo** `queryKeys.hotels.infinite({ ...filterQuery, sort })` · `hotelsInfiniteQueryOptions(destination, filters, client)` | idem + `shared/api/query-keys.ts` |

Nenhum schema novo em `shared/api/schemas.ts`: `latitude`/`longitude` já estão em `hotelSchema`
(verificado: 60/60 hotéis do seed com coordenadas). O `apiGet` de array já valida pelo schema.

**Tipos novos/alterados** (`model/`):
```ts
// search-filters.ts
export const SORT_OPTIONS = ["popular", "price-asc", "rating-desc", "distance"] as const;
export const LIST_MODES = ["pages", "infinite"] as const;
export type ListMode = (typeof LIST_MODES)[number];
type SearchFilters = { /* F3 */ ...; view: ListMode };          // padrão "pages"
FILTER_PARAM_KEYS = [...F3, "view"];                            // `page` omitido se view=infinite
// filter-change.ts
| { type: "setView"; value: ListMode }                          // zera page; clear mantém sort e view
// to-api-query.ts
type ServerSort = Exclude<SortOption, "distance">;
SORT_TO_API: Record<ServerSort, SortParams>;
type HotelsFilterQuery = Pick<HotelsApiQuery, "destination" | "pricePerNight_gte" | "pricePerNight_lte"
  | "rating_gte" | "propertyType" | "amenities_like">;
toHotelsFilterQuery(destination, filters): HotelsFilterQuery;
type HotelsRequest =
  | { kind: "server"; query: HotelsApiQuery }
  | { kind: "distance"; filterQuery: HotelsFilterQuery; page: number; limit: number };
toHotelsRequest(destination, filters, page = filters.page): HotelsRequest;
hotelsRequestKey(request): Readonly<Record<string, KeyParam>>;
// distance.ts
type GeoPoint = { latitude: number; longitude: number };
computeCentroid(points: readonly GeoPoint[]): GeoPoint | null;   // < 2 → null
distanceKm(a: GeoPoint, b: GeoPoint): number;                    // haversine
sortByDistance<T extends GeoPoint & { id: number }>(items: readonly T[], center: GeoPoint | null): T[];
formatDistanceFromCenter(km: number): string;
slicePage<T>(items: readonly T[], page: number, size: number): T[];
// feed.ts
type FeedFooter = { kind: "more" } | { kind: "loading-more" } | { kind: "error-more" } | { kind: "end"; total: number };
deriveFeedFooter({ hasNextPage, isFetchingNextPage, isFetchNextPageError, total }): FeedFooter;
describeFeedAnnouncement({ previousLoaded, loaded, total, footer }): string;
describeLoadedCount(loaded, total): string;                      // "Mostrando 10 de 14"
withPinnedIndex(indexes: number[], pinned: number | null): number[];
type FeedKeyTarget = { kind: "item"; index: number } | { kind: "after" } | { kind: "before" } | null;
feedKeyTarget({ key, ctrlKey, current, count }): FeedKeyTarget;
```
`HotelsPage` (api) passa a `{ items: Hotel[]; total: number; center: GeoPoint | null }`.
`keepPreviousIfSameDestination` vira genérica (`<T>`) e serve às duas queries.

**Verificado no seed** (centroide do destino inteiro, haversine):
- Rio (14): ordem por distância `18, 13, 11, 15, 12, 1, 16, 7, 9, 19 | 14, 10, 2, 17`;
  hotel 18 "Hotel Leblon Prime" 2,04 km → `2,0 km do centro`; 13 2,10 → `2,1 km`; 11 2,31 →
  `2,3 km`; 17 "Pousada Vista Corcovado" 4,89 → `4,9 km`.
- Rio + Piscina + Spa (ids 1, 7, 9, 11): ordem `11, 1, 7, 9`, distâncias iguais às sem filtro.
- Florianópolis: hotel 4 a 20,22 km → `20 km do centro`. Gramado: hotel 43 a 0,48 km →
  `500 m do centro`. Noronha: 47 a 0,41 km → `400 m do centro`. Jericoacoara: 59 e 60 empatados
  (1,64 km) → desempate por `id`.

## Critérios de aceite

Distância
1. Dado Rio em qualquer ordenação, cada card mostra, abaixo de `Tipo · destino`, a linha
   `MapPinIcon` (`aria-hidden`) + `{distância} do centro` (hotel 17: `4,9 km do centro`), sem
   deslocar o layout depois que a lista aparece (chega junto com a lista).
2. Quando "Ordenar por" = "Distância do centro", a URL ganha `sort=distance`, a página volta para 1,
   o foco fica no select, e a ordem é `Hotel Leblon Prime (2,0 km)`, `Pousada Jardim Botânico
   (2,1 km)`, `Hotel Arpoador Mar (2,3 km)`…; "Mostrando 1–10 de 14", paginação com 2 páginas; a
   página 2 tem os hotéis 14, 10, 2, 17 e não dispara request novo à API.
3. Com `sort=distance`, aparece abaixo da toolbar o texto de ajuda `Distância em linha reta até o
   ponto médio dos hotéis de Rio de Janeiro, RJ.` ligado ao select por `aria-describedby`; nas outras
   ordenações ele não aparece.
4. Rio + Piscina + Spa + `sort=distance` mostra 11, 1, 7, 9, e o hotel 11 continua `2,3 km do centro`
   (centro calculado sem filtros).
5. Em `sort=distance`, nenhum request à API leva `_sort`, `_page` ou `_limit`; sem filtros, sai **um**
   `GET /hotels?destination=…` só.
6. Se o request do centroide falhar numa ordenação de API, a lista aparece normalmente sem a linha de
   distância; com `sort=distance`, a falha leva ao `ErrorState` da F3 e "Tentar de novo" recupera.
7. Florianópolis mostra `20 km do centro` no hotel 4; Gramado mostra `500 m do centro` no hotel 43.

Modo de exibição
8. A toolbar tem o select "Exibir" (`Em páginas` · `Rolagem contínua`) com rótulo visível. Escolher
   "Rolagem contínua" grava `view=infinite`, remove `page` da URL, mantém o foco no select e,
   vindo da página 1 já carregada, mostra os 10 cards **sem skeleton e sem novo request**.
9. Recarregar ou abrir a URL com `view=infinite` restaura o modo; `view=xyz` cai em `pages`;
   `view=infinite&page=2` ignora a página.
10. "Limpar filtros" mantém `sort` e `view`; "Filtros (n)" não conta `view`; nova busca ("Alterar
    busca") volta para `pages`.

Feed (rolagem contínua)
11. Em `view=infinite` (Rio), a lista é `role="feed"` rotulada pelo h2; cada card é `article` com
    `aria-posinset` (1…) e `aria-setsize="14"`; não há `Pagination`; a linha de status mostra
    `Mostrando 10 de 14`.
12. Rolando até perto do fim, o 2º lote (`_page=2`) é pedido sozinho; durante a carga o feed tem
    `aria-busy="true"` e o botão mostra `Carregando mais hotéis…`; ao chegar, o anunciador diz
    `Mais 4 hotéis carregados. Mostrando 14 de 14.` e o rodapé vira `Você viu todos os 14 hotéis.`
    com `Voltar ao topo`.
13. Por teclado: Tab até `Carregar mais hotéis` + Enter carrega o lote e o foco vai para o 11º card
    (`article`, foco visível, abaixo do header sticky). Se o carregamento automático disparar com o
    foco no botão, o resultado é o mesmo.
14. Com foco num card, `PageDown`/`PageUp` levam ao próximo/anterior card (montando-o se estiver fora
    da janela); `Ctrl+End` foca o rodapé do feed; `Ctrl+Home` foca o h2 da contagem.
15. Virtualização (desktop 1280×720, 14 carregados): há menos de 14 `article` no DOM; rolando até o
    fim aparece o card com `aria-posinset="14"`; com foco num card, rolar a página com a roda do mouse
    até ele sair da tela **não** tira o foco dele (o `document.activeElement` continua o card).
16. Falha no 2º lote (500 após as tentativas automáticas): os 10 cards continuam; o rodapé mostra
    `Alert danger` `Não foi possível carregar mais hotéis.` (`role="alert"`) com `Tentar de novo`; o
    carregamento automático não repete sozinho; `Tentar de novo` carrega o lote.
17. Trocar filtro/ordenação no feed volta para o 1º lote (lista anterior esmaecida com
    `Atualizando resultados…`, como na F3); vazio, erro inicial e offline são os mesmos da F3.
18. Abrir um card do 2º lote e voltar (Voltar do navegador) mostra o feed com os 14 já carregados
    (cache), sem skeleton.
19. `sort=distance` + `view=infinite` funciona: lotes 1 e 2 na ordem por distância; o 2º lote não
    gera request à API.

Error boundaries por seção
20. Um erro de renderização num filtro mostra, só na sidebar (ou só no corpo do sheet), `Não foi
    possível mostrar os filtros.` com `Tentar de novo`; a lista, a toolbar e a paginação continuam
    operáveis; `Tentar de novo` remonta os filtros.

Acessibilidade e mobile
21. axe (wcag2a/aa) sem violações no feed (com 14 carregados), no rodapé com erro e com
    `sort=distance` (texto de ajuda).
22. 320 px: toolbar com Filtros, Ordenar por e Exibir sem scroll horizontal; feed e rodapé sem
    scroll horizontal; botão `Carregar mais hotéis` com alvo ≥ 44 px.
23. `prefers-reduced-motion`: `Voltar ao topo` e o foco no card novo rolam sem animação.

## Arquivos

| Caminho | Responsabilidade |
|---|---|
| `package.json` · `package-lock.json` (alt.) | `@tanstack/react-virtual` `3.14.26` (exata) |
| `src/shared/api/query-keys.ts` (alt.) | `hotels.infinite(params)` → `["hotels", "infinite", params]` |
| `src/features/hotel-search/model/distance.ts` (+ test) | `GeoPoint`, `computeCentroid`, `distanceKm`, `sortByDistance`, `formatDistanceFromCenter`, `slicePage` |
| `.../model/search-filters.ts` (alt.) | `distance` em `SORT_OPTIONS`; `LIST_MODES`, `view`; parse/serialize (`page` omitido no feed) |
| `.../model/filter-change.ts` (alt.) | ação `setView`; `clear` mantém `view` |
| `.../model/to-api-query.ts` (alt.) | `ServerSort`, `toHotelsFilterQuery`, `toHotelsRequest`, `hotelsRequestKey` |
| `.../model/labels.ts` (alt.) | `sortLabel("distance")` = `Distância do centro`; `listModeLabel` |
| `.../model/results-view.ts` (alt.) | `describeToolbar`/`describeAnnouncement` com `mode` (status `Mostrando 10 de 14`, sem sufixo de página no feed) |
| `.../model/feed.ts` (+ test) | `deriveFeedFooter`, `describeFeedAnnouncement`, `describeLoadedCount`, `withPinnedIndex`, `feedKeyTarget` |
| `.../api/hotels.ts` (alt.) | `HotelsPage.center`, `fetchHotelsPage`, `destinationHotelsQueryOptions`, `hotelsQueryOptions(…, client?)` com `initialData` do feed, `keepPreviousIfSameDestination<T>` |
| `.../api/hotels-infinite.ts` (+ test) | `hotelsInfiniteQueryOptions` (`initialPageParam`, `getNextPageParam`, `initialData` da página 1) — separado para o arquivo ficar < 250 linhas |
| `.../hooks/useHotelResults.ts` (alt.) | `enabled` pelo modo; passa `client` |
| `.../hooks/useHotelFeed.ts` | `useInfiniteQuery` + `deriveResultsView` + `deriveFeedFooter` + `loadMore` |
| `.../hooks/useResultsController.ts` (alt.) | escolhe o modelo do modo ativo (tipo comum `ResultsModel`) |
| `.../hooks/useFeedVirtualizer.ts` | `useWindowVirtualizer`, `scrollMargin` (ResizeObserver), `scrollPaddingStart`, índice focado + `withPinnedIndex` |
| `.../hooks/useFeedKeyboard.ts` | listener de teclado no feed (`feedKeyTarget`) |
| `.../hooks/useAutoLoadMore.ts` | `IntersectionObserver` no rodapé, respeitando fetch/erro/`hasNextPage` |
| `.../hooks/useFocusFeedItem.ts` | `focusIndex(i)`: `scrollToIndex` → espera montar → `focus({ preventScroll })` + `revealBelowHeader`; foco no 1º card novo se o botão tinha o foco |
| `.../hooks/useFeedAnnouncement.ts` | guarda `previousLoaded` e devolve o texto do anunciador |
| `.../components/HotelCard.tsx` (alt.) | só `article`; prop `feed?`; linha de distância |
| `.../components/HotelCardDistance.tsx` | linha `MapPinIcon` + texto (omitida sem centro) |
| `.../components/HotelCardSkeleton.tsx` (alt.) | linha extra `h-5 w-32`; `li` opcional (feed usa `div`) |
| `.../components/ResultsList.tsx` (alt.) | `li` em volta do `HotelCard`; recebe `center` |
| `.../components/HotelFeed.tsx` | `"use client"`; `role="feed"`, itens virtualizados |
| `.../components/FeedFooter.tsx` | `switch` exaustivo no `FeedFooter`: botão, carregando, erro, fim |
| `.../components/ResultsSection.tsx` (alt.) | caso `results`: `pages` → lista + paginação; `infinite` → `HotelFeed` + `FeedFooter` |
| `.../components/SortSelect.tsx` (alt.) | opção nova; `describedBy?` |
| `.../components/ListModeSelect.tsx` | select "Exibir" |
| `.../components/DistanceHelp.tsx` | texto de ajuda (só com `sort=distance`) |
| `.../components/ResultsToolbar.tsx` (alt.) | slot `listMode`; grid responsivo novo |
| `.../components/FiltersPanel.tsx` · `FiltersDrawer.tsx` (alt.) | `ErrorBoundary` com `FiltersError` |
| `.../components/FiltersError.tsx` | fallback compacto dos filtros |
| `.../components/HotelSearchResults.tsx` (alt.) | liga o select "Exibir", o texto de ajuda e o modelo do modo |
| `src/features/hotel-search/CLAUDE.md` (alt.) | decisões 1–12 desta spec; remove "Fora do escopo: distância/virtualização" |
| `docs/design/design-system.md` (alt., ui-designer) | rodapé do feed, linha de distância no card, select "Exibir", microcopy §6 |
| `e2e/hotel-search.distance.spec.ts` · `e2e/hotel-search.feed.spec.ts` | E2E |
| `e2e/hotel-search.spec.ts` · `.states.spec.ts` (alt., se preciso) | contagem de requests filtra por `_page` (o centroide é um request a mais na 1ª carga) |

Orçamento do Biome: `HotelFeed` só monta itens (≤ 60 linhas); virtualizer, teclado, auto-load, foco
e anúncio em hooks separados; `api/hotels.ts` não passa de 250 linhas (feed em arquivo próprio).

## Tarefas

Escopo `hotel-search`, exceto dependência (`build`) e `shared`.

1. `build(deps): add @tanstack/react-virtual 3.14.26` — Prova: `npm ci` limpo; `npm run typecheck` verde.
2. `feat(hotel-search): add distance model` — `model/distance.ts`. Prova: unit (haversine (0,0)→(0,1) ≈ 111,19 km; centroide = média; `< 2` → `null`; `sortByDistance` estável com desempate por `id` e `null` → ordem por `id`; ordem do seed do Rio = `18, 13, 11, …, 17`; `formatDistanceFromCenter` em tabela: 0,04 → `a menos de 100 m`, 0,41 → `400 m`, 0,48 → `500 m`, 0,975 → `1,0 km` (arredonda antes de escolher a unidade), 2,04 → `2,0 km`, 9,96 → `10 km`, 20,22 → `20 km`; `slicePage` com página parcial e fora do intervalo).
3. `feat(hotel-search): add distance sort and list mode to url filters` — `search-filters.ts`, `filter-change.ts`, `labels.ts`. Prova: unit (round-trip de `sort=distance` e `view=infinite`; `view` inválido → `pages`; `page` omitido/ignorado no feed; `setView` zera página; `clear` mantém `sort`/`view`; `countActiveFilters` ignora `view`; rótulos exaustivos).
4. `feat(shared): add infinite hotels query key` — Prova: unit da chave (prefixo `["hotels","infinite"]`, não colide com `list`).
5. `feat(hotel-search): resolve hotels request by sort` — `toHotelsFilterQuery`, `toHotelsRequest`, `hotelsRequestKey`. Prova: unit (as 3 ordenações de API iguais à F3; `distance` sem `_sort/_page/_limit`; chaves distintas por página e por ordenação).
6. `feat(hotel-search): sort by distance on the client with the destination centroid` — `fetchHotelsPage`, `destinationHotelsQueryOptions`, `HotelsPage.center`. Prova: teste com `fetch` stubado por URL (ordem e fatiamento; página 2 sem novo `fetch`; sem filtros = 1 request; falha do centroide engolida em `popular` e propagada em `distance`; `keepPreviousIfSameDestination` genérico).
7. `feat(hotel-search): show the distance from the center on the card` — `HotelCardDistance`, `HotelCard` (só `article`), `ResultsList` com `li`, skeleton com a linha nova. Prova: componente (critérios 1, 7; card sem centro não tem a linha; testes da F3 do card e da lista verdes).
8. `feat(hotel-search): add the distance sort option with help text` — `SortSelect`, `DistanceHelp`. Prova: componente (critérios 2, 3, 6 com `fetch` stubado).
9. `feat(hotel-search): add infinite hotels query options` — `api/hotels-infinite.ts` + `initialData` cruzado. Prova: teste (`getNextPageParam` 10/14 → 2, 14/14 → `undefined`; `initialData` da página 1 em cache e vice-versa; distância nos lotes sem request).
10. `feat(hotel-search): add feed model` — `model/feed.ts` + modo em `results-view.ts`. Prova: unit em tabela (`deriveFeedFooter` em todas as combinações; anúncios `Mais 4 hotéis carregados. Mostrando 14 de 14.` / `Mais 1 hotel carregado…` / `Carregando mais hotéis…`; `withPinnedIndex` dentro/fora/`null`; `feedKeyTarget` PageDown no último → `null`, Ctrl+End → `after`, Ctrl+Home → `before`; toolbar do feed sem sufixo de página).
11. `feat(hotel-search): add list mode select and wire both result modes` — `ListModeSelect`, `useHotelFeed`, `useResultsController`, `ResultsToolbar`, `ResultsSection` (feed ainda sem virtualização: lista simples de `article` em `role="feed"`). Prova: componente (critérios 8–11, 17).
12. `feat(hotel-search): load more feed results automatically and by button` — `FeedFooter`, `useAutoLoadMore`, `useFocusFeedItem`, `useFeedAnnouncement`. Prova: componente com `IntersectionObserver` stubado (critérios 12, 13, 16).
13. `feat(hotel-search): virtualize the hotel feed` — `HotelFeed` com `useFeedVirtualizer`, `useFeedKeyboard`. Prova: componente com `getBoundingClientRect`/`innerHeight` stubados (critério 14; card focado continua montado ao sair da janela) + `npm run build`.
14. `feat(hotel-search): add error boundaries to the filters sections` — `FiltersError`, boundary na sidebar e no sheet. Prova: componente (critério 20 com `vi.mock` de um filtro lançando uma vez).
15. `test(hotel-search): add e2e for distance sort` — `e2e/hotel-search.distance.spec.ts`. Prova: verde (critérios 1–7, axe com ajuda visível) + ajustes de contagem de requests nos specs da F3.
16. `test(hotel-search): add e2e for the infinite feed` — `e2e/hotel-search.feed.spec.ts`. Prova: verde em desktop e mobile (critérios 8, 9, 11–19, 21–23).
17. `docs(hotel-search): record distance, feed and virtualization decisions` — `CLAUDE.md` da feature, notas para o README (aproximação do centro, demonstração da virtualização, teto de 14 hotéis). Prova: revisão.

(O `ui-designer` faz `docs(design): …` com o rodapé do feed, a linha de distância e o select
"Exibir" antes da tarefa 7, conforme o pipeline.)

## Plano de testes

**Unit (`model/`, `api/`)** — 100% de `distance.ts` e `feed.ts`; tabelas para filtros/URL e
`toHotelsRequest`. Teste de seed: lê `mock-api/db.seed.json`, calcula o centroide por destino e
confere a ordem do Rio e os textos do Critério 7 (protege contra mudança de fórmula). Os testes de
query options usam `makeTestQueryClient` e `fetch` stubado por URL (o centroide é
`/hotels?destination=…` **sem** `_page`).

**Componente (Vitest + Testing Library)**
- Helper `shared/testing/next-navigation` para `sort`/`view` na URL; `fetch` por URL distinguindo
  paginado (`_page`) de inteiro.
- `IntersectionObserver` stubado (classe fake que expõe `trigger(isIntersecting)`), já que o jsdom
  não tem.
- Virtualização: `window.innerHeight = 800`, `HTMLElement.prototype.getBoundingClientRect` com altura
  200 por card e `offsetHeight` coerente; prova `withPinnedIndex` em uso (focar card 0, rolar
  `window.scrollY` até o fim e disparar `scroll` → card 0 continua no DOM e focado). O janelamento
  "de verdade" é provado no E2E.
- Teclado do feed com `userEvent.keyboard("{PageDown}")`, `{Control>}{End}{/Control}`.
- Boundaries: `vi.mock("./AmenitiesFilter")` lançando uma vez.

**E2E (Playwright, mock-api real)**
- `hotel-search.distance.spec.ts`: Rio `sort=distance` (ordem, textos, página 2 sem request
  `/hotels` novo via `page.on("request")`), help + `aria-describedby`, Rio + Piscina + Spa (11, 1, 7, 9
  e `2,3 km`), Florianópolis/Gramado (textos), popular com distância no hotel 17; **`_fail`**:
  `page.route` só no request **sem** `_page` (centroide) → `popular` sem linha de distância e
  `distance` com `ErrorState` → `unroute` + "Tentar de novo" → lista. Axe com a ajuda visível.
- `hotel-search.feed.spec.ts`: troca para "Rolagem contínua" (foco no select, sem request novo, URL);
  feed (`role="feed"`, `aria-setsize`/`posinset`); rolagem → `_page=2` → anúncio e rodapé de fim;
  janelamento (`article` < 14 em 1280×720) e `posinset=14` após rolar; foco preservado com
  `page.mouse.wheel`; teclado (Tab até o botão + Enter → foco no 11º; PageDown/Ctrl+End/Ctrl+Home);
  **`_delay`**: `page.route("**/hotels?**_page=2**")` para o `slowApi` → `aria-busy` e `Carregando
  mais hotéis…`; **`_fail`**: o mesmo para o `failingApi` → `Alert` + retry; Voltar do detalhe mantém
  14; `sort=distance&view=infinite`; mobile 320 px sem scroll horizontal; axe no feed e no erro;
  `page.emulateMedia({ reducedMotion: "reduce" })` + `Voltar ao topo`.

## Riscos

| Risco | Mitigação |
|---|---|
| "Centro" entendido como centro oficial da cidade | Texto de ajuda explícito ("ponto médio dos hotéis"), opção "Distância do centro" só com ele, README documenta (Florianópolis = 20 km) |
| Request extra do centroide quebra contagens de request dos E2E da F3 | Contar só requests com `_page`; tarefa 15 ajusta os specs |
| Falha do centroide derrubando a lista | `catch → null` nas ordenações de API; só `distance` depende dele (Decisão 4); teste de query + E2E |
| `fetchQuery` dentro do `queryFn` não herda o `signal` | Requests ≤ 14 itens e com cache; aceitável; documentado no código |
| `initialData` cruzado servindo dado velho | `initialDataUpdatedAt` do cache de origem: o `staleTime` de 60 s vale igual e refaz em segundo plano |
| `scrollMargin` errado (alertas, painel "Alterar busca" abrindo) → cards sobrepostos | `ResizeObserver` no `body` recalcula; E2E abre "Alterar busca" no feed e confere que o 1º card não sobrepõe a toolbar |
| Foco perdido quando o card sai da janela virtual | `withPinnedIndex` no `rangeExtractor` (unit + componente + E2E com `mouse.wheel`) |
| Carregamento automático em laço com erro | `useAutoLoadMore` desliga com `isFetchNextPageError`; só o botão tenta de novo (Critério 16) |
| Lint `a11y` em teclado de `role="feed"` | Listener por `addEventListener` (delegação documentada, padrão APG), não `onKeyDown` em elemento não interativo; sem `biome-ignore` |
| axe reclamar de `div` sem papel entre `feed` e `article` (wrapper do `translateY`) | `div` genérico é transparente para `aria-required-children`; se o axe acusar, posicionar cada `article` com `transform` próprio (sem wrapper) |
| Scroll restoration ao voltar do detalhe no feed | `useWindowVirtualizer` usa `window.scrollY` como offset inicial e o cache traz os lotes; E2E do Critério 18 |
| Virtualização em jsdom não determinística | Componente testa só regras (foco fixado, teclado) com medidas stubadas; janelamento no E2E |
| Arquivos acima do limite do Biome | Divisão já planejada (hooks por responsabilidade, `api/hotels-infinite.ts`) |

## UI/UX

Segue `docs/design/design-system.md` (tokens, `Select`, `Button`, `Alert`, `Skeleton`, ícones). Nenhum
componente novo de `shared/ui`; o `ui-designer` registra no design system os três padrões abaixo.

### Layout

**Toolbar** (`ResultsToolbar`): h2 + linha de status à esquerda; controles à direita.
- `< 26rem` (320–415 px): `grid grid-cols-1 gap-3` — `Filtros (n)`, `Ordenar por`, `Exibir`.
- `26rem` a `< sm`: `grid-cols-2` — `Filtros (n)` `col-span-2 justify-self-start`; `Ordenar por` |
  `Exibir` lado a lado.
- `sm` a `< lg`: `grid-cols-[auto_1fr_1fr] items-end` — os três numa linha.
- `lg` a `< xl`: h2/status numa linha; abaixo, `flex flex-wrap gap-4` com os dois selects (label
  inline, `Ordenar por` `w-56`, `Exibir` `w-44`). `≥ xl`: tudo numa linha (`justify-between`).
- Texto de ajuda da distância (`DistanceHelp`): `p.text-sm.text-fg-muted` em largura total logo
  abaixo da toolbar, só com `sort=distance`.

**Card** (ambos os modos): nova linha após `Tipo · destino`:
`<p class="flex items-center gap-1 text-sm text-fg-muted"><MapPinIcon class="size-4 shrink-0
text-fg-subtle" aria-hidden/>2,0 km do centro</p>`. Skeleton ganha `line h-5 w-32` na mesma posição.

**Feed (`view=infinite`)**
```
 14 hotéis encontrados                    Ordenar por [Mais populares ▾]  Exibir [Rolagem contínua ▾]
 Mostrando 10 de 14
┌ role=feed ───────────────────────────────────────────────────────────┐
│ article (card igual ao da lista)                                      │  gap-4 / lg:gap-6
│ …                                                                     │
└───────────────────────────────────────────────────────────────────────┘
            [ Carregar mais hotéis ]           Button secondary md, w-full sm:w-auto, centralizado, mt-6
                Mostrando 10 de 14             text-sm text-fg-muted (abaixo do botão)
```
Rodapé por estado (`FeedFooter`, `mt-6 flex flex-col items-center gap-2`, `min-h-11`):

| Estado | Conteúdo |
|---|---|
| `more` | `Button secondary` `Carregar mais hotéis` + `Mostrando 10 de 14` |
| `loading-more` | mesmo botão em `loading` (`aria-disabled`, `aria-busy`) com `loadingText` `Carregando mais hotéis…`; feed `aria-busy="true"` |
| `error-more` | `Alert danger` (largura total) `Não foi possível carregar mais hotéis.` / `Os hotéis já carregados continuam aqui.` + ação `Button secondary sm` `Tentar de novo` |
| `end` | `p` (`tabIndex=-1`, alvo de `Ctrl+End`) `Você viu todos os 14 hotéis.` + `Button ghost sm` `Voltar ao topo` (rola ao h2 e o foca) |

Com 1 lote só (≤ 10 resultados) o rodapé já é `end`. `prefers-reduced-motion`: rolagens `auto`.

### Interações

| Ação | Feedback imediato | Depois | Foco |
|---|---|---|---|
| "Ordenar por" → Distância do centro | select muda; ajuda aparece | lista atualiza (esmaecida, como F3) | fica no select |
| "Exibir" → Rolagem contínua / Em páginas | select muda | lista no outro modo (sem skeleton se já em cache) | fica no select |
| Rolar perto do fim do feed | — | botão em `Carregando mais hotéis…`, depois cards novos e anúncio | não muda |
| `Carregar mais hotéis` (clique/Enter) | botão em loading | cards novos | 1º card novo (`article`) |
| `PageDown`/`PageUp` num card | — | — | próximo/anterior card |
| `Ctrl+End` / `Ctrl+Home` no feed | — | — | rodapé / h2 |
| `Voltar ao topo` | rola ao topo da lista | — | h2 da contagem |
| `Tentar de novo` (lote) | botão `Tentando…` | lote ou erro de novo | fica no botão; se o lote chegar, 1º card novo |

### Microcopy

| Onde | Texto |
|---|---|
| Opção de ordenação | `Distância do centro` |
| Ajuda da distância | `Distância em linha reta até o ponto médio dos hotéis de {destino}.` |
| Card | `a menos de 100 m do centro` · `500 m do centro` · `2,3 km do centro` · `20 km do centro` |
| Select de exibição | label `Exibir` · `Em páginas` · `Rolagem contínua` |
| Linha de status (feed) | `Mostrando 10 de 14` (e `Atualizando resultados…`/`Carregando hotéis…` da F3) |
| Rodapé | `Carregar mais hotéis` · `Carregando mais hotéis…` · `Você viu todos os 14 hotéis.` (1: `Você viu o único hotel.`) · `Voltar ao topo` |
| Erro do lote | `Não foi possível carregar mais hotéis.` · `Os hotéis já carregados continuam aqui.` · `Tentar de novo` / `Tentando…` |
| Anunciador | `Carregando mais hotéis…` · `Mais 4 hotéis carregados. Mostrando 14 de 14.` · `Mais 1 hotel carregado. Mostrando 11 de 11.` |
| Filtros (boundary) | `Não foi possível mostrar os filtros.` · `Tentar de novo` |

### Acessibilidade (o que testar)

- Feed: `role="feed"` + `aria-labelledby` (h2) + `aria-busy`; `article` com `aria-posinset`,
  `aria-setsize`, `aria-labelledby` (h3), `tabIndex=-1` e anel de foco
  (`focus-visible:outline-2 outline-offset-2 outline-focus`). O link do nome continua o único item
  tabulável dentro do card.
- Leitura do card (os dois modos): "… · Pousada · Rio de Janeiro, RJ · 4,9 km do centro · Nota 4,8 de
  5…".
- Select "Exibir" e "Ordenar por" nativos com `<label>`; ajuda por `aria-describedby`.
- O anunciador `aria-live` da F3 é o mesmo (com o sheet aberto continua mudo); o erro do lote é
  `role="alert"`.
- Alvos ≥ 44 px (botão do rodapé `md`; `Voltar ao topo` `sm` com área de 44).
- 320 px e zoom 200%: toolbar em uma coluna, sem scroll horizontal.
