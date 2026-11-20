# feature: checkout (`/checkout`) — F5

Resumo da seleção, formulário multi-step e criação da reserva (`POST /bookings`).
**Feature mais sensível do projeto: lida com PII e dados de pagamento (simulados).**

## Escopo
- Básico: resumo hotel + quarto, redirect para `/` (ou para o hotel) sem seleção, form
  nome/email/telefone, `POST /bookings`, redirect para `/confirmation/[id]`.
- Avançados: multi-step (dados → pagamento → revisão), CPF com dígito verificador, telefone com
  máscara, cartão com Luhn, validade não expirada, breakdown de preço, termos com modal, erros por
  campo + global + retry, persistência do form com debounce.

## Estrutura esperada
```
model/price.ts            calculatePrice({ pricePerNight, nights, rooms }) → { base, taxes, total, lines[] }
model/validators.ts       isValidCPF, isValidLuhn, isFutureExpiry, phone mask/parse
model/checkout.schema.ts  um schema Zod por step + schema completo (z.infer para os tipos)
model/to-booking.ts       form + seleção → payload Booking (função pura)
api/create-booking.ts     useCreateBooking (useMutation)
hooks/useCheckoutDraft.ts persistência com debounce (só campos permitidos)
components/CheckoutPage.tsx · BookingSummary.tsx · PriceBreakdown.tsx · StepIndicator.tsx ·
           PersonalStep.tsx · PaymentStep.tsx · ReviewStep.tsx · TermsDialog.tsx
index.ts
```

## Regras de negócio
- Preço calculado **no cliente a partir dos dados da API** (`room.pricePerNight`), nunca de valor salvo
  no storage. Re-busque hotel e quarto pelo id antes de mostrar o resumo.
- Noites vêm de `shared/lib/dates`. Taxas: defina a regra na spec (ex.: 5% de taxa de serviço) e
  mantenha numa constante nomeada.
- Arredondamento em centavos (inteiros) para evitar erro de ponto flutuante.
- Quarto esgotado ou critérios inválidos quando a página abre → voltar ao hotel com aviso.
- Submit: botão desabilitado durante a mutation, sem duplo envio; erro → toast + mensagem global +
  botão "Tentar de novo" mantendo os dados.

## Segurança e privacidade (obrigatório)
- **Nunca** persistir número do cartão, CVV, validade nem CPF (nem em localStorage, nem no Zustand persistido).
  Persistir só nome, email, telefone e step atual. Limpar o rascunho após reserva criada.
- O payload do `POST /bookings` **não** leva dados de cartão: só os últimos 4 dígitos, se precisar.
- Não logar valores do formulário no console.
- Inputs de cartão: `autocomplete="cc-number"`, `inputMode="numeric"`; CVV `autocomplete="cc-csc"`.

## Acessibilidade
- Ao trocar de step, mover o foco para o título do step. Indicador de passos com `aria-current="step"`.
- Resumo de erros no topo com links para os campos ao tentar avançar.

## Testes
- Unit: `price` (1 e 30 noites, vários quartos, arredondamento), CPF (válidos, inválidos, repetidos
  tipo 111.111.111-11), Luhn, validade (mês atual, passado), schemas por step, `to-booking`.
- Componente: não avança step com erro; persistência não contém dados de cartão; retry do submit.

## Notas vindas da F3
- CSP completa (F5): hoje não há `img-src`. As fotos usam o loader do Unsplash (`images.unsplash.com` direto, não só
  `/_next/image`): libere esse host (e `i.pravatar.cc` para avatares) em `img-src`.
- O total do card da F3 é `diária × noites × quartos` sem taxas; aqui o breakdown com taxas é a fonte da verdade
  (o rótulo da F3 diz "total", nunca "total final").
