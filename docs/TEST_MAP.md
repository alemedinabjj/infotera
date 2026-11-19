# Mapa do teste

Fonte: `docs/TEST_FRONTEND.md` e `mock-api/README.md` (repo `ygor-infotera/test-front`).

## Resumo

- Prazo: 3 dias corridos, 8–12 h de esforço esperado.
- Básicos são obrigatórios. Avançados são opcionais e **avaliados por profundidade, não por quantidade**.
  Cada avançado escolhido precisa de justificativa no README.
- Pesos: Código 45% · Funcionalidade 35% · Arquitetura 15% · Documentação 5%.
- Eliminatórios ("O que NÃO fazer"): `any`, ignorar acessibilidade, commitar `node_modules`/`.env`,
  UI quebrada no mobile, básico incompleto.
- Entrega: repo público, branch `main`, Conventional Commits atômicos, README (como rodar,
  `.env.example`, decisões e trade-offs, o que ficou de fora, uso de IA). Deploy é bônus
  (front na Vercel, API no Render).

## Roadmap por feature

Legenda: ✅ escolhido · ❓ decidir na spec.

> **Decisão do usuário (escopo): implementar TODOS os requisitos opcionais do enunciado.**
> Nenhum item fica fora; onde a mock-api não tem o dado, a spec decide a solução e documenta.

| ID | Feature | Pasta | Depende de |
|---|---|---|---|
| F0 | setup | raiz | — |
| F1 | shared-foundation | `src/shared` | F0 |
| F2 | search-form | `src/features/search-form` | F1 |
| F3 | hotel-search | `src/features/hotel-search` | F1, F2 (params) |
| F4 | hotel-details | `src/features/hotel-details` | F1 |
| F5 | checkout | `src/features/checkout` | F1, F4 (seleção) |
| F6 | booking-confirmation | `src/features/booking-confirmation` | F1, F5 |
| F7 | extras | features transversais (seção 6 do enunciado) | F1–F6 |
| F8 | delivery | README, E2E completo, deploy | todas |

### F0 — setup
- Next 16 + TS strict + `noUncheckedIndexedAccess`, Tailwind, Biome, Vitest, Playwright, alias `@/`.
- `.env.example` com `NEXT_PUBLIC_API_URL=http://localhost:3333`.
- `next.config` com `images.remotePatterns` para `images.unsplash.com` e `i.pravatar.cc`.
- Scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`.

### F1 — shared-foundation
- `docs/design/design-system.md` (pelo `ui-designer`): tokens, tipografia, componentes base, microcopy.
  O tema do Tailwind e os atoms de `shared/ui` saem dele.
- `shared/api`: `env.ts` (lê e valida `NEXT_PUBLIC_API_URL` com Zod), `http.ts` (fetch tipado,
  erro tipado `ApiError`, lê `X-Total-Count`), `schemas.ts` (Zod de Suggestion, Hotel, Room,
  Review, Booking — portados de `mock-api/types.ts`).
- `shared/lib`: datas (noites, ISO), moeda BRL, schema dos search params (destino, datas, quartos,
  adultos, crianças) com parse/serialize da URL.
- `shared/ui`: atoms (Button, Input, Skeleton, Badge, Stars…), molecules, Toast.
- `shared/providers`: QueryClientProvider (retry com backoff, `staleTime`), Toaster.
- `shared/stores`: `booking-draft` (busca atual + hotel/quarto selecionado), persistido.

### F2 — search-form (`/`)
Básico
- Autocomplete em `/suggestions?q=` · datas validadas (check-in ≥ hoje, check-out ≥ check-in + 1,
  máx. 30 noites) · quartos e hóspedes (adultos/crianças) · redireciona para `/search?…`.

Avançado
- ✅ Debounce 300 ms + loading no autocomplete (combobox ARIA com teclado).
- ✅ Validação em tempo real (RHF `mode: "onChange"` + Zod).
- ✅ Últimas 5 buscas (localStorage) — cobre também "persistência de busca".

### F3 — hotel-search (`/search`)
Básico
- Lista `/hotels` com cards · skeleton · estado vazio · paginação (`_page`, `_limit`, `X-Total-Count`).

Avançado
- ✅ Filtros: preço (`pricePerNight_gte/_lte`), nota (`rating_gte`), tipo (`propertyType` repetido),
  comodidades (ver armadilha abaixo).
- ✅ Ordenação: menor preço, maior avaliação, mais popular (`reviewCount`).
- ✅ URL state sync + compartilhar link (a URL é a fonte da verdade dos filtros).
- ✅ Retry + error boundary da seção de resultados.
- ✅ Prefetch do detalhe no hover/focus do card.
- ✅ `next/image` com placeholder blur.
- ✅ Virtualização (react-virtual) + modo infinite scroll como alternativa à paginação.
- ✅ Ordenação por distância: centro do destino = centroide dos hotéis do destino (documentar).
- ✅ Image optimization com blur placeholders.
> Itens desta lista que não couberem na entrega inicial da F3 entram num incremento F3b.

### F4 — hotel-details (`/hotel/[hotelId]`)
Básico
- `/hotels/:id` (404 → `notFound()`) · galeria · informações · quartos (`/rooms?hotelId=`) ·
  "Selecionar" grava no store global e vai para `/checkout`.

Avançado
- ✅ Server Component para dados estáticos, client só para interação.
- ✅ Fetch paralelo (hotel + quartos + reviews) com Suspense/streaming por seção.
- ✅ Disponibilidade: "Apenas N quartos!" quando `available ≤ 2`; quarto/hotel esgotado.
- ✅ Lightbox com teclado (←/→/Esc, foco preso).
- ✅ Reviews paginadas (`_page`, `_limit=5`, `_sort=date&_order=desc`).
- ✅ Política de cancelamento expansível, breadcrumb, copiar link.
- ✅ Hotéis similares (mesmo destino, exclui o atual).
- ✅ Comparação de quartos (tabela de comodidades com destaque de diferenças).
- ✅ Mapa de localização (estático aqui; interativo na F7).
- ✅ Share button, scroll to section (âncoras), thumbnails com lazy loading.

### F5 — checkout (`/checkout`)
Básico
- Resumo hotel + quarto · redirect se não houver seleção · form nome/email/telefone ·
  `POST /bookings` → `/confirmation/[id]`.

Avançado
- ✅ Multi-step: dados pessoais → pagamento (simulado) → revisão.
- ✅ Validação: email, telefone com máscara BR, CPF com dígito verificador, cartão com Luhn,
  validade não expirada.
- ✅ Breakdown de preço: diária × noites × quartos + taxas, em função pura testada.
- ✅ Termos (checkbox obrigatório + modal), erros por campo + erro global + retry do submit.
- ✅ Persistência do form com debounce — **nunca persistir dados de cartão nem CPF**.
- ✅ CSP completa (script-src com nonce, img-src, connect-src) antes de coletar dados de pagamento.
- ✅ Múltiplos hóspedes (form dinâmico por hóspede) e múltiplos quartos na mesma reserva.
- ✅ Código de desconto com validação e feedback visual.
- ✅ Loading por seção, skeleton nos cálculos, optimistic update no preço, validação assíncrona.

### F6 — booking-confirmation (`/confirmation/[bookingId]`)
- `GET /bookings/:id` no servidor (funciona com reload), número da reserva, resumo, botão "Nova busca".
- 404 → página de "reserva não encontrada".

### F7 — extras (seção 6 do enunciado)
Features
- ✅ Favoritos persistidos · Comparação de hotéis (até 3) · Histórico de reservas.
- ✅ Notificações (toast system — já existe na F1; estender).
- ✅ Animações com Framer Motion (`motion`), respeitando `prefers-reduced-motion`.
- ✅ Mapas interativos (Leaflet + OpenStreetMap, sem chave de API).
- ✅ Modo offline (cache de buscas persistido) e PWA (manifest, service worker, ícones).
- ✅ i18n pt-BR + en-US.
Next.js
- ✅ Partial Prerendering · Server Actions para mutations · Parallel Routes para modals · ISR.
- ⛔ Edge Runtime: avaliado e descartado (decisão do usuário). No Next 16.4 `runtime = 'edge'` está
  deprecated e é incompatível com `cacheComponents` (PPR); PPR/ISR resolvem melhor o problema real.
  Justificar no README.

### F8 — delivery
- ✅ Testes unitários, de componente e E2E do fluxo completo (Playwright) + axe.
- README completo (decisões, trade-offs, uso de IA), `.env.example`, deploy (Vercel + Render).

## Mock API — o que importa saber

Endpoints: `/suggestions`, `/hotels`, `/hotels/:id`, `/rooms?hotelId=`, `/reviews?hotelId=`,
`POST|GET /bookings`, `GET /bookings/:id`. Detalhes em `mock-api/README.md`.

Armadilhas verificadas no `db.seed.json`:

1. **`destination` é igualdade exata e sensível a acento.** Mande o `name` da sugestão
   (`"São Paulo, SP"`), nunca o texto digitado. Só `/suggestions?q=` ignora acento.
2. **`amenities_like` repetido é OU.** Para "tem wifi E piscina", filtre no cliente — e aí o
   `X-Total-Count` deixa de bater. Decisão da F3: mandar 1 comodidade para a API e o resto no
   cliente, ou buscar todos os hotéis do destino (máx. 14) e paginar no cliente. Documentar.
3. **Paginação:** resposta é array; total vem no header `X-Total-Count` (só com `_page`).
4. **Estado vazio de propósito:** `Bonito, MS` não tem hotéis.
5. **Esgotados:** hotéis `19` e `48` têm `availableRooms: 0`. 30 quartos têm `available` entre 1 e 2.
6. **`pricePerNight` do hotel nem sempre é o menor quarto:** hotel 1 diz 1200 mas tem quarto de 800;
   hotel 4 diz 890 mas tem quarto de 720. No detalhe, calcule "a partir de" pelos quartos.
7. Distribuição: Rio 14, SP 14, Florianópolis 8, Gramado 6, Salvador 5, Porto de Galinhas 4,
   Campos do Jordão 4, Noronha 3, Jericoacoara 2, Bonito 0. Tipos: 33 hotel, 18 pousada, 9 resort.
8. **A API não valida nada** no `POST /bookings`: toda validação é do front.
9. `/hotels/:id` inexistente → `404`.
10. Simular rede: `?_delay=3000`, `?_fail=1` (sempre 500) ou `npm run server -- --fail-rate 0.3`.
    Erro vem como `{ "error": "Falha simulada pela mock API" }`.
11. O banco reinicia do seed a cada start: reservas somem ao reiniciar a API.
