# src/app — rotas (App Router)

Camada fina. Cada `page.tsx` só lê params, busca dados no servidor quando fizer sentido e
compõe componentes vindos de `@/features/<nome>` (pelo `index.ts`).

## Regras
- Nada de lógica de negócio, fetch manual ou estado aqui. Isso mora na feature.
- `params` e `searchParams` são `Promise` no Next 16: `const { hotelId } = await params`.
- Valide `params`/`searchParams` com o schema da feature antes de usar. Valor inválido → `notFound()` ou redirect.
- Cada rota com dado remoto tem `loading.tsx` (skeleton da feature) e `error.tsx` (`"use client"`, com botão de retry via `reset`).
- `generateMetadata` em toda página, com o título no idioma da rota (`params.locale`; dicionário da feature ou `common.routes`).
- `app/[locale]/layout.tsx` é o layout raiz: valida `[locale]` (`isLocale`, `dynamicParams = false`), define `<html lang={locale}>`, monta `I18nProvider` e os providers.

## Rotas por idioma (F7b)
- Todas as rotas vivem em `app/[locale]/`. O `src/proxy.ts` reescreve `/x` → `/pt-BR/x` e `/en/x` → `/en-US/x`, redireciona o segmento interno (308) e o cookie
  `infotera-locale=en-US` (307, exceto `/offline`) e aplica a CSP com nonce em `/checkout` e `/en/checkout` (não em prefetch). Tipos: `PageProps<"/[locale]/...">`.
- `[locale]/[...rest]/page.tsx` chama `notFound()` (404 dentro do idioma). `manifest.ts`, `icon.tsx`, `apple-icon.tsx` e `serwist/[path]/route.ts` ficam na raiz
  de `app/` (fora do idioma e fora do matcher do proxy). Não leia `cookies()` no layout (a F7c precisa de PPR): o idioma vem do segmento.
- `[locale]/offline/page.tsx` é a página offline (estática). `global-error.tsx` ainda é pt-BR fixo (vira por idioma na tradução da parte 2).

## Build (`next build`)
- `/[locale]` sai como **SSG** (`●`): `generateStaticParams` do layout lista `pt-BR` e `en-US`, então `/pt-BR` e `/en-US` são HTML pré-renderizado.
  O público `/` e `/en` não aparecem na tabela porque o `proxy.ts` os reescreve para esses segmentos internos; servem o mesmo HTML estático.
  Também SSG: `/compare`, `/favorites`, `/my-bookings`, `/offline`. Dinâmicas (`ƒ`): `/checkout`, `/confirmation/[bookingId]`, `/hotel/[hotelId]`,
  `/search` e `[...rest]` (404 por idioma).

## Mapa de rotas
| Rota | Feature |
|---|---|
| `/` | `search-form` (+ `app-shell`: cartão de instalação) |
| `/search` | `hotel-search` |
| `/hotel/[hotelId]` | `hotel-details` |
| `/checkout` | `checkout` |
| `/confirmation/[bookingId]` | `booking-confirmation` |
| `/favorites` | `favorites` |
| `/compare` | `hotel-comparison` |
| `/my-bookings` | `booking-history` |
| `/offline` | `app-shell` |

## `/checkout` (F5)
- `page.tsx` chama `await connection()` (nonce por request exige renderização dinâmica) e `src/proxy.ts` aplica a
  CSP estrita só nesta rota. O `next.config.ts` exclui `/checkout` da CSP base (um único header).

## `/confirmation/[bookingId]` (F6)
- `page.tsx` chama `await connection()` (rota sempre dinâmica, `no-store`: tem PII) e valida o id com `parseBookingId` antes de
  qualquer request. `error.tsx` só importa `@/shared/ui`; `not-found.tsx` exporta `metadata` com `noindex, nofollow`.

## F7a (extras)
- `/favorites`, `/compare` e `/my-bookings` são cascas **estáticas** com ilha cliente (`metadata` com `robots: { index: false }`): nenhum dado
  no servidor. `/compare` lê `?hotel=` no cliente dentro de `<Suspense fallback={<ComparisonFallback />}>`.
- `layout.tsx` monta `SavedNav` (slot `actions` do `SiteHeader`) e `CompareTray`; o `<main>` reserva o fim com
  `pb-[calc(var(--bottom-bar-height,0px)+1.5rem)]`. Importa os dois direto de `@/shared/saved/components/*` (Server Component).

## F7c (PPR, ISR, galeria como rota)
- `cacheComponents: true` + `partialPrefetching: true`: PPR é `cacheComponents` no 16.x. Regra: dado de request ou não cacheado só dentro de `<Suspense>`;
  `usePathname`/`useSearchParams`/`Date.now()` em client component na casca também (por isso `NavigationTracker`, `CompareTray`, `ServiceWorkerRegistrar`,
  `SavedNav` ficam sob Suspense). `dynamicParams` não existe mais (removido do layout; o `[locale]` inválido cai em `notFound()` no layout).
- Forma de cada rota (conferida no `npm run build`): `/` `○`; `/search` `◐`; `/hotel/[hotelId]` e `/hotel/1…60` `◐` (ISR, 60 ids da API); `/hotel/[hotelId]/photos/[photo]` `◐`;
  **`/checkout` `ƒ`** (casca vazia: `export const instant = false` + `await connection()`); `/confirmation/[bookingId]` `◐` (casca sem PII).
- **Nunca** crie `loading.tsx` nem `<Suspense>` acima do `connection()` do checkout (nem `app/loading.tsx`): viraria uma casca estática sem nonce. O `@prod` do nonce é o guarda.
- `hotel/[hotelId]/page.tsx` cria `const criteria = searchParams.then(toStayCriteria)` **sem `await`** e passa a promessa à feature: no prerender ela nunca resolve (tudo
  que a espera vira fallback), por request resolve na hora. `await searchParams` no topo mata o PPR da rota.
- Galeria: `hotel/[hotelId]/layout.tsx` (`{children}{modal}`), `@modal/default.tsx` (`null`), `@modal/(.)photos/[photo]` (modal) e `photos/[photo]` (página cheia). Funciona com o
  rewrite do `proxy.ts` (`/hotel/1/photos/3` ↔ `/pt-BR/...`). `error.tsx` do modal importa `@/features/hotel-details/client` (única exceção à regra "só `index.ts`": o `index` leva
  código `"use cache"` ao bundle do cliente). Foto inválida: a página renderiza `PhotoNotFound` (sem `not-found.tsx`: ele não recebe o hotel).
- Edge Runtime descartado: `runtime = 'edge'` é *deprecated* e incompatível com `cacheComponents`; o Proxy roda em Node. PPR + ISR resolvem latência/cold start melhor (README).
- `serverActions.bodySizeLimit: "64kb"` (única action: `createBookingAction`).
