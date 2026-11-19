# F4 — hotel-details

## Objetivo

Entregar `/hotel/[hotelId]`: a página do hotel com galeria (lightbox por teclado), informações,
políticas, mapa, quartos com disponibilidade e capacidade, comparação de quartos, avaliações
paginadas e hotéis similares. O que é estático (hotel) sai do servidor; quartos, avaliações e
similares são buscados **em paralelo** e entram por streaming, cada um no seu `<Suspense>`. O
"Selecionar quarto" grava `{ hotelId, roomId, criteria }` no `booking-draft` e leva ao `/checkout`.
Toda regra (id da rota, preço "a partir de", seleção do quarto, comparação, mapa, política) é
função pura em `model/`.

## Escopo

**Básicos**
- `GET /hotels/:id` no servidor; id inválido ou 404 → `notFound()` (página "Hotel não encontrado").
- Galeria de fotos, informações (descrição, tipo, endereço, nota, comodidades, horários).
- Lista de quartos (`GET /rooms?hotelId=`) e "Selecionar quarto" → store global → `/checkout`.

**Avançados (todos os opcionais do enunciado para esta página)**
- Galeria interativa: lightbox (`Dialog size="full"`) com ←/→/Esc, foco preso e devolvido;
  thumbnails com lazy loading.
- Disponibilidade: "Apenas N quartos!" (1–2), quarto esgotado, hotel esgotado, quartos
  insuficientes para a busca, quarto pequeno para os hóspedes (`maxGuests`).
- Comparação de quartos: tabela de comodidades/atributos com destaque das diferenças e filtro
  "Mostrar só diferenças".
- Política de cancelamento expansível (`<details>`), breadcrumb, botão "Copiar link".
- Mapa de localização **estático** (tiles do OpenStreetMap montados no servidor, sem JS).
- Avaliações paginadas (`_limit=5`, mais recentes primeiro, total pelo `X-Total-Count`).
- Hotéis similares (mesmo destino, exclui o atual, até 4) — o ❓ do TEST_MAP vira ✅ (Decisão 11).
- Scroll to section: navegação por âncoras entre as seções.
- Performance: Server Component para o hotel, client só em ilhas de interação, fetch paralelo
  (hotel + quartos + avaliações), streaming com Suspense por seção.
- Sem critérios de busca (acesso direto): a página abre, mas pede as datas antes de selecionar.

**Fora (e por quê)**
- **Mapa interativo (Leaflet + OSM)**: o enunciado aceita estático aqui; o interativo é o item
  "Mapas interativos" da fase de extras. A matemática de tiles de `model/static-map.ts` é a mesma
  que o Leaflet usa; o componente fica isolado em `LocationMap` para ser trocado depois.
- **Scrollspy** (destacar a seção atual na barra de âncoras) e **barra de âncoras sticky**: um
  segundo elemento sticky exigiria mudar o `scroll-padding-top` global e somar com o header (lição
  da F2: foco atrás do header); o ganho é pequeno numa página com 7 seções.
- **Barra de ação fixa no mobile** (design system §4.5): sem preço total antes de escolher o quarto
  ela só repetiria "Ver quartos", que já está no topo e na barra de âncoras; e cobriria os toasts.
- **Galeria das fotos do quarto** (1–2 por quarto): o card mostra a primeira; lightbox é do hotel.
- **Swipe no lightbox**: botões de 44 px + teclado cobrem; gesto exigiria lib ou pointer events
  próprios sem teste E2E confiável.
- **Web Share API** (`navigator.share`): ver Decisão 13.
- **Página de avaliações na URL**: estado local (Decisão 9).
- **Ordenar/filtrar avaliações**, "útil" (`helpful`) clicável: a API não grava votos.
- **Status HTTP 404 real** para hotel inexistente: ver Decisão 2 (sai `200` + `noindex`).

## Decisões

1. **Hotel no servidor; quartos e avaliações prefetchados no servidor e lidos no cliente com as
   mesmas query options.** `HotelDetailsView` (RSC da feature) dispara, **antes de qualquer
   `await`**, `void queryClient.prefetchQuery(hotelRoomsQueryOptions(id))` e
   `void queryClient.prefetchQuery(reviewsQueryOptions(id, 1))`, e só então
   `await queryClient.fetchQuery(hotelQueryOptions(id))` (via `loadHotel`, Decisão 3). Os três
   requests saem juntos (sem waterfall). O hotel renderiza componentes de servidor (cabeçalho,
   galeria, informações, políticas, mapa, breadcrumb). O resto vai num
   `<HydrationBoundary state={dehydrate(queryClient)}>`: o `makeQueryClient` da F1 já desidrata
   queries `pending`, então a promessa dos quartos/avaliações é transmitida e as ilhas cliente
   (`RoomsSection`, `ReviewsSection`, `FromPrice`) usam `useSuspenseQuery` com as **mesmas chaves**
   da F3 (`hotelRoomsQueryOptions` de `shared`). Efeitos:
   - Com o prefetch da F3 (hover no card), o cache do cliente já tem os quartos: o `hydrate` não
     sobrescreve dado mais novo e a seção aparece na hora.
   - O hotel também é desidratado (sucesso): a F5 lê `hotelQueryOptions(id)` do cache sem request.
   - Os quartos são renderizados no SSR (HTML com conteúdo, não só skeleton) assim que a promessa
     resolve, porque `useSuspenseQuery` suspende no SSR do client component.
   Descartados: (a) tudo no cliente (`useQuery`): perde Server Component, `notFound()` e metadata
   com o nome do hotel; (b) quartos/avaliações buscados só no cliente: waterfall (o JS precisa
   carregar para começar) e o prefetch no servidor fica sem uso; (c) `Promise.all` com os três
   aguardados no RSC: o hotel esperaria a seção mais lenta e uma falha em avaliações derrubaria a
   página; (d) quartos como RSC puro: o "Selecionar" e a comparação são interativos e o prefetch da
   F3 (cache do cliente) seria desperdiçado.

2. **`loading.tsx` (skeleton da página) e 404 "suave".** O cold start da API no Render (dezenas de
   segundos) prende o `await` do hotel no servidor até o timeout de 10 s do `http.ts`. Sem
   `loading.tsx`, o clique no card da F3 não teria nenhum retorno visual nesse tempo. Com ele, o
   skeleton aparece na hora (e o `<Link>` prefetcha a fronteira de loading), mas o streaming começa
   antes do `notFound()`: a resposta de hotel inexistente sai com status `200` e
   `<meta name="robots" content="noindex">` (doc Next 16, "Streaming › Status codes"), com a UI
   de "Hotel não encontrado". Ids com formato inválido (`/hotel/abc`) também. Descartados: sem
   `loading.tsx` (404 real, mas tela parada no cold start); checar existência no Proxy (a doc
   desaconselha fetch no Proxy e isso dobraria o request). Registrar no README. O Proxy da F5
   (nonce da CSP) pode, se quiser, devolver 404 real para id fora do formato (sem fetch).

3. **`loadHotel(id)` deduplicado por request.** `getServerQueryClient()` (React `cache`) +
   `fetchQuery(hotelQueryOptions(id))`: `generateMetadata` e a página fazem **um** request. 404 →
   `notFound()` (na página) ou título "Hotel não encontrado | Infotera Hotéis" (no metadata). Outros
   erros: a página relança (cai no `error.tsx` da rota, com retry); o metadata devolve o título
   padrão "Hotel | Infotera Hotéis" (metadata nunca derruba a página).

4. **Id da rota por função pura `parseHotelId(raw)`**: só `^[1-9]\d{0,8}$` vira número; o resto
   (`abc`, `0`, `01`, `1.5`, `-1`, `1e3`, vazio) → `null` → `notFound()` **sem chamar a API**
   (verificado: a mock-api responde 404 para todos esses, mas não vale o request).

5. **Critérios vêm da URL, lidos no servidor.** `parseSearchCriteria(await searchParams)`; válido →
   `criteria`, senão `null`. A F3 repete os critérios no link do card (modo `stay`). Os critérios
   passam por props para as ilhas cliente. Check-in no passado não está no schema (F1): o cliente
   compara com `useToday()` e mostra `Alert warning` (a seleção continua possível; a F5 bloqueia).

6. **Sem critérios: a página abre e pede as datas no lugar.** `HotelStayBar` no topo de "Quartos":
   com critérios, resumo `12–15 dez · 3 noites · 2 adultos · 1 quarto` + disclosure "Alterar
   datas"; sem critérios, `Alert info` "Escolha as datas para reservar" e o painel **aberto**. O
   painel é o `SearchForm` da F2, composto em `app/` (slot `datesForm`), com duas props novas:
   `fixedDestination` (destino vira texto, sem combobox) e `getSubmitHref(criteria)` (envio vai
   para `/hotel/{id}?<critérios>` em vez de `/search`). Os quartos continuam visíveis com preço por
   noite; o botão de cada quarto vira "Escolher datas" e leva o foco ao primeiro campo de data
   (`preventScroll` + `revealBelowHeader`). Uma única fonte das regras de datas/hóspedes (F1/F2).
   Descartados: duplicar `DateRangeFields`/`GuestsPicker` na F4 (regra quebrada: feature não importa
   feature; copiar seria pior); promover os dois para `shared` agora (refactor grande da F2 para um
   segundo uso que cabe em duas props); desabilitar o botão sem explicar.

7. **Seleção do quarto por função pura `roomSelectability(room, criteria)`** (union discriminada,
   `switch` exaustivo no componente). Precedência:
   `sold-out` (available 0) → `needs-dates` (sem critérios) → `past-dates` (check-in anterior a hoje,
   em `America/Sao_Paulo`; `roomSelectability(room, criteria, pastDates)`) → `too-small`
   (`guestsPerRoom(criteria) > room.maxGuests`, de `shared/lib/search-params`) → `insufficient`
   (`available < criteria.rooms`) → `selectable { scarce: N | null }` (`scarce` quando ≤ 2).
   Botão: `selectable` → "Selecionar quarto" (primário); `needs-dates` → "Escolher datas"
   (secundário; `past-dates` também: abre o painel "Alterar datas e hóspedes" se estiver fechado e foca o
   Check-in); `sold-out`/`too-small`/`insufficient` → botão com `aria-disabled` e o motivo em
   texto ligado por `aria-describedby` (nunca `disabled`: mantém o foco e o leitor lê o motivo; o
   texto do motivo fica sempre montado, nada se move). Hotel com `availableRooms === 0` (19, 48) →
   `Alert warning` no topo de "Quartos" com link para `#similares`.

8. **"A partir de" calculado pelos quartos** (`lowestNightlyPrice(rooms)`): menor `pricePerNight`
   entre quartos com `available > 0`; se todos esgotados, o menor de todos com `soldOut: true`;
   sem quartos, `null`. Hotel 1 → R$ 800 (o hotel diz 1.200); hotel 4 → R$ 720 (diz 890). Mostrado
   no cabeçalho por uma ilha `FromPrice` (Suspense próprio, mesmo cache dos quartos). Descartado:
   `hotel.pricePerNight` (diverge; a F3 fica com ele por coerência com o filtro, F3 Decisão 9).
   Total da estadia no card do quarto: `stayTotal` (promovido da F3) = diária × noites × quartos.

9. **Avaliações: `useSuspenseQuery` + `startTransition` na troca de página.** Página em estado
   local (não na URL: não é o conteúdo principal e Voltar não deve folhear avaliações). Trocar de
   página dentro de `startTransition` mantém a página atual visível enquanto a próxima carrega
   (`isPending` → lista `aria-busy` + "Atualizando avaliações…"). A paginação continua marcando a
   página antiga até o dado novo chegar, então **nunca há dado de uma página sob o controle de
   outra** (lição da F3). Erro na troca → fallback da seção; offline → `Alert` "Você está sem
   internet…" acima da lista atual (a query fica pausada e retoma sozinha). Chegando a nova página,
   o foco vai para o h2 da seção (`preventScroll` + `revealBelowHeader`). Ordenação
   `_sort=date,id&_order=desc,desc` (desempate: o hotel 20 tem datas repetidas). Descartado:
   `useQuery` + `placeholderData` (sem streaming no SSR; duas formas de loading na mesma seção).

10. **Contagens diferentes, nomes diferentes.** `hotel.reviewCount` (ex.: 2.847 no hotel 1) é a
    nota agregada; a API só tem 3 avaliações publicadas para ele. O cabeçalho mostra `RatingScore`
    com "2.847 avaliações"; a seção mostra "Comentários de hóspedes" e "3 comentários" (do
    `X-Total-Count`). Sem comentários (hotéis 6, 8, 43, 51, 54) → `EmptyState` "Ainda sem
    avaliações" do design system, com o texto ajustado para "comentários".

11. **Hotéis similares: RSC assíncrono com Suspense, sem JS.** `GET /hotels?destination=<exato>&
    id_ne=<id>&_sort=rating,reviewCount&_order=desc,desc&_limit=4` (verificado: Rio sem o 1 →
    17, 7, 2, 9; Jericoacoara sem o 59 → 60). Depende do destino, então começa depois do hotel
    (dependência real, abaixo da dobra). É conteúdo de recomendação: falha **não** derruba a página
    nem pede retry; o componente captura o erro, faz `console.error` estruturado e mostra "Não foi
    possível carregar hotéis parecidos." + link "Ver hotéis em {destino}". Vazio (não ocorre no seed
    atual, mas é possível) → a seção continua (a barra de âncoras já aponta para ela) com o texto
    "Nenhum outro hotel em {destino}." Cards compactos com
    link que **repete os critérios** (`hotelHref(id, criteria)`). Descartado: query no cliente
    (mais JS para conteúdo estático) e "sem tratar erro" (a rota inteira cairia no `error.tsx`).

12. **Mapa estático por tiles do OpenStreetMap, montado por função pura.**
    `staticMapLayout({ lat, lon, zoom: 15, width: 640, height: 320 })` → lista de tiles
    (`{ z, x, y, leftPct, topPct, sizePct }`) e posição do marcador em `%` (projeção Web Mercator,
    a mesma do Leaflet). O RSC renderiza os tiles com `next/image` `unoptimized` (sem passar pelo
    otimizador do Next, sem chave de API), marcador `MapPinIcon` por cima, atribuição obrigatória
    "© colaboradores do OpenStreetMap" com link, e "Abrir no OpenStreetMap" (`mlat/mlon`, nova aba,
    `rel="noopener noreferrer"`). O contêiner tem `role="img"` e `aria-label` "Mapa: {endereço}";
    tiles com `alt=""`. Descartados: Leaflet agora (JS + CSS de terceiros para um "pode ser
    estático"; fica para extras); iframe do OSM embed (sem controle de foco/teclado, mais pesado,
    e `frame-src` na CSP); serviços de static map com chave. **CSP (F5)**: `img-src` precisa de
    `tile.openstreetmap.org`.

13. **Compartilhar = copiar link** (`useCopyLink` promovido da F3; copia `location.href`, que inclui
    os critérios). Descartado: `navigator.share` (comportamento diferente por SO, desktop sem
    suporte uniforme, impossível de testar no E2E; o enunciado pede "copiar link").

14. **Comparação de quartos por função pura `buildRoomComparison(rooms)`** → `{ rooms, rows }`, cada
    linha `{ key, label, cells, differs }`. Linhas: Preço por noite, Tamanho, Hóspedes, Camas,
    Disponibilidade e uma linha por comodidade de quarto presente em **algum** quarto (ordem fixa de
    `roomAmenitySchema.options`). `differs` = nem todas as células iguais. Só aparece com ≥ 2
    quartos (hotel 2 tem 1). Tabela semântica (`<table>`, `<caption>`, `th scope`), diferenças com
    marcação **visual e textual** (ícone + `sr-only` "diferente entre os quartos"), checkbox
    "Mostrar só diferenças" (cliente). No mobile, a tabela rola **dentro** de uma região
    `role="region"` focável com rótulo (exceção de reflow para tabelas de dados), 1ª coluna fixa;
    a página não ganha scroll horizontal. Fica dentro da seção "Quartos" (subseção
    `#comparar-quartos`, h3). Descartado: comparar selecionando quartos (até 4 quartos por hotel:
    comparar todos é mais simples e mostra tudo).

15. **Scroll to section com âncoras nativas.** `SectionNav` (RSC, `nav aria-label="Seções da
    página"`) com links `#visao-geral`, `#quartos`, `#localizacao`, `#politicas`, `#avaliacoes`,
    `#similares`. Os `<section id>` ficam **fora** dos Suspense (sempre existem no HTML), então
    `/hotel/1#avaliacoes` funciona no primeiro carregamento. O `scroll-padding-top` global (F2) já
    evita que o alvo fique sob o header; `scroll-behavior: smooth` só sem
    `prefers-reduced-motion` (já existe a regra global de reduzir). Sem JS. O CTA "Ver quartos" do
    cabeçalho também é âncora.

16. **Lightbox: `Dialog size="full"` (novo em `shared`)** com estado puro
    `galleryNavigation(index, total, action)` (`next`/`prev` com volta ao início/fim, `first`,
    `last`). ←/→ (e Home/End) no `<dialog>`; Esc e foco preso são nativos; ao fechar, o foco volta
    ao botão da foto que abriu (o `Dialog` já guarda o elemento ativo). Contador "Foto 2 de 5" em
    `aria-live="polite"`. Pré-carrega a anterior e a próxima. Galeria na página: foto principal +
    até 4 thumbnails (`loading="lazy"`, exceto a principal com `priority`) e "Ver todas as fotos
    (5)". Cada foto é um `<button>` com `aria-label` "Abrir foto 2 de 5". Descartado:
    Parallel/Intercepting Routes para o modal (URL por foto não agrega aqui; fica nos extras).

17. **Retry das seções sem mexer no layout.** `ErrorBoundary` (shared) dentro de
    `QueryErrorResetBoundary` por seção (quartos, avaliações). O fallback é `ErrorState inline` com
    "Tentar de novo": o clique chama `useSectionRetry(queryKey)` → botão em loading "Tentando…"
    **na hora**, `queryClient.refetchQueries` e, se a query ficou `success`, `reset()` da boundary
    (o conteúdo entra no lugar); se falhar de novo, o botão volta e o foco continua nele. Assim o
    botão não some sob o clique para dar lugar a um skeleton. Retries automáticos do cliente seguem a
    F1 (2 tentativas, 1 s e 2 s); no servidor não há retry (F1), então uma falha no SSR aparece no
    cliente como erro da seção com o botão. Skeleton com mais de 5 s mostra "Está demorando mais que
    o normal…" (`useSlowLoading`, promovido da F3) — cobre o cold start.

18. **Promoções para `shared/` (segundo uso).** Da F3: `RatingScore` e `PriceTag`
    (`shared/ui/molecules`), `RemoteImage` (era `HotelImage`: `next/image` + loader + blur +
    fallback com `BedIcon`; `shared/ui/atoms`), `unsplashLoader`/`BLUR_DATA_URL`
    (`shared/lib/image.ts`), `stayTotal` (`shared/lib/pricing.ts`), `availabilityStatus`
    (`shared/lib/availability.ts`), `amenityLabel`/`propertyTypeLabel` (`shared/lib/labels.ts`;
    `sortLabel` fica na F3), `cardClassName` (`shared/ui/molecules/card-styles.ts`),
    `useCopyLink`, `useSlowLoading` (`shared/hooks`), `hotelHref` (`shared/lib/links.ts`). Da F2:
    `useOnline` (`shared/hooks`). Novo em `shared`: `Dialog size="full"`. Ficam na F4 (primeiro
    uso): `Breadcrumb` (componente genérico, sobe quando a F5/F6 usar), rótulos de comodidades de
    quarto e de camas, `galleryNavigation`, `staticMapLayout`, `cancellationDetails`.
    **Pré-requisito**: a F3 está mergeada na base da F4; se nomes divergirem da spec da F3, a tarefa
    de promoção usa os nomes reais.

19. **Política de cancelamento**: `cancellationDetails(policy)` (`switch` exaustivo) → `{ label,
    tone, details[] }`. Rótulos do design system §6.8 (`Cancelamento grátis` badge success etc.).
    A API só informa a categoria: os detalhes são **texto ilustrativo do produto** (prazos fixos por
    categoria, ex.: grátis até 48 h antes do check-in), centralizados numa função para trocar
    depois; documentar no README. `<details>/<summary>` nativo (RSC, sem JS). Horários de
    check-in/check-out ficam na mesma seção "Políticas".

20. **Selecionar navega com feedback e sem clique duplo.** `useSelectRoom(hotelId, criteria)`:
    `selectRoom({ hotelId, roomId, criteria })` + `startTransition(() => router.push("/checkout"))`;
    o botão clicado fica em loading "Selecionando…" (`aria-busy`, mantém o foco) até a navegação.
    Seleção anterior é sobrescrita (um quarto por reserva, como no store da F1).

## Contrato de dados

| Uso | Endpoint (verificado na mock-api) | Schema | Query key / options | Onde |
|---|---|---|---|---|
| Hotel | `GET /hotels/:id` (404 se não existe) | `hotelSchema` | `hotelQueryOptions(id)` (shared) | servidor: `loadHotel` |
| Quartos | `GET /rooms?hotelId=:id` (id inexistente → `[]`) | `z.array(roomSchema)` | `hotelRoomsQueryOptions(id)` (shared) | prefetch servidor + `useSuspenseQuery` |
| Avaliações | `GET /reviews?hotelId=:id&_sort=date,id&_order=desc,desc&_page=N&_limit=5` | `apiGetPage(…, reviewSchema)` → `{ items, total }` | `queryKeys.reviews.byHotel(id, page)` · `reviewsQueryOptions(id, page)` | `features/hotel-details/api/reviews.ts` |
| Similares | `GET /hotels?destination=…&id_ne=:id&_sort=rating,reviewCount&_order=desc,desc&_limit=4` | `z.array(hotelSchema)` | — (RSC, sem cache do cliente) | `features/hotel-details/api/similar.ts` |
| Tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | — | — | `LocationMap` (RSC) |

Verificado (porta temporária, seed atual): `/hotels/abc|0|01|1.5|999` → 404; reviews do hotel 45
(Gramado Mountain Resort) → `X-Total-Count: 14`, página 3 com 4; hotel 6 → `X-Total-Count: 0`;
`?_fail=1` → 500. Dados de teste do seed:

| Hotel | Uso nos testes |
|---|---|
| 1 Copacabana Palace (Rio, `free`, 5 fotos) | quartos 1 (Suíte, 3 hósp., R$ 1.200, 8 disp.) e 2 (Standard, 2 hósp., R$ 800, 4); "a partir de R$ 800"; 3 comentários |
| 4 | "a partir de R$ 720" (hotel diz 890) |
| 2 Villa Rossa | 1 quarto → sem comparação |
| 7 | 1 quarto com `available: 1` → "Apenas 1 quarto!" |
| 18 | 4 quartos → comparação completa; 12 comentários (3 páginas) |
| 19 / 48 | hotel esgotado (todos `available: 0`) |
| 45 | 14 comentários → 3 páginas (5, 5, 4) |
| 6 | `reviewCount` 456 e 0 comentários → vazio |
| 59 (Jericoacoara) | 1 similar (60) |
| quarto 11 (hotel 8) | `maxGuests: 1` |

**Tipos de `model/`:**
```ts
type RoomSelectability =
  | { kind: "sold-out" }
  | { kind: "needs-dates" }
  | { kind: "too-small"; maxGuests: number; guestsPerRoom: number }
  | { kind: "insufficient"; available: number; requested: number }
  | { kind: "selectable"; scarce: number | null };
type FromPrice = { price: number; soldOut: boolean } | null;
type ComparisonRow = { key: string; label: string; cells: string[]; differs: boolean };
type GalleryAction = "next" | "prev" | "first" | "last";
type MapTile = { z: number; x: number; y: number; leftPct: number; topPct: number; sizePct: { w: number; h: number } };
type StaticMap = { tiles: MapTile[]; marker: { leftPct: number; topPct: number } };
type CancellationDetails = { label: string; tone: "success" | "neutral" | "warning"; details: string[] };
```

Links: breadcrumb "Hotéis em {destino}" → `/search?<critérios>` com critérios, senão
`/search?destination=<destino>` (modo `browse` da F3). Similares → `hotelHref(id, criteria)`.
`SearchForm` (F2) no painel de datas: `fixedDestination={hotel.destination}`,
`initialCriteria={criteria ?? { destination }}`, `getSubmitHref={(c) => hotelHref(id, c)}`.

## Critérios de aceite

Rota, metadata e estados da página
1. Dado `/hotel/1?<critérios válidos>`, então o h1 é "Hotel Copacabana Palace", `metadata.title` é "Hotel Copacabana Palace | Infotera Hotéis", há um único h1 e nenhum `<main>` na página.
2. Dado `/hotel/999` ou `/hotel/abc`, então aparece "Hotel não encontrado" (h1) com "Fazer nova busca" (link para `/`), o HTML tem `meta name="robots"` com `noindex` e o título é "Hotel não encontrado | Infotera Hotéis"; `/hotel/abc` não chama a API.
3. Ao navegar de `/search` para o hotel, o skeleton da página aparece imediatamente (antes de o hotel responder).
4. Se o hotel falhar (500/timeout), aparece `ErrorState variant="page"` "Não foi possível abrir o hotel" com "Tentar de novo" (recarrega a rota) e "Fazer nova busca"; sem texto da API.
5. Na carga, `GET /hotels/1`, `GET /rooms?hotelId=1` e `GET /reviews?hotelId=1&…&_page=1` começam juntos no servidor (nenhum espera outro); vindo da F3 com prefetch, a seção de quartos aparece sem novo request no navegador.

Cabeçalho, breadcrumb, galeria
6. O breadcrumb (`nav` "Você está aqui") mostra Início › Hotéis em Rio de Janeiro, RJ › Hotel Copacabana Palace (último com `aria-current="page"`); o link do meio leva a `/search?<mesmos critérios>`; sem critérios, a `/search?destination=Rio de Janeiro, RJ`. Abaixo de `sm`, só "← Hotéis em Rio de Janeiro, RJ".
7. O cabeçalho mostra tipo, destino, endereço, `RatingScore` ("4,8", "Excelente", "2.847 avaliações"), "a partir de R$ 800 por noite" (calculado pelos quartos; hotel 4 → R$ 720), "Ver quartos" (âncora) e "Copiar link".
8. "Copiar link" copia a URL atual (com critérios) e mostra o toast "Link copiado."; falha → "Não foi possível copiar. Copie o endereço na barra do navegador."
9. A galeria mostra a foto principal e até 4 thumbnails (`loading="lazy"`), cada uma um botão "Abrir foto N de 5"; "Ver todas as fotos (5)" abre o lightbox na foto 1.
10. No lightbox (`dialog` modal com título): → e ← trocam a foto (da 5 para a 1 e vice-versa), Home/End vão às pontas, o contador "Foto 2 de 5" é anunciado, Tab fica preso dentro, Esc ou "Fechar" fecham e o foco volta ao botão que abriu; `alt` "Hotel Copacabana Palace, foto 2 de 5".
11. A barra "Seções da página" tem âncoras para Visão geral, Quartos, Localização, Políticas, Avaliações e Similares; ativar uma leva à seção com o título visível abaixo do header fixo; `/hotel/1#avaliacoes` abre já na seção.

Informações, políticas e mapa
12. "Visão geral" mostra descrição e comodidades do hotel (rótulos pt-BR, ícones decorativos `aria-hidden`).
13. "Políticas" mostra "Check-in a partir de 15:00", "Check-out até 12:00" e a política (`free` → badge "Cancelamento grátis"); o `<summary>` "Ver regras de cancelamento" expande os detalhes por teclado (Enter/Espaço), sem JS.
14. "Localização" mostra o endereço, o mapa estático com o marcador no ponto do hotel (`role="img"`, `aria-label` com o endereço), a atribuição "© colaboradores do OpenStreetMap" e "Abrir no OpenStreetMap" (nova aba, avisado no nome acessível).

Quartos e seleção
15. Com critérios (1 quarto, 2 adultos, 3 noites), cada quarto mostra foto, nome, tamanho ("45 m²"), hóspedes ("Até 3 hóspedes"), camas ("1 cama king"), até 4 comodidades + "+N", diária e total ("R$ 2.400,00" "total · 3 noites · 1 quarto" para R$ 800).
16. "Selecionar quarto" (nome acessível inclui o nome do quarto) grava em `sessionStorage` `infotera:booking-draft` `{ hotelId: 1, roomId: 1, criteria }` e navega para `/checkout`; durante a navegação o botão mostra "Selecionando…" e um segundo clique é ignorado.
17. Quarto com `available: 1` (hotel 7) mostra "Apenas 1 quarto!" e continua selecionável.
18. Hotel 19: `Alert` "Este hotel está esgotado nestas datas" com link para "Ver hotéis similares" (`#similares`); todos os quartos mostram badge e botão "Esgotado" com `aria-disabled` e motivo lido pelo leitor; nenhum total; "a partir de" com a menor diária e "Esgotado".
19. Busca com 3 adultos e 1 quarto (hotel 1): o "Quarto Standard" (máx. 2) mostra "Acomoda até 2 hóspedes. Sua busca tem 3 por quarto." e o botão não seleciona (`aria-disabled`, foco permanece); a Suíte (3) seleciona.
20. Busca com 3 quartos num quarto com 2 disponíveis: "Só 2 disponíveis. Sua busca pede 3 quartos." e não seleciona.
21. Sem critérios (`/hotel/1`): `Alert` "Escolha as datas para reservar" e o formulário de datas aberto com o destino fixo em texto; quartos com diária e sem total; o botão do quarto é "Escolher datas" e leva o foco ao campo de check-in sem ficar sob o header; enviar o formulário navega para `/hotel/1?<critérios>` e os quartos passam a mostrar total e "Selecionar quarto".
22. Com critérios, o resumo "12–15 dez · 3 noites · 2 adultos · 1 quarto" e "Alterar datas" (disclosure, `aria-expanded`) abrem o mesmo formulário preenchido; com check-in no passado aparece o aviso "As datas desta busca já passaram".
23. Enquanto os quartos carregam: skeleton com a geometria do card, `aria-busy`, "Carregando quartos…" em `aria-live`; após 5 s, "Está demorando mais que o normal…".
24. Se os quartos falharem: `ErrorState inline` "Não foi possível carregar os quartos." com "Tentar de novo"; o clique mostra "Tentando…" no próprio botão (que não some) e, com a API de volta, os quartos entram no lugar; o resto da página continua funcionando.

Comparação
25. Hotel 18 (4 quartos): tabela com `caption` "Comparar quartos", uma coluna por quarto (`th scope="col"`), linhas Preço por noite, Tamanho, Hóspedes, Camas, Disponibilidade e comodidades (Sim/Não com ícone e texto); linhas com valores diferentes destacadas visualmente e com texto `sr-only` "diferente entre os quartos".
26. "Mostrar só diferenças" (checkbox) esconde as linhas iguais; desmarcar volta todas; o foco fica no checkbox.
27. Hotel 2 (1 quarto): não há comparação. Em 320 px a tabela rola só dentro da sua região rotulada (focável por teclado), a página não tem scroll horizontal e a 1ª coluna fica fixa.

Avaliações
28. Hotel 45: "Comentários de hóspedes", "14 comentários", 5 itens do mais recente para o mais antigo (nome, avatar decorativo, nota inteira em texto "Nota 5 de 5", título, comentário, data "13/07/2025", "Hóspede verificado" quando `verified`), paginação em botões "Página 1 de 3".
29. Trocar para a página 2 mantém a página 1 visível com `aria-busy` e "Atualizando avaliações…" até a 2 chegar; a paginação só marca a 2 quando ela chega; o foco vai para o h2 da seção sem ficar sob o header. A página 3 tem 4 itens.
30. Hotel 6: `EmptyState` "Ainda sem comentários" / "Este hotel ainda não recebeu comentários de hóspedes."; o `RatingScore` do cabeçalho continua com "456 avaliações".
31. Falha ao trocar de página: `ErrorState inline` "Não foi possível carregar as avaliações." com retry (mesmo comportamento do critério 24); offline na troca: `Alert warning` "Você está sem internet. As avaliações aparecem assim que a conexão voltar." acima da página atual.

Similares
32. Hotel 1 (Rio): "Hotéis parecidos em Rio de Janeiro, RJ" com 4 cards (17, 7, 2, 9 — maior nota primeiro), sem o hotel 1; cada card com foto, nome (único link, com os critérios da busca), tipo, `RatingScore`, diária e badge de disponibilidade.
33. Hotel 59: 1 card (60). Falha da API de similares: texto "Não foi possível carregar hotéis parecidos." + "Ver hotéis em {destino}"; o resto da página intacto.

Mobile e acessibilidade
34. Em 320 px e zoom 200% não há scroll horizontal na página (galeria, cabeçalho, quartos, avaliações, mapa, breadcrumb).
35. axe (wcag2a/aa) sem violações: página com critérios, sem critérios, lightbox aberto, comparação, vazio de avaliações, erro de seção, "Hotel não encontrado".
36. Tudo por teclado com foco visível; ordem de foco = ordem visual; hierarquia h1 → h2 (seções) → h3 (quartos, comparação, avaliações, similares); estrelas `aria-hidden` com nota em texto; esgotado/diferenças nunca só por cor.

## Arquivos

| Caminho | Responsabilidade |
|---|---|
| `src/shared/ui/molecules/RatingScore.tsx` · `PriceTag.tsx` (+ tests, movidos da F3) | moléculas do design system |
| `src/shared/ui/atoms/RemoteImage.tsx` (+ test, era `HotelImage` da F3) | `next/image` + loader Unsplash + blur + fallback `BedIcon` |
| `src/shared/ui/molecules/card-styles.ts` | `cardClassName({ variant: "static" \| "interactive" \| "selected" })` |
| `src/shared/lib/image.ts` · `pricing.ts` · `availability.ts` · `labels.ts` · `links.ts` (+ tests, movidos da F3) | `unsplashLoader`/`BLUR_DATA_URL` · `stayTotal` · `availabilityStatus` · `amenityLabel`/`propertyTypeLabel` · `hotelHref` |
| `src/shared/hooks/useCopyLink.ts` · `useSlowLoading.ts` (F3) · `useOnline.ts` (F2) (+ tests) | hooks promovidos |
| `src/shared/ui/molecules/Dialog.tsx` (alt.) | `size="full"`: tela cheia, fundo escuro, sem `max-h`, header com contador |
| `src/shared/ui/index.ts` · `src/shared/CLAUDE.md` (alt.) | exports e pendentes atualizados |
| `src/features/hotel-search/**` · `src/features/search-form/**` (alt.) | imports dos promovidos |
| `src/features/search-form/components/SearchForm.tsx` · `hooks/useSearchForm.ts` (alt.) | `fixedDestination?: string`, `getSubmitHref?: (c) => string` |
| `src/features/hotel-details/model/hotel-id.ts` | `parseHotelId` |
| `.../model/from-price.ts` | `lowestNightlyPrice` |
| `.../model/room-selectability.ts` | `roomSelectability`, `selectabilityMessage` |
| `.../model/room-labels.ts` | `roomAmenityLabel`, `bedsLabel`, `roomCapacityLabel` (switch exaustivo) |
| `.../model/room-comparison.ts` | `buildRoomComparison`, `onlyDifferences` |
| `.../model/gallery.ts` | `galleryNavigation`, `photoAlt`, `GALLERY_PREVIEW_COUNT` |
| `.../model/static-map.ts` | `staticMapLayout`, `osmLink` |
| `.../model/cancellation.ts` | `cancellationDetails` |
| `.../model/breadcrumb.ts` | `hotelBreadcrumb(hotel, criteria)` → itens e link de voltar |
| `.../model/sections.ts` | `HOTEL_SECTIONS` (id + rótulo, ordem da página) |
| `.../model/metadata.ts` | `hotelPageTitle` |
| `.../api/hotel.server.ts` | `loadHotel(id)` (server query client, 404 → `{ kind: "not-found" }`) |
| `.../api/reviews.ts` | `fetchReviewsPage`, `reviewsQueryOptions`, `REVIEWS_PAGE_SIZE` |
| `.../api/similar.ts` | `fetchSimilarHotels(destination, excludeId)` |
| `.../hooks/useSelectRoom.ts` | grava no store + `router.push` em transition |
| `.../hooks/useSectionRetry.ts` | refetch com loading e `reset` só no sucesso |
| `.../hooks/useReviewsPage.ts` | página local + `startTransition` + foco no h2 |
| `.../hooks/useLightbox.ts` | aberto/índice/teclado sobre `galleryNavigation` |
| `.../components/HotelDetailsView.tsx` | RSC: prefetch paralelo, `loadHotel`, `HydrationBoundary`, composição das seções |
| `.../components/HotelHeader.tsx` · `FromPrice.tsx` ("use client") · `ShareButton.tsx` ("use client") | cabeçalho |
| `.../components/Breadcrumb.tsx` · `SectionNav.tsx` | RSC |
| `.../components/Gallery.tsx` ("use client") · `Lightbox.tsx` ("use client") | galeria e lightbox |
| `.../components/HotelOverview.tsx` · `HotelPolicies.tsx` · `LocationMap.tsx` | RSC |
| `.../components/RoomsSection.tsx` ("use client") · `HotelStayBar.tsx` · `RoomList.tsx` · `RoomCard.tsx` · `RoomCardSkeleton.tsx` · `SelectRoomButton.tsx` · `SoldOutAlert.tsx` | quartos |
| `.../components/RoomComparison.tsx` ("use client") | tabela + filtro de diferenças |
| `.../components/ReviewsSection.tsx` ("use client") · `ReviewList.tsx` · `ReviewItem.tsx` · `ReviewsSkeleton.tsx` | avaliações |
| `.../components/SimilarHotels.tsx` (RSC async) · `SimilarHotelCard.tsx` · `SimilarHotelsSkeleton.tsx` | similares |
| `.../components/SectionError.tsx` ("use client") | fallback com `useSectionRetry` |
| `.../components/HotelDetailsSkeleton.tsx` | skeleton da rota (`loading.tsx`) |
| `.../components/HotelNotFound.tsx` | `EmptyState headingLevel={1}` |
| `.../index.ts` | `HotelDetailsView`, `HotelDetailsSkeleton`, `HotelNotFound`, `parseHotelId`, `loadHotel`, `hotelPageTitle` |
| `src/features/hotel-details/CLAUDE.md` (alt.) | decisões finais |
| `src/app/hotel/[hotelId]/page.tsx` | `generateMetadata`; `parseHotelId` → `notFound()`; critérios; compõe `HotelDetailsView` com `SearchForm` no slot |
| `src/app/hotel/[hotelId]/loading.tsx` · `error.tsx` · `not-found.tsx` | skeleton · `ErrorState variant="page"` (só `shared`, nunca o index da feature) · `HotelNotFound` |
| `src/app/hotel/[hotelId]/page.test.tsx` | id inválido → `notFound`; 404 → `notFound`; composição |
| `e2e/hotel-details.spec.ts` · `hotel-details.rooms.spec.ts` · `hotel-details.states.spec.ts` · `hotel-details.a11y.spec.ts` | E2E |

Testes ao lado (`*.test.ts(x)`). **Orçamento do Biome**: `HotelDetailsView` só compõe (seções em
componentes próprios); `RoomCard` separa `RoomCardPrice`/`RoomCardFacts` se passar de ~60 linhas;
`RoomComparison` usa `ComparisonRow` como subcomponente; `Lightbox` delega teclado ao
`useLightbox`; nenhum componente com mais de um `switch`.

**Regra de import em `app/`**: `error.tsx` é client; importar o `index.ts` da feature levaria
`loadHotel`/`getServerQueryClient` para o bundle do cliente. Por isso `error.tsx` usa só
`@/shared/ui`.

## Tarefas

Pré-requisito: branch da F4 criada a partir da F3 concluída. Commits de `shared`/`search-form`
usam o escopo do dono; o resto, `hotel-details`.

1. `refactor(shared): promote rating score, price tag and remote image from hotel-search` — move componentes + `card-styles` + testes; F3 importa de `@/shared/ui`. Prova: suíte da F3 verde sem mudar asserções.
2. `refactor(shared): promote image loader, stay total, availability, labels and hotel link` — Prova: testes movidos verdes; F3 verde.
3. `refactor(shared): promote copy link, slow loading and online hooks` — Prova: testes dos hooks verdes em `shared/hooks`; F2/F3 verdes.
4. `feat(shared): add full size to dialog` — Prova: componente (classes de tela cheia, Esc, foco volta ao gatilho) + suíte do `Dialog` verde.
5. `feat(search-form): support fixed destination and custom submit href` — Prova: componente (destino em texto sem combobox; envio chama `router.push` com o href da prop; padrão continua `/search`).
6. `feat(hotel-details): add hotel id parser and page title` — Prova: unit (`1`, `123456789` válidos; `abc`, `0`, `01`, `1.5`, `-1`, `1e3`, `""`, `1234567890` inválidos; títulos).
7. `feat(hotel-details): add room selectability and lowest price rules` — Prova: unit em tabela (precedência dos 5 casos, `scarce` 1/2/3, `guestsPerRoom` arredondado; `lowestNightlyPrice` com seeds dos hotéis 1, 4, 19 e lista vazia).
8. `feat(hotel-details): add room labels and comparison model` — Prova: unit (camas plural, rótulos exaustivos; comparação dos 4 quartos do hotel 18 lida do `db.seed.json`: linhas, `differs`, `onlyDifferences`; 1 quarto → sem linhas diferentes).
9. `feat(hotel-details): add gallery, static map, cancellation, breadcrumb and sections models` — Prova: unit (`galleryNavigation` com volta; `staticMapLayout` para o hotel 1 — marcador dentro do canvas, tiles cobrindo 100%, coordenadas conhecidas de tile em z15; `osmLink`; 3 políticas; breadcrumb com/sem critérios).
10. `feat(hotel-details): add hotel loader, reviews and similar hotels api` — Prova: testes com `fetch` stubado (URL exata das avaliações e similares, `total` do header, 404 → `not-found`, outro erro relançado, dedupe de `loadHotel` no mesmo request).
11. `feat(hotel-details): add hotel header, breadcrumb, section nav and share` — Prova: componente (critérios 6–8 com `navigator.clipboard` stubado; `FromPrice` com cache semeado).
12. `feat(hotel-details): add gallery with keyboard lightbox` — Prova: componente (critérios 9–10: teclas, volta, contador, foco devolvido).
13. `feat(hotel-details): add overview, policies and static location map` — Prova: componente (critérios 12–14; `<details>` abre por teclado; `role="img"` com endereço).
14. `feat(hotel-details): add section error fallback with in-place retry` — `SectionError` + `useSectionRetry`. Prova: componente (botão "Tentando…" sem desmontar; sucesso → conteúdo; falha → foco no botão).
15. `feat(hotel-details): add room list with availability and selection` — `RoomsSection`, `RoomCard`, skeleton, `SelectRoomButton`, `useSelectRoom`, `SoldOutAlert`. Prova: componente (critérios 15–20, 23–24; store e `router.push` espiados; segundo clique ignorado).
16. `feat(hotel-details): add stay bar with dates form slot` — `HotelStayBar`. Prova: componente (critérios 21–22: painel aberto sem critérios, "Escolher datas" foca o check-in, aviso de datas passadas com `useToday` mockado).
17. `feat(hotel-details): add room comparison table` — Prova: componente (critérios 25–27; checkbox mantém o foco; região rotulada e focável).
18. `feat(hotel-details): add paginated reviews` — Prova: componente (critérios 28–31 com promessa controlada para o `isPending`, `onlineManager` para offline).
19. `feat(hotel-details): add similar hotels section` — Prova: componente RSC renderizado com `await SimilarHotels(...)` (lista, vazio, erro com `console.error` espiado).
20. `feat(hotel-details): compose details view with parallel prefetch and streaming` — `HotelDetailsView`, `HotelDetailsSkeleton`, `HotelNotFound`. Prova: teste que confirma os três `fetch` iniciados antes de o hotel resolver (promessas controladas) e a ordem das seções.
21. `feat(hotel-details): add hotel route` — `app/hotel/[hotelId]/page|loading|error|not-found.tsx` + `page.test.tsx`. Prova: `npm run typecheck && npm run lint && npm run test` verdes; `npm run build` ok.
22. `test(hotel-details): add e2e for details, gallery, sections and sharing` — Prova: `e2e/hotel-details.spec.ts` verde (desktop e mobile).
23. `test(hotel-details): add e2e for rooms, selection, comparison and missing dates` — Prova: `e2e/hotel-details.rooms.spec.ts` verde.
24. `test(hotel-details): add e2e for not found, slow and failing sections` — Prova: `e2e/hotel-details.states.spec.ts` verde.
25. `test(hotel-details): add e2e accessibility and small screen checks` — Prova: `e2e/hotel-details.a11y.spec.ts` verde.
26. `docs(hotel-details): update feature and shared claude.md` — Prova: revisão (Decisões 1, 2, 6, 11, 12, 18 refletidas; nota de CSP para a F5: `img-src` com `images.unsplash.com`, `i.pravatar.cc`, `tile.openstreetmap.org`).

## Plano de testes

**Unit (`model/`, `api/`, `shared/lib`)** — 100% das funções puras das tarefas 6–10. Seeds reais
lidos de `mock-api/db.seed.json` onde indicado (hotéis 1, 4, 18, 19). `staticMapLayout` testado
com valores conhecidos (z15, lon/lat do hotel 1 → tile x/y calculado à mão na fórmula de Web
Mercator) e invariantes (marcador em 0–100%, tiles contíguos cobrindo o canvas).

**Componente (Vitest + Testing Library + `renderWithProviders`)**
- `fetch` com `vi.stubGlobal` respondendo por URL (`/rooms`, `/reviews` com `X-Total-Count`);
  fixtures `makeHotel`/`makeRoom`/`makeReview`.
- Suspense: `QueryClient` de teste semeado (`setQueryData`) para sucesso; promessa controlada
  para loading/`isPending`; resposta 500 com retry desligado para erro.
- `next/navigation` pelo helper `shared/testing/next-navigation.ts`; `useBookingDraft` real com
  `sessionStorage` do jsdom (asserção no JSON gravado).
- Lightbox: `HTMLDialogElement.showModal` do jsdom (polyfill já usado pelo `Dialog`), teclas com
  `userEvent.keyboard("{ArrowRight}")`.
- Lento (5 s) com `vi.useFakeTimers({ shouldAdvanceTime: true })`.
- Hidratação de query rejeitada (simula falha no SSR): `hydrate` com promessa rejeitada →
  `RoomsSection` mostra o fallback com retry.

**E2E (Playwright, mock-api real em `:3333` pelo `webServer`; datas `addDays(todayISO(), 30/33)`)**
- `hotel-details.spec.ts`: vindo de `/search` (Rio, `stay`) clicar no card do hotel 1 → skeleton
  ou conteúdo, h1, breadcrumb com critérios, "a partir de R$ 800"; hotel 4 → R$ 720; galeria e
  lightbox (setas, Home/End, Esc, foco devolvido); âncoras (`#avaliacoes` no `goto` e por clique,
  título abaixo do header: `boundingBox().y >= altura do header`); política expansível; mapa
  (`role="img"` + link OSM com `mlat`); copiar link (`grantPermissions` clipboard) e abrir a URL
  copiada; similares do hotel 1 (17 primeiro, sem o 1) e do 59 (só 60); prefetch: hover no card da
  F3 e depois navegar → nenhum `GET /rooms?hotelId=1` no navegador (`page.on("request")`).
- `hotel-details.rooms.spec.ts`: selecionar Suíte (hotel 1) → URL `/checkout` e `sessionStorage`
  com a seleção; 3 adultos → Standard bloqueado com motivo; hotel 7 escassez; hotel 19 esgotado com
  link para similares; sem critérios → "Escolher datas" foca o check-in, preencher datas e enviar →
  `/hotel/1?…` com totais; comparação do hotel 18 e "Mostrar só diferenças"; hotel 2 sem
  comparação.
- `hotel-details.states.spec.ts`: `/hotel/999` e `/hotel/abc` → "Hotel não encontrado" + `noindex`;
  avaliações do hotel 45 (3 páginas, página 3 com 4); hotel 6 vazio. **`_delay`**: `page.route`
  de `**/reviews?**_page=2**` reescrito para o `slowApi` do fixture (`e2e/helpers/mock-api-server.ts`)
  → página 1 visível com "Atualizando avaliações…" e paginação ainda na 1; depois a 2.
  **`_fail`**: `**/reviews?**_page=2**` → `failingApi` → `ErrorState` após as tentativas
  automáticas (timeout ≥ 8 s); `unroute` + "Tentar de novo" (botão em "Tentando…") → página 2.
  Offline: `context.setOffline(true)` antes de ir para a página 2 → aviso de sem internet; voltar
  online → página 2. Quartos falhando **no cliente**: rota de `**/rooms?**` para o `failingApi` +
  navegação client-side vinda da F3 **sem** prefetch e com cache vazio não é determinística (o
  servidor busca primeiro) — por isso a falha de quartos é coberta no teste de componente
  (hidratação rejeitada) e o E2E cobre a falha de avaliações, que passa pelo mesmo `SectionError`.
- `hotel-details.a11y.spec.ts`: axe (`analyzeAccessibility` de `e2e/helpers/axe.ts`) nos estados do
  critério 35; 320 px (`setViewportSize({ width: 320, … })`): `scrollWidth <= clientWidth` do
  documento com e sem lightbox; região da comparação focável por Tab e rolável.

Limite conhecido: requests feitos **no servidor do Next** (hotel, primeira página de quartos e
avaliações, similares) não passam pelo `page.route`. Falhas desses caminhos são provadas em teste
de componente/página com `fetch` stubado; o E2E cobre as falhas dos caminhos do cliente.

## Riscos

| Risco | Mitigação |
|---|---|
| Cold start do Render prende o hotel no servidor (até 10 s) | `loading.tsx` imediato; `error.tsx` com "Tentar de novo" (`router.refresh` + `reset`); seções com "Está demorando mais que o normal…"; registrar no README |
| 404 com status 200 (streaming) | `noindex` automático do Next; Decisão 2 no README; E2E checa a meta |
| Promessa desidratada rejeitada no SSR vira erro sem retry automático no cliente | `SectionError` com retry no lugar; teste de componente com `hydrate` rejeitado |
| `error.tsx` (client) puxar código de servidor pelo `index.ts` | Regra: `error.tsx` só importa `@/shared/ui`; build quebraria se violada (anotado no `CLAUDE.md` da feature) |
| Promoções da F3 quebram a F3 | Uma tarefa por grupo de promoção, suíte da F3 inteira em cada commit; nomes reais da F3 prevalecem |
| Layout muda sob o clique (lição F2/F3) | Motivo de bloqueio sempre montado; retry não desmonta o botão; "Atualizando avaliações…" em linha de status de altura fixa; painel de datas abre abaixo do botão |
| Âncora cai em seção que ainda vai crescer (streaming acima) | `<section id>` fora do Suspense; skeletons com a altura do conteúdo final; `#avaliacoes` testado no E2E |
| Foco atrás do header sticky | Todo foco programático com `preventScroll` + `revealBelowHeader`; âncoras usam o `scroll-padding-top` global |
| Tiles do OSM: política de uso e CSP | Uso leve com atribuição; `unoptimized` (sem proxy do Next); nota de `img-src` para a F5; `LocationMap` isolado para trocar por Leaflet/provedor nos extras |
| Seleção gravada antes de o `booking-draft` reidratar | O hydrator roda na montagem, antes de qualquer clique; teste de componente grava após hidratar e o E2E lê o `sessionStorage` |
| Texto ilustrativo da política parecer contrato real | Centralizado em `cancellationDetails`; README explica que a API só fornece a categoria |
| `reviewCount` × comentários publicados confundirem | Nomes diferentes (avaliações × comentários), Decisão 10 |
| Tabela de comparação estoura 320 px | Região com scroll próprio rotulada, 1ª coluna `sticky`; E2E mede o `scrollWidth` do documento |
| Funções/arquivos acima do limite do Biome | Divisão planejada (seção Arquivos); `npm run lint` em toda tarefa |

## UI/UX

Referências: `docs/design/design-system.md` §3 (imagens), §4.3 (estrutura), §5.1 Button/PriceTag/
RatingScore/Badge, §5.2 Card/Breadcrumb/Disclosure/Pagination/EmptyState/ErrorState/Alert, §5.3 Dialog,
§6 (microcopy). As mudanças pedidas ao design system estão no fim desta spec
(`## Mudanças no design system`).

### Decisões de UX

1. **Ordem única para todas as larguras: nome → fotos → preço e ação → seções.** O DOM e a ordem
   visual são os mesmos em 320 px e em 1280 px (nada de reordenar com `order-*`: foco = ordem visual).
   No celular, a foto principal fica sem thumbnails (só `≥ sm`) para que "a partir de R$ 800 por
   noite" e "Ver quartos" caibam na primeira tela de 375×667 (topo do preço em ~470 px).
2. **Sem barra de âncoras sticky e sem barra de ação fixa (confirma o "Fora" do planner).** A barra de
   seções é estática, logo abaixo do preço; no celular é uma linha só, rolável na horizontal (44 px de
   altura em vez de ~150 px quebrando em 3 linhas). A barra fixa do §4.5 só repetiria "Ver quartos"
   (não há total antes de escolher o quarto); ela continua sendo o padrão do **checkout** (F5).
3. **Condição de cancelamento visível em cada quarto, antes do botão.** O card do quarto tem a linha
   "Cancelamento grátis" / "Reembolso parcial…" / "Sem reembolso…" acima do preço (princípio: nunca
   esconder a condição). Os detalhes ficam em "Políticas".
4. **Botão bloqueado nunca é beco sem saída.** Esgotado / pequeno demais / quartos insuficientes:
   `aria-disabled` + motivo visível **acima** do botão (ligado por `aria-describedby`) dizendo o que
   fazer ("…Escolha outro quarto ou altere os hóspedes."). Sem datas, o botão vira "Escolher datas" e
   leva ao formulário — ação, não bloqueio.
5. **Comparação recolhida por padrão** (disclosure "Comparar quartos (4)"). A tabela tem 10–17 linhas
   (~750 px): aberta, ela fica entre os quartos e "Localização" no caminho de quem só rola. Quem quer
   comparar abre com um toque; a âncora `#comparar-quartos` continua existindo.
6. **Uma palavra por conceito na página.** Barra de seções e títulos usam o mesmo texto:
   "Avaliações" (h2) e "Similares" → h2 "Hotéis similares em {destino}". A distinção da Decisão 10 é
   feita **dentro** da seção: nota agregada ("2.847 avaliações") no topo e a linha de status
   "Mostrando 1–5 de 14 comentários" acima da lista.
7. **Enviar as datas não leva ao topo.** O formulário navega para `/hotel/{id}?<critérios>` **sem
   scroll** (`router.push(href, { scroll: false })`), fecha o painel e move o foco para o h2
   "Quartos" (`preventScroll` + `revealBelowHeader`). Os quartos não recarregam (mesma query key):
   só os totais mudam, na hora.

### Layout

Container padrão (§4.1), seções empilhadas em uma coluna: `flex flex-col gap-8 lg:gap-12`. Sem sidebar
(o conteúdo de cada seção já é largo: card horizontal de quarto, tabela, mapa). Texto corrido sempre
`max-w-prose`. Nenhum `<main>` (é do layout raiz).

**320–375 px (com critérios):**
```
┌ SiteHeader (sticky h-14) ──────────┐
└────────────────────────────────────┘
 ← Hotéis em Rio de Janeiro, RJ         Breadcrumb mobile (link, text-sm, min-h-11)
 Hotel · Rio de Janeiro, RJ [Destaque]  p text-sm text-fg-muted + Badge info (se featured)
 Hotel Copacabana Palace                h1 text-2xl font-bold (quebra linha)
 📍 Av. Atlântica, 1702 - Copacabana,   p text-sm text-fg-muted, MapPinIcon size-4
    Rio de Janeiro - RJ
 4,8 ★★★★★ Excelente · 2.847 avaliações RatingScore md
┌────────────────────────────────────┐
│                                    │  botão-foto principal, aspect-video, rounded-card
│          foto principal            │
│             [Ver todas as fotos (5)]│  Button secondary sm, absolute bottom-3 right-3
└────────────────────────────────────┘
 a partir de R$ 800 por noite           FromPrice: PriceTag nightly-inline (valor text-2xl bold)
 Sua estadia: 12–15 dez · 3 noites ·    p text-sm text-fg-muted tabular-nums (só com critérios)
 2 adultos · 1 quarto
 [🔗 Copiar link] [  Ver quartos ▾  ]   ghost md · primary md flex-1 (âncora #quartos)
┌────────────────────────────────────┐  SectionNav: border-y border-border, overflow-x-auto
│ Visão geral  Quartos  Localização  Po│  links ghost sm shrink-0 (o corte do último indica rolagem)
└────────────────────────────────────┘
 Visão geral                            h2 text-xl font-semibold
 Ícone de Copacabana, o Copacabana…     p text-fg max-w-prose
 Comodidades                            h3 text-lg font-semibold
 ✓ Wi-Fi           ✓ Piscina            ul grid grid-cols-2 gap-x-4 gap-y-2 text-sm
 ✓ Spa             ✓ Restaurante
 Quartos                                h2 (tabIndex=-1: alvo de foco)
┌ Sua estadia ───────────────────────┐  HotelStayBar: Card static p-4
│ 12–15 dez · 3 noites · 2 adultos · │  text-base font-semibold tabular-nums
│ 1 quarto                           │
│ [Alterar datas e hóspedes ▾]       │  Disclosure (Button secondary sm)
└────────────────────────────────────┘
 [painel: SearchForm, se aberto]
 2 tipos de quarto                      linha de status min-h-5 text-sm text-fg-muted
┌ RoomCard ──────────────────────────┐
│ [        foto 4:3 (100%)         ] │
│ Suíte Deluxe Ocean View            │  h3 text-lg font-semibold
│ Suíte espaçosa com vista para o…   │  p text-sm text-fg-muted (texto inteiro, sem clamp)
│ ⤢45 m²  👤Até 3 hóspedes  🛏1 cama king│ ul flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted
│ ✓ Vista para o mar ✓ Varanda       │  até 4 comodidades
│ ✓ Banheira ✓ Frigobar  [+2 ▾]      │  <details> "+2 comodidades"
│ ✓ Cancelamento grátis              │  text-sm text-success, CheckIcon
│ ───────────────────────────────────│  border-t pt-3
│ [Apenas 1 quarto!]     R$ 3.600,00 │  badge à esquerda · total text-xl bold à direita
│        total · 3 noites · 1 quarto │
│              R$ 1.200 por noite    │  text-sm text-fg-subtle (diária exata, sem "a partir de")
│ [      Selecionar quarto         ] │  primary md fullWidth
└────────────────────────────────────┘
 [▸ Comparar quartos (2)]               h3 > button (disclosure), min-h-11
 Localização                            h2
 📍 Av. Atlântica, 1702 - …             p text-sm
┌────────────────────────────────────┐  aspect-[2/1] rounded-card border overflow-hidden
│            (tiles) 📍              │
│     © colaboradores do OpenStreetMap│  atribuição text-xs, bg-surface/90, bottom-right
└────────────────────────────────────┘
 Abrir no OpenStreetMap                 link text-sm text-primary min-h-11
 Políticas                              h2
 Check-in            Check-out          dl grid grid-cols-2 gap-4
 A partir de 15:00   Até 12:00          dd text-base font-semibold tabular-nums
 Cancelamento                           h3 text-lg
 [Cancelamento grátis]                  Badge success
 ▸ Ver regras de cancelamento           <details>/<summary> min-h-11
 Avaliações                             h2 (tabIndex=-1)
 4,8 ★★★★★ Excelente · 2.847 avaliações RatingScore md
 Mostrando 1–5 de 14 comentários        linha de status min-h-5
 (◯) Maria Silva   [✓ Hóspede verificado]
     10/03/2024
 5 ★★★★★
 Experiência inesquecível!              h3 text-base font-semibold
 Tudo perfeito, desde o check-in…       p text-fg max-w-prose
 42 pessoas acharam útil                p text-sm text-fg-subtle
 ─────────── (divide-y)
 [‹ Anterior]  Página 1 de 3  [Próxima ›]
 Hotéis similares em Rio de Janeiro, RJ h2
┌[foto 1:1 w-24] Hotel Fasano Rio ──┐   SimilarHotelCard compacto (horizontal no mobile)
│               Hotel · 4,9 ★ (1.234)│
│               a partir de R$ 1.500 │
│               por noite            │
└────────────────────────────────────┘ × até 4 (gap-3)
```

**≥ 1024 px:**
```
 Início › Hotéis em Rio de Janeiro, RJ › Hotel Copacabana Palace        breadcrumb completo
 Hotel · Rio de Janeiro, RJ [Destaque]
 Hotel Copacabana Palace                                                 h1 lg:text-3xl
 📍 Av. Atlântica, 1702 - Copacabana, Rio de Janeiro - RJ   ·   4,8 ★★★★★ Excelente · 2.847 avaliações
┌──────────────────────────────┬──────────────┬──────────────┐  grid grid-cols-4 grid-rows-2 gap-2
│                              │   thumb 2    │   thumb 3    │  h-72 (sm) / lg:h-96, rounded-card
│        foto principal        ├──────────────┼──────────────┤  overflow-hidden
│      (col-span-2 row-span-2) │   thumb 4    │   thumb 5    │
│                              │              │ [Ver todas as fotos (5)]  (absolute bottom-3 right-3)
└──────────────────────────────┴──────────────┴──────────────┘
 a partir de R$ 800 por noite                              [🔗 Copiar link] [ Ver quartos ▾ ]
 Sua estadia: 12–15 dez · 3 noites · 2 adultos · 1 quarto    (lg:flex lg:items-end lg:justify-between)
 ───────────────────────────────────────────────────────────────────────────────────────────
 Visão geral   Quartos   Localização   Políticas   Avaliações   Similares        (sem rolagem)
 ───────────────────────────────────────────────────────────────────────────────────────────
 Visão geral
 descrição (max-w-prose)
 Comodidades: grid-cols-3
 Quartos
 ┌ Sua estadia  12–15 dez · 3 noites · 2 adultos · 1 quarto   [Alterar datas e hóspedes ▾] ┐
 └─────────────────────────────────────────────────────────────────────────────────────────┘
 2 tipos de quarto
 ┌ RoomCard horizontal ─────────────────────────────────────────────────────────────────────┐
 │ ┌foto w-56┐ Suíte Deluxe Ocean View                                                      │
 │ │  4:3    │ Suíte espaçosa…                                                              │
 │ │         │ 45 m² · Até 3 hóspedes · 1 cama king                                         │
 │ │         │ ✓ Vista para o mar ✓ Varanda ✓ Banheira ✓ Frigobar [+2 ▾]                    │
 │ │         │ ✓ Cancelamento grátis                                                        │
 │ │         │ ──────────────────────────────────────────────────────────────────────────── │
 │ └─────────┘ [Apenas 1 quarto!]                                     R$ 3.600,00          │
 │                                                     total · 3 noites · 1 quarto          │
 │                                                              R$ 1.200 por noite          │
 │                                                           [ Selecionar quarto ] (w-56)   │
 └──────────────────────────────────────────────────────────────────────────────────────────┘
 [▸ Comparar quartos (2)]
 Localização: lg:grid lg:grid-cols-[2fr_1fr] gap-6 → mapa à esquerda; endereço + link à direita
 Políticas:   lg:grid lg:grid-cols-2 gap-6 → horários à esquerda; cancelamento à direita
 Avaliações:  lista max-w-3xl
 Hotéis similares: grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 (card vertical, foto 4:3)
```

- **Galeria (`sm+`)**: o número de thumbs (`n` = fotos − 1, até 4) define a grade, sem buraco:
  `n=4` 2×2 · `n=3` coluna 3 com 2 thumbs + coluna 4 `row-span-2` · `n=2` colunas 3 e 4 `row-span-2` ·
  `n=1` thumb `col-span-2 row-span-2` · `n=0` principal `col-span-4`. Com mais de 5 fotos, o último
  thumb leva faixa `bg-overlay/60` com `+3 fotos` (`text-fg-on-primary font-semibold`, ≥ 4.5:1 mesmo
  sobre foto branca). `< sm`: só a principal (`aspect-video`); thumbs `hidden sm:block` (com
  `loading="lazy"` não baixam no celular).
- **Botões-foto**: `<button>` sem estilo de botão, `relative overflow-hidden rounded-card` (na grade:
  cantos só nas pontas externas), imagem `object-cover`, hover `brightness-95`, foco = anel global
  (`outline-offset-2`). Imagem quebrada: bloco `bg-surface-sunken` + `BedIcon size-8 text-fg-subtle`.
- **SectionNav**: `<nav aria-label="Seções da página">` → `<ul class="flex gap-1 overflow-x-auto py-1">`
  (o `py-1` impede que o anel de foco seja cortado) → links `buttonClassName({ variant: "ghost",
  size: "sm" })` + `shrink-0 whitespace-nowrap`. Sem esconder a scrollbar. Ao receber foco por Tab, o
  link fora da vista entra sozinho (comportamento nativo do overflow).
- **RoomCard `sm+`**: mesma geometria do `HotelCard` (foto `sm:w-56 sm:aspect-auto sm:min-h-42`,
  corpo `p-4 md:p-5`, bloco de preço `mt-auto`); botão `sm:w-56 sm:ml-auto`.
- **SimilarHotelCard**: `Card interactive`. `< sm` horizontal compacto: foto `w-24 aspect-square
  shrink-0`, corpo `p-3 gap-1`; `sm+` vertical (foto `aspect-[4/3]`, corpo `p-4`). Nome `h3 > a`
  `text-base font-semibold line-clamp-2`; `RatingScore size="sm" showLabel={false}`; `PriceTag
  nightly-line`; `Badge` `Esgotado`/`Apenas N quartos!` quando houver. Único focável: o link.
- 320 px: nada com largura fixa maior que 288 px; valores monetários `whitespace-nowrap`; a tabela de
  comparação rola dentro da própria região; a SectionNav rola dentro dela.

**Ordem de leitura e foco** (= ordem visual, igual em todas as larguras):
SkipLink → logo → breadcrumb ("← Hotéis em…" no mobile; Início/Hotéis em… no `sm+`) → foto principal
→ thumbs (`sm+`) → "Ver todas as fotos (5)" → "Copiar link" → "Ver quartos" → links da SectionNav →
"Alterar datas e hóspedes" → [campos do painel] → por quarto: "+N comodidades" → botão → "Comparar
quartos" → [checkbox → região da tabela] → atribuição OSM → "Abrir no OpenStreetMap" → "Ver regras de
cancelamento" → paginação das avaliações → links dos similares.

Linha de ações: DOM e visual = `[🔗 Copiar link] [Ver quartos ▾]` (`flex gap-3`) em todas as larguras;
no mobile "Ver quartos" é `flex-1` (largo, à direita, no alcance do polegar) e "Copiar link" é `ghost
md` com a largura do conteúdo; no `lg+` os dois têm a largura do conteúdo, à direita do preço.

### Hierarquia

1. **Qual hotel e se vale a pena**: h1, tipo/destino, endereço, nota (com "Excelente" em texto).
2. **Fotos**: a principal grande; o resto a um toque.
3. **Quanto custa e o próximo passo**: "a partir de R$ 800 por noite" (`text-2xl bold`) + "Sua estadia:
   12–15 dez…" + "Ver quartos" (única ação primária acima da dobra).
4. **Quartos (onde a decisão acontece)**: total da estadia em destaque por quarto, disponibilidade
   colada ao preço, motivo de bloqueio antes do botão, cancelamento antes do preço.
5. Apoio: visão geral, localização, políticas, avaliações, similares.
6. Ações secundárias em `ghost`/`secondary`: "Copiar link", "Ver todas as fotos", "Alterar datas e
   hóspedes", "Comparar quartos". Primárias: "Ver quartos" (topo), "Selecionar quarto" (um por card:
   cada card é um contexto) e o envio do formulário de datas quando aberto.

### Componentes

| Uso | Componente | Observação |
|---|---|---|
| Breadcrumb | `Breadcrumb` (feature, DS §5.2) | `< sm`: só o link "← Hotéis em {destino}" com `ArrowLeftIcon` |
| Tipo/destaque | `Badge` `info` "Destaque" | tipo vai em texto na linha "Hotel · Rio de Janeiro, RJ" |
| Nota | `RatingScore` `md` (cabeçalho e topo de Avaliações) · `sm` sem contagem (cada comentário) | **mudança**: `reviewCount` opcional |
| Preço do topo | `PriceTag` `nightly-inline` | **variante nova** (DS) |
| Preço do quarto | `PriceTag` `stay` com `exactNightly` · `room-nightly` | **mudança**: diária sem "a partir de" (preço do quarto é exato) |
| Fotos | `RemoteImage` (promovido) | `priority` só na principal |
| Lightbox | `Dialog size="full"` | **variante nova** em `shared` (DS §5.3) |
| Ações do topo | `Button primary` (como `<a href="#quartos">`, `buttonClassName`) · `Button ghost` `leftIcon` `LinkIcon` | "Ver quartos" com `rightIcon` `ChevronDownIcon` |
| Seções | `SectionNav` (feature) com `buttonClassName` ghost sm | padrão novo no DS §4.6 |
| Datas | `HotelStayBar` + Disclosure + `SearchForm` (F2) | props novas no `SearchForm`: `fixedDestination`, `getSubmitHref`, **`submitLabel`**, **`submitLoadingText`**, navegação **sem scroll** |
| Avisos | `Alert` `info` (sem datas) · `warning` (datas passadas, hotel esgotado, offline nas avaliações) | |
| Quarto | `RoomCard` (Card `static`; `selected` enquanto "Selecionando…") | DS §5.3 HotelCard/RoomCard atualizado |
| Disponibilidade | `Badge` `danger`/`warning` | |
| "+N comodidades" e regras de cancelamento | `<details>`/`<summary>` nativo | padrão novo "Disclosure nativo" (DS §5.2) |
| Comparação | `RoomComparison`: Disclosure em `h3` + `Checkbox` + tabela em região rolável | padrão novo "Tabela de comparação" (DS §5.2) |
| Mapa | `LocationMap` (RSC) | |
| Avaliações | `ReviewItem` (avatar com fallback de iniciais) + `Pagination` `buttons` | padrão novo "Avatar" (DS §5.1) |
| Similares | `SimilarHotelCard` (`Card interactive` compacto) | |
| Vazio / erro | `EmptyState` / `ErrorState inline` (`headingLevel={3}`) / `ErrorState page` (`error.tsx`) | |
| Toast | `toast.success` / `toast.error` | só "Copiar link" |

### Cabeçalho e galeria

- Linha de contexto: `{Tipo} · {destino}` (`propertyTypeLabel`) + `Badge info` "Destaque" se `featured`.
- Endereço: `<p>` com `MapPinIcon size-4 aria-hidden` (não é link; o link para o mapa fica na seção).
- `FromPrice` (ilha cliente, `min-h-8`):

| Estado | Visual |
|---|---|
| carregando | `Skeleton line h-8 w-56` (mesma altura da linha de preço) |
| quartos disponíveis | `a partir de` **R$ 800** `por noite` (`nightly-inline`) |
| todos esgotados | `a partir de R$ 1.100 por noite` + `Badge danger` `Esgotado` na mesma linha (`flex-wrap`) |
| sem quartos (`[]`) | `Sem quartos para reserva no momento.` (`text-sm text-fg-muted`) |
| erro dos quartos | `Preços indisponíveis no momento.` (`text-sm text-fg-muted`); quando o retry da seção Quartos der certo, o preço entra no lugar (a ilha observa a mesma query e reseta a própria boundary) |

- "Sua estadia: …" só com critérios (server, `formatDateRange` + plurais, igual ao resumo da F3).
- "Ver quartos": âncora `#quartos` (sem JS). "Copiar link": não muda de texto; o toast anuncia.
- Galeria: cada foto é `<button aria-label="Abrir foto 2 de 5">` com `<img alt="">` (o nome vem do
  botão; evita leitura dupla). "Ver todas as fotos (5)" abre na foto 1. Com 1 foto só: sem "Ver todas"
  (a própria foto abre o lightbox).

### Lightbox (`Dialog size="full"`)

```
┌──────────────────────────────────────────────┐  <dialog> modal, inset-0, w-full h-dvh, bg-fg
│ Fotos de Hotel Copacabana Palace        [×]  │  header h-14 px-4: h2 text-base font-semibold
│                                              │    text-fg-on-primary truncate · IconButton overlay
│                                              │
│               (foto object-contain)          │  área flex-1 min-h-0, next/image fill, sizes="100vw"
│                                              │
│ [‹]             Foto 2 de 5             [›]  │  footer h-16 px-4 pb-[env(safe-area-inset-bottom)]
└──────────────────────────────────────────────┘  IconButton overlay 44px · contador w-28 text-center
```
- Mesma geometria em todas as larguras (sem setas laterais sobre a foto: no celular cobririam a
  imagem; no rodapé ficam no alcance do polegar). Contador com largura fixa: as setas não andam.
- Foco inicial: "Próxima foto". Tab circula ×, ‹, › (foco preso nativo). Teclas no `<dialog>`:
  `→` próxima (5 → 1), `←` anterior (1 → 5), `Home` primeira, `End` última, `Esc` fecha. Ao fechar, o
  foco volta ao botão-foto (ou "Ver todas as fotos") que abriu.
- **Anel de foco branco** dentro do lightbox (`focus-visible:outline-fg-on-primary`): o `primary`
  sobre `fg` dá 2.59:1 (abaixo de 3:1); branco sobre `fg` = 17.28:1.
- Contador `<p aria-live="polite">Foto 2 de 5</p>` (`text-fg-on-primary tabular-nums`, 17.28:1).
  `alt` da foto: `Hotel Copacabana Palace, foto 2 de 5`.
- Troca de foto: instantânea (sem animação). Se a próxima ainda não carregou: fundo `bg-fg` +
  `Spinner` + `Carregando foto…` (`text-sm text-fg-on-primary`) centralizados. Quebrada: `BedIcon
  size-8` + `Não foi possível carregar esta foto.` no mesmo lugar (as setas continuam funcionando).
- Clique fora da foto não fecha (não há backdrop visível em tela cheia); fecha por ×/Esc.
- 1 foto: sem ‹ › e sem contador ("Foto 1 de 1" é ruído).

### Quartos

**Barra da estadia (`HotelStayBar`)**

| Situação | Visual |
|---|---|
| com critérios | Card static `p-4`, `sm:flex sm:items-center sm:justify-between gap-3`: `Sua estadia` (`text-sm font-medium text-fg-muted`) / resumo (`text-base font-semibold tabular-nums`) · `Button secondary sm` "Alterar datas e hóspedes" (Disclosure: `aria-expanded`, `aria-controls="stay-edit-panel"`, chevron gira). Painel abaixo do card, fechado = desmontado |
| sem critérios | `Alert info` "Escolha as datas para reservar" / "Com as datas e os hóspedes, mostramos o preço total e a disponibilidade de cada quarto." e, logo abaixo, o `SearchForm` **sempre aberto** (sem disclosure: é a tarefa principal) |
| datas passadas | `Alert warning` abaixo do card (cliente, após `useToday`, como na F3) |
| hotel esgotado (`availableRooms === 0` ou todos `available 0`) | `Alert warning` acima da lista: título "Este hotel está esgotado nestas datas" (sem critérios: "Este hotel está sem quartos disponíveis no momento") · texto "Veja opções parecidas na mesma região." · ação link "Ver hotéis similares" (`#similares`) |

- Painel (`div#stay-edit-panel`, `h3.sr-only` "Alterar datas e hóspedes" usado em `labelledBy`):
  `SearchForm fixedDestination showRecentSearches={false} submitLabel="Ver disponibilidade"
  submitLoadingText="Atualizando…"`. Destino fixo = `Destino` (`text-sm font-medium`) + `Rio de
  Janeiro, RJ` (`text-base`), sem input.
- Enviar: navega **sem scroll**, painel fecha, foco no h2 "Quartos" (Decisão de UX 7).

**Linha de status** (`min-h-5 text-sm text-fg-muted`, acima da lista, sempre montada):
`Carregando quartos…` (com `Spinner`) → `Está demorando mais que o normal…` (após 5 s) → `2 tipos de
quarto` / `1 tipo de quarto`. Anunciador `sr-only aria-live="polite"` separado com o mesmo texto.

**Card do quarto — bloco de preço e botão por estado (`roomSelectability`)**

| Estado | Esquerda do preço | Direita (preço) | Motivo (acima do botão, `text-sm`, `id` no `aria-describedby`) | Botão |
|---|---|---|---|---|
| `selectable` | — | **R$ 3.600,00** / `total · 3 noites · 1 quarto` / `R$ 1.200 por noite` | — | `primary` "Selecionar quarto" |
| `selectable` + `scarce` | `Badge warning` `Apenas 1 quarto!` | igual | — | igual |
| `needs-dates` | — | **R$ 1.200** / `por noite` | — | `secondary` "Escolher datas" (`CalendarIcon`) |
| `past-dates` | — | `R$ 1.200 por noite` (`text-sm text-fg-subtle`, sem total) | `InfoIcon` + `As datas desta busca já passaram.` | `secondary` "Escolher datas" (`CalendarIcon`); abre o painel e foca o Check-in |
| `too-small` | — | `R$ 1.200 por noite` (`text-sm text-fg-subtle`, sem total) | `InfoIcon` + `Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.` (`text-fg-muted`) | "Selecionar quarto" `aria-disabled` (visual disabled) |
| `insufficient` | `Badge warning` `Só 2 disponíveis` | `R$ 1.200 por noite` (sem total) | `Sua busca pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.` | "Selecionar quarto" `aria-disabled` |
| `sold-out` | `Badge danger` `Esgotado` | `R$ 1.200 por noite` (sem total) | `Sem quartos disponíveis para estas datas.` (sem critérios: `…no momento.`) | "Esgotado" `aria-disabled`; foto `grayscale opacity-70` |
| selecionando | igual ao `selectable` | igual | — | `loading` "Selecionando…"; card `selected` (`ring-1 ring-primary`, sem mudar tamanho) |

- Nome acessível do botão: `aria-label="{rótulo visível}: {nome do quarto}"` (um texto só, sem espaço
  antes do ":"; no "Selecionando…" o rótulo visível é o nome) →
  "Selecionar quarto: Suíte Deluxe Ocean View" / "Esgotado: Quarto Standard" / "Escolher datas: …".
- O motivo é renderizado com o card (não aparece no clique); clicar no botão bloqueado não faz nada e
  o foco fica nele. Enquanto um quarto está "Selecionando…", cliques nos outros botões são ignorados.
- Fatos (`ul flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted`, ícones `size-4 aria-hidden`):
  `45 m²` (visível `aria-hidden` + `sr-only` "45 metros quadrados"), `UserIcon` `Até 3 hóspedes` (1 →
  `1 hóspede`), `BedIcon` `1 cama king` (várias: `1 cama king e 1 sofá-cama`).
- Comodidades: até 4 com `CheckIcon text-success`; o resto num `<details>`: `summary` `+2 comodidades`
  (`text-sm font-medium text-primary min-h-11 inline-flex items-center`), aberto lista as restantes
  **abaixo** (nada acima se move). Sem comodidades: linha omitida.
- Cancelamento (hotel): `CheckIcon text-success` "Cancelamento grátis" · `InfoIcon text-fg-muted`
  "Cancelamento com reembolso parcial" · `InfoIcon text-fg-muted` "Sem reembolso em caso de
  cancelamento" (`text-sm`; tom de texto `success` só no grátis).
- Foto do quarto: `aspect-[4/3]`, `alt=""` (o h3 ao lado já nomeia).
- Leitura (ordem do DOM): "Suíte Deluxe Ocean View, título 3 · descrição · 45 metros quadrados · Até 3
  hóspedes · 1 cama king · Vista para o mar … · +2 comodidades · Cancelamento grátis · Apenas 1
  quarto! · R$ 3.600,00 total · 3 noites · 1 quarto · R$ 1.200 por noite · Selecionar quarto: Suíte…".

**Comparação (`#comparar-quartos`, só com ≥ 2 quartos)**

```
[▸ Comparar quartos (4)]                       h3 > button: Disclosure, aria-expanded, min-h-11,
                                               text-lg font-semibold text-fg, ChevronDownIcon
 [x] Mostrar só diferenças                     Checkbox (linha min-h-11)
 ▌ Linhas marcadas mudam entre os quartos.     legenda text-sm text-fg-muted (barra = mesma marca da linha)
 Arraste para o lado para ver todos.           text-sm text-fg-subtle, só < lg
┌ região rolável (overflow-x-auto, tabIndex=0) ───────────────────┐
│               │ Suíte Deluxe │ Quarto       │ Suíte        │ …   │  th scope=col, text-sm font-semibold,
│               │ Ocean View   │ Standard     │ Presidencial │     │  min-w-36, quebra linha
│▌Preço / noite │ R$ 1.200     │ R$ 800       │ R$ 3.500     │     │  linha que difere: bg-primary-soft +
│▌Tamanho       │ 45 m²        │ 28 m²        │ 90 m²        │     │  border-l-4 border-primary no th
│ Hóspedes      │ Até 3        │ Até 3        │ Até 3        │     │  linha igual: bg-surface
│▌Varanda       │ ✓ Sim        │ – Não        │ ✓ Sim        │     │  Sim: CheckIcon text-success + "Sim"
└───────────────┴──────────────┴──────────────┴──────────────┴─────┘  Não: MinusIcon text-fg-subtle + "Não"
```
- `<table>` `w-full text-sm tabular-nums`, `caption.sr-only` "Comparar quartos"; canto
  `<th scope="col"><span class="sr-only">Característica</span></th>`; `th scope="row"` `sticky left-0
  z-0 min-w-28 bg-surface` (na linha que difere, `bg-primary-soft` opaco); células `px-3 py-3`,
  `divide-y divide-border`. Linha que difere: `th` ganha `<span class="sr-only">, diferente entre os
  quartos</span>`.
- Valores: preço `R$ 1.200`; tamanho `45 m²`; hóspedes `Até 3`; camas `1 cama king`; disponibilidade
  `8 disponíveis` / `1 disponível` / `Esgotado`.
- "Mostrar só diferenças": filtra na hora, foco fica no checkbox, anúncio `sr-only aria-live`
  "Mostrando 6 de 12 características" / "Mostrando todas as 12 características". Nenhuma linha
  diferente: uma linha `td colSpan` "Os quartos têm as mesmas características."
- Região: `role="region" aria-labelledby` = id do h3, `tabIndex=0`, anel de foco global, `rounded-card
  border border-border`. A página nunca rola na horizontal.

### Localização e políticas

- Mapa: wrapper `relative aspect-[2/1] overflow-hidden rounded-card border border-border
  bg-surface-sunken`. Dentro: `div role="img" aria-label="Mapa: {endereço}"` com os tiles (`alt=""`) e o
  marcador `MapPinIcon size-8 text-primary` (ponta no ponto: `-translate-x-1/2 -translate-y-full`). A
  **atribuição fica fora** do `role="img"` (filhos de `img` são apresentacionais e o link sumiria):
  `absolute bottom-0 right-0 bg-surface/90 px-2 py-0.5 text-xs`, link `© colaboradores do
  OpenStreetMap` (`text-primary underline`, área de toque via `after:` até 44 px de altura).
  Tiles falharam: fica o fundo cinza com o marcador; o endereço em texto continua acima.
- Link `Abrir no OpenStreetMap` com `sr-only` " (abre em nova aba)", `target="_blank" rel="noopener
  noreferrer"`, `text-primary font-medium min-h-11 inline-flex items-center hover:underline`.
- Políticas: `dl` com `Check-in` / `A partir de 15:00` e `Check-out` / `Até 12:00` (`dt text-sm
  text-fg-muted`, `dd text-base font-semibold tabular-nums`). h3 `Cancelamento` + `Badge` do tom
  (`free` success, `moderate` neutral, `strict` warning) + `<details>`: `summary` "Ver regras de
  cancelamento" (`min-h-11 inline-flex items-center gap-2 font-medium text-primary`, `ChevronDownIcon`
  com `group-open:rotate-180`, marcador nativo escondido `list-none [&::-webkit-details-marker]:hidden`);
  conteúdo `ul list-disc pl-5 text-fg-muted max-w-prose`.

### Avaliações

- Topo: `RatingScore md` (nota agregada do hotel) → linha de status `min-h-5`:
  `Mostrando 1–5 de 14 comentários` (1 → `1 comentário`) ↔ `Spinner` + `Atualizando avaliações…`
  ↔ `Carregando avaliações…` ↔ `Está demorando mais que o normal…`.
- Item (`<li><article>`): linha 1 `flex items-start gap-3`: avatar `size-10 rounded-full` (`alt=""`;
  quebrado → círculo `bg-surface-sunken` com iniciais `text-sm font-semibold text-fg-muted`), nome
  `font-medium`, data `text-sm text-fg-subtle tabular-nums` (`<time dateTime>` `10/03/2024`), `Badge
  success` com `CheckIcon` "Hóspede verificado" à direita (quebra para baixo em 320 px). Linha 2:
  `RatingScore size="sm"` sem contagem → visível `5 ★★★★★`, nome "Nota 5 de 5". Depois h3 título
  (`text-base font-semibold`), comentário (`text-fg max-w-prose`), `42 pessoas acharam útil` (`1 pessoa
  achou útil`; 0 → omitido). Lista `divide-y divide-border`, itens `py-5`.
- Troca de página: lista atual `opacity-60 aria-busy="true"`, paginação continua na página antiga;
  chegando a nova, foco no h2 "Avaliações" (`preventScroll` + `revealBelowHeader`); o status lê a nova
  faixa. A paginação fica abaixo da lista (`mt-6`), escondida com 1 página.

### Estados por seção

| Seção | Loading (skeleton com a mesma geometria) | Erro | Vazio |
|---|---|---|---|
| Página (`loading.tsx`) | breadcrumb `h-5 w-48`; linha de contexto `h-5 w-40`; h1 `h-8 w-3/4` (lg `h-9`); endereço `h-5 w-2/3`; nota `h-6 w-56`; galeria `block aspect-video` (`sm+`: grade `h-72 lg:h-96` com 5 blocos); preço `h-8 w-56`; botões `h-11 w-32` + `h-11 flex-1`; nav `h-11`; 3 linhas `h-6`. Contêiner `aria-busy`, `sr-only aria-live` "Carregando hotel…"; após 5 s, linha visível `Está demorando mais que o normal…` **acima da galeria** (`min-h-5` reservada desde o início) | `error.tsx`: `ErrorState page headingLevel={1}` "Não foi possível abrir o hotel" / "Tente de novo ou faça uma nova busca." + "Tentar de novo" + `ButtonLink ghost` "Fazer nova busca" | 404: `EmptyState headingLevel={1}` "Hotel não encontrado" / "O link pode estar errado ou o hotel não está mais disponível." + `ButtonLink primary` "Fazer nova busca" (`/`) |
| Preço do topo | `line h-8 w-56` | `Preços indisponíveis no momento.` | `Sem quartos para reserva no momento.` |
| Quartos | status `Carregando quartos…` + 2 × `RoomCardSkeleton` (foto `block aspect-[4/3]`/`sm:w-56`; h3 `h-7 w-2/3`; descrição 2 × `h-5`; fatos `h-5 w-3/4`; comodidades `h-5 w-5/6`; cancelamento `h-5 w-40`; `border-t`; à direita `h-7 w-28`, `h-5 w-40`, `h-5 w-32`; botão `h-11` `w-full sm:w-56`) | `ErrorState inline headingLevel={3}` "Não foi possível carregar os quartos." / "Verifique sua conexão e tente de novo." + "Tentar de novo" → "Tentando…" no lugar (Decisão 17). Barra da estadia continua acima | `EmptyState` (`headingLevel={3}`) "Nenhum quarto para reserva" / "Este hotel ainda não tem quartos cadastrados. Veja hotéis parecidos na mesma região." + link "Ver hotéis similares" |
| Comparação | (vem com os quartos) | (vem com os quartos) | < 2 quartos: não renderiza |
| Mapa | fundo `bg-surface-sunken` com o marcador enquanto os tiles chegam | tiles quebrados: idem | — |
| Avaliações | `RatingScore` (é do hotel, já existe) + status `Carregando avaliações…` + 3 × `ReviewSkeleton` (`circle size-10`; `h-5 w-32`; `h-5 w-24`; `h-5 w-28`; título `h-6 w-1/2`; 2 × `h-6` comentário) | troca de página/1ª carga: `ErrorState inline headingLevel={3}` "Não foi possível carregar as avaliações." / "Verifique sua conexão e tente de novo." (a lista antiga sai). Offline na troca: `Alert warning` (`WifiOffIcon`) "Você está sem internet." / "As avaliações aparecem assim que a conexão voltar." acima da página atual (a paginação continua na atual) | `EmptyState headingLevel={3}` "Ainda sem comentários" / "Este hotel ainda não recebeu comentários de hóspedes." (sem ação); status vazio |
| Similares | 4 × skeleton do card compacto (`< sm`: `block size-24` + 3 linhas `h-5`; `sm+`: `block aspect-[4/3]` + `h-6`, `h-5`, `h-5`) | `p text-fg-muted` "Não foi possível carregar hotéis similares." + link "Ver hotéis em {destino}" (sem retry: é recomendação) | `p` "Nenhum outro hotel em {destino}." + link "Fazer nova busca" |

- Todo h2 de seção fica **fora** do Suspense/boundary (sempre no HTML): erro e loading trocam só o
  miolo; a âncora não salta.
- "Tentar de novo" das seções: o botão não desmonta (Decisão 17); se falhar de novo, volta ao rótulo
  e o foco fica nele; se der certo, o conteúdo entra e o foco vai para o h2 da seção.
- Nunca mostrar conteúdo de outra query: na troca de página de avaliações com erro, a lista antiga
  sai; offline, ela fica **com** a paginação ainda apontando para ela.

### Interações

| Ação | Feedback imediato | Depois | Foco |
|---|---|---|---|
| Foto / thumb / "Ver todas as fotos" | lightbox abre (`animate-fade-in`) na foto escolhida (ou 1) | — | "Próxima foto"; ao fechar, o botão que abriu |
| ← → Home End no lightbox | foto e contador trocam; contador anunciado | pré-carrega vizinhas | fica onde estava |
| "Copiar link" | toast `Link copiado.` (falha: toast error) | — | fica no botão |
| "Ver quartos" / link da SectionNav | rola até a seção (suave sem `reduced-motion`) | — | o link de âncora move o ponto de partida do Tab para a seção (nativo); título abaixo do header (`scroll-padding-top`) |
| "Alterar datas e hóspedes" | painel abre abaixo, chevron gira | — | fica no botão (padrão disclosure) |
| Enviar datas | botão "Atualizando…" | URL nova sem rolar; painel fecha; totais mudam | h2 "Quartos" |
| "Escolher datas" (sem critérios) | — | — | campo Check-in (`preventScroll` + `revealBelowHeader`) |
| "Selecionar quarto" | botão "Selecionando…", card `selected` | `/checkout` | fica no botão até navegar |
| Botão bloqueado | nada (o motivo já está visível acima) | — | fica no botão; leitor lê o motivo pelo `aria-describedby` |
| "+2 comodidades" / "Ver regras de cancelamento" | abre abaixo (nativo) | — | fica no `summary` |
| "Comparar quartos" | tabela abre abaixo | — | fica no botão |
| "Mostrar só diferenças" | linhas filtram na hora; anúncio | — | fica no checkbox |
| Página das avaliações | lista esmaece, status "Atualizando avaliações…" | nova página | h2 "Avaliações" |
| "Tentar de novo" (seção) | "Tentando…" no próprio botão | conteúdo ou erro | sucesso: h2 da seção; falha: o botão |
| Card de similar | hover `shadow-raised` + sublinhado | navega com os critérios | — |

- Nenhum toast além de "Copiar link". Erros sempre inline na seção.
- Nada se move sob o dedo: motivo de bloqueio montado com o card; painéis abrem **abaixo** do
  gatilho; contador do lightbox com largura fixa; status das listas com altura reservada; skeletons
  com a geometria final; `FromPrice` com `min-h-8`.

### Microcopy (final)

| Onde | Texto |
|---|---|
| `metadata.title` | `{nome} \| Infotera Hotéis` · `Hotel não encontrado \| Infotera Hotéis` · erro: `Hotel \| Infotera Hotéis` |
| Breadcrumb | `nav` `Você está aqui` · `Início` · `Hotéis em {destino}` · `{nome}` · mobile `Hotéis em {destino}` (com `ArrowLeftIcon`) |
| Contexto | `{Hotel\|Pousada\|Resort} · {destino}` · badge `Destaque` |
| Nota | visível `4,8 ★★★★★ Excelente · 2.847 avaliações`; nome `Nota 4,8 de 5, Excelente, 2.847 avaliações` |
| Preço do topo | `a partir de R$ 800 por noite` · `Esgotado` · `Preços indisponíveis no momento.` · `Sem quartos para reserva no momento.` |
| Estadia (topo) | `Sua estadia: 12–15 dez · 3 noites · 2 adultos · 1 quarto` |
| Ações | `Ver quartos` · `Copiar link` · `Ver todas as fotos (5)` |
| Toasts | `Link copiado.` · `Não foi possível copiar. Copie o endereço na barra do navegador.` |
| Galeria | `Abrir foto 2 de 5` · `+3 fotos` |
| Lightbox | título `Fotos de {nome}` · `Fechar` · `Foto anterior` · `Próxima foto` · `Foto 2 de 5` · alt `{nome}, foto 2 de 5` · `Carregando foto…` · `Não foi possível carregar esta foto.` |
| SectionNav | `nav` `Seções da página` · `Visão geral` · `Quartos` · `Localização` · `Políticas` · `Avaliações` · `Similares` |
| Visão geral | h2 `Visão geral` · h3 `Comodidades` (rótulos da F3) |
| Quartos | h2 `Quartos` · `Sua estadia` · `Alterar datas e hóspedes` · h3 sr-only do painel `Alterar datas e hóspedes` · `Destino` · envio `Ver disponibilidade` / `Atualizando…` |
| Sem datas | Alert `Escolha as datas para reservar` · `Com as datas e os hóspedes, mostramos o preço total e a disponibilidade de cada quarto.` |
| Datas passadas | Alert `As datas desta busca já passaram` · `Preços e disponibilidade podem ter mudado. Use "Alterar datas e hóspedes" para escolher novas datas.` |
| Hotel esgotado | Alert `Este hotel está esgotado nestas datas` (sem critérios `Este hotel está sem quartos disponíveis no momento`) · `Veja opções parecidas na mesma região.` · link `Ver hotéis similares` |
| Status dos quartos | `Carregando quartos…` · `Está demorando mais que o normal…` · `1 tipo de quarto` · `2 tipos de quarto` |
| Card do quarto | `45 m²` (sr `45 metros quadrados`) · `Até 3 hóspedes` / `1 hóspede` · camas (tabela abaixo) · `+2 comodidades` · `Cancelamento grátis` / `Cancelamento com reembolso parcial` / `Sem reembolso em caso de cancelamento` |
| Preço do quarto | `R$ 3.600,00` · `total · 3 noites · 1 quarto` · `R$ 1.200 por noite` · sem datas `R$ 1.200` / `por noite` |
| Disponibilidade | `Apenas 1 quarto!` · `Apenas 2 quartos!` · `Só 2 disponíveis` · `Esgotado` · `Sem quartos disponíveis para estas datas.` · `Sem quartos disponíveis no momento.` |
| Motivos | `Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.` (1 → `Acomoda 1 hóspede.`) · `Sua busca pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.` |
| Datas passadas no quarto | motivo visível `As datas desta busca já passaram.` · alerta com aspas tipográficas: `Use “Alterar datas e hóspedes” para escolher novas datas.` |
| Botões do quarto | `Selecionar quarto` / `Selecionando…` · `Escolher datas` · `Esgotado` (`aria-label` "rótulo: nome do quarto" em todos) |
| Comparação | `Comparar quartos (4)` · `Mostrar só diferenças` · `Linhas marcadas mudam entre os quartos.` · `Arraste para o lado para ver todos.` · caption `Comparar quartos` · sr `Característica` · sr `, diferente entre os quartos` · linhas `Preço por noite` `Tamanho` `Hóspedes` `Camas` `Disponibilidade` + comodidades · `Sim` / `Não` · `8 disponíveis` / `1 disponível` / `Esgotado` · `Mostrando 6 de 12 características` · `Mostrando todas as 12 características` · `Os quartos têm as mesmas características.` |
| Comodidades de quarto | `Vista para o mar` · `Vista para a cidade` · `Vista para o jardim` · `Varanda` · `Terraço` · `Banheira` · `Frigobar` · `Cofre` · `Ar-condicionado` · `Mesa de trabalho` · `Cozinha` · `Sala de estar` · `Sistema de som` · `Mordomo` · `Acesso à piscina` · `Jardim privativo` · `Acesso ao lounge` |
| Camas (1 / n) | `cama de solteiro` / `camas de solteiro` · `cama de casal` / `camas de casal` · `cama queen` / `camas queen` · `cama king` / `camas king` · `cama twin` / `camas twin` · `sofá-cama` / `sofás-camas`; junção `1 cama king e 1 sofá-cama` (3+: `1 …, 2 … e 1 …`) |
| Localização | h2 `Localização` · `Mapa: {endereço}` · `© colaboradores do OpenStreetMap` · `Abrir no OpenStreetMap` (sr ` (abre em nova aba)`) |
| Políticas | h2 `Políticas` · `Check-in` `A partir de 15:00` · `Check-out` `Até 12:00` · h3 `Cancelamento` · `Ver regras de cancelamento` |
| Regras `free` | `Cancele grátis até 48 horas antes do check-in.` · `Depois desse prazo, cobramos a primeira diária.` · `Se você não comparecer, cobramos a primeira diária.` |
| Regras `moderate` | `Cancele até 7 dias antes do check-in e receba 50% do valor de volta.` · `Depois desse prazo, não há reembolso.` |
| Regras `strict` | `Esta tarifa não tem reembolso em caso de cancelamento.` · `Mudança de datas depende de disponibilidade e pode ter custo.` |
| Avaliações | h2 `Avaliações` · `Mostrando 1–5 de 14 comentários` · `1 comentário` · `Carregando avaliações…` · `Atualizando avaliações…` · `Hóspede verificado` · `Nota 5 de 5` · `42 pessoas acharam útil` / `1 pessoa achou útil` · paginação `Anterior` `Próxima` `Página {n}` `Página 1 de 3` |
| Avaliações vazio/erro/offline | `Ainda sem comentários` · `Este hotel ainda não recebeu comentários de hóspedes.` · `Não foi possível carregar as avaliações.` · `Verifique sua conexão e tente de novo.` · `Você está sem internet.` · `As avaliações aparecem assim que a conexão voltar.` |
| Quartos erro/vazio | `Não foi possível carregar os quartos.` · `Verifique sua conexão e tente de novo.` · `Tentar de novo` / `Tentando…` · `Nenhum quarto para reserva` · `Este hotel ainda não tem quartos cadastrados. Veja hotéis parecidos na mesma região.` |
| Similares | h2 `Hotéis similares em {destino}` · `a partir de R$ 1.500 por noite` · `Não foi possível carregar hotéis similares.` · `Ver hotéis em {destino}` · `Nenhum outro hotel em {destino}.` · `Fazer nova busca` |
| Página | `Carregando hotel…` · `Está demorando mais que o normal…` · `Não foi possível abrir o hotel` · `Tente de novo ou faça uma nova busca.` · `Hotel não encontrado` · `O link pode estar errado ou o hotel não está mais disponível.` · `Fazer nova busca` |

### Acessibilidade (o que testar)

- Landmarks: `nav` "Você está aqui", `nav` "Seções da página", `nav` "Paginação"; cada seção é
  `<section aria-labelledby>` do seu h2. Hierarquia: h1 → h2 (6 seções) → h3 (Comodidades, nomes dos
  quartos, Comparar quartos, Cancelamento, títulos dos comentários, nomes dos similares, sr-only do
  painel).
- Alvos ≥ 44 px: botões-foto, "Ver todas as fotos" (sm com área 44), links da SectionNav, `summary`s,
  checkbox (linha), setas do lightbox, link de atribuição (área via pseudo-elemento), paginação.
- Foco visível: anel global; no lightbox, anel branco. Todo foco programático abaixo do header.
- Botões bloqueados: `aria-disabled="true"` + `aria-describedby` → motivo; nunca `disabled`.
- Imagens: botões-foto com `aria-label`, imagens internas `alt=""`; foto do lightbox com `alt`
  completo; quarto, avatar e tiles `alt=""`; mapa `role="img"` com endereço.
- Cor nunca sozinha: esgotado (texto + badge), diferença (barra + texto sr), Sim/Não (ícone + texto),
  nota (texto), cancelamento (texto).
- `aria-live`: status de quartos e avaliações, contador do lightbox, filtro da comparação, toasts.
- `prefers-reduced-motion`: `scroll-behavior` automático, fade do lightbox, opacidade da lista e
  `pulse` zerados.
- 320 px e zoom 200%: sem scroll horizontal no documento (SectionNav e tabela rolam dentro de si).

### Ajustes aos critérios (UX)

- **Crit. 7**: além do listado, a linha "Sua estadia: …" (com critérios) e o preço em linha
  (`nightly-inline`). Ordem das ações: `[Copiar link] [Ver quartos]`.
- **Crit. 9**: thumbnails só a partir de `sm` (640 px). Em `< sm`, foto principal + "Ver todas as
  fotos (5)" sobreposto ao canto da foto. Com 1 foto, sem "Ver todas as fotos".
- **Crit. 10**: título do lightbox `Fotos de {nome}`; anel de foco branco; com 1 foto, sem setas nem
  contador.
- **Crit. 11 / 28 / 32**: rótulos da barra = títulos das seções. h2 de avaliações é **"Avaliações"**
  (não "Comentários de hóspedes"); a contagem de comentários fica na linha de status
  ("Mostrando 1–5 de 14 comentários"). h2 de similares é **"Hotéis similares em {destino}"**.
- **Crit. 15**: o card também mostra a descrição do quarto e a linha de cancelamento; "+N" é um
  `<details>` que revela as comodidades restantes; a diária do quarto é `R$ 1.200 por noite` (sem
  "a partir de").
- **Crit. 19 / 20**: textos com a saída: `…Escolha outro quarto ou altere os hóspedes.` e `Sua busca
  pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.` + badge `Só 2 disponíveis`.
- **Crit. 21**: sem critérios o formulário fica aberto **sem** disclosure; o envio se chama "Ver
  disponibilidade", não rola a página e leva o foco ao h2 "Quartos".
- **Crit. 22**: o disclosure se chama **"Alterar datas e hóspedes"** (muda os dois).
- **Crit. 25–27**: a comparação abre pelo disclosure "Comparar quartos (N)" (fechado por padrão); o
  `caption` é `sr-only` (o h3 é o título visível); legenda visual das linhas marcadas.
- **Crit. 30**: o topo da seção mostra o `RatingScore` com "456 avaliações" e o `EmptyState` abaixo.
- **Crit. 33**: texto de erro `Não foi possível carregar hotéis similares.`
- **Arquivos**: `SearchForm` ganha também `submitLabel` e `submitLoadingText` (padrões "Buscar
  hotéis"/"Buscando…") e a navegação do envio customizado não rola (`scroll: false`);
  `PriceTag` ganha `nightly-inline` e `room-nightly`/diária exata; `RatingScore` com `reviewCount`
  opcional; `ReviewAvatar` (fallback de iniciais) na feature.

## Mudanças no design system

Texto exato a inserir em `docs/design/design-system.md` (o orquestrador aplica).

**§1.1 Cores — após "Regras:" (novo item da lista):**
```
- Sobre fundo escuro (`bg-fg`, só no lightbox) o anel de foco é branco
  (`focus-visible:outline-fg-on-primary`, 17.28:1): `primary` sobre `fg` dá 2.59:1, abaixo de 3:1.
  Texto sobre `bg-fg` = `text-fg-on-primary` (17.28:1).
- Linha destacada em tabela (`bg-primary-soft`): `fg` 15.16:1 · `fg-muted` 6.61:1 · `fg-subtle`
  4.76:1 · ícone `success` 4.99:1.
```

**§3 Ícones e imagens — acrescentar ao fim do item "Imagens":**
```
  Galeria do hotel (F4): `< sm` só a foto principal `aspect-video`; `≥ sm` grade `grid-cols-4
  grid-rows-2 gap-2 h-72 lg:h-96` (principal `col-span-2 row-span-2`, até 4 thumbs, grade se ajusta
  ao número de fotos sem buraco). "+N fotos" sobre o último thumb usa faixa `bg-overlay/60` com texto
  `text-fg-on-primary` (≥ 4.5:1 mesmo sobre foto branca). Foto dentro de botão: `alt=""` e o botão
  tem `aria-label` ("Abrir foto 2 de 5"). Avatar de pessoa: `alt=""` (o nome está ao lado).
```

**§4.5 Barra de ação fixa — substituir a primeira frase por:**
```
Para a ação primária do **checkout** abaixo de `lg` (F5). O detalhe do hotel **não** usa barra fixa
(F4): antes de escolher o quarto não há total para mostrar e ela só repetiria "Ver quartos", que está
no topo; também cobriria os toasts.
```

**§4.6 (novo) — inserir após §4.5:**
```
### 4.6 Página longa com seções (detalhe do hotel, F4)

- Seções empilhadas `flex flex-col gap-8 lg:gap-12`, cada uma `<section id aria-labelledby>` com h2
  `text-xl font-semibold`. O h2 fica fora de Suspense/boundary (âncora estável).
- Navegação por âncoras (`SectionNav`): `<nav aria-label="Seções da página">` **estática** (não
  sticky: um segundo elemento sticky somaria com o header e esconderia o foco), `border-y
  border-border`, `<ul class="flex gap-1 overflow-x-auto py-1">`, links com `buttonClassName({ variant:
  "ghost", size: "sm" })` + `shrink-0 whitespace-nowrap`. No celular rola na horizontal dentro de si
  (não esconder a scrollbar); o rótulo de cada link é igual ao h2 da seção.
- Âncoras dependem do `scroll-padding-top` global; `scroll-behavior: smooth` só sem
  `prefers-reduced-motion`.
- Ordem DOM = ordem visual em todas as larguras (nada de `order-*` para reordenar blocos).
```

**§5.1 Button — substituir o item "Disabled:" por:**
```
- **Disabled:** `bg-surface-sunken text-fg-subtle border-transparent cursor-not-allowed` (todas as
  variantes). Ação bloqueada por regra (esgotado, quarto pequeno para a busca) usa **`aria-disabled`**
  com esse visual, nunca `disabled` (mantém o foco), e o **motivo em texto visível** acima do botão,
  ligado por `aria-describedby`, dizendo como resolver. Para formulário inválido, **não desabilite o
  submit**: deixe enviar e mostre os erros.
```

**§5.1 PriceTag — acrescentar linhas à tabela de variantes:**
```
| `nightly-inline` | `a partir de` (`text-sm text-fg-subtle`) **R$ 800** (`text-2xl font-bold`) `por noite` (`text-sm text-fg-muted`) numa linha `flex flex-wrap items-baseline gap-x-1` | "a partir de" no topo do detalhe do hotel |
| `stay` com `exactNightly` | igual ao total do card, mas a 3ª linha é `R$ 1.200 por noite` (sem "a partir de") | Card de quarto (o preço do quarto é exato) |
| `room-nightly` | **R$ 1.200** (`text-xl font-bold`) / `por noite`, alinhado à direita | Card de quarto sem datas |
```

**§5.1 Stars / Rating — acrescentar ao fim do item `RatingScore`:**
```
  `reviewCount` é opcional: omitido → sem contagem e sem rótulo qualitativo (uso: nota inteira de
  um comentário, `size="sm"`, visível `5 ★★★★★`, nome "Nota 5 de 5"; inteiros sem casa decimal).
```

**§5.1 (novo atom) — inserir após Spinner:**
```
#### Avatar
`size-10 rounded-full overflow-hidden bg-surface-sunken`, imagem `object-cover alt=""`. Imagem
quebrada/ausente: iniciais (até 2 letras) `text-sm font-semibold text-fg-muted` centralizadas (6.40:1).
Sempre ao lado do nome em texto. Nasce na F4 (comentários).
```

**§5.2 Disclosure — acrescentar ao fim:**
```
Variante **cabeçalho** (F4, "Comparar quartos (4)"): `<h3><button aria-expanded aria-controls>` com o
texto do título (`text-lg font-semibold text-fg`, `min-h-11`, `ChevronDownIcon` à direita); usada
quando o painel é uma subseção com título.
**Disclosure nativo** (`<details>/<summary>`, sem JS) para conteúdo complementar curto ("+2
comodidades", "Ver regras de cancelamento"): `summary` `min-h-11 inline-flex items-center gap-2
font-medium text-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden`, `ChevronDownIcon
size-4 group-open:rotate-180 transition-transform` (`details` com `group`). Abre abaixo; foco fica no
`summary`.
```

**§5.2 (novo) — inserir após Pagination:**
```
#### Tabela de comparação
`<table class="w-full text-sm tabular-nums">` com `<caption>` (pode ser `sr-only` se houver título
visível), `th scope="col"` por item comparado (`min-w-36`, quebra linha) e `th scope="row"` por
atributo (`sticky left-0 min-w-28 bg-surface`, opaco). Células `px-3 py-3`, linhas `divide-y
divide-border`.
- Linha que difere: `bg-primary-soft` na linha inteira (inclusive o `th` sticky) + `border-l-4
  border-primary` no `th` + `<span class="sr-only">, diferente entre os quartos</span>`; legenda
  visível acima ("Linhas marcadas mudam entre os quartos.").
- Booleano: `CheckIcon text-success` + `Sim` / `MinusIcon text-fg-subtle` + `Não` (ícones
  `aria-hidden`).
- Largura: a tabela fica numa região `role="region" aria-labelledby tabIndex=0 overflow-x-auto
  rounded-card border border-border` (rola só ela; exceção de reflow para tabela de dados) com a dica
  `Arraste para o lado para ver todos.` (`text-sm text-fg-subtle lg:hidden`).
- Filtro "Mostrar só diferenças": `Checkbox` acima; anúncio `sr-only aria-live` com a contagem de
  linhas visíveis.
```

**§5.3 Dialog — substituir o item "Tamanhos:" por:**
```
- Tamanhos: `sm` (`max-w-sm`, confirmações), `md` (`max-w-lg`, termos), `full` (lightbox, F4):
  `fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none rounded-none bg-fg text-fg-on-primary
  animate-fade-in`; header `h-14 px-4` sem borda (h2 `text-base font-semibold truncate`), corpo
  `flex-1 min-h-0` sem padding (imagem `object-contain`), footer `h-16 px-4
  pb-[env(safe-area-inset-bottom)]` com `IconButton overlay` "Foto anterior"/"Próxima foto" nas pontas
  e contador central `w-28 text-center tabular-nums aria-live="polite"`. Anel de foco branco (§1.1).
  Sem fechar no backdrop (não há backdrop visível). Foco inicial no controle principal ("Próxima foto").
```

**§5.3 HotelCard / RoomCard — acrescentar ao fim:**
```
- **RoomCard (F4)**: `Card static` com a geometria do HotelCard (vertical no mobile, horizontal `sm+`).
  Ordem: foto (`alt=""`) → h3 nome → descrição → fatos (`45 m²` · `Até 3 hóspedes` · camas, ícones
  `size-4`) → até 4 comodidades + `<details>` "+N comodidades" → linha de cancelamento → bloco de
  preço (total grande, diária exata) → motivo de bloqueio (se houver) → botão (`fullWidth`, `sm:w-56
  sm:ml-auto`). Estados de botão: "Selecionar quarto" (primary), "Escolher datas" (secondary),
  "Esgotado"/bloqueado (`aria-disabled` + motivo). Nome acessível do botão inclui o quarto
  (`sr-only` ": {nome}"). Selecionando: `selected` (`ring-1 ring-primary`) + `loading`.
- **SimilarHotelCard (F4)**: `Card interactive` compacto; `< sm` horizontal (foto `w-24
  aspect-square`), `sm+` vertical (foto `aspect-[4/3]`); nome `text-base line-clamp-2`, `RatingScore
  sm` sem rótulo, `PriceTag nightly-line`, badge de disponibilidade.
```

**§6.4 Vazio — acrescentar linhas à tabela (e trocar a de "Hotel sem avaliações"):**
```
| Hotel sem comentários | `Ainda sem comentários` | `Este hotel ainda não recebeu comentários de hóspedes.` | — |
| Hotel sem quartos | `Nenhum quarto para reserva` | `Este hotel ainda não tem quartos cadastrados. Veja hotéis parecidos na mesma região.` | link `Ver hotéis similares` |
| Similares vazio | — | `Nenhum outro hotel em {destino}.` | `Fazer nova busca` |
```

**§6.5 Erro — acrescentar linhas à tabela:**
```
| Erro de renderização do hotel | h1 `Não foi possível abrir o hotel` · `Tente de novo ou faça uma nova busca.` | `Tentar de novo` + `Fazer nova busca` |
| Quartos não carregaram | `Não foi possível carregar os quartos.` · `Verifique sua conexão e tente de novo.` | `Tentar de novo` |
| Avaliações offline na troca de página | Alert warning (`WifiOffIcon`): `Você está sem internet.` · `As avaliações aparecem assim que a conexão voltar.` | — |
| Similares não carregaram (recomendação) | `Não foi possível carregar hotéis similares.` | link `Ver hotéis em {destino}` (sem retry) |
| Foto do lightbox quebrada | `Não foi possível carregar esta foto.` | — (setas seguem) |
```

**§6.6 Disponibilidade — acrescentar linhas à tabela:**
```
| Quarto pequeno para a busca (F4) | Texto `text-fg-muted` com `InfoIcon` + botão `aria-disabled`, sem total | `Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.` |
| Menos quartos que a busca (F4, por quarto) | Badge `warning` + botão `aria-disabled`, sem total | Badge `Só 2 disponíveis` · `Sua busca pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.` |
| Hotel esgotado (F4, topo de Quartos) | Alert `warning` com link | `Este hotel está esgotado nestas datas` · `Veja opções parecidas na mesma região.` · `Ver hotéis similares` |
| Sem datas no detalhe (F4) | Alert `info` + formulário aberto; botão do quarto `Escolher datas` | `Escolha as datas para reservar` · `Com as datas e os hóspedes, mostramos o preço total e a disponibilidade de cada quarto.` |
```

**§6.8 Sucesso e outros — substituir o item "Política de cancelamento" e o de `aria-label`s por:**
```
- Política de cancelamento: `free` → `Cancelamento grátis` (badge success) · `moderate` → `Cancelamento com
  reembolso parcial` (badge neutral) · `strict` → `Sem reembolso em caso de cancelamento` (badge warning).
  Regras (texto ilustrativo, F4, em `<details>` "Ver regras de cancelamento"):
  `free`: `Cancele grátis até 48 horas antes do check-in.` · `Depois desse prazo, cobramos a primeira
  diária.` · `Se você não comparecer, cobramos a primeira diária.`
  `moderate`: `Cancele até 7 dias antes do check-in e receba 50% do valor de volta.` · `Depois desse
  prazo, não há reembolso.`
  `strict`: `Esta tarifa não tem reembolso em caso de cancelamento.` · `Mudança de datas depende de
  disponibilidade e pode ter custo.`
- Horários: `Check-in` `A partir de 15:00` · `Check-out` `Até 12:00`.
- Comodidades de quarto: `Vista para o mar` · `Vista para a cidade` · `Vista para o jardim` · `Varanda` ·
  `Terraço` · `Banheira` · `Frigobar` · `Cofre` · `Ar-condicionado` · `Mesa de trabalho` · `Cozinha` ·
  `Sala de estar` · `Sistema de som` · `Mordomo` · `Acesso à piscina` · `Jardim privativo` · `Acesso ao lounge`.
- Camas: `cama de solteiro` · `cama de casal` · `cama queen` · `cama king` · `cama twin` · `sofá-cama`
  (plurais `camas de solteiro`, `sofás-camas`…; junção `1 cama king e 1 sofá-cama`).
- `aria-label`s padrão: `Fechar`, `Fechar notificação`, `Limpar destino`, `Foto anterior`, `Próxima foto`,
  `Abrir foto {n} de {total}`, `Página {n}`, `Diminuir {campo}`, `Aumentar {campo}`, `Copiar link do hotel`,
  `Paginação`, `Você está aqui`, `Seções da página`, `Fechar filtros`, `Mapa: {endereço}`.
```

**§8 Inventário — substituir as linhas de atoms/molecules/organisms/feature por:**
```
| atoms | Button (+ButtonLink), IconButton, Input, Select, Checkbox, Radio, Badge, Stars, Skeleton, Spinner, PriceTag, RemoteImage, icons | F1 (PriceTag nasce na F3; PriceTag e RemoteImage sobem na F4) |
| atoms | Range (estilo do `input type="range"` nativo) · Avatar | F3 · F4 (na feature até o 2º uso) |
| molecules | Field, Stepper, Alert, Card, RatingScore, Breadcrumb, Pagination, EmptyState, ErrorState, DateRange, Combobox, Disclosure (+ cabeçalho e nativo), Tabela de comparação | F1 (Combobox/DateRange na F2; Card, RatingScore e Disclosure na F3, sobem na F4; Breadcrumb e Tabela de comparação nascem na F4 e ficam na feature até o 2º uso) |
| organisms | Dialog (`placement: "center" \| "sheet"`, `size: "sm" \| "md" \| "full"`), Drawer = Dialog sheet, ErrorBoundary, Toast/Toaster, Header, Footer | F1 (sheet e ErrorBoundary na F3; `full` na F4) |
| feature | HotelCard, RoomCard, SimilarHotelCard, Gallery/Lightbox, SectionNav, PriceBreakdown, StepIndicator | F3–F5, compondo os acima |
```

## Ajustes pós-revisão (rodada de correções)

- **Foco depois de enviar datas**: o formulário marca o destino com `markFocusAfterNavigation(href)`
  (`shared/lib/focus-after-navigation`) **só no envio válido** (dentro de `getSubmitHref`); a página consome o
  sinal em toda montagem/mudança de critérios e só foca o h2 "Quartos" se `pathname+search` já é o destino.
  Critérios idênticos não marcam. A hotel-search tem o padrão antigo (`pendingEdit`) e migra depois.
- **`todayISO()`** usa sempre `America/Sao_Paulo` (o servidor roda em UTC).
- **Datas passadas**: estado `past-dates` em `roomSelectability` (ver Decisão 7). O painel de datas é
  controlado por `StayEditProvider` (barra da estadia e botões dos quartos compartilham o estado).
- **Clique fantasma**: ao fechar o painel por envio, cliques em "Alterar datas e hóspedes" nos 600 ms
  seguintes são ignorados (o conteúdo sobe sob o ponteiro e um 2º clique não reabre o painel).
- **Hotel esgotado** (`availableRooms === 0`): o `Alert` vem **antes** do formulário de datas (RSC); o de
  "todos os quartos esgotados" segue em `RoomsSection`. Motivos `too-small`/`insufficient` só sugerem "outro
  quarto/tipo" se o hotel tem mais de um tipo.
- **Avaliações**: erro após trocar de página foca "Tentar de novo"; offline = só o aviso, depois da paginação
  (sem spinner nem opacidade); ao voltar online o foco só vai ao h2 se ainda estiver dentro da seção.
- **Cold start**: o aviso "Está demorando mais que o normal…" do `loading.tsx` está no HTML (região
  `role="status"`) e é revelado por CSS (`animate-slow-notice`, 5 s), sem depender de hidratação.
- **Mapa**: tiles invisíveis até `onLoad` (`MapTile`); falha deixa o fundo cinza com o marcador.
- **Comparação**: `ComparisonTable` extraída; se **todas** as linhas diferem, só o marcador (sem faixa);
  hífen sem quebra nos rótulos ("Ar‑condicionado").
- **Lightbox**: arrastar na horizontal (≥ 50 px) troca a foto (`useSwipe`/`swipeAction`); setas e teclado
  seguem. A troca é instantânea (nada a reduzir em `prefers-reduced-motion`).
- **Mobile 320 px**: "Ver quartos" não quebra; "Copiar link" vira só ícone abaixo de ~360 px; a barra de
  seções esmaece na borda direita; o separador de `RatingScore` fica com o item anterior.
- **Similares**: cards com altura uniforme na linha. **Schema**: `latitude` ∈ [-90, 90], `longitude` ∈ [-180, 180].
