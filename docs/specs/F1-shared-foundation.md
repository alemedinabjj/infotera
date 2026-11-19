# F1 — shared-foundation

## Objetivo

Construir em `src/shared` tudo o que F2–F6 vão consumir sem retrabalho: cliente HTTP tipado com
validação Zod de toda resposta, funções puras de data/moeda/critérios de busca, store global do
rascunho da reserva, providers (TanStack Query + Toaster) e o kit mínimo de UI acessível. Nenhuma
tela de produto nova: o resultado visível é o layout raiz com header, skip link e Toaster.

## Escopo

**Dentro**
- `shared/api`: `env.ts`, `http.ts` (`ApiError`, `X-Total-Count`), `schemas.ts` (porte de
  `mock-api/types.ts`), `query-keys.ts`, `endpoints.ts` + `queries.ts` (hotel, quartos do hotel,
  quarto: os únicos endpoints usados por 2+ features), `query-client.ts`, `server-query-client.ts`,
  `errors.ts` (mensagem para o usuário).
- `shared/lib`: `dates.ts`, `currency.ts`, `format.ts` (plural, nota, hóspedes),
  `search-params.ts`, `storage.ts`, `pagination.ts`; `cn.ts` já existe.
- `shared/stores/booking-draft.ts` (Zustand + `persist` em `sessionStorage`).
- `shared/ui`: atoms, molecules, Toast/Toaster, ícones e `SiteHeader` (lista na seção Arquivos).
  **Estilos, tokens, variantes e microcopy vêm de `docs/design/design-system.md`** (escrito pelo
  `ui-designer`); esta spec define API, comportamento e acessibilidade, não a aparência.
- `shared/providers/AppProviders.tsx` + `BookingDraftHydrator`.
- `shared/testing/`: `renderWithProviders` e fixtures tipadas para os testes das features.
- `app/layout.tsx` montando providers, header, skip link e `<main>`; `app/not-found.tsx` e
  `app/global-error.tsx` genéricos; `globals.css` com o `@theme` do design system.

**Fora (e por quê)**
- Query options de endpoints de uso único (`/suggestions` → F2, `/hotels` lista → F3,
  `/reviews` → F4, `POST /bookings` → F5, `GET /bookings/:id` → F6): ficam na feature dona.
  Só as **chaves** vivem em `shared/api/query-keys.ts` para evitar colisão.
- Validação de formulário de checkout (CPF, Luhn, máscara), cálculo de preço: F5 (`model/`).
- Regras do form de busca que dependem de "hoje" compostas no schema do form: F2 (o `shared` só
  fornece as funções puras).
- `@tanstack/react-query-devtools`, `sonner`, `lucide-react`, `date-fns`: **nenhuma dependência nova**
  (ver Decisões 9 e 10).
- CSP completa: F5 (decisão registrada na F0).
- Página "catálogo de componentes" (`/dev/ui`): não é produto; os componentes são provados por
  testes de componente e entram em tela a partir da F2.

## Decisões

1. **Critérios de busca: URL é a fonte da verdade até o hotel; o store só guarda o snapshot da
   seleção.** F2 serializa critérios em `/search?…`; F3 repete os mesmos params no link do card
   (`/hotel/7?destination=…&checkIn=…`) com `serializeSearchCriteria`; F4 lê da URL e, no
   "Selecionar", grava `{ hotelId, roomId, criteria }` no `booking-draft` de uma vez; F5 lê do store
   (URL do checkout limpa, sem dados manipuláveis). Descartado: critérios só no Zustand — link
   compartilhado e reload perderiam a busca; e duas fontes de verdade concorrentes.

2. **`booking-draft` persistido em `sessionStorage` com `skipHydration: true` e reidratação
   explícita no cliente.** Um `BookingDraftHydrator` (dentro de `AppProviders`) chama
   `useBookingDraft.persist.rehydrate()` no `useEffect`; `useBookingDraftHydrated()` diz quando
   terminou, para a F5 não redirecionar "sem seleção" antes de ler o storage. Descartado:
   hidratação automática — o HTML do servidor (store vazio) diverge do cliente e gera
   hydration mismatch. `sessionStorage` (não `localStorage`) porque a seleção é da aba/sessão e
   expira sozinha. Estado validado com Zod no `merge` do persist: dado corrompido/antigo → estado
   inicial. `version: 1` + `migrate` que descarta versões desconhecidas. **Sem PII**: só ids e
   critérios.

3. **Regra "check-in não pode ser no passado" fora do schema da URL.** `searchCriteriaSchema` valida
   só o que não depende do relógio: formato, data de calendário válida, 1–30 noites, limites de
   hóspedes. "Hoje" é avaliado **no cliente**, com a data local do usuário, por
   `isBeforeToday(checkIn, todayISO())`: F2 bloqueia no form, F5 bloqueia no checkout, F3/F4 só
   avisam. Descartado: validar "hoje" no servidor — em produção o servidor está em UTC; das 21h às
   24h de Brasília ele já está "amanhã" e rejeitaria um check-in válido; e um link compartilhado
   antigo quebraria a página em vez de mostrar resultados com aviso.

4. **Datas como string `YYYY-MM-DD` (`ISODate`), aritmética em UTC por componentes.**
   `nightsBetween`/`addDays` convertem com `Date.UTC(y, m - 1, d)` e voltam com `getUTC*`;
   `toISODate(date)` usa os getters **locais** (a data que o usuário vê no calendário);
   `formatDate` formata com `timeZone: "UTC"` sobre um `Date.UTC`. Nunca `new Date("2026-12-01")`
   (é meia-noite UTC = dia anterior em Brasília). Descartado: `date-fns`/`dayjs` — 6 funções
   pequenas, testadas, não justificam dependência. `ISODate` é `type ISODate = string` validado por
   `isoDateSchema` na fronteira (descartado: tipo *branded*, que exigiria `as` ou `.brand()` em toda
   função que cria datas).

5. **Limites de hóspedes (constantes em `SEARCH_LIMITS`)**: quartos 1–4; adultos ≥ quartos (1 adulto
   por quarto) e ≤ 16; crianças 0–10; `adults + children ≤ rooms × 5` (`MAX_GUESTS_PER_ROOM = 5`,
   o maior `maxGuests` do seed); noites 1–30. Descartado: idade das crianças — a API e o `Booking`
   só têm contagem; ficaria um campo sem efeito.

6. **`http.ts` com três funções e um erro.** `apiGet(path, schema, opts)`, `apiGetPage(path,
   itemSchema, opts)` → `{ items, total }`, `apiPost(path, body, schema, opts)`. Toda resposta passa
   por `schema.parse`; falha vira `ApiError`. `ApiError extends Error` com
   `kind: "http" | "network" | "timeout" | "parse"` e `status: number | null`. Abort do chamador
   (cancelamento do TanStack) é relançado como está, não embrulhado. Timeout de 10 s via
   `AbortSignal.any([signal, AbortSignal.timeout(10_000)])` (Node 22 e browsers atuais). O corpo
   de erro da API **não** vira texto de UI: `toUserMessage(error)` mapeia `kind/status` para a
   microcopy do design system. Descartado: `axios`/`ky` (dependência para um wrapper de 80 linhas)
   e devolver `Result` em vez de lançar (TanStack Query espera `throw`).

7. **`X-Total-Count`**: lido em `apiGetPage`; ausente ou não numérico → `total = items.length` e
   segue (não quebra a tela). O json-server 0.17 já expõe o header via
   `Access-Control-Expose-Headers` (confirmar com `curl -i` na Tarefa 7; se não expuser, é Risco 1).

8. **Query client**: `staleTime: 60_000`; `retry(failureCount, error)` → `false` para `ApiError`
   4xx e `kind: "parse"`, senão até 2 tentativas; `retryDelay(attempt) = min(1000 × 2^attempt, 8000)`;
   `refetchOnWindowFocus: false` (dados do mock não mudam sozinhos; evita requests surpresa no E2E);
   mutations com `retry: 0` (`POST /bookings` não é idempotente — retry automático duplicaria a
   reserva; o retry é manual, do usuário). `dehydrate.shouldDehydrateQuery` inclui queries
   `pending` para o streaming da F4. Browser: singleton; servidor: `getServerQueryClient =
   cache(makeQueryClient)` (um por request), em arquivo separado usado só por Server Components.
   Descartado: `import "server-only"` (pacote não instalado; o `cache` do React já limita o escopo).

9. **Toast próprio (store Zustand + `Toaster`)**, não `sonner`. Motivo: zero dependência nova,
   controle total da a11y (duas regiões vivas: `role="status"` polite para sucesso/info,
   `role="alert"` para erro), pausa no hover/foco, máximo 3 visíveis, duração 5 s (erro: 8 s), botão
   de fechar e ação opcional ("Tentar de novo"). API: `toast.success|error|info(message, { action? })`
   chamável fora de React (ex.: `onError` de mutation).

10. **Ícones**: componentes SVG inline em `shared/ui/icons.tsx` (só os listados no design system),
    `aria-hidden` por padrão. Descartado: `lucide-react` (dependência para ~12 ícones).

11. **`Dialog` sobre `<dialog>` nativo com `showModal()`**: foco preso, `Esc` e `inert` do fundo vêm
    do browser; o componente devolve o foco ao gatilho e trava o scroll do body. Descartado: focus
    trap manual (mais código, mais bug). jsdom não implementa `showModal`: polyfill mínimo em
    `vitest.setup.ts` (Risco 4). Serve F5 (termos), F3 (drawer de filtros, variante `side`) e F4
    (lightbox).

12. **Query keys centralizadas em `shared/api/query-keys.ts`**, query options só dos endpoints
    multi-feature em `shared/api/queries.ts`: F3 faz prefetch do detalhe com a **mesma** chave que a
    F4 usa; F5 e F6 rebuscam hotel e quarto por id. Descartado: query options na F4 — a F3 e a F5
    teriam de importar outra feature (proibido).

13. **`booking` no schema compartilhado sem CPF e sem cartão.** `bookingGuestSchema` =
    `{ firstName, lastName, email, phone }`; `payment` opcional `{ method: "credit_card", cardLast4 }`.
    `GET /bookings/:id` é público no mock (sem auth): o que for enviado, qualquer um com o id lê.
    `bookingSchema.id` aceita `number | string` para permitir à F5 mandar um id não sequencial
    (`crypto.randomUUID()`, o json-server aceita id do cliente) e evitar enumeração de reservas —
    decisão final da F5. Descartado: portar `GuestData.cpf` do `types.ts` (contraria o `CLAUDE.md`
    do checkout).

14. **Enums estritos nos schemas** (`Amenity`, `RoomAmenity`, `propertyType`, `cancellationPolicy`,
    `bed.type`, `suggestion.type`, `currency: "BRL"`), com teste que faz parse de **100% do seed**.
    Objetos com `z.object` (ignora campo extra — tolera evolução aditiva da API). Descartado:
    `z.string()` para amenities (perde o tipo literal que F3/F4 usam para rótulos com `switch`
    exaustivo).

15. **`<main id="main-content">` fica no layout raiz**; páginas renderizam o conteúdo sem `<main>`
    próprio. Assim o skip link "Pular para o conteúdo" funciona em todas as rotas e o smoke continua
    com um único `main`. A página `/` da F0 perde o `<main>` (vira fragmento).

16. **`storage.ts`** (`createStorage("local" | "session")`): `read(key, schema, fallback)`,
    `write(key, value)`, `remove(key)`; chaves com prefixo `infotera:`; seguro em SSR (`typeof window`)
    e em erro (`QuotaExceededError`, Safari privado) — nunca lança. Usado pela F2 (últimas buscas) e
    F5 (rascunho do form). O store usa `createJSONStorage` do Zustand com o mesmo prefixo.

17. **`env.ts` falha alto no load** com mensagem em pt-BR ("`NEXT_PUBLIC_API_URL` ausente ou
    inválida. Copie `.env.example` para `.env.local`."). Referência estática
    `process.env.NEXT_PUBLIC_API_URL` (a doc do Next só faz inline de acesso estático). `parseEnv(raw)`
    exportado e puro para teste. Barra final removida. O `vitest.config.mts` define
    `NEXT_PUBLIC_API_URL=http://api.test` para os testes.

## Contrato de dados

Base: `env.NEXT_PUBLIC_API_URL` (ex.: `http://localhost:3333`). Endpoints com função em `shared`:

| Função (`endpoints.ts`) | Request | Schema | Query key | Usado por |
|---|---|---|---|---|
| `fetchHotel(id, signal?)` | `GET /hotels/:id` (404 → `ApiError` status 404) | `hotelSchema` | `queryKeys.hotels.detail(id)` | F3 (prefetch), F4, F5, F6 |
| `fetchHotelRooms(hotelId, signal?)` | `GET /rooms?hotelId=:id` | `z.array(roomSchema)` | `queryKeys.rooms.byHotel(hotelId)` | F4, F5 |
| `fetchRoom(id, signal?)` | `GET /rooms/:id` | `roomSchema` | `queryKeys.rooms.detail(id)` | F5, F6 |

`queries.ts`: `hotelQueryOptions(id)`, `hotelRoomsQueryOptions(hotelId)`, `roomQueryOptions(id)`.

Chaves reservadas para as features (`query-keys.ts`, `as const`):
```ts
queryKeys.suggestions(q)            // ["suggestions", q]            F2
queryKeys.hotels.all                // ["hotels"]
queryKeys.hotels.list(params)       // ["hotels", "list", params]    F3
queryKeys.hotels.detail(id)         // ["hotels", "detail", id]
queryKeys.rooms.byHotel(hotelId)    // ["rooms", "hotel", hotelId]
queryKeys.rooms.detail(id)          // ["rooms", "detail", id]
queryKeys.reviews.byHotel(hotelId, page) // ["reviews", hotelId, page] F4
queryKeys.bookings.detail(id)       // ["bookings", "detail", id]    F6
```

`http.ts`:
```ts
type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];
type RequestOptions = { query?: Record<string, QueryValue>; signal?: AbortSignal; init?: RequestInit };
buildQuery(query): URLSearchParams   // arrays repetem a chave; null/undefined/"" omitidos
apiGet<T>(path, schema: z.ZodType<T>, opts?): Promise<T>
apiGetPage<T>(path, itemSchema: z.ZodType<T>, opts?): Promise<{ items: T[]; total: number }>
apiPost<T>(path, body: unknown, schema: z.ZodType<T>, opts?): Promise<T>
class ApiError extends Error { kind; status; isNotFound(): boolean }
isApiError(e: unknown): e is ApiError
```

`schemas.ts` (tipos via `z.infer`, nomes `PascalCase`): `amenitySchema`, `roomAmenitySchema`,
`propertyTypeSchema`, `cancellationPolicySchema`, `bedSchema`, `suggestionSchema`, `hotelSchema`,
`roomSchema`, `reviewSchema`, `bookingGuestSchema`, `bookingInputSchema` (sem `id`),
`bookingSchema` (`bookingInputSchema` + `id: number | string`), `apiErrorBodySchema`
(`{ error: string }`). Campos exatamente como `mock-api/types.ts` (verificados no seed: 60 hotéis,
162 quartos, 328 reviews, 10 sugestões, todos os campos presentes em 100% dos registros; preços
inteiros; `date` das reviews `YYYY-MM-DD`; horários `HH:MM`). `rating` do hotel 0–5 com decimal,
da review inteiro 1–5; `available`/`availableRooms` inteiros ≥ 0; `images` arrays de URL `https`;
`checkIn/checkOut` com `isoDateSchema`; `createdAt` com `z.iso.datetime()`.

`search-params.ts`:
```ts
type SearchCriteria = { destination: string; checkIn: ISODate; checkOut: ISODate;
                        rooms: number; adults: number; children: number };
SEARCH_PARAM_KEYS = ["destination","checkIn","checkOut","rooms","adults","children"] as const
SEARCH_LIMITS = { minRooms: 1, maxRooms: 4, maxAdults: 16, maxChildren: 10,
                  maxGuestsPerRoom: 5, minNights: 1, maxNights: 30 }
searchCriteriaSchema                       // objeto tipado + refinements (issues com path)
parseSearchCriteria(input: URLSearchParams | Record<string, string | string[] | undefined>)
  → { success: true; data: SearchCriteria } | { success: false; issues: SearchCriteriaIssue[] }
serializeSearchCriteria(c): URLSearchParams // ordem fixa das chaves → URLs estáveis
searchCriteriaToQueryString(c): string      // sem "?"
guestsPerRoom(c): number                    // ceil((adults + children) / rooms), para a F4
```
`input` aceita o `searchParams` resolvido do Next (array → primeiro valor) e `URLSearchParams`;
chaves extras (filtros da F3) são ignoradas. `destination`: `trim`, 1–100 caracteres, preserva
acentos e caixa (é igualdade exata na API).

`booking-draft`:
```ts
type RoomSelection = { hotelId: number; roomId: number; criteria: SearchCriteria };
type BookingDraftState = { selection: RoomSelection | null };
actions: selectRoom(selection), clearSelection()
hooks: useSelection(), useBookingDraftActions(), useBookingDraftHydrated()
storage key: "infotera:booking-draft" (sessionStorage), version 1
```

## Critérios de aceite

Verificáveis com `npm run typecheck && npm run lint && npm run test` e `npm run test:e2e`.

**api**
1. Dado `NEXT_PUBLIC_API_URL` ausente, vazio ou `ftp://x`, quando `parseEnv` roda, então lança
   erro cuja mensagem cita a variável e o `.env.example`; dado `http://localhost:3333/`, devolve
   `http://localhost:3333`.
2. Dado `fetch` mockado com 200 e corpo válido, quando `apiGet("/hotels/1", hotelSchema)`, então
   chama `http://api.test/hotels/1` e devolve o objeto tipado.
3. Dado `buildQuery({ propertyType: ["hotel","pousada"], rating_gte: 4, q: "", x: undefined })`,
   então gera `propertyType=hotel&propertyType=pousada&rating_gte=4` (vazio/undefined omitidos).
4. Dado 404, então `ApiError { kind: "http", status: 404 }` e `isNotFound() === true`; dado 500 com
   `{ error: "Falha simulada pela mock API" }`, então `status: 500`; dado `fetch` rejeitando
   `TypeError`, então `kind: "network"`, `status: null`; dado corpo que não bate com o schema, então
   `kind: "parse"`; dado timeout, então `kind: "timeout"`; dado abort do chamador, então o erro
   relançado é o `AbortError` original (não `ApiError`).
5. Dado `X-Total-Count: 14` e 10 itens, `apiGetPage` devolve `{ items (10), total: 14 }`; sem header,
   `total: 10`.
6. `retry`: `false` para 400/404/422 e `parse`; `true` para 500, `network`, `timeout` enquanto
   `failureCount < 2`; `retryDelay(0..4)` = 1000, 2000, 4000, 8000, 8000. Mutations `retry: 0`.
7. `toUserMessage` cobre todos os `kind` (switch exaustivo com `never`) e 404 tem mensagem própria;
   nunca devolve o texto bruto do servidor.
8. **Schemas aceitam 100% do seed**: parse de todos os registros de `mock-api/db.seed.json` passa;
   amenity desconhecida, `propertyType: "hostel"`, `rating: "4"` (string), `images: ["nao-url"]` e
   `checkIn: "2026-02-30"` falham.

**lib**
9. `nightsBetween("2026-03-07","2026-03-08") === 1` e não muda com `TZ=America/Sao_Paulo` nem com
   transição de horário de verão (`TZ=America/New_York`, `2026-03-07 → 2026-03-09 = 2`); teste roda
   os casos com `process.env.TZ` trocado ou com datas que atravessam DST.
10. `isValidISODate` rejeita `2026-02-29`, `2026-13-01`, `26-1-1`, aceita `2028-02-29`;
    `addDays("2026-12-31", 1) === "2027-01-01"`; `toISODate(new Date(2026, 0, 5, 23, 30))` (local)
    `=== "2026-01-05"`; `isBeforeToday("2026-11-18", "2026-11-19") === true`, mesmo dia `false`.
11. `formatDate("2026-12-01", "short") === "01/12/2026"` em qualquer `TZ` (sem voltar um dia).
12. `formatBRL(1200)` → `"R$ 1.200,00"` (com NBSP entre `R$` e o número, comparado via
    ` `); `formatBRL(1200, { cents: false })` → `"R$ 1.200"`; `reaisToCents(19.99) === 1999`
    (arredonda, sem erro de ponto flutuante); `centsToReais(1999) === 19.99`.
13. `pluralize(1,"noite","noites") === "1 noite"`, `0`/`2` → plural; `formatRating(4.5) === "4,5"`;
    `formatGuests({ adults: 2, children: 1, rooms: 1 }) === "2 adultos, 1 criança · 1 quarto"`.
14. `parseSearchCriteria` com params válidos devolve `success: true` e números coeridos; com
    `rooms=abc`, `checkOut <= checkIn`, 31 noites, `adults < rooms`, `rooms=5`, total > `rooms × 5`,
    `destination` vazio/só espaços, data inválida → `success: false` com `issues[].path` apontando o
    campo. Aceita objeto do Next com array (`{ adults: ["2","3"] }` → 2). Ignora chaves extras.
15. Round-trip: `parseSearchCriteria(serializeSearchCriteria(c)).data` deep-equals `c`, inclusive com
    `destination: "São Paulo, SP"` (acento preservado, vírgula e espaço codificados pelo
    `URLSearchParams`); a ordem das chaves é a de `SEARCH_PARAM_KEYS`.
16. `storage.read` devolve o `fallback` quando: chave ausente, JSON inválido, dado que não passa no
    schema, `window` indefinido, ou `getItem` lança; `write` não lança quando `setItem` lança
    `QuotaExceededError`; chaves gravadas com prefixo `infotera:`.
17. `getPaginationRange({ page: 5, totalPages: 10 })` → `[1,"ellipsis",4,5,6,"ellipsis",10]`;
    `totalPages <= 7` → todas; `getTotalPages(14, 10) === 2`, `getTotalPages(0, 10) === 0`.

**store**
18. `selectRoom({ hotelId: 1, roomId: 2, criteria })` grava em `sessionStorage["infotera:booking-draft"]`
    só `selection` (ids + critérios) e `version: 1`; nenhuma chave com nome de PII (email, phone,
    cpf, card) existe no JSON (teste asserta as chaves exatas).
19. Dado `sessionStorage` com JSON corrompido ou `selection.hotelId: "x"` ou `version: 99`, quando
    reidrata, então o estado é `{ selection: null }` e nada lança.
20. Antes do `rehydrate`, `useBookingDraftHydrated()` é `false`; depois, `true`. `clearSelection()`
    zera estado e storage.

**ui / providers / layout**
21. `Button`: `<button type="button">` por padrão; `loading` → `aria-disabled="true"` +
    `aria-busy="true"` (sem `disabled`, mantém o foco) e clique ignorado, spinner `aria-hidden`,
    `loadingText` opcional como rótulo visível em `aria-live="polite"` (revisado, ver "Ajustes pós-revisão"); `buttonClassName({ variant, size })` exportado
    para estilizar `<Link>`; foco visível (`focus-visible:` com o token de anel do design system).
22. `Field` liga `label[for]` ao controle, `aria-describedby` = ids de hint e erro presentes,
    `aria-invalid="true"` só com erro; a mensagem de erro é ligada por `aria-describedby` e **não** usa
    `role="alert"` (anunciar a cada tecla seria ruidoso com `mode: "onChange"`; o resumo de erros no
    submit é da feature). `getByLabelText` encontra `Input`, `Select`, `Checkbox`, `Radio`.
23. `QuantityStepper`: rótulo visível ligado ao grupo (`role="group"` + `aria-labelledby`), botões
    "−"/"+" com nome acessível recebido por prop ("Remover adulto"/"Adicionar adulto"), valor em
    `<output aria-live="polite">`; desabilita o botão no limite `min`/`max`; Tab/Enter/Espaço funcionam.
    Descartado `role="spinbutton"`: exige setas/PageUp e é pouco previsível em leitores de tela mobile.
24. `Pagination`: `<nav aria-label>`; página atual com `aria-current="page"`; modo link
    (`getHref(page)` → `<Link>`) e modo botão (`onPageChange`); "Anterior/Próxima" desabilitados nos
    extremos; reticências com `aria-hidden`; não renderiza nada com `totalPages <= 1`.
25. `Dialog`: abre com `showModal`, título ligado por `aria-labelledby`, fecha com `Esc` e botão de
    fechar (`onClose` chamado), devolve o foco ao elemento que abriu.
26. `ErrorState` tem `role="alert"` e botão de retry que chama `onRetry`; `EmptyState` com título e
    ação opcional; `Skeleton` `aria-hidden="true"`; `Stars` expõe nome acessível
    "Avaliação 4,5 de 5" (prop `label` sobrescreve) e as estrelas são `aria-hidden`.
27. `toast.error("x", { action: { label: "Tentar de novo", onClick } })` renderiza no `Toaster` dentro
    da região `role="alert"`; `toast.success` na região `role="status"`; some após a duração (fake
    timers), pausa com hover/foco, máximo 3 visíveis, botão "Fechar notificação" remove.
28. Layout raiz: primeiro elemento focável é o skip link "Pular para o conteúdo" → `#main-content`;
    existe um único `<main id="main-content" tabIndex={-1}>`; header com link para `/`; regiões do
    Toaster presentes no DOM; `QueryClientProvider` disponível (teste de componente renderiza um
    filho com `useQueryClient`).
29. `app/not-found.tsx` responde 404 com `h1` e link "Voltar para a busca" (E2E em
    `/rota-que-nao-existe`, sem violações axe).
30. Smoke E2E (desktop + mobile) continua verde: 1 `main`, 1 `h1`, axe `wcag2a/wcag2aa` sem
    violações (inclui contraste dos tokens), sem overflow em 320px, skip link visível ao receber foco.
31. Zero dependência nova em `package.json`; `grep -rnE "\bany\b|as unknown|@ts-ignore| as [A-Z]" src/shared`
    sem ocorrências em código (exceto `as const`).

## Arquivos

Novos:

| Caminho | Responsabilidade |
|---|---|
| `src/shared/api/env.ts` | `parseEnv`, `env` (decisão 17) |
| `src/shared/api/http.ts` | `buildQuery`, `apiGet`, `apiGetPage`, `apiPost`, `ApiError`, `isApiError` |
| `src/shared/api/errors.ts` | `toUserMessage(error: unknown): string` |
| `src/shared/api/schemas.ts` | schemas Zod + tipos `z.infer` (decisões 13, 14) |
| `src/shared/api/query-keys.ts` | fábrica `queryKeys` |
| `src/shared/api/endpoints.ts` | `fetchHotel`, `fetchHotelRooms`, `fetchRoom` |
| `src/shared/api/queries.ts` | `hotelQueryOptions`, `hotelRoomsQueryOptions`, `roomQueryOptions` |
| `src/shared/api/query-client.ts` | `shouldRetry`, `retryDelay`, `makeQueryClient`, `getQueryClient` (browser singleton / server novo) |
| `src/shared/api/server-query-client.ts` | `getServerQueryClient = cache(makeQueryClient)` |
| `src/shared/api/*.test.ts` | env, http, errors, schemas (seed), query-client |
| `src/shared/lib/dates.ts` | `ISODate`, `isoDateSchema`, `isValidISODate`, `toISODate`, `todayISO`, `addDays`, `nightsBetween`, `isBeforeToday`, `formatDate` |
| `src/shared/lib/currency.ts` | `formatBRL`, `reaisToCents`, `centsToReais` |
| `src/shared/lib/format.ts` | `pluralize`, `formatRating`, `formatGuests` |
| `src/shared/lib/search-params.ts` | contrato da seção anterior |
| `src/shared/lib/storage.ts` | `createStorage`, `STORAGE_PREFIX` |
| `src/shared/lib/pagination.ts` | `getTotalPages`, `getPaginationRange` |
| `src/shared/lib/*.test.ts` | um por arquivo |
| `src/shared/stores/booking-draft.ts` (+ `.test.ts`) | store, seletores, `useBookingDraftHydrated` |
| `src/shared/ui/atoms/{Button,Input,Select,Checkbox,Radio,Skeleton,Spinner,Badge,Stars,VisuallyHidden}.tsx` | atoms; aparência/variantes do design system; todos aceitam `className` (mesclado com `cn`) e `ref` como prop (React 19, sem `forwardRef`) |
| `src/shared/ui/molecules/{Field,QuantityStepper,Pagination,EmptyState,ErrorState,Alert,Dialog}.tsx` | molecules |
| `src/shared/ui/toast/{toast-store.ts,Toaster.tsx}` | decisão 9 |
| `src/shared/ui/icons.tsx` | SVGs do design system, `aria-hidden` |
| `src/shared/ui/layout/{SiteHeader,SkipLink}.tsx` | header (Server Component) e skip link |
| `src/shared/ui/index.ts` | barrel de `shared/ui` (named exports) |
| `src/shared/ui/**/*.test.tsx` | testes de componente (critérios 21–27) |
| `src/shared/providers/AppProviders.tsx` | `"use client"`; `QueryClientProvider` + `BookingDraftHydrator` + `Toaster` |
| `src/shared/providers/BookingDraftHydrator.tsx` | `"use client"`; `rehydrate()` no effect |
| `src/shared/testing/render.tsx` | `renderWithProviders(ui, { queryClient? })` com `retry: false` |
| `src/shared/testing/fixtures.ts` | `makeHotel`, `makeRoom`, `makeReview`, `makeSearchCriteria` (overrides tipados, saída validada pelo schema) |
| `src/app/not-found.tsx` | 404 genérico com `EmptyState` |
| `src/app/global-error.tsx` | `"use client"`; erro raiz com `ErrorState` + `reset` (inclui `<html lang="pt-BR">`) |
| `e2e/not-found.spec.ts` | critério 29 |

Alterados:

| Caminho | Mudança |
|---|---|
| `src/app/globals.css` | `@theme` com os tokens do design system; estilo global de foco |
| `src/app/layout.tsx` | `AppProviders`, `SkipLink`, `SiteHeader`, `<main id="main-content">`; fonte conforme design system |
| `src/app/page.tsx` | remove `<main>` (decisão 15) |
| `vitest.config.mts` | `test.env.NEXT_PUBLIC_API_URL = "http://api.test"` |
| `vitest.setup.ts` | polyfill de `HTMLDialogElement.showModal/close` |
| `e2e/smoke.spec.ts` | skip link focável e visível |
| `src/shared/CLAUDE.md` | estrutura final (`query-keys`, `endpoints`, `queries`, `server-query-client`, `errors`, `format`, `pagination`, `testing/`, `toast/`, `layout/`) e decisões 2, 3, 12 |

## Tarefas

Escopo de commit `shared` (pedido do usuário), sem atribuição de IA. Ao fim de cada tarefa:
`npm run typecheck && npm run lint && npm run test`.

1. `feat(shared): add timezone-safe date helpers` — `dates.ts` (TDD). Prova: critérios 9–11.
2. `feat(shared): add brl currency and text format helpers` — `currency.ts`, `format.ts`. Prova: 12–13.
3. `feat(shared): add search criteria schema with url parse and serialize` — `search-params.ts`.
   Prova: 14–15.
4. `feat(shared): add safe web storage wrapper` — `storage.ts`. Prova: 16.
5. `feat(shared): add pagination range helper` — `pagination.ts`. Prova: 17.
6. `feat(shared): validate api env with zod` — `env.ts`, `vitest.config.mts`. Prova: 1.
7. `feat(shared): port mock api types to zod schemas` — `schemas.ts` + teste do seed. Prova: 8.
   Rodar `curl -i "localhost:3333/hotels?_page=1&_limit=2"` com a mock-api e registrar se
   `Access-Control-Expose-Headers` contém `X-Total-Count`.
8. `feat(shared): add typed http client with api error` — `http.ts`, `errors.ts`. Prova: 2–5, 7.
9. `feat(shared): add query client defaults, keys and shared hotel queries` — `query-client.ts`,
   `server-query-client.ts`, `query-keys.ts`, `endpoints.ts`, `queries.ts`. Prova: 6 + teste de
   `hotelQueryOptions(1).queryKey` e `queryFn` com `fetch` mockado.
10. `feat(shared): add persisted booking draft store` — store + hydrator. Prova: 18–20.
11. `test(shared): add render helper and typed fixtures` — `shared/testing/*`, polyfill do dialog.
    Prova: um teste que usa `renderWithProviders` e `makeHotel` passa.
12. `feat(shared): add design tokens to tailwind theme` — `globals.css` a partir de
    `docs/design/design-system.md` (aguardar o arquivo existir). Prova: `npm run build`.
13. `feat(shared): add ui atoms` — atoms + `icons.tsx`. Prova: 21, parte de 26.
14. `feat(shared): add ui molecules` — Field, QuantityStepper, Pagination, EmptyState, ErrorState,
    Alert, Dialog. Prova: 22–26.
15. `feat(shared): add accessible toast system` — Prova: 27.
16. `feat(shared): mount providers, header and skip link in root layout` — `AppProviders`, layout,
    `page.tsx`, `not-found.tsx`, `global-error.tsx`, E2E. Prova: 28–30 (`npm run test:e2e`).
17. `docs(shared): update shared claude.md with final structure` — Prova: critério 31 + sequência
    completa `npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e`.

## Plano de testes

**Unit (`// @vitest-environment node` onde não houver DOM)**
- `dates.test.ts`: limites de mês/ano, bissexto, DST (`vi.stubEnv("TZ", …)` não muda TZ em processo já
  iniciado — usar `process.env.TZ` no topo de um arquivo dedicado `dates.tz.test.ts` ou casos que
  atravessam DST no TZ da máquina e asserção independente de TZ), `formatDate` sem off-by-one.
- `currency.test.ts`, `format.test.ts`: NBSP, arredondamento (`0.1 + 0.2`), plural com 0/1/2.
- `search-params.test.ts`: tabela de casos válidos/inválidos (critério 14), round-trip com acento,
  objeto do Next com arrays, chaves extras ignoradas, ordem das chaves.
- `storage.test.ts`: `vi.spyOn(Storage.prototype, "getItem"|"setItem")` lançando; `window`
  indefinido no ambiente `node`.
- `pagination.test.ts`: 1, 7, 8, 10 páginas; página na borda.
- `env.test.ts`, `http.test.ts` (`vi.stubGlobal("fetch", vi.fn())`, `Response` real com headers),
  `errors.test.ts`, `query-client.test.ts`.
- `schemas.test.ts`: lê `mock-api/db.seed.json` via `fs` e faz `safeParse` de cada coleção; casos
  inválidos do critério 8; `bookingInputSchema` aceita o corpo do exemplo `curl` do README.
- `booking-draft.test.ts`: persistência, chaves exatas do JSON, corrompido, versão, hidratação.

**Componente (jsdom + RTL + user-event)**
- Um arquivo por atom/molecule com interação: Button, Field (+ Input/Select/Checkbox/Radio),
  QuantityStepper, Pagination (link e botão), Dialog (Esc, foco devolvido), ErrorState, Stars,
  Toaster (fake timers, hover pausa), AppProviders (filho com `useQueryClient`).
- Consultas sempre por role/label (garantem a a11y); nenhum `getByTestId` sem justificativa.

**E2E (Playwright, desktop + mobile)**
- `smoke.spec.ts` atualizado (skip link, axe com os tokens reais → pega contraste).
- `not-found.spec.ts`: 404 + axe.
- Cenários `_delay`/`_fail`: a F1 não tem tela que consome a API; cobertos em unit
  (`http.test.ts`: 500 com corpo `{ error }`, rede, timeout; `query-client.test.ts`: retry/backoff).
  O E2E com `_fail=1`/`_delay=3000` real começa na F3/F4.

## Riscos

| # | Risco | Mitigação |
|---|---|---|
| 1 | `X-Total-Count` não exposto por CORS no browser (só no servidor) | Verificação na Tarefa 7; fallback `total = items.length` evita quebra. Se o header não for exposto, a F3 busca a lista no Server Component (sem CORS) — `mock-api/` não é editado (não é código nosso). |
| 2 | Hydration mismatch do store persistido | `skipHydration` + `BookingDraftHydrator` + `useBookingDraftHydrated` (decisão 2); critério 20. |
| 3 | Off-by-one de fuso em datas | Decisão 4; testes com DST e `formatDate` em `timeZone: "UTC"`. |
| 4 | jsdom sem `showModal` | Polyfill em `vitest.setup.ts` (seta/remove `open`, dispara `close`); comportamento real (foco preso, inert) validado em E2E nas features que usam Dialog. |
| 5 | Design system chegar depois das tarefas 1–11 | Tarefas 1–11 não dependem dele; 12–16 esperam o arquivo. Nenhum valor visual inventado: na dúvida, pedir ao `ui-designer`. |
| 6 | Fonte via `next/font/google` falhar no build sem rede | Se o design system pedir Google Font, usar `next/font/google` com `display: "swap"` e fallback de sistema; se o build no ambiente não baixar, cair para stack de sistema e registrar. |
| 7 | `env.ts` quebrar `next build`/E2E sem `.env.local` | Falha intencional e clara; Playwright já injeta a variável; README (F7) documenta. |
| 8 | Enum estrito quebrar a lista inteira se a API ganhar comodidade nova | Mock controlado + teste de 100% do seed; trade-off registrado na decisão 14. |
| 9 | `GET /bookings/:id` público expõe dados do hóspede | Schema sem CPF/cartão (decisão 13); id não sequencial recomendado à F5; nota no README. |
| 10 | `cache()` do React importado em código de cliente | `getServerQueryClient` em arquivo próprio, usado só em Server Components; revisão do `reviewer`. |

## Ajustes pós-revisão

- **Critério 21 revisado:** `Button` em `loading` não usa mais `disabled` (que tirava o foco). Usa
  `aria-disabled="true"` + `aria-busy="true"` e uma guarda no `onClick`, conforme o design system.
  Nova prop opcional `loadingText` troca o rótulo visível durante o loading, dentro de um `<span aria-live="polite">`.
  `QuantityStepper` adota o mesmo padrão (`aria-disabled` + guarda) nos limites mín/máx.
- Estilos do botão movidos para `ui/atoms/button-styles.ts` (`buttonClassName`), reexportado pelo barrel.
- `BookingDraft` usa storage seguro (`createRawStorage`): JSON corrompido é descartado e a hidratação sempre conclui.
