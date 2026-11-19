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
