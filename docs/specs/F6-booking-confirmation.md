# F6 — booking-confirmation

## Objetivo

Entregar `/confirmation/[bookingId]`: a página que prova que a reserva existe. Ela lê a reserva **no
servidor** com `GET /bookings/:id` (funciona com reload, em outra aba e sem nada no storage), busca
hotel e quarto em paralelo pelos ids da reserva e mostra o número da reserva copiável e o resumo
completo, com o mesmo detalhamento de preço do checkout. Reserva inexistente vira "Reserva não
encontrada", a página não é indexada e não mostra dado pessoal além do necessário.

## Escopo

**Básicos (seção 5 do enunciado)**
- `GET /bookings/:id` no servidor, a cada request (sem cache de rota): funciona com reload.
- Número da reserva em destaque.
- Resumo completo: hotel (nome, endereço, foto, horários de check-in/check-out, política de
  cancelamento), quarto (nome, camas), datas, noites, hóspedes (contagem e nomes), titular e e-mail,
  pagamento (cartão final `1111`), detalhamento de preço e total, data da reserva.
- Botão "Nova busca": limpa a seleção do `booking-draft` e vai para `/`.

**Avançados aplicados nesta página**
- **Streaming com Suspense:** a reserva aparece assim que chega; hotel e quarto entram depois
  numa seção própria com skeleton, sem atrasar o número da reserva.
- **Fetch paralelo:** hotel e quarto começam juntos assim que a reserva chega. A reserva tem que vir
  antes porque os ids estão nela.
- **4 estados por seção:** loading (`loading.tsx` + skeleton da seção hotel/quarto), erro (rota com
  `retry`, seção com "Tentar de novo"), vazio (404 "Reserva não encontrada"; reserva ilegível) e
  sucesso.
- **Degradação parcial:** hotel ou quarto que falham, ou que não existem, não derrubam a página. A
  reserva continua visível (Decisão 5).
- **Número copiável** com feedback e fallback (Decisão 8).
- **Privacidade:** id validado antes de qualquer request, `encodeURIComponent` no path, `noindex`,
  página sempre dinâmica (`no-store`), PII mínima na tela e nenhuma PII em log, título ou storage.
- **Gancho para o "Histórico de reservas" da F7:** o id fica salvo localmente quando a confirmação
  carrega (Decisão 9).

**Fora (e por quê)**
- **Envio de e-mail real:** não existe backend. A frase "Enviamos os detalhes para…" é simulada,
  como já diz o design system (§6.8).
- **Cancelar ou alterar reserva:** a mock-api aceitaria `PATCH`/`DELETE`, mas sem autenticação
  qualquer pessoa com o link apagaria a reserva. O enunciado não pede. Vai para o README como
  evolução.
- **Imprimir, baixar PDF, adicionar ao calendário:** baixo valor para o teste e mais superfície de
  PII (arquivo fica no disco). README.
- **"Copiar link da reserva" / compartilhar:** o link é a única "senha" da reserva (UUID). Oferecer
  isso como ação incentivaria repassar a PII. Quem quiser copia a URL da barra.
- **Status da estadia** ("estadia concluída" para datas passadas): só faz sentido no histórico (F7).
- **E2E do fluxo completo F2→F6:** fica na F8. Aqui o E2E cria a reserva com `POST` direto na
  mock-api.
- **`_delay`/`_fail` no E2E:** os requests saem do servidor do Next, e o Playwright não os
  intercepta (limite já registrado na F4). Esses cenários ficam com unit e teste de componente
  (Plano de testes).

**Pré-requisitos:** F4 e F5 já estão na base. A F6 usa o contrato que a F5 grava no `Booking`: `id`
UUID v4, `guests[]` com `kind`/`age` e contato só no titular, `priceBreakdown?` em centavos,
`payment?.cardLast4`. Se algum nome real divergir desta spec, as tarefas de promoção usam o nome
real.

## Decisões

1. **Server Component lê a reserva a cada request. A página nunca usa o store.**
   `app/confirmation/[bookingId]/page.tsx` chama `await connection()` e delega para a feature. O
   loader (`loadBooking`) usa `getServerQueryClient().fetchQuery(bookingQueryOptions(id))`, igual ao
   `loadHotel` da F4: o React `cache` deduplica entre `generateMetadata` e a página, então sai **um**
   request. O `connection()` garante renderização dinâmica. Uma página com nome, e-mail e reserva
   nunca entra no Full Route Cache, em ISR ou em PPR (a F7 tem que manter assim, ver Riscos). O Next
   envia `Cache-Control: private, no-cache, no-store…` para rota dinâmica, e o E2E confere.
   Descartados:
   - (a) `useQuery` no cliente. Perde `notFound()` e metadata, mostra skeleton em todo reload e
     manda mais JS para uma página de leitura.
   - (b) Ler a reserva do `booking-draft` ou de um estado passado pela F5. Quebra com reload e em
     outra aba, e o store não guarda PII de propósito.
   - (c) Confiar que a rota é dinâmica "porque usa params". Rota com segmento dinâmico sem
     `generateStaticParams` pode ser renderizada sob demanda e cacheada. Vale ser explícito.

2. **Id da URL validado por função pura antes de qualquer request.**
   `parseBookingId(raw: string): BookingId | null` usa `z.uuid({ version: "v4" })` depois de
   `decodeURIComponent` (seguro, com `try`), `trim` e `toLowerCase`. Inválido → `notFound()` **sem
   chamar a API** (`abc`, `1`, `../hotels/1`, `%2e%2e`, UUID v1, vazio). O fetch monta o path com
   `encodeURIComponent(id)`, como a nota do security da F1 pede, mesmo com o formato já garantido
   (defesa em profundidade). Minúsculas porque o json-server compara o id exato: na mock-api,
   `GET /bookings/<UUID em maiúsculas>` → `404`.
   Descartados:
   - (a) Aceitar também id numérico, o formato do `curl` do README da mock-api. Reabre a enumeração
     que a F5 fechou (`/confirmation/1`, `/2`… mostrariam nome, e-mail e telefone de qualquer
     reserva). O app nunca cria id numérico.
   - (b) Validar só no fetch. Um id fora do formato viraria request inútil e path manipulável.

3. **Hotel e quarto em paralelo, em streaming, numa seção própria.**
   `loadStayDetails(booking)` dispara `hotelQueryOptions(booking.hotelId)` e
   `roomQueryOptions(booking.roomId)` (de `shared`) **juntos** e devolve uma promessa de
   `{ hotel: Settled<Hotel>, room: Settled<Room> }`. A promessa é criada na página, logo depois da
   reserva, e passada a um RSC assíncrono `StayDetailsSection` dentro de `<Suspense>`. Número,
   datas, hóspedes e preço vêm só da reserva e renderizam na hora. Hotel e quarto chegam depois com
   skeleton próprio. O request do quarto é `GET /rooms/:id`, e não `/rooms?hotelId=`, para trazer
   só o quarto.
   Descartados:
   - (a) `Promise.all` antes de renderizar qualquer coisa: o número espera a seção mais lenta.
   - (b) `?_expand=hotel` em `/rooms/:id`: uma chamada a menos, mas o formato fica fora dos schemas
     de `shared` (precisaria de um schema composto) e perde o cache compartilhado
     `hotelQueryOptions`/`roomQueryOptions`.
   - (c) Hotel e quarto no cliente: waterfall depois da hidratação e mais JS.

4. **Erros classificados por função pura, um resultado por recurso.**
   - Reserva: `loadBooking(id)` → `{ kind: "found"; booking } | { kind: "not-found" } |
     { kind: "unreadable" }`. Outros erros (5xx, rede, timeout) são relançados.
     - `404` → `notFound()` → `not-found.tsx` do segmento, "Reserva não encontrada".
     - `parse` → estado "Não foi possível exibir esta reserva" (`EmptyState`, sem retry). A API não
       valida nada (TEST_MAP #8): um corpo fora do contrato não melhora com retry.
     - Relançado → `error.tsx` da rota com `retry()` (Next 16.3+), que refaz o fetch no servidor.
   - Hotel e quarto: `Settled<T> = { status: "ok"; data } | { status: "missing" } |
     { status: "error" }`, montado por `settle(promise)` com `classifyLoadError(error)` (pura).
     `404` e `room.hotelId !== booking.hotelId` (reserva forjada) contam como `missing`. O resto
     conta como `error`.
   O servidor não faz retry (F1). Por isso a falha aparece com botão manual, e no cliente quem
   repete é a pessoa.
   Descartados:
   - (a) Tratar `parse` como 404: mente sobre o motivo.
   - (b) Deixar tudo cair no `error.tsx`: um hotel fora do ar apagaria a confirmação de uma reserva
     que existe.

5. **Degradação parcial do resumo.** O view model (`toConfirmationView`, pura) monta cada bloco a
   partir do que existe:
   - Hotel `ok` → nome, endereço, foto, horários e política.
   - Hotel `missing` → "Hotel #{id}" + aviso "Os dados deste hotel não estão mais disponíveis.",
     sem retry.
   - Hotel `error` → `ErrorState inline` "Não foi possível carregar os dados do hotel." + "Tentar de
     novo" (`router.refresh()` numa ilha cliente com `startTransition`, botão em loading
     "Tentando…").
   - Quarto: mesma regra.
   - `priceBreakdown` ausente (reserva no formato do README) ou inconsistente
     (`isBreakdownConsistent`: soma das linhas ≠ `totalCents`, ou `totalCents ≠
     reaisToCents(totalPrice)`) → só o total de `totalPrice`, o campo do contrato.
   - `guests` vazio → só as contagens, sem bloco de titular e sem a frase do e-mail.
   - `payment` ausente → sem a linha de pagamento.
   Datas, noites e hóspedes vêm **sempre da reserva**, nunca do quarto ou do hotel de hoje. O preço
   **nunca é recalculado**: é o que foi cobrado.
   Descartado: recalcular o breakdown com `room.pricePerNight` atual. O preço pode ter mudado e o
   cupom não está no quarto.

6. **Mesmo breakdown da F5: o que é comum vai para `shared` (segundo uso).**
   - `shared/lib/price-breakdown.ts` recebe da F5: `SERVICE_FEE_BPS`, `ISS_BPS`, o tipo `PriceLine`
     (union por `kind`: `stay` · `discount` · `service-fee` · `tax`), `priceLineLabel(line)` (switch
     exaustivo) e uma função nova `priceBreakdownLines(breakdown: PriceBreakdown): PriceLine[]`, que
     a `calculatePrice` da F5 também passa a usar para montar `lines`. Uma fonte só de ordem e
     rótulo.
   - `isBreakdownConsistent` também fica lá.
   - `shared/ui/molecules/PriceBreakdown.tsx` recebe da F5 a parte de apresentação (`<dl>` com
     linhas, total e nota "Impostos e taxas incluídos."). O skeleton, a linha de cupom pendente e o
     `aria-live` continuam na F5, que envolve o componente de `shared`.
   - Os percentuais dos rótulos ("Taxa de serviço (10%)") saem das constantes atuais, porque o
     snapshot da F5 não grava as alíquotas. Trade-off aceito: as taxas são constantes do produto.
     Se mudarem, grava-se `serviceFeeBps`/`taxBps` no `priceBreakdown` (README).
   Descartados:
   - (a) Copiar o componente e os rótulos para a F6: duas fontes que divergem.
   - (b) F6 importar da F5: quebra a regra de dependência.
   - (c) Mudar agora o payload da F5 para gravar as alíquotas: mexe numa feature fechada por um
     caso que não existe.

7. **PII mínima, só onde ajuda a pessoa a conferir a reserva.**
   - **Mostra:** nome e sobrenome do titular, e-mail do titular (na frase "Enviamos os detalhes
     para…", padrão do design system), nomes dos acompanhantes com o tipo ("adulto"/"criança") e
     "Cartão final 1111".
   - **Não mostra:** telefone, idade das crianças, bandeira (não é gravada).
   - **Nunca em:** `<title>`/metadata (título genérico), logs (o `console.error` estruturado leva
     `{ event, resource, kind, status }`, **sem o id da reserva**, porque o id dá acesso à PII),
     storage (o histórico guarda só o id; ver Decisão 9) nem atributos `data-*`.
   - Headers: `robots: { index: false, follow: false }` na página, no `not-found` e no estado
     ilegível; `Referrer-Policy: strict-origin-when-cross-origin` (global) não vaza o path para
     outras origens; `no-store` (Decisão 1).
   Descartado: e-mail mascarado (`a***@exemplo.com`). Quem tem o link já tem acesso ao e-mail na API,
   e a pessoa precisa conferir para onde "foi" a confirmação.

8. **Número da reserva = UUID completo, copiável.** É o identificador real (o que está no link e na
   API). Fica em `font-mono`/`tabular-nums` com quebra permitida (36 caracteres em 320 px) e
   `select-all`. Ilha cliente `CopyBookingNumber`:
   - `copyText(text)` (novo em `shared/lib/clipboard.ts`, devolve `boolean`; o `useCopyLink` da F4
     passa a usá-lo).
   - Sucesso → toast "Número da reserva copiado." + rótulo do botão "Copiado" por 2 s numa região
     `aria-live` sempre montada.
   - Falha (sem Clipboard API, permissão negada) → toast de erro "Não foi possível copiar. Selecione
     o número e copie." e o número continua selecionável.
   Descartados:
   - (a) Código curto derivado (8 caracteres): não serve para achar a reserva (não há busca por
     código), e seria um segundo "número".
   - (b) Mostrar em maiúsculas: copiar daria um id que a API não encontra (Decisão 2).

9. **Gancho do Histórico (F7): a confirmação grava o id em `localStorage`, só o id.**
   `shared/lib/booking-history.ts`:
   - `BOOKING_HISTORY_KEY = "booking-history"` (`infotera:booking-history`, `createStorage("local")`,
     Zod).
   - Entrada `{ id: uuid v4, savedAt: ISO datetime }`.
   - `addBookingToHistory(list, id, now)` (pura): dedupe, mais recente primeiro, no máximo 10.
   - `readBookingHistory()` / `recordBooking(id, now)` / `removeFromHistory(id)`.
   Gravação: ilha cliente `RememberBooking` (efeito no mount), **só** no estado `found`. Reload não
   duplica. Por que na F6 e não na F5: toda reserva criada termina aqui, e a F6 só grava o que a API
   confirmou que existe. Sem nome de hotel, datas ou valor no storage: a F7 lista fazendo
   `GET /bookings/:id` para cada id (até 10) e remove os que dão 404 (a mock-api zera ao reiniciar).
   `localStorage` porque o histórico precisa sobreviver ao fechar a aba.
   Riscos aceitos e documentados:
   - Abrir um link recebido de outra pessoa também entra no histórico ("reservas abertas neste
     navegador").
   - Em computador compartilhado, o id dá acesso à reserva. A F7 oferece "Remover do histórico".
   Descartados:
   - (a) A F7 listar `GET /bookings`: devolve as reservas de **todo mundo**, com PII.
   - (b) Gravar na F5 ao criar: perde reservas abertas por link e grava antes de a página confirmar.
   - (c) Guardar um resumo (hotel, datas, total): duplica dado que fica obsoleto e aumenta o que
     sobra no disco.
   - (d) `sessionStorage`: o histórico some ao fechar a aba.

10. **"Nova busca" é um link que limpa a seleção.** `NewSearchLink` (`"use client"`): `<Link
    href="/">` com `onClick` → `clearSelection()` do `booking-draft`. Link porque é navegação, e
    funciona sem JS (só não limpa). A F5 já limpa o draft ao criar a reserva. A F6 limpa de novo
    porque a pessoa pode chegar aqui pelo histórico ou por outra aba com uma seleção antiga, e "Nova
    busca" quer dizer recomeçar. O mesmo componente aparece no `not-found` e no estado ilegível.
    O `infotera:checkout-draft` não é tocado. É da F5, que o apaga no `created`, e a F6 não conhece
    a chave (regra de dependência).
    Descartado: `<button>` com `router.push` (navegação sem semântica de link e quebra sem JS).

11. **Foco e anúncio.** O `h1` "Reserva confirmada" tem `tabIndex={-1}` e recebe o foco no mount
    (`preventScroll`) por uma ilha `FocusOnMount`. Isso vale para a chegada pelo `router.replace`
    da F5 e para o reload. O leitor de tela anuncia o título e começa pelo que importa.
    `StayDetailsSection` em streaming não rouba o foco. O skeleton tem `aria-busy` e um texto
    `sr-only` "Carregando dados do hotel…".

12. **Data da reserva em horário de Brasília, formatada no servidor.** `formatBookedAt(createdAt)`
    (pura, `Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short",
    timeStyle: "short" })`) gera "19/11/2026, 12:04". A UI acrescenta "(horário de Brasília)". O RSC
    roda em UTC na Vercel: sem fuso explícito, a hora sairia errada. Datas da estadia usam
    `shared/lib/dates` (ISO, sem fuso).
    Descartado: formatar no cliente com o fuso do navegador (ilha só para isso, com flash de
    conteúdo).

## Contrato de dados

| Uso | Endpoint (verificado na mock-api) | Schema | Query key / options | Onde |
|---|---|---|---|---|
| Reserva | `GET /bookings/{encodeURIComponent(id)}` → `200` ou `404` com corpo `{}` | `bookingSchema` (shared, versão da F5) | `queryKeys.bookings.detail(id)` (já existe) · `bookingQueryOptions(id)` (feature) | servidor: `loadBooking` |
| Hotel | `GET /hotels/:id` (404 se não existe) | `hotelSchema` | `hotelQueryOptions(id)` (shared) | servidor: `loadStayDetails` |
| Quarto | `GET /rooms/:id` (404 se não existe) | `roomSchema` | `roomQueryOptions(id)` (shared) | servidor: `loadStayDetails` |
| E2E: criar reserva | `POST /bookings` com `id` UUID (json-server aceita e devolve `201`) | corpo no formato da F5 | — | `e2e/helpers/booking.ts` |

Verificado no mock: `POST` com `id` string grava e `GET /bookings/<uuid>` responde `200`. O mesmo
UUID em maiúsculas → `404`. `?_fail=1` → `500 { error }`. As reservas somem ao reiniciar a API.

**Promoção em `shared/api/endpoints.ts`:** `fetchBooking(id, signal)` = `apiGet(`/bookings/${
encodeURIComponent(id)}`, bookingSchema, { signal })`. Segundo uso: a reconciliação da Server Action
da F5 (`create-booking.server.ts`) faz o mesmo `GET` e passa a usar este. `bookingQueryOptions`
fica na feature (só a F6 usa query options).

**Tipos novos**
```ts
// features/booking-confirmation/model/booking-id.ts
type BookingId = string & { readonly __brand: "BookingId" }   // via z.uuid().brand()
parseBookingId(raw: string): BookingId | null

// features/booking-confirmation/model/load-result.ts
type BookingLoad = { kind: "found"; booking: Booking } | { kind: "not-found" } | { kind: "unreadable" }
type Settled<T> = { status: "ok"; data: T } | { status: "missing" } | { status: "error" }
classifyLoadError(error: unknown): "missing" | "unreadable" | "error"   // 404 · parse · resto

// features/booking-confirmation/model/confirmation-view.ts (todas puras)
toBookingView(booking, today): BookingView        // número, datas, noites, hóspedes, titular, pagamento, preço, bookedAt
toStayView(booking, hotel: Settled<Hotel>, room: Settled<Room>): StayView   // blocos hotel/quarto com estado
```

**Storage**
| Chave | Onde | Conteúdo | Dono |
|---|---|---|---|
| `infotera:booking-history` | local | `[{ id: uuid v4, savedAt: ISO datetime }]`, máx. 10, mais recente primeiro | shared (escreve: F6; lê: F7) |
| `infotera:booking-draft` | session | apagado pelo "Nova busca" | shared |

**Metadata:** `found` → `title: "Reserva confirmada | Infotera Hotéis"`. `not-found`/inválido →
`"Reserva não encontrada | Infotera Hotéis"`. `unreadable` → `"Reserva indisponível | Infotera
Hotéis"`. Erro no metadata → título `found` padrão (metadata nunca derruba a página, como na F4).
Sempre `robots: { index: false, follow: false }`.

## Critérios de aceite

**Carga e conteúdo**
1. Dado uma reserva criada no formato da F5, quando abro `/confirmation/<uuid>`, então vejo o `h1`
   "Reserva confirmada" com foco, o número da reserva (UUID completo), o nome e o endereço do hotel,
   o nome do quarto e as camas, as datas de check-in e check-out com os horários do hotel, o número
   de noites, os hóspedes ("2 adultos, 1 criança · 1 quarto"), o titular, a frase com o e-mail, os
   nomes dos acompanhantes com o tipo, "Cartão final 1111", a data da reserva em horário de
   Brasília e o breakdown igual ao do checkout. Exemplo: `BEMVINDO10`, R$ 1.200 × 3 noites × 1
   quarto → estadia R$ 3.600,00 · Desconto (BEMVINDO10) −R$ 360,00 · Taxa de serviço (10%)
   R$ 324,00 · ISS (5%) R$ 162,00 · Total R$ 3.726,00.
2. Quando recarrego a página ou abro o mesmo link em outra aba, sem `sessionStorage`, então o
   conteúdo é o mesmo (vem da API).
3. A resposta HTML já contém o número da reserva e o total (renderizados no servidor). O
   `Cache-Control` da resposta contém `no-store`.
4. Na carga, `GET /hotels/:id` e `GET /rooms/:id` começam juntos, depois da reserva: nenhum espera
   o outro (unit do loader com promessas controladas).
5. A tela não mostra telefone, idade das crianças, CPF/documento nem número do cartão. O `<title>`
   não contém nome, e-mail nem o id. Nenhum `console.*` contém o id, o nome ou o e-mail.

**Estados**
6. Enquanto a reserva carrega, aparece o skeleton da página (`loading.tsx`) com `aria-busy` e texto
   `sr-only`. Enquanto hotel e quarto carregam, só a seção deles mostra skeleton, e o número e o
   preço já estão visíveis.
7. Dado um UUID v4 que não existe, então vejo o `h1` "Reserva não encontrada", o texto do design
   system (§6.4) e "Fazer nova busca". A página tem `<meta name="robots" content="noindex,
   nofollow">`.
8. Dado um id fora do formato (`abc`, `1`, `00000000-0000-1000-8000-000000000000` (v1), `%2e%2e`),
   então vejo "Reserva não encontrada" e **nenhum** request vai para a API (unit:
   `parseBookingId` + fetch espionado no teste da página).
9. Dado um UUID em maiúsculas de uma reserva que existe, então a página abre normalmente (o id é
   normalizado para minúsculas).
10. Dado que `GET /bookings/:id` falha (5xx, rede ou timeout), então aparece o erro da rota
    "Não foi possível carregar sua reserva", "Tentar de novo" (`retry()`) e o link "Fazer nova
    busca". O retry que dá certo mostra a reserva.
11. Dado que a reserva existe mas está fora do contrato (`parse`), então vejo "Não foi possível
    exibir esta reserva" sem botão de retry, com "Fazer nova busca".
12. Dado que o hotel (ou o quarto) responde 404, ou que o quarto é de outro hotel, então o resto da
    confirmação aparece e o bloco mostra "Hotel #{id}" (ou "Quarto #{id}") com o aviso de dados
    indisponíveis, sem retry.
13. Dado que o hotel (ou o quarto) falha com 5xx ou rede, então o bloco mostra `ErrorState inline`
    com "Tentar de novo". O clique deixa o botão em "Tentando…" (`aria-busy`, mantém o foco) e
    refaz a página no servidor. No sucesso, o bloco aparece.
14. Dado uma reserva no formato do README da mock-api (`guests: []`, sem `priceBreakdown`, sem
    `payment`), mas com id UUID, então a página mostra contagem de hóspedes e total de
    `totalPrice`, sem titular, sem e-mail, sem linha de pagamento e sem breakdown.
15. Dado um `priceBreakdown` cujas linhas não somam o total, ou cujo total ≠ `totalPrice`, então
    só o total (`totalPrice`) aparece.

**Ações**
16. Quando ativo "Copiar número da reserva" (mouse ou teclado), então a área de transferência
    recebe exatamente o UUID, aparece o toast "Número da reserva copiado." e o botão mostra
    "Copiado" por 2 s, anunciado em `aria-live`. Sem Clipboard API: toast de erro "Não foi possível
    copiar. Selecione o número e copie." e nada quebra.
17. Dado um `infotera:booking-draft` com seleção, quando clico "Nova busca", então vou para `/` e a
    chave não existe mais. Com JS desativado, o link ainda leva para `/`.
18. Dado que a reserva carregou (`found`), então `infotera:booking-history` contém `{ id, savedAt }`
    no topo. Recarregar não duplica. Com 10 itens, o mais antigo sai. `not-found`, `unreadable` e
    erro não gravam nada. O valor gravado não contém nome, e-mail nem preço.

**Acessibilidade e mobile**
19. axe (WCAG A/AA) sem violações em: sucesso, não encontrada, ilegível, hotel indisponível e erro
    de seção.
20. Só com teclado: Tab chega a "Copiar número da reserva" e a "Nova busca", com foco visível. Há
    um único `h1` por estado. A seção hotel/quarto tem `h2`.
21. Em 320 px, nenhum estado tem rolagem horizontal (`scrollWidth <= clientWidth`), mesmo com o
    UUID de 36 caracteres e nomes longos.

## Arquivos

**App**
| Caminho | Responsabilidade |
|---|---|
| `src/app/confirmation/[bookingId]/page.tsx` (novo) | `await connection()`, `parseBookingId` → `notFound()`, `generateMetadata`, renderiza `<BookingConfirmation id />` |
| `src/app/confirmation/[bookingId]/loading.tsx` (novo) | `<ConfirmationSkeleton />` da feature |
| `src/app/confirmation/[bookingId]/error.tsx` (novo) | `"use client"`, `ErrorState variant="page" headingLevel={1}` + `retry` + link "Fazer nova busca". **Só importa `@/shared/ui`** (lição da F4: não puxar código de servidor). `console.error` estruturado só com `digest` |
| `src/app/confirmation/[bookingId]/not-found.tsx` (novo) | `EmptyState` h1 "Reserva não encontrada" + `NewSearchLink`, metadata `noindex` |
| `src/app/confirmation/[bookingId]/page.test.tsx` (novo) | metadata por estado, id inválido sem fetch, composição |

**Shared**
| Caminho | Responsabilidade |
|---|---|
| `src/shared/lib/price-breakdown.ts` (+test) (promovido da F5) | `SERVICE_FEE_BPS`, `ISS_BPS`, `PriceLine`, `priceLineLabel`, `priceBreakdownLines`, `isBreakdownConsistent` |
| `src/shared/ui/molecules/PriceBreakdown.tsx` (+test) (promovido da F5) | `<dl>` de linhas + total + nota. Sem skeleton e sem região viva |
| `src/shared/api/endpoints.ts` (+test) (alterado) | `fetchBooking(id, signal)` com `encodeURIComponent` |
| `src/shared/lib/clipboard.ts` (+test) (novo) | `copyText(text): Promise<boolean>` (nunca lança) |
| `src/shared/lib/booking-history.ts` (+test) (novo) | chave, schema, `addBookingToHistory` (pura), `readBookingHistory`, `recordBooking`, `removeFromHistory` |
| `src/shared/lib/cancellation.ts`, `src/shared/lib/room-labels.ts` (promovidos da F4, **se a F5 ainda não promoveu**) | `cancellationDetails` (só `label`/`tone` são usados aqui), `bedsLabel` |
| `src/shared/hooks/useCopyLink.ts` (alterado) | passa a usar `copyText` |
| `src/shared/ui/index.ts` (alterado) | exporta `PriceBreakdown` |
| `src/features/checkout/**` (alterado) | imports de `price-breakdown`/`PriceBreakdown` de shared, `calculatePrice` usa `priceBreakdownLines`, reconciliação usa `fetchBooking` |
| `src/features/hotel-details/**` (alterado, se houver promoção) | imports de `cancellation`/`room-labels` de shared |

**Feature `src/features/booking-confirmation/`** (todo `model/` e `api/` com `.test.ts` ao lado)
| Caminho | Responsabilidade |
|---|---|
| `model/booking-id.ts` | `bookingIdSchema`, `BookingId`, `parseBookingId` |
| `model/load-result.ts` | `BookingLoad`, `Settled<T>`, `classifyLoadError` |
| `model/confirmation-view.ts` | `toBookingView`, `toStayView`, tipos `BookingView`/`StayView` |
| `model/guests.ts` | `describeGuests(booking)` (titular, acompanhantes com `kind`; nunca `age`/`phone`) |
| `model/booked-at.ts` | `formatBookedAt(iso)` em `America/Sao_Paulo` |
| `model/metadata.ts` | `confirmationTitle(load)` (switch exaustivo) e `CONFIRMATION_ROBOTS` |
| `api/booking.ts` | `bookingQueryOptions(id)` (chave de shared, `fetchBooking`) |
| `api/confirmation.server.ts` | `loadBooking(id)` (server query client, classifica), `loadStayDetails(booking)` (paralelo + `settle`), log estruturado sem PII |
| `components/BookingConfirmation.tsx` | RSC: carrega, `switch` do `BookingLoad` (`notFound()` / ilegível / view), cria a promessa de `loadStayDetails` |
| `components/ConfirmationView.tsx` | RSC: cabeçalho, número, estadia, hóspedes, pagamento, preço, ações; `<Suspense>` da seção hotel/quarto |
| `components/ConfirmationHeader.tsx` | `h1` + frase do e-mail + `FocusOnMount` |
| `components/BookingNumber.tsx` · `CopyBookingNumber.tsx` (`"use client"`) | número em destaque, botão copiar com estado "Copiado" e `aria-live` |
| `components/StaySummary.tsx` | datas, horários, noites, hóspedes |
| `components/GuestList.tsx` · `PaymentSummary.tsx` | titular, acompanhantes, cartão final |
| `components/BookingPrice.tsx` | `PriceBreakdown` de shared ou só o total |
| `components/StayDetailsSection.tsx` | RSC assíncrono: aguarda a promessa e renderiza `HotelBlock` + `RoomBlock` |
| `components/HotelBlock.tsx` · `RoomBlock.tsx` | `ok` / `missing` / `error` (switch exaustivo) |
| `components/StayDetailsSkeleton.tsx` · `ConfirmationSkeleton.tsx` | skeletons com a geometria do conteúdo |
| `components/RefreshButton.tsx` (`"use client"`) | `router.refresh()` em `startTransition`, `Button loading` "Tentando…" |
| `components/NewSearchLink.tsx` (`"use client"`) | `Link` + `clearSelection()` |
| `components/RememberBooking.tsx` (`"use client"`) | `recordBooking(id, new Date())` no mount, renderiza `null` |
| `components/FocusOnMount.tsx` (`"use client"`) | foca o alvo por `id` no mount (`preventScroll`) |
| `components/UnreadableBooking.tsx` | `EmptyState` h1 "Não foi possível exibir esta reserva" + `NewSearchLink` |
| `components/*.test.tsx` | testes de componente (Plano de testes) |
| `index.ts` | `BookingConfirmation`, `ConfirmationSkeleton`, `NewSearchLink`, `parseBookingId`, `generateConfirmationMetadata` |
| `CLAUDE.md` (alterado) | estrutura real, Decisões 1–12, nota para a F7 (rota dinâmica e histórico) |

**E2E**
| Caminho | Responsabilidade |
|---|---|
| `e2e/helpers/booking.ts` (novo) | `createBooking(request, overrides)` (`POST` na mock-api com UUID de `crypto.randomUUID()` e corpo no formato da F5), `bookingPath(id)`, `README_FORMAT_BOOKING` |
| `e2e/booking-confirmation.spec.ts` | conteúdo, reload, outra aba, copiar, Nova busca, histórico, headers |
| `e2e/booking-confirmation.states.spec.ts` | não encontrada, id inválido, maiúsculas, formato README, hotel/quarto inexistentes, breakdown inconsistente, axe, 320 px, teclado |

## Tarefas

Escopo `booking-confirmation` nos commits da feature. Mudanças em `shared`, `checkout` e
`hotel-details` usam o escopo do dono. Toda tarefa termina com `npm run typecheck && npm run lint &&
npm run test` verdes.

1. `refactor(shared): promote price breakdown lines and labels from checkout` — `price-breakdown.ts` + `priceBreakdownLines` + `isBreakdownConsistent`, e `calculatePrice` passa a usar. Prova: testes movidos verdes. Unit novo: linhas a partir do `priceBreakdown` do exemplo da F5 (ordem, desconto só com `discountCents > 0`, rótulo com cupom). Inconsistência por soma e por `totalPrice`. Suítes da F5 verdes.
2. `refactor(shared): promote price breakdown component from checkout` — Prova: teste de componente em shared (linhas, total, `−R$`, nota). Testes da F5 verdes sem mudança de comportamento.
3. `refactor(shared): promote cancellation and bed labels from hotel-details`. Pular se a F5 já promoveu. Prova: suítes da F4 verdes só com troca de import.
4. `feat(shared): add booking fetch with encoded id` — `fetchBooking` e reconciliação da F5 usando. Prova: unit com `fetch` stubado (path com `encodeURIComponent`, `/` vira `%2F`, 404 → `ApiError` 404, schema aplicado). Unit da action da F5 verde.
5. `feat(shared): add clipboard helper` — `copyText` e `useCopyLink` usando. Prova: unit (sucesso → `true`; sem `navigator.clipboard` → `false`; `writeText` rejeita → `false`, sem lançar). Teste do `useCopyLink` verde.
6. `feat(shared): add booking history storage` — Prova: unit (adiciona no topo, dedupe move para o topo, limite 10, storage corrompido → `[]`, entrada com id não UUID é descartada, `removeFromHistory`, JSON gravado só com `id`/`savedAt`).
7. `feat(booking-confirmation): add booking id parsing` — Prova: unit em tabela (v4 válido, maiúsculas → minúsculas, espaços, v1, numérico, `../hotels/1`, `%2e%2e`, `%` sozinho sem lançar, vazio).
8. `feat(booking-confirmation): add load result classification and metadata` — `load-result.ts`, `metadata.ts`. Prova: unit (`ApiError` 404 → `missing`, `parse` → `unreadable`, 500/rede/timeout/`Error` comum → `error`; título por estado; robots).
9. `feat(booking-confirmation): add confirmation view model` — `confirmation-view.ts`, `guests.ts`, `booked-at.ts`. Prova: unit (formato F5 completo, formato README, sem `payment`, breakdown inconsistente, hotel/quarto `ok`/`missing`/`error`, quarto de outro hotel → `missing`, acompanhantes sem `age`/`phone` na saída, `formatBookedAt` com `TZ=UTC` dá a hora de Brasília, noites a partir das datas da reserva).
10. `feat(booking-confirmation): add server loaders with parallel hotel and room` — `api/booking.ts`, `confirmation.server.ts`. Prova: unit com `fetch` stubado por URL e promessas controladas: hotel e quarto chamados antes de qualquer um resolver; `metadata` + página = 1 `GET /bookings` (mesmo server client); cada classificação; `console.error` espionado recebe só `{ event, resource, kind, status }`, sem o id.
11. `feat(booking-confirmation): add confirmation summary` — `ConfirmationView`, `ConfirmationHeader`, `BookingNumber`, `StaySummary`, `GuestList`, `PaymentSummary`, `BookingPrice`, `ConfirmationSkeleton`, `UnreadableBooking`. Prova: componente (critérios 1, 5, 11, 14, 15 a partir de fixtures, `makeBooking` novo em `shared/testing/fixtures.ts`).
12. `feat(booking-confirmation): stream hotel and room details with section retry` — `StayDetailsSection`, `HotelBlock`, `RoomBlock`, `StayDetailsSkeleton`, `RefreshButton`. Prova: componente (`render(await StayDetailsSection({ details }))` para cada combinação; `RefreshButton` chama `router.refresh` e fica em "Tentando…" até a transição terminar; critérios 6, 12, 13).
13. `feat(booking-confirmation): add copy, new search, focus and history islands` — `CopyBookingNumber`, `NewSearchLink`, `FocusOnMount`, `RememberBooking`. Prova: componente (critérios 16–18 com `navigator.clipboard` stubado e ausente, store semeado, `localStorage` lido; foco no `h1`).
14. `feat(booking-confirmation): add confirmation route` — `BookingConfirmation`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `index.ts`. Prova: `page.test.tsx` (id inválido → `notFound` sem `fetch`; metadata por estado; `error.tsx` chama `retry` e tem "Fazer nova busca") + `npm run build` ok.
15. `test(booking-confirmation): add e2e for the confirmation page` — `e2e/helpers/booking.ts`, `booking-confirmation.spec.ts`. Prova: verde em `desktop-chromium` e `mobile-chromium`.
16. `test(booking-confirmation): add e2e for states and accessibility` — `booking-confirmation.states.spec.ts`. Prova: verde.
17. `docs(booking-confirmation): update feature, shared and app claude.md` — Prova: revisão (decisões refletidas; `shared/CLAUDE.md` com `price-breakdown`, `PriceBreakdown`, `fetchBooking`, `clipboard`, `booking-history`; nota para a F7 de que a rota é dinâmica e o histórico só guarda ids).

## Plano de testes

**Unit (`model/`, `api/`, `shared/lib`)**: 100% das funções puras das tarefas 1, 4–10.
- "Hoje" e "agora" sempre por parâmetro.
- Tabelas (`it.each`) para `parseBookingId`, `classifyLoadError`, `toStayView`.
- Teste de privacidade: serializar `toBookingView` e o valor gravado por `recordBooking` e afirmar
  que não contêm o telefone, a idade nem `cardLast4` fora do campo de pagamento.
- `formatBookedAt` roda com `process.env.TZ = "UTC"` para provar o fuso fixo.
- Loader: `vi.stubGlobal("fetch")` respondendo por método + URL, com promessas controladas para
  provar o paralelismo e o `_delay` (pendente) e respostas 500 `{ error }` para o `_fail`.
- `bookingSchema` (com a extensão da F5) valida o corpo do helper de E2E e o exemplo do README.

**Componente (Vitest + Testing Library)**
- Fixtures por `makeBooking` (novo em `shared/testing/fixtures.ts`, saída passa pelo schema),
  `makeHotel`, `makeRoom`.
- RSC síncronos renderizados direto. RSC assíncronos com `render(await Component(props))`.
- `next/navigation` pelo helper `shared/testing/next-navigation.ts` (`refresh` espionado).
- `navigator.clipboard` stubado (resolve, rejeita, ausente). `useBookingDraft.setState` para semear
  a seleção.
- `console.*` espionado em todos os testes da feature: nenhuma chamada com PII.
- `error.tsx`: renderiza com `retry` mock e confere chamada + link.

**E2E (Playwright, mock-api real em `:3333` pelo `webServer`; datas hoje + 30 → + 33)**
- `booking-confirmation.spec.ts`
  - `createBooking` (hotel 1, quarto 1, 2 adultos + 1 criança, `BEMVINDO10`) → `page.goto` →
    critério 1 (textos exatos do breakdown, hotel e quarto pelos nomes da API, foco no `h1` via
    `toBeFocused`).
  - `page.reload()` e `context.newPage()` → mesmo conteúdo (critério 2).
  - `response.headers()["cache-control"]` contém `no-store`, e `response.text()` contém o número
    (critério 3).
  - Telefone e idade ausentes do `page.content()` (critério 5).
  - Copiar com `context.grantPermissions(["clipboard-read", "clipboard-write"])` e
    `navigator.clipboard.readText()` (critério 16).
  - Nova busca com `sessionStorage` semeado por `addInitScript` (critério 17).
  - `localStorage` com o id depois da carga e sem duplicar depois do reload (critério 18).
- `booking-confirmation.states.spec.ts`
  - UUID aleatório → "Reserva não encontrada" + meta robots (critério 7).
  - `/confirmation/abc`, `/confirmation/1` → não encontrada (critério 8).
  - Id em maiúsculas (critério 9).
  - Corpo no formato do README com UUID (critério 14).
  - `hotelId: 9999` e `roomId` de outro hotel → blocos "indisponível" (critério 12; a API não
    valida, então o cenário é real).
  - `priceBreakdown` com total adulterado (critério 15).
  - axe em todos esses estados (critério 19), teclado (critério 20), 320 px (critério 21).
- `_delay`/`_fail`: as requisições saem do servidor do Next, então `page.route` não as vê e
  `slowApi`/`failingApi` não se aplicam (a `NEXT_PUBLIC_API_URL` do servidor é fixa). Cobertos por:
  - unit do loader (pendente / 500 / rede);
  - componente (skeletons, `ErrorState` da seção, `error.tsx`);
  - critério 13: E2E só se o servidor de dev for iniciado contra o `failingApi`, fora do escopo.
    Registrar no README junto do limite da F4.
- O projeto `mobile-chromium` roda os dois arquivos.

## Riscos

| Risco | Mitigação |
|---|---|
| F7 aplicar PPR/ISR/`use cache` na rota e cachear PII | `await connection()` explícito; E2E confere `no-store`; nota no `CLAUDE.md` da feature e no da F7 |
| Promoções de F4/F5 quebram as features fechadas | Tarefas 1–5 isoladas, cada uma com as suítes de F4/F5 verdes; nomes reais prevalecem sobre a spec |
| `loading.tsx` faz o 404 sair com status `200` (streaming) | Aceito, como na F4 (Decisão 2 de lá): `noindex` automático + nosso `robots`; README |
| UUID longo estoura 320 px | `break-all` no número; critério 21 com E2E de `scrollWidth` |
| Clipboard indisponível (HTTP não local, permissão) | `copyText` nunca lança; toast com alternativa; número `select-all` |
| Fuso errado na data da reserva (servidor em UTC) | `America/Sao_Paulo` fixo + unit com `TZ=UTC` |
| Reserva forjada via `POST` (hotel inexistente, quarto de outro hotel, total adulterado) | `Settled` com `missing`, checagem `room.hotelId`, `isBreakdownConsistent`; E2E com corpos forjados |
| Id da reserva vazar em log ou referrer | Log sem id (unit espiona `console.error`); `Referrer-Policy` global `strict-origin-when-cross-origin`; nenhum link externo com o path |
| Histórico em `localStorage` expõe reservas em computador compartilhado | Só ids, máx. 10; F7 com "Remover do histórico"; documentado no README |
| `error.tsx` importar o `index.ts` e puxar código de servidor para o cliente | `error.tsx` só importa `@/shared/ui`; build quebra se violado (nota no `CLAUDE.md`) |
| `router.refresh()` da seção não refaz o fetch (cache do server client) | O server query client é por request (`cache` do React): cada refresh é um request novo; teste de componente + verificação manual com `--fail-rate` |
| Toast "copiado" duplicado com o `aria-live` do botão (leitura dupla) | O `ui-designer` decide qual dos dois anuncia; a spec exige que o botão tenha estado visível e anunciado |
| Reservas somem ao reiniciar a mock-api (E2E e demo) | Cada teste cria a própria reserva; "Reserva não encontrada" com o texto do design system que explica isso; README |

## UI/UX

Referências: `docs/design/design-system.md` §1.2 (tipografia), §4.1/§4.3 (container e página), §5.1
Button/Badge/Skeleton, §5.2 Card/EmptyState/ErrorState, §5.3 Toast, §6 (microcopy). Pressupõe as
mudanças de F4 (já no DS) e F5 (`PriceBreakdown`, `CreditCardIcon`) aplicadas. O que esta feature pede
ao DS está em `## Mudanças no design system`, no fim da spec.

### Decisões de UX

1. **Recibo em uma coluna, em todas as larguras** (`max-w-3xl`, sem sidebar). A página é de leitura e
   tem uma ação só. Uma coluna dá a mesma ordem de leitura, de foco e de impressão em 320 px e em
   1280 px, e não precisa de aside sticky. Descartado: grade `1fr_22rem` com o preço à direita (como na
   F5). No checkout o aside acompanha um formulário longo. Aqui ele só criaria duas ordens de leitura.
2. **O topo responde três perguntas: deu certo? qual o número? quando e quanto?** Abaixo do h1 vem o
   cartão "Número da reserva", com o número, o botão de copiar e uma linha-resumo **Estadia · Total**
   (`12–15 dez · 3 noites` e `R$ 3.726,00`). Esses dados vêm da reserva e aparecem na hora, antes do
   streaming. O detalhamento completo fica mais abaixo. Repetir o total é proposital: num recibo, o
   valor tem que estar na primeira tela.
3. **UUID legível sem truncar e sem estourar 320 px.** O número aparece em `font-mono text-xl`, com
   `<wbr>` depois de cada hífen. A quebra cai sempre entre grupos (`3f2a9c1e-7b4d-4e8a-` /
   `9f12-6c0d3b2a1e57`), nunca no meio de um grupo, e o `<wbr>` não entra no texto copiado.
   `wrap-anywhere` cobre zoom de 200%. `select-all` faz um toque ou clique selecionar o número inteiro,
   e esse é o caminho manual quando o clipboard falha. Mantém minúsculas (Decisão 8).
4. **O feedback de copiar fica no botão, sem toast** (resolve o risco de leitura dupla). Ao copiar, o
   botão troca para "Copiado" com check por 2 s, sem mudar de largura. Uma linha `aria-live` logo
   abaixo, sempre montada, anuncia "Número da reserva copiado.". Na falha, essa mesma linha mostra o
   motivo e o que fazer, de forma visível, e o número fica pré-selecionado. Erro perto de onde
   aconteceu, e o toast não seria o único canal. Descartado: toast + rótulo. O leitor de tela leria
   duas vezes, e no celular o toast sai lá embaixo, longe do número.
5. **Falhas parciais têm um único lugar de retry.** Hotel e quarto chegam juntos (mesma promessa). Se
   um dos dois falhar, ou os dois, aparece **um** `ErrorState inline` no topo da área em streaming, que
   diz o que faltou ("do hotel", "do quarto" ou "do hotel e do quarto") e tem **um** "Tentar de novo".
   O que carregou aparece abaixo dele normalmente. `missing` não tem retry: fica um aviso no lugar do
   bloco.
6. **Política de cancelamento visível, sem `<details>`.** Na confirmação, a condição já foi contratada
   e é o que a pessoa volta para conferir. O badge e as regras (2–3 linhas) ficam abertos. Isso também
   resolve a impressão, porque `<details>` fechado não imprime o conteúdo.
7. **Uma única ação primária: "Fazer nova busca", no fim da página.** "Copiar número da reserva" é
   secondary. "Ver página do hotel" é um link de texto dentro do bloco do hotel, perto do que ele
   abre. Os textos seguem o DS §6.2 ("Fazer nova busca", e não "Nova busca").

### Layout

Container do layout raiz (`<main>` já existe). Conteúdo em `mx-auto flex w-full max-w-3xl flex-col
gap-6 lg:gap-8`. Cada seção de dados é `<section aria-labelledby>` num `Card static` (`p-4 md:p-5`) com
h2 `text-xl font-semibold`. DOM = ordem visual = ordem de foco, em todas as larguras.

**320–375 px (sucesso, hotel e quarto já carregados):**
```
┌ SiteHeader sticky h-14 ───────────────┐
└───────────────────────────────────────┘
 (✓)                                      span size-12 rounded-full bg-success-soft text-success,
                                           CheckCircleIcon size-6 aria-hidden
 Reserva confirmada                       h1 text-2xl font-bold lg:text-3xl, tabIndex=-1 (foco)
 Enviamos os detalhes para                p text-base text-fg-muted max-w-prose
 ana.souza@exemplo.com.                   e-mail <span class="font-medium text-fg wrap-anywhere">
 Reserva feita em 19/11/2026, 12:04       p text-sm text-fg-subtle tabular-nums
 (horário de Brasília)
┌ Card (p-4) ────────────────────────────┐ <div> (sem heading; é o recibo-resumo)
│ Número da reserva                       │ <dl> dt text-sm font-medium text-fg-muted
│ 3f2a9c1e-7b4d-4e8a-                     │ dd font-mono text-xl font-semibold text-fg
│ 9f12-6c0d3b2a1e57                       │    select-all wrap-anywhere translate="no"
│ [⧉ Copiar número da reserva          ] │ Button secondary md, w-full sm:w-auto, mt-3
│ (linha viva min-h-5)                    │ p text-sm aria-live="polite" mt-2
│ ─────────────────────────────────────── │ border-t border-border pt-4 mt-2
│ Estadia                                 │ <dl class="grid gap-4 sm:grid-cols-2">
│ 12–15 dez · 3 noites                    │ dt text-sm text-fg-muted · dd text-base font-semibold
│ Total                                   │ tabular-nums
│ R$ 3.726,00                             │ dd text-2xl font-bold tabular-nums whitespace-nowrap
└─────────────────────────────────────────┘
┌ Sua estadia (h2) ───────────────────────┐ <section aria-labelledby id="sua-estadia">, h2 tabIndex=-1
│ ┌────────┐ Hotel Copacabana Palace      │ img w-24 sm:w-40 aspect-[4/3] rounded-control alt=""
│ │  foto  │ (h3 text-lg font-semibold)   │ flex items-start gap-4; nome quebra linha
│ └────────┘ 📍 Av. Atlântica, 1702 -     │ p text-sm text-fg-muted, MapPinIcon size-4
│            Copacabana, Rio de Janeiro   │
│ Ver página do hotel ›                   │ Link text-primary font-medium min-h-11, print:hidden
│ ─────────────────────────────────────── │
│ Quarto                                  │ dt text-sm text-fg-muted
│ Suíte Deluxe Ocean View                 │ dd text-base font-semibold
│ 1 cama king e 1 sofá-cama               │    + text-sm text-fg-muted
│ ─────────────────────────────────────── │
│ Cancelamento                            │ h3 text-base font-semibold
│ [✓ Cancelamento grátis]                 │ Badge success (moderate neutral, strict warning)
│ • Cancele grátis até 48 horas antes do  │ ul list-disc pl-5 text-sm text-fg-muted max-w-prose
│   check-in.                             │ (regras do DS §6.8, sempre abertas)
│ • Depois desse prazo, cobramos a        │
│   primeira diária.                      │
│ • Se você não comparecer, cobramos a    │
│   primeira diária.                      │
│ ─────────────────────────────────────── │ ↑ até aqui: streaming (Suspense A)
│ Check-in            Check-out           │ <dl class="grid grid-cols-2 gap-4"> (vem da reserva)
│ sáb., 12 de dez.    ter., 15 de dez.    │ dd text-base font-semibold tabular-nums
│ A partir de 15:00   Até 12:00           │ dd text-sm text-fg-muted min-h-5 (Suspense B, do hotel)
│ 3 noites · 2 adultos, 1 criança ·       │ p text-sm text-fg-muted tabular-nums
│ 1 quarto                                │
└─────────────────────────────────────────┘
┌ Hóspedes (h2) ──────────────────────────┐
│ Ana Souza · titular                     │ <ul class="flex flex-col gap-2">, nome text-base
│ Bruno Souza · adulto                    │ font-medium wrap-anywhere, "· tipo" text-fg-muted
│ Clara Souza · criança                   │
└─────────────────────────────────────────┘
┌ Pagamento (h2) ─────────────────────────┐
│ 💳 Cartão final 1111                    │ p flex gap-2, CreditCardIcon size-5 aria-hidden
│ Pagamento simulado: nenhum valor foi    │ p text-sm text-fg-muted
│ cobrado.                                │
│ ─────────────────────────────────────── │
│ R$ 1.200,00 × 3 noites × 1 quarto       │ PriceBreakdown (shared, DS §5.3 "PriceBreakdown")
│                          R$ 3.600,00    │
│ Desconto (BEMVINDO10)     −R$ 360,00    │
│ Taxa de serviço (10%)       R$ 324,00   │
│ ISS (5%)                    R$ 162,00   │
│ ─────────────────────────────────────── │
│ Total                     R$ 3.726,00   │
│ Impostos e taxas incluídos.             │
└─────────────────────────────────────────┘
┌ Próximos passos (h2) ───────────────────┐
│ 1. Guarde o número da reserva. Ele      │ <ol class="list-decimal pl-5 flex flex-col gap-2
│    também está no endereço desta página.│ max-w-prose text-base">
│ 2. No check-in, apresente um documento  │
│    com foto de cada hóspede.            │
│ 3. Não compartilhe o link desta página: │
│    quem tiver o link vê os dados da     │
│    reserva.                             │
│ 4. Cancelar ou alterar a reserva não    │
│    está disponível nesta demonstração.  │
└─────────────────────────────────────────┘
 [         Fazer nova busca          ]    NewSearchLink com buttonClassName primary md,
                                           w-full sm:w-auto, print:hidden
```

**≥ 1024 px:** mesma coluna (`max-w-3xl`, alinhada à esquerda do container, como o texto do resto do
site: `lg:mx-0`). Mudanças:
```
 (✓)
 Reserva confirmada                                         h1 lg:text-3xl
 Enviamos os detalhes para ana.souza@exemplo.com.
 Reserva feita em 19/11/2026, 12:04 (horário de Brasília)
┌ Card p-5 ───────────────────────────────────────────────────────────┐
│ Número da reserva                                                    │
│ 3f2a9c1e-7b4d-4e8a-9f12-6c0d3b2a1e57      (uma linha a partir de sm) │
│ [⧉ Copiar número da reserva]                                         │
│ ──────────────────────────────────────────────────────────────────── │
│ Estadia                              Total                           │  sm:grid-cols-2
│ 12–15 dez · 3 noites                 R$ 3.726,00                     │
└──────────────────────────────────────────────────────────────────────┘
┌ Sua estadia ─────────────────────────────────────────────────────────┐
│ ┌foto w-40┐ Hotel Copacabana Palace                                  │
│ │         │ 📍 Av. Atlântica, 1702 - Copacabana, Rio de Janeiro       │
│ └─────────┘                                                          │
│ Ver página do hotel ›                                                │
│ ... (resto igual ao mobile)                                          │
└──────────────────────────────────────────────────────────────────────┘
 ...
 [Fazer nova busca]
```
- "Ver página do hotel" fica sempre logo abaixo da linha foto+texto (`mt-1`), em todas as larguras.
  Ao lado da foto, numa coluna de 144 px em 320 px, ele quebraria em duas linhas.
- Larguras de texto: endereço, regras e próximos passos em `max-w-prose`.
- Nenhum valor em reais quebra (`whitespace-nowrap`). Os rótulos quebram. Nomes de hóspede e e-mail
  usam `wrap-anywhere`, porque e-mail longo ou nome sem espaço estouraria 320 px.

### Hierarquia

1. **Deu certo:** ícone de sucesso + h1 "Reserva confirmada" (o h1 recebe o foco).
2. **O número:** maior texto depois do h1, com o botão de copiar colado nele.
3. **Quando e quanto:** `12–15 dez · 3 noites` e o total, no mesmo cartão do número.
4. **Onde e o quê:** hotel (nome, endereço), quarto, cancelamento, datas com horários.
5. **Quem e como pagou:** hóspedes, cartão, detalhamento.
6. **O que fazer agora:** próximos passos e "Fazer nova busca".

### Componentes

| Uso | Componente | Observação |
|---|---|---|
| Seções | `Card static` (classes do DS §5.2) + `<section aria-labelledby>` | h2 fora de qualquer Suspense |
| Número | `BookingNumber` (feature, RSC) + `CopyBookingNumber` (feature, `"use client"`) | padrão "Valor copiável" (DS §5.2, novo) |
| Copiar | `Button secondary md` com `leftIcon` `CopyIcon` (**ícone novo**) / `CheckIcon` | não usa `toast` (Decisão de UX 4) |
| Foto | `RemoteImage` (shared, F4) | `alt=""`, fallback `BedIcon` no bloco cinza |
| Cancelamento | `Badge` (`success`/`neutral`/`warning`) + `ul` | `cancellationDetails` (shared) |
| Preço | `PriceBreakdown` (shared, promovido da F5) | sem skeleton (dado já chegou com a reserva) |
| Erro de seção | `ErrorState inline headingLevel={3}` com `action={<RefreshButton />}` (sem `onRetry`: é RSC) | `RefreshButton` usa `Button secondary` `loading` "Tentando…" |
| Página: vazio | `EmptyState headingLevel={1}` + `NewSearchLink` (primary) | 404 e ilegível |
| Página: erro | `ErrorState variant="page" headingLevel={1}` | `error.tsx` |
| Skeleton | `Skeleton` (shared) | `ConfirmationSkeleton`, `StayDetailsSkeleton`, linha de horário |
| Ação final | `NewSearchLink` com `buttonClassName({ variant: "primary" })` | Link real (funciona sem JS) |
| Ícones | `CheckCircleIcon`, `MapPinIcon`, `ChevronRightIcon`, `BedIcon`, `AlertCircleIcon`, `InfoIcon` (existentes), `CreditCardIcon` (F5), **`CopyIcon` (novo)** | |

Componente a mais em relação à lista de Arquivos: `components/CheckTimes.tsx` (RSC assíncrono, lê a
mesma promessa de `loadStayDetails`, em `<Suspense>` próprio). Ele renderiza os dois horários do hotel
dentro do `<dl>` de datas. Assim as datas aparecem na hora e os horários entram depois sem mexer no
resto do layout.

### Número da reserva (copiar)

```
 Número da reserva
 3f2a9c1e-7b4d-4e8a-          ← <dd id="numero-reserva"> com <wbr> após cada "-"
 9f12-6c0d3b2a1e57
 [⧉ Copiar número da reserva] ← estado normal
 [✓ Copiado                 ] ← 2 s, mesma largura
 Número da reserva copiado.   ← sr-only na linha viva (sucesso)
 ⓘ Não foi possível copiar. Selecione o número e copie.   ← visível (falha)
```
- **Largura estável:** os dois rótulos ("Copiar número da reserva" e "Copiado") ficam na mesma célula
  de um `inline-grid` (`col-start-1 row-start-1` nos dois). O inativo fica `invisible aria-hidden`, e
  o botão mede sempre o rótulo mais longo. Abaixo de `sm` o botão já é `w-full`.
- **Clique/Enter/Espaço:** `copyText(id)`.
  - `true`: rótulo "Copiado" + `CheckIcon` por 2 s. A linha viva recebe o texto `sr-only` "Número da
    reserva copiado.". Antes de escrever, a linha é esvaziada, para que um segundo clique seja
    anunciado de novo. Clicar durante os 2 s copia de novo e reinicia o tempo.
  - `false`: o rótulo não muda. A linha viva mostra, visível, `InfoIcon size-4` + "Não foi possível
    copiar. Selecione o número e copie." (`text-sm text-fg-muted`; não é erro do usuário, por isso
    não usa `danger`). Além disso, o número fica selecionado (`getSelection().selectAllChildren(dd)`)
    sem tirar o foco do botão. No desktop, Ctrl/Cmd+C já funciona. O texto fica até o próximo clique.
- **Foco:** fica no botão o tempo todo. Nada acima dele se mexe. A linha viva fica **abaixo** do botão
  (`min-h-5` reservada), então o texto de falha, quando quebra em 2 linhas, empurra só o que está
  abaixo.
- **Sem JS:** o botão não aparece (a ilha renderiza o botão só depois de montar, e o espaço fica
  reservado com `min-h-11`). O número continua `select-all`.
- `translate="no"` no número, para o tradutor do navegador não mexer nele.

### Estados

| Estado | O que aparece |
|---|---|
| **Página carregando** (`loading.tsx`) | `ConfirmationSkeleton` no container `aria-busy="true"`, com `<p class="sr-only" aria-live="polite">Carregando sua reserva…</p>`. Geometria: círculo `size-12`; h1 `h-8 w-64` (`lg:h-9`); `h-6 w-full max-w-sm`; `h-5 w-56`. Cartão: `h-5 w-36`; número `h-7 w-full sm:w-96` + `h-7 w-40 sm:hidden` (2ª linha no celular); botão `h-11 w-full sm:w-64`; `min-h-5`; `border-t`; 2 × (`h-5 w-16` + `h-6 w-40`/`h-8 w-36`) em `sm:grid-cols-2`. Depois, cartão "Sua estadia" com o `StayDetailsSkeleton` e um cartão genérico (`h-7 w-32` + 3 × `h-5`). Linha `min-h-5` reservada acima do cartão, que depois de 5 s mostra `Está demorando mais que o normal…` (ilha com `useSlowLoading`) |
| **Reserva pronta, hotel/quarto carregando** (Suspense A) | Header, número, resumo, datas, hóspedes, pagamento e ações já estão na tela. Na área A, `StayDetailsSkeleton` com `aria-busy="true"` + `sr-only aria-live` `Carregando dados do hotel…`: linha `flex gap-4` com `block w-24 sm:w-40 aspect-[4/3]` + (`h-7 w-3/4`, `h-5 w-full`, `h-5 w-1/2`); `h-11 w-44`; `border-t`; `h-5 w-14`, `h-6 w-2/3`, `h-5 w-1/2`; `border-t`; `h-6 w-14`, `h-6 w-44` (badge), 3 × `h-5`. Horários (Suspense B): `Skeleton line h-5 w-28` em cada `dd` (`aria-hidden`; quem anuncia é a área A). O foco não muda quando o conteúdo chega |
| **Sucesso** | Layout acima. `RememberBooking` grava o id sem nada visível |
| **Hotel `missing`** | No lugar do bloco do hotel: quadro `w-24 aspect-[4/3] bg-surface-sunken` com `BedIcon` + h3 `Hotel #{id}` (`text-lg font-semibold`) + `Os dados deste hotel não estão mais disponíveis.` (`text-sm text-fg-muted`). Sem link "Ver página do hotel" e sem bloco de cancelamento. Horários: `Confirme com o hotel` (`text-sm text-fg-muted`) |
| **Quarto `missing`** (inclui quarto de outro hotel) | `dd` do quarto: `Quarto #{id}` (`font-semibold`) + `Os dados deste quarto não estão mais disponíveis.` (`text-sm text-fg-muted`) |
| **Hotel e/ou quarto `error`** | No topo da área A: `ErrorState inline headingLevel={3}` (`py-8`), título conforme o que falhou: `Não foi possível carregar os dados do hotel.` / `…do quarto.` / `…do hotel e do quarto.`, descrição `Sua reserva está confirmada. Verifique sua conexão e tente de novo.`, ação `RefreshButton` "Tentar de novo" → "Tentando…". O que deu `ok` ou `missing` aparece abaixo, normalmente. O que deu `error` não aparece (nem placeholder): o `ErrorState` já explica. Hotel com erro → horários `Indisponível no momento` |
| **Retry em andamento** | Botão `loading` "Tentando…" (`aria-busy`, `aria-disabled`, mesma largura, mantém o foco). O resto da página não muda |
| **Retry ok** | A área A troca o erro pelo conteúdo, e o foco vai para o h2 "Sua estadia" (`tabIndex=-1`, `preventScroll` + `revealBelowHeader`), porque o botão que tinha o foco sumiu |
| **Retry falhou** | O mesmo `ErrorState` volta a "Tentar de novo", e o foco fica no botão (o elemento não desmonta: mesma `key`) |
| **Formato do README** (`guests: []`, sem `priceBreakdown`, sem `payment`) | Sem a frase do e-mail (header = ícone, h1 e data). Sem a seção "Hóspedes" (a contagem já está em "Sua estadia": `3 noites · 2 adultos · 1 quarto`). "Pagamento" sem a linha do cartão; mantém `Pagamento simulado: nenhum valor foi cobrado.` e um `<dl>` só com `Total` / valor (`text-2xl font-bold`), sem a nota de impostos |
| **Breakdown inconsistente** | Igual ao anterior na parte de preço: só `Total` de `totalPrice` |
| **Reserva não encontrada** (404 ou id inválido) | `not-found.tsx`: `EmptyState headingLevel={1}`, ícone `SearchIcon`. Título `Reserva não encontrada`, texto do DS §6.4 e `NewSearchLink` primary `Fazer nova busca`. Foco no h1 (`FocusOnMount`) |
| **Reserva ilegível** (`unreadable`) | `EmptyState headingLevel={1}`, ícone `AlertCircleIcon`. `Não foi possível exibir esta reserva` + `Os dados desta reserva estão incompletos. Tentar de novo não resolve: faça uma nova busca.` + `Fazer nova busca`. Foco no h1 |
| **Erro da rota** (5xx, rede, timeout) | `error.tsx`: `ErrorState variant="page" headingLevel={1}`. Título `Não foi possível carregar sua reserva`, descrição `Sua reserva não foi afetada. Verifique sua conexão e tente de novo.`. Ações: "Tentar de novo" (`retry()` dentro de `startTransition`, `retrying` → "Tentando…") + link `ghost` "Fazer nova busca" (`buttonClassName`, só `@/shared/ui`, sem `NewSearchLink`, porque a lição da F4 manda não importar a feature no `error.tsx`). Foco no h1 ao montar |
| **Offline/lento** | Tudo é servidor. Lento = `loading.tsx` + "Está demorando…". Offline = erro da rota, cujo texto já fala de conexão. Sem estado extra |

Todos os EmptyState e ErrorState de página ficam em `max-w-3xl`, como o sucesso, para o conteúdo não
mudar de lugar entre estados.

### Interações

| Ação | Feedback imediato | Depois | Foco |
|---|---|---|---|
| Página abre (`router.replace` da F5, reload, link) | — | — | h1 `Reserva confirmada` (`focus({ preventScroll: true })` + `revealBelowHeader`) |
| "Copiar número da reserva" | rótulo "Copiado" ou texto de falha logo abaixo | volta ao rótulo em 2 s | fica no botão |
| Toque/clique no número | seleciona o número inteiro (`select-all`) | menu nativo de copiar | — |
| "Ver página do hotel" | navega para `/hotel/{hotelId}` (sem critérios: as datas da reserva podem já ter passado) | — | — |
| "Tentar de novo" (seção) | "Tentando…" | `router.refresh()` | ok: h2 "Sua estadia"; falha: botão |
| "Tentar de novo" (rota) | "Tentando…" | `retry()` | h1 da página que vier |
| "Fazer nova busca" | navega para `/` (limpa a seleção do `booking-draft`) | — | padrão da home |
| Ctrl/Cmd+P | versão de impressão (abaixo) | — | — |

- **Nada se move sob o clique:** o botão de copiar tem largura fixa entre estados, e a linha viva fica
  abaixo dele. O `RefreshButton` mantém a largura em loading. Os skeletons têm a geometria final. O
  horário tem `min-h-5`. A linha "Está demorando…" fica reservada desde o início. Nenhum conteúdo em
  streaming entra **acima** de um controle já visível: a área A fica abaixo do botão de copiar.
- **Foco abaixo do header:** todo foco programático usa `preventScroll` + `revealBelowHeader` (o
  `scroll-padding-top` global já considera o header sticky).
- **Toasts:** nenhum nesta página.
- **Título do documento:** como na spec (Metadata). O foco no h1 complementa o anúncio de troca de
  rota.

### Impressão

Sem botão de imprimir (fica fora do escopo, ver Escopo). Só deixa o Ctrl/Cmd+P legível, com variantes
`print:` do Tailwind:
- `print:hidden`: `SiteHeader`, `Toaster`, botão de copiar e linha viva, "Ver página do hotel",
  "Fazer nova busca", `RefreshButton` e a linha "Está demorando…".
- Cartões: `print:shadow-none print:break-inside-avoid` (a borda fica).
- Fundo branco: regra global `@media print { body { background-color: var(--color-surface); } }`
  (DS §2).
- Nada novo aparece só na impressão: sem URL expandida e sem QR (o link é a "senha" da reserva).

### Microcopy (final)

| Onde | Texto |
|---|---|
| `metadata.title` | `Reserva confirmada \| Infotera Hotéis` · `Reserva não encontrada \| Infotera Hotéis` · `Reserva indisponível \| Infotera Hotéis` |
| Cabeçalho | h1 `Reserva confirmada` · `Enviamos os detalhes para {e-mail}.` · `Reserva feita em 19/11/2026, 12:04 (horário de Brasília)` |
| Cartão do número | dt `Número da reserva` · botão `Copiar número da reserva` / `Copiado` · sr `Número da reserva copiado.` · falha `Não foi possível copiar. Selecione o número e copie.` · dt `Estadia` `12–15 dez · 3 noites` (`1 noite`; ano quando não é o atual, `formatDateRange`) · dt `Total` `R$ 3.726,00` |
| Sua estadia | h2 `Sua estadia` · h3 `{nome do hotel}` · `{endereço}` · link `Ver página do hotel` · dt `Quarto` · `{nome do quarto}` · `{camas}` (DS §6.8) · h3 `Cancelamento` · badge e regras do DS §6.8 · dt `Check-in` / `Check-out` · `sáb., 12 de dez.` (`formatDate long`) · `A partir de 15:00` / `Até 12:00` · `3 noites · 2 adultos, 1 criança · 1 quarto` (`formatGuests`) |
| Estadia: faltando | `Hotel #{id}` · `Os dados deste hotel não estão mais disponíveis.` · `Quarto #{id}` · `Os dados deste quarto não estão mais disponíveis.` · horário `Confirme com o hotel` |
| Estadia: erro | `Não foi possível carregar os dados do hotel.` · `Não foi possível carregar os dados do quarto.` · `Não foi possível carregar os dados do hotel e do quarto.` · `Sua reserva está confirmada. Verifique sua conexão e tente de novo.` · `Tentar de novo` / `Tentando…` · horário `Indisponível no momento` |
| Hóspedes | h2 `Hóspedes` · `{Nome Sobrenome} · titular` · `{Nome Sobrenome} · adulto` · `{Nome Sobrenome} · criança` (sem `guests`, a seção não é renderizada) |
| Pagamento | h2 `Pagamento` · `Cartão final 1111` · `Pagamento simulado: nenhum valor foi cobrado.` · `PriceBreakdown`: `R$ 1.200,00 × 3 noites × 1 quarto` · `Desconto (BEMVINDO10)` · `Taxa de serviço (10%)` · `ISS (5%)` · `Total` · `Impostos e taxas incluídos.` |
| Próximos passos | h2 `Próximos passos` · `Guarde o número da reserva. Ele também está no endereço desta página.` · `No check-in, apresente um documento com foto de cada hóspede.` · `Não compartilhe o link desta página: quem tiver o link vê os dados da reserva.` · `Cancelar ou alterar a reserva não está disponível nesta demonstração.` |
| Ação | `Fazer nova busca` |
| Carregando | sr `Carregando sua reserva…` · sr `Carregando dados do hotel…` · `Está demorando mais que o normal…` |
| Não encontrada | h1 `Reserva não encontrada` · `Confira o número da reserva no link. Reservas de teste são apagadas quando o sistema reinicia.` · `Fazer nova busca` |
| Ilegível | h1 `Não foi possível exibir esta reserva` · `Os dados desta reserva estão incompletos. Tentar de novo não resolve: faça uma nova busca.` · `Fazer nova busca` |
| Erro da rota | h1 `Não foi possível carregar sua reserva` · `Sua reserva não foi afetada. Verifique sua conexão e tente de novo.` · `Tentar de novo` / `Tentando…` · `Fazer nova busca` |

`aria-label` e nomes acessíveis: nenhum `aria-label` novo é necessário, porque todo controle tem
texto visível. Seções nomeadas pelo h2 (`aria-labelledby`). Foto `alt=""` (o nome está ao lado). Ícones
decorativos `aria-hidden`. O número não recebe `aria-label`: o leitor lê o texto real, e um rótulo
"bonito" divergiria do que é copiado.

### Acessibilidade (o que testar)

- Títulos: um h1 por estado. Sucesso: h1 → h2 (`Sua estadia`, `Hóspedes`, `Pagamento`, `Próximos
  passos`) → h3 (hotel, `Cancelamento`, título do `ErrorState`). O cartão do número não tem heading:
  é um `<dl>` logo abaixo do h1.
- Foco: o h1 recebe foco no mount em todos os estados de página. Ordem do Tab: `Copiar número da
  reserva` → `Ver página do hotel` (ou `Tentar de novo`) → `Fazer nova busca`. Anel global visível em
  todos.
- Alvos ≥ 44 px: botão de copiar (`h-11`), link "Ver página do hotel" (`min-h-11 inline-flex
  items-center`), "Tentar de novo", "Fazer nova busca".
- Regiões vivas: a linha do copiar (sempre montada, `aria-live="polite"`), o `sr-only` dos dois
  skeletons e o `role="alert"` do `ErrorState`. O streaming não anuncia o conteúdo que chega (o leitor
  lê quando chegar lá), e o `aria-busy` sai junto com o skeleton.
- Cor nunca sozinha: o sucesso tem ícone + h1, a política tem badge com texto, o desconto tem "−" e
  rótulo.
- 320 px e zoom 200%: sem rolagem horizontal com o UUID, e-mail de 60 caracteres, nome de hóspede de 60
  caracteres sem espaço, hotel com nome longo e `R$ 300.000,00` no total (linha-resumo empilha abaixo
  de `sm`).
- `prefers-reduced-motion`: só o `pulse` dos skeletons, desligado pela regra global.

### Ajustes aos critérios (UX)

- **Crit. 1:** acrescentar o cartão-resumo (`12–15 dez · 3 noites` + total), a política com as regras
  abertas e "Ver página do hotel". Os horários ficam no `<dl>` das datas e vêm do `CheckTimes`. Data da
  reserva: `Reserva feita em 19/11/2026, 12:04 (horário de Brasília)`.
- **Crit. 6:** os horários também mostram skeleton (Suspense B). O resto já está visível.
- **Crit. 12:** o quarto `missing` também troca o `dd` por `Quarto #{id}` + aviso. O hotel `missing`
  esconde o link "Ver página do hotel" e o bloco de cancelamento.
- **Crit. 13:** com hotel **e** quarto em erro, aparece **um** `ErrorState` (`…do hotel e do quarto.`)
  com um único botão. O título diz o que falhou. Depois de um retry bem-sucedido, o foco vai para o h2
  "Sua estadia".
- **Crit. 14:** a contagem de hóspedes aparece na linha de "Sua estadia". Sem `guests`, a seção
  "Hóspedes" não é renderizada (em vez de repetir a contagem).
- **Crit. 16:** **sem toast.** O sucesso é o rótulo "Copiado" (2 s, mesma largura) + o anúncio
  `Número da reserva copiado.` na linha viva abaixo do botão. A falha mostra, visível nessa linha,
  `Não foi possível copiar. Selecione o número e copie.` e deixa o número selecionado. O teste confere
  a linha viva, não o `Toaster`.
- **Crit. 17:** o rótulo é **`Fazer nova busca`** (DS §6.2), igual no não encontrado, no ilegível e no
  erro.
- **Crit. 20:** a ordem do Tab é a da seção Acessibilidade. O h1 tem `tabIndex=-1` e não entra no Tab.
- **Crit. 21:** casos extras: e-mail e nome longos, `R$ 300.000,00`.
- **Novo crit. 22 (UX):** o número quebra só depois de hífen (E2E em 320 px: a 1ª linha do `dd`
  termina com `-`; `innerText` sem espaço nem quebra, igual ao id) e o texto copiado é exatamente o
  UUID em minúsculas.
- **Novo crit. 23 (UX):** na impressão (`page.emulateMedia({ media: "print" })`), header, botão de
  copiar e "Fazer nova busca" ficam invisíveis, e número, datas e total ficam visíveis.
- **Arquivos:** + `components/CheckTimes.tsx` (+test). `CopyIcon` em `shared/ui/icons.tsx`.
  `print:hidden` em `SiteHeader` e `Toaster`. Regra `@media print` em `globals.css`.

## Mudanças no design system

Texto exato a inserir em `docs/design/design-system.md` (o orquestrador aplica). Pressupõe as mudanças
da F4 e da F5 já aplicadas. Nenhum item abaixo reescreve trecho que a F5 troca: onde a F5 mexe na
mesma seção, a F6 só acrescenta depois do texto dela.

**§1.2 Tipografia — acrescentar à lista "Regras:":**
```
- **Identificadores** (número da reserva, F6): `font-mono` (pilha padrão do Tailwind) `text-xl
  font-semibold`, `translate="no"`, `select-all`, `wrap-anywhere` e `<wbr>` depois de cada hífen (a
  quebra cai entre grupos, nunca no meio; o `<wbr>` não entra no texto copiado). Nunca em
  maiúsculas se o valor for sensível a caixa. `font-mono` só para identificadores; preços seguem com
  Inter + `tabular-nums`.
```

**§2 Tema do Tailwind — acrescentar dentro de `@layer base`, depois do bloco `prefers-reduced-motion`:**
```css
  @media print {
    body {
      background-color: var(--color-surface);
    }
  }
```

**§3 Ícones e imagens — acrescentar ao fim do item "Ícones" (depois da linha da F5):**
```
  Confirmação (F6): `copy` (dois retângulos sobrepostos, estilo Lucide `copy`).
```

**§4 (novo) — inserir depois da §4.6:**
```
### 4.7 Página de recibo (confirmação, F6)

- Uma coluna `max-w-3xl` (`flex flex-col gap-6 lg:gap-8`) em todas as larguras, sem sidebar: página de
  leitura com uma ação. Cada bloco é `<section aria-labelledby>` num `Card static` com h2.
- Topo: ícone de status em círculo `size-12` (`bg-success-soft text-success`, `CheckCircleIcon size-6`)
  → h1 (alvo de foco no mount) → frase de apoio → cartão-resumo (identificador + linha `Estadia ·
  Total`, `grid gap-4 sm:grid-cols-2`, empilha abaixo de `sm` para o valor nunca quebrar).
- Conteúdo em streaming entra **abaixo** de todo controle já visível (nada se move sob o clique).
- Estados de página (vazio, ilegível, erro) usam a mesma largura `max-w-3xl`.

### 4.8 Impressão

Sem CSS de impressão por página: variantes `print:` do Tailwind. `print:hidden` em header global,
`Toaster`, botões e links de navegação; cartões `print:shadow-none print:break-inside-avoid` (borda
fica); fundo branco pela regra do §2. Conteúdo que precisa sair impresso não fica em `<details>`
fechado. Nada aparece só na impressão.
```

**§5.2 (novo) — inserir após ErrorSummary (que a F5 insere após Alert):**
```
#### Valor copiável (F6)
Valor em destaque + `Button secondary md` "Copiar {objeto}" (`CopyIcon`), `w-full sm:w-auto`, logo
abaixo do valor.
- Sucesso: rótulo `Copiado` + `CheckIcon` por 2 s. Os dois rótulos ficam na mesma célula de um
  `inline-grid` (o inativo `invisible aria-hidden`), então a largura não muda. Anúncio `sr-only` numa
  linha `aria-live="polite"` sempre montada, **abaixo** do botão (`min-h-5`), esvaziada antes de cada
  escrita. **Sem toast**: o feedback fica no controle.
- Falha (`copyText` → `false`): a mesma linha mostra, visível, `InfoIcon size-4` + `text-sm
  text-fg-muted` com a saída manual, e o valor fica selecionado (`selectAllChildren`). O foco fica
  no botão.
- O valor é `select-all` (um toque seleciona tudo), e o botão só aparece com JS (espaço `min-h-11`
  reservado).
- Diferença para "Copiar link" (F4): lá o valor não está na tela e o botão não muda, então o toast é o
  feedback.
```

**§5.2 ErrorState — acrescentar ao fim:**
```
- Em Server Component, o retry entra pela prop `action` (ilha cliente, ex.: `RefreshButton` com
  `router.refresh()` em `startTransition` e `Button loading` "Tentando…"), sem `onRetry`. Quando duas
  partes da mesma seção falham juntas, mostre **um** `ErrorState` que nomeia o que faltou ("…do hotel
  e do quarto.") com um único retry. O que carregou aparece abaixo. Sucesso do retry: o foco vai para o
  h2 da seção (o botão sumiu).
```

**§5.3 PriceBreakdown (texto da F5) — acrescentar ao fim:**
```
Promovido para `shared/ui/molecules` na F6 (2º uso: confirmação, sem skeleton e sem cupom). Sem
detalhamento confiável (ausente ou inconsistente), mostre só `Total` + valor `text-2xl font-bold`, sem
a nota de impostos.
```

**§6.2 Botões e ações — acrescentar à lista (depois da linha da F5):**
```
Confirmação: `Copiar número da reserva` / `Copiado` · `Ver página do hotel` · `Fazer nova busca`.
```

**§6.4 Vazio — acrescentar linha à tabela:**
```
| Reserva ilegível (fora do contrato) | `Não foi possível exibir esta reserva` | `Os dados desta reserva estão incompletos. Tentar de novo não resolve: faça uma nova busca.` | `Fazer nova busca` |
```

**§6.5 Erro de rede / servidor — acrescentar linhas à tabela (depois das da F5):**
```
| Erro ao carregar a reserva (rota) | h1 `Não foi possível carregar sua reserva` · `Sua reserva não foi afetada. Verifique sua conexão e tente de novo.` | `Tentar de novo` + `Fazer nova busca` |
| Hotel/quarto da confirmação | `Não foi possível carregar os dados do hotel.` / `…do quarto.` / `…do hotel e do quarto.` · `Sua reserva está confirmada. Verifique sua conexão e tente de novo.` | `Tentar de novo` |
| Copiar número falhou | linha abaixo do botão (sem toast): `Não foi possível copiar. Selecione o número e copie.` | — |
```

**§6.8 Sucesso e outros — substituir o item "Confirmação:" (a F4 e a F5 não mexem nele) por:**
```
- Confirmação (F6): h1 `Reserva confirmada` · `Enviamos os detalhes para nome@exemplo.com.` (simulado;
  só com titular) · `Reserva feita em 19/11/2026, 12:04 (horário de Brasília)` · `Número da reserva`
  (UUID completo, §1.2 Identificadores) · `Copiar número da reserva` / `Copiado` / sr `Número da reserva
  copiado.` · seções `Sua estadia`, `Hóspedes`, `Pagamento`, `Próximos passos` · `Cartão final 1111` ·
  `Pagamento simulado: nenhum valor foi cobrado.` · hóspedes `Ana Souza · titular` / `· adulto` /
  `· criança` (sem idade, sem telefone) · faltando `Hotel #{id}` / `Os dados deste hotel não estão mais
  disponíveis.` · horário sem hotel `Confirme com o hotel` · próximos passos `Guarde o número da
  reserva. Ele também está no endereço desta página.` · `No check-in, apresente um documento com foto
  de cada hóspede.` · `Não compartilhe o link desta página: quem tiver o link vê os dados da
  reserva.` · `Cancelar ou alterar a reserva não está disponível nesta demonstração.`
```

**§8 Inventário — sobre a versão da F5:**
- Linha **molecules**: acrescentar `PriceBreakdown` e, no "Introduzido em", `PriceBreakdown nasce na
  F5 e sobe na F6`.
- Linha **feature**: remover `PriceBreakdown` e acrescentar `BookingNumber/CopyBookingNumber (valor
  copiável), StayDetails (hotel/quarto em streaming)`, com "F3–F6".
