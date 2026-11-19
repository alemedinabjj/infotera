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
