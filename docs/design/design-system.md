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
- **Imagens:** `next/image` sempre com `aspect-ratio` fixo no container (`aspect-[4/3]` no card,
  `aspect-video` no hero da galeria), `object-cover`, `sizes` correto, `bg-surface-sunken` enquanto carrega.
  `alt` = nome do hotel + contexto ("Hotel Copacabana Palace, foto 2 de 8"). Imagem quebrada → manter o
  bloco cinza com ícone `bed` centralizado (sem layout shift).

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
- Nas páginas de resultado/detalhe, o header pode mostrar um resumo compacto da busca
  ("São Paulo, SP · 12–15 dez · 2 hóspedes") como link "Alterar busca" (definido na spec da F3).

### 4.3 Estrutura da página

```
<header/>  <main id="conteudo" class="container py-6 lg:py-10">  <footer/>
```
- Footer simples: `text-sm text-fg-muted`, "Projeto de demonstração. Nenhuma cobrança real é feita."
- Página com sidebar (resultados com filtros, checkout com resumo): `lg:grid lg:grid-cols-[18rem_1fr] gap-8`
  (filtros à esquerda) ou `lg:grid-cols-[1fr_22rem]` (resumo à direita, `lg:sticky lg:top-24`).
  No mobile, a sidebar vira Drawer (filtros) ou bloco colapsável acima do formulário (resumo).

### 4.4 Grid de cards de hotel

- Mobile (base): lista de 1 coluna, card vertical (imagem em cima `aspect-[4/3]`).
- `sm` a `lg`: card **horizontal** (imagem à esquerda `w-56`, conteúdo à direita) em 1 coluna — leitura de
  lista de resultados é mais rápida que grid para comparar preço.
- Lista sempre `<ul role="list">` com `<li>` por card; contagem de resultados acima em `aria-live="polite"`.

### 4.5 Barra de ação fixa (mobile)

Para a ação primária em páginas longas (detalhe do hotel, checkout) abaixo de `lg`:
```
┌──────────────────────────────────────┐
│ R$ 1.840,00  total · 3 noites  [Ação]│   fixed bottom-0 inset-x-0 z-30 bg-surface
└──────────────────────────────────────┘   border-t shadow-raised px-4 py-3 pb-[env(safe-area-inset-bottom)]
```
Reserve o espaço no fim do `<main>` (`pb-24`) para não cobrir conteúdo. Some em `lg:` (ação fica na sidebar).

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
  variantes). Use `disabled` só quando a ação é impossível (ex.: Esgotado). Para formulário inválido,
  **não desabilite o submit**: deixe enviar e mostre os erros (o usuário descobre o que falta).
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

#### PriceTag
Mostra dinheiro com `formatBRL` (de `shared/lib/currency`), `tabular-nums`, `whitespace-nowrap` no valor.

| Variante | Visual | Uso |
|---|---|---|
| `nightly` | `a partir de` (`text-sm text-fg-subtle`) / **R$ 890** (`text-xl font-bold`) / `por noite` | Card de resultado, "a partir de" no detalhe |
| `total` | **R$ 2.670,00** (`text-2xl font-bold`) / `total · 3 noites · 1 quarto` (`text-sm text-fg-muted`) | Barra fixa, resumo do checkout, confirmação |
| `line` | label à esquerda, valor à direita (`flex justify-between`) | Linhas do breakdown (diárias, taxas) |

- Leitura por leitor de tela como frase: `aria-label` não é necessário se a ordem do DOM já for
  "a partir de R$ 890 por noite". Não quebrar o valor com elementos que separem "R$" do número.
- Valores longos (até `R$ 300.000,00`) cabem em 320px: o rótulo quebra para a linha de baixo, o valor nunca.
- Quando há datas na busca, o card mostra **também o total** da estadia (`R$ 2.670 total · 3 noites`) logo
  abaixo do preço por noite: o usuário compara total, não diária.
- Centavos: exibir sempre no total e no breakdown; no preço por noite do card pode omitir se for inteiro
  (`maximumFractionDigits: 0`), decidido por prop `compact`.

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

#### Stepper (número +/-)
```
Adultos                     [ − ]  2  [ + ]
A partir de 18 anos
```
- `IconButton secondary` 44px para − e +, valor central `w-8 text-center tabular-nums font-semibold`.
- Botão no limite fica `disabled` (ex.: adultos = 1 desabilita −). Valor é `<output aria-live="polite">`.
- `aria-label` dos botões com contexto: "Diminuir adultos", "Aumentar adultos". Grupo com `role="group"`
  e `aria-labelledby` no label.
- Props: `label`, `description?`, `value`, `min`, `max`, `onChange`, `step=1`. Ao atingir o máximo,
  descrição vira aviso "Máximo de 6 adultos por busca" (texto vem da feature).

#### Alert (mensagem inline)
Bloco `rounded-card border p-4 flex gap-3`, ícone à esquerda, título `font-semibold` + texto + ação opcional.
Tons: `info`, `success`, `warning`, `danger` (`bg-*-soft border-*` com o texto em `text-fg` e o título no tom).
`danger` usa `role="alert"`; demais `role="status"`. Uso: erro global do checkout, "Quarto esgotado,
escolha outro", aviso de capacidade do quarto, aviso de modo offline.

#### Card
`bg-surface border border-border rounded-card shadow-card overflow-hidden`. Variantes:
- `static`: só contêiner.
- `interactive`: o card inteiro é clicável via **link no título** com pseudo-elemento cobrindo o card
  (`after:absolute after:inset-0`), sem aninhar elementos interativos dentro do link. Hover `shadow-raised`
  + título `underline`; foco: anel no card (`has-[:focus-visible]:outline`).
- `selected`: `border-primary ring-1 ring-primary` (ex.: quarto selecionado).
- `disabled`/esgotado: imagem com `grayscale opacity-70` e badge "Esgotado"; texto continua com contraste AA.

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
- Abaixo: resumo `"3 noites"` (`text-sm text-fg-muted tabular-nums`, `aria-live="polite"`).
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
  com o trecho digitado em `font-semibold` (`<mark>` sem fundo), tipo à direita `text-sm text-fg-subtle`.
- Teclado: ↓/↑ movem (abre se fechado), Enter seleciona, Esc fecha (segundo Esc limpa o texto). Tab **não**
  seleciona: só fecha e segue (evita seleção acidental). Home/End movem o cursor no input.
- Mouse/toque: clique seleciona; clique fora fecha. Selecionar preenche o input com o `name` e fecha.
- Estados do popover:
  - `< 2 caracteres`: fechado (ou mostra "Buscas recentes" se houver, definido na F2).
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
- Tamanhos: `sm` (`max-w-sm`, confirmações), `md` (`max-w-lg`, termos), `full` (lightbox: tela cheia
  `bg-fg`/preto, imagem `object-contain`).
- Mobile: `w-[calc(100%-2rem)] max-h-[85dvh]`; ≥ `sm` centralizado. `rounded-dialog shadow-overlay`.
- `aria-labelledby` = título; `aria-describedby` opcional. Botão fechar `IconButton` "Fechar".
- Clique no backdrop fecha só em dialogs informativos (termos, lightbox); em confirmação, não.
- Foco inicial: no primeiro controle útil (em termos: botão "Fechar"/conteúdo rolável com `tabIndex=0`).

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

#### Toast
Feedback **efêmero e não essencial** de uma ação (ex.: "Link copiado", "Não foi possível confirmar a
reserva" — que também aparece inline).
- Região fixa: mobile `bottom-4 inset-x-4` (acima da barra fixa: `bottom-24` quando ela existir),
  ≥ `sm` `bottom-6 right-6 w-96`. Máx. 3 empilhados, mais novo embaixo.
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
| Resumo no topo do form | Título: `Corrija 2 campos para continuar` + lista de links para cada campo |

### 6.4 Vazio

| Situação | Título | Descrição | Ações |
|---|---|---|---|
| Destino sem hotéis (Bonito) | `Nenhum hotel em Bonito, MS` | `Ainda não temos hospedagens neste destino. Tente uma cidade próxima ou outra data.` | `Fazer nova busca` |
| Filtros sem resultado | `Nenhum hotel com esses filtros` | `Tente aumentar a faixa de preço ou remover alguma comodidade.` | `Limpar filtros` (primária) |
| Hotel sem avaliações | `Ainda sem avaliações` | `Este hotel ainda não recebeu avaliações de hóspedes.` | — |
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
| Lento (> 5s) | Texto abaixo do skeleton: `Está demorando mais que o normal…` | — |
| Autocomplete | `Não foi possível carregar os destinos.` | `Tentar de novo` |
| Copiar link falhou | Toast: `Não foi possível copiar. Copie o endereço na barra do navegador.` | — |

Nunca mostrar `error.message` cru da API ("Falha simulada pela mock API") nem status HTTP ao usuário.

### 6.6 Disponibilidade

| Situação | Visual | Texto |
|---|---|---|
| Esgotado (hotel/quarto) | Badge `danger` + botão desabilitado | Badge `Esgotado` · botão `Esgotado` · nota `Sem quartos disponíveis para estas datas.` |
| Escassez (1–2) | Badge `warning` | `Apenas 1 quarto!` / `Apenas 2 quartos!` |
| Disponível | — | Nada (não poluir) |
| Quarto ficou indisponível no checkout | Alert `warning` | `Este quarto esgotou enquanto você reservava. Escolha outro quarto no mesmo hotel.` + `Ver quartos` |

### 6.7 Sucesso e outros

- Toast copiar link: `Link copiado.`
- Confirmação: h1 `Reserva confirmada` · `Enviamos os detalhes para nome@exemplo.com.` (simulado) ·
  `Número da reserva` em destaque `tabular-nums`.
- Política de cancelamento: `free` → `Cancelamento grátis` (badge success) · `moderate` → `Cancelamento com
  reembolso parcial` · `strict` → `Sem reembolso em caso de cancelamento`. Detalhe expansível na F4.
- `aria-label`s padrão: `Fechar`, `Fechar notificação`, `Limpar destino`, `Foto anterior`, `Próxima foto`,
  `Página {n}`, `Diminuir {campo}`, `Aumentar {campo}`, `Copiar link do hotel`, `Paginação`, `Você está aqui`.

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
| atoms | Button (+ButtonLink), IconButton, Input, Select, Checkbox, Radio, Badge, Stars, Skeleton, Spinner, PriceTag, icons | F1 |
| molecules | Field, Stepper, Alert, Card, RatingScore, Breadcrumb, Pagination, EmptyState, ErrorState, DateRange, Combobox | F1 (Combobox e DateRange podem nascer na F2 e ser promovidos se reutilizados) |
| organisms | Dialog, Drawer, Toast/Toaster, Header, Footer | F1 (Drawer pode nascer na F3) |
| feature | HotelCard, RoomCard, Gallery/Lightbox, PriceBreakdown, StepIndicator | F3–F5, compondo os acima |
