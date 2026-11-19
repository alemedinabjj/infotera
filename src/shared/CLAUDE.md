# src/shared — fundação compartilhada (F1)

Só entra aqui o que **duas ou mais features** usam, ou primitivos óbvios de UI. Código de uma
feature só fica na feature; promova para cá quando aparecer o segundo uso.
`shared/` nunca importa de `features/` nem de `app/`.

## Estrutura
```
shared/
  api/        env.ts · http.ts · schemas.ts · query-client.ts
  lib/        dates.ts · currency.ts · search-params.ts · storage.ts
  ui/         atoms/ (Button, Input, Select, Checkbox, Skeleton, Badge, Stars, Spinner)
              molecules/ (Field, Stepper, Pagination, EmptyState, ErrorState, Dialog)
  providers/  AppProviders (QueryClientProvider + Toaster)
  stores/     booking-draft.ts (Zustand + persist)
```

## api/
- `env.ts`: valida `NEXT_PUBLIC_API_URL` com Zod no load; falha alta e clara se faltar.
- `http.ts`: `apiGet(path, schema, init?)` → faz fetch, checa `res.ok`, lança `ApiError { status, message }`,
  faz `schema.parse` do JSON. Variante paginada devolve `{ items, total }` lendo `X-Total-Count`.
  Funciona em Server e Client Components (sem APIs de browser).
- `schemas.ts`: Zod de `Suggestion`, `Hotel`, `Room`, `Review`, `Booking`, `Amenity`, `RoomAmenity`,
  portados de `mock-api/types.ts`. Tipos exportados via `z.infer`. Não use os `interface` do mock direto.
- `query-client.ts`: `retry` até 2 com backoff exponencial, sem retry em 4xx; `staleTime` 60s.
  No servidor, um `QueryClient` por request (`cache()` do React).

## lib/
- `dates.ts`: `nightsBetween`, `toISODate`, `isPast`, regras de 1–30 noites. Datas como `YYYY-MM-DD`
  em string; cuidado com fuso (use datas locais, não `new Date("2026-12-01")` que vira UTC).
- `currency.ts`: `formatBRL` com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- `search-params.ts`: schema Zod dos critérios de busca (destination, checkIn, checkOut, rooms, adults,
  children) + `parseSearchParams(URLSearchParams)` e `serializeSearchParams(obj)`. Usado por F2, F3, F4, F5.
- `storage.ts`: wrapper de localStorage com try/catch e validação Zod na leitura (dado corrompido → default).

## ui/
- Fonte da verdade visual: `docs/design/design-system.md`. Tokens viram o `@theme` do Tailwind;
  nada de cor ou espaçamento solto (`#3b82f6`, `mt-[13px]`) nos componentes.
- Atomic Design: atoms não importam molecules; molecules compõem atoms.
- Todo componente aceita `className` e mescla com `cn()` (clsx + tailwind-merge).
- Acessível por padrão: `Field` liga label/erro/descrição por `id` e `aria-describedby`; `Dialog`
  prende o foco e fecha com Esc; `Skeleton` tem `aria-hidden` e o container usa `aria-busy`.
- Sem texto de negócio nos componentes de `ui/` (recebem por props).

## stores/booking-draft.ts
Estado que atravessa features: critérios da busca + `{ hotelId, roomId }` selecionados.
- Guarde **ids e critérios**, não o objeto inteiro do hotel (dado de servidor é do TanStack Query).
- Persistido em `sessionStorage` com `version` e `migrate`. Nunca guarde PII aqui.
- Exponha seletores (`useSelectedRoom`, `useSearchCriteria`) para evitar re-render global.

## Testes
Unitário obrigatório para tudo em `lib/` e para os schemas (casos válidos e inválidos).
