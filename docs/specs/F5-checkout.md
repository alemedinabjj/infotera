# F5 — checkout

## Objetivo

Entregar `/checkout`: resumo do hotel e do quarto escolhidos na F4 (relidos da API, nunca do
storage), formulário em 3 passos (dados dos hóspedes → pagamento simulado → revisão) com validação
real (CPF/Passaporte, Luhn, validade, telefone por país) e criação da reserva por **Server Action**
que recalcula o preço no servidor, grava com `POST /bookings` usando um **UUID** como id e leva a
`/confirmation/[id]`. A página roda sob uma **CSP estrita com nonce** antes de coletar qualquer dado
de pagamento, e nenhum dado de cartão ou documento sai do navegador nem é persistido.

## Escopo

**Básicos**
- Resumo hotel + quarto (`GET /hotels/:id`, `GET /rooms/:id`) com datas, noites, hóspedes e total.
- Redirect para `/` quando não há seleção, **só depois** de o `booking-draft` hidratar.
- Formulário com nome, email e telefone validados; `POST /bookings` → `/confirmation/[id]`.

**Avançados (todos os da seção 4 do enunciado, ✅ no TEST_MAP)**
- Multi-step: Dados dos hóspedes → Pagamento (simulado) → Revisão e confirmação.
- Validação complexa: email; telefone com máscara e regra **por país** (BR, US, PT, ES);
  documento **CPF (dígito verificador) ou Passaporte (ICAO 9303)**; cartão com **Luhn** + bandeira;
  validade não expirada.
- Múltiplos hóspedes: um bloco por hóspede (adultos e crianças da busca), validação individual,
  idade obrigatória para crianças.
- Múltiplos quartos na mesma reserva: N unidades do mesmo tipo de quarto, quantidade ajustável no
  checkout com **optimistic update** do preço e confirmação de disponibilidade na API (Decisão 4).
- Cálculo de preço: diária × noites × quartos, desconto, taxa de serviço e ISS, total com breakdown,
  em função pura com **centavos inteiros**.
- Termos: checkbox obrigatório + modal (`Dialog`) com o texto completo e ação "Li e aceito".
- Código de desconto: input com validação síncrona de formato + validação assíncrona simulada,
  feedback de aplicado/inválido/expirado/inelegível.
- Loading por seção (resumo, preço, cupom, envio), skeleton nos cálculos.
- Erros por campo, erro global do formulário (resumo de erros + falha de envio), retry do envio
  idempotente.
- Performance: persistência do formulário com debounce (só campos permitidos), validação
  assíncrona otimizada (formato antes, cache por código, cancelamento), optimistic update no preço.
- Segurança: CSP completa com nonce via `proxy.ts` (Next 16) em `/checkout`, navegação com carga de
  documento para o checkout, `Cache-Control: no-store`, limpeza dos campos de pagamento no `pagehide`.

**Fora (e por quê)**
- **Quartos de tipos diferentes na mesma reserva.** O contrato do `Booking` (`mock-api/types.ts`)
  tem um único `roomId` + `rooms`; tipos diferentes exigiriam carrinho na F4, mudar o schema para
  `rooms[]`, e reescrever F6. Fica no README como evolução (Decisão 4).
- **Distribuição de hóspedes por quarto** (quem dorme em qual): o hotel resolve no check-in; o
  contrato não tem o campo. A lista de hóspedes é única.
- **Pagamento real / tokenização / 3DS:** é simulado; nenhum número de cartão sai do navegador.
- **Endpoint de cupom:** a mock-api não tem; cupons de demonstração locais (Decisão 9).
- **`require-trusted-types-for` e `report-uri`/`report-to` na CSP:** o runtime do Next não é
  compatível com Trusted Types sem polyfill/política própria, e não há backend para receber
  relatórios. Documentar no README.
- **Sugestão de correção de email ("gmial.com")** e **persistência do cupom**: fora da regra de
  persistência da feature (só nome, email, telefone e step) e baixo valor.
- **Barra de ação fixa no mobile**: decisão do `ui-designer` (seção `## UI/UX`, depois desta).

## Decisões

1. **Server Action para criar a reserva (`createBookingAction`), chamada por `useMutation`.**
   O cliente envia só **referências e escolhas** (`hotelId`, `roomId`, critérios, cupom, hóspedes,
   `cardLast4`, `expectedTotalCents`, `attemptId`). O servidor valida com Zod (entrada não confiável),
   relê hotel e quarto na mock-api, **recalcula o preço com a mesma função pura** (`calculatePrice`),
   reavalia o cupom e a disponibilidade, e só então faz `POST /bookings`. O `totalPrice` gravado nunca
   vem do cliente. Retorno é uma union discriminada (`created` · `price-changed` · `unavailable` ·
   `coupon-invalid` · `invalid` · `failed`); a Server Action **não lança** para o cliente (o Next
   esconde mensagens em produção). `useMutation` dá `isPending`/erro de transporte com o mesmo padrão
   do resto do app (mutations sem retry, de `shared`). Cobre também o avançado "Server Actions para
   mutations" da F7.
   Descartados: (a) `apiPost` direto do navegador: o cliente decidiria o `totalPrice` (a API não
   valida nada; cupom e preço seriam forjáveis com DevTools); (b) `useActionState` + `<form action>`:
   progressive enhancement não se aplica (form multi-step client-side) e o formulário carrega campos
   de cartão que **não** podem ser postados; (c) Route Handler: mesmo efeito com mais código (rota,
   parse manual, CSRF por conta própria; a Server Action já checa `Origin`).

2. **Id da reserva = UUID v4 gerado no cliente por tentativa (`attemptId`), retry idempotente.**
   `crypto.randomUUID()` no primeiro "Confirmar"; o mesmo id é reusado nos retries enquanto o pedido
   (tudo menos o id) não mudar (`nextAttemptId(prev, fingerprint)`, pura). A action envia `id` no
   corpo do `POST` (json-server aceita id string) e, se o `POST` falhar com 5xx/timeout/rede, faz
   `GET /bookings/:id`: existindo (resposta perdida, ou duplicata no retry: o lodash-id do json-server
   lança "Insert failed, duplicate id" → 500), devolve `created`. Assim o retry nunca duplica.
   O UUID também evita **enumeração**: `GET /bookings/:id` é público no mock e contém nome, email e
   telefone; ids 1, 2, 3… seriam varríveis. Servidor valida `z.uuid()` (v4).
   Descartados: (a) id numérico do json-server (enumerável e retry duplica); (b) UUID gerado na
   action (cada retry vira um id novo: sem idempotência); (c) `GET` antes de todo `POST` (+300 ms
   sempre; a reconciliação só roda quando o `POST` falha).

3. **CSP estrita com nonce só em `/checkout`, por `src/proxy.ts`; carga de documento ao entrar.**
   Nonce exige renderização dinâmica e é incompatível com PPR/ISR (doc do Next 16,
   `content-security-policy.md`), que a F7 quer nas outras rotas. Então: `proxy.ts` com
   `matcher` em `/checkout` (excluindo prefetch) gera o nonce, monta a política com a função pura
   `buildCsp({ nonce, apiOrigin, mode })` (`shared/lib/csp.ts`) e seta `Content-Security-Policy`
   na requisição (o Next extrai o nonce e aplica nos scripts dele) e na resposta, mais
   `Cache-Control: private, no-store`. A página chama `await connection()`.
   As demais rotas mantêm a política base de hoje (`next.config.ts`), agora montada pelo mesmo
   `csp.ts` (`BASELINE_DIRECTIVES`) e **excluída de `/checkout`** para sair um único header.
   Política de produção:
   `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…';
   style-src-elem 'self' 'nonce-…'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:
   https://images.unsplash.com https://i.pravatar.cc https://tile.openstreetmap.org;
   font-src 'self'; connect-src 'self' <origem de NEXT_PUBLIC_API_URL>; object-src 'none';
   base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
   (`upgrade-insecure-requests` só quando a API é `https`, senão quebraria a mock-api local em
   `http://localhost:3333`). Dev acrescenta `'unsafe-eval'` em `script-src`, `'unsafe-inline'` em
   `style-src`/`style-src-elem` (estilos injetados pelo HMR) e `ws:` em `connect-src`.
   `style-src-attr 'unsafe-inline'`: o `next/image` renderiza `style="color:transparent"` e o blur
   como atributo; nonce não vale para atributos e o risco de injeção de *atributo* de estilo é baixo
   frente a quebrar todas as imagens.
   **Problema da navegação client-side:** a CSP é do *documento*. Se a pessoa chegar a `/checkout`
   por `router.push` a partir de `/hotel/1`, o documento continua com a política frouxa. Duas
   defesas: (a) a F4 passa a entrar no checkout com `window.location.assign("/checkout")`
   (`assignLocation` em `shared/lib/navigation.ts`; o `sessionStorage` já está gravado, o Zustand
   persiste síncrono); (b) `useStrictDocument` no checkout: se a URL de carga do documento
   (`performance.getEntriesByType("navigation")[0].name`) não for `/checkout`, faz
   `location.reload()` antes de renderizar o formulário (não entra em loop: depois do reload a URL de
   carga é `/checkout`). Navegar **do** checkout para outras rotas mantém a política estrita, o que só
   restringe (todas as origens usadas pelo app estão listadas).
   Descartados: (a) nonce em todas as rotas (mata PPR/ISR da F7 e o cache de CDN do app inteiro);
   (b) SRI experimental sem nonce (não cobre os scripts inline do RSC; experimental);
   (c) `'unsafe-inline'` em `script-src` (não é CSP "completa"; anula a proteção contra XSS que é o
   motivo de exigir antes do pagamento).

4. **Múltiplos quartos = N unidades do mesmo tipo (`criteria.rooms`), ajustável no checkout.**
   O store da F4 guarda `{ hotelId, roomId, criteria }` e `criteria.rooms` já existe; o `Booking` tem
   `roomId` + `rooms`. O checkout mostra um `QuantityStepper` "Quartos" com limites de
   `roomCountBounds(criteria, room)` (pura): mínimo = `max(1, ceil(hóspedes / room.maxGuests))`,
   máximo = `min(SEARCH_LIMITS.maxRooms, room.available, adults)` (1 adulto por quarto), cada limite
   com o motivo (`hint`). Mudar a quantidade é **optimistic**: o store (`setRoomCount`, nova ação em
   `shared`) e o preço mudam na hora; em paralelo `queryClient.fetchQuery(roomQueryOptions, staleTime 0)`
   confirma `available >= n`. Se não confirmar (esgotou, erro de rede), volta ao último valor
   **confirmado** com mensagem. Cliques rápidos: reducer puro `roomCountReducer` com `seq` (último
   vence; rollback vai para o último confirmado, não para o clique anterior).
   Mudança em `shared`: `booking-draft` ganha `setRoomCount(rooms): boolean` (valida os critérios
   resultantes com `searchCriteriaSchema`; inválido → não muda e devolve `false`).
   Descartados: (a) tipos de quarto diferentes (ver Fora); (b) quantidade só de leitura (o avançado
   "múltiplos quartos" viraria só exibir um número da F2); (c) esperar a API antes de mudar o preço
   (o enunciado pede optimistic; 300 ms de atraso visível a cada clique).

5. **Preço: `calculatePrice` pura, tudo em centavos inteiros, taxas em basis points.**
   `subtotal = diária × noites × quartos`; `desconto` (percentual em bps ou valor fixo limitado ao
   subtotal); `base = subtotal − desconto`; `taxa de serviço = 10%` (`SERVICE_FEE_BPS = 1000`) e
   `ISS = 5%` (`ISS_BPS = 500`) sobre a base; `total = base + taxa + ISS`. Percentual com
   arredondamento *half-up* em aritmética inteira (`Math.floor((valor × bps + 5000) / 10000)`; o
   maior produto possível, 3.730 × 30 × 4 × 100 × 1500 ≈ 6,7e10, cabe com folga em
   `Number.MAX_SAFE_INTEGER`). Saída: `{ nights, rooms, nightlyCents, subtotalCents, discountCents,
   serviceFeeCents, taxCents, totalCents, lines[] }`; `lines` é uma union por `kind`
   (`stay` · `discount` · `service-fee` · `tax`) e os rótulos saem de `priceLineLabel` (switch
   exaustivo). Diária vem **sempre** de `room.pricePerNight` relido da API (cliente e servidor).
   Descartados: (a) float em reais com `toFixed` (erro de representação acumula entre linhas);
   (b) taxas sobre o subtotal antes do desconto (cobrar imposto sobre valor não pago);
   (c) taxa fixa por diária (mais um número inventado sem ganho didático).

6. **Um `useForm` para os 3 passos, validação por passo com `trigger(STEP_FIELDS[step])`.**
   Valores sobrevivem à troca de passo sem estado paralelo; o schema completo
   (`makeCheckoutSchema(today)`, com `personal`, `payment`, `review`) é a única fonte de verdade e o
   resolver lê `todayISO()` a cada validação (validade do cartão, como o `searchFormResolver` da F2).
   `mode: "onTouched"` + `reValidateMode: "onChange"` (padrão do design system). Hóspedes
   adicionais com `useFieldArray` (`companions`), montados por `buildCompanions(criteria, previous)`
   (pura: adultos − 1 + crianças, preserva o que foi digitado por posição dentro de cada tipo).
   O passo atual fica em estado do componente (não na URL): a URL do checkout não carrega dados
   manipuláveis, e "Voltar" do navegador sai do checkout com o rascunho salvo.
   Descartados: (a) um `useForm` por passo (juntar no final, três resolvers, revalidar tudo no envio);
   (b) passo na URL (`?step=payment` permitiria abrir a revisão sem dados válidos e exigiria guarda
   extra; `popstate` brigaria com a persistência).

7. **Validação de documentos e telefone em funções puras próprias (sem dependências novas).**
   - CPF: 11 dígitos, os dois DV (módulo 11) e **rejeita dígitos repetidos** (111.111.111-11 passa
     no cálculo e é inválido).
   - Passaporte: ICAO 9303 define o número como até 9 caracteres `A–Z0–9`; regra: 6–9
     alfanuméricos após `toUpperCase` e remoção de espaços, com pelo menos 1 dígito, sem caractere
     repetido em todas as posições. Não existe DV público do número fora da MRZ: documentado.
   - Cartão: 13–19 dígitos, Luhn, `detectCardBrand` (elo e hipercard **antes** de visa/master por
     colisão de prefixo, ex. `4011`, `6362`), CVV de 3 dígitos (4 para amex). Qualquer cartão que
     passe no Luhn é aceito (simulado).
   - Validade `MM/AA`: mês 01–12, não expirada (vale até o fim do mês) e no máximo 20 anos à frente;
     `today` por parâmetro.
   - Telefone: tabela `PHONE_COUNTRIES` (BR +55, US +1, PT +351, ES +34) com máscara, tamanho e
     regra: BR = DDD da lista da Anatel, 11 dígitos com 9 na 3ª posição (celular) ou 10 com 2–5
     (fixo); US = NANP (área e prefixo começam com 2–9, área não é N11); PT = 9 dígitos começando com
     9 ou 2; ES = 9 dígitos começando com 6–9. Payload em E.164 (`+5511987654321`).
   Descartados: `libphonenumber-js` (≈80 kB de metadados para 4 países; regra completa por país
   seria mais do que o teste pede) e `card-validator`/`cpf-cnpj-validator` (o teste avalia
   justamente essas funções).

8. **Documento (CPF/Passaporte) fica no passo de pagamento, como dado do titular do cartão, e não é
   enviado nem persistido.** No checkout brasileiro o CPF acompanha o cartão (gateway/antifraude);
   aqui o "gateway" é simulado, então o documento é validado e descartado. O `Booking` (schema de
   `shared`) não tem CPF porque `GET /bookings/:id` é público. O payload leva só
   `payment: { method: "credit_card", cardLast4 }`.
   Descartado: CPF no passo de dados pessoais (ia parecer que é gravado com a reserva).

9. **Cupons de demonstração locais, com validação assíncrona simulada e cache por código.**
   `model/coupons.ts` tem `COUPONS` (documentados no README):
   `BEMVINDO10` (10%), `FERIAS15` (15%, mínimo 3 noites), `DESCONTO50` (R$ 50, subtotal mínimo
   R$ 300), `VERAO2024` (expirado em 2024-03-31). Fluxo otimizado:
   (1) formato validado **síncrono** com Zod (`^[A-Z0-9]{4,12}$` após `normalizeCouponCode`:
   trim + maiúsculas) — formato inválido não "chama o servidor"; (2) `api/coupons.ts` simula o
   endpoint (`lookupCoupon(code, signal)`, 600 ms, respeita `AbortSignal`) via
   `couponQueryOptions(code)` com `staleTime: Infinity` e `retry: false` — reaplicar o mesmo código é
   instantâneo; (3) disparo só ao clicar "Aplicar"/Enter, nunca por tecla; trocar o código cancela a
   consulta anterior; (4) **elegibilidade** (`evaluateCoupon(coupon, { today, nights,
   subtotalCents })`) é pura e síncrona, reavaliada quando quartos mudam (cupom que deixa de valer sai
   do cálculo com aviso). A action reavalia com `findCoupon` (sem latência).
   Chave nova em `shared/api/query-keys.ts`: `coupons.detail(code)`.
   Descartados: (a) validar a cada tecla com debounce (gera "inválido" enquanto digita e consulta
   prefixos inúteis); (b) cupom no `db.json` (não podemos alterar a mock-api); (c) aplicar o desconto
   otimisticamente antes de validar (mostraria preço que pode não existir).

10. **Gate da página em duas funções puras: seleção e elegibilidade do quarto.**
    `selectionGate({ hydrated, selection, submitted, strictDocument })` →
    `hydrating` | `reloading` | `redirect-empty` | `leaving` | `ready`. Antes da hidratação: skeleton
    com `aria-busy` (nunca redireciona com o store vazio do SSR). `redirect-empty` →
    `router.replace("/")` + toast info. `leaving` (reserva criada) impede que `clearSelection()`
    dispare o redirect para `/` enquanto vamos para a confirmação.
    `roomEligibility({ selection, hotel, room, today })` → `ready` | `stale-dates` (check-in antes
    de hoje) | `sold-out` (`available === 0`) | `insufficient` (`available < rooms`) | `too-small`
    (`guestsPerRoom > maxGuests`) | `mismatch` (`room.hotelId !== hotelId`). `mismatch` e hotel/quarto
    404 limpam a seleção e caem em `redirect-empty` (storage adulterado ou dado sumiu). Os demais
    mostram um estado bloqueante com o motivo e link "Ver quartos" para `/hotel/{id}?<critérios>`
    (sem critérios quando `stale-dates`), em vez de teletransportar: a pessoa entende o que houve.
    Descartado: redirect automático para o hotel com toast (o motivo some em 5 s e a pessoa perde o
    contexto; o design system já tem a mensagem "Este quarto esgotou…" com ação).

11. **Persistência: `sessionStorage` `infotera:checkout-draft` (v1), debounce de 500 ms, whitelist
    por construção.** `toPersistedDraft(values, step)` monta **explicitamente**
    `{ v: 1, step, contact: { firstName, lastName, email, phoneCountry, phone },
    companions: [{ kind, firstName, lastName }] }` (idade da criança também não vai: não é nome,
    email nem telefone). Leitura com Zod (`createStorage("session")`); qualquer falha = rascunho
    vazio. `restoreStep(step, personalValid)`: `review` volta para `payment` (pagamento nunca é
    restaurado); dados pessoais inválidos voltam para `personal`. Grava no `watch` com debounce e
    dá *flush* no `pagehide`. Apaga após `created`. Termos e cupom não são persistidos (aceite tem que
    ser explícito no momento da reserva).
    `sessionStorage` e não `localStorage`: PII de hóspedes some ao fechar a aba (computador
    compartilhado), e o `booking-draft` já é de sessão.
    Descartados: persistir o objeto inteiro com `omit` dos campos sensíveis (um campo novo de cartão
    vazaria por padrão); Zustand persist para o form (estado do form é do RHF; duplicar a fonte).

12. **Dados de pagamento só em memória e limpos ao sair.** Além de não persistir: no `pagehide`,
    `resetField` em número, validade, CVV e documento (o snapshot do bfcache não guarda o cartão);
    `Cache-Control: no-store` no documento do checkout; `autocomplete` corretos (`cc-name`,
    `cc-number`, `cc-exp`, `cc-csc`; documento `off`); nenhum `console.*` com valores do form; erros
    da action logados no servidor só como `{ event, kind, status }` (sem PII).

13. **Botões nunca `disabled`, sem duplo envio, foco previsível (lições F2–F4).**
    "Continuar" e "Confirmar reserva" sempre focáveis; inválido → foco no 1º campo inválido +
    `ErrorSummary` (promovido da F2 para `shared/ui`, genérico por `id`) que se revela abaixo do header
    (`revealBelowHeader`). Envio: `Button loading` ("Confirmando reserva…", `aria-disabled` +
    `aria-busy`, guarda no clique) + guarda no `onSubmit` (`isPending`) + idempotência (Decisão 2).
    Validação de blur adiada enquanto um botão está pressionado (`useDeferredBlur`, promovido da F2):
    o erro que aparece no blur não empurra o "Continuar" para fora do ponteiro. Ao trocar de passo,
    foco no `h2` do passo (`tabIndex={-1}`, `preventScroll`) + `revealBelowHeader`. Indicador de
    passos com `aria-current="step"`; passos concluídos são botões para voltar.

14. **Dados remotos por seção, sem bloquear o formulário.** O formulário depende só dos critérios do
    store, então o passo 1 é usável enquanto hotel e quarto carregam. Resumo (hotel, quarto) e preço
    têm skeleton e erro com retry próprios (`useQuery` de `hotelQueryOptions` e `roomQueryOptions`
    de `shared`; quarto com `staleTime: 0` porque disponibilidade importa aqui). Linha de desconto
    vira skeleton enquanto o cupom valida; quantidade de quartos mostra "Confirmando
    disponibilidade…" (`aria-live`) sem skeleton (é optimistic). "Confirmar reserva" com preço ainda
    carregando fica em `loading` ("Calculando total…").
    Trade-off aceito: a carga de documento (Decisão 3) perde o cache do TanStack da F4, então o
    resumo sempre mostra skeleton (~300 ms). Prefetch no servidor não é possível: a seleção vive no
    `sessionStorage`, de propósito fora da URL.

15. **Contrato do `Booking` em `shared` ganha campos opcionais.** `bookingGuestSchema`:
    `email` e `phone` passam a opcionais (só o titular, `guests[0]`, tem contato) e entram
    `kind?: "adult" | "child"` e `age?: 0–17`. `bookingInputSchema` ganha
    `priceBreakdown?: { nightlyCents, nights, rooms, subtotalCents, discountCents, serviceFeeCents,
    taxCents, totalCents, couponCode? }` para a F6 mostrar o mesmo breakdown sem recalcular nem
    conhecer cupons. Opcionais para continuar aceitando reservas no formato do README da mock-api.
    `totalPrice` segue em reais (contrato), igual a `totalCents / 100`.

## Contrato de dados

| Uso | Endpoint | Schema (`shared/api/schemas.ts`) | Query key / opções |
|---|---|---|---|
| Resumo do hotel | `GET /hotels/:id` (404 → `ApiError` 404) | `hotelSchema` | `hotelQueryOptions(id)` (shared) |
| Quarto + preço + disponibilidade | `GET /rooms/:id` (404) | `roomSchema` | `{ ...roomQueryOptions(id), staleTime: 0 }` |
| Confirmar quantidade (optimistic) | `GET /rooms/:id` | `roomSchema` | `queryClient.fetchQuery({ ...roomQueryOptions(id), staleTime: 0 })` |
| Cupom (simulado, sem rede) | — | `couponSchema` (feature) | `couponQueryOptions(code)`: `queryKeys.coupons.detail(code)` (**novo**), `staleTime: Infinity`, `retry: false` |
| Criar reserva (servidor) | `POST /bookings` com `id` UUID | corpo `bookingSchema`; resposta `bookingSchema` | Server Action, `useMutation` sem retry |
| Reconciliar retry (servidor) | `GET /bookings/:id` | `bookingSchema` | só quando o `POST` falha |

**Entrada da Server Action** (`model/booking-request.ts`, validada com Zod no servidor):
```ts
bookingRequestSchema = z.object({
  attemptId: z.uuid({ version: "v4" }),
  hotelId: z.number().int().positive(),
  roomId: z.number().int().positive(),
  criteria: searchCriteriaSchema,              // rooms já ajustado no checkout
  couponCode: couponCodeSchema.nullable(),
  contact: { firstName, lastName, email, phone /* E.164 */ },
  companions: z.array({ kind: "adult" | "child", firstName, lastName, age: 0–17 | null }),
  cardLast4: z.string().regex(/^\d{4}$/),
  expectedTotalCents: z.number().int().nonnegative(),
}) // + superRefine: companions batem com adults − 1 e children; criança tem age
```
Nada de número de cartão, validade, CVV, nome impresso nem documento.

**Retorno** (`CreateBookingResult`, union por `status`):
`{ status: "created"; bookingId: string }` ·
`{ status: "price-changed"; quote: PriceQuote }` ·
`{ status: "unavailable"; available: number }` ·
`{ status: "coupon-invalid"; reason: CouponRejection }` ·
`{ status: "invalid"; fields: CheckoutFieldPath[] }` ·
`{ status: "failed"; kind: ApiErrorKind | "unknown" }`.
Ordem no servidor: parse → `GET` hotel e quarto em paralelo (404 → `unavailable` com 0) →
`verifyBookingRequest` (pura: datas com tolerância de 1 dia para fuso, `roomEligibility`, cupom,
`calculatePrice`, compara `expectedTotalCents`) → `toBookingInput` (pura) → `POST`.

**Corpo do `POST /bookings`** (exemplo, 2 adultos + 1 criança, hotel 1, quarto 1, 3 noites, 1 quarto,
`BEMVINDO10`):
```json
{
  "id": "8b0e…-4…", "hotelId": 1, "roomId": 1,
  "checkIn": "2026-12-20", "checkOut": "2026-12-23",
  "rooms": 1, "adults": 2, "children": 1,
  "guests": [
    { "firstName": "Ana", "lastName": "Souza", "email": "ana@exemplo.com", "phone": "+5511987654321", "kind": "adult" },
    { "firstName": "Bruno", "lastName": "Souza", "kind": "adult" },
    { "firstName": "Clara", "lastName": "Souza", "kind": "child", "age": 7 }
  ],
  "totalPrice": 3726,
  "payment": { "method": "credit_card", "cardLast4": "1111" },
  "priceBreakdown": { "nightlyCents": 120000, "nights": 3, "rooms": 1, "subtotalCents": 360000,
    "discountCents": 36000, "serviceFeeCents": 32400, "taxCents": 16200, "totalCents": 372600,
    "couponCode": "BEMVINDO10" },
  "createdAt": "2026-11-19T15:04:05.000Z"
}
```

**Storage**
| Chave | Onde | Conteúdo | Dono |
|---|---|---|---|
| `infotera:booking-draft` | session | `{ selection: { hotelId, roomId, criteria } }` (existente; `rooms` pode mudar no checkout) | shared |
| `infotera:checkout-draft` | session | `{ v: 1, step, contact{nome, sobrenome, email, país, telefone}, companions[{kind, nome, sobrenome}] }` | checkout |

**Headers de `/checkout`** (proxy): `Content-Security-Policy` (Decisão 3),
`Cache-Control: private, no-store`. Os demais (`X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options`, `Permissions-Policy`) continuam vindo do `next.config.ts` para todas as rotas.

## Critérios de aceite

Dados de referência: hotel 1 (Copacabana Palace), quarto 1 (R$ 1.200, `maxGuests` 3, `available` 8),
quarto 2 (R$ 800, `maxGuests` 2); hotel 7 quarto 10 (`available` 1); hotel 13 quarto 28
(R$ 200, `available` 4, `maxGuests` 3); hotel 19 quarto 45 (`available` 0). Datas: hoje + 30 → hoje + 33 (3 noites). CPF válido de teste `529.982.247-25`;
cartão `4111 1111 1111 1111`.

**Entrada, gate e estados da página**
1. Dado o quarto 1 selecionado na F4, quando clico "Selecionar quarto", então o navegador faz carga
   de documento em `/checkout` (`performance.getEntriesByType("navigation")[0].name` termina em
   `/checkout`) e a resposta tem exatamente um header `Content-Security-Policy` com `'nonce-…'`,
   `'strict-dynamic'`, sem `'unsafe-inline'` em `script-src`.
2. Dado que cheguei a `/checkout` por navegação client-side (documento carregado em outra rota),
   quando a página monta, então ela recarrega uma vez antes de mostrar o formulário e não entra em
   loop.
3. Dado nenhum quarto selecionado, quando abro `/checkout`, então vejo um skeleton com `aria-busy`
   até a hidratação, depois sou levado a `/` com `router.replace` (Voltar não retorna ao checkout) e
   aparece o toast "Nenhum quarto selecionado. Escolha um hotel e um quarto para reservar."; o
   formulário nunca pisca na tela.
4. Dado o `sessionStorage` com o quarto 45 do hotel 19, quando abro o checkout, então vejo o estado
   "esgotado" com o texto do design system e o link "Ver quartos" para `/hotel/19?<critérios>`;
   não há formulário.
5. Dado check-in antes de hoje, quarto com `available < rooms`, ou hóspedes por quarto acima de
   `maxGuests`, então vejo o estado bloqueante correspondente (`stale-dates` com link para
   `/hotel/{id}` sem critérios; demais com critérios).
6. Dado `roomId` que não pertence ao `hotelId`, ou hotel/quarto 404, então a seleção é limpa e
   acontece o redirect do critério 3.
7. Dado o quarto 1 selecionado, então o resumo mostra nome e foto do hotel, endereço, quarto,
   datas por extenso, noites, hóspedes, horários de check-in/out e política de cancelamento.

**Loading por seção, erro e preço**
8. Dado `GET /rooms/1` lento, então o resumo do quarto e o breakdown mostram skeleton com
   `aria-busy="true"` e um texto `sr-only` "Calculando o total…" em `aria-live`, enquanto os campos do
   passo 1 já aceitam digitação.
9. Dado `GET /rooms/1` ou `GET /hotels/1` com erro após as tentativas automáticas, então só a seção
   afetada mostra erro com "Tentar de novo"; ao tentar de novo com sucesso, a seção aparece sem
   recarregar a página e o formulário mantém o que foi digitado.
10. Dado 1 quarto × 3 noites a R$ 1.200, então o breakdown mostra
    `R$ 1.200,00 × 3 noites × 1 quarto = R$ 3.600,00`, `Taxa de serviço (10%) R$ 360,00`,
    `ISS (5%) R$ 180,00` e `Total R$ 4.140,00`.
11. Dado o stepper "Quartos" em 1 com 2 adultos, quando aumento para 2, então o total muda
    **imediatamente** para R$ 8.280,00 e aparece "Confirmando disponibilidade…"; quando a API
    confirma, o aviso some e o valor fica.
12. Dado que a confirmação devolve `available: 1` (ou falha), então a quantidade volta para 1, o
    total volta para R$ 4.140,00 e o `hint` do stepper explica o motivo
    ("Só 1 quarto disponível." / "Não foi possível confirmar a disponibilidade. Tente de novo.").
13. Dado 4 adultos no quarto 1 (`maxGuests` 3) com 2 quartos, então "−" está no mínimo com o motivo
    "Este quarto acomoda até 3 hóspedes: 4 hóspedes precisam de pelo menos 2 quartos."; dado 2
    adultos, "+" para em 2 com "Cada quarto precisa de pelo menos 1 adulto."; o botão no limite fica
    `aria-disabled`, mantém o foco e nada se move.

**Cupom**
14. Dado `bem vindo10`, quando clico "Aplicar", então o formato é rejeitado na hora
    ("Use de 4 a 12 letras ou números, sem espaços.") sem estado de carregamento.
15. Dado `bemvindo10`, quando aplico, então o botão mostra "Aplicando…", a linha de desconto vira
    skeleton e, depois de ~600 ms, aparece `Desconto (BEMVINDO10) −R$ 360,00`, total R$ 3.726,00 e um
    status anunciado "Cupom BEMVINDO10 aplicado."; há "Remover cupom".
16. Dado que removi e reapliquei `BEMVINDO10`, então o desconto aparece sem novo carregamento (cache).
17. `NAOEXISTE` → "Cupom não encontrado."; `VERAO2024` → "Este cupom expirou."; `FERIAS15` com
    2 noites → "Válido para estadias a partir de 3 noites."; `DESCONTO50` com subtotal abaixo de
    R$ 300 → "Válido para reservas a partir de R$ 300,00." — o total não muda em nenhum caso.
18. Dado `DESCONTO50` aplicado no quarto 28 do hotel 13 (R$ 200, `available` 4) com 2 quartos ×
    1 noite e 2 adultos (subtotal R$ 400), quando reduzo para 1 quarto (subtotal R$ 200), então o desconto sai do total na hora e aparece aviso com o
    motivo; voltando para 2 quartos, o desconto volta sem nova consulta.

**Passos e validação**
19. O indicador mostra 3 passos (`<ol>`), o atual com `aria-current="step"`; passos concluídos são
    botões que voltam; passos futuros não são clicáveis.
20. Dado o passo 1 vazio, quando clico "Continuar", então não avanço, o foco vai para o primeiro
    campo inválido, o `ErrorSummary` (`role="alert"`) lista todos os erros do passo com rótulo
    ("Hóspede 2 — Nome: Informe o nome.") e fica visível abaixo do header; cada item leva o foco ao
    campo.
21. Dado 2 adultos e 1 criança, então o passo 1 tem o titular (nome, sobrenome, email, país,
    telefone) e 2 blocos ("Hóspede 2 · adulto", "Hóspede 3 · criança" com idade obrigatória em
    `Select` 0–17); cada bloco valida sozinho.
22. Email inválido, nome com dígitos, telefone BR com DDD 20, celular BR sem o 9, número US com área
    começando em 1 → mensagem no campo; trocar o país reaplica a máscara aos dígitos já digitados e
    revalida.
23. Telefone mostra máscara do país enquanto digito (`(11) 98765-4321`) e o cursor não pula ao
    apagar no meio.
24. Passo 2: cartão com máscara e bandeira detectada; `4111 1111 1111 1112` → "Número de cartão
    inválido."; validade `01/20` → "Cartão vencido."; `13/30` → "Mês inválido."; CVV com 3 dígitos
    (4 para amex); CPF `111.111.111-11` e `529.982.247-24` → "CPF inválido."; trocar para
    Passaporte aceita `FZ123456` e rejeita `ABC`.
25. Ao avançar de passo, o foco vai para o `h2` do novo passo e ele fica abaixo do header; nada se
    move sob o ponteiro entre o `mousedown` e o `mouseup` do "Continuar" (blur adiado).
26. Passo 3 mostra os dados em seções com "Editar" (volta ao passo e foca o `h2`); cartão aparece só
    como "Visa •••• 1111" e o documento mascarado ("CPF ***.982.247-**").
27. Termos: "Confirmar reserva" sem aceitar → erro no checkbox e resumo; "Ler termos e condições"
    abre o `Dialog` (foco preso, Esc fecha, foco volta ao gatilho); "Li e aceito" marca o checkbox e
    fecha.

**Envio**
28. Dado tudo válido, quando clico "Confirmar reserva", então o botão fica "Confirmando reserva…"
    (`aria-busy`, `aria-disabled`, foco mantido), cliques extras e Enter não geram outra chamada
    (exatamente 1 requisição da Server Action) e, no sucesso, vou para `/confirmation/<uuid v4>` com
    `replace`.
29. A reserva gravada (`GET /bookings/<uuid>`) tem `totalPrice` calculado no servidor, `guests` com
    contato só no titular, `payment.cardLast4 = "1111"`, `priceBreakdown`, e **não contém** número do
    cartão, CVV, validade nem documento; o corpo da requisição da Server Action também não.
30. Dado que a Server Action falha (rede/5xx), então aparece o `Alert` "Não foi possível confirmar
    sua reserva" + toast, os dados continuam preenchidos, o foco vai para o alerta e "Tentar de novo"
    reenvia com o **mesmo** `attemptId`; depois do sucesso existe uma única reserva com esse id.
31. `price-changed` → `Alert warning` com o total antigo e o novo, breakdown atualizado, e é preciso
    confirmar de novo; `unavailable` → mensagem "Este quarto esgotou enquanto você reservava…" com
    "Ver quartos"; `coupon-invalid` → cupom removido com o motivo no campo do cupom; `invalid` → volta
    ao passo do primeiro campo citado com erro no campo.
32. Depois de `created`, `infotera:checkout-draft` e `infotera:booking-draft` não existem mais e
    Voltar a partir da confirmação não reabre um checkout preenchido.

**Persistência e privacidade**
33. Dado que digitei o passo 1 e o cartão, quando espero 500 ms, então `infotera:checkout-draft`
    contém nomes, email, país, telefone e step, e **não** contém cartão, validade, CVV, documento,
    idade, cupom nem aceite dos termos.
34. Dado que recarrego no passo 2 ou 3, então volto no passo 2 com o passo 1 preenchido e o
    pagamento vazio; rascunho corrompido ou de versão antiga é ignorado sem erro.
35. Ao sair da página (`pagehide`), os campos de cartão e documento são limpos; nenhuma chamada a
    `console.*` contém valores do formulário (teste espiona o console no fluxo completo).

**Segurança e acessibilidade**
36. No fluxo completo nenhum evento `securitypolicyviolation` é disparado (imagens do Unsplash,
    chamadas à API, fontes, Server Action) — em dev e no build de produção.
37. axe sem violações em cada passo, com o `ErrorSummary`, com o `Dialog` de termos aberto e nos
    estados bloqueantes; todo input tem label; erro ligado por `aria-describedby`.
38. O fluxo inteiro pode ser concluído só com teclado; em 320 px não há rolagem horizontal em
    nenhum passo.

## Arquivos

**App e infraestrutura**
| Caminho | Responsabilidade |
|---|---|
| `src/proxy.ts` (novo) | nonce por request, `buildCsp`, headers na request e na resposta, `Cache-Control: no-store`; `matcher` `/checkout` sem prefetch |
| `src/app/checkout/page.tsx` (novo) | `await connection()`, `metadata` ("Finalizar reserva", `robots: { index: false }`), renderiza `<CheckoutPage />` |
| `src/app/checkout/error.tsx` (novo) | boundary da rota com "Tentar de novo" (`reset`) |
| `src/app/checkout/page.test.tsx` (novo) | página compõe a feature; metadata |
| `next.config.ts` (alterado) | política base vinda de `BASELINE_DIRECTIVES`; CSP base fora de `/checkout` |

**Shared**
| Caminho | Responsabilidade |
|---|---|
| `src/shared/lib/csp.ts` (+test) (novo) | `BASELINE_DIRECTIVES`, `IMAGE_HOSTS`, `buildCsp({ nonce, apiOrigin, mode })`, `serializeCsp` |
| `src/shared/lib/navigation.ts` (+test) (novo) | `assignLocation(path)` (carga de documento; wrapper testável) |
| `src/shared/stores/booking-draft.ts` (+test) (alterado) | ação `setRoomCount(rooms): boolean` |
| `src/shared/api/schemas.ts` (+test) (alterado) | `bookingGuestSchema` com contato opcional, `kind`, `age`; `priceBreakdownSchema`; `priceBreakdown?` no input |
| `src/shared/api/query-keys.ts` (alterado) | `coupons.detail(code)` |
| `src/shared/ui/molecules/ErrorSummary.tsx` (+test) (movido da F2) | resumo genérico `{ id, label, message }[]` + `onSelect(id)`; `describeErrorCount` |
| `src/shared/hooks/useDeferredBlur.ts` (+test) (movido da F2) | sem mudança de comportamento |
| `src/shared/ui/index.ts` (alterado) | exporta `ErrorSummary` |
| `src/features/search-form/**` (alterado) | imports de `ErrorSummary`/`useDeferredBlur` vindos de shared |
| `src/features/hotel-details/hooks/useSelectRoom.ts` (alterado) | `assignLocation("/checkout")` no lugar de `router.push`; reseta o loading em `pageshow` persistido |

**Feature `src/features/checkout/`** (todo arquivo de `model/` e `api/` tem `.test.ts` ao lado)
| Caminho | Responsabilidade |
|---|---|
| `model/price.ts` | `SERVICE_FEE_BPS`, `ISS_BPS`, `applyBps`, `calculatePrice`, tipos `PriceQuote`/`PriceLine` |
| `model/price-labels.ts` | `priceLineLabel(line)` (switch exaustivo), `describeStay` |
| `model/cpf.ts` | `isValidCpf`, `formatCpf`, `maskCpf` (revisão) |
| `model/passport.ts` | `normalizePassport`, `isValidPassport` |
| `model/card.ts` | `isValidLuhn`, `detectCardBrand`, `cvvLength`, `formatCardNumber`, `cardLast4` |
| `model/expiry.ts` | `formatExpiry`, `parseExpiry`, `isExpiryValid(value, today)` |
| `model/phone.ts` | `PHONE_COUNTRIES`, `BR_AREA_CODES`, `formatPhone`, `isValidPhone`, `toE164` |
| `model/masked-input.ts` | `applyMask(raw, caret, format)` → `{ value, caret }` (cursor estável) |
| `model/names.ts` | `personNameSchema` (letras, espaços, `'`, `-`; 2–60) |
| `model/companions.ts` | `buildCompanions(criteria, previous)`, `companionLabel(index, kind)` |
| `model/checkout.schema.ts` | `personalSchema`, `makePaymentSchema(today)`, `reviewSchema`, `makeCheckoutSchema(today)`, `CheckoutValues`, `defaultCheckoutValues` |
| `model/checkout.resolver.ts` | resolver que lê `todayISO()` a cada validação |
| `model/steps.ts` | `CHECKOUT_STEPS`, `STEP_FIELDS`, `nextStep`, `previousStep`, `restoreStep`, `stepTitle` |
| `model/error-summary.ts` | `summarizeCheckoutErrors(errors, step, companions)` → itens em ordem do DOM |
| `model/checkout-draft.ts` | `persistedDraftSchema`, `toPersistedDraft`, `fromPersistedDraft`, `CHECKOUT_DRAFT_KEY` |
| `model/coupons.ts` | `COUPONS`, `couponCodeSchema`, `normalizeCouponCode`, `findCoupon`, `evaluateCoupon`, `couponMessage` |
| `model/room-count.ts` | `roomCountBounds`, `roomCountReducer` (optimistic, `seq`) |
| `model/checkout-gate.ts` | `selectionGate`, `roomEligibility`, `hotelBackHref` |
| `model/booking-request.ts` | `bookingRequestSchema`, `toBookingRequest(values, selection, quote, attemptId)`, `requestFingerprint`, `nextAttemptId` |
| `model/verify-booking.ts` | `verifyBookingRequest(request, hotel, room, today)` → `ok + quote` ou rejeição |
| `model/to-booking-input.ts` | `toBookingInput(request, quote, now)` → `BookingInput & { id }` |
| `model/create-booking-result.ts` | tipo `CreateBookingResult`, `submitFeedback(result)` (switch exaustivo → mensagem/ação) |
| `model/terms.ts` | seções do texto dos termos (dados, sem JSX) |
| `api/coupons.ts` | `lookupCoupon(code, signal)` (latência simulada, abortável), `couponQueryOptions` |
| `api/create-booking.action.ts` | `"use server"`: `createBookingAction(input: unknown)` |
| `api/create-booking.server.ts` | orquestra fetch hotel/quarto, verificação, `POST` e reconciliação (a action só delega; testável) |
| `hooks/useStrictDocument.ts` | `useSyncExternalStore` da URL de carga do documento; dispara o reload |
| `hooks/useCheckoutGate.ts` | hidratação, `selectionGate`, redirect + toast, limpeza em 404/mismatch |
| `hooks/useCheckoutQueries.ts` | hotel + quarto (`staleTime: 0`) para o resumo e o preço |
| `hooks/useRoomCount.ts` | reducer + `fetchQuery` de confirmação + `setRoomCount` |
| `hooks/useCoupon.ts` | código aplicado, `useQuery(couponQueryOptions)`, avaliação com o quote |
| `hooks/usePriceQuote.ts` | quarto + noites + quartos + cupom → `PriceQuote` ou estado (loading/erro) |
| `hooks/useCheckoutForm.ts` | `useForm`, `useFieldArray`, passos, `goNext`/`goTo`, foco no `h2`, resumo |
| `hooks/useCheckoutDraft.ts` | leitura inicial, `watch` + debounce 500 ms, flush no `pagehide`, `clear` |
| `hooks/usePaymentWipe.ts` | `resetField` dos campos de pagamento no `pagehide` |
| `hooks/useSubmitBooking.ts` | `useMutation(createBookingAction)`, `attemptId`, despacho do resultado |
| `components/CheckoutPage.tsx` | `"use client"`; switch do gate (skeleton / redirecionando / bloqueado / pronto) |
| `components/CheckoutSkeleton.tsx` · `BlockedCheckout.tsx` | skeleton da página; estados `sold-out`/`insufficient`/`too-small`/`stale-dates` |
| `components/CheckoutLayout.tsx` | grid formulário + resumo (`lg:grid-cols-[1fr_22rem]`) |
| `components/StepIndicator.tsx` | `<ol>`, `aria-current="step"`, voltar a passos concluídos |
| `components/CheckoutForm.tsx` | `<form>`, `ErrorSummary`, passo atual, `SubmitError` |
| `components/PersonalStep.tsx` · `ContactFields.tsx` · `CompanionFields.tsx` · `PhoneField.tsx` | passo 1 |
| `components/PaymentStep.tsx` · `CardFields.tsx` · `DocumentField.tsx` | passo 2 |
| `components/ReviewStep.tsx` · `ReviewSection.tsx` · `TermsField.tsx` · `TermsDialog.tsx` | passo 3 |
| `components/StepActions.tsx` | "Voltar" / "Continuar" / "Confirmar reserva" |
| `components/SubmitError.tsx` | `Alert` global (falha, preço mudou, esgotou) com ação |
| `components/BookingSummary.tsx` · `BookingSummarySkeleton.tsx` | hotel + quarto + estadia, com erro/retry por seção |
| `components/RoomCountField.tsx` | `QuantityStepper` + status optimistic |
| `components/PriceBreakdown.tsx` · `PriceBreakdownSkeleton.tsx` | linhas, total, skeleton e `aria-live` |
| `components/CouponForm.tsx` | form próprio (fora do `<form>` principal), RHF + Zod + query |
| `components/*.test.tsx` | testes de componente (Plano de testes) |
| `index.ts` | `export { CheckoutPage }` |
| `CLAUDE.md` (alterado) | estrutura real, decisões 1–15 resumidas |

**E2E**
| Caminho | Responsabilidade |
|---|---|
| `e2e/helpers/checkout.ts` (novo) | `seedSelection(page, selection)` via `addInitScript`, `fillPersonal`, `fillPayment`, `collectCspViolations`, `actionRequests(page)` |
| `e2e/checkout.spec.ts` | fluxo feliz da F4 à confirmação, payload, limpeza |
| `e2e/checkout.validation.spec.ts` | erros por campo, resumo, foco, máscaras, país |
| `e2e/checkout.price.spec.ts` | breakdown, optimistic, rollback, cupons |
| `e2e/checkout.states.spec.ts` | sem seleção, bloqueados, seção lenta/falhando, envio falhando + retry, duplo clique |
| `e2e/checkout.security.spec.ts` | CSP, carga de documento, violações, storage, payload sem cartão, `pagehide` |
| `e2e/checkout.a11y.spec.ts` | axe por passo/dialog/estado, teclado puro, 320 px |

## Tarefas

Escopo `checkout` nos commits da feature; mudanças em `shared`, `search-form`, `hotel-details` e
infraestrutura usam o escopo do dono (como nas features anteriores). Cada tarefa termina com
`npm run typecheck && npm run lint && npm run test` verdes.

1. `refactor(shared): promote error summary and deferred blur from search-form` — `ErrorSummary` genérico por `id` + `describeErrorCount`; F2 passa a mapear seus itens. Prova: suítes da F2 verdes só com troca de import; teste do `ErrorSummary` em shared (lista, `role="alert"`, `onSelect` com o id).
2. `feat(shared): extend booking schema with guest kind and price breakdown` — Prova: unit (titular com contato, acompanhante sem contato, `age` fora de 0–17 falha, `priceBreakdown` opcional, exemplo do README da mock-api continua válido, id UUID e numérico).
3. `feat(shared): add room count action to booking draft` — Prova: unit (`setRoomCount` válido grava e persiste; inválido — adultos < quartos, > 5 por quarto, > 4 — devolve `false` e não muda; sem seleção devolve `false`).
4. `feat(shared): add content security policy builder` — Prova: unit (`production` exato da Decisão 3; `development` com `unsafe-eval`, `ws:` e estilos inline; `upgrade-insecure-requests` só com API https; origem da API sem path; nonce só em `script-src`/`style-src*`).
5. `feat(checkout): add nonce csp proxy for checkout route` — `src/proxy.ts`, `next.config.ts` com base fora de `/checkout`. Prova: unit do `proxy` (header na request e na resposta, nonce diferente por chamada, `no-store`, `matcher`) + `npm run build` ok.
6. `feat(shared): add full page navigation helper` + `fix(hotel-details): enter checkout with a document load` — Prova: unit do helper (chama `location.assign`) e teste do `useSelectRoom` (store gravado **antes** do `assign`; `pageshow` persistido zera o loading).
7. `feat(checkout): add price calculation in integer cents` — `price.ts`, `price-labels.ts`. Prova: unit (1 e 30 noites, 1–4 quartos, R$ 180 e R$ 3.730, percentual com meio centavo arredondando para cima, fixo maior que o subtotal limita a zero, total = soma das linhas, rótulos singular/plural).
8. `feat(checkout): add cpf and passport validators` — Prova: unit (CPFs válidos `529.982.247-25`/`111.444.777-35`, DV errado, 11 repetidos para todo dígito 0–9, tamanho errado, máscara; passaportes válidos/ inválidos da Decisão 7).
9. `feat(checkout): add card and expiry validators` — Prova: unit (Luhn de visa/master/amex/elo de teste, número alterado em 1 dígito; bandeiras com prefixos que colidem `4011`/`6362`/`5067`; CVV amex 4; validade: mês atual válido, mês passado, `13/xx`, `00/xx`, +21 anos, virada de ano).
10. `feat(checkout): add phone rules per country with masks` — `phone.ts`, `masked-input.ts`. Prova: unit em tabela por país (válidos, DDD inexistente, celular sem 9, fixo com 6, US N11, E.164) e de cursor (inserir/apagar no meio, colar com formatação).
11. `feat(checkout): add checkout schemas and step rules` — `names.ts`, `companions.ts`, `checkout.schema.ts`, `checkout.resolver.ts`, `steps.ts`, `error-summary.ts`. Prova: unit (schema de cada passo válido/inválido; criança sem idade; `buildCompanions` preserva por tipo ao mudar contagem; `restoreStep`; resumo em ordem do DOM com rótulo do hóspede).
12. `feat(checkout): add coupon rules and simulated lookup` — `coupons.ts`, `api/coupons.ts`. Prova: unit (normalização, formato, cada cupom em cada regra de elegibilidade, expirado por `today`, `lookupCoupon` resolve em 600 ms com fake timers e rejeita no abort; `couponQueryOptions` com a chave de shared).
13. `feat(checkout): add checkout gate and room count rules` — `checkout-gate.ts`, `room-count.ts`. Prova: unit em tabela (cada estado do gate e da elegibilidade com precedência; bounds com motivos; reducer: confirmação fora de ordem, rollback para o último confirmado).
14. `feat(checkout): add form draft persistence rules` — `checkout-draft.ts`. Prova: unit (a saída de `toPersistedDraft` com valores de pagamento preenchidos não contém nenhuma dessas strings; versão antiga/corrompida → vazio; round-trip).
15. `feat(checkout): add booking request and server verification` — `booking-request.ts`, `verify-booking.ts`, `to-booking-input.ts`, `create-booking-result.ts`. Prova: unit (`toBookingRequest` só leva `cardLast4`; `nextAttemptId` mantém com mesma fingerprint e troca com outra; verificação: preço mudou, esgotou, cupom inelegível, check-in ontem com tolerância, `superRefine` de acompanhantes; `submitFeedback` exaustivo).
16. `feat(checkout): add create booking server action` — `create-booking.server.ts` + `.action.ts`. Prova: unit com `fetch` stubado (sucesso com POST do corpo exato; 500 no POST + GET 200 → `created`; 500 + GET 404 → `failed`; hotel 404 → `unavailable`; entrada inválida → `invalid`; nenhum `console` com PII — `console.error` espionado recebe só `{ event, kind, status }`).
17. `feat(checkout): add page gate, strict document guard and skeleton` — `useStrictDocument`, `useCheckoutGate`, `CheckoutPage`, `CheckoutSkeleton`, `BlockedCheckout`, `app/checkout/page.tsx`, `error.tsx`. Prova: componente (critérios 2–6 com store e `performance` stubados; sem render do form antes da hidratação) + `page.test.tsx`.
18. `feat(checkout): add booking summary and price breakdown with section states` — `useCheckoutQueries`, `usePriceQuote`, `BookingSummary`, `PriceBreakdown`, skeletons, `CheckoutLayout`. Prova: componente (critérios 7–10 com `fetch` pendente/500/sucesso).
19. `feat(checkout): add optimistic room count` — `useRoomCount`, `RoomCountField`. Prova: componente (critérios 11–13 com `fetch` controlado; total muda antes da resposta; rollback; cliques rápidos).
20. `feat(checkout): add coupon form with async validation` — `useCoupon`, `CouponForm`. Prova: componente (critérios 14–18; formato inválido não chama `lookupCoupon` — espionado; reaplicar não chama de novo; trocar código aborta).
21. `feat(checkout): add multi-step form with personal step` — `useCheckoutForm`, `CheckoutForm`, `StepIndicator`, `StepActions`, `PersonalStep`, `ContactFields`, `CompanionFields`, `PhoneField`. Prova: componente (critérios 19–23, 25: não avança com erro, foco no 1º inválido, resumo, foco no `h2`, blur adiado com `pointerdown` no botão).
22. `feat(checkout): add payment step` — `PaymentStep`, `CardFields`, `DocumentField`. Prova: componente (critério 24; atributos `autocomplete`/`inputMode`).
23. `feat(checkout): add review step with terms dialog` — `ReviewStep`, `ReviewSection`, `TermsField`, `TermsDialog`. Prova: componente (critérios 26–27).
24. `feat(checkout): persist personal data with debounce and wipe payment on exit` — `useCheckoutDraft`, `usePaymentWipe`. Prova: componente com fake timers (critérios 33–35: nada gravado antes de 500 ms, gravado depois, sem dados de pagamento; reload restaura no passo 2; `pagehide` limpa cartão e documento).
25. `feat(checkout): submit booking with idempotent retry` — `useSubmitBooking`, `SubmitError`. Prova: componente com a action mockada (`vi.mock`) (critérios 28, 30–32: 1 chamada com cliques repetidos e Enter; falha → alerta + toast + mesmo `attemptId` no retry; cada `status` → feedback; sucesso → `replace` + storage limpo sem redirect para `/`).
26. `test(checkout): add e2e for the booking flow` — `e2e/helpers/checkout.ts`, `checkout.spec.ts`. Prova: verde em desktop e mobile.
27. `test(checkout): add e2e for validation, price and coupons` — `checkout.validation.spec.ts`, `checkout.price.spec.ts`. Prova: verde.
28. `test(checkout): add e2e for page states and submit failures` — `checkout.states.spec.ts`. Prova: verde.
29. `test(checkout): add e2e for csp, privacy and accessibility` — `checkout.security.spec.ts`, `checkout.a11y.spec.ts`. Prova: verde em dev e com `PLAYWRIGHT_BASE_URL` contra `npm run build && npm start`.
30. `docs(checkout): update feature, shared and app claude.md` — Prova: revisão (Decisões 1–15 refletidas; `shared/CLAUDE.md` com `setRoomCount`, `csp.ts`, `navigation.ts`, `ErrorSummary`/`useDeferredBlur` promovidos; nota no `CLAUDE.md` raiz sobre rodar a suíte de CSP contra o build).

## Plano de testes

**Unit (`model/`, `api/`, `shared/lib`, schemas)** — 100% das funções puras das tarefas 2–4 e 7–16.
"Hoje" e "agora" sempre por parâmetro (`today`, `now`). Tabelas (`it.each`) para validadores,
gate, elegibilidade e cupons. Teste de privacidade em `checkout-draft` e `booking-request`:
serializar a saída e afirmar que nenhuma das strings de pagamento de entrada aparece
(`"4111111111111111"`, `"123"`, `"12/30"`, `"52998224725"`). O schema de `Booking` continua
validando o seed inteiro (bookings vazio) e o exemplo `curl` do README da mock-api.
Server Action: `create-booking.server.ts` testado com `vi.stubGlobal("fetch")` respondendo por
método + URL; asserção do corpo exato do `POST` (com `toBookingInput`) e da reconciliação.

**Componente (Vitest + Testing Library + `renderWithProviders`)**
- Store semeado com `useBookingDraft.setState` + `persist.rehydrate` controlado para testar o
  "antes/depois da hidratação"; `next/navigation` pelo helper `shared/testing/next-navigation.ts`.
- `fetch` com `vi.stubGlobal` por URL (`/hotels/1`, `/rooms/1`); promessas controladas para loading e
  para a confirmação optimistic; `makeTestQueryClient` (sem retry).
- Server Action via `vi.mock("../api/create-booking.action")` devolvendo cada `status`, falha de rede
  (rejeição) e promessa pendente (duplo clique).
- Debounce da persistência, latência do cupom e `RELEASE_FALLBACK_MS` com
  `vi.useFakeTimers({ shouldAdvanceTime: true })` + `userEvent.setup({ advanceTimers })`.
- `performance.getEntriesByType` e `location.reload` stubados para o `useStrictDocument`.
- `console.*` espionado em todos os testes de componente da feature: nenhuma chamada.

**E2E (Playwright, mock-api real em `:3333` pelo `webServer`; datas hoje + 30 → + 33)**
- `checkout.spec.ts`: `/hotel/1?<critérios 2 adultos + 1 criança, 1 quarto>` → "Selecionar quarto"
  na Suíte → `/checkout` por carga de documento → passo 1 (titular + 2 acompanhantes, idade) →
  passo 2 (`4111…`, validade +2 anos, CVV, CPF `529.982.247-25`) → passo 3 (cupom `BEMVINDO10`,
  termos pelo dialog "Li e aceito") → "Confirmar reserva" → `/confirmation/<uuid>`; então
  `request.get(`${API}/bookings/<uuid>`)` confere o corpo do critério 29 e o storage do critério 32.
- `checkout.validation.spec.ts`: passo 1 vazio (resumo, foco, topo do campo abaixo do header via
  `boundingBox`), telefone por país (BR DDD 20, troca para US), cursor ao apagar no meio, cartão
  Luhn, vencido, CPF repetido, passaporte; clique "humano" (`humanClick` da F2) no "Continuar" logo
  após digitar email inválido avança a validação sem perder o clique.
- `checkout.price.spec.ts`: breakdown do critério 10; stepper 1→2 com total imediato; rollback com
  `page.route("**/rooms/1*")` respondendo `{ ...room, available: 1 }` na confirmação; cupons dos
  critérios 14–18 (sem request de rede para cupom: `page.on("request")` não vê nada além da API).
- `checkout.states.spec.ts`: sem seleção (redirect após hidratação, toast, Voltar não volta);
  bloqueados via `seedSelection` (hotel 19/quarto 45, check-in ontem, 3 quartos no quarto 10);
  **`_delay`**: `/rooms/1` reescrito para o `slowApi` → skeleton `aria-busy` com o passo 1 digitável;
  **`_fail`**: `/hotels/1` reescrito para o `failingApi` → erro só no resumo, `unroute` + "Tentar de
  novo"; **falha do envio**: `page.route` no `POST /checkout` com header `next-action` → `abort` na 1ª
  vez → alerta + toast; `unroute` → "Tentar de novo" → confirmação; `GET /bookings?id=<uuid>` tem 1
  item; **duplo envio**: rota da action com atraso de 2 s, 3 cliques + Enter → 1 requisição.
  Falhas da mock-api **dentro** da action não são interceptáveis pelo Playwright (fetch no servidor):
  cobertas pelo unit da tarefa 16.
- `checkout.security.spec.ts`: header CSP (um único, com nonce diferente a cada reload, sem
  `unsafe-inline` em `script-src` no build de produção), `Cache-Control: no-store`; navegação da F4 é
  carga de documento; navegação client-side para `/checkout` (abrir `/hotel/1`, semear a seleção e
  disparar `window.next.router.push("/checkout")` no `page.evaluate`) recarrega uma única vez
  (contar eventos `load` do frame principal); `collectCspViolations` (listener
  `securitypolicyviolation` por `addInitScript`) vazio no fluxo completo; corpo da requisição da Server
  Action sem número do cartão nem CPF; `sessionStorage` sem dados de pagamento após 600 ms;
  `pagehide` (navegar para `/` e voltar) com campos de cartão vazios.
- `checkout.a11y.spec.ts`: `analyzeAccessibility` (axe) em cada passo, com `ErrorSummary`, com o
  `Dialog` aberto e em `sold-out`; fluxo completo só com teclado (`Tab`/`Space`/`Enter`); 320 px sem
  scroll horizontal (`scrollWidth <= clientWidth`) nos 3 passos.
- Projeto `mobile-chromium` roda `checkout.spec.ts` e `checkout.a11y.spec.ts`.

## Riscos

| Risco | Mitigação |
|---|---|
| CSP quebra a página (script do Next sem nonce, estilo do HMR, imagem de host novo) | `buildCsp` puro e testado; `collectCspViolations` no E2E em dev **e** contra o build; hosts de imagem num único `IMAGE_HOSTS` usado também pelo `next.config` |
| Header de CSP duplicado (config + proxy) ou o proxy sobrescrito | Base excluída de `/checkout` no `next.config`; política do proxy é superconjunto da base (se coexistirem, ambas valem e a estrita domina); E2E conta os headers com `headersArray()` |
| Chegar ao checkout por navegação client-side mantém a CSP frouxa | `assignLocation` na F4 + `useStrictDocument` (reload único, sem loop); E2E dos dois caminhos |
| Carga de documento perde o cache da F4 (skeleton sempre) | Skeleton por seção com o formulário já usável (Decisão 14); documentado como trade-off |
| `upgrade-insecure-requests` quebra a API local em http | Só com API `https` (teste unitário) |
| Server Action: falhas da mock-api no servidor não testáveis por `page.route` | Unit com `fetch` stubado cobre todos os ramos; E2E cobre falha de transporte da action |
| Retry duplica reserva ou devolve reserva com dados antigos | `attemptId` estável por fingerprint + reconciliação por `GET`; editar após falha ambígua gera id novo (documentado: no pior caso uma reserva órfã no mock) |
| `crypto.randomUUID` indisponível (contexto não seguro) | App só roda em `localhost`/HTTPS; se faltar, a action gera o id (perde idempotência) e isso é registrado no README |
| `clearSelection()` após sucesso dispara o redirect "sem seleção" | Estado `leaving` no `selectionGate`; teste de componente do sucesso sem `replace("/")` |
| Fuso: check-in "hoje" do usuário é "ontem" no servidor (UTC) | Tolerância de 1 dia na verificação do servidor; o cliente bloqueia com o dia local |
| Máscara faz o cursor pular | `applyMask` devolve o cursor pela contagem de dígitos antes dele; unit + E2E apagando no meio |
| Lista de hóspedes grande (até 26) estoura limites do Biome | `CompanionFields` renderiza um bloco por item com subcomponente; `summarizeCheckoutErrors` em `model/` |
| Funções/arquivos acima do limite (form, action) | Divisão planejada: um hook por responsabilidade, action delega para `create-booking.server.ts`; `npm run lint` em toda tarefa |
| Persistência vazar campo sensível novo | Whitelist explícita em `toPersistedDraft` + teste de strings proibidas + E2E lendo o storage |
| bfcache restaura cartão digitado | `no-store` + `usePaymentWipe` no `pagehide`; E2E navega e volta |
| Cupom/preço forjados no cliente | Servidor recalcula tudo e compara `expectedTotalCents` (`price-changed`) |
| Rollback do optimistic fora de ordem com cliques rápidos | `roomCountReducer` com `seq` (último vence, rollback para o último confirmado); unit |
| Toast após `router.replace("/")` some com a navegação | `Toaster` vive no layout raiz (persiste em navegação client-side); E2E confere o texto em `/` |
| Mudanças em `shared` quebram F2–F4 | Tarefas 1–3 e 6 isoladas, com suítes das features existentes verdes |

## UI/UX

Referências: `docs/design/design-system.md` §4.3 (página com sidebar), §4.5 (barra fixa), §5.1
Button/Input/Select/Checkbox/Radio/Skeleton/PriceTag, §5.2 Field/Stepper/Alert/ErrorState/Disclosure,
§5.3 Dialog/Toast, §6 (microcopy). Pressupõe aplicadas as mudanças da F4 (em especial a §4.5 "barra
fixa só no checkout"). As mudanças pedidas por esta feature estão em `## Mudanças no design system`,
no fim da spec.

### Decisões de UX

1. **Um único resumo ("Sua reserva"), antes do formulário no DOM, em todas as larguras.** No celular é
   um cartão acima do formulário: identidade, datas, hóspedes e cancelamento sempre à vista, e o resto
   (endereço, horários, quartos, cupom, detalhamento do preço) atrás de "Ver detalhes da reserva". A
   partir de `lg` o mesmo elemento vai para a coluna direita, `sticky`, sempre aberto (sem toggle).
   O posicionamento usa `grid-column`/`grid-row`, sem `order-*`, então a ordem de foco é a mesma em
   todas as larguras: o que estou comprando → meus dados. Descartado: dois resumos (um `lg:hidden`,
   outro `hidden lg:block`), porque daria estado de cupom duplicado, ids duplicados e testes ambíguos.
2. **Barra de ação fixa abaixo de `lg`, e ela é a própria ação primária do passo.** Mostra o total e o
   botão do passo. No `lg+` a barra some: o botão vai para o fim do card do formulário e o resumo
   lateral não tem botão (uma primária por tela). "Voltar" nunca vai na barra: fica no fim do card,
   em todas as larguras. Abaixo de `sm` a barra tem duas linhas (total em cima, botão `fullWidth`
   embaixo), porque "Continuar para pagamento" + total não cabem numa linha de 288 px.
3. **Rótulos da ação dizem para onde ela leva** (DS §6.2): "Continuar para pagamento" → "Revisar
   reserva" → "Confirmar reserva". O que é sempre igual: posição, tamanho e o fato de nunca ser
   `disabled`.
4. **Cupom fica acima do detalhamento e começa recolhido.** A linha de desconto entra abaixo do campo,
   então o "Aplicar" não sai de baixo do ponteiro. O cupom aplicado ocupa o mesmo lugar e a mesma
   altura do campo, e "Remover" fica onde estava "Aplicar" e recebe o foco.
5. **O erro do envio aparece logo acima dos botões do passo de revisão,** como `Alert` com foco
   programático. Toast só como eco na falha de transporte. Todo erro de envio termina com "Nada foi
   cobrado." e os dados continuam preenchidos.
6. **Pagamento deixa claro que é demonstração.** `Alert info` no topo com o cartão de teste, e uma
   nota com cadeado avisando que cartão e documento não são salvos. O documento é um `Radio` CPF /
   Passaporte com um único campo que troca de máscara.
7. **Pagamento apagado é avisado, nunca silencioso.** Rascunho restaurado (reload) ou volta do bfcache
   depois do `pagehide`: a pessoa cai no passo de pagamento com um `Alert info` dizendo por que o
   cartão está vazio.
8. **Estado bloqueante substitui a página inteira** (h1 próprio, motivo e uma saída). Não há formulário
   nem barra, e o resumo não aparece "pela metade".

### Layout

Container padrão (§4.1). Não há `<main>` (é do layout raiz). Estrutura do DOM, que também é a ordem
de leitura e de foco:

```
<div class="flex flex-col gap-4 lg:gap-6">         cabeçalho da página
  link "← Voltar ao hotel"  ·  h1 "Finalizar reserva"
<div class="grid gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8 lg:items-start">
  1. StepIndicator     lg:col-start-1 lg:row-start-1 (max-w-2xl)
  2. <section> Sua reserva   lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-24
                             lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto
  3. <form> card do passo    lg:col-start-1 lg:row-start-2 (max-w-2xl)
     … StepActions (Voltar no fluxo; primário = ActionBar < lg)
```
Abaixo de `lg`, o container recebe `pb-36 sm:pb-28 lg:pb-0`, para a barra não cobrir o rodapé.

**320–375 px (passo 1, resumo recolhido):**
```
┌ SiteHeader sticky h-14 ────────────┐
└────────────────────────────────────┘
 ← Voltar ao hotel                      Link text-sm font-medium text-primary min-h-11, ArrowLeftIcon
 Finalizar reserva                      h1 text-2xl font-bold
  (✓)──────────(2)──────────(3)         StepIndicator <ol> grid grid-cols-3; círculo size-8
 Hóspedes   Pagamento    Revisão        text-sm; atual font-semibold text-fg; futuro text-fg-muted
┌ Sua reserva ───────────────────────┐  <section aria-labelledby> Card static p-4; h2 text-lg font-semibold
│ ┌──────┐ Hotel Copacabana Palace    │  img w-20 aspect-[4/3] rounded-control (alt="") · text-base
│ └──────┘ Suíte Deluxe Ocean View    │  font-semibold line-clamp-2 · quarto text-sm text-fg-muted
│ 12–15 dez · 3 noites                │  text-sm font-medium tabular-nums
│ 2 adultos e 1 criança · 1 quarto    │  text-sm text-fg-muted
│ ✓ Cancelamento grátis               │  text-sm (cor da política, ver §6.8 com mudança da F4)
│ [Ver detalhes da reserva         ▾] │  Button ghost sm fullWidth justify-between, lg:hidden
└─────────────────────────────────────┘
┌ Card do passo (p-4) ────────────────┐  <form noValidate aria-labelledby={h2Id}>
│ Passo 1 de 3                        │  <span class="block text-sm font-medium text-fg-muted">
│ Dados dos hóspedes                  │  h2 text-xl font-semibold tabIndex=-1 (alvo de foco)
│ [Alert info: dados recuperados]     │  só quando restaurado
│ [ErrorSummary]                      │  só depois de uma tentativa inválida
│ Hóspede 1 · titular da reserva      │  <fieldset> legend text-lg font-semibold
│ A confirmação vai para este e-mail. │  p text-sm text-fg-muted
│ Nome                                │  Field
│ [                              ]    │
│ Sobrenome                           │
│ [                              ]    │
│ E-mail                              │
│ [                              ]    │
│ Telefone                            │  <fieldset> legend com estilo de label
│ [Brasil +55                   ▾]    │  Select (linha inteira < sm)
│ [(11) 98765-4321               ]    │  Input
│ Com DDD, como (11) 98765-4321.      │  descrição muda com o país
│ ─────────────────────────────────── │  border-t border-border pt-6
│ Outros hóspedes                     │  h3 text-lg font-semibold
│ Só precisamos do nome. O hotel pode │  p text-sm text-fg-muted
│ pedir documento no check-in.        │
│ Hóspede 2 · adulto                  │  <fieldset> legend text-base font-semibold
│ Nome / Sobrenome                    │
│ Hóspede 3 · criança                 │
│ Nome / Sobrenome / Idade no check-in│  Select
└─────────────────────────────────────┘
 Projeto de demonstração…               footer (o pb-36 reserva o espaço da barra)
┌ ActionBar fixed inset-x-0 bottom-0 ─┐  z-30 bg-surface border-t shadow-raised px-4 pt-3
│ Total · 3 noites · 1 quarto  R$ 4.140,00│  linha 1 flex items-baseline justify-between gap-3:
│ [    Continuar para pagamento     ] │  texto text-sm text-fg-muted (quebra) · valor text-xl
└─────────────────────────────────────┘  font-bold tabular-nums whitespace-nowrap; linha 2: Button
                                          primary md fullWidth; pb-[max(0.75rem,env(safe-area-inset-bottom))]
```

**Painel "Ver detalhes da reserva" (aberto, `< lg`; sempre visível no `lg+`)**, logo abaixo do toggle,
na mesma ordem do aside desktop:
```
 📍 Av. Atlântica, 1702 - Copacabana   p text-sm text-fg-muted
 Check-in             Check-out        <dl> grid grid-cols-2 gap-4
 sáb., 12 de dez.     ter., 15 de dez. dd text-base font-semibold tabular-nums
 A partir de 15:00    Até 12:00        dd text-sm text-fg-muted
 Alterar datas e hóspedes              Link text-sm text-primary min-h-11 → /hotel/{id}?<critérios>#quartos
 ───────────────────────────────────
 Quartos                 [−]  1  [+]   QuantityStepper
 Até 3 hóspedes por quarto             description
 ⓘ Cada quarto precisa de pelo menos 1 adulto.   hint (região aria-live sempre montada)
 ───────────────────────────────────
 [🏷 Tenho um cupom de desconto  ▾]    CouponForm recolhido (estados abaixo)
 ───────────────────────────────────
 R$ 1.200,00 × 3 noites × 1 quarto     PriceBreakdown <dl>
                          R$ 3.600,00
 Taxa de serviço (10%)      R$ 360,00
 ISS (5%)                   R$ 180,00
 ───────────────────────────────────
 Total                    R$ 4.140,00  text-2xl font-bold
 Impostos e taxas incluídos.           text-sm text-fg-muted
```
O painel fechado continua no DOM (`hidden lg:flex`), porque no `lg+` ele é o aside e as regiões
`aria-live` do stepper e do cupom precisam estar montadas. Nesse ponto ele diverge do Disclosure padrão,
cujo painel fechado não fica montado (ver mudança no DS §5.2).

**≥ 1024 px (passo 1):**
```
 ← Voltar ao hotel
 Finalizar reserva                                                          h1 lg:text-3xl
  (✓)───────(2)───────(3)                                ┌ Sua reserva (aside sticky top-24) ──┐
 Hóspedes  Pagamento  Revisão                            │ ┌img w-24┐ Hotel Copacabana Palace   │
┌ Card do passo p-5 max-w-2xl ───────────────────┐       │ └────────┘ Suíte Deluxe Ocean View   │
│ Passo 1 de 3                                   │       │ 12–15 dez · 3 noites                 │
│ Dados dos hóspedes                             │       │ 2 adultos e 1 criança · 1 quarto     │
│ Hóspede 1 · titular da reserva                 │       │ ✓ Cancelamento grátis                │
│ Nome                   Sobrenome               │ sm:grid-cols-2 gap-4 md:gap-5         │
│ [                ]     [                ]      │       │ 📍 Av. Atlântica, 1702 - …           │
│ E-mail                                         │       │ Check-in          Check-out          │
│ [                                        ]     │       │ sáb., 12 de dez.  ter., 15 de dez.   │
│ Telefone                                       │       │ A partir de 15:00 Até 12:00          │
│ [Brasil +55   ▾] [(11) 98765-4321          ]   │ sm:grid-cols-[10rem_1fr] gap-2        │
│ Com DDD, como (11) 98765-4321.                 │       │ Alterar datas e hóspedes             │
│ ────────────────────────────────────────────── │       │ ──────────────────────────────────── │
│ Outros hóspedes                                │       │ Quartos              [−]  1  [+]     │
│ Hóspede 2 · adulto                             │       │ Até 3 hóspedes por quarto            │
│ [Nome          ] [Sobrenome         ]          │       │ ──────────────────────────────────── │
│ Hóspede 3 · criança                            │       │ [🏷 Tenho um cupom de desconto ▾]    │
│ [Nome     ] [Sobrenome    ] [Idade      ▾]     │ sm:grid-cols-[1fr_1fr_9rem]           │
│ ────────────────────────────────────────────── │       │ R$ 1.200,00 × 3 noites × 1 quarto    │
│                       [Continuar para pagamento]│      │                         R$ 3.600,00  │
└────────────────────────────────────────────────┘       │ Taxa de serviço (10%)     R$ 360,00  │
                                                          │ ISS (5%)                  R$ 180,00  │
                                                          │ Total                   R$ 4.140,00  │
                                                          │ Impostos e taxas incluídos.          │
                                                          └──────────────────────────────────────┘
```
- StepActions: `border-t border-border pt-5 mt-6 flex flex-col-reverse gap-3 sm:flex-row
  sm:justify-between`. Passo 1 não tem "Voltar" ("← Voltar ao hotel" no topo cumpre esse papel);
  o primário fica à direita (`sm:ml-auto`). Passos 2 e 3: `[Voltar]` (secondary) à esquerda e
  primário à direita. Abaixo de `lg`, "Voltar" é `fullWidth` e o primário está na barra.
- O primário é **um só elemento**: `Button type="submit"` dentro do `<form>`. Abaixo de `lg` ele mora
  no `ActionBar` (`fixed`, com `data-action-bar`). No `lg+` o `ActionBar` vira `lg:static lg:border-0
  lg:shadow-none lg:p-0`, a linha do total fica `lg:hidden` e o botão aparece no fim do card. Não há
  duplicação de botão.
- `ActionBar` `≥ sm` (640–1023): uma linha `flex items-center justify-between gap-4`. À esquerda, o
  total (valor `text-xl font-bold` em cima, `3 noites · 1 quarto` `text-sm text-fg-muted` embaixo); à
  direita, o botão `w-auto min-w-56`.
- 320 px: nenhum valor em reais quebra (`whitespace-nowrap`); os rótulos do detalhamento quebram e o
  valor não. Validade e CVV ficam lado a lado (`grid-cols-2 gap-3`) mesmo em 320 px. O telefone
  empilha país e número até `sm`.

**Passo 2, Pagamento (320 px):**
```
 Passo 2 de 3
 Pagamento                               h2
┌ Alert info ─────────────────────────┐
│ ⓘ Pagamento simulado                 │
│ Nenhum valor é cobrado. Para testar, │
│ use o cartão 4111 1111 1111 1111,    │
│ qualquer validade futura e qualquer  │
│ CVV.                                 │
└──────────────────────────────────────┘
 💳 Cartão de crédito                    h3 text-lg font-semibold (ícone decorativo)
 Número do cartão
 [4111 1111 1111 1111            ]
 Bandeira: Visa                          descrição (troca de texto, 1 linha, aria-live)
 Nome impresso no cartão
 [ANA SOUZA                      ]
 Validade            CVV                 grid-cols-2 gap-3
 [MM/AA      ]       [           ]
                     3 números no verso
 ─────────────────────────────────────
 Documento do titular do cartão          <fieldset> legend text-lg font-semibold
 (◉) CPF      ( ) Passaporte             Radio em linha (flex flex-wrap gap-x-6)
 CPF
 [000.000.000-00                 ]
 Usado só para validar o pagamento. Não é salvo nem enviado.
 🔒 Os dados do cartão ficam só neste navegador e são apagados quando você sai da página.
                                         p text-sm text-fg-muted flex gap-2, LockIcon size-4
 [            Voltar              ]      secondary fullWidth (< lg)
```

**Passo 3, Revisão (320 px):**
```
 Passo 3 de 3
 Revise e confirme                       h2
 Estadia                                 h3 text-lg (sem "Editar": muda no hotel)
 Hotel Copacabana Palace · Suíte Deluxe Ocean View
 sáb., 12 de dez. a ter., 15 de dez. · 3 noites
 1 quarto · 2 adultos e 1 criança
 ✓ Cancelamento grátis
 Cancele grátis até 48 horas antes do check-in.   text-sm text-fg-muted (regra 1 da política, F4)
 ─────────────────────────────────────
 Hóspedes                     [Editar]   h3 + Button ghost sm (sr-only " hóspedes")
 Ana Souza · titular                     <dl>/<ul> text-base
 ana@exemplo.com · +55 (11) 98765-4321   text-sm text-fg-muted
 Bruno Souza · adulto
 Clara Souza · criança, 7 anos
 ─────────────────────────────────────
 Pagamento                    [Editar]
 💳 Visa •••• 1111 · validade 12/28
 Nome no cartão: ANA SOUZA
 CPF ***.982.247-**
 ─────────────────────────────────────
 Valores                                 h3, lg:hidden (no lg+ o aside está ao lado)
 (PriceBreakdown somente leitura, sem cupom nem stepper)
 Para mudar quartos ou cupom, use o resumo da reserva.  [Abrir resumo]  Button ghost sm
 ─────────────────────────────────────
 [☐] Li e aceito os termos e condições da reserva, incluindo a política de cancelamento.
 [Ler termos e condições]                Button ghost sm (fora do <label>)
 ⚠ Para continuar, aceite os termos da reserva.   erro do checkbox (só após tentativa)
 [SubmitError Alert]                     só depois de um envio que não deu certo
 [            Voltar              ]
 ActionBar: Total … R$ 3.726,00 / [ Confirmar reserva ]
```
"Abrir resumo" abre o painel do resumo e leva o foco ao toggle "Ver detalhes da reserva"
(`revealBelowHeader`).

### Hierarquia

1. **O que estou comprando e quanto custa:** hotel, quarto, datas e noites no topo do resumo; total
   sempre visível (barra no mobile, aside no desktop); condição de cancelamento junto da identidade,
   nunca escondida no painel.
2. **Onde estou no processo:** StepIndicator + "Passo N de 3" no h2.
3. **O que preencher agora:** os campos do passo e nada mais (os outros passos não ficam montados).
4. **A única ação:** primário do passo. Secundárias: "Voltar" (secondary), "Editar", "Ler termos",
   "Ver detalhes da reserva", "Tenho um cupom" (ghost).
5. Apoio: endereço, horários, detalhamento, avisos de demonstração e de privacidade.

### Componentes

| Uso | Componente | Observação |
|---|---|---|
| Campos | `Field` + `Input` / `Select` (shared) | máscaras pelo `applyMask` (model); erro via `Field` |
| Telefone | `PhoneField` (feature): `<fieldset>` com legend estilo label + `Select` + `Input` | padrão "Campo composto" novo no DS §5.2 |
| Idade da criança | `Select` | opção vazia `Selecione a idade` + `Menos de 1 ano`, `1 ano`, `2 anos` … `17 anos` |
| Documento | `Radio` ×2 em `<fieldset>` + `Field`/`Input` | |
| Resumo de erros | `ErrorSummary` (promovido para `shared/ui/molecules`, tarefa 1) | itens `{rótulo}: {mensagem}` |
| Indicador de passos | `StepIndicator` (feature) | DS §5.3 (novo) |
| Resumo | `BookingSummary` (feature): `Card static` + `RemoteImage` (F4) + toggle `Button ghost` com `aria-expanded` | painel sempre montado (exceção documentada) |
| Quartos | `QuantityStepper` (shared) com `hint` | status optimistic e motivo no `hint` |
| Cupom | `CouponForm` (feature) com `Field`, `Input`, `Button secondary`, `Button ghost` | form próprio, fora do `<form>` principal |
| Preço | `PriceBreakdown` (feature) + `PriceBreakdownSkeleton` | `<dl>`, `tabular-nums`; DS §5.3 (novo) |
| Barra | `ActionBar` (feature, `data-action-bar`) | DS §4.5; promove para shared no 2º uso |
| Avisos | `Alert` (`info` restaurado/simulado · `warning` preço/esgotou/cupom/offline · `danger` falha) | |
| Termos | `Checkbox` + `Dialog size="md"` com **`focusableBody`** (nova prop em shared) | DS §5.3 |
| Erro de seção | `ErrorState` `inline` com `headingLevel={3}` | |
| Bloqueado | `EmptyState` `headingLevel={1}` + `ButtonLink` | |
| Feedback | `toast.info` (sem seleção), `toast.error` (falha de transporte do envio) | |
| Ícones novos | `CreditCardIcon`, `LockIcon`, `TagIcon` (shared/ui/icons) | DS §3 |

Mudanças em `shared` que **não** estão na lista de Arquivos e precisam entrar:
- `Dialog`: prop `focusableBody?: boolean`. Quando ativa, o corpo rolável ganha `tabIndex={0}`,
  `role="region"` e `aria-labelledby={titleId}` e recebe o foco inicial.
- `Toaster`: atributo `data-toaster` na região fixa.
- `globals.css`: regra de `scroll-padding-bottom` e do deslocamento do toast quando há `[data-action-bar]`
  (DS §4.5).
- `icons.tsx`: os 3 ícones novos.

### Indicador de passos

```
  (✓)─────────(2)─────────(3)
 Hóspedes   Pagamento   Revisão
```
- `<ol aria-label="Etapas da reserva" class="grid grid-cols-3">`, um `<li>` por passo, conteúdo
  centralizado em coluna: círculo `size-8 rounded-full` + rótulo `text-sm`. A linha de ligação é
  decorativa (`before:` com `h-0.5`, `bg-border` / `bg-primary` entre passos concluídos).
- **Concluído:** `<button type="button">` cobrindo círculo + rótulo (`min-h-11 w-full`, foco = anel
  global). Círculo `bg-primary` com `CheckIcon` branco (`aria-hidden`), rótulo `text-primary
  font-medium` + `<span class="sr-only">, concluído</span>`. Hover: rótulo sublinhado.
- **Atual:** `<span aria-current="step">`, círculo `border-2 border-primary text-primary` com o
  número, rótulo `font-semibold text-fg`.
- **Futuro:** texto simples, não focável. Círculo `border border-border-strong text-fg-muted`, rótulo
  `text-fg-muted`.
- Números e check são `aria-hidden` (a lista ordenada já dá a posição). O h2 do passo leva "Passo N
  de 3".
- Durante o envio (`isPending`), os botões de passos concluídos ficam `aria-disabled` e ignoram o
  clique.

### Cada passo

**Passo 1, Dados dos hóspedes** (`h2` "Dados dos hóspedes")
- Titular = hóspede 1, sempre adulto. Ordem: Nome, Sobrenome, E-mail, Telefone (país → número).
- O país padrão é **Brasil**. Ao trocar o país, a máscara é reaplicada aos dígitos já digitados, a
  descrição de exemplo muda e o campo é revalidado se já foi tocado. O foco fica no `Select`.
- Acompanhantes: `buildCompanions` gera os blocos na ordem adultos → crianças. Cada bloco é um
  `<fieldset>` com legend "Hóspede N · adulto/criança", separado por `border-t border-border pt-5`.
  Criança: Nome, Sobrenome e "Idade no check-in" (`Select`, sem descrição: não temos regra de preço
  por idade, e prometer algo que o hotel não aplica confundiria).
- Sem acompanhantes (1 adulto, 0 crianças), a subseção "Outros hóspedes" não é renderizada.
- O número de hóspedes não muda aqui. "Alterar datas e hóspedes", no resumo, leva ao hotel.

**Passo 2, Pagamento** (`h2` "Pagamento")
- `Alert info` "Pagamento simulado" sempre no topo do passo.
- Número do cartão: máscara em grupos de 4 (Amex 4-6-5). A descrição mostra `Bandeira identificada
  pelo número.` até detectar e depois `Bandeira: Visa` (mesma altura, 1 linha, dentro de um `<span
  aria-live="polite">` sempre montado). Bandeira desconhecida com 6+ dígitos: `Bandeira não
  identificada. Confira o número.` Isso é só aviso; quem decide é o Luhn.
- Nome impresso: `autoCapitalize="characters"`, exibido como digitado.
- Validade: digita só números e a barra entra depois do 2º dígito (`1228` → `12/28`). Apagar a barra
  apaga o dígito anterior. Placeholder `MM/AA`.
- CVV: a descrição muda com a bandeira (`3 números no verso` / Amex `4 números na frente`). Trocar a
  bandeira revalida o CVV se ele já foi tocado.
- Documento: `Radio` "CPF" (padrão) / "Passaporte". Trocar o tipo limpa o valor e o erro do campo
  (máscaras incompatíveis), mantém o foco no radio e troca o rótulo do campo ("CPF" / "Número do
  passaporte").
- A nota de privacidade com `LockIcon` fica no fim do passo, antes dos botões.

**Passo 3, Revisão** (`h2` "Revise e confirme")
- As seções são `<section aria-labelledby>` com h3 e separadas por `border-t`. "Editar" é `Button
  ghost sm` alinhado à direita do h3 (`flex items-center justify-between`), leva ao passo e foca o h2
  dele.
- Cartão: `{Bandeira} •••• {últimos 4}` + `validade MM/AA`. Documento: `CPF ***.982.247-**` /
  `Passaporte ******456` (só os 3 últimos). Nunca o número completo.
- "Valores" (`lg:hidden`) repete o `PriceBreakdown` em modo leitura: nunca esconder o preço antes do
  compromisso no celular, onde o resumo está recolhido.
- Termos: `Checkbox` com o rótulo completo. "Ler termos e condições" fica **fora** do `<label>`, logo
  abaixo (`Button ghost sm`). O erro fica abaixo dos dois, ligado ao checkbox por `aria-describedby`;
  o `aria-invalid` vai no `<input>`.
- `SubmitError` e depois StepActions.

### Máscaras e teclado

| Campo | Máscara | `inputMode` | `autoComplete` | Outros |
|---|---|---|---|---|
| Nome / Sobrenome (titular) | — | `text` | `given-name` / `family-name` | `autoCapitalize="words"`, `spellCheck={false}` |
| Nome / Sobrenome (acompanhante) | — | `text` | `off` | idem (evita o navegador repetir o titular) |
| E-mail | — (`type="email"`) | `email` | `email` | `autoCapitalize="none"`, `spellCheck={false}` |
| País do telefone | — | — | `tel-country-code` | `Select`: `Brasil +55`, `Estados Unidos +1`, `Portugal +351`, `Espanha +34` |
| Telefone | BR `(11) 98765-4321` / `(11) 3456-7890` · US `(201) 555-0123` · PT `912 345 678` · ES `612 34 56 78` | `tel` | `tel-national` | `type="tel"`; placeholder = exemplo do país |
| Idade | — | — | `off` | `Select` |
| Número do cartão | `0000 0000 0000 0000` (Amex `0000 000000 00000`) | `numeric` | `cc-number` | `type="text"` |
| Nome no cartão | — | `text` | `cc-name` | `autoCapitalize="characters"`, `spellCheck={false}` |
| Validade | `MM/AA` | `numeric` | `cc-exp` | placeholder `MM/AA` |
| CVV | 3 ou 4 dígitos | `numeric` | `cc-csc` | `type="text"` (não `password`: dificulta conferir) |
| CPF | `000.000.000-00` | `numeric` | `off` | placeholder `000.000.000-00` |
| Passaporte | maiúsculas, sem espaços | `text` | `off` | `autoCapitalize="characters"`, `spellCheck={false}` |
| Cupom | maiúsculas ao aplicar (normaliza; não reescreve enquanto digita) | `text` | `off` | `autoCapitalize="characters"`, `spellCheck={false}` |

- O cursor nunca pula: `applyMask` devolve a posição pela contagem de dígitos antes dele. Colar texto
  formatado (`(11) 98765-4321`, `4111-1111-1111-1111`) funciona. Excesso de dígitos é descartado.
- Sem `maxLength` nos campos com máscara (quebraria o colar com formatação).
- Enter num campo do form principal = clicar no primário do passo (`type="submit"`). Enter no cupom
  = "Aplicar" (form próprio).

### Preço: detalhamento e skeleton

```
 R$ 1.200,00 × 3 noites × 1 quarto     ← dt text-sm text-fg (quebra) · dd text-sm font-medium
                          R$ 3.600,00     tabular-nums whitespace-nowrap text-right
 Desconto (BEMVINDO10)     −R$ 360,00  ← dd text-success (5.69:1); o "−" vem no texto
 Taxa de serviço (10%)       R$ 324,00
 ISS (5%)                    R$ 162,00
 ─────────────────────────────────────  border-t border-border pt-3
 Total                     R$ 3.726,00  ← dt text-base font-semibold · dd text-2xl font-bold
 Impostos e taxas incluídos.            ← text-sm text-fg-muted
```
- `<dl class="flex flex-col gap-2">`, cada linha `flex items-start justify-between gap-3`, `dt
  min-w-0` e `dd shrink-0`. Ordem fixa: estadia → desconto → taxa de serviço → ISS → total. A linha
  de desconto só existe com o cupom aplicado e válido.
- **Skeleton (quarto carregando):** container `aria-busy="true"` + `<p class="sr-only"
  aria-live="polite">Calculando o total…</p>`. Três linhas `flex justify-between` com `Skeleton line
  h-5 w-3/5` e `h-5 w-20`, depois `border-t`, linha total `h-6 w-16` e `h-8 w-32`, e `h-5 w-48`.
  Mesma geometria do conteúdo final (sem desconto).
- **Cupom validando:** só a linha de desconto vira skeleton (`h-5 w-2/5` / `h-5 w-20`) entre estadia
  e taxa. O total continua com o valor anterior, não fica vazio.
- **Barra (mobile) carregando:** valor `Skeleton line h-7 w-28`. O texto `Total · 3 noites · 1
  quarto` já aparece (vem dos critérios). O botão fica normal, exceto no passo 3 (`loading`
  "Calculando total…").
- **Mais de 5 s:** abaixo do skeleton, `Está demorando mais que o normal…` (`text-sm text-fg-muted`,
  linha `min-h-5` reservada desde o início).
- **Erro do quarto:** no lugar do detalhamento, `ErrorState inline` com `headingLevel={3}` "Não foi
  possível carregar o preço." / "Verifique sua conexão e tente de novo." + "Tentar de novo"
  ("Tentando…", o botão não desmonta). Na barra: `Total indisponível` (`text-sm text-fg-muted`) no
  lugar do valor.
- O total muda **sem animação** (nada de contador rolando). O anúncio é feito pelo stepper/cupom que
  causou a mudança, não pelo total (evita leitura dupla).

### Quantidade de quartos (optimistic)

`QuantityStepper` "Quartos", com description `Até {maxGuests} hóspedes por quarto` e `decreaseLabel`
/ `increaseLabel` `Remover quarto` / `Adicionar quarto`.

| Momento | Valor e preço | `hint` (região viva já existente) |
|---|---|---|
| Clique válido | número e total mudam **na hora** (barra e aside) | `Confirmando disponibilidade…` |
| API confirma | fica | volta ao motivo de limite, se houver; senão vazio |
| API nega (`available < n`) | volta ao último confirmado | `Só {available} quarto(s) disponível(is).` (`Só 1 quarto disponível.` / `Só 2 quartos disponíveis.`) |
| Falha de rede | volta ao último confirmado | `Não foi possível confirmar a disponibilidade. Tente de novo.` |
| No limite | botão `aria-disabled`, foco fica | motivo do `roomCountBounds` (textos em Microcopy) |

- O hint fica **abaixo** da linha dos botões (regra anti-salto do Stepper), então os botões não se
  movem. O que fica abaixo (cupom, detalhamento) pode descer: é consequência do clique, longe do
  ponteiro.
- Os textos de rollback ficam até o próximo clique em −/+.
- A legenda da barra acompanha o valor: `Total · 3 noites · 2 quartos`.
- Durante o envio, os dois botões ficam `aria-disabled` (o preço não pode mudar no meio do pedido).

### Cupom

```
Recolhido:   [🏷 Tenho um cupom de desconto ▾]            Button ghost sm, aria-expanded, aria-controls
Aberto:      Cupom de desconto                              Field (label)
             [                        ] [ Aplicar ]         Input flex-1 + Button secondary md shrink-0
             Letras e números, sem espaços.                 description
Validando:   [BEMVINDO10              ] [⟳ Aplicando…]      loading (largura mantida) · linha de desconto = skeleton
Aplicado:    Cupom de desconto
             [✓ BEMVINDO10 · 10% de desconto ] [Remover]    linha min-h-11 rounded-control bg-success-soft
                                                            px-3 text-sm text-success (5.40:1) · Button ghost sm
Inválido:    [NAOEXISTE               ] [ Aplicar ]         aria-invalid
             ⚠ Cupom não encontrado. Confira o código.      erro do Field
Deixou de valer:
             [⚠ DESCONTO50 não vale para esta reserva] [Remover]   bg-warning-soft text-warning (7.21:1)
             Válido para reservas a partir de R$ 300,00.    text-sm text-fg
```
- Abrir o toggle mostra o campo **abaixo** do botão (que vira o rótulo da seção e continua lá) e não
  move o foco (padrão disclosure). Com cupom aplicado, o bloco abre sozinho.
- **Digitando:** sem validação. Se havia erro, ele some na 1ª tecla (DS §5.2 Field).
- **Formato inválido** (clique em "Aplicar" ou Enter): erro na hora, sem loading, foco no input.
- **Validando:** "Aplicando…" (`loading`). Mudar o texto cancela a consulta, o botão volta a "Aplicar"
  e a linha de skeleton some.
- **Aplicado:** o campo e o "Aplicar" são substituídos, na mesma posição e altura, pela linha de
  sucesso e por "Remover". O foco vai para "Remover". A linha de desconto entra no detalhamento.
  Anúncio: `Cupom BEMVINDO10 aplicado.`
- **Remover:** volta ao campo **vazio**, foco no input, anúncio `Cupom removido.`. A linha de desconto
  sai. Reaplicar o mesmo código é instantâneo (cache) e não tem estado de "Aplicando…".
- **Inválido / expirado / inelegível:** erro do `Field` com o motivo, total intacto, foco volta ao
  input. Anúncio igual ao texto do erro.
- **Deixou de valer** (quartos mudaram): a linha vira aviso com o motivo, o desconto sai do total na
  hora. Anúncio: `O cupom DESCONTO50 deixou de valer: válido para reservas a partir de R$ 300,00. O
  total foi atualizado.` Se voltar a valer: linha de sucesso de novo e `Cupom DESCONTO50 aplicado de
  novo.`
- **Rejeitado pelo servidor (`coupon-invalid`):** o bloco abre no estado "Inválido" com o código no
  campo e o motivo no erro, e há também o `Alert` do envio (ver Envio).
- Anúncios: um `<p class="sr-only" aria-live="polite">` sempre montado no `CouponForm`. Limpar o texto
  antes de definir um novo, para que a repetição seja lida.
- Durante o envio da reserva: "Aplicar" e "Remover" ficam `aria-disabled`.

### Termos e condições (Dialog)

- Gatilho: "Ler termos e condições". `Dialog size="md" placement="center" closeOnBackdrop
  focusableBody`, com título `Termos e condições da reserva`.
- O corpo rolável recebe o foco ao abrir (setas e PageDown rolam o texto). As seções do texto vêm de
  `model/terms.ts` (h3 `text-base font-semibold` + parágrafos `text-sm max-w-prose`).
- Footer: `[Fechar]` (secondary) e `[Li e aceito]` (primary). No mobile empilham, com o primário em
  cima (padrão do Dialog).
- "Li e aceito" marca o checkbox, apaga o erro dele, fecha e devolve o foco ao gatilho. O checkbox
  marcado é o feedback (sem toast).
- "Fechar", Esc ou clique no backdrop fecham sem marcar.

### Envio

| Momento | Botão | Inline | Toast | Foco |
|---|---|---|---|---|
| Clique com passo inválido | volta logo | `ErrorSummary` no topo do card + erros nos campos | — | 1º campo inválido; resumo revelado abaixo do header |
| Preço ainda carregando (passo 3) | `loading` "Calculando total…" | — | — | fica no botão |
| Preço com erro (passo 3) | normal | `Alert danger` "Não foi possível calcular o total" + "Tentar de novo" (refaz o quarto) | — | alerta (`tabIndex=-1`) |
| Enviando | `loading` "Confirmando reserva…" (`aria-busy`, `aria-disabled`, ignora clique e Enter) | `Voltar`, `Editar`, passos, quartos e cupom ignoram clique | — | fica no botão |
| `created` | continua "Confirmando reserva…" até a rota trocar (`leaving`) | — | — | a página de confirmação cuida |
| `failed` (rede/5xx) | volta a "Confirmar reserva" | `Alert danger` com "Tentar de novo" (offline: `Alert warning`) | `Não foi possível confirmar a reserva.` (danger) | alerta |
| `price-changed` | normal | `Alert warning` com o total antigo e o novo; detalhamento e barra atualizados | — | alerta |
| `unavailable` | normal | `Alert warning` + `ButtonLink secondary` "Ver quartos" | — | alerta |
| `coupon-invalid` | normal | `Alert warning` + cupom no estado inválido (resumo abre no mobile) | — | alerta |
| `invalid` | normal | vai ao passo do 1º campo citado; `ErrorSummary` + erro no campo | — | 1º campo citado |

- O `SubmitError` fica logo acima de StepActions no passo 3, com `tabIndex={-1}`. O foco programático
  usa `preventScroll` + `revealBelowHeader`, e o `scroll-padding-bottom` mantém o alerta acima da
  barra.
- O alerta sai quando a pessoa reenvia (é remontado no próximo resultado) ou quando deixa o passo 3.
- "Tentar de novo" (dentro do alerta de falha) reenvia com o mesmo `attemptId`. Fica em `loading`
  "Tentando…" e o primário entra em `loading` junto. Só um pedido por vez.
- Clique no primário depois de um erro equivale a "Tentar de novo".
- Nenhum texto vem do servidor. O motivo sai de `submitFeedback` (switch exaustivo).

### Estados da página

| Gate / estado | O que aparece |
|---|---|
| `hydrating` / `reloading` | `CheckoutSkeleton` com a geometria da página: link `h-5 w-32`; h1 `h-8 w-56` (`lg:h-9`); stepper com 3 × (`circle size-8` + `h-5 w-16`); card do resumo (`block w-20 aspect-[4/3]` + `h-6 w-3/4`, `h-5 w-1/2`, `h-5 w-2/3`, `h-5 w-40`); card do passo (`h-5 w-24`, `h-7 w-48`, 4 × (`h-5 w-24` + `h-11 w-full`)); barra `< lg` com `h-7 w-28` + `h-11 w-full`. Container `aria-busy="true"`, `sr-only aria-live` `Carregando sua reserva…` |
| `redirect-empty` | mantém o skeleton (o form nunca pisca) → `router.replace("/")` + `toast.info` |
| `ready` + hotel/quarto carregando | layout completo; o resumo mostra o que vem dos critérios (datas, noites, hóspedes, quartos) e skeleton no resto (foto, nome, quarto, cancelamento, endereço, horários, detalhamento). O passo 1 está digitável |
| `ready` + erro do hotel | no topo do resumo: `ErrorState inline` com `headingLevel={3}` "Não foi possível carregar os dados do hotel." + "Tentar de novo". Datas e preço seguem |
| `ready` + erro do quarto | nome do quarto como `Quarto indisponível no momento` (`text-fg-muted`) e `ErrorState` no lugar do detalhamento (ver Preço) |
| Bloqueado (`sold-out` / `insufficient` / `too-small` / `stale-dates`) | substitui tudo abaixo do header: `EmptyState headingLevel={1}`, motivo, `ButtonLink primary` e `ButtonLink ghost` "Fazer nova busca" (`/`). Sem stepper, sem form, sem barra. Se o foco estava no form quando o bloqueio chegou, ele vai para o h1 (`tabIndex=-1`) |
| `leaving` | form como estava, botão "Confirmando reserva…" |
| Restaurado (passo 1) | `Alert info` abaixo do h2: `Recuperamos os dados que você preencheu nesta sessão.` |
| Restaurado (passo 2: veio de 2 ou 3) ou volta do bfcache depois do `pagehide` | passo 2 com `Alert info` `Por segurança, os dados do cartão não ficam salvos. Preencha o pagamento de novo.` |
| Offline (`navigator.onLine === false`) | só afeta envio e retries; ver Envio |

O alerta de restauração fica até a pessoa sair daquele passo. Volta do bfcache (`pageshow` com
`persisted`) no passo 3 → passo 2 com o alerta. Revisão com cartão vazio nunca aparece.

### Interações

| Ação | Feedback imediato | Depois | Foco |
|---|---|---|---|
| Primário com passo válido | — | próximo passo montado; passos concluídos no indicador | h2 do novo passo (`preventScroll` + `revealBelowHeader`) |
| Primário com passo inválido | erros nos campos + `ErrorSummary` (remontado a cada tentativa) | — | 1º campo inválido |
| Item do `ErrorSummary` | — | — | o campo (`setFocus`) |
| "Voltar" / passo concluído / "Editar" | passo anterior montado, sem validar | — | h2 do passo |
| Blur de campo | erro aparece (adiado por `useDeferredBlur` enquanto um botão do `<form>` está pressionado, incluindo o da barra) | — | segue o Tab |
| Trocar país do telefone | máscara e exemplo mudam | revalida se tocado | fica no `Select` |
| Trocar CPF/Passaporte | rótulo muda, valor e erro limpos | — | fica no radio |
| "Ver detalhes da reserva" | painel abre abaixo, chevron gira | — | fica no botão |
| −/+ quartos | valor e total na hora; `Confirmando disponibilidade…` | confirma ou reverte com motivo | fica no botão |
| Cupom | ver Cupom | | |
| "Ler termos e condições" | dialog abre (fade) | — | corpo do texto; ao fechar, o gatilho |
| "Abrir resumo" (revisão, `< lg`) | painel do resumo abre | — | toggle do resumo, revelado abaixo do header |
| "← Voltar ao hotel" / "Alterar datas e hóspedes" | navega (rascunho já salvo) | — | — |

- **Nada se move sob o ponteiro:** o blur é adiado nos botões; o hint do stepper fica abaixo dos
  botões; a linha de desconto entra abaixo do cupom; "Aplicado" ocupa a geometria do campo; botões em
  loading mantêm a largura; o skeleton tem a geometria final; a linha "Está demorando…" é reservada;
  a barra é fixa e não muda de altura entre estados (valor ↔ skeleton ↔ "Total indisponível" ficam
  na mesma linha `min-h-7`).
- **Toasts:** só `toast.info` no redirect sem seleção e `toast.error` na falha de transporte. Os dois
  têm também o canal principal (página de destino / alerta inline).
- **Título do documento** por passo: `Passo 1 de 3: Dados dos hóspedes | Infotera Hotéis` (idem
  `Pagamento`, `Revise e confirme`). Bloqueado: `{título do bloqueio} | Infotera Hotéis`.

### Microcopy (final)

| Onde | Texto |
|---|---|
| `metadata.title` (servidor) | `Finalizar reserva \| Infotera Hotéis` |
| Topo | link `Voltar ao hotel` · h1 `Finalizar reserva` |
| StepIndicator | `aria-label` `Etapas da reserva` · `Hóspedes` · `Pagamento` · `Revisão` · sr `, concluído` |
| h2 | `Passo 1 de 3` + `Dados dos hóspedes` · `Passo 2 de 3` + `Pagamento` · `Passo 3 de 3` + `Revise e confirme` |
| Resumo | h2 `Sua reserva` · `12–15 dez · 3 noites` · `2 adultos e 1 criança · 1 quarto` (`1 adulto`, `3 crianças`, `2 quartos`) · cancelamento (DS §6.8 com F4) · toggle `Ver detalhes da reserva` · `Check-in` / `Check-out` · `A partir de 15:00` / `Até 12:00` · link `Alterar datas e hóspedes` · alt da foto `""` (o nome está ao lado) |
| Quartos | label `Quartos` · `Até 3 hóspedes por quarto` (1 → `Acomoda 1 hóspede por quarto`) · `Remover quarto` / `Adicionar quarto` · `Confirmando disponibilidade…` · `Só 1 quarto disponível.` / `Só 2 quartos disponíveis.` · `Não foi possível confirmar a disponibilidade. Tente de novo.` · `Este quarto acomoda até 3 hóspedes: 4 hóspedes precisam de pelo menos 2 quartos.` · `Cada quarto precisa de pelo menos 1 adulto.` · `Máximo de 4 quartos por reserva.` |
| Preço | `R$ 1.200,00 × 3 noites × 1 quarto` (`1 noite`, `2 quartos`) · `Desconto (BEMVINDO10)` · `Taxa de serviço (10%)` · `ISS (5%)` · `Total` · `Impostos e taxas incluídos.` · sr `Calculando o total…` · `Está demorando mais que o normal…` · `Não foi possível carregar o preço.` · `Total indisponível` |
| Barra | `Total · 3 noites · 1 quarto` + valor |
| Cupom | toggle `Tenho um cupom de desconto` · label `Cupom de desconto` · `Letras e números, sem espaços.` · `Aplicar` (sr ` cupom`) / `Aplicando…` · `BEMVINDO10 · 10% de desconto` / `DESCONTO50 · R$ 50,00 de desconto` · `Remover` (sr ` cupom`) · anúncios `Cupom BEMVINDO10 aplicado.` · `Cupom removido.` · `Cupom DESCONTO50 aplicado de novo.` · `O cupom DESCONTO50 deixou de valer: {motivo minúsculo} O total foi atualizado.` · aviso `DESCONTO50 não vale para esta reserva` |
| Cupom: erros | `Use de 4 a 12 letras ou números, sem espaços.` · `Cupom não encontrado. Confira o código.` · `Este cupom expirou.` · `Válido para estadias a partir de 3 noites.` · `Válido para reservas a partir de R$ 300,00.` · `Não foi possível validar o cupom. Tente de novo.` |
| Passo 1 | legend `Hóspede 1 · titular da reserva` · `A confirmação vai para este e-mail.` · `Nome` · `Sobrenome` · `E-mail` · legend `Telefone` · `aria-label` `País do telefone` / `Número de telefone` · descrições `Com DDD, como (11) 98765-4321.` / `Como (201) 555-0123.` / `Como 912 345 678.` / `Como 612 34 56 78.` · h3 `Outros hóspedes` · `Só precisamos do nome. O hotel pode pedir documento no check-in.` · legend `Hóspede 2 · adulto` / `Hóspede 3 · criança` · `Idade no check-in` · `Selecione a idade` · `Menos de 1 ano` · `1 ano` · `{n} anos` |
| Passo 2 | Alert `Pagamento simulado` · `Nenhum valor é cobrado. Para testar, use o cartão 4111 1111 1111 1111, qualquer validade futura e qualquer CVV.` · h3 `Cartão de crédito` · `Número do cartão` · `Bandeira identificada pelo número.` · `Bandeira: Visa` (`Mastercard`, `American Express`, `Elo`, `Hipercard`) · `Bandeira não identificada. Confira o número.` · `Nome impresso no cartão` · `Validade` · `CVV` · `3 números no verso` / `4 números na frente` · legend `Documento do titular do cartão` · `CPF` · `Passaporte` · label `CPF` / `Número do passaporte` · `Usado só para validar o pagamento. Não é salvo nem enviado.` · `Os dados do cartão ficam só neste navegador e são apagados quando você sai da página.` |
| Passo 3 | h3 `Estadia` · `Hóspedes` · `Pagamento` · `Valores` · `Editar` (sr ` hóspedes` / ` pagamento`) · `Ana Souza · titular` · `Bruno Souza · adulto` · `Clara Souza · criança, 7 anos` (`menos de 1 ano`, `1 ano`) · `Visa •••• 1111 · validade 12/28` · `Nome no cartão: ANA SOUZA` · `CPF ***.982.247-**` · `Passaporte ******456` · `Para mudar quartos ou cupom, use o resumo da reserva.` · `Abrir resumo` |
| Termos | checkbox `Li e aceito os termos e condições da reserva, incluindo a política de cancelamento.` · `Ler termos e condições` · dialog `Termos e condições da reserva` · `Fechar` · `Li e aceito` |
| Termos: texto (`model/terms.ts`) | **Reserva:** `A reserva vale para o hotel, o quarto, as datas e os hóspedes mostrados no resumo. O hotel pode pedir documento com foto de todos os hóspedes no check-in.` · **Pagamento:** `Este é um ambiente de demonstração: o pagamento é simulado e nenhum valor é cobrado. O total inclui taxa de serviço de 10% e ISS de 5%.` · **Cancelamento:** regras da política do hotel (DS §6.8, F4) · **Horários:** `Check-in a partir de {15:00} e check-out até {12:00}, no horário local do hotel.` · **Seus dados:** `Usamos nome, e-mail e telefone só para esta reserva. Os dados do cartão e o documento não são salvos nem enviados.` |
| Botões | `Continuar para pagamento` · `Revisar reserva` · `Confirmar reserva` / `Confirmando reserva…` / `Calculando total…` · `Voltar` · `Tentar de novo` / `Tentando…` · `Ver quartos` · `Fazer nova busca` |
| Resumo de erros | `Corrija 1 campo para continuar` / `Corrija N campos para continuar`; itens `Titular — E-mail: …`, `Hóspede 2 — Nome: …`, `Hóspede 3 — Idade: …`, `Número do cartão: …`, `Termos: …` |
| Envio: falha | Alert `Não foi possível confirmar sua reserva` · `Nenhuma cobrança foi feita. Seus dados foram mantidos; tente de novo em instantes.` · toast `Não foi possível confirmar a reserva.` |
| Envio: offline | Alert warning `Você está sem internet` · `Assim que a conexão voltar, tente de novo. Nada foi cobrado e seus dados foram mantidos.` |
| Envio: preço mudou | Alert warning `O total da reserva mudou` · `Passou de R$ 4.140,00 para R$ 4.320,00. Confira o novo valor e confirme de novo. Nada foi cobrado.` |
| Envio: esgotou | `Este quarto esgotou enquanto você reservava` · `Escolha outro quarto no mesmo hotel. Nada foi cobrado.` · com sobra: `Só 1 quarto disponível agora` · `Diminua a quantidade de quartos no resumo da reserva ou escolha outro quarto. Nada foi cobrado.` · `Ver quartos` |
| Envio: cupom | `O cupom BEMVINDO10 não vale mais` · `Removemos o desconto e o total agora é R$ 4.140,00. Confira e confirme de novo. Nada foi cobrado.` |
| Envio: preço indisponível | `Não foi possível calcular o total` · `Carregue o preço do quarto de novo para confirmar a reserva.` · `Tentar de novo` |
| Envio: `invalid` (fallback do campo) | `Confira este dado e tente de novo.` |
| Seções | `Não foi possível carregar os dados do hotel.` · `Não foi possível carregar o preço.` · `Verifique sua conexão e tente de novo.` · `Quarto indisponível no momento` |
| Página | sr `Carregando sua reserva…` · toast `Nenhum quarto selecionado. Escolha um hotel e um quarto para reservar.` · `Recuperamos os dados que você preencheu nesta sessão.` · `Por segurança, os dados do cartão não ficam salvos. Preencha o pagamento de novo.` |
| Bloqueado `sold-out` | h1 `Este quarto esgotou` · `Não há mais unidades de {quarto} para {12–15 dez}. Escolha outro quarto no mesmo hotel.` · `Ver quartos` |
| Bloqueado `insufficient` | h1 `Só {n} quarto(s) disponível(is)` · `Sua reserva pede {r} quartos de {quarto}. Escolha outro quarto ou reduza a quantidade de quartos.` · `Ver quartos` |
| Bloqueado `too-small` | h1 `Este quarto não acomoda sua busca` · `{quarto} acomoda até {m} hóspedes por quarto e sua busca tem {g}. Escolha outro quarto ou altere os hóspedes.` · `Ver quartos` |
| Bloqueado `stale-dates` | h1 `As datas desta reserva já passaram` · `O check-in era em {dd/MM/aaaa}. Escolha novas datas para ver preço e disponibilidade.` · `Escolher novas datas` |

**Validação** (mensagens do schema; o primeiro problema por campo):

| Campo | Vazio | Inválido |
|---|---|---|
| Nome / Sobrenome | `Informe o nome.` / `Informe o sobrenome.` | `Use só letras, espaços, hífen ou apóstrofo.` · `Use pelo menos 2 letras.` · `Use no máximo 60 caracteres.` |
| E-mail | `Informe o e-mail.` | `Digite um e-mail válido, como nome@exemplo.com.` |
| Telefone BR | `Informe o telefone.` | `Digite o telefone com DDD, como (11) 98765-4321.` · DDD: `O DDD {20} não existe. Confira o código da cidade.` · celular sem 9: `Celular tem 9 depois do DDD, como (11) 98765-4321.` |
| Telefone US | idem | `Digite um número dos EUA com 10 dígitos, como (201) 555-0123.` |
| Telefone PT | idem | `Digite um número de Portugal com 9 dígitos, começando com 9 ou 2.` |
| Telefone ES | idem | `Digite um número da Espanha com 9 dígitos, começando com 6, 7, 8 ou 9.` |
| Idade | `Informe a idade da criança no check-in.` | — |
| Número do cartão | `Informe o número do cartão.` | incompleto: `O número do cartão está incompleto.` · Luhn: `Número de cartão inválido. Confira os dígitos.` |
| Nome no cartão | `Informe o nome como está impresso no cartão.` | `Use só letras e espaços.` |
| Validade | `Informe a validade do cartão.` | `Use o formato MM/AA.` · `Mês inválido. Use de 01 a 12.` · `Cartão vencido. Use um cartão com validade futura.` · `Confira o ano da validade.` (> 20 anos) |
| CVV | `Informe o CVV.` | `Digite os 3 números do verso do cartão.` / Amex `Digite os 4 números da frente do cartão.` |
| CPF | `Informe o CPF.` | `CPF inválido. Confira os 11 números.` |
| Passaporte | `Informe o número do passaporte.` | `Passaporte inválido. Use de 6 a 9 letras e números, como FZ123456.` |
| Termos | `Para continuar, aceite os termos da reserva.` | — |

Para o telefone, `isValidPhone` precisa devolver o **motivo** (`length` · `area-code` · `mobile-nine` ·
`pattern`), não um booleano. O schema mapeia o motivo para a mensagem.

### Acessibilidade (o que testar)

- Landmarks e títulos: h1 `Finalizar reserva` → h2 do resumo `Sua reserva` → h2 do passo → h3
  (Outros hóspedes, Cartão de crédito, Estadia/Hóspedes/Pagamento/Valores, h3 do `ErrorState`). O
  resumo é `<section aria-labelledby>`; o form tem `aria-labelledby` = h2 do passo.
- `<fieldset>` + `<legend>` em: titular, cada acompanhante, telefone, documento. O `QuantityStepper`
  já é fieldset.
- Erro: `aria-invalid` + `aria-describedby` (descrição + erro) em todo controle, inclusive o checkbox
  de termos, o `Select` de idade e o país.
- Alvos ≥ 44 px: passos concluídos (`min-h-11`), "Voltar ao hotel", toggle do resumo, "Alterar datas
  e hóspedes", radios e checkbox (linha `min-h-11`), "Editar"/"Ler termos"/"Remover"/"Tenho um cupom"
  (`sm` com área 44), itens do `ErrorSummary`.
- Foco: todo foco programático usa `preventScroll` + `revealBelowHeader` (topo) e o
  `scroll-padding-bottom` da barra (rodapé). Nada focado fica atrás do header ou da barra (WCAG
  2.4.11).
- Botões nunca `disabled`. Limites, loading e envio usam `aria-disabled` (+ `aria-busy` no loading).
- Regiões vivas sempre montadas: texto do botão em loading, `output` e `hint` do stepper, anúncios do
  cupom, `Bandeira: …`, `Calculando o total…`, `Carregando sua reserva…`. `ErrorSummary` e `Alert
  danger` são `role="alert"`; `Alert warning/info` é `role="status"`. O total **não** é região viva.
- Leitor de tela no passo: "Passo 2 de 3, Pagamento, título nível 2". Na lista: "Hóspedes, concluído,
  botão" · "Pagamento, etapa atual".
- Dialog: foco no corpo do texto (`role="region"` nomeado pelo título), Esc fecha, foco volta ao
  gatilho; axe sem `scrollable-region-focusable`.
- Cor nunca sozinha: desconto com "−" e rótulo; cupom aplicado/aviso com ícone + texto; passos com
  check/número + texto.
- 320 px e zoom 200%: sem rolagem horizontal; a barra não cobre campo focado; o aside `lg` rola
  dentro de si quando passa da altura da janela.
- `prefers-reduced-motion`: fade do dialog e do erro, rotação do chevron e `pulse` desligados pela
  regra global.

### Ajustes aos critérios (UX)

- **Crit. 3:** o texto de `sr-only` do skeleton é `Carregando sua reserva…`.
- **Crit. 4–5:** os estados bloqueantes são `EmptyState` de página (h1 próprio) com textos da tabela
  de Microcopy. O link de `stale-dates` se chama "Escolher novas datas". O de esgotado continua "Ver
  quartos" (DS §6.6). Todos têm também "Fazer nova busca".
- **Crit. 7:** abaixo de `lg`, endereço e horários ficam no painel "Ver detalhes da reserva" (no DOM,
  `hidden`). O teste confere no `lg` ou depois de abrir o painel.
- **Crit. 8:** o `sr-only` do detalhamento é `Calculando o total…`. Na barra mobile o valor também é
  skeleton.
- **Crit. 10:** o rótulo e o valor da estadia são separados (`dt`/`dd`), sem o "=" visível. O texto
  acessível da linha é `R$ 1.200,00 × 3 noites × 1 quarto R$ 3.600,00`.
- **Crit. 12:** o rollback usa `Só 1 quarto disponível.` no `hint`.
- **Crit. 14–17:** `Cupom não encontrado. Confira o código.` (começa com o texto do critério). O
  status de aplicado é anúncio `sr-only` + linha visível `BEMVINDO10 · 10% de desconto`. O controle é
  "Remover" com nome acessível "Remover cupom".
- **Crit. 19:** passos `Hóspedes`, `Pagamento`, `Revisão`.
- **Crit. 20/25/28:** o "Continuar" tem rótulo por passo: `Continuar para pagamento`, `Revisar
  reserva`, `Confirmar reserva`. O loading do envio é `Confirmando reserva…`.
- **Crit. 21:** o titular é `Hóspede 1 · titular da reserva`; no resumo de erros, `Titular — {campo}`.
  A idade usa `Idade no check-in`, com `Menos de 1 ano` para 0.
- **Crit. 24:** as mensagens completas são `Número de cartão inválido. Confira os dígitos.`, `Cartão
  vencido. Use um cartão com validade futura.`, `Mês inválido. Use de 01 a 12.` e `CPF inválido.
  Confira os 11 números.` (todas começam com o texto do critério).
- **Crit. 26:** o passaporte mascarado é `Passaporte ******456`. A revisão inclui também `Estadia` e,
  abaixo de `lg`, `Valores`.
- **Crit. 30:** o foco vai para o `Alert`. Offline usa a variante warning (mesma ação).
- **Crit. 31:** os textos estão em Microcopy. `coupon-invalid` também mostra um `Alert` perto do
  botão (o cupom pode estar recolhido no mobile).
- **Crit. 34 (novo, UX):** voltar à página pelo bfcache depois do `pagehide` no passo 3 leva ao passo
  2 com o alerta de pagamento apagado. A revisão nunca aparece com o cartão vazio.
- **Arquivos:** acrescentar `ActionBar.tsx` (feature) e as mudanças em `shared` listadas em
  Componentes (`Dialog focusableBody`, `data-toaster`, `globals.css`, 3 ícones).

## Mudanças no design system

Texto exato a inserir em `docs/design/design-system.md` (o orquestrador aplica). Pressupõe as mudanças
da F4 já aplicadas; nenhuma das abaixo reescreve trecho que a F4 também troca.

**§3 Ícones e imagens — acrescentar ao fim do item "Ícones" (depois de "`history` … recentes."):**
```
  Checkout (F5): `credit-card` (cartão), `lock` (nota de privacidade), `tag` (cupom).
```

**§4.3 Estrutura da página — substituir o item "Página com sidebar…" por:**
```
- Página com sidebar (resultados com filtros, checkout com resumo): `lg:grid lg:grid-cols-[18rem_1fr] gap-8`
  (filtros à esquerda) ou `lg:grid-cols-[1fr_22rem]` (resumo à direita).
  No mobile, a sidebar vira Drawer (filtros) ou bloco colapsável acima do formulário (resumo).
- **Checkout (F5):** o resumo vem **antes** do formulário no DOM em todas as larguras (o que estou
  comprando → meus dados). No `lg+` vai para a direita por `lg:col-start-2 lg:row-start-1
  lg:row-span-2` (nunca `order-*`), com `lg:sticky lg:top-24 lg:self-start
  lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto` (exceção de geometria permitida). Abaixo de `lg`, o
  resumo é um cartão com identidade, datas, hóspedes e cancelamento sempre à vista e um toggle "Ver
  detalhes da reserva" para o resto. Formulário em `max-w-2xl` dentro de um `Card static`.
```

**§4.5 Barra de ação fixa — manter a 1ª frase (versão da F4) e substituir o restante (bloco ASCII e
"Reserve o espaço…") por:**
````
```
< sm (2 linhas)                              sm–lg (1 linha)
┌──────────────────────────────────────┐     ┌──────────────────────────────────────────────┐
│ Total · 3 noites · 1 quarto R$ 4.140,00│   │ R$ 4.140,00                  [Revisar reserva]│
│ [         Revisar reserva          ] │     │ 3 noites · 1 quarto                          │
└──────────────────────────────────────┘     └──────────────────────────────────────────────┘
```
- `fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-border shadow-raised px-4 pt-3
  pb-[max(0.75rem,env(safe-area-inset-bottom))]` com `data-action-bar`. Some em `lg:` (`lg:static`, sem
  borda/sombra/padding; a linha do total fica `lg:hidden` e o botão aparece no fim do formulário).
- O botão da barra **é** o submit do passo (um só elemento, dentro do `<form>`), nunca uma cópia.
  Ações secundárias ("Voltar") ficam no fim do conteúdo, não na barra.
- `< sm`: linha 1 `flex items-baseline justify-between gap-3` (texto `text-sm text-fg-muted`, valor
  `text-xl font-bold tabular-nums whitespace-nowrap`), linha 2 botão `fullWidth`. `sm–lg`: uma linha,
  botão `w-auto min-w-56`.
- A altura não muda entre estados: valor, skeleton (`h-7 w-28`) e "Total indisponível" ocupam a mesma
  linha (`min-h-7`).
- Reserve o espaço no fim da página: `pb-36 sm:pb-28 lg:pb-0`.
- Focos e toasts acima da barra (CSS global, fora de `@layer` para vencer os utilitários):
  ```css
  @media (width < 40rem) {
    html:has([data-action-bar]) { scroll-padding-bottom: calc(9rem + env(safe-area-inset-bottom)); }
    html:has([data-action-bar]) [data-toaster] { bottom: calc(9rem + env(safe-area-inset-bottom)); }
  }
  @media (40rem <= width < 64rem) {
    html:has([data-action-bar]) { scroll-padding-bottom: 6rem; }
    html:has([data-action-bar]) [data-toaster] { bottom: 6rem; }
  }
  ```
````

**§5.1 Input — acrescentar ao fim:**
```
- **Máscara** (telefone, CPF, cartão, validade): formatação a cada tecla por função pura que devolve
  `{ value, caret }` (o cursor nunca pula ao apagar no meio; colar texto formatado funciona). Sem
  `maxLength` (quebra o colar); o excesso de dígitos é descartado pela máscara. Placeholder = formato ou
  exemplo (`MM/AA`, `000.000.000-00`, `(11) 98765-4321`).
- `autoComplete` do checkout: `given-name`, `family-name`, `email`, `tel-country-code`, `tel-national`,
  `cc-number`, `cc-name`, `cc-exp`, `cc-csc`; `off` em documento, cupom, idade e nomes de
  acompanhantes (evita repetir o titular). CVV é `type="text" inputMode="numeric"`, nunca `password`.
```

**§5.2 Field — acrescentar ao fim:**
```
- **Campo composto** (F5, telefone = país + número): `<fieldset>` com `<legend>` no estilo do label
  (`text-sm font-medium text-fg`), controles com `aria-label` ("País do telefone", "Número de
  telefone"), descrição e erro ligados ao controle principal (número). `< sm` empilhado; `sm+`
  `grid grid-cols-[10rem_1fr] gap-2`.
- Descrição que muda com o valor (ex.: `Bandeira: Visa`): conteúdo dentro de um `<span
  aria-live="polite">` sempre montado; textos alternados com o mesmo número de linhas (sem salto).
```

**§5.2 Stepper — acrescentar ao fim:**
```
- Valor confirmado depois (optimistic, F5 "Quartos"): o valor muda na hora; o `hint` mostra o status
  (`Confirmando disponibilidade…`) e, se a confirmação falhar, o motivo do retorno
  (`Só 1 quarto disponível.`). Mesma região viva, sem spinner extra.
```

**§5.2 Disclosure — acrescentar ao fim (depois do texto da F4):**
```
Exceção (F5, resumo do checkout): quando o painel é a sidebar no `lg+`, ele fica **montado** e só
escondido abaixo de `lg` (`hidden lg:flex`; toggle `lg:hidden`), para não perder estado nem regiões
`aria-live`.
```

**§5.2 (novo) — inserir após Alert:**
```
#### ErrorSummary
Resumo de erros no topo do formulário (promovido da F2 na F5). `Alert danger` (`role="alert"`) com
título `describeErrorCount(n)` (`Corrija 1 campo para continuar` / `Corrija N campos para continuar`)
e `<ul>` de `<button type="button">` (`block min-h-11 w-full py-2 text-left text-primary underline`),
um por erro, na ordem do DOM: `{Rótulo}: {mensagem}`. Itens genéricos `{ id, label, message }` +
`onSelect(id)` (a feature foca o campo). Remontado (`key`) a cada tentativa para ser anunciado de novo;
ao montar, `revealBelowHeader`. Atualiza enquanto o usuário corrige e some sem erros.
```

**§5.3 Dialog — acrescentar após o item "Foco inicial…":**
```
- `focusableBody` (texto longo, ex.: termos): o corpo rolável recebe `tabIndex={0}`, `role="region"`,
  `aria-labelledby` = título, e o foco inicial (setas/PageDown rolam o texto). Footer de aceite:
  `[Fechar]` secondary + `[Li e aceito]` primary.
```

**§5.3 Toast — substituir o item "Região fixa…" por:**
```
- Região fixa (`data-toaster`): mobile `bottom-4 inset-x-4`, ≥ `sm` `bottom-6 right-6 w-96`. Com a barra
  de ação fixa na tela (`[data-action-bar]`, abaixo de `lg`), a região sobe acima dela pela regra CSS da
  §4.5. Máx. 3 empilhados, mais novo embaixo.
```

**§5.3 (novo) — inserir após HotelCard / RoomCard:**
```
#### StepIndicator (F5)
`<ol aria-label="Etapas da reserva" class="grid grid-cols-N">`, cada passo em coluna centralizada:
círculo `size-8 rounded-full` + rótulo `text-sm`; ligação decorativa `h-0.5` (`bg-border`, `bg-primary`
entre concluídos).
- Concluído: `<button>` `min-h-11 w-full` (volta ao passo), círculo `bg-primary` com `CheckIcon` branco,
  rótulo `text-primary font-medium` + sr `, concluído`.
- Atual: `aria-current="step"`, círculo `border-2 border-primary text-primary` com o número, rótulo
  `font-semibold text-fg`.
- Futuro: texto não focável, círculo `border border-border-strong text-fg-muted`, rótulo `text-fg-muted`.
- O h2 do passo traz `Passo N de M` (`text-sm font-medium text-fg-muted`, bloco acima do título) e é o
  alvo de foco ao trocar de passo.

#### PriceBreakdown (F5)
`<dl class="flex flex-col gap-2">`; linha `flex items-start justify-between gap-3`, `dt min-w-0 text-sm`,
`dd shrink-0 text-sm font-medium tabular-nums whitespace-nowrap text-right`. Ordem: estadia
(`R$ 1.200,00 × 3 noites × 1 quarto`) → desconto (`text-success`, `−R$ 360,00`) → taxa de serviço → ISS →
`border-t pt-3` → Total (`dt text-base font-semibold`, `dd text-2xl font-bold`) → `Impostos e taxas
incluídos.` (`text-sm text-fg-muted`). Skeleton com as mesmas linhas, `aria-busy` + sr `Calculando o
total…`; só a linha do desconto vira skeleton enquanto o cupom valida. O total não é região viva (quem
anuncia é o controle que mudou o preço).

#### Cupom (F5)
Recolhido em `Button ghost sm` "Tenho um cupom de desconto" (`TagIcon`, `aria-expanded`), **acima** do
detalhamento. Aberto: `Field` "Cupom de desconto" com `Input` `flex-1` + `Button secondary` "Aplicar"
(`Aplicando…`). Aplicado: na mesma posição e altura, linha `min-h-11 rounded-control bg-success-soft
px-3 text-sm text-success` com `CheckIcon` + `CÓDIGO · 10% de desconto` e `Button ghost sm` "Remover"
(recebe o foco). Deixou de valer: mesma linha em `bg-warning-soft text-warning` com `AlertCircleIcon` +
motivo abaixo. Erros no `Field`. Anúncios num `sr-only aria-live` próprio.
```

**§6.2 Botões e ações — acrescentar à lista:**
```
Checkout: `Continuar para pagamento` · `Revisar reserva` · `Confirmar reserva` · `Editar` · `Ler termos e
condições` · `Li e aceito` · `Aplicar` · `Remover` · `Ver detalhes da reserva` · `Tenho um cupom de
desconto` · `Escolher novas datas` · `Voltar ao hotel`.
Loading: `Confirmando reserva…` · `Calculando total…` · `Aplicando…`.
```

**§6.3 Validação — acrescentar linhas à tabela:**
```
| Nome / sobrenome | `Informe o nome.` / `Informe o sobrenome.` · `Use só letras, espaços, hífen ou apóstrofo.` · `Use pelo menos 2 letras.` |
| Telefone por país | BR: `O DDD 20 não existe. Confira o código da cidade.` · `Celular tem 9 depois do DDD, como (11) 98765-4321.` · US: `Digite um número dos EUA com 10 dígitos, como (201) 555-0123.` · PT: `Digite um número de Portugal com 9 dígitos, começando com 9 ou 2.` · ES: `Digite um número da Espanha com 9 dígitos, começando com 6, 7, 8 ou 9.` |
| Idade da criança | `Informe a idade da criança no check-in.` |
| Cartão incompleto | `O número do cartão está incompleto.` |
| Mês da validade | `Mês inválido. Use de 01 a 12.` · ano > 20 anos: `Confira o ano da validade.` |
| CVV por bandeira | `Digite os 3 números do verso do cartão.` / Amex `Digite os 4 números da frente do cartão.` |
| Nome no cartão | `Informe o nome como está impresso no cartão.` |
| Passaporte | `Informe o número do passaporte.` · `Passaporte inválido. Use de 6 a 9 letras e números, como FZ123456.` |
| Cupom | formato `Use de 4 a 12 letras ou números, sem espaços.` · `Cupom não encontrado. Confira o código.` · `Este cupom expirou.` · `Válido para estadias a partir de 3 noites.` · `Válido para reservas a partir de R$ 300,00.` |
| Item do resumo com hóspede | `Hóspede 2 — Nome: Informe o nome.` · titular `Titular — E-mail: …` |
```

**§6.5 Erro de rede / servidor — acrescentar linhas à tabela:**
```
| Envio da reserva offline | Alert warning: `Você está sem internet` · `Assim que a conexão voltar, tente de novo. Nada foi cobrado e seus dados foram mantidos.` + toast `Não foi possível confirmar a reserva.` | `Tentar de novo` |
| Preço mudou no envio | Alert warning: `O total da reserva mudou` · `Passou de R$ 4.140,00 para R$ 4.320,00. Confira o novo valor e confirme de novo. Nada foi cobrado.` | (o próprio `Confirmar reserva`) |
| Cupom recusado no envio | Alert warning: `O cupom BEMVINDO10 não vale mais` · `Removemos o desconto e o total agora é R$ 4.140,00. Confira e confirme de novo. Nada foi cobrado.` | — |
| Total indisponível no envio | Alert danger: `Não foi possível calcular o total` · `Carregue o preço do quarto de novo para confirmar a reserva.` | `Tentar de novo` |
| Seções do checkout | `Não foi possível carregar os dados do hotel.` / `Não foi possível carregar o preço.` · `Verifique sua conexão e tente de novo.` | `Tentar de novo` |
| Confirmação de quartos falhou | hint: `Não foi possível confirmar a disponibilidade. Tente de novo.` (valor volta) | — |
```

**§6.6 Disponibilidade — acrescentar linhas à tabela:**
```
| Quarto esgotou antes do checkout (F5, página) | `EmptyState` h1 + `Ver quartos` | `Este quarto esgotou` · `Não há mais unidades de {quarto} para {12–15 dez}. Escolha outro quarto no mesmo hotel.` |
| Menos quartos que a reserva (F5, página) | idem | `Só 2 quartos disponíveis` · `Sua reserva pede 3 quartos de {quarto}. Escolha outro quarto ou reduza a quantidade de quartos.` |
| Quarto pequeno (F5, página) | idem | `Este quarto não acomoda sua busca` · `{quarto} acomoda até 2 hóspedes por quarto e sua busca tem 3. Escolha outro quarto ou altere os hóspedes.` |
| Datas passadas (F5, página) | idem + `Escolher novas datas` | `As datas desta reserva já passaram` · `O check-in era em 12/12/2026. Escolha novas datas para ver preço e disponibilidade.` |
| Esgotou durante o envio com sobra (F5) | Alert warning + `Ver quartos` | `Só 1 quarto disponível agora` · `Diminua a quantidade de quartos no resumo da reserva ou escolha outro quarto. Nada foi cobrado.` |
| Limite de quartos no checkout (F5) | hint do Stepper | `Cada quarto precisa de pelo menos 1 adulto.` · `Máximo de 4 quartos por reserva.` · `Este quarto acomoda até 3 hóspedes: 4 hóspedes precisam de pelo menos 2 quartos.` · `Só 2 quartos disponíveis.` |
```

**§6.8 Sucesso e outros — acrescentar ao fim (depois dos itens trocados pela F4):**
```
- Checkout (F5): passos `Hóspedes` · `Pagamento` · `Revisão`; h2 `Dados dos hóspedes` · `Pagamento` ·
  `Revise e confirme`, cada um com `Passo N de 3`. Aviso `Pagamento simulado` · `Nenhum valor é cobrado.
  Para testar, use o cartão 4111 1111 1111 1111, qualquer validade futura e qualquer CVV.` Privacidade:
  `Os dados do cartão ficam só neste navegador e são apagados quando você sai da página.` Restauração:
  `Recuperamos os dados que você preencheu nesta sessão.` · `Por segurança, os dados do cartão não ficam
  salvos. Preencha o pagamento de novo.` Termos: `Li e aceito os termos e condições da reserva, incluindo
  a política de cancelamento.` Cartão mascarado `Visa •••• 1111`; documento `CPF ***.982.247-**` /
  `Passaporte ******456`. Total: `Impostos e taxas incluídos.`
- `aria-label`s do checkout: `Etapas da reserva`, `País do telefone`, `Número de telefone`, `Remover
  quarto`, `Adicionar quarto`; nomes com sr-only: `Aplicar cupom`, `Remover cupom`, `Editar hóspedes`,
  `Editar pagamento`.
```

**§8 Inventário — sobre a versão da F4, trocar as linhas de molecules, organisms e feature por:**
```
| molecules | Field (+ campo composto), Stepper, Alert, ErrorSummary, Card, RatingScore, Breadcrumb, Pagination, EmptyState, ErrorState, DateRange, Combobox, Disclosure (+ cabeçalho e nativo), Tabela de comparação | F1 (Combobox/DateRange na F2; ErrorSummary nasce na F2 e sobe na F5; Card, RatingScore e Disclosure na F3, sobem na F4; Breadcrumb e Tabela de comparação nascem na F4 e ficam na feature até o 2º uso) |
| organisms | Dialog (`placement: "center" \| "sheet"`, `size: "sm" \| "md" \| "full"`, `focusableBody`), Drawer = Dialog sheet, ErrorBoundary, Toast/Toaster, Header, Footer | F1 (sheet e ErrorBoundary na F3; `full` na F4; `focusableBody` na F5) |
| feature | HotelCard, RoomCard, SimilarHotelCard, Gallery/Lightbox, SectionNav, StepIndicator, PriceBreakdown, CouponForm, ActionBar (barra fixa) | F3–F5, compondo os acima (ActionBar sobe para shared no 2º uso) |
```
