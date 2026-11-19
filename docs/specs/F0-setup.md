# F0 — setup

## Objetivo

Deixar o repositório pronto para as features F1–F7: projeto Next.js 16 (App Router) na raiz, com
TypeScript estrito, Tailwind v4, Biome, Vitest + Testing Library, Playwright e as dependências de
runtime da stack instaladas em versões exatas. Não há tela de produto: só um layout raiz em pt-BR,
uma página `/` mínima e testes de fumaça que provam que cada ferramenta funciona.

## Escopo

**Dentro**
- Projeto Next 16.4.6 na raiz, `src/`, alias `@/* → ./src/*`, App Router, Turbopack (padrão do 16).
- `tsconfig.json` com `strict` + `noUncheckedIndexedAccess` (+ `noImplicitOverride`, `noFallthroughCasesInSwitch`).
- Tailwind CSS v4 via `@tailwindcss/postcss`; `globals.css` só com `@import "tailwindcss";` (tema é da F1).
- Biome 2 (lint + format + organize imports) ignorando `mock-api/` e arquivos gerados, com regras que
  materializam o `CLAUDE.md` (sem `any`, `type` em vez de `interface`, sem `enum`, named exports,
  fronteiras `app → features → shared`).
- Vitest 5 + jsdom + Testing Library + jest-dom, alias `@/` funcionando nos testes.
- Playwright com 2 projetos Chromium (desktop e mobile) e 1 smoke E2E com checagem axe.
- Scripts `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`, `test:watch`, `test:e2e`.
- `.env.example` com `NEXT_PUBLIC_API_URL=http://localhost:3333`.
- `next.config.ts` com `images.remotePatterns` (`images.unsplash.com`, `i.pravatar.cc`), headers de
  segurança básicos, `poweredByHeader: false`, `agentRules: false`.
- Layout raiz com `lang="pt-BR"` + `metadata`; página `/` placeholder.
- Dependências de runtime da stack: `zustand`, `@tanstack/react-query`, `react-hook-form`, `zod`,
  `@hookform/resolvers`, `clsx`, `tailwind-merge`.
- `src/shared/lib/cn.ts` (clsx + tailwind-merge): único código de `shared/` adiantado, porque é o
  alvo natural do teste que prova o alias e já é a função que a F1 vai usar em todo componente.

**Fora (e por quê)**
- Design system, tokens no `@theme`, fontes (`next/font`): F1, com o `ui-designer`.
- `env.ts` (validação de `NEXT_PUBLIC_API_URL` com Zod), `http.ts`, schemas, providers, stores: F1.
- Content-Security-Policy: exige nonce via `proxy.ts` (força render dinâmico) ou `'unsafe-inline'`
  (pouco valor). Decidir na F7 com o agente `security`. HSTS fica com a hospedagem (Vercel).
- `webServer` da mock-api no Playwright: só entra quando houver E2E que dependa da API (F3+/F7).
- README de entrega, deploy, CI: F7.
- `@tanstack/react-query-devtools`: decisão da F1 (providers).
- Seção `## UI/UX`: não se aplica (sem tela de produto).

## Decisões

1. **Montar o projeto à mão, não rodar `create-next-app` na raiz.**
   Descartado: (a) `create-next-app .` — recusa/conflita com pasta não vazia e pode sobrescrever
   `README.md`; (b) gerar em diretório temporário e copiar — traz lixo que teríamos de apagar
   (`AGENTS.md`, SVGs de `public/`, fontes Geist, `cacheComponents`, loader `@tailwindcss/turbopack`,
   `README.md`). A referência usada é a saída de `create-next-app@16.4.6 --ts --tailwind --biome --app
   --src-dir` (inspecionada pelo planner); copiamos dela só `tsconfig.json` (com ajustes) e a forma do
   `layout.tsx`. Resultado: nenhum `CLAUDE.md` e nada em `mock-api/` é tocado.

2. **Versões exatas** (`.npmrc` com `save-exact=true`, `package-lock.json` commitado):

   | Pacote | Versão | Nota |
   |---|---|---|
   | next | 16.4.6 | latest |
   | react / react-dom | 19.3.1 | peer do Next `^19` |
   | typescript | 5.9.3 | ver decisão 3 |
   | @types/node | 22.20.5 | casa com o runtime Node 22 |
   | @types/react / @types/react-dom | 19.3.0 | |
   | tailwindcss / @tailwindcss/postcss | 4.3.5 | |
   | @biomejs/biome | 2.6.8 | |
   | vitest | 5.1.1 | engines Node `^22.12` |
   | vite | 8.3.8 | peer do vitest 5 e do plugin-react 6 (instalar explicitamente) |
   | @vitejs/plugin-react | 6.3.0 | |
   | jsdom | 31.0.1 | engines Node `^22.22.2` |
   | @testing-library/react | 16.3.3 | |
   | @testing-library/dom | 10.4.2 | peer do RTL |
   | @testing-library/jest-dom | 8.0.0 | peer `vitest >=5 <6`; importar `/vitest` |
   | @testing-library/user-event | 14.6.13 | usado a partir da F2 |
   | @playwright/test | 1.63.0 | ver decisão 7 |
   | @axe-core/playwright | 4.14.0 | + `overrides: { "playwright-core": "1.63.0" }` |
   | zustand | 5.1.0 | runtime |
   | @tanstack/react-query | 5.108.0 | runtime |
   | react-hook-form | 7.92.0 | runtime |
   | zod | 4.6.7 | runtime |
   | @hookform/resolvers | 7.0.7 | peer `zod ^4`, `react-hook-form ^7.55` |
   | clsx | 2.1.1 | runtime |
   | tailwind-merge | 3.7.0 | runtime (compatível com Tailwind v4) |

   `engines.node`: `"^22.22.2 || >=24.15.0"` (mínimo do jsdom 31); `.nvmrc` com `22`.
   O conjunto inteiro foi instalado e validado num protótipo (typecheck, lint, test, build, E2E).

3. **TypeScript 5.9.3, não 7.0.2 (latest) nem 6.0.3.** O TS 7 (nativo) não tem a API JS; o Next 16.4
   só o suporta via `tsc` CLI, sem os code frames do plugin, e o ecossistema (IDE plugin do Next,
   ferramentas) ainda está alinhando. O 6.0 é release de transição com deprecações. O 5.9 é o que o
   `create-next-app@16.4.6` resolve (`"typescript": "^5"`): menor risco. Reavaliar após a entrega.

4. **Tailwind via `@tailwindcss/postcss` (`postcss.config.mjs`)**, não o loader `@tailwindcss/turbopack`
   que o template 16.4 usa. Motivo: é o caminho documentado em `node_modules/next/dist/docs`
   (getting-started/css), funciona com Turbopack e webpack e não amarra o build a uma regra
   `turbopack.rules`. Custo: build de CSS um pouco mais lento — irrelevante no tamanho do projeto.

5. **`cacheComponents` desligado** (o template liga). Com ele, todo acesso a `params`/`searchParams`/
   fetch não cacheado precisa estar dentro de `<Suspense>` ou `"use cache"`, e o build falha se não
   estiver. Nossos dados são por request (busca, reserva, mock que reinicia), então o modelo clássico
   (fetch não cacheado por padrão, rotas dinâmicas quando leem `searchParams`) é previsível e
   suficiente; o streaming por seção da F4 funciona igual com `Suspense`. A F4 pode reabrir a decisão.
   `partialPrefetching` e React Compiler também ficam desligados (sem ganho mensurável aqui, mais
   superfície nova).

6. **Biome com fronteiras de arquitetura no lint.** Além do preset `recommended` (chave `preset`, não
   `recommended: true`, que está deprecada no 2.6) e dos domínios `next`, `react`, `test`,
   `playwright`, ativamos: `noExplicitAny`, `useConsistentTypeDefinitions: type`, `noEnum`,
   `noNonNullAssertion`, `noDefaultExport` (desligado só para os arquivos de convenção do App Router e
   `*.config.*`), `useImportType`/`useExportType`, e `noRestrictedImports` por pasta:
   - `src/shared/**` não importa `@/features/**` nem `@/app/**`;
   - `src/features/**` não importa `@/features/**` (nem a própria: dentro da feature, import relativo)
     nem `@/app/**`;
   - `src/app/**` não faz deep import `@/features/*/**` (só `@/features/<nome>`).
   Descartado: deixar as regras só no `CLAUDE.md` (dependeria de revisão humana; o lint pega no ato).
   Validado no protótipo: as três violações são reportadas.

7. **`@playwright/test` 1.63.0, não 1.65.1 (latest).** O ambiente tem Chromium revisão 1243
   pré-instalado em `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`), que é exatamente o da 1.63.0.
   Fixar 1.63.0 dispensa `playwright install` e `executablePath`. Em outra máquina basta
   `npx playwright install chromium`. O `@axe-core/playwright` puxa `playwright-core` latest como peer
   e quebra os tipos de `Page`; por isso o `overrides` fixando `playwright-core` em 1.63.0.
   Só Chromium (desktop + Pixel 7) — Firefox/WebKit ficam fora para manter o E2E rápido.

8. **Vitest com `resolve.tsconfigPaths: true` nativo do Vite 8**, não o plugin `vite-tsconfig-paths`
   que a doc do Next sugere (uma dependência a menos; mesma fonte da verdade: `tsconfig.paths`).
   `globals: false` (imports explícitos de `vitest`), por isso o `vitest.setup.ts` chama
   `cleanup()` em `afterEach`. Ambiente `jsdom` global; testes puros podem usar
   `// @vitest-environment node` se ficar lento.

9. **`typecheck` = `next typegen && tsc --noEmit`.** O `typegen` gera `next-env.d.ts` e os tipos
   globais de rota (`LayoutProps`, `PageProps`) sem precisar de `dev`/`build`, então o script funciona
   num clone limpo. `typedRoutes` fica **desligado**: hrefs com query string montada (`/search?…`)
   exigiriam `as Route`, o que o `CLAUDE.md` proíbe.

10. **`agentRules: false` no `next.config.ts`.** O `next dev` do 16.4 cria/atualiza `AGENTS.md` quando
    detecta um agente de IA. Nossas instruções vivem nos `CLAUDE.md`; um segundo arquivo gerado sujaria
    a árvore a cada `dev`. Em troca, uma linha no `CLAUDE.md` raiz (seção Stack) aponta para a doc
    empacotada `node_modules/next/dist/docs/` (proposta: única alteração aditiva ao `CLAUDE.md` raiz,
    junto com a atualização da seção Comandos).

11. **Headers de segurança no `next.config.ts` (`headers()` em `/:path*`)**: `X-Content-Type-Options:
    nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
    `Permissions-Policy: camera=(), microphone=(), geolocation=()`, e `poweredByHeader: false`.
    Descartado: `proxy.ts` (ex-middleware) — custo de execução por request sem necessidade agora.

12. **`images.remotePatterns` em formato objeto** com `protocol: "https"`, `hostname` exato e
    `pathname: "/**"`, **sem** `search`: as URLs do seed têm query string (`?w=800`, `?img=12`) e
    `search` omitido aceita qualquer query. Contados no seed: 611 URLs `images.unsplash.com`,
    328 `i.pravatar.cc`, nenhum outro host.

## Contrato de dados

Nenhum endpoint é consumido na F0. Única variável de ambiente:

| Variável | Exemplo (`.env.example`) | Lida por |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3333` | `shared/api/env.ts` (F1). Na F0 só é repassada ao `webServer` do Playwright com fallback, para a F1 não quebrar o E2E. |

Sem schemas Zod nem query keys nesta feature.

## Critérios de aceite

Todos verificáveis por comando, na raiz, com Node 22.23 / npm 10.9.

1. **Instalação reprodutível.** Dado um clone limpo, quando `npm ci`, então termina com código 0, sem
   `ERESOLVE`, e `npm ls --depth=0` sai com 0 (sem peer faltando/inválido).
2. **Versões exatas.** `node -e "const p=require('./package.json');const all={...p.dependencies,...p.devDependencies};const bad=Object.entries(all).filter(([,v])=>/[\^~*x]|latest/.test(v));if(bad.length){console.error(bad);process.exit(1)}"`
   sai com 0, e as versões batem com a tabela da decisão 2. `npm ls playwright-core` mostra uma única
   versão, 1.63.0.
3. **Typecheck.** `npm run typecheck` sai com 0. `tsconfig.json` contém `"strict": true` e
   `"noUncheckedIndexedAccess": true` (`grep`); `allowJs` é `false`; `mock-api` está em `exclude`.
4. **Lint.** `npm run lint` (`biome check .`) sai com 0 sem warnings/infos de config deprecada.
5. **Lint pega o que o `CLAUDE.md` proíbe.** Dado um arquivo temporário (não commitado)
   `src/shared/tmp-check.ts` com `import { x } from "@/features/checkout"`, `export interface A {}`,
   `export enum E { A }`, `export default 1` e um parâmetro `: any`, quando `npx biome lint src`, então
   reporta `noRestrictedImports`, `useConsistentTypeDefinitions`, `noEnum`, `noDefaultExport` e
   `noExplicitAny`. Idem para `src/app/tmp.ts` com `import … from "@/features/x/components/y"`
   (deep import). Remover os arquivos depois.
6. **Biome ignora o que não é nosso.** Dado `mock-api/` intacto (fora do estilo do Biome), quando
   `npm run lint`, então passa; e `npx biome check . --verbose 2>&1 | grep -c mock-api` retorna `0`
   (nenhum arquivo de `mock-api/`, `.next/`, `.claude/` processado). `git diff main --name-only -- mock-api`
   vazio.
7. **Unit + alias.** `npm run test` sai com 0 e executa ao menos `src/shared/lib/cn.test.ts` (importa
   via `@/shared/lib/cn`) e `src/app/page.test.tsx` (render com jsdom + matcher `toBeInTheDocument`).
8. **Config do Next coberta por teste.** `tests/next-config.test.ts` verifica que `remotePatterns`
   contém exatamente `images.unsplash.com` e `i.pravatar.cc` (https), que `headers()` aplica os 4
   headers em `/:path*` e que `poweredByHeader === false`.
9. **Build.** `npm run build` sai com 0 e lista `/` como rota.
10. **Headers em runtime.** Dado `npm run start` rodando, quando `curl -sI http://localhost:3000/`,
    então a resposta é `200` com `x-content-type-options: nosniff`, `x-frame-options: DENY`,
    `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: …` e **sem** `x-powered-by`.
11. **Smoke E2E.** `npm run test:e2e` sai com 0 com 2 testes (projetos `desktop-chromium` e
    `mobile-chromium`) — sem rodar `playwright install`. O teste verifica status 200, `<html lang="pt-BR">`,
    `<title>` contendo "Infotera", `h1` visível, header `nosniff`, ausência de `x-powered-by` e
    **zero violações axe** (tags `wcag2a`, `wcag2aa`).
12. **A11y/mobile do placeholder.** A página `/` tem um único `<main>` e um único `h1`; sem scroll
    horizontal em 320px (coberto por asserção no smoke mobile ou checagem
    `document.documentElement.scrollWidth <= clientWidth` num viewport 320×640).
13. **Env.** `.env.example` existe com exatamente `NEXT_PUBLIC_API_URL=http://localhost:3333` e está
    versionado; `git check-ignore .env .env.local .env.production` lista os três; `git check-ignore
    .env.example` não lista nada.
14. **Nada proibido versionado.** `git ls-files | grep -E '(^|/)node_modules/|^\.env$|mock-api/db\.json|^\.next/|next-env\.d\.ts'`
    vazio; `package-lock.json` versionado.
15. **CLAUDE.md preservados.** `git diff main --name-only --diff-filter=DM -- 'src/**/CLAUDE.md' mock-api/CLAUDE.md`
    vazio. O `CLAUDE.md` raiz só tem adições (decisão 10 + Comandos): `git diff main -- CLAUDE.md | grep '^-[^-]'` vazio.
16. **Sem arquivos gerados pelo Next.** Depois de `npm run dev` por alguns segundos, `ls AGENTS.md`
    falha e `git status --porcelain` não mostra `tsconfig.json` modificado (o Next não precisou
    reescrevê-lo). `public/` não tem os SVGs do template.
17. **Scripts.** `npm run` lista `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`,
    `test:watch`, `test:e2e`, com os comandos da seção Arquivos.

## Arquivos

Novos (raiz):

| Caminho | Responsabilidade |
|---|---|
| `package.json` | nome `infotera`, `private: true`, scripts, deps exatas, `engines`, `overrides` (`playwright-core: 1.63.0`) |
| `package-lock.json` | lock gerado pelo npm 10.9 |
| `.npmrc` | `save-exact=true` |
| `.nvmrc` | `22` |
| `.env.example` | `NEXT_PUBLIC_API_URL=http://localhost:3333` |
| `tsconfig.json` | base do template 16.4.6 + `allowJs: false`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`; `paths` `@/*`; `exclude: ["node_modules", "mock-api"]` |
| `next.config.ts` | `poweredByHeader: false`, `agentRules: false`, `images.remotePatterns`, `headers()` |
| `postcss.config.mjs` | `{ plugins: { "@tailwindcss/postcss": {} } }` |
| `biome.json` | `$schema` local (`./node_modules/@biomejs/biome/configuration_schema.json`), vcs + ignore file, `files.includes` com `!mock-api`, `!.claude`, `!**/.next`, `!**/node_modules`, `!playwright-report`, `!test-results`, `!coverage`, `!next-env.d.ts`; formatter (2 espaços, `lineWidth` 100, aspas duplas, `;`); `css.parser.tailwindDirectives`; regras e overrides da decisão 6; `organizeImports` |
| `vitest.config.mts` | `plugins: [react()]`, `resolve.tsconfigPaths: true`, `environment: "jsdom"`, `setupFiles`, `include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"]` |
| `vitest.setup.ts` | `import "@testing-library/jest-dom/vitest"` + `afterEach(cleanup)` |
| `playwright.config.ts` | `testDir: "./e2e"`, `baseURL` de `PLAYWRIGHT_BASE_URL` com fallback `http://localhost:3000`, `forbidOnly`/`retries` no CI, `trace: "retain-on-failure"`, projetos `desktop-chromium` (Desktop Chrome) e `mobile-chromium` (Pixel 7), `webServer` `npm run dev` com `reuseExistingServer: !CI` e `env.NEXT_PUBLIC_API_URL` com fallback |
| `e2e/smoke.spec.ts` | smoke da home (critérios 11 e 12) |
| `tests/next-config.test.ts` | critério 8 |
| `src/app/globals.css` | `@import "tailwindcss";` |
| `src/app/layout.tsx` | `<html lang="pt-BR">`, `metadata` (`title` "Infotera Hotéis", `description` pt-BR), `<body className="min-h-dvh antialiased">`; usa `LayoutProps<"/">` |
| `src/app/page.tsx` | placeholder: `<main>` + `h1` "Infotera Hotéis" + 1 parágrafo; `const HomePage = () => …; export default HomePage` |
| `src/app/page.test.tsx` | render do placeholder, `getByRole("heading", { level: 1 })` |
| `src/shared/lib/cn.ts` | `export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))` |
| `src/shared/lib/cn.test.ts` | merge de classes conflitantes, falsy ignorado, import por `@/shared/lib/cn` |

Scripts do `package.json`:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "next typegen && tsc --noEmit",
  "lint": "biome check .",
  "format": "biome check --write .",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test --trace off"
}
```

(`format` usa `check --write` para formatar **e** organizar imports com as fixes seguras, de modo que
depois dele o `lint` passe.)

Alterados:

| Caminho | Mudança |
|---|---|
| `.gitignore` | trocar `.env` + `.env*.local` por `.env*` + `!.env.example`; adicionar `/blob-report/`, `/playwright/.cache/`, `.vercel`, `*.pem` |
| `CLAUDE.md` (raiz) | **só adições**: na seção Stack, linha "Doc do Next 16 desta versão: `node_modules/next/dist/docs/` (leia antes de usar API nova)"; na seção Comandos, `npm run build`, `npm run format`, `npm run test:watch` e a nota de que o E2E usa o Chromium do Playwright 1.63 |

Não tocar: `mock-api/**`, `src/**/CLAUDE.md`, `.claude/**`, `docs/TEST_*.md`, `README.md` (F7).

## Tarefas

Cada tarefa = 1 commit Conventional Commits com escopo `setup`, **sem** qualquer atribuição de IA
(regra do `CLAUDE.md`). Comandos de verificação ao fim de cada uma.

1. `chore(setup): add package manifest with pinned dependencies`
   `.npmrc`, `.nvmrc`, `package.json` (scripts já declarados, deps da decisão 2, `engines`, `overrides`),
   `package-lock.json`, ajustes do `.gitignore`.
   Prova: `npm ci && npm ls --depth=0` (crit. 1, 2, 14) e checagens do crit. 13 para `.gitignore`.
2. `chore(setup): scaffold next app router with strict typescript`
   `tsconfig.json`, `next.config.ts` (só `poweredByHeader` e `agentRules` por ora), `postcss.config.mjs`,
   `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`.
   Prova: `npm run typecheck && npm run build` (crit. 3, 9) e crit. 16.
3. `chore(setup): add security headers and remote image patterns`
   `headers()` e `images.remotePatterns` no `next.config.ts`.
   Prova: `npm run build && npm run start` + `curl -sI` (crit. 10).
4. `chore(setup): configure biome with architecture boundaries`
   `biome.json`; rodar `npm run format` uma vez para normalizar os arquivos existentes.
   Prova: `npm run lint` (crit. 4) + arquivos temporários do crit. 5 + crit. 6.
5. `test(setup): configure vitest with testing library and path alias`
   `vitest.config.mts`, `vitest.setup.ts`, `src/shared/lib/cn.ts`, `cn.test.ts`, `src/app/page.test.tsx`,
   `tests/next-config.test.ts`.
   Prova: `npm run test` (crit. 7, 8) + `npm run typecheck && npm run lint`.
6. `test(setup): add playwright smoke test with axe`
   `playwright.config.ts`, `e2e/smoke.spec.ts`.
   Prova: `npm run test:e2e` (crit. 11, 12).
7. `chore(setup): add env example`
   `.env.example`.
   Prova: crit. 13.
8. `docs(setup): document commands and bundled next docs in claude.md`
   Adições ao `CLAUDE.md` raiz (tabela "Alterados").
   Prova: crit. 15 e 17; rodar a sequência final
   `npm ci && npm run typecheck && npm run lint && npm run test && npm run build && npm run test:e2e`.

## Plano de testes

**Unit (Vitest, `node`/jsdom)**
- `src/shared/lib/cn.test.ts`: `cn("p-2", "p-4") === "p-4"`; valores falsy/`undefined` ignorados;
  importa por `@/shared/lib/cn` (prova o alias no Vitest).
- `tests/next-config.test.ts`: importa o default de `next.config.ts`; asserta `poweredByHeader === false`,
  `agentRules === false`, os dois hostnames em `remotePatterns` com `protocol: "https"`, e que
  `await headers()` retorna `source: "/:path*"` com os 4 headers. Sem `as`: estreitar com checagens
  (`expect(x).toBeDefined()` + `if`) ou um schema Zod pequeno local ao teste.

**Componente (Vitest + RTL + jsdom)**
- `src/app/page.test.tsx`: renderiza `HomePage`, encontra `heading` nível 1 "Infotera Hotéis" com
  `toBeInTheDocument()` (prova `@vitejs/plugin-react` + jsdom + jest-dom). A F2 substitui este teste
  quando trocar a página.

**E2E (Playwright, Chromium 1243)**
- `e2e/smoke.spec.ts` em `desktop-chromium` e `mobile-chromium`: status 200, headers, `lang`, `title`,
  `h1`, axe `wcag2a`+`wcag2aa` sem violações, e sem overflow horizontal em 320px
  (`page.setViewportSize({ width: 320, height: 640 })` + `scrollWidth <= clientWidth`).
- Cenários `_delay`/`_fail` da API: **não se aplicam** (F0 não consome a API).

**Negativos manuais (não versionados)**: arquivos temporários do critério 5 para provar que o lint
falha.

## Riscos

| Risco | Mitigação |
|---|---|
| `next dev`/`next build` reescrever `tsconfig.json` (adiciona `include`/`plugins` que faltarem) | Partir exatamente do `tsconfig` do template 16.4.6 (validado: build não alterou o arquivo). Se reescrever, commitar o que o Next exigir e registrar. |
| `next dev` criar `AGENTS.md` | `agentRules: false` (validado no protótipo); critério 16. |
| Peer do `@axe-core/playwright` puxar `playwright-core` latest e quebrar tipos (`Page` incompatível) | `overrides.playwright-core = 1.63.0` (erro reproduzido e corrigido no protótipo). Ao subir o Playwright, subir os dois juntos. |
| Em outra máquina/CI não há Chromium 1243 | `npx playwright install chromium` (documentar no README da F7). Não usar `executablePath` fixo no config. |
| Node < 22.22.2 (jsdom 31) | `engines` + `.nvmrc`; Vercel usa Node 22.x recente. |
| `noRestrictedImports` não cobre import relativo atravessando features (`../../checkout/...`) | Revisão do `reviewer`; se aparecer, adicionar padrão `**/features/*/**` relativo na F1. |
| `noDefaultExport` bloquear arquivos de convenção novos do Next (`not-found`, `opengraph-image`, `sitemap.ts`, `route.ts`…) | A lista do override cresce conforme a feature cria o arquivo; a regra continua valendo para componentes. |
| `next build` checa tipos do projeto inteiro (incluindo `e2e/` e `tests/`) | Desejado: tudo tipado. Manter `tsconfig` cobrindo esses diretórios. |
| `next typegen` carrega `next.config.ts` em fase de produção | Config não lê env; nada a configurar. Se a F1 validar env no config, garantir fallback ou `.env` no CI. |
| TS 5.9 ficar defasado frente ao 7 | Decisão 3 registrada; troca é isolada (`typescript` + rodar `typecheck`). |
