# feature: checkout (`/checkout`) — F5

Resumo da seleção, formulário de 3 passos e criação da reserva por **Server Action**.
**Feature mais sensível do projeto: lida com PII e dados de pagamento (simulados).**
Spec: `docs/specs/F5-checkout.md` (inclui `## UI/UX`). `app/` importa só `CheckoutPage` pelo `index.ts`.

## Estrutura
```
model/    price (centavos inteiros) · price-labels · quote (preço + elegibilidade do cupom) · coupons · coupon-announcement ·
          cpf · passport · card · expiry · phone (regras por país, motivo da falha) · masked-input (cursor estável) · names ·
          companions · checkout.schema (+ resolver, `isPersonalValid`) · steps · error-summary · checkout-draft (whitelist) ·
          room-count (limites + reducer otimista com `seq`) · checkout-gate (`selectionGate`, `roomEligibility`) · blocked ·
          booking-request · verify-booking · to-booking-input · create-booking-result (`submitFeedback`) ·
          summary-labels · review-labels · terms
api/      coupons (consulta simulada, 600 ms, abortável) · create-booking.server (orquestra) · create-booking.action ("use server")
hooks/    useStrictDocument · useCheckoutGate · useCheckoutQueries · useRoomCount · useCoupon · usePriceQuote · useCheckoutForm ·
          useCheckoutDraft · usePaymentWipe · useSubmitBooking · useCheckoutFlow (agrega) · checkout-initial
components/ CheckoutPage (gate) → CheckoutRoute → CheckoutReady → BookingSummary/CheckoutForm … (ver spec)
```

> F6: `SERVICE_FEE_BPS`/`ISS_BPS`/`PriceLine`/rótulos/`formatCents` e o `<dl>` do `PriceBreakdown` agora vivem em `shared`
> (`lib/price-breakdown`, `ui/molecules/PriceBreakdown`); `calculatePrice` usa `priceBreakdownLines`; a reconciliação usa `fetchBooking`.

## Decisões (valem daqui para frente)
- **Server Action recalcula tudo**: o cliente envia só referências, escolhas, `cardLast4` e `expectedTotalCents`; o
  `totalPrice` gravado nunca vem do cliente. A action não lança: devolve `CreateBookingResult` (union por `status`).
- **Id da reserva = UUID v4 por tentativa** (`nextAttemptId` por fingerprint do pedido). Falha ambígua do `POST` →
  `GET /bookings/:id` decide `created` ou `failed` (retry nunca duplica; ids não enumeráveis).
- **CSP com nonce só em `/checkout`** (`src/proxy.ts`) + carga de documento ao entrar (`assignLocation` na F4 e
  `useStrictDocument`). A página chama `connection()`.
- **Um `useForm` para os 3 passos**; passo em estado local (não na URL); `trigger(STEP_FIELDS[step], { shouldFocus })`.
  `useCheckoutFocus` cuida do foco: o campo inválido roda **depois** do efeito do `ErrorSummary` e revela o contêiner
  inteiro (`data-reveal-block`) com `revealBlock`, entre o header e a barra fixa; o `h2` revela o bloco "Passo N de 3".
  O alerta do envio (`SubmitError`) se revela inteiro (rAF pós-commit). Toast só na falha de transporte da action.
- **Bloqueio só na entrada** (`admitted` em `CheckoutRoute`): mudar a quantidade de quartos (optimistic) ou refetch do
  quarto não pode derrubar o formulário; o envio devolve `unavailable` com alerta e "Ver quartos".
- **Quartos otimistas**: `useRoomCount` (reducer com `seq`; consultas simultâneas compartilham o `fetchQuery`); persiste em
  `booking-draft.setRoomCount`. Seleção congelada (`leaving`) quando a reserva é criada, para o `clearSelection()` não
  disparar o redirect para `/`.
- **Cupons locais** (`BEMVINDO10`, `FERIAS15`, `DESCONTO50`, `VERAO2024`), consulta com cache por código (`staleTime: Infinity`),
  elegibilidade reavaliada por `buildQuote` quando os quartos mudam. A linha de desconto só aparece com
  `discountCents > 0` (cupom inelegível ou sem cupom não mostra linha); durante a validação, só um skeleton (`afterStay`).
- **Telefone**: o valor guardado são os dígitos brutos (até 15); a máscara é só de exibição e o excesso por país é erro
  de validação (BR → US → BR preserva o número).
- **Rascunho**: `step` é o passo **máximo alcançado**; se a restauração cai no passo 1 (ex.: idade da criança), o aviso do
  cartão apagado aparece ao chegar ao passo 2. Título do documento por efeito (`useDocumentTitle`).
- **Desktop**: o `ActionBar` vira card estático com "Total R$ X" ao lado do botão; o total do aside é `sticky bottom-0`.
- **Envio**: `inFlight` (ref) garante 1 request; no retry ambíguo, `bookingMatchesInput` confere que a reserva lida é a deste pedido.
- **Máscaras**: `applyMask` conta letras e dígitos antes do cursor (vale para passaporte também); sem `maxLength`.
- **Botões nunca `disabled`**: `loading`/`aria-disabled`; blur do campo adiado com `useDeferredBlur` enquanto um botão é
  pressionado; ErrorSummary e SubmitError remontados por `key`.

## Segurança e privacidade (obrigatório)
- **Nunca** persistir número do cartão, CVV, validade, documento, idade nem aceite. O **código do cupom** aplicado
  PODE ser persistido (não é PII); ao restaurar, `useCoupon` revalida pela mesma consulta/regras e, se não vale mais,
  mostra o aviso inline "Seu cupom {CÓDIGO} não vale mais para esta reserva.". Rascunho = `toPersistedDraft`
  (whitelist explícita) no `sessionStorage` (`infotera:checkout-draft`), debounce 500 ms, apagado após `created`.
- `usePaymentWipe`: `pagehide` limpa cartão, validade, CVV e documento; volta do bfcache cai no passo de pagamento com aviso.
- O payload do `POST /bookings` leva só `cardLast4`; o documento é validado e descartado.
- Nada de `console.*` com valores do formulário; erros no servidor logam só `{ event, kind, status }`.
- Aviso fixo "Ambiente de demonstração — não use dados reais." no topo do formulário (a API pública não tem autenticação).

## Testes
Unit em `model/` e `api/` (tabelas para validadores, gate, cupons); componente por seção com `fetch` stubado e a action mockada
(`checkout-test-utils.tsx`); `console.*` espionado; E2E em `e2e/checkout*.spec.ts` (rode também contra o build para a CSP).
Falhas da mock-api **dentro** da action (que o `page.route` não vê) são cobertas em `create-booking.server.test.ts`
(unit) e no E2E `e2e/checkout.server-failure.spec.ts`: o control-proxy responde 500 ao `POST /bookings` cujo corpo
leva um sobrenome único do teste (`serverApi.failServerRequests(..., { method: "POST", body, times: 1 })`).

## F7a (extras)
- `AnimatedStep` envolve o passo atual: só o passo novo anima (`x` ±16, sem opacidade para nunca ficar invisível, direção por `stepDirection`), sem saída, sem animar na
  1ª renderização, com `overflow-x-clip`. O foco no `h2` do passo não mudou.
