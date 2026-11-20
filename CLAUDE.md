# Infotera — Sistema de Reserva de Hotéis (teste técnico frontend)

Solução do desafio em `docs/TEST_FRONTEND.md` (cópia fiel do enunciado). O mapa do teste —
requisitos por feature, o que escolhemos dos avançados e os detalhes da mock-api — está em
`docs/TEST_MAP.md`. **Leia o TEST_MAP antes de mexer em qualquer feature.**

## Stack (obrigatória pelo teste)

- Next.js 16, App Router, TypeScript `strict` (+ `noUncheckedIndexedAccess`)
- Tailwind CSS
- Zustand (estado global de cliente)
- TanStack Query v5 (todo dado de servidor)
- React Hook Form + Zod (formulários e validação de fronteira)
- Biome (lint + format)
- Vitest + Testing Library (unit/componente), Playwright (E2E)
- Doc do Next 16 desta versão: `node_modules/next/dist/docs/` (leia antes de usar API nova)
- Backend: **somente** a `mock-api/` (json-server 0.17). Base URL em `NEXT_PUBLIC_API_URL`, nunca `localhost` fixo no código.

## Comandos

> Válidos depois da feature `F0-setup`. Atualize esta seção se mudar algum script.

```bash
cd mock-api && npm install && npm run server   # API em http://localhost:3333 (delay 300ms)
npm run dev          # front em http://localhost:3000
npm run build        # build de produção
npm run typecheck    # tsc --noEmit
npm run lint         # biome check
npm run format       # biome check --write (formata e organiza imports)
npm run test         # vitest run
npm run test:watch   # vitest em modo watch
npm run test:e2e     # playwright test --trace off (sobe mock-api, control-proxy e front se não estiverem rodando; exige `npm install` em mock-api/)
# O E2E roda navegador e servidor do Next -> control-proxy (:3334) -> mock-api (:3333). O proxy permite
# atrasar/falhar/segurar requests do SERVIDOR (`e2e/helpers/server-api.ts`, fixture `serverApi`).
# Portas por env: E2E_MOCK_API_PORT, E2E_PROXY_PORT, E2E_FRONT_PORT (só uma `next dev` por pasta).
# E2E usa o Chromium do Playwright 1.63 (`npx playwright install chromium` se faltar)
# CSP do checkout: rode também contra o build (`npm run build && npx next start -p 3100`, depois
# `PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test e2e/checkout*.spec.ts`)
npx -y react-doctor@0.9.23 . --scope changed --base main --verbose --no-telemetry
                     # saúde React: componentes gigantes/aninhados, perf, a11y (também roda em toda PR)
```

## Arquitetura: por feature

```
src/
  app/                  rotas finas: page/layout/loading/error. Só compõem features.
  features/
    search-form/        página inicial (/)            — busca, autocomplete, datas, hóspedes
    hotel-search/       /search                       — lista, filtros, ordenação, paginação
    hotel-details/      /hotel/[hotelId]              — galeria, info, quartos, reviews
    checkout/           /checkout                     — resumo, formulário, preço, POST /bookings
    booking-confirmation/ /confirmation/[bookingId]   — GET /bookings/:id
  shared/               código usado por 2+ features (api client, ui, lib, stores)
mock-api/               API mockada fornecida pelo teste (não é código nosso)
docs/                   enunciado, mapa do teste, specs por feature, design system (docs/design)
.claude/agents/         agentes do time de IA
```

Estrutura interna de cada feature (crie só as pastas que usar):

```
features/<nome>/
  CLAUDE.md      instruções da feature para a IA (leia antes de editar)
  index.ts       API pública — a ÚNICA coisa que app/ pode importar
  api/           query keys, queryOptions, mutations (TanStack Query)
  model/         schemas Zod, tipos e lógica pura (sem React) — 100% testável
  hooks/         hooks que ligam model + api + store
  components/    componentes da feature (apresentação)
  store/         slice Zustand local da feature, se precisar
```

### Regras de dependência

- `app → features → shared`. Nunca o contrário.
- Uma feature **não importa** outra feature. Estado ou tipo que duas features precisam vai para `shared/`.
- `app/` importa features só pelo `index.ts` (`@/features/checkout`), nunca deep import.
- Server Components por padrão. `"use client"` só no componente que tem interação, o mais folha possível.

## Regras de código (avaliadas pelo teste)

- Zero `any`, zero `as` para silenciar o compilador, zero `@ts-ignore`. Use `unknown` + Zod na fronteira.
- Toda resposta da API passa por um schema Zod em `shared/api/schemas.ts`; os tipos saem de `z.infer`.
- `type` em vez de `interface`; unions literais em vez de `enum`; `switch` exaustivo com `never`.
- Named exports. Componentes como `const Nome = (...) => ...`.
- Lógica (datas, preço, filtros ↔ URL) fica em `model/` como função pura, nunca dentro do componente.
- JSDoc nos componentes e hooks exportados que não forem óbvios.
- Tamanho (Biome bloqueia): até 80 linhas por função/componente, 250 por arquivo (500 em testes),
  complexidade cognitiva até 15. Passou do limite → extraia subcomponente, hook ou função em `model/`.
- Acessibilidade não é opcional: label em todo input, foco visível, navegação por teclado, `aria-live` para loading/erro, contraste AA, nada quebrado no mobile (320px).
- Toda tela com dado remoto tem os 4 estados: loading (skeleton), erro (com retry), vazio, sucesso.
- Identificadores e código em inglês; textos da UI e documentação em pt-BR.
- Não commitar `node_modules`, `.env`, `mock-api/db.json`.

## Fluxo de trabalho com os agentes

Desenvolvemos **uma feature por vez**, em ordem (veja o roadmap em `docs/TEST_MAP.md`).
O comando `/feature <id>` roda o pipeline inteiro. Manualmente, a ordem é:

| # | Agente | Modelo | Papel |
|---|---|---|---|
| 1 | `planner` | Opus 5.5 | Escreve `docs/specs/<feature>.md`: escopo, critérios de aceite, arquivos, plano de testes |
| 2 | `ui-designer` | Opus 5.5 | Escreve a seção `## UI/UX` da spec (layout, estados, microcopy, interações). Na F1, cria `docs/design/design-system.md` |
| 3 | `developer` | Sonnet 5.5 | Implementa a spec (TDD na lógica pura), deixa typecheck/lint/test verdes |
| 4 | `qa` | Sonnet 5.5 | Automatiza: testes de componente/E2E, axe, cenários `_delay`/`_fail` da API |
| 5 | `reviewer` | Opus 5.5 | Revisa qualidade, arquitetura e aderência à spec. Só lê |
| 6 | `security` | Opus 5.5 | Revisa segurança e privacidade (PII, XSS, env, deps). Só lê |
| 7 | `ux-reviewer` | Opus 5.5 | Roda o app, tira screenshots por viewport e revisa usabilidade (Nielsen, mobile, teclado, estados). Só lê |
| 8 | `end-user-tester` | Opus 5.5 | **Portão final**: usa o app num navegador real como usuário final (personas celular, desktop, só teclado, conexão ruim, inglês) e percorre TODAS as funcionalidades de ponta a ponta. Só lê |

`reviewer`, `security` e `ux-reviewer` rodam em paralelo. Achado bloqueante volta para o `developer`
(ou para o `ui-designer`, se contradizer a spec de UI); o ciclo repete até os três aprovarem
(no máximo 3 voltas; depois disso, pare e pergunte ao usuário).

O `end-user-tester` roda ao fechar cada feature (jornadas que ela toca) e, obrigatoriamente, na
entrega (F8) com todas as jornadas. Veredito `NÃO PRONTO` bloqueia a entrega: os bloqueantes voltam
para o `developer` e o `end-user-tester` roda de novo.

Toda UI segue `docs/design/design-system.md` (tokens, componentes, microcopy). Não invente cor,
espaçamento ou componente fora dele: peça ao `ui-designer` para incluir.

### Definição de pronto (por feature)

1. Critérios de aceite da spec atendidos.
2. `npm run typecheck && npm run lint && npm run test` verdes e React Doctor sem erro novo
   (componente grande demais vira subcomponentes ou hooks; não silencie a regra).
3. `reviewer`, `security` e `ux-reviewer` sem achado bloqueante.
4. `CLAUDE.md` da feature atualizado se alguma decisão mudou.
5. Commits atômicos em Conventional Commits (`feat(hotel-search): ...`, `test(checkout): ...`, `fix: ...`).
   **Sem atribuição de IA**: nada de `Co-Authored-By: Claude`, `Claude-Session:`, "Generated with Claude"
   ou link de sessão em commits, títulos/descrições de PR ou comentários. O autor é só o desenvolvedor.
   Título de PR também segue Conventional Commits (`feat(checkout): ...`).
