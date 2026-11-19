# src/app — rotas (App Router)

Camada fina. Cada `page.tsx` só lê params, busca dados no servidor quando fizer sentido e
compõe componentes vindos de `@/features/<nome>` (pelo `index.ts`).

## Regras
- Nada de lógica de negócio, fetch manual ou estado aqui. Isso mora na feature.
- `params` e `searchParams` são `Promise` no Next 16: `const { hotelId } = await params`.
- Valide `params`/`searchParams` com o schema da feature antes de usar. Valor inválido → `notFound()` ou redirect.
- Cada rota com dado remoto tem `loading.tsx` (skeleton da feature) e `error.tsx` (`"use client"`, com botão de retry via `reset`).
- `metadata`/`generateMetadata` em toda página (título em pt-BR).
- `layout.tsx` raiz monta os providers de `@/shared/providers` e define `lang="pt-BR"`.

## Mapa de rotas
| Rota | Feature |
|---|---|
| `/` | `search-form` |
| `/search` | `hotel-search` |
| `/hotel/[hotelId]` | `hotel-details` |
| `/checkout` | `checkout` |
| `/confirmation/[bookingId]` | `booking-confirmation` |
| `/favorites` | `favorites` |
| `/compare` | `hotel-comparison` |
| `/my-bookings` | `booking-history` |

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
