# F3 — hotel-search

## Objetivo

Entregar `/search`: a lista de hotéis do destino buscado na F2, com cards informativos (nota, preço
por noite e **total da estadia** quando há datas), skeleton, estados vazio/erro e paginação real da
API (`_page`, `_limit=10`, `X-Total-Count`). Filtros (preço, nota, tipo, comodidades) e ordenação
vivem **só na URL**: o link copiado reabre a mesma lista. Toda regra (URL ↔ filtros, filtros → query
da API, preço total, disponibilidade, estado da tela) é função pura em `model/`, testada sem React.

## Escopo

**Básicos**
- `GET /hotels?destination=<name exato>` com cards; skeleton com a geometria do card; vazio útil
  (Bonito, MS); paginação de 10 por página com total do header `X-Total-Count`.

**Avançados (✅ no TEST_MAP)**
- Filtros simultâneos: faixa de preço (slider com valores), nota mínima, tipo de hospedagem
  (múltiplo, OU), comodidades (múltiplo, **E**).
- Ordenação: mais populares (padrão, `reviewCount`), menor preço, maior avaliação.
- URL como fonte da verdade + botão "Copiar link".
- Retry automático (query client) + "Tentar de novo" + error boundary da seção de resultados.
- Prefetch do detalhe (hotel + quartos) no hover/focus do card, com as query options de `shared`.
- `next/image` com placeholder blur e loader do Unsplash (resolução certa por viewport).
- Total da estadia no card (`diária × noites × quartos`) quando a busca tem datas válidas.
- Disponibilidade no card: "Esgotado" (hotéis 19 e 48), "Apenas N quartos!" (≤ 2) e "quartos
  insuficientes" para a busca.

**Fora (e por quê)**
- **Ordenação por distância (❓ → ⏭️).** A API não tem coordenada do destino. Centroide dos hotéis
  não é "o centro" de nada que o usuário reconheça, e tabela própria de coordenadas por cidade seria
  dado inventado fora da mock-api. Justificar no README.
- **Virtualização (⏭️).** Máximo de 14 hotéis por destino e 10 por página.
- **Infinite scroll.** O enunciado aceita "paginação **ou** infinite scroll"; paginação dá URL
  compartilhável por página e é o básico do TEST_MAP.
- **Contagem por opção de filtro (facets)** e **chips de filtros ativos**: exigiriam a lista sem
  filtros ou mais requests; o contador "Filtros (3)" + "Limpar filtros" cobrem a necessidade.
- **Resumo da busca dentro do `SiteHeader` global** (design system 4.2 permite): o header está no
  layout raiz; injetar conteúdo por página exigiria parallel route ou portal. O resumo fica no topo
  da página `/search`.
- **"A partir de" calculado pelos quartos** (hotéis 1 e 4 divergem): fica na F4 (ver Decisão 9).
- **Manter os filtros ao "Alterar busca"**: nova busca = filtros zerados (Decisão 12).
- **SSR da lista** (prefetch no servidor + `HydrationBoundary`): ver Decisão 2.
- Busca por nome do hotel, filtro "Destaques", mapa.

## Decisões

1. **Comodidades com E no servidor, via uma única regex com lookaheads.** `amenities_like` repetido
   é OU (verificado: Rio + `pool` 7, + `spa` 7, os dois repetidos 10). Mas o `_like` do json-server
   é `new RegExp(valor, "i").test(String(campo))`, e um array vira `"wifi,pool,spa"`. Então
   `amenities_like=^(?=.*\bpool\b)(?=.*\bspa\b)` exige as duas: **verificado na mock-api** (Rio →
   ids 1, 7, 9, 11; `X-Total-Count: 4`). `\b` evita casar substring (`_` é caractere de palavra:
   `\baccess\b` não casa `beach_access`). A regex sai de `amenitiesPattern(amenities)` (função
   pura), montada **só** com valores do enum `amenitySchema` (nunca texto do usuário: sem injeção
   nem ReDoS). Resultado: um caminho de código só, paginação da API sempre, `X-Total-Count` sempre
   certo. Um teste unitário roda a regex contra **todo** o `db.seed.json` emulando o json-server
   (`String(array)`) e compara com `every(...)` para todas as combinações de 1 e 2 comodidades.
   Descartados: (a) `amenities_like` repetido (OU, errado); (b) 1 comodidade na API e o resto no
   cliente (páginas com menos de 10 e total errado); (c) com comodidades, buscar o destino inteiro e
   paginar no cliente (dois caminhos de código, depende do teto de 14 hotéis). (c) fica documentado
   como plano B se o backend trocar (README).

2. **Lista buscada no cliente; o servidor só renderiza a casca.** `app/search/page.tsx` (RSC) lê
   `searchParams`, valida os critérios (destino, datas, hóspedes) e renderiza título, resumo e o
   componente cliente de resultados. A lista vem de `useQuery` no browser. Motivos: filtros mudam
   por interação (cada mudança iria ao servidor), API no Render free tem cold start de dezenas de
   segundos (no servidor isso seguraria o HTML inteiro até o timeout de 10 s; no cliente vira
   skeleton + retry), e o skeleton (básico) fica visível de verdade. A F4 é quem demonstra Server
   Component com dado. Descartado: prefetch no RSC + `HydrationBoundary` (dois caminhos de fetch,
   TTFB preso à API, erro no servidor sem retry).

3. **Critérios por props do servidor; filtros por `useSearchParams` no cliente.** Os critérios só
   mudam por navegação (F2 → `router.push`), então o RSC os entrega como props. Filtros, ordenação e
   página são lidos com `useSearchParams` e escritos com **`window.history.replaceState`** (Next 16
   integra a History API ao router: `useSearchParams` atualiza sem request ao servidor — doc
   "Linking and navigating › Native History API"). Descartado: `router.replace` (faz roundtrip RSC a
   cada checkbox e só atualiza `useSearchParams` depois dele). Consequência: o `searchParams` do
   servidor pode ficar "velho" em relação aos filtros; **nada no RSC pode depender de filtro**.

4. **Histórico: filtros e ordenação substituem; página empilha.** Filtro/ordenação →
   `replaceState` (Voltar não desfaz checkbox por checkbox). Paginação usa o `Pagination` da F1 em
   modo link (`getHref`): `<a>` real (abre em nova aba), navegação do Next empilha no histórico, e
   Voltar retorna à página anterior. Toda mudança de filtro/ordenação volta para a página 1.

5. **Vocabulário próprio na URL, desacoplado da API.** Chaves: `minPrice`, `maxPrice`,
   `minRating`, `type` (repetido), `amenity` (repetido), `sort`, `page`, além dos 6 critérios da F1.
   `model/search-filters.ts` faz parse **tolerante por chave** (valor inválido é descartado sozinho,
   nunca derruba a página: `minRating=abc&page=-1` vira "sem nota mínima, página 1") e serialização
   **canônica** (ordem fixa, valores-padrão omitidos, arrays deduplicados na ordem do enum). A URL
   canônica também é a chave de cache estável. `withFilters(params, filters)` troca só as chaves de
   filtro e preserva os critérios como estão. Descartado: espelhar `_page`/`rating_gte` na URL
   (vaza o backend no link compartilhado).

6. **Mudanças de filtro por reducer puro.** `applyFilterChange(filters, change)` com
   `change = setPrice | setRating | toggleType | toggleAmenity | setSort | clear` (switch exaustivo
   com `never`); todas zeram a página. `clear` limpa preço, nota, tipo e comodidades e **mantém a
   ordenação** (ordenar não é filtrar).

7. **Preço: dois sliders nativos (`<input type="range">`), domínio fixo 0–3.000, passo 50.** O
   enunciado pede "slider com valores". Dois `range` nativos (mínimo e máximo), cada um com rótulo e
   `aria-valuetext` ("R$ 500"; no topo, "R$ 3.000 ou mais"), dão teclado e leitor de tela de graça.
   Mínimo nunca passa do máximo (o slider arrastado é limitado pelo outro). `0` omite
   `pricePerNight_gte`; `3.000` omite `pricePerNight_lte` (o seed vai até R$ 3.180). Valor local
   atualiza na hora; a URL só muda **400 ms depois do último movimento** (`useDebouncedValue`) e
   sincroniza de volta quando a URL muda por fora (limpar, Voltar). Domínio fixo porque o intervalo
   por destino exigiria a lista sem filtros. Descartado: slider de dois polegares sobrepostos
   (alvos de toque e foco frágeis), campos numéricos (o enunciado pede slider).

8. **Nota mínima em opções fechadas: qualquer, 3,5+, 4,0+, 4,5+** (`rating_gte`). O seed vai de
   3,0 a 5,0; "3,0+" seria igual a "qualquer". Valor fora da lista na URL é descartado.

9. **Preço do card = `pricePerNight` do hotel, coerente com filtro e ordenação.** O README diz que
   ele é o quarto mais barato, mas os hotéis 1 (1.200 vs. quarto de 800) e 4 (890 vs. 720) divergem.
   Filtro e ordenação da API usam esse campo; se o card mostrasse o mínimo dos quartos, um hotel
   filtrado em "R$ 900–1.500" apareceria "a partir de R$ 800". Para 2 de 60 hotéis o detalhe mostra
   um preço **menor** que o card (surpresa boa, nunca cobrança maior). A F4 calcula "a partir de"
   pelos quartos. Descartado: `GET /rooms?hotelId=…` em lote por página (request extra, falha extra
   e incoerência com o filtro).

10. **Total da estadia no card: `stayTotal({ pricePerNight, nights, rooms })` em centavos.**
    `reaisToCents(diária) × noites × quartos`, devolvido em reais (sem erro de ponto flutuante). Só
    no modo "estadia" (critérios válidos). Sem taxas: o breakdown com taxas é da F5; o rótulo diz
    "total · 3 noites · 1 quarto" (design system, PriceTag `total`), não "total final". Função na
    feature (primeiro uso); F4/F5 promovem.

11. **Três modos de página a partir da URL (`parseSearchPage`)**:
    - `missing-destination` (sem `destination` ou inválido): h1 "Para onde você vai?", texto e o
      `SearchForm` vazio. Status 200.
    - `browse` (destino válido, mas datas/hóspedes ausentes ou inválidos): lista o destino com preço
      por noite, **sem total**, `Alert` info pedindo datas e o formulário "Alterar busca" **aberto**
      com o destino preenchido. Link do card sem critérios.
    - `stay` (critérios válidos): fluxo completo, totais e link do card com os critérios.
    Check-in no passado não está no schema (F1): em `stay`, o cliente compara com `useToday()` e
    mostra `Alert` warning; a lista continua. Descartado: `notFound()`/redirect para `/` (perde o
    destino de um link compartilhado incompleto).

12. **"Alterar busca" reaproveita o `SearchForm` da F2 por composição em `app/`.** O
    `SearchHeader` recebe o formulário pronto num slot (`editForm`). O `SearchForm` passa a aceitar
    `initialCriteria?: Partial<SearchCriteria>` (mudança pequena na F2: `toFormValues` mescla com os
    defaults; destino presente conta como escolhido) para o modo `browse` preencher só o destino.
    `key` = query string dos critérios no `SearchForm` e no `SearchHeader`: Voltar/nova busca
    remonta o form com os valores certos e fecha o painel. O submit da F2 navega para
    `/search?<critérios>` **sem filtros** (nova busca, lista nova). Descartado: preservar filtros
    (a F2 teria de conhecer filtros da F3) e duplicar o formulário na F3.

13. **Prefetch do detalhe: hotel + quartos, com intenção.** `usePrefetchHotel(id)` devolve
    handlers para o link do card: `onPointerEnter` (só `pointerType === "mouse"`) agenda 150 ms,
    `onPointerLeave` cancela, `onFocus` dispara na hora. Chama
    `queryClient.prefetchQuery(hotelQueryOptions(id))` e `prefetchQuery(hotelRoomsQueryOptions(id))`
    (mesmas chaves que F4/F5 usam; respeita `staleTime` de 60 s, então não repete). Sem
    `router.prefetch`: o `<Link>` já prefetcha a rota no viewport em produção (diverge do
    `CLAUDE.md` da feature, que será atualizado). Descartado: semear o cache do detalhe com o objeto
    da lista (hoje é idêntico, mas lista e detalhe são contratos diferentes; e tornaria o prefetch
    inócuo) e prefetch em toque (o `pointerdown` vem colado no clique).

14. **Troca de filtro/página sem piscar, mas sem mostrar outro destino.** `placeholderData`
    = `keepPreviousIfSameDestination(destination)`: mantém os dados anteriores só se a query anterior
    era do mesmo destino (nova busca mostra skeleton, não os hotéis da cidade antiga). Enquanto
    `isPlaceholderData`, a lista fica com `aria-busy` e indicação "Atualizando resultados…", e a
    contagem não é anunciada até chegar o dado novo.

15. **Estado da tela derivado por função pura `deriveResultsView`** (como o `suggestions-view` da
    F2), testada em tabela: `loading` | `offline` | `error` | `empty-destination` | `empty-filters` |
    `out-of-range` | `results` (com `stale`). `offline` = `fetchStatus === "paused"` sem dados (com
    dados: lista + `Alert` warning). `out-of-range` = página > total de páginas com total > 0 →
    `replaceState` para a última página. Lento (> 5 s carregando) mostra "Está demorando mais que o
    normal…" (design system 6.5).

16. **Erros: retry do query client + botão + error boundary só na seção de resultados.** Erros de
    request (rede, 5xx, parse) ficam no `useQuery`: 2 tentativas automáticas com backoff (F1) e
    depois `ErrorState` "Não foi possível carregar os hotéis" com "Tentar de novo" (`refetch`,
    botão em loading "Tentando…"). Filtros e cabeçalho continuam usáveis. Erros de **renderização**
    da seção caem num `ErrorBoundary` (novo primitivo em `shared/ui`, componente de classe: React
    não tem hook de error boundary) dentro de `QueryErrorResetBoundary`; o fallback é o mesmo
    `ErrorState`, e "Tentar de novo" reseta a boundary e as queries. `resetKeys` = chave da query
    (mudar filtro também sai do erro). `app/search/error.tsx` cobre o resto da rota. Descartado:
    `react-error-boundary` (dependência para ~30 linhas) e `useSuspenseQuery` + `throwOnError`
    (incompatível com `placeholderData`; perderia a lista anterior na troca de filtro).

17. **Imagem: loader do Unsplash + blur constante.** O `thumbnail` vem com `?w=400`: no celular
    (100vw, DPR 3) o otimizador do Next não amplia além do original e a foto fica borrada.
    `unsplashLoader({ src, width, quality })` reescreve `w`, `h` (4:3), `fit=crop`, `q`,
    `auto=format` na URL do Unsplash (CDN imgix redimensiona na borda; sem custo de otimização no
    servidor do Next). `placeholder="blur"` com `BLUR_DATA_URL` constante (SVG mínimo em base64 nas
    cores neutras do design system) e `sizes="(min-width: 640px) 14rem, 100vw"`. Primeiro card com
    `loading="eager"` + `fetchPriority="high"` (LCP); demais `lazy`. Imagem quebrada → bloco cinza
    com ícone `bed` (sem layout shift). Descartado: blur real por imagem com `plaiceholder`/`sharp`
    (exige baixar cada imagem no servidor a cada render, e a lista é buscada no cliente) e LQIP do
    próprio Unsplash (`w=16`, um request extra por card e mexe na CSP `img-src`). Loader e blur
    nascem na feature; a F4 (galeria) promove para `shared`.

18. **Disponibilidade por função pura `availabilityStatus(availableRooms, requestedRooms)`** →
    `sold-out` (0: badge "Esgotado", foto em cinza, sem total, nota "Sem quartos disponíveis para
    estas datas.") | `insufficient` (0 < disponíveis < quartos buscados: "Só N quartos disponíveis")
    | `scarce` (≤ 2: "Apenas N quartos!") | `available` (nada). O card esgotado continua sendo link
    (o detalhe explica). A ordem da API é mantida (reordenar no cliente quebraria a paginação).

19. **Promoções para `shared/` nesta feature (segundo uso ou primitivo óbvio):**
    `useToday` e `useDebouncedValue` saem da F2 para `shared/hooks/` (F2 Decisão 15 já previa);
    `parseDestinationParam` em `shared/lib/search-params.ts` (mesmas regras do destino da F1, para o
    modo `browse`); `ratingLabel` em `shared/lib/format.ts` (o design system manda a função para
    `shared/lib`); `Dialog` ganha `placement: "center" | "sheet"` (o Drawer é "o mesmo `<dialog>`
    com outra geometria": duplicar o ciclo de vida seria pior); `ErrorBoundary` em `shared/ui`;
    helper de teste `shared/testing/next-navigation.ts`. Ficam na feature (primeiro uso):
    `HotelCard`, `RatingScore`, `PriceTag`, rótulos de comodidades/tipos, `stayTotal`,
    `unsplashLoader`, `useCopyLink`.

20. **Ordenação com desempate explícito** (json-server 0.17 aceita `_sort=a,b&_order=x,y`,
    verificado): `popular` → `reviewCount,id` `desc,asc`; `price-asc` → `pricePerNight,id`
    `asc,asc`; `rating-desc` → `rating,reviewCount` `desc,desc`. Páginas determinísticas mesmo com
    empates (Rio tem 4 hotéis com nota 4,0 na virada da página 1 para a 2). Padrão `popular`
    (omitido da URL).

21. **Playwright sobe a mock-api.** `webServer` vira lista: mock-api (`npm --prefix mock-api run
    server`, porta 3333, `url` de saúde `/suggestions?q=sao`) + front; ambos com
    `reuseExistingServer: !CI`, e nenhum quando `PLAYWRIGHT_BASE_URL` existe (deploy). A nota do
    `CLAUDE.md` raiz sobre `test:e2e` muda para "sobe mock-api e front se não estiverem rodando;
    exige `npm install` em `mock-api/`".

## Contrato de dados

| Uso | Endpoint | Schema | Query key / options | Onde |
|---|---|---|---|---|
| Lista | `GET /hotels` (params abaixo) | `apiGetPage("/hotels", hotelSchema)` → `{ items: Hotel[], total }` | `queryKeys.hotels.list(apiQuery)` · `hotelsQueryOptions(destination, filters)` | `features/hotel-search/api/hotels.ts` |
| Prefetch detalhe | `GET /hotels/:id` | `hotelSchema` | `hotelQueryOptions(id)` (shared) | `usePrefetchHotel` |
| Prefetch quartos | `GET /rooms?hotelId=:id` | `z.array(roomSchema)` | `hotelRoomsQueryOptions(id)` (shared) | `usePrefetchHotel` |

**Filtros → query da API** (`toHotelsApiQuery(destination, filters)`; a chave do cache é este objeto):

| Filtro (URL) | Param da API | Omitido quando |
|---|---|---|
| destino (critério) | `destination` (exato, com acento — já é o `name` da sugestão) | nunca |
| `minPrice` | `pricePerNight_gte` | 0 |
| `maxPrice` | `pricePerNight_lte` | ≥ 3.000 |
| `minRating` | `rating_gte` | ausente |
| `type` (n) | `propertyType` repetido (OU) | nenhum |
| `amenity` (n) | `amenities_like=^(?=.*\bA\b)(?=.*\bB\b)` (uma regex, E) | nenhuma |
| `sort` | `_sort` + `_order` (Decisão 20) | — (padrão `popular` sempre enviado) |
| `page` | `_page` + `_limit=10` | — |

Exemplo (Rio, piscina + spa, menor preço, página 1):
`/hotels?destination=Rio+de+Janeiro%2C+RJ&amenities_like=%5E%28%3F%3D.*%5Cbpool%5Cb%29%28%3F%3D.*%5Cbspa%5Cb%29&_sort=pricePerNight%2Cid&_order=asc%2Casc&_page=1&_limit=10`
→ ids 9, 11, 1, 7 · `X-Total-Count: 4`.

**Verificado na mock-api** (porta temporária, seed atual):
- `X-Total-Count` exposto por CORS (`Access-Control-Expose-Headers: X-Total-Count, Link`).
- `destination=Sao Paulo, SP` → 0; `São Paulo, SP` → 14. Bonito → `[]` e `X-Total-Count: 0`.
- Rio: 14 (página 2 com 4; `_page=5` → `[]` com total 14). Esgotados: 19 (Rio) e 48 (Noronha);
  escassez: 7 (Rio, 1 quarto) e 5 (SP, 2 quartos).
- `rating_gte=abc` → 200 `[]` (por isso o parse da URL descarta antes de chamar a API).
- `?_fail=1` → 500 `{ "error": "Falha simulada pela mock API" }`; `?_delay=N` atrasa.
- A lista devolve o objeto `Hotel` completo (mesmas chaves do detalhe): `hotelSchema` serve.

**Tipos de `model/search-filters.ts`:**
```ts
type SortOption = "popular" | "price-asc" | "rating-desc";
type MinRating = 3.5 | 4 | 4.5;
type SearchFilters = {
  minPrice: number;            // 0 = sem mínimo
  maxPrice: number;            // PRICE_RANGE.max (3000) = sem máximo
  minRating: MinRating | null;
  types: PropertyType[];       // ordem de propertyTypeSchema.options, sem duplicatas
  amenities: Amenity[];        // ordem de amenitySchema.options, sem duplicatas
  sort: SortOption;            // padrão "popular"
  page: number;                // ≥ 1, padrão 1
};
const PRICE_RANGE = { min: 0, max: 3000, step: 50 } as const;
const PAGE_SIZE = 10;
type FilterChange =
  | { type: "setPrice"; min: number; max: number }
  | { type: "setRating"; value: MinRating | null }
  | { type: "toggleType"; value: PropertyType }
  | { type: "toggleAmenity"; value: Amenity }
  | { type: "setSort"; value: SortOption }
  | { type: "clear" };
type SearchPage =
  | { kind: "missing-destination" }
  | { kind: "browse"; destination: string }
  | { kind: "stay"; criteria: SearchCriteria };
```
Parse por chave: preço inteiro, limitado ao domínio, `min > max` → troca; `minRating` só nos 3
valores; `type`/`amenity` filtrados pelo enum; `sort` desconhecido → `popular`; `page` inteiro ≥ 1.

Link do card (`hotelHref(id, criteria | null)`): `/hotel/{id}?{searchCriteriaToQueryString(criteria)}`
no modo `stay`; `/hotel/{id}` no `browse`. Filtros não vão para a F4.

## Critérios de aceite

Lista e cards
1. Dado `/search?destination=Rio de Janeiro, RJ&checkIn=…&checkOut=…(3 noites)&rooms=1&adults=2&children=0`, então aparecem 10 cards em `<ul role="list">`, ordenados por mais populares (1º "Pousada Vista Corcovado"), e a região `aria-live="polite"` anuncia "14 hotéis encontrados".
2. Cada card mostra foto (`alt` = nome do hotel), nome como **único** link (área do card inteira clicável, sem link dentro de link), destino, tipo, nota com `RatingScore` ("4,8" + estrelas + "2.847 avaliações"), até 3 comodidades + "+N" (as filtradas primeiro) e preço por noite.
3. No modo `stay`, o card mostra também o total: hotel 13 (R$ 180) com 3 noites e 1 quarto → "R$ 540,00" "total · 3 noites · 1 quarto"; com 2 quartos → "R$ 1.080,00".
4. O hotel 19 mostra badge "Esgotado", foto em tons de cinza, "Sem quartos disponíveis para estas datas." e não mostra total; o hotel 7 mostra "Apenas 1 quarto!"; buscando 3 quartos, um hotel com 2 disponíveis mostra que não há quartos suficientes.
5. O link do card é `/hotel/{id}?destination=…&checkIn=…&checkOut=…&rooms=…&adults=…&children=…` (critérios na ordem da F1), sem filtros.
6. Ao passar o mouse por ≥ 150 ms ou focar o link do card, então saem `GET /hotels/{id}` e `GET /rooms?hotelId={id}` uma vez (sem repetir dentro de 60 s); passar o mouse rapidamente por cima não dispara.

Paginação
7. Com 14 resultados, a paginação mostra 2 páginas; clicar "Próxima" leva a `?…&page=2`, mostra 4 cards, rola para o topo da lista e move o foco para o título/contagem dos resultados (`tabIndex=-1`) sem ficar atrás do header fixo. Voltar do browser retorna à página 1.
8. Com 1 página, a paginação não aparece. `page=5` com 14 resultados troca a URL (sem nova entrada no histórico) para `page=2`.

Filtros e ordenação (URL como fonte da verdade)
9. Marcar "Piscina" e "Spa" (Rio) mostra 4 hotéis (1, 7, 9, 11), a URL ganha `amenity=pool&amenity=spa`, a página volta para 1 e o foco continua no checkbox.
10. "Pousada" mostra 4 hotéis (`type=pousada`); "Pousada" + "Resort" mostra 5 (OU entre tipos).
11. "4,5+" mostra 5 hotéis (`minRating=4.5`); as opções são radios num `fieldset` com `legend`.
12. Os sliders de preço têm rótulo e `aria-valuetext` em reais; mover o máximo até R$ 500 pelo teclado (Rio) mostra 3 hotéis e grava `maxPrice=500` **uma vez**, 400 ms após o último movimento; o mínimo nunca ultrapassa o máximo; o topo do máximo é "R$ 3.000 ou mais" e omite o param.
13. "Ordenar por" (select nativo com rótulo) com "Menor preço" põe o hotel 13 (R$ 180) primeiro e grava `sort=price-asc`; "Maior avaliação" põe o hotel 17 (5,0) primeiro.
14. Recarregar a página ou abrir a URL copiada em outra aba restaura filtros, ordenação, página, lista e controles marcados.
15. "Copiar link" copia a URL atual e mostra o toast "Link copiado."; se a cópia falhar, toast "Não foi possível copiar. Copie o endereço na barra do navegador."
16. "Limpar filtros" zera preço, nota, tipo e comodidades, mantém a ordenação e volta à página 1.
17. Params inválidos (`minRating=abc&page=-1&amenity=sauna&sort=x&minPrice=900&maxPrice=200`) não quebram a página: os inválidos são ignorados e o preço invertido vira 200–900.
18. Durante a troca de filtro/página, a lista anterior continua visível com `aria-busy="true"` e "Atualizando resultados…"; a contagem só é anunciada quando chega o dado novo.

Estados
19. No primeiro carregamento aparece o skeleton (mesma geometria do card) com `aria-busy` e "Carregando hotéis…" em `aria-live`; depois de 5 s ainda carregando aparece "Está demorando mais que o normal…".
20. `Bonito, MS` mostra o vazio "Nenhum hotel em Bonito, MS" com "Fazer nova busca"; filtros sem resultado (Rio + Piscina + Spa + Clube infantil) mostram "Nenhum hotel com esses filtros" com "Limpar filtros" (primária), que restaura a lista e leva o foco para a contagem.
21. Com a API respondendo 500, depois das tentativas automáticas aparece `ErrorState` (`role="alert"`) "Não foi possível carregar os hotéis" sem texto da API; "Tentar de novo" fica em "Tentando…" e, com a API de volta, mostra a lista. Filtros continuam operáveis durante o erro.
22. Um erro de renderização na seção de resultados mostra o fallback da error boundary só nessa seção (cabeçalho e filtros intactos); "Tentar de novo" remonta a seção.
23. Sem rede e sem dados: aviso "Você está sem internet. Assim que a conexão voltar, tente de novo."; com dados anteriores, a lista fica e o aviso aparece acima.

Página e modos
24. `/search` sem destino mostra h1 "Para onde você vai?" e o formulário de busca vazio; enviar leva ao modo `stay`.
25. Destino válido com datas ausentes/inválidas lista o destino sem totais, mostra o `Alert` pedindo datas e o formulário "Alterar busca" aberto com o destino preenchido; links dos cards sem critérios.
26. No modo `stay`, o topo mostra h1 "Hotéis em Rio de Janeiro, RJ" e o resumo "12–15 dez · 2 adultos · 1 quarto" com "Alterar busca", que abre o `SearchForm` preenchido; enviar com outras datas navega para a nova URL **sem filtros** e o painel fecha.
27. Com check-in no passado (URL antiga), aparece o aviso para alterar as datas; a lista continua.
28. `metadata.title`: "Hotéis em Rio de Janeiro, RJ | Infotera Hotéis" (sem destino: "Buscar hotéis | Infotera Hotéis"); um único `h1`; nenhuma página renderiza `<main>`.

Mobile e acessibilidade
29. Abaixo de `lg`, os filtros saem da lateral e abrem por "Filtros" (com contador, ex.: "Filtros (3)") num bottom-sheet (`<dialog>` modal, foco preso, Esc fecha, foco volta ao botão); o rodapé tem "Limpar filtros" e "Ver N hotéis" (fecha; durante o carregamento mostra que está atualizando). Filtros aplicam na hora (a lista atrás muda).
30. Em 320 px não há scroll horizontal (lista, filtros, sheet, paginação "Página 1 de 2").
31. axe (wcag2a/aa) sem violações: lista, sheet aberto, vazio, erro, modo sem destino.
32. Tudo operável por teclado com foco visível; filtros em `fieldset`/`legend`; ícones decorativos `aria-hidden`; nota nunca só por estrelas (texto ao lado).

## Arquivos

| Caminho | Responsabilidade |
|---|---|
| `src/shared/hooks/useToday.ts` (+ test, movido da F2) | data local só no cliente |
| `src/shared/hooks/useDebouncedValue.ts` (+ test, movido da F2) | valor com atraso |
| `src/features/search-form/hooks/*` · `components/DateRangeFields.tsx` etc. (alt.) | importar os hooks de `@/shared/hooks/…` |
| `src/shared/lib/search-params.ts` (alt.) | `parseDestinationParam(input): string \| null` (reusa o schema do destino) |
| `src/shared/lib/format.ts` (alt.) | `ratingLabel(rating)`: Excelente/Muito bom/Bom/Regular |
| `src/shared/ui/molecules/Dialog.tsx` (alt.) | prop `placement: "center" \| "sheet"` (bottom-sheet do design system) |
| `src/shared/ui/ErrorBoundary.tsx` | `"use client"`, classe: `fallback({ error, reset })`, `onReset`, `resetKeys` |
| `src/shared/ui/index.ts` (alt.) | exporta `ErrorBoundary` |
| `src/shared/testing/next-navigation.ts` | mock de `next/navigation` (`useSearchParams` sobre `window.location`, reage a `pushState`/`replaceState`/`popstate`; `useRouter` espiável) |
| `src/shared/CLAUDE.md` (alt.) | estrutura (`hooks/`), promoções e pendentes atualizados |
| `src/features/search-form/model/search-form.schema.ts` · `components/SearchForm.tsx` · `hooks/useSearchForm.ts` (alt.) | `initialCriteria?: Partial<SearchCriteria>` |
| `src/features/hotel-search/model/search-filters.ts` | tipos, constantes, `parseSearchFilters`, `serializeSearchFilters`, `withFilters`, `countActiveFilters`, `hasActiveFilters` |
| `.../model/filter-change.ts` | `applyFilterChange` (reducer exaustivo) |
| `.../model/to-api-query.ts` | `toHotelsApiQuery`, `amenitiesPattern`, `SORT_TO_API` |
| `.../model/search-page.ts` | `parseSearchPage`, `hotelHref`, `searchPageTitle` |
| `.../model/stay-price.ts` | `stayTotal` (centavos) |
| `.../model/availability.ts` | `availabilityStatus` |
| `.../model/labels.ts` | `amenityLabel`, `propertyTypeLabel`, `sortLabel` (switch exaustivo), ordem de exibição |
| `.../model/card-amenities.ts` | `pickCardAmenities(hotelAmenities, selected, limit = 3)` → `{ shown, hiddenCount }` |
| `.../model/results-view.ts` | `deriveResultsView`, `describeResultCount`, `outOfRangePage` |
| `.../model/image.ts` | `unsplashLoader`, `BLUR_DATA_URL`, `CARD_IMAGE_SIZES` |
| `.../api/hotels.ts` | `fetchHotels(query, signal)`, `hotelsQueryOptions(destination, filters)`, `keepPreviousIfSameDestination` |
| `.../hooks/useSearchFilters.ts` | lê filtros (`useSearchParams`), `update(change)` via `replaceState`, `pageHref(page)` |
| `.../hooks/useHotelResults.ts` | `useQuery` + `deriveResultsView` + redirecionamento de página fora do intervalo |
| `.../hooks/usePrefetchHotel.ts` | handlers com intenção (150 ms) + `prefetchQuery` hotel e quartos |
| `.../hooks/usePriceDraft.ts` | estado local dos sliders, limite min ≤ max, commit com debounce, sync com a URL |
| `.../hooks/useFocusOnPageChange.ts` | foca a contagem + `revealBelowHeader` quando a página muda e o dado novo chega |
| `.../hooks/useSlowLoading.ts` | `true` depois de 5 s em loading |
| `.../hooks/useCopyLink.ts` | `navigator.clipboard.writeText(location.href)` + toasts |
| `.../components/SearchHeader.tsx` | h1, resumo, "Alterar busca" (disclosure com slot `editForm`), "Copiar link", alertas de modo/datas passadas |
| `.../components/MissingDestination.tsx` | h1 + texto + slot do formulário (modo sem destino) |
| `.../components/HotelSearchResults.tsx` | `"use client"`; grid lateral/conteúdo, toolbar, seção com boundary |
| `.../components/ResultsToolbar.tsx` | contagem (`aria-live`, alvo de foco), `SortSelect`, botão "Filtros (n)" |
| `.../components/ResultsSection.tsx` | `switch` exaustivo sobre a view: skeleton/erro/vazios/lista/paginação |
| `.../components/ResultsList.tsx` · `HotelCard.tsx` · `HotelCardSkeleton.tsx` · `HotelImage.tsx` | lista e card |
| `.../components/RatingScore.tsx` · `PriceTag.tsx` | moléculas do design system (nascem aqui) |
| `.../components/FiltersPanel.tsx` · `PriceFilter.tsx` · `RatingFilter.tsx` · `TypeFilter.tsx` · `AmenitiesFilter.tsx` | filtros (`fieldset`/`legend`) |
| `.../components/FiltersDrawer.tsx` | `Dialog placement="sheet"` + rodapé |
| `.../components/SortSelect.tsx` · `ResultsEmpty.tsx` · `ResultsError.tsx` | ordenação, vazios, erro |
| `.../index.ts` | `SearchHeader`, `MissingDestination`, `HotelSearchResults`, `ResultsSkeleton`, `parseSearchPage`, `searchPageTitle` |
| `src/features/hotel-search/CLAUDE.md` (alt.) | decisões finais (regex E, History API, sem `router.prefetch`, modos) |
| `src/app/search/page.tsx` | `generateMetadata`; `parseSearchPage(await searchParams)` → compõe por modo com `SearchForm` |
| `src/app/search/loading.tsx` · `error.tsx` | skeleton da feature · `ErrorState variant="page"` com `reset` |
| `src/app/search/page.test.tsx` | os três modos renderizam o que devem |
| `playwright.config.ts` (alt.) · `CLAUDE.md` raiz (alt.) | `webServer` da mock-api + nota do `test:e2e` |
| `e2e/hotel-search.spec.ts` · `hotel-search.states.spec.ts` · `hotel-search.mobile.spec.ts` | E2E |

Testes ficam ao lado (`*.test.ts(x)`). **Orçamento do Biome** (função ≤ 80 linhas, arquivo ≤ 250,
complexidade cognitiva ≤ 15): nenhum componente concentra estados — `ResultsSection` só faz o
`switch`; cada filtro é um componente; `search-filters.ts` separa parse (um parser por chave) de
serialize; se `HotelCard` passar de ~60 linhas, extrair `HotelCardPrice` e `HotelCardBadges`.

## Tarefas

Escopo `hotel-search` nos commits da feature; mudanças em `shared`/`search-form` usam o escopo do
dono (como na F2).

1. `refactor(shared): promote useToday and useDebouncedValue to shared hooks` — move arquivos e testes, atualiza imports da F2. Prova: suíte da F2 verde sem mudança de teste além do import.
2. `feat(shared): add destination param parser` — Prova: unit (ausente, vazio, só espaços, >100, array → 1º, acento preservado).
3. `feat(shared): add rating label` — Prova: unit nas fronteiras 3,49/3,5/3,99/4,0/4,49/4,5/5.
4. `feat(shared): add sheet placement to dialog` — Prova: teste do `Dialog` (classes de sheet, Esc, foco volta) + suíte existente verde.
5. `feat(shared): add error boundary` — Prova: componente (filho que lança → fallback; `reset` remonta; mudar `resetKeys` sai do erro).
6. `test(shared): add next navigation mock helper` — Prova: teste do helper (`replaceState` atualiza `useSearchParams`; `popstate` também).
7. `feat(search-form): accept partial initial criteria` — Prova: componente (só destino → destino escolhido, datas vazias, hóspedes padrão) + testes antigos verdes.
8. `feat(hotel-search): add search filters url schema` — Prova: unit (round-trip, canônico, defaults omitidos, inválidos descartados por chave, preço invertido, dedupe/ordem, `withFilters` preserva critérios e chaves desconhecidas não-filtro, `countActiveFilters`).
9. `feat(hotel-search): add filter change reducer` — Prova: unit (cada ação; toda ação zera `page`; `clear` mantém `sort`; toggle liga/desliga).
10. `feat(hotel-search): map filters to hotels api query` — Prova: unit (tabela do Contrato, exemplo exato) + teste da regex contra o `db.seed.json` (todas as combinações de 1 e 2 comodidades por destino = `every`).
11. `feat(hotel-search): add search page parsing and hotel links` — Prova: unit (`missing-destination`/`browse`/`stay`, `hotelHref` nos dois modos, `searchPageTitle`).
12. `feat(hotel-search): add card pricing, availability and amenity rules` — Prova: unit (`stayTotal` com 0,1+0,2 de centavos; 2 quartos; `availabilityStatus` em tabela; `pickCardAmenities` com filtradas primeiro e `hiddenCount`; rótulos exaustivos).
13. `feat(hotel-search): add results view derivation` — Prova: unit em tabela (cada view, `stale`, offline com/sem dados, `out-of-range`, `describeResultCount` 0/1/n).
14. `feat(hotel-search): add hotels query options` — Prova: teste com `fetch` stubado (URL exata, `total` do header, chave = query da API, placeholder mantém só com mesmo destino).
15. `feat(hotel-search): add unsplash image loader and blur placeholder` — Prova: unit (`w`, `h` 4:3, `q`, `auto=format`, preserva outros params; URL não-Unsplash intacta).
16. `feat(hotel-search): add search filters hook` — Prova: hook test com o helper da tarefa 6 (lê, `update` grava canônico com `replaceState`, `pageHref`).
17. `feat(hotel-search): add hotel card with detail prefetch` — `HotelCard`, `HotelImage`, `RatingScore`, `PriceTag`, skeleton, `usePrefetchHotel`. Prova: componente (critérios 2–6 com fake timers para os 150 ms).
18. `feat(hotel-search): add filters panel` — Prova: componente (critérios 9–12, 16; debounce do slider com fake timers; foco permanece).
19. `feat(hotel-search): add results section with states and pagination` — `HotelSearchResults`, toolbar, sort, seção, vazios, erro, boundary, foco, lento. Prova: componente (critérios 1, 7, 8, 13, 18–23).
20. `feat(hotel-search): add filters drawer for small screens` — Prova: componente (critério 29).
21. `feat(hotel-search): add search header with edit and share` — `SearchHeader`, `MissingDestination`, `useCopyLink`. Prova: componente (critérios 15, 24–27 com `navigator.clipboard` stubado).
22. `feat(hotel-search): compose search route` — `app/search/page|loading|error.tsx` + `page.test.tsx`. Prova: `npm run typecheck && npm run lint && npm run test` verdes; `npm run build` ok.
23. `test(hotel-search): start mock-api from playwright web server` — `playwright.config.ts` + nota do `CLAUDE.md` raiz. Prova: `npm run test:e2e` com nada rodando antes sobe tudo e o smoke passa.
24. `test(hotel-search): add e2e for results, filters and url sharing` — Prova: `e2e/hotel-search.spec.ts` verde (desktop e mobile).
25. `test(hotel-search): add e2e for empty, invalid, slow and failing states` — Prova: `e2e/hotel-search.states.spec.ts` verde.
26. `test(hotel-search): add e2e for mobile drawer and accessibility` — Prova: `e2e/hotel-search.mobile.spec.ts` verde.
27. `docs(hotel-search): update feature and shared claude.md` — Prova: revisão (decisões 1, 3, 13, 19 refletidas; pendentes da F1 atualizados).

## Plano de testes

**Unit (`model/`, `shared/lib`, `api/`)** — 100% das funções puras das tarefas 2, 3, 8–15. Datas e
"hoje" sempre por parâmetro. O teste da regex de comodidades lê `mock-api/db.seed.json` e emula o
json-server: `new RegExp(pattern, "i").test(String(hotel.amenities))`.

**Componente (Vitest + Testing Library + `renderWithProviders`)**
- `next/navigation` pelo helper `shared/testing/next-navigation.ts` (URL inicial por teste;
  asserções em `window.location.search`). `fetch` com `vi.stubGlobal`, respondendo por URL
  (`/hotels?…` com header `X-Total-Count`; `/hotels/:id`; `/rooms`). Fixtures com
  `makeHotel` (`shared/testing/fixtures.ts`).
- Debounce do slider, intenção do prefetch (150 ms) e "demorando" (5 s) com
  `vi.useFakeTimers({ shouldAdvanceTime: true })` + `userEvent.setup({ advanceTimers })`.
- Erro: `fetch` 500 com `makeTestQueryClient` (retry desligado) → `ErrorState`; retry → sucesso.
- Boundary: `vi.mock` do `HotelCard` lançando uma vez.
- `isPlaceholderData`: segundo `fetch` pendente (promise controlada) → lista antiga com
  `aria-busy`.

**E2E (Playwright, mock-api real em `:3333` subida pelo `webServer`)** — datas `addDays(todayISO(), 30/33)`.
- `hotel-search.spec.ts`: Rio `stay` (10 cards, ordem, "14 hotéis encontrados", total do hotel 13,
  badges dos hotéis 19 e 7, href do card); paginação (página 2, foco, Voltar); Piscina + Spa → 4 e
  URL; tipos, nota, ordenação, slider por teclado (`End`/`ArrowLeft`) com
  `page.waitForRequest` contando **um** request após o debounce; recarregar restaura; "Copiar link"
  (`context.grantPermissions(["clipboard-read","clipboard-write"])`) e abrir o link copiado em nova
  página; prefetch: `hover` no card → `waitForRequest` de `/hotels/13` e `/rooms?hotelId=13`;
  "Alterar busca" com novas datas → URL sem filtros.
- `hotel-search.states.spec.ts`: Bonito vazio; filtros sem resultado + "Limpar filtros"; `/search`
  sem destino; destino sem datas (`browse`); params inválidos; **`_delay`**: `page.route("**/hotels?**")`
  reescrevendo para o `slowApi` do fixture (`e2e/helpers/mock-api-server.ts`, `--delay 2000`) →
  skeleton com `aria-busy`, depois lista; troca de filtro com API lenta mantém a lista anterior com
  "Atualizando resultados…"; **`_fail`**: reescrever para o `failingApi` (`--fail-rate 1`) → erro
  após as tentativas automáticas (timeout ≥ 8 s), `unroute` + "Tentar de novo" → lista; offline:
  `context.setOffline(true)` antes de trocar filtro → aviso de sem internet.
- `hotel-search.mobile.spec.ts` (só projeto `mobile-chromium` para o sheet): abrir "Filtros",
  marcar comodidade, contador, "Ver N hotéis" fecha e devolve o foco, Esc fecha; axe na lista, no
  sheet aberto, no vazio, no erro e no modo sem destino (`analyzeAccessibility` de `e2e/helpers/axe.ts`);
  320 px sem scroll horizontal (lista e sheet).

## Riscos

| Risco | Mitigação |
|---|---|
| Regex de comodidades depende de como o json-server aplica `_like` em arrays | Verificado na mock-api; teste unitário contra o seed inteiro + E2E real (Rio + Piscina + Spa = 4). Plano B documentado (Decisão 1 c) |
| `replaceState` e `searchParams` do RSC divergem | Regra: RSC só usa critérios; filtros só no cliente (Decisão 3). Teste de página cobre os modos |
| Slider gera request a cada passo | Debounce de 400 ms; E2E conta 1 request |
| Estado local do slider fora de sincronia com a URL (limpar, Voltar) | `usePriceDraft` ressincroniza quando o valor da URL muda e difere do último commit; teste de componente "limpar volta os sliders" |
| Mostrar hotéis da cidade anterior durante nova busca | `keepPreviousIfSameDestination` + `key` dos critérios; teste unitário |
| Foco perdido / atrás do header ao paginar | `useFocusOnPageChange` foca a contagem com `preventScroll` + `revealBelowHeader` (lição da F2) |
| Clique perdido por layout que muda no blur/pressionar (lição F2) | Nenhum filtro valida no blur; sliders e checkboxes não mudam a geometria ao interagir; erros só na seção de resultados |
| Prefetch não acelera a F4 se ela renderizar só no servidor | Contrato para a F4: ler hotel/quartos com `hotelQueryOptions`/`hotelRoomsQueryOptions` nas partes cliente (ou hidratar com a mesma chave). Registrar no `CLAUDE.md` da F4 |
| Sheet aberto quando a tela cresce para `lg` | Filtros continuam funcionando dentro do sheet; o `FiltersDrawer` fecha ao detectar `(min-width: 1024px)` via `matchMedia` |
| Loader do Unsplash e CSP | Hoje não há `img-src`; a F5 (CSP completa) precisa liberar `images.unsplash.com` **direto** (não só `/_next/image`). Anotar no `CLAUDE.md` do checkout |
| Total do card ≠ total do checkout (taxas) | Rótulo "total · N noites · N quartos" sem "final"; a F5 mostra o breakdown com taxas. Anotar no README |
| E2E com retry automático demora (1 s + 2 s) | Timeouts explícitos nos testes de erro; fixture `failingApi` responde sem delay |
| `webServer` da mock-api no CI sem `npm install` em `mock-api/` | Documentar no `CLAUDE.md` raiz; CI roda `npm ci --prefix mock-api` |
| Funções/arquivos acima do limite do Biome | Divisão planejada (seção Arquivos); `npm run lint` em toda tarefa |
| `SearchForm` dentro do `/search` mostra "Buscas recentes" | Aceitável (atalho útil); o ui-designer decide se o painel esconde a lista |

## UI/UX

Referências: `docs/design/design-system.md` §4.3–4.4 (página com sidebar, lista de cards), §5.1
PriceTag/RatingScore/Range, §5.2 Card/Pagination/EmptyState/ErrorState, §5.3 Drawer, §6 (microcopy).
O design system foi atualizado nesta feature: `Range` (slider), `RatingScore` e `PriceTag` detalhados
(total em destaque no card), `Card interactive` com as classes exatas, `Drawer` = `Dialog
placement="sheet"`, padrão "linha de status" da lista, disclosure "Alterar busca", rótulos de
comodidades/tipos/ordenação e mensagens novas em §6.

### Decisões de UX

1. **Com datas, o total é o número grande do card; a diária vira linha secundária.** Quem compara
   hotéis para 3 noites decide pelo total. Sem datas (`browse`), a diária é o número grande. Nunca os
   dois no mesmo tamanho (dois números grandes = nenhuma hierarquia).
2. **Nada aparece/some sob o dedo.** "Limpar filtros" fica sempre montado (com `aria-disabled` quando
   não há filtro ativo: o foco não se perde ao limpar); a linha de status da lista ("Mostrando 1–10
   de 14" ↔ "Atualizando resultados…") tem altura reservada (`min-h-5`) e troca texto; o painel
   "Alterar busca" abre **abaixo** do botão; o botão "Ver N hotéis" do sheet tem largura fixa
   (`flex-1`). Nenhum filtro valida no blur.
3. **Lista anterior só fica na tela se for da mesma busca e só durante a troca.** Placeholder
   (filtro/página anterior) aparece esmaecido com "Atualizando resultados…". Se a troca **falhar** ou
   ficar **offline**, o placeholder sai e entra o estado de erro/offline: nunca mostrar hotéis que
   não correspondem aos filtros marcados (lição F2). Ver "Ajustes aos critérios".
4. **Buscas recentes escondidas no painel "Alterar busca"; visíveis no modo sem destino.** No painel,
   elas empurrariam a lista ~300 px para baixo no celular e repetem a busca que já está na tela; no
   modo sem destino a página *é* um formulário de busca e o atalho ajuda. Exige prop nova no
   `SearchForm`: `showRecentSearches?: boolean` (padrão `true`).
5. **Preço com dois sliders nativos empilhados (Mínimo/Máximo) + resumo em texto acima.** Confirma a
   Decisão 7: alvo de 44 px por slider, teclado nativo (setas, PageUp/Down, Home/End), `aria-valuetext`
   em reais. O resumo ("R$ 200 – R$ 1.500") atualiza na hora; a lista, 400 ms depois.
6. **Erro e vazio no topo da coluna de resultados**, logo abaixo da toolbar (não centralizados num
   bloco alto): o "Tentar de novo" fica na primeira tela do celular (~480 px do topo em 375×667).

### Layout

Página: `SearchHeader` em largura total; abaixo, `lg:grid lg:grid-cols-[18rem_1fr] lg:gap-8`
(sidebar de filtros à esquerda, `hidden lg:block`). Espaço entre header da página e grid: `gap-6
lg:gap-8`. Nada de `<main>` (é do layout).

**320–375 px — modo `stay`:**
```
┌ SiteHeader (sticky h-14) ──────────┐
└────────────────────────────────────┘
 Hotéis em Rio de Janeiro, RJ           h1 text-2xl font-bold (quebra linha)
 12–15 dez · 3 noites · 2 adultos ·     p text-sm text-fg-muted tabular-nums
 1 quarto
 [Alterar busca ▾] [🔗 Copiar link]     Button secondary sm (aria-expanded) · Button ghost sm
 ┌ painel (fechado por padrão) ──────┐  SearchForm sem buscas recentes
 └───────────────────────────────────┘
 [⚠ Alert warning: datas passadas]      só se check-in < hoje
 14 hotéis encontrados                  h2 text-xl font-semibold, tabIndex=-1 (alvo de foco)
 Mostrando 1–10 de 14                   linha de status min-h-5 text-sm text-fg-muted
 [⚲ Filtros (2)] [Mais populares   ▾]   grid-cols-[auto_1fr] gap-3 items-end;
                  └ label "Ordenar por" acima do select (text-sm font-medium)
┌ HotelCard ─────────────────────────┐  <li>, Card interactive
│ [        foto 4:3 (100%)         ] │
│ Pousada Vista Corcovado            │  h3 > a, text-lg font-semibold, line-clamp-2
│ Pousada · Rio de Janeiro, RJ       │  text-sm text-fg-muted
│ 4,8 ★★★★★ Excelente                │  RatingScore (quebra antes da contagem se faltar espaço)
│ 2.847 avaliações                   │
│ ✓ Piscina ✓ Spa ✓ Wi-Fi +4         │  text-sm, filtradas primeiro (text-fg font-medium)
│ ───────────────────────────────────│  border-t border-border pt-3
│ [Apenas 1 quarto!]     R$ 540,00   │  badge à esquerda; preço à direita (flex-wrap:
│        total · 3 noites · 1 quarto │  o badge sobe para a linha de cima se não couber)
│      a partir de R$ 180 por noite  │
└────────────────────────────────────┘
 … mais 9 cards (gap-4)
 [‹ Anterior]  Página 1 de 2  [Próxima ›]   Pagination links, mt-8
```

**≥ 1024 px:**
```
 Hotéis em Rio de Janeiro, RJ                          [Alterar busca ▾] [🔗 Copiar link]
 12–15 dez · 3 noites · 2 adultos · 1 quarto           (lg:flex lg:items-end lg:justify-between)
 ┌ painel Alterar busca (largura total, quando aberto) ──────────────────────────────────┐
 └───────────────────────────────────────────────────────────────────────────────────────┘
┌ Filtros ─────── [Limpar filtros] ┐  14 hotéis encontrados              Ordenar por [Mais populares ▾]
│ Preço por noite                  │  Mostrando 1–10 de 14                          (label inline, select w-56)
│ R$ 200 – R$ 1.500                │ ┌ card horizontal ───────────────────────────────────────────────┐
│ Mínimo                           │ │ ┌foto w-56┐ Pousada Vista Corcovado                            │
│ [==o====================]        │ │ │ 4:3     │ Pousada · Rio de Janeiro, RJ                       │
│ Máximo                           │ │ │         │ 4,8 ★★★★★ Excelente · 2.847 avaliações             │
│ [=========o=============]        │ │ │         │ ✓ Piscina ✓ Spa ✓ Wi-Fi +4                         │
│ ──────────────────────────────── │ │ │         │ ─────────────────────────────────────────────────  │
│ Nota mínima                      │ │ └─────────┘ [Apenas 1 quarto!]                  R$ 540,00      │
│ ( ) Qualquer nota                │ │                                total · 3 noites · 1 quarto     │
│ (•) 4,5 ou mais  Excelente       │ │                              a partir de R$ 180 por noite      │
│ ( ) 4,0 ou mais  Muito bom       │ └────────────────────────────────────────────────────────────────┘
│ ( ) 3,5 ou mais  Bom             │   … (gap-6)
│ ──────────────────────────────── │        [‹ Anterior] [1] [2] [Próxima ›]
│ Tipo de hospedagem               │
│ [ ] Hotel  [ ] Pousada [ ] Resort│  (um por linha)
│ ──────────────────────────────── │
│ Comodidades                      │
│ [x] Piscina  … (15, um por linha)│
└──────────────────────────────────┘
```
- Sidebar: `aside` com classes de `Card static`, `p-5`, cabeçalho `flex min-h-11 items-center
  justify-between` (h2 "Filtros" `text-lg font-semibold` + "Limpar filtros" ghost sm). Grupos
  separados por `divide-y divide-border`, cada `fieldset` `py-5` (primeiro `pt-0`). Sem `sticky`
  (a lista de comodidades é longa; scroll aninhado é pior). Todas as 15 comodidades visíveis (sem
  "ver mais": menos um estado, e a marcada nunca fica escondida).
- Card `sm+`: horizontal (`sm:flex-row`). Foto `sm:w-56 sm:shrink-0`, `aspect-[4/3]` no mobile e
  `sm:aspect-auto sm:min-h-42` (= 4:3 de 224 px) esticando até a altura do card (`object-cover`),
  para não sobrar "buraco" sob a foto. Corpo `flex flex-1 flex-col gap-2 p-4 md:p-5`; bloco de preço
  empurrado para baixo (`mt-auto`).
- Toolbar ≥ `lg`: `flex items-start justify-between gap-4`; "Filtros (n)" escondido (`lg:hidden`).
- 320 px: nenhum elemento com largura fixa; select ocupa `1fr` (≈ 160 px); nome do hotel e
  comodidades quebram linha; valores monetários `whitespace-nowrap`.

**Bottom-sheet de filtros (< `lg`):**
```
┌───────────────────────────────────┐  Dialog placement="sheet": colado embaixo, w-full,
│ Filtros                       [×] │  max-h-[90dvh], rounded-t-dialog, animate-slide-up
├───────────────────────────────────┤
│ Preço por noite                   │  mesmos fieldsets da sidebar (sem o h2 e sem o
│ …                                 │  "Limpar filtros" do topo), corpo rolável
│ Comodidades                       │
│ [x] Piscina                       │
├───────────────────────────────────┤  footer border-t, flex-row gap-3, px-5 pt-4
│ [Limpar filtros]  [ Ver 4 hotéis ]│  ghost flex-1 · primary flex-1
└───────────────────────────────────┘  pb-[max(1rem,env(safe-area-inset-bottom))]
```

**Modo `browse`** (destino sem datas válidas): igual ao `stay`, com resumo `Datas não definidas`,
painel "Alterar busca" **aberto** e, dentro dele, antes do formulário, `Alert info`. Cards sem total.

**Modo `missing-destination`**: wrapper `mx-auto flex max-w-4xl flex-col gap-8` (igual à home):
h1 + parágrafo + `SearchForm` vazio **com** buscas recentes. Sem toolbar, filtros nem lista.

**Ordem de leitura e foco** (= ordem visual):
SkipLink → logo → "Alterar busca" → [campos do painel, se aberto] → "Copiar link" → [Alert] →
(≥ lg) sidebar: "Limpar filtros" → Mínimo → Máximo → radios de nota (1 parada, setas) → tipos →
comodidades → h2 da contagem (só programático, `tabIndex=-1`) → (< lg) "Filtros (n)" → "Ordenar por"
→ link de cada card → paginação.

### Hierarquia

1. **Onde e quando**: h1 com o destino + resumo (datas, noites, hóspedes) — confirma que a busca é a
   certa antes de olhar preço.
2. **Quantos e em que ordem**: contagem + ordenação.
3. **Card**: nome → tipo/destino → nota → comodidades → **preço** (total em destaque com datas) →
   disponibilidade (badge colado ao preço: é onde a decisão acontece).
4. Filtros: sempre à mão (sidebar fixa na coluna, ou botão no topo da lista no celular).
5. Ações secundárias ("Copiar link", "Limpar filtros") em `ghost`. Primária única: nenhuma na lista
   (o card é o link); no sheet, "Ver N hotéis"; nos vazios, a ação do EmptyState.

### Componentes

| Uso | Componente | Observação |
|---|---|---|
| Resumo + ações | `Button secondary sm` (`rightIcon` `ChevronDownIcon`, `rotate-180` aberto) · `Button ghost sm` (`leftIcon` `LinkIcon`) | `SearchHeader` |
| Painel "Alterar busca" | `SearchForm` (F2) com `showRecentSearches={false}` e `labelledBy` | **prop nova no `SearchForm`** (Decisão de UX 4) |
| Avisos de modo | `Alert` `info` (browse) / `warning` (datas passadas, offline) | |
| Card | `HotelCard` com as classes de `Card interactive` (DS §5.2) | nasce na feature; extrair para `shared/ui` na F4 |
| Nota | `RatingScore` (DS §5.2) sobre `Stars decorative` + `formatRating` + `ratingLabel` | nasce na feature |
| Preço | `PriceTag` (DS §5.1) `nightly` / bloco `stay` do card | nasce na feature |
| Disponibilidade | `Badge` `danger` / `warning` | |
| Tipo/comodidades | texto + `CheckIcon` `size-4 text-success` `aria-hidden` | sem ícone por comodidade nesta feature |
| Skeleton | `Skeleton` `block`/`line` | `HotelCardSkeleton`, `ResultsSkeleton` |
| Filtros | `Range` (input nativo, DS §5.1), `Radio`, `Checkbox`, `fieldset`/`legend` | sem componente novo além do estilo do range |
| Ordenação | `Field` + `Select` | |
| Sheet | `Dialog placement="sheet"` + `footer` | **alteração em `shared/ui`** (Decisão 19) |
| Gatilho do sheet | `Button secondary md` `leftIcon` `FilterIcon`, `aria-haspopup="dialog"` | |
| Paginação | `Pagination` modo `getHref` | |
| Vazio / erro | `EmptyState` / `ErrorState` (`headingLevel={2}`) | erro de rota: `ErrorState variant="page" headingLevel={1}` |
| Feedback de cópia | `toast.success` / `toast.error` | |

### SearchHeader (resumo + "Alterar busca")

- Resumo `stay`: `formatDateRange(checkIn, checkOut, today)` + `pluralize(noites)` + `formatGuests`,
  separados por ` · ` → `12–15 dez · 3 noites · 2 adultos · 1 quarto`. O RSC calcula com
  `todayISO()` do servidor (o ano só aparece se a estadia não for no ano corrente; divergência de fuso
  na virada do ano é aceitável). Sem skeleton aqui.
- "Alterar busca": disclosure (`aria-expanded`, `aria-controls="search-edit-panel"`). Abrir não move
  o foco (padrão disclosure); o painel aparece logo abaixo, então o próximo Tab entra no formulário.
  Fechar: o mesmo botão (sem Esc: o Esc pertence ao combobox dentro do painel). Enviar navega (nova
  `key`) e o painel fecha; foco vai para o h1 (`tabIndex=-1`, `revealBelowHeader`).
- Painel: `div#search-edit-panel` com `h2.sr-only` "Alterar busca" (id usado em `labelledBy` do
  form). Fechado = não montado (estado do formulário não precisa sobreviver ao fechar).
- "Copiar link": copia `location.href`; toast. O botão não muda de texto (o toast é status
  `aria-live` e já anuncia).
- Datas passadas (`stay` + `isBeforeToday`): `Alert warning` abaixo da linha de ações, montado só no
  cliente após `useToday()` (entra antes da lista carregar, logo não empurra nada já visto em
  conexões normais; aceito).

### Card do hotel

- Estrutura DOM: `<li><article class="Card interactive">` → foto → `h3 > a` → meta → nota →
  comodidades → bloco de preço/disponibilidade. Um único link (`<a>` do nome) com
  `after:absolute after:inset-0`; nada focável além dele dentro do card.
- Foco: link `focus-visible:outline-none`; card `has-[a:focus-visible]:outline-2
  has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus`. Hover:
  `hover:shadow-raised` + nome `group-hover:underline`. `cursor-pointer` via o pseudo-elemento.
- Foto: `alt` = nome do hotel (critério 2). Esgotado: `grayscale opacity-70`. Quebrada: bloco
  `bg-surface-sunken` com `BedIcon size-8 text-fg-subtle` centralizado, mesmo tamanho.
- Meta: `{Tipo} · {destino}` (`text-sm text-fg-muted`).
- Comodidades: `<ul class="flex flex-wrap gap-x-3 gap-y-1 text-sm">`, até 3 itens com `CheckIcon`;
  as que estão no filtro vêm primeiro em `text-fg font-medium`, as outras `text-fg-muted`; o "+N" é
  `text-fg-subtle` com `+4<span class="sr-only"> comodidades</span>`. Sem comodidades: linha omitida.
- Bloco de preço (`border-t border-border pt-3 mt-auto flex flex-wrap items-end justify-between
  gap-x-3 gap-y-2`; preço `ml-auto text-right`):

| Situação | Esquerda | Direita |
|---|---|---|
| `stay` disponível | — | **R$ 540,00** (`text-xl font-bold`) / `total · 3 noites · 1 quarto` (`text-sm text-fg-muted`) / `a partir de R$ 180 por noite` (`text-sm text-fg-subtle`) |
| `stay` escassez (≤ 2) | Badge warning `Apenas 1 quarto!` | igual ao disponível |
| `stay` insuficiente | Badge warning `Só 2 quartos disponíveis` | `Sua busca pede 3 quartos.` (`text-sm text-fg-muted`) / `a partir de R$ 180 por noite` (sem total) |
| esgotado (`stay` ou `browse`) | Badge danger `Esgotado` | `Sem quartos disponíveis para estas datas.` (`browse`: `Sem quartos disponíveis no momento.`) / `a partir de R$ 180 por noite` em `text-fg-subtle` |
| `browse` | Badge (escassez) se houver | `a partir de` / **R$ 180** (`text-xl font-bold`, sem centavos se inteiro) / `por noite` |

  A diária nunca some (preço nunca escondido); o total some quando não pode ser reservado.
- Leitura por leitor de tela (ordem do DOM): "Pousada Vista Corcovado, link · Pousada · Rio de
  Janeiro, RJ · Nota 4,8 de 5, Excelente, 2.847 avaliações · Piscina, Spa, Wi-Fi, +4 comodidades ·
  Apenas 1 quarto! · R$ 540,00 total · 3 noites · 1 quarto · a partir de R$ 180 por noite".

### Estados da seção de resultados

A toolbar (h2 + linha de status + Filtros + Ordenar) fica montada em todos os estados (filtros e
ordenação operáveis durante erro). O h2 é o alvo de foco; o anunciador é **separado** (abaixo).

| View | h2 | Linha de status (`min-h-5`) | Área da lista |
|---|---|---|---|
| `loading` (1ª carga / nova busca / out-of-range) | `Skeleton` `h-7 w-48` + `sr-only` "Resultados" | `Spinner` + `Carregando hotéis…`; após 5 s `Está demorando mais que o normal…` | 4 × `HotelCardSkeleton`, contêiner `aria-busy="true"` |
| `results` | `14 hotéis encontrados` (+ `sr-only` `, página 2 de 2` se > 1 página) | `Mostrando 11–14 de 14` | lista + paginação |
| `results` + `stale` (placeholder) | contagem anterior | `Spinner` + `Atualizando resultados…` | lista anterior `opacity-60 transition-opacity`, `aria-busy="true"`, clicável |
| `empty-filters` | `Nenhum hotel encontrado` | vazia | EmptyState `Nenhum hotel com esses filtros` + `Limpar filtros` (primária) |
| `empty-destination` | `Nenhum hotel encontrado` | vazia | EmptyState `Nenhum hotel em Bonito, MS` + `Fazer nova busca` (`ButtonLink` primário para `/`) |
| `error` | `Resultados indisponíveis` | vazia | ErrorState `Não foi possível carregar os hotéis` / `Verifique sua conexão e tente de novo.` + `Tentar de novo` (`Tentando…`) |
| `offline` | `Resultados indisponíveis` | vazia | `Alert warning` (com ícone `WifiOffIcon`) `Você está sem internet.` / `Os hotéis aparecem assim que a conexão voltar.` |
| offline com dados **da mesma chave** | contagem | `Mostrando …` | `Alert warning` `Você está sem internet. Os resultados podem estar desatualizados.` acima da lista |
| fallback da error boundary | `Resultados indisponíveis` | vazia | mesmo ErrorState; "Tentar de novo" reseta boundary + query |

- Skeleton do card = mesma geometria: foto `Skeleton block aspect-[4/3]` (≥ sm `w-56`), nome
  `line h-7 w-3/4`, meta `line h-5 w-1/2`, nota `line h-6 w-2/3`, comodidades `line h-5 w-5/6`,
  `border-t` e, à direita, `line h-7 w-28` + `line h-5 w-40` + `line h-5 w-36`. Dentro do mesmo
  contêiner do card (`border`, `rounded-card`, `bg-surface`).
- `loading.tsx` da rota: h1 `line h-8 w-2/3`, resumo `line h-5 w-1/2`, dois botões `h-9 w-36`/`w-28`,
  sidebar ≥ lg com 4 blocos `h-24`, toolbar e 4 cards. (Raramente aparece: o RSC não espera API.)
- Troca de estado nunca mexe na toolbar (altura estável: h2 `min-h-7`, status `min-h-5`).

**Anunciador** (`<p class="sr-only" aria-live="polite">`, sempre montado em `HotelSearchResults`):
`Carregando hotéis…` → `Está demorando mais que o normal…` → `14 hotéis encontrados` /
`1 hotel encontrado` / `Nenhum hotel com esses filtros` / `Nenhum hotel em Bonito, MS`. Erro: nada
(o `ErrorState` é `role="alert"`). Durante `stale`: nada (só anuncia quando chega o dado novo; trocar
de página com a mesma contagem não reanuncia — o foco no h2 já lê). Com o sheet aberto, este
anunciador fica vazio e o sheet usa o seu (o conteúdo fora do `<dialog>` modal fica inerte).

### Interações

| Ação | Feedback imediato | Depois | Foco |
|---|---|---|---|
| Marcar checkbox / radio | controle muda; "Filtros (n)" e "Ver N" mudam | lista esmaece + "Atualizando…"; nova contagem anunciada | fica no controle |
| Arrastar/teclar no slider | resumo em texto e `aria-valuetext` na hora; o outro slider limita | URL e lista 400 ms após o último movimento | fica no slider |
| Mudar ordenação | select muda | igual ao filtro (página 1) | fica no select |
| "Limpar filtros" (sidebar/sheet) | controles voltam ao padrão; botão fica `aria-disabled` | lista atualiza | fica no botão |
| "Limpar filtros" (EmptyState) | EmptyState some | lista | h2 da contagem (`preventScroll` + `revealBelowHeader`) |
| Página (Anterior/número/Próxima) | navegação (link real) | lista nova; scroll ao topo da lista | h2 da contagem, sem ficar sob o header (`scroll-padding-top` já existe) |
| Hover ≥ 150 ms / foco no card | sombra `raised` + sublinhado | prefetch silencioso | — |
| "Filtros (n)" | sheet sobe (`slide-up`, 300 ms) | — | primeiro controle do sheet (slider Mínimo); ao fechar, volta ao gatilho |
| "Ver N hotéis" / × / Esc / backdrop | sheet fecha (sempre, mesmo carregando) | — | gatilho "Filtros (n)" |
| "Tentar de novo" | botão `Tentando…` (`aria-busy`) | lista ou erro de novo | continua no botão; se a lista chegar, h2 da contagem |
| "Copiar link" | toast `Link copiado.` | — | fica no botão |
| Tela cresce para ≥ lg com sheet aberto | sheet fecha | sidebar aparece com o mesmo estado (URL) | `body` (gatilho sumiu) — aceito |

- Sheet: backdrop fecha (`closeOnBackdrop`: filtros aplicam na hora, não há o que perder). Botão
  primário: `Ver 14 hotéis` / `Ver 1 hotel` / `Ver resultados` (0, erro, offline); durante o fetch,
  `leftIcon` `Spinner` + `Atualizando…`, **clicável** (não usar `loading`, que ignora o clique).
  Anunciador próprio `sr-only aria-live` dentro do corpo com o mesmo texto do anunciador principal.
- Slider: o polegar arrastado para no valor do outro (sem trocar de papel). `step` 50; teclado
  nativo (setas ±50, PageUp/PageDown ≈ 10% do intervalo, Home/End), sem `onKeyDown` próprio.
- Nunca mostrar toast para filtro aplicado (o feedback é a lista e o anúncio).

### Microcopy (final)

| Onde | Texto |
|---|---|
| `metadata.title` | `Hotéis em {destino} \| Infotera Hotéis` · sem destino `Buscar hotéis \| Infotera Hotéis` |
| h1 `stay`/`browse` | `Hotéis em {destino}` |
| Resumo `stay` | `12–15 dez · 3 noites · 2 adultos · 1 quarto` (crianças: `2 adultos, 1 criança · 1 quarto`) |
| Resumo `browse` | `Datas não definidas` |
| Botões do topo | `Alterar busca` · `Copiar link` |
| h2 `sr-only` do painel | `Alterar busca` |
| Alert `browse` | título `Escolha as datas da estadia` · texto `Com datas e hóspedes, mostramos o preço total e a disponibilidade de cada hotel.` |
| Alert datas passadas | título `As datas desta busca já passaram` · texto `Preços e disponibilidade podem ter mudado. Use "Alterar busca" para escolher novas datas.` |
| Toasts | `Link copiado.` · `Não foi possível copiar. Copie o endereço na barra do navegador.` |
| h1 sem destino / texto | `Para onde você vai?` · `Escolha um destino para ver hotéis, preços e disponibilidade.` |
| Contagem (h2 e anúncio) | `Nenhum hotel encontrado` · `1 hotel encontrado` · `14 hotéis encontrados` (+ `sr-only` `, página 2 de 2`) |
| Linha de status | `Mostrando 1–10 de 14` · `Carregando hotéis…` · `Está demorando mais que o normal…` · `Atualizando resultados…` |
| Sem resultados (h2) | `Resultados indisponíveis` (erro/offline) |
| Ordenar | label `Ordenar por` · `Mais populares` · `Menor preço` · `Maior avaliação` |
| Gatilho do sheet | `Filtros` · `Filtros (3)` |
| Título do sheet / sidebar | `Filtros` · fechar `Fechar filtros` |
| Rodapé do sheet | `Limpar filtros` · `Ver 14 hotéis` · `Ver 1 hotel` · `Ver resultados` · `Atualizando…` |
| Preço | legend `Preço por noite` · resumo `Qualquer preço` / `A partir de R$ 200` / `Até R$ 1.500` / `R$ 200 – R$ 1.500` · labels `Mínimo` / `Máximo` · `aria-valuetext` `R$ 200` / `R$ 3.000 ou mais` |
| Nota | legend `Nota mínima` · `Qualquer nota` · `4,5 ou mais` + `Excelente` · `4,0 ou mais` + `Muito bom` · `3,5 ou mais` + `Bom` (qualificador `text-fg-muted` dentro do label) |
| Tipo | legend `Tipo de hospedagem` · `Hotel` · `Pousada` · `Resort` |
| Comodidades | legend `Comodidades` · ordem de exibição: `Wi-Fi`, `Café da manhã`, `Piscina`, `Estacionamento`, `Acesso à praia`, `Restaurante`, `Bar`, `Academia`, `Spa`, `Serviço de quarto`, `Clube infantil`, `Concierge`, `Manobrista`, `Centro de negócios`, `Acesso ao lounge` |
| Card | meta `Pousada · Rio de Janeiro, RJ` · `+4` (`sr-only` ` comodidades`) · preço conforme tabela do card |
| Nota no card | visível `4,8` ★ `Excelente · 2.847 avaliações`; `sr-only` antes: `Nota `, depois de 4,8: ` de 5,` · `1 avaliação` · `Sem avaliações` (0) |
| Disponibilidade | `Esgotado` · `Apenas 1 quarto!` · `Apenas 2 quartos!` · `Só 2 quartos disponíveis` · `Sua busca pede 3 quartos.` · `Sem quartos disponíveis para estas datas.` · `Sem quartos disponíveis no momento.` |
| Vazio destino | `Nenhum hotel em Bonito, MS` · `Ainda não temos hospedagens neste destino. Tente uma cidade próxima.` · `Fazer nova busca` |
| Vazio filtros | `Nenhum hotel com esses filtros` · `Tente aumentar a faixa de preço ou remover alguma comodidade.` · `Limpar filtros` |
| Erro | `Não foi possível carregar os hotéis` · `Verifique sua conexão e tente de novo.` · `Tentar de novo` / `Tentando…` |
| Offline | `Você está sem internet.` · `Os hotéis aparecem assim que a conexão voltar.` / `Os resultados podem estar desatualizados.` |
| `error.tsx` da rota | h1 `Não foi possível abrir a busca` · `Tente de novo ou faça uma nova busca.` · `Tentar de novo` + `Fazer nova busca` (ghost, `/`) |
| Paginação | `nav` `Paginação` · `Anterior` · `Próxima` · `Página {n}` · `Página 1 de 2` |
| Lista | `section aria-labelledby` = h2 da contagem; `ul role="list"` sem label próprio |
| Sidebar | `aside aria-labelledby` = h2 `Filtros` |

### Acessibilidade (o que testar)

- Alvos ≥ 44 px: sliders (`h-11`), linhas de radio/checkbox (`min-h-11`), botões `sm` (área 44),
  link do card (card inteiro), itens da paginação.
- Hierarquia: h1 → h2 (`Alterar busca` sr-only, `Filtros`, contagem) → h3 (nomes dos hotéis). Um h1.
- `fieldset`/`legend` em preço, nota, tipo, comodidades; legend visível `text-base font-semibold`.
- Sliders: `<input type="range">` com `<label>` visível, `min`/`max`/`step`, `aria-valuetext`. Resumo
  em texto acima com `aria-hidden="true"` (os sliders já falam o valor; evita leitura dupla).
- Foco nunca atrás do header sticky: todo foco programático usa `preventScroll` + `revealBelowHeader`.
- Estrelas `aria-hidden`; nota sempre em texto. Esgotado: texto, não só cinza.
- Sheet: `<dialog>` modal, título `Filtros`, foco inicial no slider Mínimo, Esc, foco volta ao gatilho;
  axe com o sheet aberto.
- `prefers-reduced-motion`: slide-up do sheet, `opacity` da lista stale e `pulse` do skeleton zerados.
- 320 px e zoom 200%: sem scroll horizontal na toolbar (grid `auto/1fr`), cards, sheet e paginação.

### Ajustes aos critérios (UX)

- **Crit. 11**: as opções de nota são `Qualquer nota`, `4,5 ou mais`, `4,0 ou mais`, `3,5 ou mais`
  (o "+" lido como "mais" é ambíguo no leitor de tela).
- **Crit. 18 / 23**: "dados anteriores" = dados **da mesma chave** em cache. Se a troca de
  filtro/página falhar ou ficar offline, o placeholder sai e aparece o erro/offline (nunca a lista de
  outros filtros sob os controles novos). `deriveResultsView`: `isPlaceholderData` + erro → `error`;
  + `paused` → `offline`.
- **Crit. 19**: "Está demorando mais que o normal…" aparece na linha de status acima do skeleton (não
  abaixo: no celular, abaixo de 4 cards fica fora da tela).
- **Crit. 29**: rótulo do primário do sheet com 0 resultados/erro é `Ver resultados`; com fetch em
  andamento, `Atualizando…` (continua clicável).
- **Arquivos**: `SearchForm` ganha `showRecentSearches?: boolean`; teste da F2 cobre o `false`.
