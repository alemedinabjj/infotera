# F7c — Extras de Next.js (PPR, ISR, Parallel/Intercepting Routes, Server Actions, Edge)

## Objetivo

Cobrir a seção "Next.js" do enunciado (Partial Prerendering, Server Actions, Parallel Routes para
modals, ISR, Edge Runtime) só onde cada recurso resolve um problema real deste app. O foco é a
página do hotel: ela vira uma casca estática prerenderada e revalidada (60 hotéis no build), com só
o que depende da estadia (datas, total, "Selecionar") entrando por streaming. Também abre a galeria
como modal com URL própria. Checkout e confirmação continuam dinâmicos por segurança e privacidade,
e isso agora é verificado no build.

> Base: doc do Next **16.4.6** em `node_modules/next/dist/docs/`. Antes de mudar qualquer coisa,
> leia: `03-api-reference/05-config/01-next-config-js/cacheComponents.md`,
> `02-guides/incremental-static-regeneration-cache-components.md`, `03-api-reference/01-directives/use-cache.md`,
> `03-api-reference/04-functions/cacheLife.md`, `03-api-reference/03-file-conventions/{parallel-routes,intercepting-routes}.md`,
> `.../02-route-segment-config/{runtime,instant,ensureStatic}.md`, `02-guides/{content-security-policy,preserving-ui-state,adopting-partial-prefetching,prefetching,building}.md`,
> `03-api-reference/07-edge.md`, `02-guides/upgrading/version-16.md` (seção `middleware` → `proxy`).

## Escopo

**Dentro**
- **PPR** (`cacheComponents: true` + `partialPrefetching: true`): uma casca estática por rota, com
  buracos dinâmicos. A forma de cada rota fica escrita e conferida no build (tabela da Decisão 2).
- **ISR**: `/hotel/[hotelId]` com `generateStaticParams` (todos os ids que a API lista, hoje 60) e
  `"use cache"` + `cacheLife` nos dados do catálogo, com revalidação em segundo plano.
- **Parallel + Intercepting Routes**: galeria do hotel em `/hotel/[id]/photos/[n]`. Por navegação
  interna abre como modal sobre a página. Num reload ou link compartilhado vira página cheia.
  Voltar do navegador fecha o modal.
- **Server Actions**: a única mutation da API (`POST /bookings`) já é Server Action (F5, Decisão 1
  de lá). Aqui entram o reforço (`bodySizeLimit`), a verificação sob `cacheComponents` e a
  justificativa de não usar Server Action em mais nada.
- **Compatibilidade com Activity** (efeito colateral do `cacheComponents`): estado transitório e dado
  de pagamento não podem sobreviver em rota escondida.
- **Prefetch por intenção** no card da F3, trocando o prefetch do TanStack pelo da rota prerenderada.
- **E2E contra build de produção** (`@prod`): PPR/ISR só existem em `next build` + `next start`.

**Fora (e por quê)**
- **Edge Runtime: avaliado e descartado** (Decisão 9). No 16.4 o `runtime = 'edge'` está
  *deprecated*, é **incompatível com `cacheComponents`** e o Proxy roda só em Node. Precisamos
  escolher entre Edge e PPR, e PPR vale mais aqui. Proposta ao orquestrador: atualizar a linha do
  TEST_MAP (Edge passa de ✅ para "avaliado, descartado com justificativa").
- **PPR na home**: a home não tem nada por request no servidor. Ela já é estática (`○`), e
  "aplicar PPR" ali seria só decoração.
- **Comparação de hotéis como modal (rota interceptada)**: o contrato da F7a ainda está aberto. Uma
  tabela de 3 colunas num modal em 320 px fica pior que uma página. Fica uma Parallel Route bem
  feita (galeria).
- **`cacheTag`/`revalidateTag`/`updateTag`**: nenhuma mutation da mock-api muda o catálogo.
  `POST /bookings` não decrementa `available` (verificado no `mock-api/README.md`). Uma
  invalidação sem gatilho real seria decorativa.
- **Cachear dados da F6 (hotel/quarto na confirmação)**: dá para fazer sem PII, mas mexe numa rota
  sensível sem ganho que se perceba. Fica como está.
- **OG image / `ImageResponse`**: não está no enunciado.
- **`@next/playwright` `instant()`**: é experimental e exige `exposeTestingApiInProductionBuild`. Os
  E2E `@prod` cobrem o necessário com Playwright puro.

**Pré-condições (contrato com F7a/F7b, que entram antes)**
- Nenhuma leitura de `cookies()`/`headers()` no layout raiz ou em layout compartilhado fora de
  `<Suspense>`. Se a F7b resolver o idioma por cookie no servidor, todas as rotas viram dinâmicas
  e o PPR morre. A tarefa 1 audita isso. Se acontecer, volta para a F7b (idioma no cliente ou
  segmento `[locale]` com `generateStaticParams`).
- O service worker da F7b não guarda HTML de `/checkout` nem de `/confirmation/*` (nonce e PII).
- Componentes da F7a no header (contador de favoritos/comparação) leem `localStorage` em efeito ou
  em `useSyncExternalStore` com snapshot de servidor, nunca durante o render no servidor.

## Decisões

1. **Ligar `cacheComponents` (revoga a Decisão 5 da F0) com `partialPrefetching: true`.**
   No 16.x, PPR **é** `cacheComponents`: `experimental.ppr` e `experimental_ppr` foram removidos. A
   doc pede `partialPrefetching` explícito, e deixar sem valor gera warning. A F0 desligou porque
   todo dado era por request. Isso deixou de valer com a F4: hotel, quartos, avaliações e similares
   são catálogo, iguais para todo mundo e quase imutáveis (seed). O custo é a regra "dado não
   cacheado ou de request só dentro de `<Suspense>`", e o build passa a validar isso por rota, o que
   na prática é uma garantia a mais. Descartados: (a) manter desligado e usar ISR "clássico"
   (`export const revalidate`). Funciona, mas não entrega PPR, que é um dos itens pedidos, e o modelo
   antigo está a caminho de ser removido. (b) `ensureStatic = 'navigation'` na página do hotel: os
   critérios da estadia são `searchParams`, e `'navigation'` proíbe dado de request mesmo dentro de
   Suspense.

2. **Forma de cada rota, conferida no build** (símbolos de `02-guides/building.md`):

   | Rota | Esperado | Por quê |
   |---|---|---|
   | `/` | `○` | Nada por request no servidor (formulário e últimas buscas são cliente) |
   | `/search` | `◐` | Casca = layout + `loading.tsx`. A lista é cliente e depende da URL |
   | `/hotel/[hotelId]` + `/hotel/1…60` | `◐` | Catálogo prerenderado. Buracos só para a estadia (Decisão 4) |
   | `/hotel/[hotelId]/photos/[photo]` | `◐` | Casca de fallback. O conteúdo é do cache do catálogo |
   | `/checkout` | **`ƒ`** | Nonce da CSP (Decisão 7): casca vazia de propósito |
   | `/confirmation/[bookingId]` | `◐` | Casca = layout + skeleton, **sem PII**. A reserva é sempre por request |

3. **Dados do catálogo em funções `"use cache"` da feature `hotel-details`, nunca TanStack no
   servidor.** Arquivo `features/hotel-details/api/catalog.cached.ts`:
   - `getHotelSnapshot(id)` → `{ kind: "found"; hotel } | { kind: "not-found" }`, `cacheLife("hours")`
   - `getHotelRoomsSnapshot(id)` → `Room[]`, `cacheLife("minutes")` (disponibilidade é o campo volátil)
   - `getFirstReviewsSnapshot(id)` → `{ page: ReviewsPage; fetchedAt: number }`, `cacheLife("hours")`
   - `getSimilarHotelsSnapshot(destination, excludeId)` → `Hotel[]`, `cacheLife("hours")`

   Os perfis são os presets da doc: `hours` = stale 5 min / revalidate 1 h / expire 1 dia;
   `minutes` = 5 min / 1 min / 1 h. Os dois ficam acima dos limiares que tirariam o dado da casca
   (`cacheLife.md`, "Prerendering behavior"). Na prática a página do hotel revalida em segundo plano
   no máximo 1×/min quando é visitada (ISR).
   Por que não o `HydrationBoundary` + `dehydrate` da F4: o `dehydrate` e o `setQueryData` do
   TanStack chamam `Date.now()` (verificado em `@tanstack/query-core/build/modern/hydration.js:63`,
   `query.js:588`). Com `cacheComponents`, isso na parte estática quebra o prerender com
   `blocking-prerender-current-time`. O mesmo vale para `useSuspenseQuery` com dado em client
   component durante o prerender (`utils.js:34`, `timeUntilStale`), que dá
   `blocking-prerender-current-time-client`. Regras que saem disso:
   - **A casca é RSC renderizado a partir de snapshot em cache.** Ilhas cliente recebem os dados
     por props.
   - **Ilha que lê TanStack no render fica dentro de `<Suspense>`** com fallback que não desloca nada
     (a correção documentada, "[stream] Wrap the Client Component in Suspense"). Só sobra uma: o
     paginador de avaliações (Decisão 4).
   - **Erro nunca vai para o cache.** A função `use cache` só retorna sucesso ou `not-found`. Qualquer
     outra falha é relançada e o `try/catch` fica **fora** do escopo cacheado (similares). Se o
     fallback "Não foi possível carregar…" fosse renderizado dentro do cache, ele seria servido por
     1 hora.
   - **Fora do `use cache`, nada de `instanceof ApiError`.** Erros que atravessam a fronteira do
     cache podem chegar reembrulhados. A classificação 404 → `not-found` é feita **dentro**.
   - `fetchedAt = Date.now()` é lido **dentro** do escopo cacheado (permitido: "cache the value").
     Vira `initialDataUpdatedAt` no cliente, para o TanStack saber a idade real do snapshot.

   Descartados: (a) `unstable_cache`, que está *deprecated* no modelo novo; (b) `fetch` com
   `next.revalidate`, que no modelo novo não entra na casca e espalharia config por `http.ts`;
   (c) `staleTime: "static"` para fugir do `Date.now()`, que mentiria sobre a idade dos dados no
   cliente.

4. **Página do hotel = casca estática + 3 tipos de buraco, todos a partir de uma única promessa de
   critérios.** O `page.tsx` cria `const criteria = searchParams.then(toStayCriteria)` **sem `await`**
   e passa a promessa para a feature. No prerender, `searchParams` nunca resolve, então tudo o que
   espera essa promessa vira fallback na casca. Por request, resolve na hora.
   - **Na casca (estático, do cache):** breadcrumb (com o link de resultados em fallback),
     cabeçalho (nome, nota, endereço, "a partir de" via `lowestNightlyPrice(rooms)` no servidor),
     galeria (agora RSC, Decisão 6), visão geral, comodidades, políticas, mapa, **cards de quarto com
     tudo o que é do quarto** (foto, specs, comodidades, diária, selo de escassez/esgotado),
     comparação de quartos (`RoomComparison` cliente recebe `rows` prontos por props), 1ª página de
     comentários (RSC) e hotéis similares.
   - **Buraco 1, `HotelStayBar`** (RSC async dentro de Suspense): resumo da estadia, aviso "Escolha
     as datas" e o slot do `SearchForm` com `initialCriteria`. O fallback é um skeleton da mesma altura.
   - **Buraco 2, `RoomStayAction`** (cliente, `use(criteria)`, um Suspense por quarto): total da
     estadia (`stayTotal`) + botão (`roomSelectability`, switch exaustivo da F4) + motivo. O fallback
     é um skeleton com as alturas do total (`min-h-5`) e do botão (`h-11`).
   - **Buraco 3, links com critérios** (`StayAwareLink`, RSC async): o fallback é **o mesmo link sem
     critérios**. É usado no breadcrumb e nos cards de similares. Nenhum pixel muda.
   - **Avaliações:** a página 1 é RSC na casca. O `ReviewsPager` (cliente, TanStack,
     `useSuspenseQuery` + `startTransition` da Decisão 9 da F4) fica em
     `<Suspense fallback={<ReviewList page={first} />}>` com `initialData` = página 1 e
     `initialDataUpdatedAt = fetchedAt`. Visualmente é idêntico. A paginação continua igual.

   Descartados: (a) ler critérios com `useSearchParams` em cada ilha. Funciona, mas espalha o parse
   da URL pelo cliente e a F4 decidiu "critérios lidos no servidor" (Decisão 5 de lá). (b) A seção de
   quartos inteira como buraco: o conteúdo principal da página sairia da casca. (c) `await
   searchParams` no topo da página: a rota inteira vira buraco e o PPR não serve para nada.

5. **ISR: `generateStaticParams` com todos os ids da API, com retry no build.**
   `listPrerenderHotelIds()` faz `GET /hotels?_sort=id&_order=asc` (sem `_page`, a API devolve todos,
   hoje 60). Valida com `z.array(hotelSchema)` e devolve `[{ hotelId: "1" }, …]`. Com
   `cacheComponents`, `generateStaticParams` **precisa** devolver ≥ 1 item (`generate-static-params.md`,
   "With Cache Components"). Lista vazia vira erro com mensagem em pt-BR, nunca `[]`. Por que todos e
   não um subconjunto "popular" (a doc sugere subconjunto para catálogos grandes): são 60 páginas,
   ~240 GETs no build, e assim todo hotel real abre da casca completa. Id que não está na lista
   (`/hotel/61`) recebe a casca de fallback e é gerado sob demanda (sem `dynamicParams`, que foi
   removido no modelo novo). **Retry com backoff** (`withRetry` + `backoffDelays`, puros, em
   `model/build-retry.ts`): 8 tentativas, 2 s → 15 s, ~1,5 min no total. Cada tentativa é logada como
   `Aguardando a mock-api (tentativa 2/8)…`. Isso absorve o cold start do Render no build da Vercel e
   a mock-api subindo em paralelo no Playwright. Esgotou → erro
   `Não foi possível listar os hotéis para o build: a mock-api em <url> não respondeu. Suba a API (cd mock-api && npm run server) ou confira NEXT_PUBLIC_API_URL.`
   **Trade-off assumido:** `npm run build` passa a precisar da API no ar (vai para o `CLAUDE.md`
   raiz e para o README). Descartados: script `prebuild` separado (`.mjs` sem tipos, fora do
   lint/strict; a retry dentro do TS é testável); ler ids do `db.seed.json` (o prerender de cada
   página chama a API de qualquer jeito, e ler arquivo do mock fere "somente a mock-api").

6. **Galeria como Parallel + Intercepting Route.**
   ```
   app/hotel/[hotelId]/layout.tsx                         {children}{modal}
   app/hotel/[hotelId]/@modal/default.tsx                 null
   app/hotel/[hotelId]/@modal/(.)photos/[photo]/page.tsx  modal (Dialog size="full" + PhotoViewer)
   app/hotel/[hotelId]/@modal/(.)photos/[photo]/loading.tsx · error.tsx
   app/hotel/[hotelId]/photos/[photo]/page.tsx            página cheia (h1 + PhotoViewer)
   app/hotel/[hotelId]/photos/[photo]/loading.tsx · not-found.tsx
   ```
   O ganho é real, não decorativo: Voltar do navegador fecha o modal (é o que se espera no celular,
   onde o lightbox ocupa a tela toda). A foto tem URL compartilhável. Reload mantém o contexto.
   Sem JS, as miniaturas são links que funcionam (melhoria progressiva).
   - `[photo]` é **1-based** (`/photos/3` = 3ª foto). `parsePhotoParam(raw, total)` é puro: só
     `^[1-9]\d{0,2}$` dentro de `1..total`. O resto vira `notFound()` na página cheia e `null` no
     modal.
   - **Setas não navegam:** `PhotoViewer` (cliente, usado no modal **e** na página cheia) troca o
     índice em estado local e chama `window.history.replaceState(null, "", photoHref(id, i))`. O Next
     integra `replaceState` ao router (`linking-and-navigating.md`, "Native History API"). Seta fica
     instantânea, sem request RSC. Reload abre a foto atual. Voltar continua levando ao hotel. Isso
     também **evita a armadilha da interceptação**: um `<Link>` para `/photos/4` dentro da página
     cheia seria interceptado e abriria o modal por cima da própria página.
   - **Fechar** = `dialog.close()` → foco no gatilho registrado → `router.back()`. Voltar do
     navegador desmonta o modal sem `close()`, então o cleanup do `PhotoModal` também devolve o foco.
     O gatilho é registrado por `PhotoLink` (cliente, folha) no `onClick` (`data-photo-opener`). O
     Safari não foca link no clique, por isso não dá para confiar em `document.activeElement`.
   - Os links das fotos **não carregam critérios**. Foto é do hotel, não da estadia. `router.back()`
     volta para a URL anterior com critérios. Na página cheia, "Voltar para o hotel" vai para
     `/hotel/{id}`. Trade-off documentado: reload na foto + "Voltar para o hotel" perde as datas.
     Carregar os critérios faria a galeria (LCP) depender de `searchParams` e sair da casca.
   - `Link` das miniaturas com `scroll={false}`, para abrir o modal sem rolar a página.
   - `useLightbox`/`Lightbox` da F4 são substituídos por `PhotoViewer` + `PhotoModal`. As regras
     puras (`galleryNavigation`, `galleryKeyAction`, `photoAlt`, `photoCounter`) continuam.

   Descartados: (a) manter o lightbox só em estado. Sem URL, Voltar sai da página do hotel em vez
   de fechar a foto, que é o problema que mais irrita no celular. (b) Lightbox em estado +
   `pushState` para `/photos/n` sem interceptação: reload numa URL que não existe como rota, e não é
   Parallel Route. (c) `?foto=3` como search param: não dá para interceptar e faria a página do hotel
   depender de `searchParams` para abrir a galeria.

7. **`/checkout` com casca vazia de propósito: `export const instant = false` + o `await connection()`
   que a F5 já faz fora de Suspense.** A doc é explícita: nonce exige renderização por request, e
   "PPR is incompatible with nonce-based CSP" (`content-security-policy.md`). Com `cacheComponents`,
   todo `page` precisa produzir casca não vazia, a não ser que o `instant` mais alto da árvore seja
   `false` (`instant.md`, "Disabling static shell validation"). Então: `page.tsx` do checkout exporta
   `instant = false`, o `connection()` bloqueia antes de qualquer HTML, a rota sai `ƒ` e todo
   `<script>` recebe o nonce. **Regra nova em `app/CLAUDE.md`:** nunca criar `loading.tsx` nem
   `<Suspense>` acima do `connection()` do checkout (nem `app/loading.tsx`). Isso criaria uma casca
   estática sem nonce. O E2E `@prod` do nonce é o guarda. Descartado: `ensureStatic = false`, que só
   impede outro segmento de exigir estático e não libera a casca vazia.

8. **Server Actions: continua uma só (`createBookingAction`, F5), agora com teto de corpo.**
   `experimental.serverActions.bodySizeLimit: "64kb"` (o padrão é 1 MB). A maior entrada possível
   (`SEARCH_LIMITS` × hóspedes com nome/documento/idade + contato + cupom) fica bem abaixo de 16 KB,
   então 64 KB deixa folga sem convidar abuso. `allowedOrigins` fica sem valor: Vercel repassa
   `x-forwarded-host` e a checagem de `Origin` padrão basta (`serverActions.md`). Sem mais actions:
   - **Favoritos, comparação, histórico (F7a)** vivem no dispositivo (`localStorage`). Não existe
     endpoint para eles na mock-api, e inventar um é proibido. Uma action precisaria de um store no
     servidor (cookie ou memória). Com cookie, toda página que mostra o coração leria `cookies()` e
     viraria dinâmica, matando o PPR. Com memória, os dados se perderiam em cada instância serverless.
   - **`updateTag` após a reserva:** a API não altera disponibilidade (Escopo).

9. **Edge Runtime: não usar, com evidência.** (1) `runtime.md`: `'edge'` está *deprecated*.
   (2) `cacheComponents.md`: "does not support the `runtime` route segment config. Remove any
   `runtime` export, including `runtime = 'nodejs'` and the deprecated `runtime = 'edge'`".
   (3) `proxy.md`/`version-16.md`: o Proxy roda em Node e não aceita `runtime`. O único caminho
   edge que sobra é o `middleware.ts` legado, que conflita com o `src/proxy.ts` da F5. (4) `07-edge.md`:
   Edge não suporta ISR. Candidatos avaliados: proxy de `/suggestions` (a mock-api já libera CORS,
   então seria um salto a mais sem ganho) e OG image (fora do enunciado). O que dá para defender é a
   escolha em si: PPR + ISR resolvem latência e cold start do Render melhor que Edge, porque a página
   sai do cache sem tocar na API. Vai para o README como "avaliado e descartado".

10. **Activity: preservar o que é útil, zerar o que é transitório ou sensível.** Com
    `cacheComponents`, o Next esconde rotas (`display: none`) em vez de desmontar. Até 3 rotas ficam
    preservadas (`preserving-ui-state.md`).
    - **Ganho que fica:** voltar de `/hotel/x` para `/search` mantém filtros, feed carregado e scroll.
    - `useResetOnHide(reset)` (shared/hooks: `useLayoutEffect` cujo cleanup chama `reset`, o padrão
      da doc). Aplicado em: drawer de filtros da F3, listbox do combobox da F2, termos da F5.
    - **Pagamento:** no checkout, ao esconder (ex.: clique no logo), os campos de cartão, validade
      e CVV são zerados com `resetField`. A saída para a confirmação passa a ser
      `assignLocation(\`/confirmation/${id}\`)` (carga de documento, helper da F5), o que descarta o
      heap da página que tinha o cartão. Cartão nunca fica em DOM escondido.
    - Descartado: `bfcacheId` como `key` no layout raiz. A doc chama de "ferramenta de migração", e
      ele zeraria também o ganho de `/search`.

11. **Prefetch por intenção no card da F3** (padrão da doc, `prefetching.md`, "Hover-triggered
    prefetch", variante com Partial Prefetching): `prefetch={intent ? true : "auto"}`. A `intent`
    liga em `pointerenter`/`focus`/`touchstart`. `"auto"` prefetcha só a casca genérica (barata e
    compartilhada). `true` traz o conteúdo cacheado daquele hotel antes do clique. O
    `usePrefetchHotel` (TanStack `hotelQueryOptions` + `hotelRoomsQueryOptions`) sai, porque a
    página do hotel não lê mais esses caches. Descartado: `prefetch={true}` em todos os cards, que
    custa 1 request por card na viewport (a doc desaconselha em grade).

12. **E2E de produção (`npm run test:e2e:prod`).** Em `next dev` não há prerender nem prefetch, então
    PPR, ISR e o nonce sob `cacheComponents` só podem ser provados contra `next build && next start`.
    `E2E_PROD=1` troca o `webServer` do front para `npm run build && npm run start` (a API sobe em
    paralelo e a retry da Decisão 5 cobre a ordem). Os testes `@prod` rodam com `--grep @prod`. O
    `.next/prerender-manifest.json` é lido com Zod (`unknown` → schema mínimo) para afirmar o que
    foi e o que não foi prerenderado.

## Contrato de dados

| Uso | Endpoint | Schema | Onde | Cache |
|---|---|---|---|---|
| Ids para o build | `GET /hotels?_sort=id&_order=asc` | `z.array(hotelSchema)` | `listPrerenderHotelIds` (build, sem cache, com retry) | — |
| Hotel | `GET /hotels/:id` (404 → `not-found`) | `hotelSchema` | `getHotelSnapshot` | `hours` |
| Quartos | `GET /rooms?hotelId=:id` | `z.array(roomSchema)` | `getHotelRoomsSnapshot` | `minutes` |
| Comentários p.1 | `GET /reviews?hotelId=:id&_page=1&_limit=5&_sort=date,id&_order=desc,desc` | o da F4 (`fetchReviewsPage`) | `getFirstReviewsSnapshot` | `hours` |
| Comentários p.≥2 | idem com `_page=n` | idem | `reviewsQueryOptions(id, n)` no cliente (inalterado) | TanStack |
| Similares | `GET /hotels?destination=<exato>&id_ne=:id&_sort=rating,reviewCount&_order=desc,desc&_limit=4` | `z.array(hotelSchema)` (`fetchSimilarHotels`) | `getSimilarHotelsSnapshot` | `hours` |
| Reserva | `POST /bookings` | inalterado (F5) | `createBookingAction` | — (sem cache, sem retry) |

- Todas as funções `use cache` reaproveitam os `fetch*` existentes (`shared/api/endpoints.ts`,
  `features/hotel-details/api/{reviews,similar}.ts`): o Zod continua na fronteira.
- Tipos: `HotelSnapshot = { kind: "found"; hotel: Hotel } | { kind: "not-found" }` (renomeia o
  `LoadedHotel`). `FirstReviews = { page: ReviewsPage; fetchedAt: number }`.
- Query keys: nenhuma nova. `reviewsQueryOptions` continua a única usada na página do hotel.
  `hotelQueryOptions`/`hotelRoomsQueryOptions` continuam em `shared` para F5/F7a.
- Puros novos: `toStayCriteria(raw): SearchCriteria | null`, `parsePhotoParam(raw, total): number | null`
  (índice base 0), `photoHref(hotelId, index): string` (`/hotel/1/photos/3`),
  `toPrerenderParams(hotels): { hotelId: string }[]` (ordena, deduplica e lança se vazio),
  `backoffDelays(attempts, baseMs, maxMs): number[]`,
  `withRetry(fn, { delays, sleep, onRetry }): Promise<T>`.
- `next.config.ts`: `cacheComponents: true`, `partialPrefetching: true`,
  `experimental.serverActions.bodySizeLimit: "64kb"`. Nada de `cacheLife` customizado: só presets.

## Critérios de aceite

**Build e forma das rotas**
1. Dado a mock-api no ar, quando rodo `npm run build`, então a saída lista `○ /`, `◐ /search`,
   `◐ /hotel/[hotelId]` com linhas `◐ /hotel/1`… (60 ids, agrupados como o Next imprimir),
   `◐ /hotel/[hotelId]/photos/[photo]`, **`ƒ /checkout`** e `◐ /confirmation/[bookingId]`. Nenhuma
   rota com `runtime` e nenhum warning de Edge.
2. Dado o build pronto, então `.next/prerender-manifest.json` tem `/hotel/1` a `/hotel/60` em
   `routes` e não tem nenhuma rota concreta começando com `/checkout` ou `/confirmation/`.
3. Dado a API fora do ar, quando rodo `npm run build`, então o log mostra
   `Aguardando a mock-api (tentativa n/8)…` e, ao esgotar, o build falha com a mensagem da Decisão 5
   (sem stack de `ApiError` como única pista).
4. Dado a API subindo atrasada (até ~60 s), quando rodo o build, então ele completa.

**PPR na página do hotel (prod)**
5. Dado `/hotel/1?<critérios válidos>` com **JavaScript desligado**, então ficam visíveis: o h1
   "Hotel Copacabana Palace", a foto principal, os nomes e diárias dos quartos, "a partir de R$ 800",
   a tabela "Comparar quartos" (fechada), os comentários da 1ª página e os nomes dos similares. Os
   lugares do total da estadia e do botão "Selecionar quarto" mostram skeleton (`aria-hidden`).
6. Dado a mesma URL com JS, então o resumo da estadia, os totais (`stayTotal` × noites × quartos) e
   os botões aparecem sem mudar a posição de nada acima deles (CLS 0 medido pelo
   `PerformanceObserver` `layout-shift` no E2E). Os links "Resultados" e dos similares passam a
   carregar os critérios.
7. Dado `/hotel/1` sem critérios, então "Escolha as datas para reservar" e o formulário aberto
   aparecem (comportamento da F4 mantido) e cada quarto mostra "Escolher datas".
8. Dado `/hotel/61` (id inexistente), então chega a casca de fallback com skeleton e, em seguida,
   "Hotel não encontrado" (status 200 + `noindex`, como a Decisão 2 da F4). Dado `/hotel/abc`, então
   o mesmo, sem nenhum request à API.
9. Dado que troco para a página 2 dos comentários do hotel 18, então funciona como na F4 (página
   atual visível até a próxima chegar, foco no h2, status anunciado).

**ISR**
10. Dado o build pronto e a mock-api **parada**, quando abro `/hotel/1?<critérios>` com
    `npm run start`, então a página abre completa, inclusive totais e "Selecionar quarto"
    (verificação manual registrada no PR; a reserva em si falha com o erro tratado da F5).
11. Dado 1 min e 1 visita depois do build, então a próxima visita ainda responde do cache (sem
    esperar a API) e a revalidação acontece em segundo plano (`x-nextjs-cache` ≠ `MISS` em
    `/hotel/1`; ver Riscos se o header mudar).

**Galeria como rota**
12. Dado `/hotel/1`, quando clico na miniatura "Abrir foto 3 de 5", então a URL vira
    `/hotel/1/photos/3`, abre um `dialog` modal com nome "Fotos de Hotel Copacabana Palace" e o
    contador "Foto 3 de 5", a página do hotel continua por trás, o scroll não muda e o foco entra
    no diálogo.
13. Dado o modal aberto, quando aperto → três vezes, então o contador mostra "Foto 1 de 5" (volta ao
    início), a URL é `/hotel/1/photos/1`, **nenhum** request de navegação/RSC sai, e Home/End vão às
    pontas.
14. Dado o modal aberto (depois de trocar de foto), quando aperto Esc ou "Fechar", então a URL volta
    a ser exatamente a anterior (com critérios), o modal some e o foco vai para a miniatura que o
    abriu.
15. Dado o modal aberto, quando uso Voltar do navegador (desktop e Pixel 7), então o modal fecha e o
    foco vai para a miniatura que o abriu. Quando uso Avançar, então o modal reabre na foto.
16. Dado `/hotel/1/photos/3` aberto por URL ou reload, então aparece a **página cheia**: h1
    "Fotos de Hotel Copacabana Palace", foto 3 de 5 com `alt` "Hotel Copacabana Palace, foto 3 de 5",
    "Foto anterior"/"Próxima foto" (que trocam a foto e a URL sem abrir modal), "Voltar para o hotel"
    (vai para `/hotel/1`) e título da aba "Foto 3 de 5 · Hotel Copacabana Palace | Infotera Hotéis".
17. Dado `/hotel/6/photos/3` (hotel com 2 fotos) ou `/hotel/1/photos/0`, `/photos/abc`, então aparece
    "Foto não encontrada" com link para o hotel. Dado o hotel com 1 foto (caso de teste com fixture),
    então não há setas.
18. Dado a rota da foto carregando (modal ou página), então há skeleton com `aria-busy` e um
    `sr-only aria-live` "Carregando foto…". Dado erro no modal, então aparece `ErrorState`
    "Não foi possível abrir a foto" com "Tentar de novo" e "Fechar".
19. Dado JS desligado, quando clico numa miniatura, então abre a página cheia da foto.

**Checkout, confirmação e Server Action sob `cacheComponents` (prod)**
20. Dado `/checkout` (por carga de documento, com seleção), então existe exatamente 1 header
    `Content-Security-Policy` com `'nonce-…'`, **todo** `<script>` do HTML tem esse nonce, o nonce
    muda a cada reload e não há violação de CSP no console (suíte `checkout.security` da F5 rodando
    também em `@prod`).
21. Dado uma reserva concluída, então vou para `/confirmation/<uuid>` por **carga de documento**, a
    resposta tem `Cache-Control` com `no-store` e, depois de Voltar, nenhum campo de cartão, validade
    ou CVV tem valor.
22. Dado o checkout no passo de pagamento com cartão preenchido, quando clico no logo e depois em
    Voltar, então cartão, validade e CVV estão vazios (nome/e-mail/telefone podem voltar preenchidos,
    como a F5 já persiste).
23. Dado a reserva com 3 quartos e o máximo de hóspedes permitido, então o `POST` da Server Action
    passa com `bodySizeLimit: "64kb"` (E2E da F5 com o caso máximo).

**Activity e prefetch**
24. Dado `/search` com filtros e feed rolado, quando abro um hotel e volto, então filtros, itens
    carregados e posição de scroll são os mesmos.
25. Dado o drawer de filtros aberto (mobile), quando navego por um link e volto, então o drawer está
    fechado. Idem para a lista do combobox da F2 e o modal de termos da F5.
26. Dado `/search` em prod, quando passo o mouse (ou foco) num card, então sai um prefetch de
    `/hotel/<id>` (header `next-router-prefetch`) **só** para esse card, e clicar mostra o conteúdo do
    hotel sem skeleton da página.

**Acessibilidade e mobile**
27. axe (wcag2a/aa) sem violações em: hotel com critérios, modal da foto aberto, página cheia da foto,
    "Foto não encontrada", skeleton da foto.
28. Em 320 px, modal e página da foto sem scroll horizontal. Botões de seta e fechar ≥ 44 px, foco
    visível (anel branco no modal, como a F4), ordem de foco: fechar → anterior → próxima.
29. `prefers-reduced-motion`: sem fade no modal (regra global existente).

**Qualidade**
30. `npm run typecheck && npm run lint && npm run test` verdes. React Doctor sem erro novo. Nenhum
    `any`/`as`/`@ts-ignore`. Nenhum arquivo acima de 250 linhas.

## Arquivos

| Caminho | Responsabilidade |
|---|---|
| `next.config.ts` (alt.) | `cacheComponents`, `partialPrefetching`, `experimental.serverActions.bodySizeLimit` |
| `playwright.config.ts` (alt.) | `E2E_PROD=1` → `npm run build && npm run start` no `webServer` do front |
| `package.json` (alt.) | script `test:e2e:prod` (`E2E_PROD=1 playwright test --grep @prod --trace off`) |
| `src/shared/hooks/useResetOnHide.ts` (+test) | cleanup de `useLayoutEffect` → `reset()` (Activity) |
| `src/features/hotel-details/model/build-retry.ts` (+test) | `backoffDelays`, `withRetry` |
| `.../model/prerender.ts` (+test) | `toPrerenderParams` |
| `.../model/stay-criteria.ts` (+test) | `toStayCriteria` |
| `.../model/photo-route.ts` (+test) | `parsePhotoParam`, `photoHref`, `photoPageTitle` |
| `.../api/catalog.cached.ts` (+test) | as 4 funções `use cache` (Decisão 3) |
| `.../api/prerender.server.ts` (+test) | `listPrerenderHotelIds` (fetch + retry + `toPrerenderParams`) |
| `.../api/hotel.server.ts` (removido) | substituído por `getHotelSnapshot` |
| `.../components/HotelDetailsView.tsx` (alt.) | RSC: snapshots em paralelo, sem `HydrationBoundary`, recebe `criteria: Promise<SearchCriteria \| null>` |
| `.../components/StayAwareLink.tsx` (novo) | RSC async + Suspense com o mesmo link sem critérios como fallback |
| `.../components/HotelStayBar.tsx` (alt.) | async, aguarda `criteria` dentro do Suspense |
| `.../components/RoomCard.tsx` (alt.) | RSC com o que é do quarto. Slot para `RoomStayAction` |
| `.../components/RoomStayAction.tsx` (novo, cliente) | `use(criteria)`, total, botão, motivo |
| `.../components/RoomStayActionSkeleton.tsx` (novo) | fallback com alturas fixas |
| `.../components/RoomsSection.tsx` (alt.) | RSC: recebe `rooms` (sem `useSuspenseQuery`) |
| `.../components/FromPrice.tsx` (alt.) | RSC: `lowestNightlyPrice(rooms)` |
| `.../components/ReviewList.tsx` (novo/extraído) | apresentação pura (RSC e cliente) |
| `.../components/ReviewsPager.tsx` (alt., ex-`ReviewsSection`) | cliente, TanStack com `initialData` da p.1 |
| `.../components/Gallery.tsx` (alt.: vira RSC) | miniaturas como `PhotoLink` (`scroll={false}`) |
| `.../components/PhotoLink.tsx` (novo, cliente) | `next/link` + registra o gatilho (`data-photo-opener`) |
| `.../components/PhotoViewer.tsx` (novo, cliente) | foto, setas, contador, teclado, `replaceState` |
| `.../components/PhotoModal.tsx` (novo, cliente) | `Dialog size="full"` + `PhotoViewer`; fechar/voltar devolvem o foco |
| `.../components/PhotoPage.tsx` (novo, RSC) | página cheia (h1, viewer, voltar) |
| `.../components/PhotoSkeleton.tsx`, `PhotoNotFound.tsx` (novos) | estados |
| `.../hooks/usePhotoViewer.ts` (novo) | índice, ações (`galleryNavigation`), `replaceState` |
| `.../hooks/usePhotoOpener.ts` (novo) | registrar e devolver foco ao gatilho |
| `.../components/Lightbox.tsx`, `hooks/useLightbox.ts` (removidos) | substituídos |
| `.../index.ts` (alt.) | exporta `listPrerenderHotelIds`, `getHotelSnapshot`, `toStayCriteria`, `PhotoPage`, `PhotoModal`, `PhotoSkeleton`, `PhotoNotFound`, `parsePhotoParam`, `photoPageTitle` |
| `src/app/hotel/[hotelId]/layout.tsx` (novo) | `{children}{modal}` |
| `src/app/hotel/[hotelId]/page.tsx` (alt.) | `generateStaticParams`, promessa de critérios, `generateMetadata` com snapshot |
| `src/app/hotel/[hotelId]/@modal/default.tsx` (novo) | `null` |
| `src/app/hotel/[hotelId]/@modal/(.)photos/[photo]/{page,loading,error}.tsx` (novos) | modal |
| `src/app/hotel/[hotelId]/photos/[photo]/{page,loading,not-found}.tsx` (novos) | página cheia |
| `src/app/checkout/page.tsx` (alt.) | `export const instant = false` + comentário com o link da doc |
| `src/features/checkout/…` (alt.) | `useResetOnHide` nos campos de pagamento; sucesso → `assignLocation` |
| `src/features/hotel-search/components/HotelCard.tsx` (alt.) + `hooks/useIntentPrefetch.ts` (novo) | `prefetch={intent ? true : "auto"}` |
| `src/features/hotel-search/hooks/usePrefetchHotel.ts` (removido) | substituído |
| `src/features/hotel-search/components/FiltersDrawer.tsx` (alt.) | `useResetOnHide` |
| `src/features/search-form/hooks/useCombobox.ts` (alt.) | `useResetOnHide` (fecha a lista) |
| `e2e/hotel-photos.spec.ts` (novo) | critérios 12–19, 27–29 (dev e prod) |
| `e2e/nextjs.prod.spec.ts` (novo, `@prod`) | critérios 2, 5, 6, 8, 11, 26 |
| `e2e/activity.spec.ts` (novo) | critérios 21, 22, 24, 25 |
| `e2e/checkout.security.spec.ts` (alt.) | tag `@prod` nos testes de nonce |
| `CLAUDE.md` raiz (alt.) | "build precisa da mock-api", `test:e2e:prod` |
| `src/app/CLAUDE.md` (alt.) | regras de PPR: promessa de critérios, nada de `loading.tsx` acima do checkout, `instant`, tabela de rotas |
| `src/features/hotel-details/CLAUDE.md` (alt.) | snapshots, buracos, rotas de foto. Contrato com a F3 atualizado (sem TanStack no hover) |
| `src/features/hotel-search/CLAUDE.md`, `checkout/CLAUDE.md`, `src/shared/CLAUDE.md` (alt.) | prefetch por intenção, Activity/pagamento, `useResetOnHide` |

## Tarefas

> Cada linha = 1 commit (Conventional Commits, sem atribuição de IA). "Prova" = o que precisa estar
> verde antes do commit. Em qualquer erro de prerender, use `next build --debug-prerender` (nunca
> faça deploy desse build).

1. `chore(config): enable cache components and partial prefetching`: flags no `next.config.ts`,
   `instant = false` em `app/checkout/page.tsx`, auditoria das pré-condições (F7a/F7b). Nessa
   etapa a página do hotel ainda faz `await params` dentro do `loading.tsx` antes do `dehydrate`,
   então compila. Prova: `npm run build` com a forma da tabela da Decisão 2 (hotel ainda sem ids
   listados). E2E existentes verdes em dev. `checkout.security` verde contra o build.
2. `feat(shared): add reset on hide hook`. Prova: unit (cleanup chama `reset` ao desmontar e ao
   esconder com `<Activity mode="hidden">` do React 19).
3. `fix(hotel-search): close filters drawer when route is hidden` +
   `fix(search-form): close suggestions when route is hidden` (2 commits). Prova: componente com
   `Activity` alternando `visible`/`hidden`.
4. `fix(checkout): clear payment fields when hidden and leave with a document load`. Prova:
   componente (campos de pagamento vazios após esconder/mostrar; sucesso chama `assignLocation` com
   o path da confirmação).
5. `feat(hotel-details): add build retry and prerender params model`: `build-retry.ts`,
   `prerender.ts`. Prova: unit (delays 2000→15000 com teto, `withRetry` com `sleep` falso: sucesso
   na 3ª, `onRetry` com `n/total`, esgotou → relança a última; `toPrerenderParams` ordena,
   deduplica e lança em lista vazia).
6. `feat(hotel-details): add stay criteria and photo route model`: `stay-criteria.ts`,
   `photo-route.ts`. Prova: unit (`toStayCriteria` válido/inválido/ausente; `parsePhotoParam` com
   `1`, `5`, `0`, `6` p/ total 5, `01`, `1.5`, `abc`, `""`; `photoHref`; `photoPageTitle`).
7. `feat(hotel-details): add cached catalog snapshots`: `catalog.cached.ts` com
   `vi.mock("next/cache")`. Prova: unit com `fetch` stubado (URL exata de cada endpoint;
   `cacheLife` chamado com `hours`/`minutes`; 404 → `not-found`; 500 relançado; `fetchedAt` vindo
   de `Date.now` falso).
8. `feat(hotel-details): add prerender hotel ids loader`: `prerender.server.ts`. Prova: unit (lista
   de 60 do seed → 60 params; falhas transitórias → retry; mensagem final em pt-BR com a URL).
9. `refactor(hotel-details): render hotel shell from cached snapshots`: `HotelDetailsView`,
   `FromPrice`, `RoomsSection`/`RoomCard` RSC, `RoomComparison` por props, `ReviewList` +
   `ReviewsPager` com `initialData`, similares com `try/catch` fora do cache. `HydrationBoundary` e
   `hotel.server.ts` saem. Prova: testes de componente da F4 adaptados verdes; `page.test.tsx`.
10. `feat(hotel-details): stream stay dependent parts from a criteria promise`: `StayAwareLink`,
    `HotelStayBar` async, `RoomStayAction` + skeleton, `page.tsx` com a promessa. Prova: componente
    (`RoomStayAction` com promessa resolvida para cada `roomSelectability`; fallback com alturas
    fixas; `StayAwareLink` com e sem critérios).
11. `feat(hotel-details): prerender all hotels with generateStaticParams`. Prova: `npm run build`
    lista `/hotel/1…60` como `◐`; critérios 1–4 conferidos (o 3 e o 4 manualmente, parando e
    atrasando a API).
12. `feat(hotel-search): prefetch hotel page on intent`: `useIntentPrefetch`, remove
    `usePrefetchHotel`. Prova: componente (o `prefetch` do link passa de `"auto"` a `true` em
    pointerenter/focus/touchstart, com `next/link` mockado).
13. `feat(hotel-details): add photo viewer with url sync`: `PhotoViewer`, `usePhotoViewer`. Prova:
    componente (teclas, volta ao início, contador, `history.replaceState` espionado com o path
    certo, sem setas com 1 foto).
14. `feat(hotel-details): add full page photo route`: `PhotoPage`, `PhotoSkeleton`,
    `PhotoNotFound`, `app/hotel/[hotelId]/photos/[photo]/*`. Prova: `page.test.tsx` (índice inválido
    → `notFound`; metadata); build com `◐ /hotel/[hotelId]/photos/[photo]`.
15. `feat(hotel-details): open gallery photos as intercepted modal`: `layout.tsx`, `@modal/*`,
    `PhotoModal`, `PhotoLink`, `usePhotoOpener`, `Gallery` RSC. Saem `Lightbox` e `useLightbox`.
    Prova: componente (fechar chama `close` → foco no gatilho → `router.back`; desmontar devolve o
    foco) + `e2e/hotel-photos.spec.ts` verde (desktop e mobile).
16. `feat(config): cap server action body size`. Prova: E2E de reserva no caso máximo (critério 23).
17. `test(e2e): add production build suite for prerendering`: config `E2E_PROD`, script,
    `nextjs.prod.spec.ts`, `activity.spec.ts`, tag `@prod` no `checkout.security`. Prova:
    `npm run test:e2e:prod` verde.
18. `docs: document cache components, isr and photo routes`: os `CLAUDE.md` listados. Prova:
    revisão (Decisões 1–12 refletidas; aviso de que o build precisa da API; regra do checkout).

## Plano de testes

**Unit (`model/`, `api/`)**
- `build-retry`, `prerender`, `stay-criteria`, `photo-route`: casos da tarefa. O `withRetry` usa
  `sleep` injetado, sem timers reais.
- `catalog.cached`: `vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))`. A
  diretiva `"use cache"` é uma string sem efeito no Vitest. Afirma perfil, URL, o ramo `not-found` e
  que a falha é relançada (nunca devolve fallback).
- `prerender.server`: seed inteiro de `mock-api/db.seed.json` como resposta stubada.

**Componente (Testing Library)**
- `RoomStayAction`: `<Suspense>` + promessa resolvida (`await act`) para `selectable`, `scarce`,
  `needs-dates`, `too-small`, `insufficient`, `sold-out`. Fallback com `aria-hidden`.
- `StayAwareLink`: href com e sem critérios. Durante a suspensão o fallback é o mesmo texto e
  aponta para o link base.
- `ReviewsPager`: com `initialData`, não faz request na página 1. A troca de página continua (testes
  da F4).
- `PhotoViewer`/`PhotoModal`: teclas, `replaceState`, fechar/desmontar devolvem o foco ao
  `data-photo-opener` registrado. Esc nativo do `<dialog>` (polyfill já usado pelo `Dialog`).
- `useResetOnHide` nos três consumidores com `<Activity>`.
- `useIntentPrefetch`/`HotelCard`.

**E2E**
- Dev e prod (`hotel-photos.spec.ts`): critérios 12–19, 27–29, nos projetos desktop e
  `mobile-chromium` (Voltar do navegador com `page.goBack()`/`goForward()`). Para "nenhum request ao
  trocar de foto": `page.on("request")` filtrando `rsc`/`_rsc` e `next-router-*`.
- Só prod (`@prod`):
  - `nextjs.prod.spec.ts`: manifest (2); JS desligado (`test.use({ javaScriptEnabled: false })`) (5);
    CLS com `PerformanceObserver` (6); `/hotel/61` e `/hotel/abc` (8); `x-nextjs-cache` (11); prefetch
    por intenção com `page.waitForRequest` (26).
  - `checkout.security.spec.ts` com `@prod` (20).
  - `activity.spec.ts`: 21, 22, 24, 25.
- Cenários de rede: `_delay`/`_fail` não alcançam fetch feito no servidor nem cache. Cobertura:
  - `?_delay=3000` no request **cliente** da página 2 de comentários (status "Atualizando…" mantido).
  - `page.route` para 500 no RSC do modal da foto → `error.tsx` do modal (critério 18).
  - Build com a API parada (3) e atrasada (4), e runtime com a API parada (10): verificação manual
    com o comando registrado no PR, porque Playwright não controla o processo da API durante o build.
  - `npm run server -- --fail-rate 0.3` durante `next start`: a página do hotel continua abrindo do
    cache. Uma revalidação que falha não aparece para o usuário.
- axe em todas as telas novas (27).

## Riscos

| Risco | Mitigação |
|---|---|
| Cold start do Render no build da Vercel (ISR com API fora) derruba o deploy | `withRetry` ~1,5 min em `generateStaticParams` antes de qualquer prerender de hotel; mensagem clara; README explica "acorde a API antes do deploy". Se ainda falhar, o build falha alto, sem publicar páginas vazias |
| Fill de `use cache` passa de 50 s no prerender (timeout da doc) | A API já está aquecida pela retry. Os `fetch` têm timeout de 10 s (`http.ts`). Erro → `--debug-prerender` |
| mock-api reinicia em runtime | O catálogo vem do seed e não muda, então o cache continua correto. Reservas somem, mas `/confirmation` é sempre por request (F6). Revalidação que falha mantém o conteúdo stale |
| Erro ou "não foi possível carregar" entrar no cache por 1 h | Regra da Decisão 3: só sucesso/`not-found` voltam do escopo cacheado, e o `try/catch` fica fora. Unit afirma que a falha é relançada |
| `instanceof ApiError` falhar do lado de fora do cache | Classificação feita dentro (Decisão 3). Fora, só union discriminada |
| `Date.now()`/`Math.random()` no render da casca (TanStack, `motion` da F7a, toasts) quebrar o build | Tarefa 1 roda o build com o app inteiro. Correção da doc: ilha em `<Suspense>` ou leitura em efeito. Nunca `staleTime: "static"` para esconder |
| Nonce some do checkout porque alguém adiciona `loading.tsx`/Suspense acima do `connection()` | Regra em `app/CLAUDE.md`. `instant = false` comentado. `@prod` confere o nonce em todo `<script>` |
| `/confirmation` deixa de mandar `no-store` sob PPR | E2E da F6 (header) roda em `@prod`. Se falhar, a rota vira `ƒ` como o checkout (`instant = false` + `connection()` fora de Suspense). A PII nunca entra na casca em nenhum dos casos |
| i18n da F7b ler `cookies()` no layout e tornar tudo dinâmico | Pré-condição auditada na tarefa 1. Se ocorrer, volta para a F7b |
| Service worker da F7b servir HTML velho de `/checkout` (nonce/PII) ou de hotel | Pré-condição. O teste `@prod` do nonce roda com o SW registrado |
| Interceptação abrir o modal sobre a página cheia da foto | Setas por `replaceState`, sem `<Link>` entre fotos (Decisão 6). E2E do critério 16 |
| Foco perdido ao fechar pelo Voltar (modal desmontado sem `close()`) | Cleanup do `PhotoModal` devolve o foco ao gatilho registrado. E2E desktop e mobile (15) |
| Activity mantém estado transitório ou cartão em DOM escondido | `useResetOnHide` + saída por carga de documento (Decisão 10). E2E 21, 22, 25 |
| Header `x-nextjs-cache` ou formato do `prerender-manifest.json` diferente no 16.4 | Schema Zod mínimo e tolerante. Se o header não existir com PPR, o critério 11 vira verificação do log do `next start` e de `.next/server/app/hotel/1.html`. Ajuste registrado no PR, sem pular o teste |
| `npm run build` local sem API vira atrito | `CLAUDE.md`/README: "suba a mock-api antes do build". A retry mostra o motivo em pt-BR |
| `use cache` em memória não persiste entre instâncias serverless (Vercel) | Esperado (`use-cache.md`, "Runtime caching considerations"). A saída ISR da página é persistida pela plataforma. Sem `use cache: remote` (custo e infra a mais) |
| 60 páginas × 4 GETs deixam o build lento | ~240 GETs leves com 300 ms de delay e prerender paralelo. Medir na tarefa 11. Se passar de 2 min, reduzir para os mais populares (`_sort=reviewCount`), já que o fallback ISR cobre o resto |
