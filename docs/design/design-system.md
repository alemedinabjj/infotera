# Design system — Infotera Hotéis

Referência prática para implementar `src/shared/ui` e todas as telas. Se algo não estiver aqui,
**não invente**: peça ao `ui-designer` para incluir.

Produto: busca e reserva de hotéis no Brasil (pt-BR, BRL). Usuário típico: no celular, com pressa,
comparando preço e datas. Personalidade visual: **limpa, clara e confiável**. Azul profundo como cor de
ação, fundo levemente acinzentado, cards brancos, preço sempre em destaque e legível.

## 0. Princípios

1. **Mobile-first, 320px é o mínimo.** Nada de scroll horizontal, nada cortado. Estilo base = celular;
   `sm:`/`md:`/`lg:` só acrescentam.
2. **Preço e condições nunca escondidos.** Preço total, noites e política de cancelamento visíveis
   antes de qualquer botão de compromisso.
3. **Uma ação primária por tela** (um único `Button variant="primary"` visível por contexto).
4. **Erro perto de onde aconteceu**, dizendo como resolver. Toast nunca é o único canal de um erro.
5. **Sem layout shift**: skeleton com a mesma geometria do conteúdo, imagens com `aspect-ratio` fixo,
   espaço de mensagem de erro não empurra layout de forma brusca (ver `Field`).
6. **Consistência acima de criatividade**: só tokens deste arquivo. Proibido hex solto e valor arbitrário
   (`mt-[13px]`, `text-[#333]`) em componente. Exceções permitidas: `env(safe-area-inset-*)`,
   `dvh` e `calc()` de geometria listados neste arquivo.

---

## 1. Tokens

### 1.1 Cores (tema claro)

Razões calculadas com a fórmula de luminância relativa do WCAG 2.2. Requisitos: texto normal ≥ 4.5:1,
texto grande (≥ 24px ou ≥ 18.66px bold) e componentes/bordas de controle ≥ 3:1.

Superfícies:

| Token (classe) | Hex | Uso |
|---|---|---|
| `canvas` (`bg-canvas`) | `#F4F6F9` | Fundo da página (`body`) |
| `surface` (`bg-surface`) | `#FFFFFF` | Cards, header, dialogs, inputs |
| `surface-sunken` (`bg-surface-sunken`) | `#E9EDF2` | Skeleton, botão desabilitado, trilha de stepper, chips neutros |
| `overlay` (`bg-overlay`) | `#0F1B2D` a 60% (`bg-overlay/60`) | Scrim atrás de Dialog/Drawer |

Texto:

| Token | Hex | sobre `surface` | sobre `canvas` | sobre `surface-sunken` | Uso |
|---|---|---|---|---|---|
| `fg` (`text-fg`) | `#0F1B2D` | **17.28** | 15.96 | 14.70 | Texto principal, títulos, preço |
| `fg-muted` (`text-fg-muted`) | `#4A5568` | **7.53** | 6.95 | 6.40 | Texto secundário, descrições, labels auxiliares |
| `fg-subtle` (`text-fg-subtle`) | `#5F6B7A` | **5.43** | 5.01 | 4.61 | Metadados (ex.: "por noite", "120 avaliações"), placeholder, texto desabilitado |
| `fg-on-primary` (`text-fg-on-primary`) | `#FFFFFF` | — | — | — | Texto sobre `primary` (6.67) |

Marca / ação:

| Token | Hex | Razão | Uso |
|---|---|---|---|
| `primary` | `#0B5CAD` | 6.67 vs branco · 6.16 vs canvas · 5.67 vs sunken | Botão primário, links, foco, seleção, ícone ativo |
| `primary-hover` | `#094A8C` | 8.86 vs branco | Hover do primário e de links |
| `primary-active` | `#073B70` | 11.24 vs branco | Pressionado |
| `primary-soft` | `#E8F1FB` | `primary` sobre ele: 5.85 | Fundo de item selecionado, badge info, opção ativa do combobox |

Feedback (texto e borda sobre fundo branco e sobre o fundo "soft" do próprio status):

| Token | Hex | vs branco | Soft (bg) | texto vs soft | Uso |
|---|---|---|---|---|---|
| `danger` | `#B42318` | 6.57 | `danger-soft` `#FEF3F2` | 6.05 | Erro de campo, borda inválida, "Esgotado", ação destrutiva |
| `success` | `#067647` | 5.69 | `success-soft` `#ECFDF3` | 5.40 | "Cancelamento grátis", reserva confirmada, validação ok |
| `warning` | `#93370D` | 7.52 | `warning-soft` `#FFFAEB` | 7.21 | Escassez ("Apenas 2 quartos!"), avisos de atenção |
| `info` | = `primary` | 6.67 | = `primary-soft` | 5.85 | Dicas e avisos neutros |

Bordas e outros:

| Token | Hex | Razão | Uso |
|---|---|---|---|
| `border` | `#D3D9E1` | 1.42 (decorativa) | Divisores, contorno de card. **Nunca** sozinha como limite de controle |
| `border-strong` | `#7D8797` | 3.63 vs branco · 3.35 vs canvas · 3.09 vs sunken | Borda de Input/Select/Checkbox/Radio/Stepper (≥ 3:1 exigido para controles) |
| `focus` | = `primary` `#0B5CAD` | 6.67 vs branco · 6.16 vs canvas | Anel de foco (`outline` 2px, offset 2px) |
| `star` | `#D97706` | 3.19 vs branco | Preenchimento das estrelas. Decorativo (a nota sempre aparece em texto) |
| `star-empty` | `#D3D9E1` | — | Estrela vazia (decorativa) |

Regras:
- Cor nunca é o único sinal: erro tem ícone + texto, esgotado tem texto, selecionado tem check/borda.
- Texto colorido (`danger`, `success`, `warning`, `primary`) só sobre `surface`, `canvas` ou o próprio `*-soft`.
- Botão destrutivo: texto branco sobre `danger` = 6.57. Sobre `success` = 5.69.
- Texto sobre foto: sempre com faixa de `overlay/60` por baixo, nunca direto na imagem.
- Sobre fundo escuro (`bg-fg`, só no lightbox) o anel de foco é branco
  (`focus-visible:outline-fg-on-primary`, 17.28:1): `primary` sobre `fg` dá 2.59:1, abaixo de 3:1.
  Texto sobre `bg-fg` = `text-fg-on-primary` (17.28:1).
- Linha destacada em tabela (`bg-primary-soft`): `fg` 15.16:1 · `fg-muted` 6.61:1 · `fg-subtle`
  4.76:1 · ícone `success` 4.99:1.

**Tema escuro:** fora do escopo (⏭️). Os tokens são semânticos, então seria só redefinir as variáveis
dentro de `@media (prefers-color-scheme: dark)`. Não implementar agora; declare `color-scheme: light`.

### 1.2 Tipografia

Fonte: **Inter** (Google Fonts, via `next/font/google`, variável, `subsets: ["latin"]`, `display: "swap"`).
Tem algarismos tabulares (`tnum`), ótima legibilidade em tela pequena e cobre acentos do pt-BR.
Fallback: `ui-sans-serif, system-ui, sans-serif`.

Escala (usa os utilitários padrão do Tailwind 4, sem sobrescrever):

| Classe | Tamanho / altura de linha | Uso |
|---|---|---|
| `text-xs` | 12 / 16 | Só Badge e texto legal curto. Nunca para informação essencial |
| `text-sm` | 14 / 20 | Metadados, descrições de campo, erros de campo, breadcrumb |
| `text-base` | 16 / 24 | Corpo, **todos os inputs** (16px evita zoom no iOS), botões `md` |
| `text-lg` | 18 / 28 | `h3`, nome do hotel no card, botões `lg` |
| `text-xl` | 20 / 28 | `h2` de seção, preço no card |
| `text-2xl` | 24 / 32 | `h1` no mobile, preço total |
| `text-3xl` | 30 / 36 | `h1` a partir de `lg` |

Pesos: `font-normal` (400) corpo · `font-medium` (500) labels, botões, links · `font-semibold` (600)
títulos `h2`/`h3`, nome do hotel · `font-bold` (700) `h1` e preços.

Regras:
- **Todo número que se compara** (preço, total, noites, datas, contagem de páginas, nota) usa `tabular-nums`.
- Um `h1` por página. Hierarquia sem pular nível.
- Títulos longos (nome de hotel até ~34 caracteres) quebram linha; no card, `line-clamp-2`. Nunca `truncate`
  em preço.
- Comprimento de linha de texto corrido: `max-w-prose`.

### 1.3 Espaçamento

Escala de 4px (padrão do Tailwind 4: `--spacing: 0.25rem`, `p-1` = 4px). Passos permitidos:
`0.5 (2px, só em ajuste de ícone)`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`.

| Contexto | Valor |
|---|---|
| Gap entre ícone e texto | `gap-2` (8px) |
| Padding interno de controles | `px-3`/`px-4` |
| Gap entre campos de formulário | `gap-4` (16px) mobile, `gap-5` desktop |
| Padding de card | `p-4` mobile, `p-5` ≥ `md` |
| Gap entre cards | `gap-4` mobile, `gap-6` ≥ `lg` |
| Espaço entre seções da página | `gap-8` mobile, `gap-12` ≥ `lg` |
| Margem lateral da página | `px-4` mobile, `px-6` ≥ `md`, `px-8` ≥ `xl` |

### 1.4 Raios

| Token (classe) | Valor | Uso |
|---|---|---|
| `rounded-control` | 8px | Button, Input, Select, Stepper, IconButton, opções do combobox |
| `rounded-card` | 12px | Card, imagens de card, Alert, Toast |
| `rounded-dialog` | 16px | Dialog, topo do Drawer bottom-sheet |
| `rounded-full` | — | Badge, avatar, Radio (Checkbox usa `rounded-sm` = 4px) |

### 1.5 Sombras

| Token (classe) | Valor | Uso |
|---|---|---|
| `shadow-card` | `0 1px 2px rgb(15 27 45 / 0.06), 0 1px 3px rgb(15 27 45 / 0.10)` | Card em repouso |
| `shadow-raised` | `0 4px 12px rgb(15 27 45 / 0.10), 0 2px 4px rgb(15 27 45 / 0.06)` | Hover de card clicável, popover do combobox, barra fixa inferior |
| `shadow-overlay` | `0 16px 40px rgb(15 27 45 / 0.20)` | Dialog, Drawer, Toast |

Sombra nunca é o único limite de um elemento: card também tem `border border-border`.

### 1.6 Breakpoints

Padrão do Tailwind 4 (não sobrescrever):

| Prefixo | Mín. | Mudança típica |
|---|---|---|
| (base) | 0 / **320** | 1 coluna, barra de ação fixa no rodapé, filtros em Drawer |
| `sm` | 640 | Campos lado a lado (datas), card horizontal |
| `md` | 768 | Grid 2 colunas onde couber |
| `lg` | 1024 | Layout com coluna lateral (filtros/resumo), sem barra fixa inferior |
| `xl` | 1280 | Container chega ao máximo (`max-w-6xl`) |

Testar sempre em 320, 375, 768 e 1280.

### 1.7 Camadas (z-index)

| Camada | Classe |
|---|---|
| Conteúdo | `z-0` |
| Popover do combobox | `z-10` |
| Header sticky | `z-20` |
| Barra de ação fixa (mobile) | `z-30` |
| Toasts | `z-50` |

Dialog e Drawer usam `<dialog>` nativo com `showModal()`: vão para a *top layer* e dispensam z-index.
Toasts precisam ficar acima de um Dialog aberto: renderize o `Toaster` como `popover="manual"` (também
top layer) ou aceite que, com modal aberto, o feedback vai inline dentro do dialog (preferido).

### 1.8 Motion

| Token | Valor | Uso |
|---|---|---|
| `duration-150` | 150ms | Hover, cor, borda, foco |
| `duration-200` | 200ms | Abrir popover, fade de toast |
| `duration-300` | 300ms | Dialog/Drawer entrando |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Entradas |
| `ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | Saídas |
| `animate-fade-in` | opacity 0→1, 200ms | Popover, scrim |
| `animate-slide-up` | translateY(16px)→0 + fade, 300ms | Toast, Drawer bottom-sheet, Dialog no mobile |
| `animate-slide-in-right` | translateX(100%)→0, 300ms | Drawer lateral (≥ `lg`) |
| `animate-pulse` / `animate-spin` | padrão do Tailwind | Skeleton / Spinner |

`prefers-reduced-motion: reduce`: regra global zera animações e transições (bloco no §2). Skeleton
fica estático, spinner para (por isso Spinner **sempre** vem com texto). Nada de parallax ou auto-play.

---

## 2. Tema do Tailwind (copiar para `src/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* Fonte (a variável --font-inter vem do next/font no layout) */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;

  /* Superfícies */
  --color-canvas: #f4f6f9;
  --color-surface: #ffffff;
  --color-surface-sunken: #e9edf2;
  --color-overlay: #0f1b2d;

  /* Texto */
  --color-fg: #0f1b2d;
  --color-fg-muted: #4a5568;
  --color-fg-subtle: #5f6b7a;
  --color-fg-on-primary: #ffffff;

  /* Marca */
  --color-primary: #0b5cad;
  --color-primary-hover: #094a8c;
  --color-primary-active: #073b70;
  --color-primary-soft: #e8f1fb;

  /* Feedback */
  --color-danger: #b42318;
  --color-danger-soft: #fef3f2;
  --color-success: #067647;
  --color-success-soft: #ecfdf3;
  --color-warning: #93370d;
  --color-warning-soft: #fffaeb;
  --color-info: #0b5cad;
  --color-info-soft: #e8f1fb;

  /* Bordas e outros */
  --color-border: #d3d9e1;
  --color-border-strong: #7d8797;
  --color-focus: #0b5cad;
  --color-star: #d97706;
  --color-star-empty: #d3d9e1;

  /* Raios */
  --radius-control: 0.5rem;
  --radius-card: 0.75rem;
  --radius-dialog: 1rem;

  /* Sombras */
  --shadow-card: 0 1px 2px rgb(15 27 45 / 0.06), 0 1px 3px rgb(15 27 45 / 0.1);
  --shadow-raised: 0 4px 12px rgb(15 27 45 / 0.1), 0 2px 4px rgb(15 27 45 / 0.06);
  --shadow-overlay: 0 16px 40px rgb(15 27 45 / 0.2);

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);
  --animate-fade-in: fade-in 200ms var(--ease-standard);
  --animate-slide-up: slide-up 300ms var(--ease-standard);
  --animate-slide-in-right: slide-in-right 300ms var(--ease-standard);

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(1rem); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-in-right {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
}

@layer base {
  :root {
    color-scheme: light;
  }

  body {
    background-color: var(--color-canvas);
    color: var(--color-fg);
    font-family: var(--font-sans);
  }

  /* Foco visível padrão para tudo que é focável por teclado */
  :focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  ::selection {
    background-color: var(--color-primary-soft);
    color: var(--color-fg);
  }

  dialog::backdrop {
    background-color: rgb(15 27 45 / 0.6);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

Classes geradas: `bg-canvas`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-border-strong`,
`bg-primary`, `hover:bg-primary-hover`, `bg-danger-soft`, `rounded-control`, `rounded-card`,
`shadow-card`, `ease-standard`, `animate-slide-up` etc.

Fonte no `src/app/layout.tsx`:

```tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

// <html lang="pt-BR" className={inter.variable}>
//   <body className="min-h-dvh antialiased">…</body>
```

---

## 3. Ícones e imagens

- **Ícones:** SVG inline em `shared/ui/icons/` (sem nova dependência), traço 1.5–2px, `viewBox="0 0 24 24"`,
  `currentColor`, tamanhos `size-4` (16) em texto pequeno, `size-5` (20) padrão, `size-6` (24) em IconButton.
  Decorativo → `aria-hidden="true"`. Ícone sozinho como controle → o controle tem `aria-label`.
  Conjunto mínimo: `search`, `map-pin`, `calendar`, `user`, `bed`, `star`, `chevron-left/right/down`,
  `x`, `plus`, `minus`, `check`, `alert-circle`, `info`, `check-circle`, `wifi-off`, `filter`,
  `share`/`link`, `arrow-left`. Comodidades: um ícone por `Amenity` com fallback `check`.
  Tipos de destino (F2, opções do combobox): `building` (city), `umbrella` (beach), `palm-tree` (island),
  `trees` (nature) — traços no estilo Lucide. `history` (relógio com seta) para "Buscas recentes".
  Checkout (F5): `credit-card` (cartão), `lock` (nota de privacidade), `tag` (cupom).
- **Imagens:** `next/image` sempre com `aspect-ratio` fixo no container (`aspect-[4/3]` no card,
  `aspect-video` no hero da galeria), `object-cover`, `sizes` correto, `bg-surface-sunken` enquanto carrega.
  `alt` = nome do hotel + contexto ("Hotel Copacabana Palace, foto 2 de 8"). Imagem quebrada → manter o
  bloco cinza com ícone `bed` centralizado (sem layout shift).
  Galeria do hotel (F4): `< sm` só a foto principal `aspect-video`; `≥ sm` grade `grid-cols-4
  grid-rows-2 gap-2 h-72 lg:h-96` (principal `col-span-2 row-span-2`, até 4 thumbs, grade se ajusta
  ao número de fotos sem buraco). "+N fotos" sobre o último thumb usa faixa `bg-overlay/60` com texto
  `text-fg-on-primary` (≥ 4.5:1 mesmo sobre foto branca). Foto dentro de botão: `alt=""` e o botão
  tem `aria-label` ("Abrir foto 2 de 5"). Avatar de pessoa: `alt=""` (o nome está ao lado).

---

## 4. Padrões de layout

### 4.1 Container

```
<div class="mx-auto w-full max-w-6xl px-4 md:px-6 xl:px-8">
```
`max-w-6xl` = 1152px. Formulários estreitos (checkout): conteúdo em `max-w-2xl` dentro do grid.

### 4.2 Header (todas as páginas)

```
320px                                   ≥1024px
┌──────────────────────────────┐        ┌───────────────────────────────────────────────┐
│ [logo] Infotera Hotéis       │        │ [logo] Infotera Hotéis        (resumo busca)  │
└──────────────────────────────┘        └───────────────────────────────────────────────┘
```
- `<header>` com `bg-surface border-b border-border`, altura 56px (`h-14`) mobile / 64px (`lg:h-16`),
  `sticky top-0 z-20`.
- Logo = link para `/` com texto visível "Infotera Hotéis" (`font-bold text-lg text-fg`); no ≤ 360px pode
  mostrar só "Infotera" mas o link mantém `aria-label="Infotera Hotéis, página inicial"`.
- Primeiro item focável da página: link "Pular para o conteúdo" (`sr-only focus:not-sr-only`) apontando
  para `<main id="conteudo">`.
- O resumo da busca **não** vai no header global (F3: o header é do layout raiz). Fica no topo da
  página de resultados, com o disclosure "Alterar busca" (§5.2 Disclosure).

### 4.3 Estrutura da página

```
<header/>  <main id="conteudo" class="container py-6 lg:py-10">  <footer/>
```
- Footer simples: `text-sm text-fg-muted`, "Projeto de demonstração. Nenhuma cobrança real é feita."
- Página com sidebar (resultados com filtros, checkout com resumo): `lg:grid lg:grid-cols-[18rem_1fr] gap-8`
  (filtros à esquerda) ou `lg:grid-cols-[1fr_22rem]` (resumo à direita).
  No mobile, a sidebar vira Drawer (filtros) ou bloco colapsável acima do formulário (resumo).
- **Checkout (F5):** o resumo vem **antes** do formulário no DOM em todas as larguras (o que estou
  comprando → meus dados). No `lg+` vai para a direita por `lg:col-start-2 lg:row-start-1
  lg:row-span-2` (nunca `order-*`), com `lg:sticky lg:top-24 lg:self-start
  lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto` (exceção de geometria permitida). Abaixo de `lg`, o
  resumo é um cartão com identidade, datas, hóspedes e cancelamento sempre à vista e um toggle "Ver
  detalhes da reserva" para o resto. Formulário em `max-w-2xl` dentro de um `Card static`.

### 4.4 Grid de cards de hotel

- Mobile (base): lista de 1 coluna, card vertical (imagem em cima `aspect-[4/3]`).
- `sm` a `lg`: card **horizontal** (imagem à esquerda `w-56`, conteúdo à direita) em 1 coluna — leitura de
  lista de resultados é mais rápida que grid para comparar preço.
- Lista sempre `<ul role="list">` com `<li>` por card; contagem de resultados acima em `aria-live="polite"`.
- No card horizontal, a foto estica até a altura do card: `sm:w-56 sm:shrink-0 sm:aspect-auto
  sm:min-h-42` (168px = 4:3 de 224px; exceção de geometria permitida) com `object-cover`.

**Toolbar de resultados (F3)** — acima da lista, altura estável em todos os estados:
```
14 hotéis encontrados                 ← h2 text-xl font-semibold min-h-7, tabIndex=-1 (alvo de foco)
Mostrando 1–10 de 14                  ← linha de status min-h-5 text-sm text-fg-muted tabular-nums
[⚲ Filtros (2)] [Mais populares ▾]    ← < lg: grid-cols-[auto_1fr] gap-3 items-end; ≥ lg: Filtros some,
                                         "Ordenar por" vira label inline à direita (select w-56)
```
- A **linha de status** troca de texto, nunca de altura: `Mostrando 1–10 de 14` ↔ `Spinner` +
  `Atualizando resultados…` ↔ `Carregando hotéis…` ↔ `Está demorando mais que o normal…`.
- O anúncio para leitor de tela é um `<p class="sr-only" aria-live="polite">` **separado** do h2 (o h2
  recebe foco; se fosse live, leria duas vezes).
- Lista "velha" durante a troca (placeholder): `opacity-60 transition-opacity` + `aria-busy="true"`,
  continua clicável. Se a troca falhar/ficar offline, a lista velha sai (nunca mostrar resultado que
  não corresponde aos filtros marcados).

### 4.5 Barra de ação fixa (mobile)

Para a ação primária do **checkout** abaixo de `lg` (F5). O detalhe do hotel **não** usa barra fixa
(F4): antes de escolher o quarto não há total para mostrar e ela só repetiria "Ver quartos", que está
no topo; também cobriria os toasts.
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

### 4.6 Página longa com seções (detalhe do hotel, F4)

- Seções empilhadas `flex flex-col gap-8 lg:gap-12`, cada uma `<section id aria-labelledby>` com h2
  `text-xl font-semibold`. O h2 fica fora de Suspense/boundary (âncora estável).
- Navegação por âncoras (`SectionNav`): `<nav aria-label="Seções da página">` **estática** (não
  sticky: um segundo elemento sticky somaria com o header e esconderia o foco), `border-y
  border-border`, `<ul class="flex gap-1 overflow-x-auto py-1">`, links com `buttonClassName({ variant:
  "ghost", size: "sm" })` + `shrink-0 whitespace-nowrap`. No celular rola na horizontal dentro de si
  (não esconder a scrollbar); o rótulo de cada link é igual ao h2 da seção.
- Âncoras dependem do `scroll-padding-top` global; `scroll-behavior: smooth` só sem
  `prefers-reduced-motion`.
- Ordem DOM = ordem visual em todas as larguras (nada de `order-*` para reordenar blocos).

---

## 5. Componentes

Convenções para todos:
- Ficam em `src/shared/ui/{atoms,molecules,organisms}/`, `const Nome = (props) => …`, named export,
  aceitam `className` mesclado com `cn()`. Repassam `ref` (React 19: `ref` como prop) e `...rest` nativo.
- **Alvo de toque mínimo 44×44px** em tudo que é clicável (usar `min-h-11`/`size-11`; se o visual for
  menor, aumentar a área com padding ou pseudo-elemento).
- Estados obrigatórios: default, hover, `focus-visible` (anel global), active, disabled e, quando aplicável,
  loading e erro. Transições `transition-colors duration-150`.
- Sem texto de negócio dentro de `shared/ui`: textos chegam por props (com defaults genéricos em pt-BR
  só para `aria-label` estrutural, ex.: "Fechar").

### 5.1 Atoms

#### Button
`<button>` (ou `<Link>` via prop `asChild`/componente `ButtonLink` com o mesmo estilo).

| Variante | Default | Hover | Active | Uso |
|---|---|---|---|---|
| `primary` | `bg-primary text-fg-on-primary` | `bg-primary-hover` | `bg-primary-active` | A ação principal (Buscar, Selecionar, Confirmar reserva) |
| `secondary` | `bg-surface text-primary border border-primary` | `bg-primary-soft` | `bg-primary-soft border-primary-active` | Ação alternativa (Ver quartos, Voltar, Tentar de novo) |
| `ghost` | `text-primary` sem borda | `bg-primary-soft` | `bg-primary-soft` | Ação terciária (Limpar filtros, Ver mais) |
| `danger` | `bg-danger text-fg-on-primary` | `brightness-95` | `brightness-90` | Destrutivo confirmado (raro) |

| Tamanho | Altura | Texto | Padding |
|---|---|---|---|
| `sm` | 36px visual, área 44px | `text-sm` | `px-3` |
| `md` (padrão) | 44px (`h-11`) | `text-base font-medium` | `px-4` |
| `lg` | 48px (`h-12`) | `text-lg font-semibold` | `px-6` |

- Props: `variant`, `size`, `fullWidth` (`w-full`, padrão no mobile para a ação primária), `loading`,
  `leftIcon`, `rightIcon`.
- **Disabled:** `bg-surface-sunken text-fg-subtle border-transparent cursor-not-allowed` (todas as
  variantes). Ação bloqueada por regra (esgotado, quarto pequeno para a busca) usa **`aria-disabled`**
  com esse visual, nunca `disabled` (mantém o foco), e o **motivo em texto visível** acima do botão,
  ligado por `aria-describedby`, dizendo como resolver. Para formulário inválido, **não desabilite o
  submit**: deixe enviar e mostre os erros.
- **Loading:** mantém a largura (sem shift), troca o ícone esquerdo por `Spinner` e o texto pelo
  `loadingText` ("Confirmando…"), `aria-busy="true"`, `aria-disabled="true"` e ignora cliques (não usar
  `disabled`, que tira o foco).
- Texto sempre verbo + objeto: "Buscar hotéis", "Selecionar quarto", "Confirmar reserva".

#### IconButton
Botão só com ícone. `size-11` (44px), ícone `size-6`, `rounded-control`. Variantes `ghost` (padrão:
`text-fg-muted hover:bg-surface-sunken hover:text-fg`) e `secondary` (com borda `border-strong`).
Variante `overlay` para sobre imagem: `bg-surface/90 text-fg shadow-card`. **`aria-label` obrigatório**
(tipado como prop requerida). Ex.: "Fechar", "Foto anterior", "Copiar link".

#### Input
- `h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-base text-fg`
  `placeholder:text-fg-subtle`.
- Hover: `border-fg-muted`. Focus: anel global + `border-primary`.
- Erro (`aria-invalid="true"`): `border-danger` e, no foco, `outline-danger`.
- Disabled: `bg-surface-sunken text-fg-subtle cursor-not-allowed`. Read-only: `bg-canvas`.
- Slots opcionais `startIcon` (ex.: `map-pin`, `search`) e `endSlot` (spinner do combobox, botão limpar),
  com `pl-10`/`pr-10`.
- Sempre `type` e `autoComplete` corretos (`email`, `tel`, `name`, `cc-number`, `cc-exp`, `cc-csc`) e
  `inputMode` (`numeric` para CPF/cartão, `tel` para telefone). Placeholder é exemplo, nunca label.
- **Máscara** (telefone, CPF, cartão, validade): formatação a cada tecla por função pura que devolve
  `{ value, caret }` (o cursor nunca pula ao apagar no meio; colar texto formatado funciona). Sem
  `maxLength` (quebra o colar); o excesso de dígitos é descartado pela máscara. Placeholder = formato ou
  exemplo (`MM/AA`, `000.000.000-00`, `(11) 98765-4321`).
- `autoComplete` do checkout: `given-name`, `family-name`, `email`, `tel-country-code`, `tel-national`,
  `cc-number`, `cc-name`, `cc-exp`, `cc-csc`; `off` em documento, cupom, idade e nomes de
  acompanhantes (evita repetir o titular). CVV é `type="text" inputMode="numeric"`, nunca `password`.

#### Select
`<select>` nativo (acessível e bom no mobile) com o mesmo visual do Input, `appearance-none` e ícone
`chevron-down` à direita (`pointer-events-none`). Uso: ordenação, nota mínima. Mesmos estados do Input.

#### Checkbox
`<input type="checkbox">` nativo estilizado com `accent-primary` **ou** custom: caixa `size-5 rounded-sm
border-2 border-border-strong`, marcada `bg-primary border-primary` com `check` branco. Label clicável
ao lado, área total da linha ≥ 44px (`min-h-11 flex items-center gap-3`). Estados: hover (borda `fg-muted`),
focus (anel na caixa), disabled, erro (`border-danger` + mensagem do Field). Uso: comodidades, tipo de
propriedade, aceite dos termos. Grupo → `<fieldset>` + `<legend>`.

#### Radio
Igual ao Checkbox com `rounded-full`, ponto interno `size-2.5 bg-primary`. Grupo sempre em `<fieldset>`
com `<legend>`; setas navegam (nativo). Variante `card`: o rótulo inteiro é um card selecionável
(`border border-border rounded-card p-4`, selecionado `border-primary bg-primary-soft` + check) — uso
em escolhas com descrição (ex.: forma de pagamento simulada, se houver).

#### Badge
Pílula `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold`, ícone `size-3.5`
opcional.

| Tom | Classes | Exemplos |
|---|---|---|
| `neutral` | `bg-surface-sunken text-fg-muted` | "Pousada", "Resort", "Hotel" |
| `info` | `bg-primary-soft text-primary` | "Destaque" (`featured`) |
| `success` | `bg-success-soft text-success` | "Cancelamento grátis", "Hóspede verificado" |
| `warning` | `bg-warning-soft text-warning` | "Apenas 2 quartos!" |
| `danger` | `bg-danger-soft text-danger` | "Esgotado" |

Não é interativo. Se transmitir status crítico (esgotado), o texto do badge basta para o leitor de tela.

#### Stars / Rating
- `Stars`: 5 estrelas `size-4` (`star` preenchida, `star-empty` vazia, meia estrela por clip), **sempre
  `aria-hidden`**, acompanhadas de texto. Container com `role="img"` e `aria-label="Nota 4,6 de 5"`
  quando aparecer sozinho.
- `RatingScore` (molécula): `[4,6] ★★★★½ (1.234 avaliações)` → nota `font-semibold tabular-nums text-fg`,
  contagem `text-sm text-fg-subtle`. Nota com 1 casa decimal e vírgula (`formatRating`).
  Implementação (F3):
  ```
  4,8 ★★★★★ Excelente · 2.847 avaliações
  ```
  `flex flex-wrap items-center gap-x-2 gap-y-1`; nota `text-base font-semibold`, `Stars decorative`,
  rótulo `text-sm font-medium text-fg-muted` (`ratingLabel`), contagem `text-sm text-fg-subtle`
  precedida de `· ` (quebra para a linha de baixo em 320px). Nome acessível pela ordem do DOM com
  `sr-only`: "Nota 4,8 de 5, Excelente, 2.847 avaliações". Props: `rating`, `reviewCount`,
  `showLabel = true`, `size: "sm" | "md"` (`sm` = nota `text-sm`, para reviews na F4).
  `reviewCount` 0 → `Sem avaliações` (sem estrelas).
  `reviewCount` é opcional: omitido → sem contagem e sem rótulo qualitativo (uso: nota inteira de
  um comentário, `size="sm"`, visível `5 ★★★★★`, nome "Nota 5 de 5"; inteiros sem casa decimal).
- Notas são 0–5 (hotel com decimal, review inteiro). Rótulo qualitativo opcional: ≥ 4,5 "Excelente",
  ≥ 4,0 "Muito bom", ≥ 3,5 "Bom", abaixo "Regular" (função pura em `shared/lib`).

#### Skeleton
`div` com `bg-surface-sunken rounded-control animate-pulse`, `aria-hidden="true"`. Formas: `line`
(altura do `line-height` do texto que substitui, ex.: `h-4` para `text-sm`), `block` (com aspect-ratio
da imagem real), `circle` (avatar). O **container** da região tem `aria-busy="true"` e um texto `sr-only`
em `aria-live="polite"` ("Carregando hotéis…"). Cada feature monta o skeleton com a mesma geometria do
conteúdo final (ex.: `HotelCardSkeleton`).

#### Spinner
SVG `animate-spin` `size-4`/`size-5`, `currentColor`, `aria-hidden`. Sempre ao lado de texto visível ou
`sr-only` ("Carregando…"). Usar só para ações curtas (botão, combobox). Carregamento de seção = Skeleton.

#### Avatar
`size-10 rounded-full overflow-hidden bg-surface-sunken`, imagem `object-cover alt=""`. Imagem
quebrada/ausente: iniciais (até 2 letras) `text-sm font-semibold text-fg-muted` centralizadas (6.40:1).
Sempre ao lado do nome em texto. Nasce na F4 (comentários).

#### PriceTag
Mostra dinheiro com `formatBRL` (de `shared/lib/currency`), `tabular-nums`, `whitespace-nowrap` no valor.

| Variante | Visual | Uso |
|---|---|---|
| `nightly` | `a partir de` (`text-sm text-fg-subtle`) / **R$ 890** (`text-xl font-bold`) / `por noite` | Card de resultado, "a partir de" no detalhe |
| `total` | **R$ 2.670,00** (`text-2xl font-bold`) / `total · 3 noites · 1 quarto` (`text-sm text-fg-muted`) | Barra fixa, resumo do checkout, confirmação |
| `line` | label à esquerda, valor à direita (`flex justify-between`) | Linhas do breakdown (diárias, taxas) |
| `nightly-inline` | `a partir de` (`text-sm text-fg-subtle`) **R$ 800** (`text-2xl font-bold`) `por noite` (`text-sm text-fg-muted`) numa linha `flex flex-wrap items-baseline gap-x-1` | "a partir de" no topo do detalhe do hotel |
| `stay` com `exactNightly` | igual ao total do card, mas a 3ª linha é `R$ 1.200 por noite` (sem "a partir de") | Card de quarto (o preço do quarto é exato) |
| `room-nightly` | **R$ 1.200** (`text-xl font-bold`) / `por noite`, alinhado à direita | Card de quarto sem datas |

- Leitura por leitor de tela como frase: `aria-label` não é necessário se a ordem do DOM já for
  "a partir de R$ 890 por noite". Não quebrar o valor com elementos que separem "R$" do número.
- Valores longos (até `R$ 300.000,00`) cabem em 320px: o rótulo quebra para a linha de baixo, o valor nunca.
- Quando há datas na busca, o card mostra **também o total** da estadia: o usuário compara total, não
  diária. Nesse caso (F3) o **total vira o número grande** e a diária desce para linha secundária;
  nunca os dois no mesmo tamanho:
  ```
              R$ 540,00          ← text-xl font-bold (no card; text-2xl fora dele)
   total · 3 noites · 1 quarto   ← text-sm text-fg-muted
   a partir de R$ 180 por noite  ← text-sm text-fg-subtle
  ```
  Sem datas, vale a variante `nightly`. Alinhamento no card: `text-right`, embaixo à direita.
- Centavos: exibir sempre no total e no breakdown; no preço por noite do card pode omitir se for inteiro
  (`maximumFractionDigits: 0`), decidido por prop `compact`.

#### Range (slider)
`<input type="range">` nativo (teclado, toque e leitor de tela de graça). F3: filtro de preço.
- `h-11 w-full cursor-pointer accent-primary` (a altura dá o alvo de 44px; o polegar `primary` tem
  6.67:1 vs branco). Foco: anel global.
- Sempre com `<label>` visível acima e `aria-valuetext` formatado (`R$ 500`, `R$ 3.000 ou mais`).
- Faixa (mínimo e máximo) = **dois ranges empilhados** com labels `Mínimo`/`Máximo` dentro de um
  `fieldset`; um não ultrapassa o outro (para no valor do outro). Acima, resumo em texto
  `text-base font-semibold tabular-nums` com `aria-hidden` (os ranges já falam o valor).
  Proibido: dois polegares sobrepostos no mesmo trilho (alvo e foco frágeis).
- Commit com debounce (400ms); o resumo em texto atualiza na hora.

### 5.2 Molecules

#### Field
Wrapper que liga label, controle, descrição e erro.
```
Label do campo *            ← <label for> text-sm font-medium text-fg ("*" com sr-only "obrigatório")
[ controle               ]
Descrição/ajuda             ← text-sm text-fg-muted, id="<id>-description"
⚠ Mensagem de erro          ← text-sm text-danger com ícone alert-circle, id="<id>-error"
```
- Props: `label`, `description?`, `error?`, `required?`, `children` (render prop recebendo
  `{ id, "aria-describedby", "aria-invalid", "aria-required" }`) ou cópia via contexto.
- `aria-describedby` = descrição + erro (quando existir). `aria-invalid` só quando há erro.
- Erro aparece **depois** que o usuário sai do campo (`onBlur`) ou tenta enviar; em `onChange` só
  remove/atualiza um erro já visível (evita gritar enquanto digita). Isso vale mesmo com RHF `mode: "onChange"`
  (use `mode: "onTouched"` + `reValidateMode: "onChange"`, ou mostre só se `touched`).
- A mensagem de erro **não** é `aria-live` por campo (ruído). No submit com erro: foco vai para o
  primeiro campo inválido e um resumo de erros (`Alert` danger) no topo do form é anunciado.
- Sem shift brusco: erro empurra o conteúdo abaixo, mas entra com `animate-fade-in`; não reserve espaço vazio fixo.
- Opcional `optional` mostra "(opcional)" em `text-fg-subtle` em vez de marcar obrigatórios, quando a
  maioria dos campos for obrigatória (padrão do checkout).
- **Campo composto** (F5, telefone = país + número): `<fieldset>` com `<legend>` no estilo do label
  (`text-sm font-medium text-fg`), controles com `aria-label` ("País do telefone", "Número de
  telefone"), descrição e erro ligados ao controle principal (número). `< sm` empilhado; `sm+`
  `grid grid-cols-[10rem_1fr] gap-2`.
- Descrição que muda com o valor (ex.: `Bandeira: Visa`): conteúdo dentro de um `<span
  aria-live="polite">` sempre montado; textos alternados com o mesmo número de linhas (sem salto).

#### Stepper (número +/-)
```
Adultos                     [ − ]  2  [ + ]
A partir de 18 anos
```
- **Layout (regra anti-salto):** o fieldset é uma coluna. Linha 1 = `flex items-start justify-between`:
  label + descrição à esquerda, botões (`shrink-0`) alinhados **ao topo** à direita. O `hint` ocupa a
  **largura total abaixo da linha**, nunca na coluna estreita do label; assim, o hint aparecer/sumir/quebrar
  em 2–3 linhas não move os botões (decisão do orquestrador, F2).
- `IconButton secondary` 44px para − e +, valor central `w-8 text-center tabular-nums font-semibold`.
- Botão no limite fica `aria-disabled` (mantém o foco; clique ignorado; visual `text-fg-subtle`),
  nunca `disabled` — senão o foco some do botão que acabou de chegar ao limite. Valor é `<output aria-live="polite">`.
- `aria-label` dos botões com contexto: "Diminuir adultos", "Aumentar adultos". Grupo `<fieldset>`
  com `aria-labelledby` no label.
- Props: `label`, `description?`, `hint?`, `value`, `min`, `max`, `onChange`, `step=1`.
- `hint` (F2): motivo do limite ("Até 5 hóspedes por quarto…"), texto vem da feature. Renderizado abaixo
  da linha como `text-sm text-fg-muted` com ícone `info` `size-4`, dentro de um contêiner **sempre
  montado** com `aria-live="polite"` (vazio quando não há hint). Descrição e hint ligados por
  `aria-describedby` **nos dois botões** (é o elemento que tem foco), para o leitor de tela ler o motivo ao
  focar o "+" bloqueado. Não usar `warning`: limite não é erro.
- Valor confirmado depois (optimistic, F5 "Quartos"): o valor muda na hora; o `hint` mostra o status
  (`Confirmando disponibilidade…`) e, se a confirmação falhar, o motivo do retorno
  (`Só 1 quarto disponível.`). Mesma região viva, sem spinner extra.

#### Alert (mensagem inline)
Bloco `rounded-card border p-4 flex gap-3`, ícone à esquerda, título `font-semibold` + texto + ação opcional.
Tons: `info`, `success`, `warning`, `danger` (`bg-*-soft border-*` com o texto em `text-fg` e o título no tom).
`danger` usa `role="alert"`; demais `role="status"`. Uso: erro global do checkout, "Quarto esgotado,
escolha outro", aviso de capacidade do quarto, aviso de modo offline.

#### ErrorSummary
Resumo de erros no topo do formulário (promovido da F2 na F5). `Alert danger` (`role="alert"`) com
título `describeErrorCount(n)` (`Corrija 1 campo para continuar` / `Corrija N campos para continuar`)
e `<ul>` de `<button type="button">` (`block min-h-11 w-full py-2 text-left text-primary underline`),
um por erro, na ordem do DOM: `{Rótulo}: {mensagem}`. Itens genéricos `{ id, label, message }` +
`onSelect(id)` (a feature foca o campo). Remontado (`key`) a cada tentativa para ser anunciado de novo;
ao montar, `revealBelowHeader`. Atualiza enquanto o usuário corrige e some sem erros.

#### Card
`bg-surface border border-border rounded-card shadow-card overflow-hidden`. Variantes:
- `static`: só contêiner.
- `interactive`: o card inteiro é clicável via **link no título** com pseudo-elemento cobrindo o card
  (`after:absolute after:inset-0`), sem aninhar elementos interativos dentro do link. Hover `shadow-raised`
  + título `underline`; foco: anel no card (`has-[:focus-visible]:outline`).
- `selected`: `border-primary ring-1 ring-primary` (ex.: quarto selecionado).
- `disabled`/esgotado: imagem com `grayscale opacity-70` e badge "Esgotado"; texto continua com contraste AA.
- Classes exatas do `interactive` (F3): card `group relative flex flex-col sm:flex-row
  hover:shadow-raised transition-shadow duration-150 has-[a:focus-visible]:outline-2
  has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus`; link do título
  `after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline`.
  Nenhum outro elemento focável dentro do card. Estrutura `<li><article>…<h3><a>`.

#### Disclosure ("Alterar busca")
Botão que mostra/esconde um painel logo **abaixo** dele (nada acima se move). `Button secondary sm`
com `rightIcon` `ChevronDownIcon` (`rotate-180 transition-transform` quando aberto), `aria-expanded`,
`aria-controls` = id do painel. Abrir não move o foco (padrão disclosure); fechar pelo mesmo botão.
Painel fechado = não montado. Uso: "Alterar busca" na F3 (painel com o `SearchForm`).
Variante **cabeçalho** (F4, "Comparar quartos (4)"): `<h3><button aria-expanded aria-controls>` com o
texto do título (`text-lg font-semibold text-fg`, `min-h-11`, `ChevronDownIcon` à direita); usada
quando o painel é uma subseção com título.
**Disclosure nativo** (`<details>/<summary>`, sem JS) para conteúdo complementar curto ("+2
comodidades", "Ver regras de cancelamento"): `summary` `min-h-11 inline-flex items-center gap-2
font-medium text-primary cursor-pointer list-none [&::-webkit-details-marker]:hidden`, `ChevronDownIcon
size-4 group-open:rotate-180 transition-transform` (`details` com `group`). Abre abaixo; foco fica no
`summary`.
Exceção (F5, resumo do checkout): quando o painel é a sidebar no `lg+`, ele fica **montado** e só
escondido abaixo de `lg` (`hidden lg:flex`; toggle `lg:hidden`), para não perder estado nem regiões
`aria-live`.

#### Breadcrumb
`<nav aria-label="Você está aqui"><ol>` com separador `chevron-right` `aria-hidden`. Último item é
texto com `aria-current="page"`. `text-sm`, links `text-primary hover:underline`. **No mobile mostra só
o link de voltar ao nível anterior** ("← Hotéis em São Paulo"), para não quebrar em 320px.

#### Pagination
`<nav aria-label="Paginação">`. Modos: `links` (recebe `getHref(page)`, para URL state na F3) e
`buttons` (`onPageChange`, para reviews na F4).
```
≥ sm:   [‹ Anterior]  1  …  4  [5]  6  …  12  [Próxima ›]
< sm:   [‹ Anterior]   Página 5 de 12   [Próxima ›]
```
- Página atual `bg-primary text-fg-on-primary` com `aria-current="page"`; demais `ghost` 44×44.
- Anterior/Próxima desabilitados nas pontas (`aria-disabled`, sem href).
- `aria-label` de cada número: "Página 4". Ao trocar de página: rolar para o topo da lista e mover o foco
  para o título/contagem de resultados (`tabIndex={-1}`).
- Esconder a paginação se houver 1 página só.

#### Tabela de comparação
`<table class="w-full text-sm tabular-nums">` com `<caption>` (pode ser `sr-only` se houver título
visível), `th scope="col"` por item comparado (`min-w-36`, quebra linha) e `th scope="row"` por
atributo (`sticky left-0 min-w-28 bg-surface`, opaco). Células `px-3 py-3`, linhas `divide-y
divide-border`.
- Linha que difere: `bg-primary-soft` na linha inteira (inclusive o `th` sticky) + `border-l-4
  border-primary` no `th` + `<span class="sr-only">, diferente entre os quartos</span>`; legenda
  visível acima ("Linhas marcadas mudam entre os quartos.").
- Booleano: `CheckIcon text-success` + `Sim` / `MinusIcon text-fg-subtle` + `Não` (ícones
  `aria-hidden`).
- Largura: a tabela fica numa região `role="region" aria-labelledby tabIndex=0 overflow-x-auto
  rounded-card border border-border` (rola só ela; exceção de reflow para tabela de dados) com a dica
  `Arraste para o lado para ver todos.` (`text-sm text-fg-subtle lg:hidden`).
- Filtro "Mostrar só diferenças": `Checkbox` acima; anúncio `sr-only aria-live` com a contagem de
  linhas visíveis.

#### EmptyState
Centralizado, `py-12`, ícone `size-12 text-fg-subtle` em círculo `bg-surface-sunken`, título `text-lg
font-semibold`, descrição `text-fg-muted max-w-prose`, até 2 ações (primária + ghost). Sempre diz **o que
fazer agora**. `role="status"` para ser anunciado quando substitui uma lista.

#### ErrorState
Igual ao EmptyState com ícone `alert-circle`/`wifi-off` em `danger-soft`, `role="alert"`, e botão
`secondary` "Tentar de novo" (`onRetry`). Durante o retry, o botão entra em `loading` ("Tentando…").
Variante `inline` (dentro de uma seção, ex.: reviews falharam mas o hotel carregou) e `page` (rota inteira,
`error.tsx`). Se o erro for 404, não usar ErrorState: usar página "não encontrado" com EmptyState.

#### DateRange (inputs nativos)
Dois `<input type="date">` nativos (picker do sistema = melhor no celular), dentro de um `<fieldset>`
com `<legend>` "Datas da estadia".
```
320px                             ≥ sm
Check-in                          Check-in              Check-out
[ 12/12/2026      📅 ]            [ 12/12/2026 📅 ]     [ 15/12/2026 📅 ]
Check-out                         3 noites
[ 15/12/2026      📅 ]
3 noites
```
- `min` do check-in = hoje (data local); `min` do check-out = check-in + 1; `max` do check-out =
  check-in + 30. Ao mudar o check-in para depois do check-out, **ajustar o check-out para check-in + 1**
  e anunciar ("Check-out ajustado para 16/12/2026") em vez de mostrar erro.
- Abaixo: resumo `"3 noites"` (`text-sm text-fg-muted tabular-nums`, `aria-live="polite"`). A linha tem
  altura reservada (`min-h-5`) e, sem as duas datas, mostra a dica `Escolha as datas para ver o total de
  noites.` (troca de texto, sem layout shift). Com período inválido, fica vazia (o erro do campo explica).
- Ajuste automático: além do anúncio, o texto aparece visível como `description` do Field do check-out
  (`Check-out ajustado para 16/12/2026.`) até a próxima mudança de qualquer data.
- `startIcon` `calendar` no Input. iOS: `[&::-webkit-date-and-time-value]:text-left` (o Safari centraliza).
- Erros por campo (via Field). Valor interno sempre `YYYY-MM-DD`; exibição de datas fora do input
  sempre com `Intl.DateTimeFormat("pt-BR")`.

#### Combobox (autocomplete)
Padrão ARIA 1.2 *combobox com listbox*. Input (`role="combobox"`, `aria-autocomplete="list"`,
`aria-expanded`, `aria-controls`, `aria-activedescendant`) + popover `<ul role="listbox">`
`absolute z-10 mt-1 w-full bg-surface border border-border rounded-card shadow-raised max-h-80 overflow-auto`.
```
Destino
[📍 florian                          ⟳ ]
┌─────────────────────────────────────┐
│ 📍 Florianópolis, SC        Cidade  │  ← opção ativa: bg-primary-soft
│ 🏝 Ilha do Campeche, SC     Ilha    │
└─────────────────────────────────────┘
```
- Opção: `min-h-11 px-3 flex items-center gap-3`, ícone por `type` (city/beach/island/nature), nome
  com o trecho digitado em `font-semibold` (`<mark class="bg-transparent text-inherit font-semibold">`),
  tipo à direita `text-sm text-fg-subtle` precedido de `<span class="sr-only">, </span>` (nome acessível
  "Florianópolis, SC, Cidade"). Hover `bg-surface-sunken`; ativa (`aria-selected="true"`) `bg-primary-soft`
  + `text-primary` no ícone. Ao mover a ativa, `scrollIntoView({ block: "nearest" })`.
- Popover: `<div>` posicionado contém o `<ul role="listbox">` (sempre no DOM com `id` estável, `hidden`
  quando fechado, para o `aria-controls` nunca apontar para o vazio) e, **fora** do `ul`, as linhas de
  status (carregando/vazio/erro) — listbox só pode ter `option`. Altura `max-h-[min(20rem,50dvh)]`
  (o teclado virtual do celular come metade da tela). `p-1`, opções `rounded-control`.
- Fechar por foco: o popover fecha quando o foco sai do **wrapper** do combobox (`focusout` com
  `relatedTarget` fora dele) — assim o botão "Tentar de novo" dentro do popover é alcançável por Tab.
- Teclado: ↓/↑ movem (abre se fechado), Enter seleciona, Esc fecha (segundo Esc limpa o texto). Tab **não**
  seleciona: só fecha e segue (evita seleção acidental). Home/End movem o cursor no input.
- Mouse/toque: clique seleciona; clique fora fecha. Selecionar preenche o input com o `name` e fecha.
- Estados do popover:
  - `< 2 caracteres`: fechado. (Buscas recentes ficam numa seção abaixo do formulário, não no popover — F2.)
  - Carregando: spinner no `endSlot`, mantém resultados anteriores; se não houver anteriores, 1 linha
    "Buscando destinos…".
  - Resultados: contagem anunciada numa região `aria-live="polite"` separada ("5 destinos encontrados").
  - Vazio: linha não selecionável "Nenhum destino encontrado para "xyz"".
  - Erro: linha com "Não foi possível carregar os destinos." + botão ghost "Tentar de novo".
- Texto digitado sem escolher da lista = destino inválido no submit ("Escolha um destino da lista").
- Botão limpar (`IconButton` "Limpar destino") aparece no `endSlot` quando há texto.

### 5.3 Organisms

#### Dialog
`<dialog>` nativo aberto com `showModal()` (foco preso, fundo inerte, Esc nativos; foco volta ao gatilho
ao fechar — garantir explicitamente guardando o elemento ativo).
```
┌─────────────────────────────────┐
│ Título                      [×] │  header: px-5 py-4 border-b, h2 text-lg font-semibold
├─────────────────────────────────┤
│ conteúdo rolável                │  body: px-5 py-4 overflow-y-auto
├─────────────────────────────────┤
│           [Secundária][Primária]│  footer opcional: border-t, botões à direita (empilhados no mobile, primária em cima)
└─────────────────────────────────┘
```
- Tamanhos: `sm` (`max-w-sm`, confirmações), `md` (`max-w-lg`, termos), `full` (lightbox, F4):
  `fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none rounded-none bg-fg text-fg-on-primary
  animate-fade-in`; header `h-14 px-4` sem borda (h2 `text-base font-semibold truncate`), corpo
  `flex-1 min-h-0` sem padding (imagem `object-contain`), footer `h-16 px-4
  pb-[env(safe-area-inset-bottom)]` com `IconButton overlay` "Foto anterior"/"Próxima foto" nas pontas
  e contador central `w-28 text-center tabular-nums aria-live="polite"`. Anel de foco branco (§1.1).
  Sem fechar no backdrop (não há backdrop visível). Foco inicial no controle principal ("Próxima foto").
- Mobile: `w-[calc(100%-2rem)] max-h-[85dvh]`; ≥ `sm` centralizado. `rounded-dialog shadow-overlay`.
- `aria-labelledby` = título; `aria-describedby` opcional. Botão fechar `IconButton` "Fechar".
- Clique no backdrop fecha só em dialogs informativos (termos, lightbox); em confirmação, não.
- Foco inicial: no primeiro controle útil (em termos: botão "Fechar"/conteúdo rolável com `tabIndex=0`).
- `focusableBody` (texto longo, ex.: termos): o corpo rolável recebe `tabIndex={0}`, `role="region"`,
  `aria-labelledby` = título, e o foco inicial (setas/PageDown rolam o texto). Footer de aceite:
  `[Fechar]` secondary + `[Li e aceito]` primary.

#### Drawer
Mesmo `<dialog>` com outra geometria. Mobile: **bottom-sheet** (`fixed inset-x-0 bottom-0 max-h-[90dvh]
rounded-t-dialog animate-slide-up`), ≥ `lg` raramente necessário (filtros ficam na sidebar). Uso
principal: filtros da F3.
```
┌───────────────────────────────┐
│ Filtros                   [×] │
│ ...conteúdo rolável...        │
├───────────────────────────────┤
│ [Limpar]      [Ver 8 hotéis]  │  footer sticky: ação primária mostra o resultado esperado
└───────────────────────────────┘
```
Gatilho: `Button secondary` "Filtros" com contador ("Filtros (3)").

Implementação (F3): **`Dialog placement="sheet"`** (mesmo ciclo de vida do Dialog; não é componente
separado).
- `<dialog>`: `mt-auto mb-0 w-full max-w-none max-h-[90dvh] rounded-t-dialog rounded-b-none
  animate-slide-up` (wrapper interno com o mesmo `max-h`). ≥ `sm` continua bottom-sheet (`sm:max-w-lg
  sm:mx-auto`).
- Footer em **linha** (`flex-row gap-3`, botões `flex-1`: largura fixa, o texto pode mudar sem mexer
  no layout), `pb-[max(1rem,env(safe-area-inset-bottom))]`. Secundária (ghost) à esquerda, primária
  à direita.
- O resultado esperado no primário (`Ver 8 hotéis`); durante o fetch `Spinner` + `Atualizando…` mas
  **clicável** (fecha; não usar `loading`). 0 resultados/erro: `Ver resultados`.
- Conteúdo fora do `<dialog>` modal fica inerte: anúncios `aria-live` relevantes precisam de uma
  região própria dentro do sheet.
- `closeOnBackdrop` quando as mudanças já estão aplicadas (filtros ao vivo). Fecha sozinho ao cruzar
  `lg` (`matchMedia`).
- Foco inicial no primeiro controle; ao fechar, volta ao gatilho.

#### Toast
Feedback **efêmero e não essencial** de uma ação (ex.: "Link copiado", "Não foi possível confirmar a
reserva" — que também aparece inline).
- Região fixa (`data-toaster`): mobile `bottom-4 inset-x-4`, ≥ `sm` `bottom-6 right-6 w-96`. Com a barra
  de ação fixa na tela (`[data-action-bar]`, abaixo de `lg`), a região sobe acima dela pela regra CSS da
  §4.5. Máx. 3 empilhados, mais novo embaixo.
- Visual: `bg-surface border border-border rounded-card shadow-overlay p-4 flex gap-3`, barra/ícone do tom
  à esquerda (`success`, `danger`, `info`), texto `text-sm text-fg`, `IconButton` "Fechar notificação".
- Duração: 5s (`success`/`info`), 8s (`danger`); pausa no hover e no foco. Ação opcional de 1 botão ghost
  ("Desfazer", "Tentar de novo").
- Acessibilidade: a região é um contêiner único sempre montado com `role="status" aria-live="polite"`
  (`danger` em região separada `role="alert"`). Não roubar o foco.
- API: `toast.success(msg)`, `toast.error(msg, { action })`, `toast.info(msg)` (store simples em `shared/ui`).

#### HotelCard / RoomCard
São da feature (F3/F4), mas devem compor: `Card interactive` + imagem `aspect-[4/3]` + `Badge` +
`RatingScore` + `PriceTag`. Hierarquia: nome → local/tipo → nota → comodidades (até 3 + "+2") → preço
(alinhado embaixo/direita) → disponibilidade.
- Bloco de preço: `mt-auto border-t border-border pt-3 flex flex-wrap items-end justify-between
  gap-x-3 gap-y-2`; badge de disponibilidade à esquerda (colado ao preço), preço `ml-auto text-right`.
  A diária nunca some; o total some quando não dá para reservar (esgotado / quartos insuficientes).
- Comodidades: `CheckIcon size-4 text-success` decorativo + texto `text-sm`; as que batem com o filtro
  vêm primeiro em `text-fg font-medium`; "+N" `text-fg-subtle` com `sr-only` " comodidades".
- Skeleton com a mesma geometria (foto `block`, linhas com a altura do `line-height` de cada texto,
  `border-t` e 3 linhas à direita).
- **RoomCard (F4)**: `Card static` com a geometria do HotelCard (vertical no mobile, horizontal `sm+`).
  Ordem: foto (`alt=""`) → h3 nome → descrição → fatos (`45 m²` · `Até 3 hóspedes` · camas, ícones
  `size-4`) → até 4 comodidades + `<details>` "+N comodidades" → linha de cancelamento → bloco de
  preço (total grande, diária exata) → motivo de bloqueio (se houver) → botão (`fullWidth`, `sm:w-56
  sm:ml-auto`). Estados de botão: "Selecionar quarto" (primary), "Escolher datas" (secondary; sem datas **ou** com datas já passadas, motivo `As datas desta busca já passaram.`),
  "Esgotado"/bloqueado (`aria-disabled` + motivo). Nome acessível do botão inclui o quarto
  (`sr-only` ": {nome}"). Selecionando: `selected` (`ring-1 ring-primary`) + `loading`.
- **SimilarHotelCard (F4)**: `Card interactive` compacto; `< sm` horizontal (foto `w-24
  aspect-square`), `sm+` vertical (foto `aspect-[4/3]`); nome `text-base line-clamp-2`, `RatingScore
  sm` sem rótulo, `PriceTag nightly-line`, badge de disponibilidade.

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

---

## 6. Tom de voz e microcopy

**Tom:** direto, cordial e concreto. Fala com "você", frases curtas, sem jargão técnico ("erro 500",
"request", "inválido" sozinho), sem culpar o usuário, sem exclamação exceto escassez. Sempre diz o
próximo passo.

### 6.1 Formatos

| Item | Regra | Exemplo |
|---|---|---|
| Moeda | `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` | `R$ 1.234,56` |
| Data curta | `dd/MM/yyyy` | `12/12/2026` |
| Data longa | `Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" })` | `sáb., 12 de dez.` |
| Intervalo | mesmo mês: `12–15 dez`; meses diferentes: `30 dez – 2 jan` | |
| Horário | `14:00` (24h) | "Check-in a partir de 14:00" |
| Nota | 1 casa, vírgula | `4,6` |
| Plural | sempre tratar 0/1/n (`Intl.PluralRules` ou função `plural`) | `1 noite`, `3 noites`, `1 hóspede`, `2 hóspedes`, `1 quarto`, `1 avaliação` |
| Números grandes | `toLocaleString("pt-BR")` | `1.234 avaliações` |
| Telefone | `(11) 98765-4321` | |
| CPF | `123.456.789-09` | |

### 6.2 Botões e ações (verbo + objeto)

`Buscar hotéis` · `Ver quartos` · `Selecionar quarto` · `Continuar para pagamento` · `Revisar reserva` ·
`Confirmar reserva` · `Fazer nova busca` · `Limpar filtros` · `Tentar de novo` · `Copiar link` ·
`Ver todas as fotos` · `Ver mais avaliações` · `Voltar` · `Fechar`.
Loading: `Buscando…` · `Confirmando reserva…` · `Tentando…`.
Checkout: `Continuar para pagamento` · `Revisar reserva` · `Confirmar reserva` · `Editar` · `Ler termos e
condições` · `Li e aceito` · `Aplicar` · `Remover` · `Ver detalhes da reserva` · `Tenho um cupom de
desconto` · `Escolher novas datas` · `Voltar ao hotel`.
Loading: `Confirmando reserva…` · `Calculando total…` · `Aplicando…`.

### 6.3 Validação (erro diz como resolver)

| Situação | Mensagem |
|---|---|
| Campo obrigatório | `Informe seu nome completo.` / `Informe o e-mail.` (nunca só "Campo obrigatório") |
| Destino digitado e não escolhido | `Escolha um destino da lista.` |
| Check-in no passado | `Escolha uma data a partir de hoje.` |
| Check-out ≤ check-in | `O check-out precisa ser pelo menos 1 dia depois do check-in.` |
| Mais de 30 noites | `A estadia pode ter no máximo 30 noites.` |
| Hóspedes acima do quarto | `Este quarto acomoda até 2 hóspedes. Escolha outro quarto ou ajuste a busca.` |
| E-mail | `Digite um e-mail válido, como nome@exemplo.com.` |
| Telefone | `Digite o telefone com DDD, como (11) 98765-4321.` |
| CPF | `CPF inválido. Confira os 11 números.` |
| Cartão (Luhn) | `Número de cartão inválido. Confira os dígitos.` |
| Validade | `Cartão vencido. Use um cartão com validade futura.` / `Use o formato MM/AA.` |
| CVV | `Digite os 3 ou 4 números do verso do cartão.` |
| Termos | `Para continuar, aceite os termos da reserva.` |
| Resumo no topo do form | Título: `Corrija 2 campos para continuar` (1 → `Corrija 1 campo para continuar`) + lista de botões com aparência de link, um por campo: `{Rótulo}: {mensagem}` |
| Data obrigatória | `Escolha a data de check-in.` / `Escolha a data de check-out.` |
| Destino vazio | `Escolha um destino da lista.` (mesma do digitado sem escolher: a ação é a mesma) |
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

### 6.4 Vazio

| Situação | Título | Descrição | Ações |
|---|---|---|---|
| Destino sem hotéis (Bonito) | `Nenhum hotel em Bonito, MS` | `Ainda não temos hospedagens neste destino. Tente uma cidade próxima.` | `Fazer nova busca` |
| Filtros sem resultado | `Nenhum hotel com esses filtros` | `Tente aumentar a faixa de preço ou remover alguma comodidade.` | `Limpar filtros` (primária) |
| Hotel sem comentários | `Ainda sem comentários` | `Este hotel ainda não recebeu comentários de hóspedes.` | — |
| Hotel sem quartos | `Nenhum quarto para reserva` | `Este hotel ainda não tem quartos cadastrados. Veja hotéis parecidos na mesma região.` | link `Ver hotéis similares` |
| Similares vazio | — | `Nenhum outro hotel em {destino}.` | `Fazer nova busca` |
| Checkout sem seleção | `Nenhum quarto selecionado` | `Escolha um hotel e um quarto para fazer a reserva.` | `Buscar hotéis` |
| Hotel não encontrado (404) | `Hotel não encontrado` | `O link pode estar errado ou o hotel não está mais disponível.` | `Fazer nova busca` |
| Reserva não encontrada (404) | `Reserva não encontrada` | `Confira o número da reserva no link. Reservas de teste são apagadas quando o sistema reinicia.` | `Fazer nova busca` |

### 6.5 Erro de rede / servidor

| Situação | Mensagem | Ação |
|---|---|---|
| Lista não carregou | Título `Não foi possível carregar os hotéis` · `Verifique sua conexão e tente de novo.` | `Tentar de novo` |
| Seção não carregou | `Não foi possível carregar as avaliações.` | `Tentar de novo` |
| Envio da reserva falhou | Alert: `Não foi possível confirmar sua reserva` · `Nenhuma cobrança foi feita. Seus dados foram mantidos; tente de novo em instantes.` + toast `Não foi possível confirmar a reserva.` | `Tentar de novo` |
| Sem conexão (`navigator.onLine === false`) | Alert warning: `Você está sem internet. Assim que a conexão voltar, tente de novo.` | — |
| Sem conexão numa lista que recarrega sozinha (F3) | Alert warning (`WifiOffIcon`): `Você está sem internet.` · `Os hotéis aparecem assim que a conexão voltar.` (com dados da mesma busca: `Os resultados podem estar desatualizados.`) | — |
| Erro de renderização da rota de busca | h1 `Não foi possível abrir a busca` · `Tente de novo ou faça uma nova busca.` | `Tentar de novo` + `Fazer nova busca` |
| Lento (> 5s) | Texto abaixo do skeleton: `Está demorando mais que o normal…` | — |
| Autocomplete | `Não foi possível carregar os destinos.` | `Tentar de novo` |
| Copiar link falhou | Toast: `Não foi possível copiar. Copie o endereço na barra do navegador.` | — |
| Erro de renderização do hotel | h1 `Não foi possível abrir o hotel` · `Tente de novo ou faça uma nova busca.` | `Tentar de novo` + `Fazer nova busca` |
| Quartos não carregaram | `Não foi possível carregar os quartos.` · `Verifique sua conexão e tente de novo.` | `Tentar de novo` |
| Avaliações offline na troca de página | Alert warning (`WifiOffIcon`): `Você está sem internet.` · `As avaliações aparecem assim que a conexão voltar.` | — |
| Similares não carregaram (recomendação) | `Não foi possível carregar hotéis similares.` | link `Ver hotéis em {destino}` (sem retry) |
| Foto do lightbox quebrada | `Não foi possível carregar esta foto.` | — (setas seguem) |
| Envio da reserva offline | Alert warning: `Você está sem internet` · `Assim que a conexão voltar, tente de novo. Nada foi cobrado e seus dados foram mantidos.` + toast `Não foi possível confirmar a reserva.` | `Tentar de novo` |
| Preço mudou no envio | Alert warning: `O total da reserva mudou` · `Passou de R$ 4.140,00 para R$ 4.320,00. Confira o novo valor e confirme de novo. Nada foi cobrado.` | (o próprio `Confirmar reserva`) |
| Cupom recusado no envio | Alert warning: `O cupom BEMVINDO10 não vale mais` · `Removemos o desconto e o total agora é R$ 4.140,00. Confira e confirme de novo. Nada foi cobrado.` | — |
| Total indisponível no envio | Alert danger: `Não foi possível calcular o total` · `Carregue o preço do quarto de novo para confirmar a reserva.` | `Tentar de novo` |
| Seções do checkout | `Não foi possível carregar os dados do hotel.` / `Não foi possível carregar o preço.` · `Verifique sua conexão e tente de novo.` | `Tentar de novo` |
| Confirmação de quartos falhou | hint: `Não foi possível confirmar a disponibilidade. Tente de novo.` (valor volta) | — |
| Ambiente de demonstração (checkout) | Alert info no topo do formulário, em todos os passos: `Ambiente de demonstração — não use dados reais.` (a API é pública e sem autenticação) | — |

Nunca mostrar `error.message` cru da API ("Falha simulada pela mock API") nem status HTTP ao usuário.

### 6.6 Disponibilidade

| Situação | Visual | Texto |
|---|---|---|
| Esgotado (hotel/quarto) | Badge `danger` + botão desabilitado | Badge `Esgotado` · botão `Esgotado` · nota `Sem quartos disponíveis para estas datas.` |
| Escassez (1–2) | Badge `warning` | `Apenas 1 quarto!` / `Apenas 2 quartos!` |
| Menos quartos que a busca (F3) | Badge `warning`, sem total | Badge `Só 2 quartos disponíveis` · nota `Sua busca pede 3 quartos.` |
| Quarto pequeno para a busca (F4) | Texto `text-fg-muted` com `InfoIcon` + botão `aria-disabled`, sem total | `Acomoda até 2 hóspedes. Sua busca tem 3 por quarto. Escolha outro quarto ou altere os hóspedes.` |
| Menos quartos que a busca (F4, por quarto) | Badge `warning` + botão `aria-disabled`, sem total | Badge `Só 2 disponíveis` · `Sua busca pede 3 quartos. Diminua a quantidade de quartos ou escolha outro tipo.` |
| Hotel esgotado (F4, topo de Quartos) | Alert `warning` com link | `Este hotel está esgotado nestas datas` · `Veja opções parecidas na mesma região.` · `Ver hotéis similares` |
| Sem datas no detalhe (F4) | Alert `info` + formulário aberto; botão do quarto `Escolher datas` | `Escolha as datas para reservar` · `Com as datas e os hóspedes, mostramos o preço total e a disponibilidade de cada quarto.` |
| Esgotado sem datas na busca | Badge `danger` | nota `Sem quartos disponíveis no momento.` |
| Disponível | — | Nada (não poluir) |
| Quarto ficou indisponível no checkout | Alert `warning` | `Este quarto esgotou enquanto você reservava. Escolha outro quarto no mesmo hotel.` + `Ver quartos` |
| Quarto esgotou antes do checkout (F5, página) | `EmptyState` h1 + `Ver quartos` | `Este quarto esgotou` · `Não há mais unidades de {quarto} para {12–15 dez}. Escolha outro quarto no mesmo hotel.` |
| Menos quartos que a reserva (F5, página) | idem | `Só 2 quartos disponíveis` · `Sua reserva pede 3 quartos de {quarto}. Escolha outro quarto ou reduza a quantidade de quartos.` |
| Quarto pequeno (F5, página) | idem | `Este quarto não acomoda sua busca` · `{quarto} acomoda até 2 hóspedes por quarto e sua busca tem 3. Escolha outro quarto ou altere os hóspedes.` |
| Datas passadas (F5, página) | idem + `Escolher novas datas` | `As datas desta reserva já passaram` · `O check-in era em 12/12/2026. Escolha novas datas para ver preço e disponibilidade.` |
| Esgotou durante o envio com sobra (F5) | Alert warning + `Ver quartos` | `Só 1 quarto disponível agora` · `Diminua a quantidade de quartos no resumo da reserva ou escolha outro quarto. Nada foi cobrado.` |
| Limite de quartos no checkout (F5) | hint do Stepper | `Cada quarto precisa de pelo menos 1 adulto.` · `Máximo de 4 quartos por reserva.` · `Este quarto acomoda até 3 hóspedes: 4 hóspedes precisam de pelo menos 2 quartos.` · `Só 2 quartos disponíveis.` |

### 6.7 Resultados, filtros e ordenação (F3)

| Item | Texto |
|---|---|
| Título da página | `Hotéis em {destino}` · sem destino: `Para onde você vai?` |
| Resumo da busca | `12–15 dez · 3 noites · 2 adultos · 1 quarto` · sem datas: `Datas não definidas` |
| Contagem | `Nenhum hotel encontrado` · `1 hotel encontrado` · `14 hotéis encontrados` |
| Linha de status | `Mostrando 1–10 de 14` · `Carregando hotéis…` · `Atualizando resultados…` |
| Ordenar | `Ordenar por`: `Mais populares` · `Menor preço` · `Maior avaliação` |
| Filtros | `Filtros` · `Filtros (3)` · `Limpar filtros` · `Ver 14 hotéis` / `Ver 1 hotel` / `Ver resultados` |
| Preço | `Preço por noite` · `Mínimo` / `Máximo` · `Qualquer preço` · `A partir de R$ 200` · `Até R$ 1.500` · `R$ 200 – R$ 1.500` · topo `R$ 3.000 ou mais` |
| Nota mínima | `Qualquer nota` · `4,5 ou mais` Excelente · `4,0 ou mais` Muito bom · `3,5 ou mais` Bom (nunca "4,5+": ambíguo no leitor de tela) |
| Tipos | `Hotel` · `Pousada` · `Resort` |
| Comodidades (ordem de exibição) | `Wi-Fi` · `Café da manhã` · `Piscina` · `Estacionamento` · `Acesso à praia` · `Restaurante` · `Bar` · `Academia` · `Spa` · `Serviço de quarto` · `Clube infantil` · `Concierge` · `Manobrista` · `Centro de negócios` · `Acesso ao lounge` |
| Alert sem datas | `Escolha as datas da estadia` · `Com datas e hóspedes, mostramos o preço total e a disponibilidade de cada hotel.` |
| Alert datas passadas | `As datas desta busca já passaram` · `Preços e disponibilidade podem ter mudado. Use "Alterar busca" para escolher novas datas.` |

### 6.8 Sucesso e outros

- Toast copiar link: `Link copiado.`
- Buscas recentes apagadas: toast `Buscas recentes apagadas.`
- Confirmação: h1 `Reserva confirmada` · `Enviamos os detalhes para nome@exemplo.com.` (simulado) ·
  `Número da reserva` em destaque `tabular-nums`.
- Política de cancelamento: `free` → `Cancelamento grátis` (badge success) · `moderate` → `Cancelamento com
  reembolso parcial` (badge neutral) · `strict` → `Sem reembolso em caso de cancelamento` (badge warning).
  Regras (texto ilustrativo, F4, em `<details>` "Ver regras de cancelamento"):
  `free`: `Cancele grátis até 48 horas antes do check-in.` · `Depois desse prazo, cobramos a primeira
  diária.` · `Se você não comparecer, cobramos a primeira diária.`
  `moderate`: `Cancele até 7 dias antes do check-in e receba 50% do valor de volta.` · `Depois desse
  prazo, não há reembolso.`
  `strict`: `Esta tarifa não tem reembolso em caso de cancelamento.` · `Mudança de datas depende de
  disponibilidade e pode ter custo.`
- Horários: `Check-in` `A partir de 15:00` · `Check-out` `Até 12:00`.
- Comodidades de quarto: `Vista para o mar` · `Vista para a cidade` · `Vista para o jardim` · `Varanda` ·
  `Terraço` · `Banheira` · `Frigobar` · `Cofre` · `Ar-condicionado` · `Mesa de trabalho` · `Cozinha` ·
  `Sala de estar` · `Sistema de som` · `Mordomo` · `Acesso à piscina` · `Jardim privativo` · `Acesso ao lounge`.
- Camas: `cama de solteiro` · `cama de casal` · `cama queen` · `cama king` · `cama twin` · `sofá-cama`
  (plurais `camas de solteiro`, `sofás-camas`…; junção `1 cama king e 1 sofá-cama`).
- `aria-label`s padrão: `Fechar`, `Fechar notificação`, `Limpar destino`, `Foto anterior`, `Próxima foto`,
  `Abrir foto {n} de {total}`, `Página {n}`, `Diminuir {campo}`, `Aumentar {campo}`, `Copiar link do hotel`,
  `Paginação`, `Você está aqui`, `Seções da página`, `Fechar filtros`, `Mapa: {endereço}`.
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

---

## 7. Checklist de acessibilidade (todo componente/tela)

- [ ] Alvos de toque ≥ 44×44px; espaço de 8px entre alvos adjacentes.
- [ ] Foco visível em tudo (anel global; não usar `outline-none` sem substituto). Ordem de foco = ordem visual.
- [ ] Todo input com `<label>` visível; grupos com `fieldset/legend`.
- [ ] Erros com `aria-invalid` + `aria-describedby`; foco no primeiro inválido no submit.
- [ ] Loading com `aria-busy` + texto em `aria-live="polite"`; erro com `role="alert"`.
- [ ] Contraste conforme §1.1 (não criar combinação nova sem calcular).
- [ ] Cor nunca é o único sinal.
- [ ] Imagens com `alt` útil; ícones decorativos `aria-hidden`.
- [ ] Funciona em 320px sem scroll horizontal e com zoom de 200%.
- [ ] Respeita `prefers-reduced-motion`.
- [ ] Mudança de rota/página: título da página (`metadata`) atualizado e foco no `h1` ou na região relevante.

---

## 8. Inventário resumido (onde fica)

| Nível | Componentes | Introduzido em |
|---|---|---|
| atoms | Button (+ButtonLink), IconButton, Input, Select, Checkbox, Radio, Badge, Stars, Skeleton, Spinner, PriceTag, RemoteImage, icons | F1 (PriceTag nasce na F3; PriceTag e RemoteImage sobem na F4) |
| atoms | Range (estilo do `input type="range"` nativo) · Avatar | F3 · F4 (na feature até o 2º uso) |
| molecules | Field (+ campo composto), Stepper, Alert, ErrorSummary, Card, RatingScore, Breadcrumb, Pagination, EmptyState, ErrorState, DateRange, Combobox, Disclosure (+ cabeçalho e nativo), Tabela de comparação | F1 (Combobox/DateRange na F2; ErrorSummary nasce na F2 e sobe na F5; Card, RatingScore e Disclosure na F3, sobem na F4; Breadcrumb e Tabela de comparação nascem na F4 e ficam na feature até o 2º uso) |
| organisms | Dialog (`placement: "center" \| "sheet"`, `size: "sm" \| "md" \| "full"`, `focusableBody`), Drawer = Dialog sheet, ErrorBoundary, Toast/Toaster, Header, Footer | F1 (sheet e ErrorBoundary na F3; `full` na F4; `focusableBody` na F5) |
| feature | HotelCard, RoomCard, SimilarHotelCard, Gallery/Lightbox, SectionNav, StepIndicator, PriceBreakdown, CouponForm, ActionBar (barra fixa) | F3–F5, compondo os acima (ActionBar sobe para shared no 2º uso) |
