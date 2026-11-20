# Infotera

Sistema de reserva de hotéis (busca, detalhe, checkout e confirmação) feito para o desafio frontend em [`docs/TEST_FRONTEND.md`](docs/TEST_FRONTEND.md), com Next.js 16, TypeScript strict e a `mock-api` fornecida.

- Demo: https://\<preencher\>.vercel.app
- API (Render): https://infotera-mock-api.onrender.com

A API roda no plano free do Render e dorme depois de ~15 min sem uso. O primeiro request depois disso pode levar cerca de 1 minuto (cold start). Se a demo parecer travada na primeira visita, espere ou recarregue.

## Como rodar

Requisitos: Node `^22.22.2 || >=24.15.0` (campo `engines` do `package.json`; o `.nvmrc` fixa 22) e npm.

```bash
# 1. API mockada (http://localhost:3333, delay de 300 ms)
cd mock-api && npm install && npm run server

# 2. Front, em outro terminal, na raiz do repositório
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Variáveis (`.env.example`):

| Variável | Para quê | Padrão |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API. Nunca há `localhost` fixo no código | `http://localhost:3333` |
| `NEXT_PUBLIC_SITE_URL` | Origem pública do site (`metadataBase`: canonical e hreflang absolutos). Opcional | `http://localhost:3000` |

Para apontar para a API publicada, use `NEXT_PUBLIC_API_URL=https://infotera-mock-api.onrender.com`.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm run start` | Build e servidor de produção |
| `npm run typecheck` | `next typegen && tsc --noEmit` |
| `npm run lint` | `biome check .` |
| `npm run format` | `biome check --write .` |
| `npm run test` / `npm run test:watch` | Vitest (unitário e componente) |
| `npm run test:e2e` | Playwright em desktop e mobile (Pixel 7) contra `next dev` |
| `npm run test:e2e:prod` | Só os testes `@prod`, contra `next build && next start` |
| `npm run test:e2e:build` | Specs do PWA contra o build (`e2e/pwa.build.spec.ts`) |

**O `npm run build` precisa da API no ar.** A página do hotel é gerada por ISR e o `generateStaticParams` lista os 60 hotéis na API durante o build. Há retry com backoff (8 tentativas, até ~1,5 min) para absorver o cold start do Render, mas sem API o build falha com uma mensagem dizendo para subi-la. Acorde a API antes do deploy.

### E2E

O `test:e2e` sobe sozinho a mock-api, um proxy de controle e o front (precisa de `npm install` em `mock-api/` e de `npx playwright install chromium`). A cadeia é navegador e servidor do Next, depois o proxy (`:3334`), depois a mock-api (`:3333`). O proxy deixa o teste atrasar, falhar ou segurar requests feitos pelo **servidor** do Next, que o `page.route` não enxerga. Portas por ambiente:

| Variável | Padrão |
|---|---|
| `E2E_MOCK_API_PORT` | 3333 |
| `E2E_PROXY_PORT` | 3334 |
| `E2E_FRONT_PORT` | 3000 |
| `E2E_UPSTREAM_URL` | `http://localhost:<E2E_MOCK_API_PORT>` |
| `PLAYWRIGHT_BASE_URL` | Testa um deploy externo e não sobe nada |

Só pode haver um `next dev` por pasta; use `E2E_FRONT_PORT` apenas para mudar a porta.

## Funcionalidades

O escopo foi **todos os requisitos básicos e todos os opcionais** do enunciado, com uma exceção justificada (Edge Runtime). Onde a mock-api não tem o dado, a decisão está na spec correspondente em [`docs/specs/`](docs/specs).

| Requisito | Onde e como |
|---|---|
| **Home `/`**: autocomplete, datas, quartos e hóspedes, redirect para `/search` | `features/search-form`. Combobox ARIA com debounce de 300 ms e estado de loading. Datas validadas (passado, mínimo 1 noite, máximo 30) por RHF + Zod em tempo real. Últimas 5 buscas em `localStorage` |
| **Busca `/search`**: lista, skeleton, vazio, paginação | `features/hotel-search`. Os 4 estados de dado remoto, paginação por `_page`/`X-Total-Count` |
| Filtros (preço, nota, tipo, comodidades), ordenação, URL sync, compartilhar | A URL é a fonte da verdade. Comodidades com E por uma regex com lookaheads em `amenities_like`. Ordenação: menor preço, melhor avaliação, mais popular (`reviewCount`) e distância (calculada no cliente) |
| Retry, error boundaries, prefetch, virtualização, blur | Boundary por seção com retry. Prefetch só no hover/foco do card. Modo rolagem contínua virtualizado com `@tanstack/react-virtual`. `next/image` com blur |
| **Detalhe `/hotel/[id]`**: galeria, info, quartos, "Selecionar" | `features/hotel-details`. "Selecionar" grava `{ hotelId, roomId, criteria }` no Zustand (`booking-draft`) e abre o checkout |
| Galeria interativa, disponibilidade, comparação de quartos, cancelamento, mapa, reviews, similares, compartilhar, breadcrumb, âncoras | Galeria como rota (`/hotel/[id]/photos/[n]`, modal por Parallel + Intercepting Route). Selo "Apenas N" e esgotado. Reviews paginadas. Mapa estático que vira Leaflet sob demanda |
| Performance: RSC, fetch paralelo, streaming | Casca estática (PPR) com buracos por Suspense. Dados do catálogo em funções `"use cache"` |
| **Checkout `/checkout`**: resumo, redirect, formulário, `POST /bookings` | `features/checkout`. Sem seleção, volta para a home. A reserva sai por Server Action |
| Multi-step, validações, múltiplos hóspedes e quartos, preço, termos, cupom, estados de carregamento e erro | 3 passos em um único `useForm`. CPF com dígito verificador, passaporte (formato ICAO), cartão com Luhn, validade, telefone com máscara por país. Breakdown de preço em função pura. Cupons locais (a mock-api não tem endpoint). Retry do envio sem duplicar reserva |
| Form persistence | Rascunho no `sessionStorage` com debounce de 500 ms, por whitelist. Nunca guarda cartão, CVV, validade, documento nem idade |
| **Confirmação `/confirmation/[id]`** | `features/booking-confirmation`. Lida no servidor a cada request (funciona com reload), número da reserva, resumo, botão de nova busca, "reserva não encontrada" |
| Loading, erro, toasts | Skeleton por componente, `ErrorBoundary` por feature, retry manual e automático, `console.error` estruturado só com `kind`/`status`, sistema de toasts |
| Favoritos, comparação (até 3), histórico de reservas | `features/favorites`, `hotel-comparison`, `booking-history`. Ficam no dispositivo (`localStorage`, só ids validados por Zod) |
| Framer Motion | `motion` com `LazyMotion`, só `opacity`/`transform`, respeita `prefers-reduced-motion` |
| Mapas interativos | Leaflet + OpenStreetMap, sem chave de API. Painel opcional nos resultados e mapa no detalhe |
| Modo offline e PWA | Manifest, ícones, service worker (Serwist), cache de consultas públicas, páginas `/offline*`, cartão de instalação |
| i18n pt-BR + en-US | Segmento `[locale]`, dicionários tipados por feature |
| Partial Prerendering, Server Actions, Parallel Routes, ISR | `cacheComponents`, `createBookingAction`, galeria em `@modal`, `generateStaticParams` com os 60 hotéis |
| Edge Runtime | **Avaliado e descartado** (ver Decisões) |
| Testes unitários, de componente e E2E | Vitest + Testing Library, Playwright + axe (ver Qualidade) |

Rotas extras: `/favorites`, `/compare`, `/my-bookings`, `/offline`. Em inglês, tudo com prefixo `/en`.

## Arquitetura

```
src/
  app/        rotas finas (page, layout, loading, error); só compõem features
  features/   search-form · hotel-search · hotel-details · checkout · booking-confirmation
              favorites · hotel-comparison · booking-history · app-shell
  shared/     código de 2+ features: api, ui, lib, i18n, stores, providers
mock-api/     API fornecida pelo teste (não é código nosso)
docs/         enunciado, mapa do teste, specs por feature, design system
```

- **Regra de dependência: `app → features → shared`.** Nunca o contrário, e uma feature não importa outra. O que duas features precisam sobe para `shared/`.
- **API pública por feature.** `app/` importa só pelo `index.ts` (`@/features/checkout`). A exceção é o `client.ts` de `hotel-details`: o `index.ts` leva código `"use cache"` ao bundle do cliente, então o `error.tsx` do modal da galeria importa o `client.ts`.
- **Estrutura interna** (só as pastas usadas): `api/` (query keys, `queryOptions`, mutations), `model/` (schemas Zod, tipos e lógica pura, sem React), `hooks/`, `components/`, `store/`, `i18n/`.
- **Server Components por padrão.** `"use client"` só na folha que tem interação. A lógica (datas, preço, filtros ↔ URL) é função pura em `model/` e o componente só apresenta.
- **TanStack Query** para todo dado de servidor no cliente. No servidor, o catálogo vem de funções `"use cache"`: `dehydrate` e `setQueryData` chamam `Date.now()`, o que quebra o prerender sob `cacheComponents`.
- **Zustand** para o que cruza telas: `booking-draft` (busca atual e quarto escolhido, em `sessionStorage`, só ids e critérios, nunca PII), toasts, favoritos e comparação, cartão de instalação. Filtros e página ficam na URL, não no store.
- **React Hook Form + Zod** nos formulários. **Toda resposta da API passa por um schema Zod** (`shared/api/schemas.ts`) e os tipos saem de `z.infer`.
- Cada feature tem um `CLAUDE.md` com as decisões locais; o design system está em [`docs/design/design-system.md`](docs/design/design-system.md).

## Decisões e trade-offs

**PPR (`cacheComponents`) e casca sem JS.** No Next 16.4, PPR é `cacheComponents: true` (+ `partialPrefetching`). A página do hotel é uma casca estática do catálogo (hotel, quartos, avaliações, similares) com buracos só para o que depende da estadia (total, botão "Selecionar", links com critérios). Os buracos vêm de uma única promessa de `searchParams` criada sem `await`; um `await` no topo da página tornaria a rota inteira dinâmica. A página do hotel não tem `loading.tsx`: o React tira do fluxo (`<div hidden>`) qualquer boundary concluída maior que ~12,8 KB e o hotel inteiro cairia nela, ficando invisível sem JavaScript. O custo é que dado de request ou não cacheado só pode ficar dentro de `<Suspense>`, e o build passa a cobrar isso. Home `○`, `/search` `◐`, hotel `◐`, confirmação `◐` (casca sem PII), checkout `ƒ`.

**ISR com retry no build.** `generateStaticParams` lista os 60 hotéis da API, então todo hotel abre da casca completa. Os dados têm `cacheLife` (hotel e avaliações `hours`, quartos `minutes`, porque disponibilidade é o campo volátil). A listagem tem retry com backoff por causa do cold start do Render. Trade-off assumido: o build depende da API. Em teste manual com `/rooms` falhando na revalidação, a página continuou servindo os quartos em cache.

**Soft 404 com `noindex`.** Sob `cacheComponents`, `notFound()` sai como `<html id="__next_error__">` com `<body>` vazio e o conteúdo só no cliente: sem JS, tela em branco e sem título. Por isso hotel, foto e rota desconhecida renderizam o "não encontrado" inline, com status 200 e `robots: { index: false }`. O custo é o status HTTP: `dynamicParams = false` daria 404 de verdade, mas é incompatível com `cacheComponents`. A confirmação ainda usa `notFound()`, porque a rota é dinâmica e sem PII na casca.

**Edge Runtime descartado** (spec F7c, Decisão 9). `runtime = 'edge'` está deprecated no 16.4, a doc do `cacheComponents` manda remover qualquer export de `runtime`, o Proxy roda só em Node e Edge não suporta ISR. Ficaria escolher entre Edge e PPR, e PPR + ISR resolvem melhor a latência e o cold start da API: a página sai do cache sem tocar nela. Os candidatos a Edge (proxy de `/suggestions`, imagem OG) não davam ganho real.

**CSP com nonce só no checkout.** O checkout coleta dados de pagamento, então ganha `script-src 'self' 'nonce-…' 'strict-dynamic'` aplicada por request no `src/proxy.ts`. Nonce exige renderização por request e é incompatível com PPR, então o resto do site usa uma política base estática (`next.config.ts`), sem o nonce. Consequências: o checkout abre por carga de documento (`location.assign`) e `export const instant = false` mais `await connection()` mantêm a casca vazia. Nunca crie `loading.tsx` ou `<Suspense>` acima do `connection()`. `require-trusted-types-for` e `report-to` ficaram de fora (o runtime do Next não é compatível sem política própria e não há backend para relatórios).

**Privacidade do cartão.** Número, CVV, validade e documento nunca são persistidos. Rota escondida pelo Activity (efeito do `cacheComponents`) mantém o estado, então ao esconder o checkout o formulário zera esses campos; o mesmo acontece em `pagehide`, e a volta pelo bfcache cai no passo de pagamento com aviso. O payload do `POST /bookings` leva só os 4 últimos dígitos (`cardLast4`); o documento é validado e descartado. Nada de `console.*` com valores do formulário. A tela mostra "Ambiente de demonstração, não use dados reais" porque a API pública não tem autenticação.

**Server Action recalculando preço.** `createBookingAction` recebe do cliente só referências, escolhas e o total esperado. O servidor relê hotel e quarto, recalcula o preço com a mesma função pura, reavalia cupom e disponibilidade e só então grava. O `totalPrice` nunca vem do cliente. O id da reserva é um UUID v4 por tentativa; numa falha ambígua do `POST`, um `GET /bookings/:id` decide se criou, então o retry não duplica e os ids não são enumeráveis. É a única Server Action (`bodySizeLimit: "64kb"`): favoritos, comparação e histórico não têm endpoint, e um store no servidor via cookie tornaria dinâmica toda página com coração.

**i18n por `[locale]`.** Todas as rotas vivem em `app/[locale]`. O `proxy.ts` reescreve `/x` para `/pt-BR/x` e `/en/x` para `/en-US/x`, então pt-BR mantém as URLs sem prefixo. O idioma vem do segmento, não de `cookies()`, para não tornar o layout dinâmico e matar o PPR. Dicionários por feature: pt-BR é a fonte e en-US tem o mesmo tipo, então chave faltando é erro de compilação. Um teste-catraca (`src/i18n-guard.test.ts`) barra texto de UI fora dos dicionários. Descartados: cookie lido no servidor e i18n por domínio.

**PWA e offline com allowlist.** A decisão de cache de cada request é uma função pura (`cacheRuleFor`) com allowlist de rotas: `/checkout`, `/confirmation/*` e `/my-bookings` nunca são gravados (nonce e PII), e a API fica fora do service worker. O dado offline vem do persister do TanStack Query, também por **allowlist** de chaves (`suggestions`, `hotels`, `rooms`, `reviews`), com validade de 24 h; chave nova não persiste por padrão e `bookings` fica de fora. Os caches levam a versão do build no nome e o `activate` apaga os antigos. Sem `skipWaiting` automático: aparece "Nova versão disponível" e o usuário decide, exceto dentro do checkout.

**Mapas Leaflet sob demanda.** O mapa do hotel é a versão estática, que vira Leaflet só quando entra perto da viewport e há conexão (`next/dynamic`, `ssr: false`). Se o chunk ou os tiles falham, o estático fica. Nos resultados, o mapa é um painel opcional (`map=1` na URL). Tiles do OSM com atribuição visível, sem chave de API. É uso leve; em produção real, o certo é um provedor com SLA (troca de uma constante em `shared/lib/map-tiles.ts`). Os E2E nunca batem no OSM.

**Preço em centavos.** Toda conta (diária × noites × quartos, taxa de serviço de 10%, ISS de 5% sobre a base com desconto) é feita em inteiros e formatada só na borda. Evita erro de ponto flutuante e deixa o cálculo idêntico no cliente e na Server Action.

**Limitações da mock-api.**
- Sem autenticação: `GET /bookings/:id` é aberto e `GET /bookings` (com PII) nunca é usado. Por isso o id é UUID e a confirmação é `no-store` e `noindex`.
- Não valida nada no `POST /bookings`: toda validação é do front e da Server Action.
- A ordenação "Menor preço" e o filtro de preço usam o `pricePerNight` do hotel (a API ordena por ele), que nem sempre é o menor quarto. O hotel 1 diz R$ 1.200 e tem quarto de R$ 800; o hotel 4 diz R$ 890 e tem quarto de R$ 720. O card e o detalhe mostram "a partir de" pelo menor quarto, então a ordem pode destoar do preço exibido nesses dois hotéis. Ordenar pelo quarto exigiria buscar os quartos do destino inteiro e ordenar no cliente.
- `amenities_like` repetido é OU; para E, usamos uma regex com lookaheads montada só a partir do enum de comodidades.
- `destination` é igualdade exata e sensível a acento; mandamos sempre o `name` da sugestão, nunca o texto digitado.
- O banco volta ao seed a cada restart: links `/confirmation/<id>` antigos viram "Reserva não encontrada".
- A disponibilidade não muda com reservas e não há endpoint de cupom, favoritos ou histórico (cupons e listas ficam locais).

## Qualidade

**Testes.**
- Vitest + Testing Library: 2.506 testes em 285 arquivos, cobrindo a lógica de `model/` e `shared/lib` (datas, preço, filtros ↔ URL, schemas Zod, validadores, regras de cache), hooks e componentes. A lógica pura nasce com TDD.
- Playwright: mais de 600 testes em 64 arquivos, rodando em desktop e mobile (Pixel 7). Cobrem o fluxo de reserva completo, i18n, PWA e offline, mapas, comparação, favoritos e histórico. Nove arquivos têm testes `@prod`, que só fazem sentido contra `next build && next start` (PPR, ISR, nonce da CSP, soft 404 sem JS).
- axe (`@axe-core/playwright`) nas telas principais e nos estados de erro.
- Cenários de lentidão e falha: `_delay` e `_fail` da mock-api para requests do navegador, e o proxy de controle (`e2e/helpers`, fixture `serverApi`) para atrasar, falhar ou segurar requests feitos pelo servidor do Next, como o `POST /bookings` dentro da Server Action.
- Os números são aproximados (contagem de `it`/`test` no código); rode `npm run test` para o valor exato.

**Padrões de código.**
- Biome bloqueia funções/componentes com mais de 80 linhas, arquivos com mais de 250 (500 em testes) e complexidade cognitiva acima de 15.
- React Doctor roda em toda PR (`.github/workflows`), bloqueando erros.
- TypeScript `strict` + `noUncheckedIndexedAccess`; zero `any`, zero `as` para silenciar o compilador, zero `@ts-ignore`; `unknown` + Zod na fronteira; `switch` exaustivo com `never`.

**Acessibilidade.** Alvo WCAG 2.2 AA: label em todo input, foco visível, navegação completa por teclado (combobox, galeria, drawers, formulário em passos), `aria-live` para loading e erro, contraste AA, sem quebra a 320 px e `prefers-reduced-motion` respeitado. Botões em carregamento usam `aria-disabled` em vez de `disabled`, para não perder o foco.

## Uso de IA

O desenvolvimento foi feito com Claude Code, com o fluxo escrito dentro do repositório.

- **`CLAUDE.md` por módulo.** Há um na raiz (stack, regras de código e dependência, comandos), em `src/app`, em `src/shared` e em cada feature. Eles registram as decisões que valem daqui para frente, para o agente não reabrir discussões já resolvidas.
- **Agentes em [`.claude/agents`](.claude/agents):** `planner` (escreve a spec com escopo e critérios de aceite), `ui-designer` (seção UI/UX da spec e o design system), `developer` (implementa, TDD na lógica pura), `qa` (testes de componente e E2E, axe, cenários de falha), `reviewer` (qualidade e arquitetura, só lê), `security` (PII, XSS, env, dependências, só lê), `ux-reviewer` (roda o app, screenshots por viewport, só lê) e `end-user-tester` (usa o app num navegador real, só lê).
- **Pipeline `/feature <id>`** ([`.claude/commands/feature.md`](.claude/commands/feature.md)): uma feature por vez, na ordem do [`docs/TEST_MAP.md`](docs/TEST_MAP.md). As specs de cada feature estão em [`docs/specs/`](docs/specs).
- **Revisão em paralelo e ciclos de correção.** `reviewer`, `security` e `ux-reviewer` leem o mesmo diff ao mesmo tempo. Os achados bloqueantes voltam para o `developer`, com no máximo 3 voltas antes de parar e perguntar ao humano.
- **Portão do usuário final.** O `end-user-tester` percorre as jornadas no navegador (celular, desktop, só teclado, conexão ruim, inglês) e um veredito `NÃO PRONTO` bloqueia a entrega.
- **Quem decide.** A IA propõe e implementa; o desenvolvedor humano define o escopo (por exemplo, implementar todos os opcionais e descartar o Edge), revisa o que entra e é o autor dos commits. Os commits não levam atribuição de IA.

Não há métricas de ganho de produtividade: não medi, e não vou inventar.

## Limitações conhecidas e próximos passos

- **Flakes só do `next dev` sob carga.** Alguns E2E de timing falham de forma intermitente quando o `next dev` está lento (compilação sob demanda em rodadas paralelas). Contra `next build && next start` não aparecem.
- **Specs só-dev.** `e2e/hotel-photos.states.spec.ts` (cartão de erro do modal, porque em produção uma resposta RSC 500 vira navegação de documento) e `e2e/hotel-details.rooms-error.spec.ts` (no build os quartos vêm do cache ISR) só rodam em dev. Os `@prod` só rodam em `test:e2e:prod`.
- **Itens de UX adiados da F7b:** aviso quando o mapa demora a carregar, fade de saída do cartão de instalação e alerta de offline quando o mapa fica sem tiles.
- **Galeria:** reload numa foto seguido de "Voltar para o hotel" perde as datas, porque carregar os critérios tiraria a galeria da casca estática.
- **Checkout:** vários quartos são N unidades do mesmo tipo (o `Booking` da API tem um único `roomId`); com crianças, recarregar volta ao passo 1 (a idade nunca é persistida); sem `crypto.randomUUID` (contexto sem HTTPS) a idempotência do retry se perde.
- **Dados locais.** Favoritos, comparação e histórico não sincronizam entre dispositivos. Precisariam de conta e de um backend.
- **Confirmação:** cancelar ou alterar a reserva, imprimir/PDF e compartilhar o link ficaram de fora.
- **Cancelamento:** os prazos exibidos são texto ilustrativo (a API só informa a categoria), centralizados em `cancellationDetails`.
- **Tiles:** o OSM serve ao teste; produção pediria provedor com SLA.
- **Comparação de hotéis** é uma página, não um modal por rota interceptada: a tabela de 3 colunas a 320 px fica pior em modal.
