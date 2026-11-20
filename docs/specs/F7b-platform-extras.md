# F7b — extras de plataforma: mapas interativos, modo offline, PWA e i18n

## Objetivo

Fechar os quatro itens "de plataforma" da seção 6 do enunciado com profundidade: **mapas interativos**
(Leaflet + tiles do OpenStreetMap, sem chave) na página do hotel e nos resultados de `/search`, com
marcadores de preço sincronizados com a lista; **modo offline** (cache das queries públicas do TanStack
persistido + banner global); **PWA instalável** (manifest, ícones, service worker com estratégia de
cache por rota, nunca para `/checkout` e `/confirmation`); e **i18n pt-BR + en-US** com rota por
locale, dicionários tipados e formatação por locale de toda a microcopy existente. Toda regra nova
(caminhos por locale, persistência permitida, estratégia de cache por URL, marcadores e limites do
mapa, quando oferecer instalação) é função pura testada.

## Escopo

**Entra**

- **Mapa do hotel (`/hotel/[hotelId]`)**: o mapa estático da F4 continua como base sem JS e vira
  placeholder; quando a seção chega perto da tela e há rede, o Leaflet monta por cima no mesmo
  centro e zoom (troca sem salto), com zoom por botões/teclado/pinça, marcador acessível e
  "Abrir no OpenStreetMap".
- **Mapa dos resultados (`/search`)**: botão "Mostrar mapa" (preferência na URL, `map=1`), painel
  com um marcador de preço por hotel **exibido na lista** (página atual ou lotes carregados do
  feed da F3b), sincronização nos dois sentidos (hover/foco no card destaca o marcador; marcador
  abre popup com "Ver hotel" e "Mostrar na lista"), enquadramento automático, esgotado
  diferenciado, link "Pular o mapa".
- **Modo offline**: persistência do cache do TanStack Query em `localStorage` **só para chaves
  públicas por allowlist** (sugestões, hotéis, quartos, avaliações), validade de 24 h, invalidação
  por versão do app; banner global "Você está sem internet" / "Conexão restabelecida".
- **PWA**: `app/manifest.ts`, ícones gerados por código (`ImageResponse`), `theme-color`,
  service worker com `@serwist/turbopack` (precache dos assets do build + página offline por
  locale + cache em tempo de execução por allowlist de rotas), aviso "Nova versão disponível",
  cartão "Instalar o app" na página inicial (Chromium, via `beforeinstallprompt`).
- **i18n**: pt-BR (padrão, URLs atuais sem prefixo) e en-US (prefixo `/en`), segmento raiz
  `app/[locale]` + `proxy.ts` que reescreve, seletor de idioma no header, cookie com a escolha
  explícita, `<html lang>`, `hreflang`, metadata por locale, moeda/datas/números por locale, mensagens
  de validação por locale, **toda a microcopy existente (F1–F6, F3b, F7a) em dicionários**, e um teste
  "catraca" que impede texto de UI fora dos dicionários.

**Fora (e por quê)**

- **Conteúdo da API em inglês** (descrição do hotel, nome/descrição do quarto, títulos e textos das
  avaliações, endereço): a mock-api só tem pt-BR e tradução automática seria dado inventado. Em
  `/en` esses blocos ficam em português marcados com `lang="pt-BR"` (WCAG 3.1.2). Enums (comodidades,
  tipo de imóvel, política de cancelamento, camas) **são** traduzidos.
- **Conversão de moeda**: preços são BRL na API (`currency: "BRL"`). Em en-US formatamos BRL no
  padrão americano (`R$1,200.00`), sem converter (câmbio seria dado inventado).
- **Negociação automática por `Accept-Language`**: ver Decisão 15.
- **Push notifications e Background Sync**: exigem backend (VAPID, fila de reservas); reservar
  offline viola "nunca cachear checkout" e a mutation não é idempotente.
- **Dica de instalação para iOS** (texto "Compartilhar → Adicionar à Tela de Início"): exige
  detectar iOS pelo User-Agent (frágil); o Safari já oferece o fluxo nativo. README cita.
- **Clusterização de marcadores, desenho de área, "buscar nesta área"**: no máximo 14 hotéis por
  destino; a API não filtra por coordenadas.
- **Mapa no `/checkout` e na confirmação**: não agrega à tarefa; o checkout fica com o menor
  JavaScript possível (CSP estrita, dados de pagamento).
- **Leaflet 2.0** (beta) e **mapas vetoriais (MapLibre GL)**: ver Decisão 2.
- **`experimental.useOffline` do Next 16**: ver Decisão 9 (fica como opção para a F7c).
- **Manifest por idioma**: o Next só aceita `manifest` na raiz de `app/`; o nome é a marca
  ("Infotera Hotéis") nos dois idiomas. Descrição em pt-BR, `lang: "pt-BR"`.

## Decisões

### Ordem e fatiamento

1. **Infra de i18n primeiro, tradução em massa por último.** Ordem: (A) núcleo de i18n + rota por
   locale + seletor; (B) mapas; (C) offline; (D) PWA; (E) tradução feature a feature; (F) E2E e docs.
   Assim todo texto novo da F7b já nasce em dicionário (sem retrabalho) e a mudança arriscada (mover
   `app/` para `app/[locale]` e compor o `proxy.ts` da F5) acontece antes de mapa/PWA dependerem das
   rotas. A tradução em massa é o item mais caro (estimativa: **600–900 chaves**; a F5 sozinha tem
   ~250 pela tabela de microcopy) e é fatiada **uma feature por commit** (as maiores em 2–3), cada uma
   entregando pt-BR **e** en-US e baixando a catraca (Decisão 20). Descartado: traduzir tudo num
   commit (impossível de revisar) ou deixar en-US com fallback para pt-BR por chave (o tipo do
   dicionário deixaria de garantir completude).

### Mapas

2. **Leaflet `1.9.4` + `react-leaflet` `5.0.0` (+ `@types/leaflet` `1.9.22`), tiles raster do OSM.**
   Versões exatas (sem `^`). react-leaflet 5 tem peer `react ^19`; Leaflet 1.9.4 é a última estável
   (2.0 está em beta). Descartados: Google Maps/Mapbox (chave de API e conta; o TEST_MAP fixou "sem
   chave"); MapLibre GL (WebGL, ~200 KB gz, precisa de estilo/tiles vetoriais de um provedor);
   Leaflet "puro" num `useEffect` (marcadores reativos ao estado de destaque viram sincronização
   manual; react-leaflet já faz e é fino); Leaflet 2.0 beta (API em mudança).

3. **Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` numa constante única
   (`shared/lib/map-tiles.ts`: `TILE_URL`, `TILE_ORIGIN`, `MAX_ZOOM = 19`).** Atribuição obrigatória
   "© colaboradores do OpenStreetMap" (link para `openstreetmap.org/copyright`) sempre visível.
   `TILE_ORIGIN` alimenta `IMAGE_HOSTS` do `csp.ts` (F5) e a regra de cache do SW: um lugar só.
   Respeito à política de uso do OSM: uso leve, atribuição, sem pré-download, cache do SW limitado
   (Decisão 11), e **E2E nunca bate no OSM** (tiles interceptados com `page.route` → PNG local).
   README: produção real usaria um provedor com SLA (trocar só a constante). Descartado: proxy de
   tiles pelo Next (`/tiles/...`): esconderia a origem do OSM e consumiria a função serverless.

4. **Mapa do hotel = melhoria progressiva sobre o estático da F4.** `LocationMap` (RSC) continua
   renderizando o mapa estático (`staticMapLayout`, zoom 15) e passa a envolver uma ilha cliente
   `InteractiveLocationMap` que, quando o contêiner entra a 200 px da viewport
   (`IntersectionObserver`) **e** `navigator.onLine`, carrega o Leaflet por `next/dynamic`
   (`ssr: false`) no mesmo centro/zoom. O estático só sai depois do evento `load` do primeiro lote de
   tiles (sem piscar); se o chunk ou os tiles falharem, o estático fica (sem mensagem de erro: o
   conteúdo continua lá). Sem JS, offline ou com erro: idêntico à F4. Descartado: carregar o Leaflet
   já no SSR da página (~45 KB gz para todo visitante, mesmo quem não rola até o mapa) e botão
   "Ativar mapa interativo" (passo extra sem ganho: a troca é invisível).

5. **Mapa dos resultados = painel sob demanda, preferência na URL (`map=1`).** Botão de alternância
   "Mostrar mapa"/"Ocultar mapa" (`aria-pressed`) na toolbar. `map` é preferência de exibição como o
   `view` da F3b: não conta em "Filtros (n)", `clear` mantém, nova busca zera, **não** volta a página
   para 1, escrita por `replaceState`. O painel fica **acima da lista, na coluna de resultados**
   (altura `clamp(280px, 45dvh, 420px)`), não sticky. Marcadores = **exatamente os hotéis exibidos**
   (página atual; no feed, os lotes carregados), na ordem da lista (ordem de Tab). Enquadramento:
   `fitBounds` com 32 px de margem e `maxZoom` 15 quando o conjunto de ids muda; 1 hotel → `setView`
   zoom 15; hover/destaque nunca reenquadra. Painel só renderiza na visão `results` de
   `deriveResultsView` (carregando/vazio/erro/offline sem dados: o botão continua, o painel não).
   Descartados: lista + mapa lado a lado no desktop (com a sidebar de filtros da F3 sobram ~430 px
   para os cards em `max-w-6xl`); mapa sticky (rouba viewport no celular e conflita com a barra fixa);
   marcadores de **todos** os hotéis do destino (o mapa diria uma coisa e a lista outra; sem filtro
   aplicado no mapa); rota separada `/search/map` (duplica a página).

6. **Sincronização lista ↔ mapa por um store local da feature (`hotel-search/store/map-sync.ts`).**
   Zustand com `activeHotelId` (hover/foco em card **ou** marcador) e `revealCard` (callback
   registrado pelo modo de lista ativo). Cada card/marcador assina com seletor
   (`s.activeHotelId === id`): passar o mouse re-renderiza 2 itens, não a lista. "Mostrar na lista":
   modo páginas → foco no link do card (`preventScroll` + `revealBelowHeader`); feed virtualizado
   → `scrollToIndex` + foco (mesma rotina da F3b para "primeiro card novo"). Descartados: estado
   no componente pai (re-renderiza a lista inteira a cada hover) e store em `shared` (só a F3 usa).

7. **Componente de mapa genérico em `shared/ui/map/` (segundo uso: F3 e F4).** `InteractiveMap`
   (`"use client"`, carregado por `next/dynamic` com `ssr: false`) recebe
   `{ center?, zoom?, markers: MapMarker[], activeId?, onActiveChange?, onSelect?, renderPopup?,
   labels }` e não sabe o que é hotel. Regras de empacotamento:
   - `import "leaflet/dist/leaflet.css"` dentro do componente (só entra no chunk do mapa).
   - Contêiner com `isolate relative z-0`: o Leaflet usa `z-index` 400–1000 internamente e passaria
     por cima do header sticky (`z-20`), toasts e barra fixa.
   - Marcador = `L.divIcon` com **`HTMLElement` montado por `document.createElement` +
     `textContent`**, nunca string HTML (preço/nome não viram HTML; sem XSS por dado da API). Sem
     ícone PNG padrão do Leaflet (quebra com bundler).
   - `prefers-reduced-motion: reduce` → `zoomAnimation`, `fadeAnimation`, `markerZoomAnimation`
     desligados e `setView`/`fitBounds` sem `animate`.
   - `scrollWheelZoom: false` (a roda rola a página; zoom por botões, `+`/`-`, duplo clique, pinça).
     O Leaflet 1.9 não separa arrasto de 1 e 2 dedos; no celular o arrasto fica ligado e o painel tem
     altura limitada (ver Riscos).
   - `TileLayer` com `crossOrigin: "anonymous"` (respostas CORS cacheáveis pelo SW; ver Riscos).
   Função pura `shared/lib/geo.ts`: `boundsOf(points)`, `fitPlan(points) → { kind: "fit"; bounds }
   | { kind: "center"; center; zoom } | { kind: "none" }`, `osmLink` (promovido da F4).

8. **Acessibilidade do mapa.** O mapa é **complemento**: a lista (busca) e o endereço + link OSM
   (hotel) são a alternativa textual completa. Contêiner `role="region"` com `aria-label` ("Mapa dos
   resultados" / "Mapa: {endereço}") e `aria-describedby` para uma dica visível curta ("Setas movem
   o mapa; + e − mudam o zoom; Tab percorre os hotéis."). Antes do mapa de resultados, link
   "Pular o mapa" (foco vai para o h2 da contagem). Marcador: elemento focável do Leaflet
   (`keyboard: true`) recebe `aria-label` ("Hotel X, R$ 1.200 por noite" / "Hotel X, esgotado") e
   `aria-pressed`-like via `data-active`; Enter abre o popup; ao fechar o popup (Esc ou ×) o foco
   volta ao marcador (o Leaflet 1.9 não devolve: tratamos no `popupclose`). Botões de zoom do
   Leaflet ganham `aria-label`/`title` traduzidos (`zoomInTitle`/`zoomOutTitle`). Foco visível em
   marcador e controles (`outline-2 outline-primary`). Contraste do marcador ≥ 4.5:1.

### Modo offline

9. **Persistência do TanStack com `@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister` `5.108.1`.**
   Exige subir `@tanstack/react-query` de 5.108.0 para **5.108.1** (peer `^5.108.1`), no mesmo commit.
   `AppProviders` troca `QueryClientProvider` por `PersistQueryClientProvider` com:
   - `persister = createSyncStoragePersister({ storage: window.localStorage (undefined no servidor →
     no-op), key: "infotera:query-cache", throttleTime: 1000, serialize, deserialize })`;
   - `maxAge: 24 h`; `gcTime` do client no browser = 24 h (senão a query sai da memória em 5 min e
     some do storage antes do `maxAge`);
   - `buster: APP_VERSION` (`NEXT_PUBLIC_APP_VERSION` definido no `next.config.ts` = versão do
     `package.json` + `VERCEL_GIT_COMMIT_SHA` curto ou `"dev"`): cada deploy descarta o cache, então o
     formato salvo sempre bate com o código atual (os dados restaurados **não** passam de novo pelos
     schemas Zod);
   - `dehydrateOptions.shouldDehydrateQuery = (q) => q.state.status === "success" &&
     isPersistableQueryKey(q.queryKey)`;
   - `deserialize` valida o **envelope** com Zod (`persistedClientSchema`: `timestamp`, `buster`,
     `clientState.queries[]` com `queryKey` array) e devolve um cliente vazio se falhar (storage
     corrompido não derruba o app).
   **Allowlist, nunca denylist** (`shared/api/persist.ts`): raízes `suggestions`, `hotels`, `rooms`,
   `reviews`. Tudo o mais (hoje `bookings`; amanhã cupom, histórico da F7a, qualquer chave nova) **não
   persiste por padrão**. Sem PII: nenhuma dessas respostas tem dado de pessoa (avaliações têm nome e
   avatar públicos do autor, já exibidos na página pública). Descartados: `idb-keyval`/IndexedDB
   (assíncrono, mais uma dependência; volume < 500 KB); persistir tudo com denylist (chave nova de PII
   vazaria por padrão); revalidar cada query restaurada com o schema (os formatos de lista são das
   features: `shared` teria de importar features; o `buster` por deploy resolve o mesmo problema).

10. **Banner offline global, em fluxo, sob o header.** `OfflineBanner` (`app-shell`) usa o `useOnline`
    de `shared/hooks` (`navigator.onLine` + eventos) e mostra `Alert warning` compacto com
    `WifiOffIcon`: "Você está sem internet. Mostramos o que já foi carregado; reservas ficam
    indisponíveis até a conexão voltar." Ao voltar: "Conexão restabelecida." (tom `success`) por 4 s.
    Região `role="status"` **sempre montada** (vazia quando online) para o anúncio funcionar. Fica
    em fluxo (empurra o conteúdo uma vez); não sticky, porque o `scroll-padding-top` e o
    `revealBelowHeader` contam com a altura fixa do header. Os alertas offline por seção (F2–F5)
    continuam: o banner diz "o app está offline", a seção diz "o que isto afeta".
    Descartados: `experimental.useOffline` do Next 16 (detecta portal cativo melhor, mas é
    experimental e **muda a semântica** de navegação/Server Action offline de "erro com retry" para
    "pendente para sempre", que F3–F6 já especificaram e testaram; fica como opção da F7c junto com
    Server Actions); banner fixo no rodapé (colide com a barra fixa mobile da F4/F5 e com toasts).

### PWA

11. **Service worker com `@serwist/turbopack` `9.5.15` + `serwist` `9.5.15` + `esbuild` `0.28.2` (dev).**
    O Next 16 builda com Turbopack; `@serwist/turbopack` serve o SW por um Route Handler estático
    (`app/serwist/[path]/route.ts`, `createSerwistRoute`, `force-static`) compilado por esbuild a
    partir de `src/app/sw.ts` (TypeScript, tipado), com **precache manifest** dos assets do build, e
    envia `Service-Worker-Allowed: /` (escopo `/`). É a integração indicada pela doc do Next 16
    (`progressive-web-apps.md`). `useNativeEsbuild: true`. SW desligado em `next dev`
    (`disable` no provider) — PWA é testado contra o build.
    Descartados: `@serwist/next` (plugin de webpack: obrigaria `next build --webpack`); `next-pwa`
    (sem manutenção, webpack); SW manual em `public/sw.js` (JS sem tipos nem testes, sem precache dos
    chunks com hash; teríamos de reimplementar estratégias e expiração).

12. **Estratégia de cache = allowlist de rotas, decidida por função pura `cacheRuleFor(request)`
    (`features/app-shell/model/cache-rules.ts`, importada pelo `sw.ts` e testada no Vitest).**
    Ordem de avaliação (primeira que casa):

    | # | Requisição | Estratégia | Cache / limites |
    |---|---|---|---|
    | 1 | Método ≠ `GET` (POST de reserva, Server Actions da F7c) | **sem `respondWith`** (navegador direto) | — |
    | 2 | Mesma origem, caminho público ∈ `/checkout`, `/confirmation/*` (com ou sem `/en`) e futuras rotas privadas (histórico da F7a) — documento **ou** RSC | **NetworkOnly** + fallback offline | nunca grava (nonce da CSP e PII) |
    | 3 | Origem da API (`NEXT_PUBLIC_API_URL`) | **sem `respondWith`** | o dado offline vem do persister (Decisão 9), não do SW: uma fonte só |
    | 4 | `/_next/static/**` | precache (manifest do build) + **CacheFirst** p/ o que faltar | `static-v{build}` |
    | 5 | Documento de rota pública (`/`, `/search`, `/hotel/:id`, `/offline`, e rotas públicas da F7a) | **NetworkFirst** (timeout 3 s) + fallback `/offline` do locale | `pages-{build}`, 40 entradas, 24 h |
    | 6 | RSC de rota pública (header `RSC: 1`) | **NetworkFirst** (3 s) | `pages-rsc-{build}`, 40, 24 h |
    | 7 | `images.unsplash.com` | **CacheFirst** | 60 entradas, 7 dias, status 200 (CORS) |
    | 8 | `TILE_ORIGIN` | **CacheFirst** | 300 entradas, 7 dias |
    | 9 | Qualquer outra coisa (`i.pravatar.cc`, rotas não listadas, `/serwist/*`) | **sem `respondWith`** | — |

    Caches com sufixo do build: o `activate` apaga `pages-*`/`static-*` de builds anteriores (HTML
    velho apontando para chunks removidos). O manifest de precache inclui `/offline` e `/en/offline`
    com `revision = build`. Navegação offline para rota não cacheada → página offline do locale da
    URL. Descartados: `defaultCache` do Serwist (tem regra genérica de páginas que cachearia
    `/checkout` com o nonce da CSP e `/confirmation` com PII); cachear respostas da API no SW
    (duplicaria o persister e cachearia `GET /bookings/:id`); StaleWhileRevalidate em páginas (mostra
    preço/disponibilidade velhos mesmo online).

13. **Atualização e instalação.** `skipWaiting: false`: quando há SW novo esperando, toast `info`
    persistente "Nova versão disponível." com ação "Atualizar" (manda `SKIP_WAITING`, recarrega no
    `controllerchange`). Instalação: listener de `beforeinstallprompt` registrado no **escopo do
    módulo** cliente do `app-shell` (antes de qualquer efeito, para não perder o evento) guarda o
    evento num store; a página inicial mostra o cartão "Instale o Infotera Hotéis" só quando
    `installPromptView({ hasPrompt, isStandalone, dismissedAt, now })` = `show` (não instalado, não
    dispensado nos últimos 30 dias). "Agora não" grava `infotera:install-dismissed-at`;
    `appinstalled` esconde e mostra toast "App instalado.". Descartados: botão fixo no header (ruído
    permanente; a doc do Next desaconselha prompt próprio insistente) e `skipWaiting: true` (troca
    chunks no meio de uma sessão, inclusive no checkout).

14. **Manifest e ícones por código, sem binários no repo.** `app/manifest.ts`
    (`name`/`short_name` "Infotera Hotéis"/"Infotera", `start_url: "/"`, `scope: "/"`,
    `display: "standalone"`, `background_color` `#F4F6F9` (canvas), `theme_color` `#0B5CAD`
    (primary), `lang: "pt-BR"`, ícones 192, 512 e 512 `maskable`). `app/icon.tsx` com
    `generateImageMetadata` (ids `192`, `512`, `maskable`) e `app/apple-icon.tsx` (180) via
    `ImageResponse`: "i" branco em `primary` (maskable com área segura de 80%). `viewport.themeColor`
    no layout. Descartado: PNGs gerados por ferramenta externa (binário sem fonte, fora do design
    system).

### i18n

15. **Rota por locale com segmento raiz `app/[locale]` e prefixo só para en-US.** URLs públicas:
    pt-BR **sem prefixo** (as de hoje: `/search?...`, `/hotel/1`), en-US com `/en`
    (`/en/search?...`). O `proxy.ts` reescreve `/x` → `/pt-BR/x` e `/en/x` → `/en-US/x`; acesso
    direto a `/pt-BR/x` ou `/en-US/x` → `308` para a URL canônica. `generateStaticParams` do layout
    devolve os dois locales e `dynamicParams = false`. Cookie `infotera-locale` grava **só a escolha
    explícita** no seletor; em caminho sem prefixo com cookie `en-US`, o proxy redireciona (`307`)
    para `/en/...`. **Sem negociação por `Accept-Language`**: o público é brasileiro, o Chromium do
    Playwright e de CI é `en-US` (toda a suíte E2E existente viraria inglês), crawler e link
    compartilhado ficam previsíveis; o `hreflang` resolve buscadores. Descartados: (a) locale só no
    cookie, sem prefixo (toda página leria `cookies()` e viraria dinâmica: mata o ISR/PPR da F7c e o
    cache de CDN; URL compartilhada não carrega o idioma); (b) prefixo nos dois (`/pt-BR/...`):
    quebra todas as URLs, links e E2E existentes; (c) i18n por domínio (sem domínio).

16. **Dicionários próprios, tipados, colocados por feature. Sem `next-intl`.**
    - `shared/i18n/`: `config.ts` (`LOCALES = ["pt-BR", "en-US"] as const`, `Locale`,
      `DEFAULT_LOCALE`, `isLocale`, `LOCALE_COOKIE`), `paths.ts` (`localizePath`, `parsePublicPath`,
      `switchLocalePath`, `resolveLocaleRequest` para o proxy), `messages.ts`
      (`defineMessages<M>(byLocale: Record<Locale, M>)` → `{ get(locale): M }`), `client.tsx`
      (`"use client"`: `I18nProvider locale`, `useLocale()`), `server.ts` (`getLocale()` via
      `next/root-params` + `isLocale` → `notFound()`), `plural.ts`, `common/{pt-BR,en-US}.ts`
      (header, skip link, paginação, dialog, erros de rede, rótulos de enums, formatos).
    - Cada feature: `i18n/pt-BR.ts` (fonte: `export const ptBR = {...}`, `export type XMessages =
      typeof ptBR`), `i18n/en-US.ts` (`export const enUS: XMessages = {...}`: chave faltando ou a
      mais = erro de compilação), `i18n/messages.ts` (`defineMessages`), hook
      `useXMessages()` (cliente) e `xMessages.get(await getLocale())` (RSC). Arquivos > 250 linhas
      se dividem por seção (`checkout/i18n/pt-BR/{personal,payment,review,summary}.ts`).
    - Interpolação = **funções tipadas** no dicionário: `resultCount: ({ count, formatted }:
      { count: number; formatted: string }) => string`. Parâmetro errado = erro de compilação.
    - No cliente os dois idiomas de uma feature entram no chunk da feature (~5–15 KB gz no total);
      aceito em troca de zero runtime de ICU e tipos exatos.
    Descartados: `next-intl` 4.15.3 (ótima lib, mas: tipagem de chaves por *module augmentation* com
    `interface AppConfig` — contra a regra `type`; mensagens ICU em string sem checagem de parâmetros
    em compilação; serializa o JSON de mensagens no HTML de cada página; middleware próprio teria de
    ser composto com o proxy de CSP da F5) e um dicionário global único em `shared` (shared conheceria
    texto de toda feature; arquivo gigante; viola "shared não tem texto de negócio").

17. **Formatação por locale; regras brasileiras ficam brasileiras.** `shared/lib` (`currency`,
    `format`, `dates`) recebem `locale` (`Intl.*` por locale, formatters memorizados por locale):
    `formatBRL(1200, { locale: "en-US" })` → `R$1,200.00`; datas `1 de dez. de 2026` /
    `Dec 1, 2026`; nota `4,5` / `4.5`; distância da F3b `2,3 km` / `2.3 km`. Migração em duas etapas:
    o parâmetro entra **opcional com padrão pt-BR** (nada quebra), cada tarefa de tradução passa o
    locale nos seus usos, e a última tarefa o torna **obrigatório** (o compilador acha o que faltou).
    Plural: `plural(n, { one, other })` = `n === 1 ? one : other` nos dois idiomas (pt-BR do produto
    escreve "0 noites"; o `Intl.PluralRules("pt-BR")` classificaria 0 como `one`). Inalterados por
    locale: CPF, telefone com máscara BR, CEP (reserva no Brasil; em en-US o rótulo explica:
    "CPF (Brazilian taxpayer ID)"), parâmetros da URL (`2026-12-01`, números sem separador). O
    `<input type="date">` nativo segue o idioma do navegador, não o da página (limitação da
    plataforma; README).

18. **Mensagens de validação: as fábricas de schema recebem o dicionário.** O padrão já existe
    (`makeSearchFormSchema(today)`): vira `makeSearchFormSchema(today, messages.validation)`; o
    mesmo para `applySearchCriteriaRules` (shared) e os schemas por passo da F5. O resolver do RHF é
    criado com o dicionário do locale atual; trocar de idioma recarrega a página (Decisão 19), então
    não há troca a quente. Descartado: mensagens como chaves (`"checkInPast"`) traduzidas na
    renderização: exige type guard sobre `string` vinda do Zod e perde a checagem de parâmetros
    (ex.: máximo de noites).

19. **Seletor de idioma = link para a mesma página no outro idioma, carga de documento.** No header
    (slot `actions` do `SiteHeader`), `<a>` (não `next/link`) com texto no idioma de destino
    ("English" / "Português"), `lang` e `hrefLang` do destino. O `href` é calculado **depois de
    montar** a partir de `window.location` (`switchLocalePath`); no servidor e na hidratação aponta
    para a home do outro idioma (o Next avisa que `usePathname` com rewrite no proxy causa mismatch
    de hidratação). O clique grava o cookie e navega. Carga de documento porque troca `<html lang>`,
    dicionários e o root layout de uma vez, e respeita a regra de documento da CSP da F5 em
    `/checkout`. Descartados: `<select>` (2 opções não justificam; pior no teclado/mobile) e troca
    client-side (estado de formulário com mensagens do idioma anterior; `<html lang>` desatualizado).

20. **Catraca de texto fora do dicionário (`src/i18n-guard.test.ts`).** Teste Vitest que varre
    `src/**/*.{ts,tsx}` (exceto testes, `i18n/`, `testing/`, `app/sw.ts`) e conta: texto JSX com
    letras (`>…<`), atributos `aria-label|aria-description|placeholder|title|alt` com letras, e
    literais `.ts` com caractere acentuado ou palavra funcional pt (`" de "`, `" para "`, `"não"`…).
    Falha se a contagem passar de `COPY_BASELINE` (e lista os ofensores) **ou ficar abaixo** dela
    (obriga a baixar a constante no mesmo commit). Começa com a contagem real (a primeira execução é o
    inventário do custo do i18n) e termina em **0** com `COPY_ALLOWLIST` explícita (ex.: `OpenStreetMap`
    como nome próprio dentro de dicionário não conta; `·`, `R$` não são texto). Descartado: regra de
    lint (Biome não tem; plugin próprio seria mais código que o teste).

21. **Conteúdo da API e `lang`.** Em `/en`, blocos com texto da API recebem `lang="pt-BR"`
    (`contentLang(locale)` em `shared/i18n`): descrição do hotel, nome/descrição do quarto,
    título/texto da avaliação, endereço. Nomes de hotel e destino são nomes próprios (sem `lang`).

### Arquitetura

22. **Nova feature `src/features/app-shell/`** para o que é do "casco" do app e não de uma rota:
    `OfflineBanner`, `LanguageSwitch`, `ServiceWorkerRegistrar` (+ toast de atualização),
    `InstallPromptCard`, `OfflinePage`, `model/cache-rules.ts`, `model/install-prompt.ts`. O
    `app/[locale]/layout.tsx` compõe via `@/features/app-shell`. O `SiteHeader` (shared) ganha a prop
    `actions?: ReactNode` (slot), então shared continua sem importar feature. Mapa em
    `shared/ui/map/` (F3 + F4). Persistência em `shared/api/persist.ts` + `AppProviders`.
    Descartado: tudo em `shared/` (shared viraria depósito de features; o SW e a página offline têm
    regra de negócio própria).

23. **Mudanças de regra propostas para o `CLAUDE.md` raiz e `src/app/CLAUDE.md`** (entram na
    tarefa de docs): "Identificadores em inglês; **texto de UI só em `i18n/` (pt-BR é a fonte,
    en-US obrigatório)**; documentação em pt-BR"; "rotas vivem em `app/[locale]/`; links internos
    sempre por `localizePath`/helpers, nunca string `"/..."` crua"; "`<html lang>` vem do locale"
    (substitui "define `lang="pt-BR"`"); "metadata por locale" (substitui "título em pt-BR");
    comandos novos (`test:e2e:build`).
    **Registrado na entrega:** `locale` obrigatório (sem default) nos formatadores e em `model/`;
    catraca em `COPY_BASELINE = 0` com lista curada de palavras pt sem acento; `/` e `/en` saem do
    build como o segmento SSG `/[locale]` (`/pt-BR`, `/en-US`) reescrito pelo proxy.

## Costuras com outras fases

**F5 (checkout)**
- `src/proxy.ts` da F5 (matcher `/checkout`, nonce, `Cache-Control: no-store`) vira um proxy só:
  `resolveLocaleRequest` decide reescrita/redirect para **toda** rota de página; se o caminho interno
  for `/{locale}/checkout` e a request não for prefetch (`next-router-prefetch` / `purpose:
  prefetch`, testado **dentro** da função, já que o matcher fica amplo), aplica a CSP com nonce na
  request reescrita (`NextResponse.rewrite(url, { request: { headers } })`) e na resposta.
  Matcher novo: tudo menos `_next/`, `serwist/`, `manifest.webmanifest`, `icon`, `apple-icon`,
  `favicon.ico`, `robots.txt`, `sitemap.xml` e arquivos com extensão.
- `buildCsp` ganha `worker-src 'self'` (com `'strict-dynamic'` em `script-src`, o fallback de
  `worker-src` ignoraria `'self'` e o registro do SW numa página carregada em `/checkout` violaria a
  CSP) e `manifest-src 'self'`. `img-src` já tem `tile.openstreetmap.org` (F5 Decisão 3): passa a vir
  de `TILE_ORIGIN`. Navegar **do** checkout para `/hotel/:id` mantém a CSP estrita no documento:
  Leaflet só usa CSSOM (`el.style.x`, permitido), `<img>` de tiles (permitido) e CSS de mesma origem.
- `useStrictDocument` compara a URL de carga com `isCheckoutPath` (`/checkout` **ou**
  `/en/checkout`); `assignLocation(localizePath(locale, "/checkout"))` na F4.
- `redirect("/")` / "voltar ao hotel" do checkout usam `localizePath`.

**F6 (confirmação)**: rota continua dinâmica (`await connection()`), `NetworkOnly` no SW, query
`bookings` fora da allowlist do persister. `noindex` nos dois idiomas.

**F7a (favoritos, comparação, histórico, toasts, Framer Motion)** — implementada antes:
- **Tradução**: a tarefa 27 traduz todo texto da F7a; se a F7a centralizar a microcopy em constantes
  (como `FORM_MESSAGES`), a extração é mecânica. A catraca da Decisão 20 já conta os textos da F7a.
- **Toast persistente**: a atualização do SW precisa de toast sem auto-dismiss com ação. Se a F7a
  já estendeu o toast com `duration`/`persistent`, usamos; senão a tarefa 20 adiciona
  `{ persistent: true }` ao `toast-store`.
- **Rotas**: páginas públicas da F7a (favoritos, comparar) entram na lista de rotas públicas do
  `cache-rules.ts`; o **histórico de reservas é privada** (NetworkOnly), e as queries dele
  (`bookings`) já ficam fora do persister.
- **Movimento**: o mapa segue a mesma regra de `prefers-reduced-motion` da F7a.
- Rotas novas da F7a são movidas para `app/[locale]/` na tarefa 4 junto com as demais.

**F7c (PPR, Server Actions, Parallel Routes, ISR, Edge)** — implementada depois:
- Toda rota/slot nova nasce em `app/[locale]/` (`@modal`, `(.)hotel/[hotelId]`). Com
  `cacheComponents`, o `generateStaticParams` do `[locale]` (já presente) é obrigatório; `getLocale()`
  usa `next/root-params`, compatível com `"use cache"` (o locale entra na chave). ISR do hotel =
  2 locales × hotéis.
- O SW não toca em POST (Server Actions passam direto). NetworkFirst de páginas convive com ISR/PPR
  (online sempre vai à rede; o cache só serve offline). Caches por build evitam HTML de PPR
  apontando para chunks removidos.
- `/checkout` e `/confirmation` nunca em PPR/ISR (nonce/PII), coerente com o NetworkOnly do SW.
- O proxy continua no runtime padrão (Node no Next 16); dicionários são TS puro, seguros em Edge.
- `experimental.useOffline` fica como decisão da F7c (Decisão 10).
- Rotas interceptadas + reescrita do proxy: a F7c testa a interceptação nos dois idiomas.

**F3b / F4**: `map` no vocabulário da URL da F3 (com `view`); `formatDistanceFromCenter` recebe
locale; `LocationMap` da F4 ganha a ilha interativa; `osmLink` sobe para `shared/lib/geo.ts`.

## Contrato de dados

Sem endpoint novo. Fontes:

| Uso | Origem | Observação |
|---|---|---|
| Marcadores da busca | itens já carregados por `hotelsQueryOptions`/feed (F3/F3b): `id`, `name`, `latitude`, `longitude`, `pricePerNight`, `availableRooms` | nenhum request extra |
| Mapa do hotel | `Hotel.latitude/longitude/address` (já no RSC da F4) | coordenadas do seed: lat −29,38 a −2,77 |
| Tiles | `GET https://tile.openstreetmap.org/{z}/{x}/{y}.png` | `img`, CORS anônimo |

Schemas Zod: nenhum novo de API. Novos internos: `persistedClientSchema` (envelope do cache),
`installDismissedSchema` (ISO datetime), `localeSchema` (`z.enum(LOCALES)`).

Query keys: inalteradas. **Allowlist de persistência** por raiz de `queryKeys`:
`["suggestions", …]`, `["hotels", …]` (lista, detalhe, lista inteira do destino e feed da F3b),
`["rooms", …]`, `["reviews", …]`. Fora: `["bookings", …]` e qualquer raiz nova.

URL / storage / cookie:

| Nome | Onde | Valor |
|---|---|---|
| `map` | query de `/search` | `1` = painel do mapa aberto; ausente = fechado (inválido → fechado) |
| `/en` | prefixo de caminho | locale `en-US`; sem prefixo = `pt-BR` |
| `infotera-locale` | cookie (`Path=/; SameSite=Lax; Max-Age=31536000`; sem `HttpOnly`, não é segredo) | `pt-BR` \| `en-US` |
| `infotera:query-cache` | `localStorage` | envelope do persister (`buster`, `timestamp`, queries públicas) |
| `infotera:install-dismissed-at` | `localStorage` | ISO datetime |
| `NEXT_PUBLIC_APP_VERSION` | `next.config.ts` → env | `buster` do persister e sufixo de cache do SW |

## UI/UX

Fonte dos tokens, estados e microcopy (pt e en): `docs/design/design-system.md` §9 (componentes da
F7b), §1.6 (`xs`), §1.7 (camadas do mapa), §4.2 (header), §6.1 (horário en-US) e §6.5 (offline). Esta
seção decide o comportamento por tela; **ela prevalece sobre as Decisões 5, 8, 10 e 13 onde divergir**
(rótulo do botão do mapa, alvo do "Pular o mapa", variantes da página offline, toast de versão).

### Revisão pós-UX (decisões)

1. **MapToggle = opção (a)**: rótulo fixo `Mapa`/`Map`, `MapIcon` à esquerda via `leftIcon`,
   `aria-pressed` e estilo pressionado (`bg-primary-soft` + borda de 2px por `ring-1 ring-inset`).
   `aria-controls` só enquanto o painel existe. Painel ausente (lista carregando, vazia, com erro ou
   offline sem dados): o botão continua pressionado, sem `aria-controls`; clicar desliga.
2. **Dica de teclado**: sai de cima do mapa. Fica em fluxo **abaixo** da moldura, numa linha reservada
   (`min-h-5`), visível só com foco de teclado dentro do mapa; sempre ligada por `aria-describedby`.
   Sem `z-*` nosso dentro do Leaflet: atribuição pelo controle nativo; `z-[1000]` removido (§1.7).
3. **Popup**: largura fixa de 224px e `autoPan` que reserva a coluna do zoom e a atribuição (cabe em
   320px sem cobrir o "+"). Mapa do hotel com moldura `aspect-[4/3]` abaixo de `sm` (estático e
   interativo) e popup só com o nome. Foco entra no popup a cada abertura; Tab no último item fecha e
   vai ao próximo marcador; Shift+Tab no primeiro, Esc e "×" voltam ao marcador; Espaço = Enter no
   marcador; "×" nosso com 44px. Sem margens de `<p>`; nota com `RatingScore size="sm"`.
4. **"Pular o mapa"**: primeiro filho do painel; com foco aparece sobre o canto superior esquerdo do
   mapa (`absolute`, `z-10` dentro do wrapper `isolate`), não no topo da tela e sem layout shift.
   **Alvo ratificado: link do 1º card** (o h2 da contagem fica acima do mapa e o Tab recomeçaria
   pela toolbar). Critério 26 atualizado.
5. **InstallCard**: "Instalar app" vira `secondary` (a home já tem "Buscar hotéis" primário). Ao
   dispensar ou ao terminar o prompt nativo, o foco vai para "Buscar hotéis" antes do desmonte, e
   "Agora não" anuncia `Tudo bem. Você pode instalar depois pelo menu do navegador.`
6. **Header até 400px** (novo breakpoint `xs` = 25rem): logo só "Infotera" (o link mantém
   `aria-label` completo) e seletor "EN"/"PT". O seletor perde o `aria-label`; o nome sai do conteúdo
   ("EN English"), então contém o texto visível (label-in-name).
7. **Página offline**: três variantes (`public`, `checkout`, `bookings`) em pt e en, escolhidas pelo
   SW pela regra da rota (sugestão: `/offline`, `/offline/checkout`, `/offline/bookings` e `/en/...`,
   todas no precache). h1 nunca igual ao banner. Ordenação/filtro/página offline sem cache ganham
   mensagem própria (abaixo).
8. **Falha do chunk do mapa**: a moldura some, o painel encolhe para o `Alert danger` com
   `A lista abaixo continua disponível.`; botão `w-full sm:w-auto`, alinhado à esquerda.
9. **en-US**: check-in/out em 12h (`From 3:00 PM`, `Until 12:00 PM`); `Go to homepage`; microcopy
   revisado no DS §9.
10. **Toast de nova versão**: persistente, `Atualizar agora`/`Update now`, e **não aparece no
    checkout** (o reload perderia o que foi digitado); fica pendente até a próxima rota.

### Layout

**Header** (todas as rotas)
```
320–399px                               ≥ 400px (xs)                    ≥1024px
┌──────────────────────────────┐        ┌──────────────────────────────────┐  ┌────────────────────────────────────────────────────┐
│ Infotera        ♡  ▣  (globo) EN  │        │ Infotera Hotéis   ♡  ▣  (globo) English│  │ Infotera Hotéis   ♡ Favoritos ▣ Minhas reservas (globo) English│
├──────────────────────────────┤        └──────────────────────────────────┘  └────────────────────────────────────────────────────┘
│ (!) Você está sem internet. …  │  ← OfflineBar em fluxo (só offline), até 3 linhas no celular
└──────────────────────────────┘
```

**/search com mapa** (ordem de leitura = ordem de foco)
```
320px                                   ≥1024px (coluna de resultados, ao lado dos filtros)
14 hotéis encontrados (h2)              14 hotéis encontrados (h2)
[ Filtros (n)            ]              Ordenar por [▾]  Exibir [▾]  [(mapa) Mapa]
Ordenar por [▾]                         ┌─────────────────────────────────────────────┐
Exibir      [▾]                         │[Pular o mapa] (só com foco)                 │
[ (mapa) Mapa                ]  pressionado  │ [+]                                          │
┌────────────────────────┐              │ [−]      R$ 450      R$ 780                  │
│[Pular o mapa]          │ (com foco)   │              Esgotado        R$ 800          │
│[+]                     │              │                       © colaboradores do OSM │
│[−]   R$ 450            │              └─────────────────────────────────────────────┘
│        R$ 780          │              Setas movem o mapa; + e − mudam o zoom; Tab …  (só com foco)
│     © colab. do OSM    │              [card 1] …
└────────────────────────┘
(dica: linha reservada)
[card 1] …
```

**Mapa do hotel** (seção "Localização"): moldura `aspect-[4/3]` (< `sm`) / `aspect-[2/1]` (≥ `sm`) →
linha da dica → endereço → "Abrir no OpenStreetMap".

**Home**: formulário (primário "Buscar hotéis") → InstallCard (`secondary` + `ghost`) no fim do `main`.

**Página offline**: header + OfflineBar + `EmptyState` de página (h1, texto, `Tentar de novo`
primário + `Ir para o início` ghost; empilhados `w-full` no celular, lado a lado ≥ `sm`).

### Estados

| Tela/área | Loading | Erro | Vazio | Sucesso | Offline |
|---|---|---|---|---|---|
| Painel do mapa | Skeleton na altura da moldura + `Carregando mapa…` (`aria-live`); > 5 s: `Está demorando mais que o normal…` | chunk: painel encolhe para `Alert danger` + `A lista abaixo continua disponível.` + `Tentar de novo` (sucesso → foco no contêiner do mapa) | painel não aparece (botão pressionado) | marcadores = hotéis exibidos | `Alert warning` em fluxo acima da moldura; marcadores continuam |
| Mapa do hotel | estático da F4 | estático fica, sem mensagem | — | interativo, mesma moldura | estático |
| Lista ao trocar ordenação/filtro/página offline **sem cache** dos novos critérios | — | — | sem lista anterior: `EmptyState` warning (`WifiOffIcon`, `role="status"`) `Estes resultados ainda não estão salvos offline` · `Volte à opção anterior ou espere a conexão voltar: a lista atualiza sozinha.` / `These results aren't saved offline yet` · `Switch back to the previous option or wait for the connection: the list will update on its own.` | — | com lista anterior: ela fica visível com `Alert warning` acima `Sem internet para atualizar a lista` · `A lista abaixo ainda é da seleção anterior. Ela atualiza sozinha quando a conexão voltar.` / `Can't update the list offline` · `The list below is still from your previous selection. It will update on its own when you're back online.` (substitui o "Atualizando resultados…" infinito e o erro genérico); h2 da contagem mantém o valor anterior |
| InstallCard | — | — | não renderiza | aparece após `beforeinstallprompt` | — |
| Página offline | — | — | — | — | variante da rota |

### Interações

- **MapToggle**: clique alterna na hora (`replaceState`), foco fica no botão; ligar não move foco.
- **Marcador**: hover/foco ativa o card (`ring-2 ring-primary`) e vice-versa; clique, Enter ou Espaço
  abrem o popup e o foco entra nele (DS §9.9). Arrastar/zoom nunca reenquadra por hover.
- **"Pular o mapa"** → foco no link do 1º card (páginas: 1º da página; feed: índice 0 via
  `scrollToIndex`), `preventScroll` + `revealBelowHeader`.
- **LanguageSwitch**: carga de documento para a mesma página no outro idioma; critérios e
  `booking-draft` mantidos.
- **InstallCard**: "Instalar app" abre o prompt nativo; qualquer saída do cartão move o foco para
  "Buscar hotéis" antes do desmonte.
- **Toast de versão**: "Atualizar agora" → `loading` "Atualizando…" → recarrega. Oculto em `/checkout`.
- **Página offline**: "Tentar de novo" recarrega a URL original (o SW serve a página de novo se
  continuar offline); "Ir para o início" leva à home do locale.

### Acessibilidade

- Alvos: botões de zoom, "×" do popup, "Pular o mapa", seletor de idioma e ações do popup ≥ 44px;
  marcadores ≥ 24px (2.5.8).
- `aria-pressed` só no MapToggle; marcador com `aria-haspopup="dialog"` + `aria-expanded`; popup
  `role="dialog"` não modal com `aria-labelledby`.
- Label-in-name: seletor de idioma sem `aria-label` (nome = conteúdo); logo com `aria-label` que
  contém "Infotera".
- Reduced motion: reenquadrar, `autoPan` e abrir popup sem animação; InstallCard sai sem fade.
- Nenhum foco cai no `body`: InstallCard → "Buscar hotéis"; retry do mapa → contêiner do mapa; popup →
  marcador.

### Componentes

Reusados: `Button`/`ButtonLink` (`leftIcon`, `loading`), `IconButton`, `Alert`, `EmptyState`,
`Skeleton`, `RatingScore`, `Badge`, `Card`, `Toast`, `SkipLink` (estilo). Novos (DS §9):
`LanguageSwitch`, `OfflineBar`, `InstallCard`, `OfflinePage` (app-shell); `MapToggle`, `MapPanel`,
`PriceMarker`, `MapPopup` (`shared/ui/map` + hotel-search). Novo token: breakpoint `xs` (25rem).

### Critérios de UI complementares (pós-revisão de UX)

- U1. O MapToggle tem nome `Mapa`/`Map` nos dois estados; só `aria-pressed` muda; ícone na mesma linha.
- U2. Com o mapa focado por teclado, a dica aparece abaixo da moldura e não cobre popup nem "+";
  nenhum `z-[` arbitrário em `src/`.
- U3. Em 320px, o popup dos resultados e o do hotel cabem inteiros na moldura sem cobrir o zoom; a
  moldura do hotel é 4:3 abaixo de `sm` (estático e interativo, CLS 0).
- U4. Abrir um popup (clique, Enter ou Espaço) põe o foco nele; Tab no último item foca o próximo
  marcador; Shift+Tab no primeiro, Esc e "×" devolvem ao marcador.
- U5. Home com o cartão de instalação tem um único `Button primary` visível; "Agora não" e o fim do
  prompt nativo deixam o foco em "Buscar hotéis" (nunca no `body`).
- U6. Em 320 e 375 (pt e en) o logo ocupa uma linha; o seletor mostra "EN"/"PT" abaixo de 400px com
  nome acessível que começa pelo texto visível.
- U7. Offline em `/checkout`, `/confirmation/:id` e no histórico (pt e en) mostra a variante de reserva
  com h1 diferente de "Você está sem internet"; rota pública não salva mostra a variante `public`.
- U8. Offline, trocar a ordenação para uma não salva mostra o aviso de "Sem internet para atualizar a
  lista" (com a lista anterior) em vez de "Atualizando resultados…" infinito ou erro genérico.
- U9. Falha do chunk do mapa: painel com altura do `Alert`, texto `A lista abaixo continua
  disponível.`, botão `w-full` só abaixo de `sm`.
- U10. Em `/en/hotel/1`, check-in `From 3:00 PM` e check-out `Until 12:00 PM`; página offline em en com
  `Go to homepage`.
- U11. O toast de nova versão não aparece em `/checkout`; fora dele aparece uma vez, sem expirar.

## Critérios de aceite

**i18n — rotas e idioma**
1. Dado qualquer URL atual (`/`, `/search?...`, `/hotel/1?...`, `/checkout`, `/confirmation/:id`),
   quando abro sem cookie, então a página abre em pt-BR, com a mesma URL, `<html lang="pt-BR">`.
2. Dado `/en/search?destination=Rio%20de%20Janeiro%2C%20RJ&...`, quando abro, então a página está em
   inglês, `<html lang="en-US">`, e os parâmetros da busca são os mesmos da versão pt-BR.
3. Dado `/pt-BR/search?x` ou `/en-US/hotel/1`, quando abro, então recebo `308` para `/search?x` ou
   `/en/hotel/1`.
4. Dado o cookie `infotera-locale=en-US`, quando abro `/hotel/1`, então sou redirecionado (`307`) para
   `/en/hotel/1`; sem cookie, com `Accept-Language: en-US`, continuo em `/hotel/1` (pt-BR).
5. Dado `/en/hotel/1?<critérios>`, quando ativo "Português" no header, então vou para
   `/hotel/1?<critérios>` em pt-BR, o cookie vira `pt-BR` e a seleção do `booking-draft` continua.
6. Dado `/en/xyz` ou `/en/hotel/abc`, quando abro, então vejo a página "não encontrada" em inglês
   com status 404.
7. Dado qualquer página em en-US, quando navego por links internos (card, breadcrumb, "Selecionar",
   "Nova busca", paginação, "Ver hotel" do mapa), então permaneço em `/en/...`.
8. Dado o `<head>` de `/hotel/1`, então há `link rel="alternate" hreflang="pt-BR"` (`/hotel/1`),
   `hreflang="en-US"` (`/en/hotel/1`) e `x-default` (pt-BR); `title` e `description` no idioma.
9. Dado qualquer página em en-US do fluxo completo (home → busca → hotel → checkout → confirmação),
   quando leio o texto visível e os nomes acessíveis fora de elementos `[lang="pt-BR"]`, então não
   há texto em português (verificação automática por E2E: sem `ãõçáéíóúâêô` e sem palavras da
   lista pt).
10. Dado en-US, então preços aparecem como `R$1,200.00`/`R$1,200`, notas `4.5`, datas `Dec 1, 2026`,
    distâncias `2.3 km from center`; em pt-BR, exatamente como hoje (`R$ 1.200,00`, `4,5`,
    `1 de dez. de 2026`, `2,3 km do centro`).
11. Dado o formulário de busca ou o checkout em en-US, quando provoco cada erro de validação, então a
    mensagem aparece em inglês (inclusive máximo de noites com o número interpolado).
12. Dado en-US, descrições do hotel, quartos e avaliações aparecem em português dentro de elementos
    com `lang="pt-BR"`; comodidades, tipo de imóvel, política de cancelamento e camas aparecem em
    inglês.
13. Dado `npm run test`, o teste-catraca passa com `COPY_BASELINE = 0` (nenhum texto de UI fora de
    `i18n/`).
14. Dado o código, remover uma chave do `en-US.ts` de qualquer feature faz `npm run typecheck` falhar.

**Mapa do hotel**
15. Dado `/hotel/1` sem JS, então vejo o mapa estático da F4 (sem regressão).
16. Dado `/hotel/1` com JS e rede, quando rolo até "Localização", então o mapa vira interativo no
    mesmo centro/zoom, sem mudar a altura da seção (CLS 0 na troca), e o chunk do Leaflet só é
    pedido nesse momento (não no carregamento da página).
17. Dado o mapa interativo, quando chego por Tab, então o contêiner focado anuncia "Mapa:
    {endereço}" e a dica; setas movem, `+`/`-` e os botões de zoom (nome acessível traduzido)
    funcionam; a roda do mouse rola a página, não o mapa.
18. Dado o marcador do hotel focado, quando aperto Enter, então abre o popup com o nome; Esc fecha e
    o foco volta ao marcador.
19. Dado offline (ou chunk/tiles com erro), então o mapa estático permanece e nenhum erro aparece.
20. Dado o header sticky, quando rolo com o mapa na tela, então nenhum controle do mapa passa por
    cima do header, dos toasts ou da barra fixa mobile.

**Mapa dos resultados**
21. Dado `/search` com resultados, quando ativo "Mostrar mapa", então a URL ganha `map=1` (sem nova
    entrada no histórico), a página não muda, o painel aparece acima da lista com um marcador por
    hotel listado (10 na página 1 do Rio) e o enquadramento mostra todos.
22. Dado `map=1`, quando mudo filtro, ordenação ou página, então os marcadores passam a ser os
    hotéis exibidos e o mapa reenquadra; "Limpar filtros" mantém `map=1`; "Filtros (n)" não conta o
    mapa; nova busca remove `map`.
23. Dado o mapa aberto, quando passo o mouse ou foco num card, então o marcador do hotel fica ativo
    (cor `primary`, acima dos outros); ao sair, volta ao normal.
24. Dado um marcador, quando clico (ou Enter), então abre popup com nome, nota, preço por noite,
    "Ver hotel" (leva os critérios, como o card) e "Mostrar na lista"; "Mostrar na lista" foca o
    link do card (no feed virtualizado, rola até o card e foca).
25. Dado o hotel 19 ou 48 (esgotados) na lista, então o marcador mostra "Esgotado" com o estilo
    esgotado e `aria-label` "{nome}, esgotado".
26. Dado o teclado, a ordem de Tab é: botão do mapa → "Pular o mapa" → mapa → marcadores na ordem da
    lista → lista; "Pular o mapa" aparece com o foco sobre o canto superior esquerdo do mapa (não no
    topo da tela, sem deslocar layout) e leva o foco ao link do 1º card da lista (no feed, rola até o
    índice 0), revelado abaixo do header.
27. Dado `map=1` com `_delay=3000`, então o painel mostra skeleton + "Carregando mapa…" e o leitor de
    tela ouve a mudança; com falha do chunk, `Alert` com "Tentar de novo" que recarrega o chunk.
28. Dado `map=1` em estado vazio, erro ou carregando a lista, então o painel não aparece (o botão
    continua pressionado).
29. Dado 320 px, então o painel ocupa a largura da coluna sem scroll horizontal, os marcadores têm
    alvo ≥ 24 px e o popup cabe na tela.
30. Dado `prefers-reduced-motion: reduce`, então reenquadrar e abrir popup acontecem sem animação.

**Offline**
31. Dado que abri `/search?<Rio>` online, quando abro a mesma URL numa nova aba com a API fora do ar
    (requests abortados), então a lista aparece do cache persistido (sem skeleton infinito) e o
    alerta de dados possivelmente desatualizados da F3 aparece.
32. Dado `localStorage["infotera:query-cache"]` depois do fluxo completo até a confirmação, então ele
    contém chaves `hotels`/`rooms`/`reviews`/`suggestions` e **nenhuma** chave `bookings`, nenhum
    nome/email/telefone/CPF digitado no checkout.
33. Dado um cache salvo há mais de 24 h, ou com `buster` de outra versão, ou JSON corrompido, quando
    abro o app, então ele é descartado e as queries buscam normalmente (sem erro).
34. Dado que fico offline, então o banner "Você está sem internet…" aparece abaixo do header em todas
    as rotas e é anunciado uma vez; ao voltar, "Conexão restabelecida." aparece e some em 4 s.
35. Dado o banner visível, então nada fica por baixo do header e o foco programático das features
    continua revelando o alvo abaixo do header.

**PWA** (contra o build: `npm run build && npm start`)
36. Dado `/manifest.webmanifest`, então ele é válido (nome, ícones 192/512/maskable que respondem
    `200 image/png`, `start_url`, `display: standalone`, cores dos tokens) e o Chrome considera o app
    instalável (Lighthouse/DevTools sem erro de instalabilidade).
37. Dado a primeira visita, então o SW `/serwist/sw.js` registra com escopo `/` e assume a página
    seguinte; `sw.js` responde com `Cache-Control: no-cache`.
38. Dado que visitei `/search?<Rio>` e `/hotel/1?<critérios>` online, quando fico offline e recarrego
    cada uma, então elas abrem (HTML do cache), a lista vem do persister e o banner aparece.
39. Dado offline, quando abro uma rota pública nunca visitada (`/hotel/7`), então vejo a página
    offline do locale (`/en/hotel/7` → página offline em inglês) com "Tentar de novo".
40. Dado que visitei `/checkout` e `/confirmation/:id`, então **nenhum** cache do SW
    (`caches.keys()` → todas as entradas) contém essas URLs (com ou sem `/en`); offline, abrir
    `/checkout` mostra a página offline, nunca uma cópia antiga.
41. Dado o checkout carregado por documento, então o registro do SW não gera violação de CSP
    (`collectCspViolations` da F5 vazio) e o header CSP continua único e com nonce novo a cada load.
42. Dado um build novo publicado com a aba aberta, então aparece o toast persistente "Nova versão
    disponível." com "Atualizar"; ao clicar, a página recarrega controlada pelo SW novo; caches
    `pages-*`/`static-*` do build antigo foram apagados.
43. Dado Chromium com `beforeinstallprompt`, então a home mostra o cartão de instalação; "Agora não"
    esconde por 30 dias (sobrevive a reload); "Instalar" chama `prompt()`; em modo `standalone`
    ou depois de `appinstalled`, o cartão não aparece.

**Acessibilidade, mobile e segurança (transversais)**
44. axe sem violações (wcag2a/2aa/21aa/22aa) em: home pt/en (com cartão de instalação), `/search`
    com mapa aberto (pt/en), `/hotel/1` com mapa interativo, página offline, banner offline visível.
45. Em 320 px e zoom 200%: seletor de idioma, banner, cartão de instalação e mapas sem scroll
    horizontal; textos em inglês (mais longos em botões) não estouram os botões.
46. O marcador de mapa nunca renderiza HTML vindo da API (teste com nome contendo `<img onerror>`
    exibe o texto literal).
47. Nenhum request vai a `tile.openstreetmap.org` durante a suíte E2E (interceptado e contado).
48. O cookie de idioma não tem dado pessoal e a escolha de idioma não altera o que é persistido.

## Arquivos

**Novos**

| Caminho | Responsabilidade |
|---|---|
| `src/shared/i18n/config.ts` (+test) | `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `isLocale`, `localeSchema`, `LOCALE_COOKIE`, `LOCALE_PREFIX` |
| `src/shared/i18n/paths.ts` (+test) | `localizePath`, `parsePublicPath`, `switchLocalePath`, `resolveLocaleRequest` (rewrite/redirect/next), `isCheckoutPath`, `alternatesFor(path)` |
| `src/shared/i18n/messages.ts` (+test) | `defineMessages`, `plural` |
| `src/shared/i18n/client.tsx` (+test) | `"use client"` `I18nProvider`, `useLocale`, `contentLang` |
| `src/shared/i18n/server.ts` | `getLocale()` (`next/root-params`) |
| `src/shared/i18n/common/{pt-BR,en-US,messages}.ts` | textos de `shared/ui`, erros (`toUserMessage`), rótulos de enums, formatos |
| `src/shared/lib/map-tiles.ts` | `TILE_URL`, `TILE_ORIGIN`, `MAX_ZOOM`, atribuição |
| `src/shared/lib/geo.ts` (+test) | `boundsOf`, `fitPlan`, `osmLink` (promovido da F4) |
| `src/shared/ui/map/InteractiveMap.tsx` · `MapMarkerElement.ts` · `index.ts` (+test) | mapa genérico (react-leaflet), marcador DOM seguro, a11y, reduced motion |
| `src/shared/api/persist.ts` (+test) | `PERSIST_KEY`, `PERSIST_MAX_AGE`, `isPersistableQueryKey`, `persistedClientSchema`, `createQueryPersister` |
| `src/features/app-shell/` `index.ts`, `CLAUDE.md`, `i18n/*` | API pública: `OfflineBanner`, `LanguageSwitch`, `ServiceWorkerRegistrar`, `InstallPromptCard`, `OfflinePage` |
| `src/features/app-shell/model/cache-rules.ts` (+test) | `cacheRuleFor({ url, method, headers, apiOrigin })` → regra da Decisão 12; `PUBLIC_ROUTES`, `PRIVATE_ROUTES` |
| `src/features/app-shell/model/install-prompt.ts` (+test) | `installPromptView`, `INSTALL_SNOOZE_DAYS` |
| `src/features/app-shell/model/connectivity.ts` (+test) | `connectivityView(prevOnline, online)` → `hidden \| offline \| restored` |
| `src/features/app-shell/store/install-store.ts` | evento `beforeinstallprompt` guardado (listener no escopo do módulo) |
| `src/features/app-shell/components/*` | `OfflineBanner`, `LanguageSwitch`, `ServiceWorkerRegistrar`, `InstallPromptCard`, `OfflinePage` |
| `src/app/sw.ts` | SW Serwist: precache, `cacheRuleFor` → estratégias, fallbacks, limpeza por build, `SKIP_WAITING` |
| `src/app/serwist/[path]/route.ts` | `createSerwistRoute({ swSrc: "src/app/sw.ts", useNativeEsbuild: true, additionalPrecacheEntries })` |
| `src/app/manifest.ts` (+test) · `src/app/icon.tsx` · `src/app/apple-icon.tsx` | manifest e ícones |
| `src/app/[locale]/offline/page.tsx` | página offline (estática) |
| `src/app/[locale]/[...rest]/page.tsx` | `notFound()` para caminho desconhecido dentro do locale |
| `src/features/*/i18n/{pt-BR,en-US,messages}.ts` + `hooks/use*Messages.ts` | dicionários por feature (search-form, hotel-search, hotel-details, checkout, booking-confirmation, F7a) |
| `src/features/hotel-details/components/InteractiveLocationMap.tsx` | ilha cliente sobre o estático (IO + online + load dos tiles) |
| `src/features/hotel-search/store/map-sync.ts` (+test) | `activeHotelId`, `revealCard` |
| `src/features/hotel-search/model/map-markers.ts` (+test) | itens exibidos → `MapMarker[]` (preço compacto, esgotado, `aria-label`, ordem da lista) |
| `src/features/hotel-search/components/ResultsMap.tsx` · `MapToggle.tsx` · `MapPopup.tsx` | painel, alternância, popup |
| `src/i18n-guard.test.ts` | catraca de texto (Decisão 20) |
| `e2e/i18n.spec.ts` · `e2e/maps.spec.ts` · `e2e/offline.spec.ts` · `e2e/pwa.build.spec.ts` · `e2e/helpers/tiles.ts` · `e2e/helpers/language.ts` | E2E (ver Plano) |

**Alterados**

| Caminho | Mudança |
|---|---|
| `package.json` / lock | `leaflet 1.9.4`, `react-leaflet 5.0.0`, `@tanstack/react-query 5.108.1`, `@tanstack/react-query-persist-client 5.108.1`, `@tanstack/query-sync-storage-persister 5.108.1`, `@serwist/turbopack 9.5.15`, `serwist 9.5.15`; dev: `@types/leaflet 1.9.22`, `esbuild 0.28.2`; script `test:e2e:build` |
| `next.config.ts` | `withSerwist(...)`, `env.NEXT_PUBLIC_APP_VERSION`, headers de `/serwist/:path*` (`Cache-Control: no-cache`) |
| `src/proxy.ts` (F5) | rewrite/redirect por locale + CSP de `/checkout` nos dois idiomas; matcher amplo |
| `src/shared/lib/csp.ts` (F5) | `worker-src 'self'`, `manifest-src 'self'`, `TILE_ORIGIN` em `IMAGE_HOSTS` |
| `src/app/**` → `src/app/[locale]/**` | todas as rotas, `loading`/`error`/`not-found`; `PageProps<"/[locale]/...">`; `generateMetadata` por locale com `alternates` |
| `src/app/[locale]/layout.tsx` | `generateStaticParams`, `dynamicParams = false`, `<html lang>`, `I18nProvider`, `viewport.themeColor`, `SiteHeader actions`, `OfflineBanner`, `ServiceWorkerRegistrar` |
| `src/app/global-error.tsx` | locale pelo caminho (`parsePublicPath(location.pathname)`), textos do dicionário comum |
| `src/shared/providers/AppProviders.tsx` | `PersistQueryClientProvider` |
| `src/shared/api/query-client.ts` | `gcTime` 24 h no browser |
| `src/shared/ui/layout/SiteHeader.tsx` | prop `actions`; logo por `localizePath`; textos do dicionário comum |
| `src/shared/ui/toast/toast-store.ts` | `persistent` (se a F7a não tiver feito) |
| `src/shared/lib/{currency,format,dates,labels,search-params,links}.ts` · `api/errors.ts` | `locale` (opcional → obrigatório), rótulos por chave, `applySearchCriteriaRules(messages)`, links localizados |
| `src/shared/testing/render.tsx` | opção `locale` (padrão pt-BR) |
| `src/features/hotel-search/model/search-filters.ts` · `filter-change.ts` | `map` (parse/serialize, `toggleMap`, `clear` mantém) |
| `src/features/hotel-search/components/{ResultsToolbar,HotelCard,ResultsSection}.tsx` · `hooks/useSearchFilters.ts` | botão do mapa, destaque, painel; `pathname` via `localizePath` (sem `usePathname` em render) |
| `src/features/hotel-details/components/LocationMap.tsx` | envolve `InteractiveLocationMap` |
| `src/features/*/**` | textos → dicionário; links por `localizePath`; schemas com mensagens injetadas |
| `src/features/checkout/hooks/useStrictDocument.ts` · `hotel-details/hooks/useSelectRoom.ts` | `isCheckoutPath`, `localizePath` |
| `playwright.config.ts` | tiles interceptados por padrão (fixture), projeto `build` para `*.build.spec.ts` |
| `CLAUDE.md` (raiz), `src/app/CLAUDE.md`, `src/shared/CLAUDE.md`, CLAUDE.md das features | Decisão 23 + estruturas novas |
| `docs/design/design-system.md` | componentes da seção UI/UX (pelo `ui-designer`) |

## Tarefas

Cada item = 1 commit (Conventional Commits). "Prova" = o que precisa estar verde.

**A. Núcleo de i18n e rotas**
1. `feat(shared): add i18n config, locale paths and typed messages` — `config.ts`, `paths.ts`,
   `messages.ts`, `client.tsx`. Prova: unit (`localizePath` pt/en com query e hash; `parsePublicPath`
   para `/`, `/en`, `/en/`, `/en/search?x`, `/english`(→ pt, caminho `/english`); `switchLocalePath`
   preserva query; `resolveLocaleRequest` em tabela: sem prefixo → rewrite pt; `/en/x` → rewrite
   en; `/pt-BR/x`/`/en-US/x` → 308; cookie en em caminho sem prefixo → 307; `Accept-Language` ignorado;
   `plural` 0/1/2; `defineMessages` tipado).
2. `feat(shared): add locale-aware formatters` — `currency`, `format`, `dates` com `locale` opcional
   (padrão pt-BR). Prova: unit em tabela pt/en (critério 10) e os testes atuais sem mudança.
3. `test: add ui copy ratchet` — `src/i18n-guard.test.ts` com `COPY_BASELINE` = contagem real.
   Prova: teste verde; a contagem vai no corpo do commit (inventário do custo).
4. `refactor(app): move routes under locale segment` — `git mv` de todas as rotas para
   `app/[locale]/`, `getLocale`, `I18nProvider`, `<html lang>`, `generateStaticParams`,
   `dynamicParams = false`, `[...rest]`, proxy com `resolveLocaleRequest` composto com a CSP da F5
   (`isCheckoutPath`), `alternates`. Prova: **toda a suíte E2E existente verde sem mudar URL**;
   unit do proxy (rewrite, redirects, CSP só em checkout pt/en, não em prefetch, um único header);
   `npm run build` ok; `curl` em `/en` responde 200 (texto ainda pt).
5. `feat(app-shell): add language switch` — feature `app-shell`, `SiteHeader actions`, cookie.
   Prova: componente (href de fallback no SSR, href real após montar, cookie gravado, `lang`/
   `hrefLang`, rótulos) + E2E critérios 4 e 5.

**B. Mapas**
6. `build: add leaflet and react-leaflet` + `feat(shared): add map tiles and geo helpers` —
   `map-tiles.ts`, `geo.ts` (`osmLink` promovido; F4 importa de shared), `csp.ts` usa `TILE_ORIGIN`
   e ganha `worker-src`/`manifest-src`. Prova: unit (`fitPlan` 0/1/n pontos; bounds; CSP exata
   atualizada); testes da F4 verdes.
7. `feat(shared): add interactive map component` — `InteractiveMap`, marcador DOM seguro, a11y,
   reduced motion, `isolate`. Prova: componente com Leaflet real no jsdom só para o marcador
   (`MapMarkerElement`: texto literal com `<img onerror>`, `aria-label`, `data-active`) e mock do
   `react-leaflet` para o contrato de props; `next build` com chunk do mapa separado.
8. `feat(hotel-details): upgrade location map to interactive` — `InteractiveLocationMap`. Prova:
   componente (não carrega sem IO/offline; troca só após `load`; erro mantém estático) + E2E
   critérios 15–20 (`maps.spec.ts`, tiles interceptados).
9. `feat(hotel-search): add map preference to url filters` — `map` em `search-filters`/
   `filter-change`. Prova: unit (round-trip; inválido → fechado; `clear` mantém; `toggleMap` não zera
   página; `countActiveFilters` ignora; nova busca remove).
10. `feat(hotel-search): add results map markers model and sync store` — `map-markers.ts`,
    `map-sync.ts`. Prova: unit (ordem da lista, esgotado, preço compacto pt/en, `aria-label`; store:
    hover liga/desliga, seletor por id).
11. `feat(hotel-search): add results map panel synced with the list` — `MapToggle`, `ResultsMap`,
    `MapPopup`, destaque no `HotelCard`, "Pular o mapa", "Mostrar na lista" (páginas e feed).
    Prova: componente (painel só na visão `results`; toggle `aria-pressed`; hover no card ativa
    marcador via store; skip link) + E2E critérios 21–30.

**C. Offline**
12. `build: bump tanstack query and add persist client` — 5.108.1 nos três pacotes. Prova:
    `npm run test` e E2E existentes verdes.
13. `feat(shared): add public query cache persistence rules` — `persist.ts`. Prova: unit (allowlist
    em tabela com todas as chaves de `queryKeys` + raiz desconhecida → false; `bookings` → false;
    envelope válido/ inválido/ `buster` diferente/ expirado).
14. `feat(shared): persist public queries across reloads` — `AppProviders`, `gcTime`,
    `NEXT_PUBLIC_APP_VERSION`. Prova: componente (restaura do storage sem fetch; não grava query
    `bookings`; storage corrompido → app sobe) + E2E critérios 31–33.
15. `feat(app-shell): add global offline banner` — `connectivity.ts`, `OfflineBanner` no layout.
    Prova: unit do modelo; componente (eventos `offline`/`online`, região sempre montada, 4 s com fake
    timers) + E2E critérios 34–35.

**D. PWA**
16. `feat(app): add web app manifest and generated icons` — `manifest.ts`, `icon.tsx`,
    `apple-icon.tsx`, `themeColor`. Prova: unit do `manifest()`; E2E (build) critério 36 (ícones 200
    `image/png`).
17. `feat(app-shell): add service worker cache rules` — `cache-rules.ts`. Prova: unit em tabela com
    **todas** as linhas da Decisão 12, incluindo `/en/checkout`, `/confirmation/x` como RSC, POST em
    `/search`, origem da API, `i.pravatar.cc`, rota desconhecida → sem `respondWith`.
18. `feat(app): add serwist service worker` — `sw.ts`, rota `serwist`, `withSerwist`, página
    `/offline` (pt/en), exclusões no matcher do proxy, header `no-cache`. Prova: `npm run build`;
    E2E (build) critérios 37–41.
19. `feat(app-shell): register service worker and prompt for updates` — `ServiceWorkerRegistrar`,
    toast persistente (`toast-store` se preciso). Prova: componente (mock de `@serwist/window`:
    `waiting` → toast; "Atualizar" → `SKIP_WAITING`; desligado em dev) + E2E (build) critério 42.
20. `feat(app-shell): add install prompt card` — `install-prompt.ts`, store, `InstallPromptCard` na
    home. Prova: unit (`show`/`hidden` em tabela: sem evento, standalone, dispensado há 29/31 dias);
    componente (evento sintético `beforeinstallprompt`, "Agora não" grava, `appinstalled`) + E2E
    critério 43 (evento disparado por `page.evaluate`).

**E. Tradução (cada uma: pt-BR + en-US, `locale` nos formatadores, links localizados, catraca baixa)**
21. `feat(shared): translate shared ui and error copy` — dicionário `common`, `SiteHeader`,
    `SkipLink`, `Pagination`, `Dialog`, `ErrorState`/`EmptyState` padrões, `toUserMessage`, rótulos de
    enums (`ratingLabel` vira chave), `render.tsx` com `locale`. Prova: testes de `shared` em pt sem
    mudança + casos en; catraca menor.
22. `feat(search-form): translate copy and validation messages` — inclui
    `applySearchCriteriaRules(messages)` e `makeSearchFormSchema(today, messages)`. Prova: unit de
    schema pt/en (critério 11), componente em en; catraca.
23. `feat(hotel-search): translate models and copy` — `results-view`, rótulos, F3b (distância,
    feed), mapa. Pode sair em 2 commits (`model` / `components`). Prova: unit em tabela pt/en; catraca.
24. `feat(hotel-details): translate copy and mark api content language` — inclui `lang="pt-BR"`
    (critério 12), breadcrumb, metadata. Prova: unit/ componente pt/en; catraca.
25. `feat(checkout): translate step schemas and messages` + 26. `feat(checkout): translate checkout
    ui and terms` — schemas por passo com mensagens injetadas; resumo, preço, termos (texto do modal
    também), envio, alertas. Prova: unit dos schemas pt/en; componente en; catraca.
27. `feat(booking-confirmation): translate copy` + traduções da F7a (favoritos, comparação,
    histórico, toasts) — um commit por feature da F7a. Prova: componente en; catraca.
28. `refactor(shared): require locale in formatters` — `locale` obrigatório; `COPY_BASELINE = 0`;
    metadata/not-found/error/global-error/offline por locale. Prova: typecheck verde (nenhum uso sem
    locale), catraca 0 (critério 13).

**F. E2E e docs**
29. `test(e2e): add english journey and copy language check` — `i18n.spec.ts`: fluxo completo em
    `/en` (critérios 2, 6–9, 11), helper que varre texto e nomes acessíveis fora de `[lang="pt-BR"]`;
    axe pt/en (44); 320 px (45). Prova: verde em dev e no build.
30. `test(e2e): add pwa and offline build suite` — `pwa.build.spec.ts`, script `test:e2e:build`.
    Prova: verde com `PLAYWRIGHT_BASE_URL` contra `npm run build && npm start`.
31. `docs: record platform extras decisions` — CLAUDE.md raiz/app/shared/features (Decisão 23),
    nota de README (OSM, conteúdo pt em `/en`, `<input type=date>`, sem `Accept-Language`, sem
    iOS hint, limites do offline). Prova: revisão.

## Plano de testes

**Unit (Vitest, `model/` e `shared/lib|i18n|api`)**
- `paths.ts`: tabela de `resolveLocaleRequest` (≥ 15 linhas, incluindo `/en`, `/en/`, `/enx`,
  `/EN`, `/en-US/...`, `/pt-BR`, cookie inválido, cookie en em `/en/...` (nada), RSC/prefetch).
- `messages.ts`/`plural`, formatadores pt/en (moeda com/sem centavos, datas curtas/longas, faixa de
  datas, nota, distância, hóspedes).
- `geo.ts`, `map-markers.ts`, `map-sync` store, `search-filters` com `map`.
- `persist.ts`: allowlist exaustiva sobre `queryKeys`; envelope; expiração; buster.
- `cache-rules.ts`: tabela completa da Decisão 12 (≥ 25 casos).
- `install-prompt.ts`, `connectivity.ts`, `manifest()`.
- `i18n-guard.test.ts` (catraca).

**Componente (Testing Library)**
- `render.tsx` aceita `locale`; cada tarefa de tradução adiciona pelo menos um teste do componente
  principal em en-US.
- `LanguageSwitch` (SSR/fallback e pós-montagem), `OfflineBanner`, `InstallPromptCard`,
  `ServiceWorkerRegistrar` (mock de `@serwist/window`), `InteractiveLocationMap` (mock de
  `IntersectionObserver` e do chunk), `ResultsMap`/`MapToggle` (mock de `react-leaflet` com
  marcadores como botões para o contrato; o Leaflet real fica para o E2E), `PersistQueryClientProvider`
  (storage semeado → sem `fetch`).

**E2E (Playwright)** — fixture global que intercepta `https://tile.openstreetmap.org/**` com um PNG
256×256 local e conta requests (critério 47).
- `i18n.spec.ts` (dev e build): critérios 1–9, 11, 12; checagem de idioma do texto; axe pt/en.
- `maps.spec.ts`: hotel (15–20) e busca (21–30), teclado, 320 px (projeto mobile), reduced motion
  (`page.emulateMedia({ reducedMotion: "reduce" })`), `_delay=3000` na lista e chunk do mapa
  atrasado por `page.route` em `/_next/static/**` do chunk do Leaflet; falha do chunk por `abort`.
- `offline.spec.ts` (dev): 31–35 (API abortada com `page.route(apiURL/**)`, `context.setOffline`,
  storage inspecionado).
- `pwa.build.spec.ts` (só com `PLAYWRIGHT_BASE_URL`, `test.skip` em dev): 36–43; espera
  `navigator.serviceWorker.ready` + controller, `context.setOffline(true)`, `caches.keys()` e
  `cache.keys()` para provar que `/checkout`/`/confirmation` não estão lá; atualização simulada com
  `registration.update()` contra um segundo build não é viável em CI → critério 42 testado com
  componente + verificação manual documentada.
- Cenários de rede: `_delay=3000` (skeleton do mapa e banner não conflitam), `_fail=1` (painel some
  na visão de erro; o persister não grava erro), `--fail-rate 0.3` manual com o mapa aberto.
- Regressão: suíte inteira existente (F2–F6, F7a) verde após a tarefa 4 e após cada tradução (pt).

## Riscos

| Risco | Mitigação |
|---|---|
| Mover `app/` para `app/[locale]` + rewrite quebra rotas, tipos `PageProps`, testes de página, prefetch ou a CSP da F5 | Tarefa 4 isolada e só estrutural (texto não muda); prova = suíte E2E existente intacta + unit do proxy; `next typegen` regenera os tipos |
| `usePathname` com rewrite do proxy causa hydration mismatch (doc do Next 16) | Nenhum `href` derivado de `usePathname` em render: links por `localizePath(locale, rota)`; seletor calcula após montar; `useSearchFilters` usa `localizePath(locale, "/search")` |
| i18n estoura o prazo (600–900 chaves) | Fatiado por feature com catraca; infra primeiro garante que cada fatia é independente; se parar no meio, o estado é coerente em pt-BR e o README declara as features ainda sem en-US (nunca entregar assim: a tarefa 28 é a definição de pronto) |
| Arquivos de dicionário passam de 250 linhas (Biome) | Divisão por seção já prevista (checkout, hotel-search) |
| Texto em inglês mais longo quebra botões/toolbar em 320 px | Critério 45 + E2E mobile em `/en`; o `ui-designer` revisa microcopy curta |
| Persister restaura dado com formato antigo (sem Zod) | `buster` por deploy + envelope validado + boundaries das seções já existentes |
| `localStorage` cheio / modo privado | Persister síncrono falha em silêncio (`throttle` + `try` no `serialize`); app funciona sem persistência |
| Precisar subir `@tanstack/react-query` para 5.108.1 | Commit próprio (tarefa 12) com a suíte inteira como prova |
| `@serwist/turbopack` não integrar com Next 16.4 (route handler, esbuild nativo) | Spike na tarefa 18 com time-box de 1 h; plano B: `esbuild-wasm` (padrão do pacote); plano C: SW em TS compilado por script `esbuild` próprio para `public/sw.js` reutilizando `cache-rules.ts` (o modelo testado não muda) |
| SW servir HTML velho/nonce de checkout | Allowlist (rota privada nunca casa), caches por build, E2E inspecionando `caches` |
| Respostas opacas (sem CORS) do Unsplash/OSM inflam a cota de storage (~7 MB por resposta opaca no Chrome) | `crossOrigin="anonymous"` no `<img>` do mapa (TileLayer) e no `RemoteImage`; regra só aceita status 200 (CORS). **Verificar os headers `Access-Control-Allow-Origin` dos dois hosts na tarefa 18**; se faltar, não cachear aquele host (nunca aceitar status 0) |
| Política de uso dos tiles do OSM (bloqueio por volume) | Uso leve, atribuição, cache de 7 dias, E2E interceptado; README recomenda provedor com SLA em produção (trocar `TILE_URL`) |
| Leaflet sobrepõe header/toasts (`z-index` 400–1000) | `isolate relative z-0` no contêiner; critério 20 |
| Arrasto de 1 dedo no mapa "prende" a rolagem no celular | Painel com altura limitada (≤ 45 dvh) e margens laterais roláveis; mapa fechado por padrão na busca; no hotel, a seção é curta |
| `beforeinstallprompt` disparar antes do JS hidratar | Listener no escopo do módulo do chunk do layout; se perdido, o navegador ainda oferece a instalação nativa (sem regressão) |
| Teste-catraca com falso positivo/negativo (regex) | Allowlist explícita e revisão do inventário na tarefa 3; complementado pelo E2E de idioma (critério 9), que pega o que a regex deixar passar |
| Interceptação de rotas da F7c com reescrita do proxy | Costura registrada: F7c testa as duas línguas; links sempre públicos via `localizePath` |
| Ícones gerados por `ImageResponse` na raiz de `app/` fora do root layout `[locale]` | Verificado na tarefa 16 (E2E dos ícones); plano B: PNGs gerados por script uma vez a partir do mesmo componente e versionados em `public/icons/` |
