# F7a — product-extras (favoritos, comparação, histórico, notificações, animações)

## Objetivo

Entregar os itens de produto da seção 6 do enunciado ("Features"): **favoritos** persistidos,
**comparação de até 3 hotéis**, **histórico de reservas**, **notificações** (estendendo o toast da
F1) e **animações com Motion** (pacote `motion`, sucessor do Framer Motion). Tudo funciona sem conta e
sem backend novo: o navegador guarda só ids validados com Zod, e os dados sempre vêm da mock-api.
As animações seguem o design system: respeitam `prefers-reduced-motion`, não causam layout shift e
nunca movem um alvo que está sob o ponteiro.

## Escopo

**Pré-requisitos:** F3b, F4, F5 e F6 na `main`. A F7a usa o `HotelCard` "só `article`" da F3b,
o `SimilarHotelCard`/`room-comparison`/`from-price`/`breadcrumb` da F4, o `StepIndicator`/
`useCheckoutForm` da F5 e o `shared/lib/booking-history.ts` + `fetchBooking` da F6. Se algum nome
real divergir do que está aqui, a tarefa usa o nome real e registra no `CLAUDE.md`.

**Entra**
- **Favoritos** (`shared/saved` + feature `favorites`, rota `/favoritos`)
  - Coração no card da busca (F3/F3b), no cabeçalho do detalhe (F4), nos cards de `/favoritos` e no
    cabeçalho de coluna de `/comparar`.
  - Contador no header global (link "Favoritos").
  - Página `/favoritos`: lista com os 4 estados. Desfavoritar ali deixa o card no lugar, num estado
    "removido" com "Desfazer". Ids que a API não devolve saem do storage.
  - Persistência em `localStorage` com Zod e sincronização entre abas (`storage` event).
- **Comparação** (`shared/saved` + feature `hotel-comparison`, rota `/comparar`)
  - Checkbox "Comparar" no card da busca, no detalhe e em `/favoritos`. Limite de 3 com explicação.
  - **Bandeja de comparação** fixa no rodapé (todas as rotas, menos checkout, confirmação e
    `/comparar`), com contador, chips (≥ `sm`), "Limpar" e "Comparar".
  - `/comparar?hotel=1&hotel=4&hotel=7`: tabela lado a lado (DS "Tabela de comparação") com destaque
    de diferenças, "Mostrar só diferenças", selos "Menor preço"/"Melhor nota", "a partir de" calculado
    pelos quartos e "Remover" por coluna. O link pode ser compartilhado e funciona sem storage.
- **Histórico de reservas** (feature `booking-history`, rota `/minhas-reservas`)
  - Lê os ids que a F6 grava (`infotera:booking-history`) e faz `GET /bookings/:id` para cada um (até
    10, em paralelo). `404` tira o id do storage e avisa. Outros erros dão retry por item.
  - Status da estadia (Próxima · Em andamento · Concluída), que a F6 deixou para cá.
  - "Remover do histórico" com Desfazer na própria linha, e "Limpar histórico" com confirmação.
- **Notificações (toast da F1 estendido)**
  - `key` para deduplicar e substituir no lugar (clicar 5× no coração gera 1 toast).
  - Duração por tipo e mais tempo quando há ação. Timer pausado **na região inteira** com hover ou
    foco e quando a aba fica oculta.
  - Entrada e saída animadas. A posição sobe acima da bandeja (variável `--bottom-bar-height`).
  - Toasts novos: favoritar/desfavoritar, limite da comparação, comparação limpa, histórico apagado.
- **Animações (`motion@14.14.0`, versão exata)**
  - `LazyMotion` + `domAnimation` carregado de forma assíncrona, `m.*` em modo `strict`,
    `MotionConfig reducedMotion="user"`, presets puros com os tokens do DS §1.8.
  - Entrada das listas: resultados da F3 (páginas e feed da F3b), favoritos e histórico. Só opacidade,
    com stagger.
  - Dialog e sheet (shared `Dialog`): entrada e **saída** animadas. A saída acontece antes do
    `close()`, e o foco volta ao gatilho depois dela.
  - Troca de passo do checkout (F5): só a entrada do passo novo, na direção do avanço.
  - Feedback de favoritar (pulso do ícone dentro de uma caixa fixa), bandeja subindo e descendo, toasts
    e pulso do contador do header.

**Fora (e por quê)**
- **Favoritos/histórico no servidor:** não há autenticação e a mock-api não tem esse recurso
  (`POST /favorites` → 404 no json-server 0.17, porque só existem as coleções do `db.json`). Sem
  identidade, uma lista no servidor seria a mesma para todo mundo. Vai para o README como evolução.
- **Listar reservas com `GET /bookings`:** devolve as reservas (com PII) de todos os usuários. Já foi
  descartado na F6 (Decisão 9a).
- **Total da estadia na comparação:** `/comparar` não carrega critérios de busca (o link é
  compartilhável e a pessoa compara antes de escolher as datas). A diária "a partir de" é comparável.
  O total aparece no detalhe.
- **Arrastar para fechar toast (swipe):** o botão "Fechar notificação" (44 px) já resolve. Arrastar
  na horizontal conflita com a rolagem da tabela de comparação e precisaria de uma alternativa de
  teclado.
- **Central de notificações / histórico de toasts:** o enunciado pede "toast system". Os toasts deste
  app são confirmações efêmeras: o estado fica visível na própria UI (coração, bandeja, linha).
- **Transição entre rotas (View Transitions, exit de página):** o App Router não segura a rota antiga
  para animar a saída sem hack. Também atrasaria a navegação e não é pedido.
- **Animação de skeleton → conteúdo e de valores (preço rolando):** atrasa a leitura. A F5 já proíbe
  animar o total.
- **Limite de favoritos visível ao usuário:** existe um teto técnico de 100 (storage). Com 60 hotéis
  no seed, ele nunca aparece no uso normal. Tem mensagem, mas sem UI dedicada.
- **Mapas, offline/PWA, i18n (F7b) e PPR/Server Actions/Parallel Routes/ISR/Edge (F7c):** são as
  outras specs. As costuras estão na seção "Costuras com F7b e F7c".

## Decisões

1. **Favoritos e comparação vivem em `src/shared/saved/`, uma fatia de produto dentro de `shared`.**
   Os controles aparecem em três features (F3 card, F4 cabeçalho, páginas novas) e no header global.
   Pela regra de dependência, esse código tem que estar em `shared`. Só que `shared/ui` não pode ter
   texto de negócio. Por isso criamos `shared/saved/` com `stores/`, `components/`, `model/` e
   `messages.ts`, com as mesmas regras de `shared` (não importa `features/` nem `app/`).
   Descartados:
   - (a) Componentes em `shared/ui` recebendo todos os textos por props. A mesma microcopy ficaria
     repetida em 4 lugares e iria divergir.
   - (b) Uma feature `favorites` importada pelas outras. Viola "feature não importa feature".
   - (c) Cada feature com seu próprio botão. Seriam três implementações de um mesmo estado global.

2. **Dois stores Zustand separados com `persist` em `localStorage`, validados com Zod, com
   `skipHydration` e sincronizados entre abas.**
   - `infotera:favorites`: `{ items: [{ id, addedAt }] }`, mais recente primeiro, teto 100.
   - `infotera:comparison`: `{ items: [{ id, name }] }`, na ordem de inclusão, teto 3.
   O `merge` passa o valor persistido por `sanitizeFavorites`/`sanitizeComparison` (funções puras,
   **tolerantes por item**): item inválido sai, os válidos ficam, há dedupe por id e corte no teto. Um
   item corrompido não apaga a lista inteira. O `BookingDraftHydrator` vira `StoreHydrator`: reidrata
   os três stores no mount e ouve o evento `storage` (outra aba gravou → `persist.rehydrate()` do
   store daquela chave). O nome do hotel entra na comparação só para os chips da bandeja (dado
   público, texto de 1–120 caracteres, renderizado como texto). Favoritos guardam só o id.
   Descartados:
   - (a) Um store único "saved": acopla teto, ordem e ciclo de vida diferentes, e qualquer escrita
     regrava os dois.
   - (b) `sessionStorage` para a comparação: some ao abrir o link do hotel em outra aba, que é
     exatamente quando a pessoa compara.
   - (c) Validação "tudo ou nada": um item corrompido apagaria todos os favoritos.
   - (d) Guardar um snapshot do hotel (preço, nota): fica obsoleto. As páginas sempre buscam na API.

3. **Um request para N hotéis: `GET /hotels?id=1&id=4&id=7`, em `shared/api` (3 usos).**
   Verificado na mock-api: `id` repetido funciona como OU, e um id inexistente simplesmente não volta
   (`?id=1&id=4&id=999` → `[1, 4]`). `fetchHotelsByIds(ids)` **nunca chama a API com lista vazia**
   (sem `id`, o json-server devolveria os 60 hotéis), deduplica e ordena os ids na query key
   (`queryKeys.hotels.byIds`). Os quartos da comparação usam o mesmo truque
   (`GET /rooms?hotelId=1&hotelId=4` verificado), mas ficam na feature (1 uso).
   Descartados:
   - (a) `hotelQueryOptions(id)` por hotel com `useQueries`: até 100 requests nos favoritos, em vez
     de 1.
   - (b) Paginar com `_page`: não serve para um conjunto arbitrário de ids, que é sempre ≤ 100.

4. **Histórico: um `GET /bookings/:id` por id (até 10) com `useQueries`. Só `404` tira o id do
   storage.** É o contrato fechado na F6 (Decisão 9). Cada linha tem seu estado (carregando, erro
   com retry, ilegível, encontrada). `classifyHistoryResults` (pura) separa `found`/`missing`/
   `failed`/`unreadable`/`pending`. Um efeito remove os `missing` uma única vez e mostra o aviso
   "N reservas não existem mais". Erro de rede, 5xx e offline **nunca** apagam, porque a reserva
   pode existir. Os nomes dos hotéis vêm de **um** `fetchHotelsByIds` com os `hotelId` das reservas
   encontradas. `bookingQueryOptions` sobe da F6 para `shared/api/queries.ts` (2º uso) com
   `meta: { sensitive: true }` (ver costura com a F7b).
   A ordem das linhas é a do storage (`savedAt` desc) e **não muda quando os dados chegam**.
   Agrupar em "Próximas/Anteriores" exigiria esperar todas as reservas ou reordenar a lista com o
   ponteiro em cima.
   Descartados:
   - (a) `GET /bookings?id=a&id=b`: um bug que mande a lista vazia devolve a PII de todos. Além disso,
     o 404 deixa de ser explícito.
   - (b) Agrupar por status: a lista reflui enquanto carrega (alvo se move).
   - (c) Apagar ids em qualquer erro: apagaria reservas válidas offline.

5. **Remover numa lista pessoal não reflui a lista: a linha vira um "fantasma" no mesmo lugar, com
   Desfazer.** Em `/favoritos` e `/minhas-reservas`, remover troca o conteúdo da linha por "Removido
   dos favoritos. [Desfazer]" ou "Reserva removida do histórico. [Desfazer]". O conteúdo original
   continua renderizado `invisible` + `inert` na mesma célula de grid (`grid` com os dois filhos em
   `col-start-1 row-start-1`). Assim a altura é idêntica sem medir nada, nada abaixo se move, e o
   foco vai para o "Desfazer", que fica onde estava o botão. Os fantasmas somem na próxima visita
   (o snapshot de ids da página é tirado no mount). O Desfazer inline satisfaz "toast nunca é o único
   canal" (DS §0.4), e nessas páginas não há toast de remoção.
   Descartados:
   - (a) Remover a linha com animação de altura: tudo abaixo sobe sob o ponteiro.
   - (b) Só toast com Desfazer: 5–10 s para agir e o foco se perde.

6. **Comparação: o store é a seleção (bandeja), a URL é a página.**
   - "Comparar" da bandeja é um `<Link href="/comparar?hotel=1&hotel=4">`. `/comparar` lê **só** a
     URL (`useSearchParams`) com `parseCompareParams` (pura e tolerante: ignora o que não é inteiro
     positivo, deduplica, corta em 3, mantém a ordem).
   - Remover uma coluna faz `history.replaceState`, o mesmo padrão da F3. Se o id também estiver na
     bandeja, ele sai de lá (mesma intenção).
   - Um link compartilhado funciona sem storage e não altera a bandeja de quem abre.
   - Sem `hotel` na URL: `EmptyState`. Se a bandeja tiver ≥ 2 hotéis, aparece também o link "Comparar
     os N hotéis selecionados".
   - Vocabulário `hotel` repetido, como `type`/`amenity` da F3.
   Descartados:
   - (a) Página lendo o store: o link não seria compartilhável, quebraria em outra aba e no modal da
     F7c (Parallel Routes intercepta pela URL).
   - (b) `?ids=1,4,7`: outro formato de lista na URL do app.
   - (c) Sincronizar a URL de volta na bandeja ao abrir: quem abre um link de outra pessoa teria a
     seleção sobrescrita.

7. **Tabela de comparação promovida da F4 (2º uso).** `makeRow`/`ComparisonRow`/`onlyDifferences`
   de `hotel-details/model/room-comparison.ts` vão para `shared/lib/comparison.ts`. A parte de
   apresentação (tabela com `th` sticky, linhas que diferem, "Mostrar só diferenças", anúncio)
   vira `shared/ui/molecules/ComparisonTable.tsx`, com cabeçalhos de coluna por slot. A F4 passa a
   usar as duas sem mudança visual. `lowestNightlyPrice` (F4 `from-price.ts`) vai para
   `shared/lib/pricing.ts`. `searchHref` (F4 `breadcrumb.ts`) vai para `shared/lib/links.ts`.
   O modelo da comparação de hotéis (`buildHotelComparison`) acrescenta `best: number[]` por linha
   (colunas com o menor preço ou a maior nota; vazio quando todas empatam).
   Descartado: uma segunda tabela na feature nova, porque duplicaria a parte de a11y mais delicada do
   DS.

8. **"A partir de" na comparação vem dos quartos, como no detalhe.** O preço do hotel diverge dos
   quartos (hotéis 1 e 4, TEST_MAP #6). A comparação é a tela de decisão, então mostra o mesmo número
   que a pessoa vai ver ao abrir o hotel. Hotel sem quartos usa o `pricePerNight` do hotel. Hotel com
   todos os quartos esgotados recebe a nota "Esgotado". A view só sai de `loading` quando hotéis **e**
   quartos chegaram (um único estado de erro com retry, que refaz só as queries que falharam).
   Descartado: `pricePerNight` do hotel (coerente com o card da F3, mas a comparação mostraria R$ 1.200
   e o detalhe R$ 800).

9. **Limite da comparação: o 4º "Comparar" não marca e explica, sem ficar `disabled`.** Com 3 na
   bandeja, os checkboxes não marcados ganham `aria-disabled="true"` e `aria-describedby` para a
   dica "Limite de 3 hotéis na comparação." (visível na bandeja). Clicar mantém o checkbox desmarcado
   (input controlado), anuncia na região viva da bandeja e mostra o toast info com a ação "Ver
   comparação". O controle continua focável e explica o motivo (padrão `aria-disabled` do DS).
   Descartados:
   - (a) `disabled`: some do Tab e não explica por quê.
   - (b) Substituir o mais antigo: tira da comparação algo que a pessoa escolheu, sem avisar.

10. **Controles secundários dentro do `Card interactive` (muda o DS §5.2 Card).** Hoje o DS diz
    "Nenhum outro elemento focável dentro do card". Passa a valer: **até 2** controles secundários
    (favoritar e comparar), **depois do link no DOM**, com `relative z-10` (acima do `::after` do
    link), nome acessível com o nome do hotel e clique que não navega. O coração fica sobre a foto
    (`absolute top-2 right-2`, `IconButton overlay`, 44 px). O "Comparar" fica numa linha própria
    no fim do card (`min-h-11`). O skeleton ganha essa linha.
    Ordem de foco: nome → coração → Comparar.
    Descartados:
    - (a) Controles que aparecem só no hover: não existem no touch e mudam o layout.
    - (b) Controles dentro do link: elemento interativo aninhado (HTML inválido).
    - (c) "Comparar" também sobre a foto: dois botões na foto escondem a imagem, e um ícone de
      comparar sem texto é ambíguo.

11. **Bandeja global montada no layout raiz, reservando espaço com uma variável CSS.**
    - `CompareTray` (client, `shared/saved`) fica no `app/layout.tsx` e é escondida por
      `isTrayHiddenOn(pathname)` (pura) em `/checkout`, `/confirmation/*` e `/comparar`.
    - Quando visível, um `ResizeObserver` grava a altura em `--bottom-bar-height` no
      `documentElement`. Quando some, grava `0px`.
    - O `<main>` usa `pb-[calc(var(--bottom-bar-height,0px)+1.5rem)]`: o espaço cresce **no fim** da
      página e nada acima se move. O `Toaster` usa
      `bottom-[calc(var(--bottom-bar-height,0px)+1rem)]`. O `html` ganha
      `scroll-padding-bottom: var(--bottom-bar-height, 0px)`.
    - Foco não escondido (WCAG 2.4.11): no `focusin`, se `isObscuredByBar(rect.bottom, barTop)`, o
      elemento rola com `block: "nearest"`. Isso **só** acontece por foco (teclado), nunca por clique
      de mouse, para não mover o alvo sob o ponteiro.
    - No celular a bandeja tem uma linha só (68 px). Os chips aparecem a partir de `sm`.
    - Os três `calc()` entram como exceção de geometria listada no DS.
    Descartados:
    - (a) Montar a bandeja só nas páginas que têm "Comparar": ela sumiria ao navegar entre busca,
      detalhe e favoritos, que é o fluxo de comparar.
    - (b) Rolar a página quando a bandeja aparece sobre o checkbox clicado: move o alvo sob o ponteiro.
    - (c) Altura fixa em classe: a bandeja muda de altura com zoom de 200% e entre larguras.

12. **Header: `SiteHeader` ganha um slot `actions`, e `SavedNav` (client) entra pelo layout.**
    - Links "Favoritos" (contador) e "Minhas reservas", com `aria-current="page"` na rota ativa.
    - < `sm`: só ícone (44 px) com `aria-label` ("Favoritos, 3 hotéis" / "Minhas reservas").
      ≥ `sm`: ícone + texto.
    - O espaço do contador é **reservado** (`min-w-5`, `invisible` com 0): o servidor renderiza 0
      (store não hidratado) e o cliente mostra o número sem empurrar nada.
    - "Comparar" não entra no header: a bandeja já é o acesso.
    - O `SiteHeader` continua Server Component.

13. **Motion: `motion@14.14.0` exata, `LazyMotion` com features assíncronas e `strict`, só `m.*`.**
    - `MotionProvider` (client) em `AppProviders`:
      `<LazyMotion features={loadMotionFeatures} strict><MotionConfig reducedMotion="user">`.
      `loadMotionFeatures = () => import("./motion-features").then((mod) => mod.default)`, e o
      arquivo exporta `domAnimation`. O `m` inicial custa ~5 kB. As features (~15 kB gz) chegam
      depois da hidratação, fora do caminho crítico.
    - `strict` faz o `motion.*` (bundle cheio) lançar erro.
    - Imports só de `motion/react`. O Biome `noRestrictedImports` bloqueia `framer-motion`.
    - Verificado no pacote: `motion/react` reexporta `LazyMotion`, `domAnimation`, `m`, `MotionConfig`,
      `AnimatePresence`, `useReducedMotion` e `MotionGlobalConfig`. O peer é React ^19.
    Descartados:
    - (a) `framer-motion` (nome antigo, mesmo código).
    - (b) `motion` sem `LazyMotion` (~34 kB no bundle de toda rota).
    - (c) CSS puro: o enunciado pede Framer Motion, e saída de elemento (toast, painel do dialog)
      precisa de presença (`AnimatePresence`).

14. **Política de movimento (muda o DS §1.8): animação nunca desloca layout nem alvo sob o
    ponteiro.**
    - Só `opacity` e `transform` (nada de `height`/`width`/`top`).
    - Nada com `initial` invisível em conteúdo renderizado no servidor ou na imagem LCP. Isso
      esconderia conteúdo sem JS e pioraria o LCP. Só anima o que o cliente monta.
    - Listas: só opacidade, sem translate (o card fica parado onde vai ser clicado). Stagger de
      40 ms nos 6 primeiros itens (teto de 240 + 200 ms) e só no **primeiro** mount de cada item.
    - No feed virtualizado (F3b), `shouldAnimateItem(index, seenCount)`: itens remontados pela
      virtualização ao rolar de volta não piscam.
    - Elementos fixos (toast, bandeja, sheet) podem transladar: não empurram nada.
    - Ícone de favoritar: `scale` 1 → 1,3 → 1 em 300 ms **dentro** de uma caixa de 44 px fixa.
    - **Reduced motion:** `MotionConfig reducedMotion="user"` desliga transform/layout. Os presets
      (`motionPreset(name, reduced)`, puro) também zeram deslocamento e escala e limitam o fade a
      150 ms. "Nada se move" é o mesmo resultado da regra CSS global, que já zera as animações CSS.
    - Testes: `MotionGlobalConfig.skipAnimations = true` no `vitest.setup.ts`.
    Descartados:
    - (a) translateY na entrada dos cards: o card desliza 8 px sob o clique.
    - (b) Zerar também o fade com reduced motion: aparição seca de toast/dialog. Fade curto não é
      movimento (WCAG 2.3.3 trata de movimento).

15. **Dialog/sheet: o painel anima dentro de um `<dialog>` que só fecha depois da saída.**
    - O `Dialog` de `shared` move o visual (fundo, raio, sombra) do `<dialog>` para um `m.div`
      dentro de `AnimatePresence`. O `<dialog>` vira contêiner transparente.
    - `open=false` dispara a saída. `onExitComplete` chama `dialog.close()`, restaura o `overflow` e
      devolve o foco ao gatilho.
    - O backdrop some junto com o painel por CSS: `dialog[data-closing]::backdrop { opacity: 0;
      transition: opacity 200ms var(--ease-exit) }`.
    - Presets: `center` = fade + `scale` 0,96 → 1 (300 ms, `ease-standard`). `sheet` = `y` 100% → 0
      (300 ms). `full` (lightbox) = fade 200 ms. Saída 200 ms com `ease-exit`.
    - As classes CSS `animate-slide-up`/`animate-fade-in` saem do Dialog.
    - O `cancel` (Esc) continua com `preventDefault` + `onClose`. Se o Chrome forçar o fechamento
      (close watcher), o evento `close` sincroniza o estado sem animação.
    Descartados:
    - (a) `dialog.close()` imediato com animação só de entrada (estado atual): a saída "pisca".
    - (b) WAAPI direto no `<dialog>` (`useAnimate`): é um segundo jeito de animar, e o mini não lê o
      `MotionConfig`.

16. **Checkout: só o passo novo anima, na direção do avanço, sem saída.**
    - `m.div key={step}` com `x: ±16 → 0` + `opacity` (200 ms). `stepDirection(prev, next)` é pura.
    - Avançar entra pela direita e voltar entra pela esquerda.
    - `initial={false}` no primeiro passo (sem animar na carga).
    - Wrapper `overflow-x-clip`: sem rolagem horizontal em 320 px.
    - Sem saída: não há intervalo em que o foco fica num passo desmontando. O foco no `h2` do passo
      (F5) continua igual.
    Descartado: `AnimatePresence mode="wait"`. Atrasa o passo novo e deixa o foco órfão por 200 ms.

17. **Toast estendido sem quebrar a API da F1.**
    - `toast.success/error/info(message, { action?, key?, duration? })`.
    - `pushToast(list, item)` (pura): uma `key` igual substitui o item **no lugar** (mesma React
      key, `version` +1 reinicia o timer), mantém o teto de 3, e o mais novo fica embaixo.
    - Durações: 5 s (success/info), 8 s (error), **10 s com ação** (WCAG 2.2.1). O Desfazer também
      existe fora do toast.
    - O timer pausa com hover ou foco **em qualquer toast da região**: nenhum toast some e empurra
      outro para baixo do ponteiro. Também pausa com `visibilitychange` hidden.
    - Entrada: `y` 16 → 0 + fade (200 ms). Saída: fade (150 ms). Os vizinhos se reposicionam com
      `layout="position"`.
    - As regiões `role="status"`/`role="alert"` continuam sempre montadas e sem roubar foco.
    Descartados:
    - (a) Pausa por item (atual): um toast acima some e o que está sob o mouse se move.
    - (b) Atalho de teclado para focar os toasts: não há ação que só exista no toast.

18. **Toasts só onde a mudança não é óbvia na tela.**
    - Favoritar no card ou no detalhe → `Hotel salvo nos favoritos.` + "Ver favoritos".
    - Desfavoritar → `Hotel removido dos favoritos.` + "Desfazer".
    - Ambos com `key: "favorite:<id>"`.
    - Limite da comparação → toast info (Decisão 9).
    - "Limpar comparação" na bandeja → `Comparação limpa.` + "Desfazer". O foco vai ao `<main>`,
      porque a bandeja desmonta.
    - "Limpar histórico" → `Histórico apagado.` + "Desfazer".
    - Sem toast: marcar/desmarcar "Comparar" (a bandeja anuncia) e remoções em `/favoritos` e
      `/minhas-reservas` (Decisão 5).

19. **Rotas em pt-BR, como pedido para esta fase: `/favoritos`, `/comparar`, `/minhas-reservas`.**
    - As rotas existentes (`/search`, `/hotel`, `/checkout`, `/confirmation`) não mudam.
    - As três páginas são **casca estática + ilha cliente**: nenhum dado no servidor, nada de
      `searchParams` no RSC (`/comparar` lê a URL no cliente dentro de `<Suspense>`).
    - Todas com `robots: { index: false }`: o conteúdo depende do navegador.
    Descartado: renomear as rotas antigas para pt-BR. Quebra links e E2E sem ganho.
    A inconsistência de idioma fica registrada no README (ver Riscos).

20. **Microcopy em `messages.ts` por módulo.** Todo texto novo (incluindo `aria-label`s e plurais)
    sai de constantes/funções em `shared/saved/messages.ts` e `features/<x>/model/messages.ts`.
    Nenhuma string de UI fica solta em JSX. Isso prepara a extração da F7b sem antecipar a
    biblioteca de i18n.

## Contrato de dados

| Uso | Endpoint (verificado na mock-api) | Schema | Query key / options | Onde |
|---|---|---|---|---|
| Hotéis por ids (favoritos, comparação, histórico) | `GET /hotels?id=1&id=4` → só os existentes (`id=999` some), `_fail=1` → 500 | `z.array(hotelSchema)` | `queryKeys.hotels.byIds(ids)` = `["hotels","by-ids",sortedUniqueIds]` · `hotelsByIdsQueryOptions(ids)` (shared, `enabled: ids.length > 0`) | `shared/api/endpoints.ts` (`fetchHotelsByIds`, sem request com `[]`) |
| Quartos dos hotéis comparados | `GET /rooms?hotelId=1&hotelId=4` (verificado: 4 quartos dos dois hotéis) | `z.array(roomSchema)` | `["rooms","by-hotels",sortedIds]` (adicionar em `queryKeys.rooms.byHotels`) · `comparisonRoomsQueryOptions` | `features/hotel-comparison/api/rooms.ts` |
| Reserva (histórico) | `GET /bookings/{encodeURIComponent(id)}` → 200 ou 404 (verificado com UUID inexistente) | `bookingSchema` (versão F5) | `queryKeys.bookings.detail(id)` · `bookingQueryOptions(id)` **promovido** para `shared/api/queries.ts`, `meta: { sensitive: true }` | `features/booking-history/hooks` |
| Hotéis das reservas | `GET /hotels?id=…` | idem | `hotelsByIdsQueryOptions(hotelIdsDasReservasEncontradas)` | idem |

Sem endpoint novo de escrita: favoritos, comparação e histórico não fazem `POST`.

**Storage**

| Chave | Tipo | Conteúdo (Zod) | Escreve | Lê |
|---|---|---|---|---|
| `infotera:favorites` | local (Zustand persist v1) | `{ items: { id: int>0, addedAt: ISO datetime }[] }` (≤ 100, dedupe, desc) | `shared/saved` | header, F3, F4, favorites, comparison |
| `infotera:comparison` | local (Zustand persist v1) | `{ items: { id: int>0, name: string 1–120 }[] }` (≤ 3, ordem de inclusão) | `shared/saved` | bandeja, F3, F4, favorites, comparison |
| `infotera:booking-history` | local (F6) | `{ id: uuid v4, savedAt: ISO datetime }[]` (≤ 10) | F6 (grava) · F7a (remove/restaura) | booking-history |

**Tipos e funções puras novas**
```ts
// shared/saved/model/favorites.ts
type FavoriteEntry = { id: number; addedAt: string };
type ToggleResult = "added" | "removed" | "limit";
sanitizeFavorites(raw: unknown): FavoriteEntry[];             // tolerante por item, dedupe, ≤ 100, desc
toggleFavorite(list, id, now: Date): { list: FavoriteEntry[]; result: ToggleResult };
restoreFavorite(list, entry): FavoriteEntry[];                // desfazer: volta com o addedAt original

// shared/saved/model/comparison.ts
type CompareEntry = { id: number; name: string };
type CompareToggleResult = "added" | "removed" | "full";
MAX_COMPARE = 3;
sanitizeComparison(raw: unknown): CompareEntry[];
toggleCompare(list, entry): { list: CompareEntry[]; result: CompareToggleResult };
compareHref(ids: readonly number[]): string;                  // "/comparar?hotel=1&hotel=4"
isTrayHiddenOn(pathname: string): boolean;                    // /checkout, /confirmation/*, /comparar
isObscuredByBar(elementBottom: number, barTop: number): boolean;

// shared/lib/motion.ts
type MotionPresetName = "list-item" | "dialog-center" | "dialog-sheet" | "dialog-full" | "toast" | "tray" | "step" | "favorite-pulse" | "badge-pulse";
motionPreset(name, reduced: boolean): { initial; animate; exit?; transition };  // tokens do DS §1.8
staggerDelay(index: number): number;                          // 0,04 × min(index, 5) s
shouldAnimateItem(index: number, seenCount: number): boolean;
stepDirection(prev: number, next: number): 1 | -1;

// shared/ui/toast/toast-model.ts
pushToast(list: ToastItemData[], item: ToastItemData): ToastItemData[];
toastDuration(tone: ToastTone, hasAction: boolean, override?: number): number;

// shared/lib/booking-history.ts (F6, acrescentar)
restoreHistoryEntry(list, entry): BookingHistoryEntry[];      // reinsere pela ordem de savedAt, ≤ 10
removeManyFromHistory(ids: readonly string[]): void;
clearBookingHistory(): void;                                  // + subscribeBookingHistory(cb) para useSyncExternalStore (evento storage + evento interno)

// features/hotel-comparison/model
parseCompareParams(params: URLSearchParams): number[];        // ≤ 3, inteiros > 0, dedupe, ordem preservada
buildHotelComparison(hotels: Hotel[], rooms: Room[]): { hotels; rows: (ComparisonRow & { best: number[] })[] };
missingIds(requested: number[], returned: Hotel[]): number[];

// features/favorites/model
deriveFavoritesView(input): "hydrating" | "empty" | "loading" | "error" | "success";
orderBySnapshot(hotels: Hotel[], snapshotIds: number[]): Hotel[];

// features/booking-history/model
type StayStatus = "upcoming" | "ongoing" | "completed";
stayStatus(checkIn, checkOut, today): StayStatus;             // switch exaustivo no rótulo
classifyHistoryResults(entries, results): HistoryRow[];       // found | missing | failed | unreadable | pending
```

**Query keys novas** em `shared/api/query-keys.ts`: `hotels.byIds(ids)`, `rooms.byHotels(ids)`.
Ids sempre deduplicados e ordenados na chave: `[4,1]` e `[1,4]` compartilham cache.

## Costuras com F7b e F7c (a F7a entra primeiro; as outras adaptam)

- **F7c — Parallel Routes (modal de comparação):**
  - `ComparisonView` é exportada por `@/features/hotel-comparison` com `headingLevel` (1 na página,
    2 no modal) e sem `<main>`/h1 próprios fora dessa prop.
  - Ela lê os ids por `useSearchParams` e não por props do RSC.
  - O "Comparar" da bandeja é `<Link>`. Com `app/@modal/(.)comparar/page.tsx`, a interceptação
    funciona sem mudar a F7a. Basta envolver a view no `Dialog` (já animado) e fechar com
    `router.back()`.
  - `isTrayHiddenOn` precisa também esconder a bandeja com o modal aberto. A F7c passa a condição
    (ex.: segmento `@modal` ativo).
- **F7c — PPR/ISR:**
  - `/favoritos`, `/comparar` e `/minhas-reservas` são cascas estáticas com ilhas cliente, sem
    `cookies()`/`headers()`/`searchParams` no servidor. Podem ser pré-renderizadas.
  - O `SavedNav` e a `CompareTray` no layout são client e não leem nada do request. Não tornam o
    layout dinâmico.
  - A confirmação (F6) continua dinâmica. O histórico só a linka.
- **F7c — Server Actions:** favoritos, comparação e histórico são locais. Não há mutation de servidor
  nesta fase.
- **F7b — i18n:**
  - Todo texto novo está em `messages.ts` (Decisão 20). Plurais pela `pluralize`, moeda e datas pelos
    formatadores de `shared/lib`.
  - Os slugs `/favoritos`, `/comparar` e `/minhas-reservas` **não** são traduzidos pela F7a. Se a
    F7b prefixar rotas por locale, as três entram no mesmo esquema.
  - `compareHref` e os `href` do `SavedNav` são as únicas fontes desses caminhos.
- **F7b — offline/cache persistido:**
  - `bookingQueryOptions` tem `meta: { sensitive: true }`. O persister da F7b **não** deve gravar
    queries com essa marca (reserva tem nome, e-mail e telefone).
  - `hotels.byIds`/`rooms.byHotels` são seguros para persistir.
  - Offline: favoritar/comparar funcionam (local), e as páginas mostram o `Alert` de offline do DS
    com os dados em cache, quando houver.
  - O histórico nunca apaga ids por erro de rede (Decisão 4).
- **F7b — mapas:** nenhuma interseção. Se o mapa interativo tiver popups de hotel, eles podem reusar o
  `FavoriteButton`.

## Critérios de aceite

**Favoritos**
1. Dado o card de um hotel em `/search`, quando clico no coração (ou Tab até ele e Enter/Espaço),
   então ele fica preenchido, tem `aria-pressed="true"`, o nome acessível é "Salvar nos favoritos:
   {nome}", o link do card **não** navega e aparece 1 toast "Hotel salvo nos favoritos." com "Ver
   favoritos". Clicar 5× seguidas mantém no máximo 1 toast desse hotel.
2. A ordem de Tab no card é nome → coração → "Comparar". O coração fica sobre a foto, tem alvo de
   44×44 e anel de foco visível. A caixa do botão não muda de tamanho nem de posição durante o pulso
   (bounding box igual antes e depois, E2E).
3. Dado um favorito, quando recarrego a página ou abro outra aba, então o coração continua marcado e
   o header mostra "Favoritos" com o contador 1. Quando desfavorito numa aba, a outra atualiza sem
   reload (`storage`).
4. O contador do header não causa layout shift: o espaço existe com 0 (`invisible`) e o servidor
   renderiza 0. Em < `sm` o link é só ícone com `aria-label` "Favoritos, 1 hotel"
   ("Favoritos, nenhum hotel" com 0). O link da rota atual tem `aria-current="page"`.
5. No detalhe `/hotel/1`, o coração ao lado do `h1` e o "Comparar" na linha de ações funcionam como
   no card, refletem o mesmo estado e não mudam a ordem de foco definida pela F4 além de inserir
   esses dois controles.
6. `/favoritos` com 3 favoritos faz **1** request `GET /hotels?id=…` e lista os 3 do mais recente
   para o mais antigo, com `h1` "Favoritos" e o status "3 hotéis salvos".
7. Em `/favoritos`, quando desfavorito um card, então ele fica no mesmo lugar (mesma altura, nenhum
   outro card se move) com "Removido dos favoritos." e "Desfazer". O foco vai para "Desfazer".
   Desfazer restaura o favorito com o `addedAt` original. Ao recarregar, o removido não aparece.
8. Dado `infotera:favorites` com o id 999 e um item com formato inválido, quando abro `/favoritos`,
   então os hotéis válidos aparecem e, depois da resposta, o 999 e o item inválido não estão mais
   no storage.
9. Estados de `/favoritos`:
   - hidratando/carregando: skeleton com a geometria do card (`aria-busy`, texto sr "Carregando
     seus favoritos…");
   - > 5 s: "Está demorando mais que o normal…";
   - erro (`_fail=1`): `ErrorState` "Não foi possível carregar seus favoritos" + "Tentar de novo",
     que refaz o request;
   - vazio: `EmptyState` "Nenhum hotel salvo ainda" + "Buscar hotéis";
   - offline: `Alert` warning do DS.
   O storage não é alterado em erro.

**Comparação**
10. Quando marco "Comparar" em 1 hotel, então a bandeja entra pelo rodapé com "1 de 3 hotéis ·
    escolha mais 1" e o botão "Comparar" com `aria-disabled`. Clicar nele anuncia "Escolha pelo
    menos 2 hotéis para comparar.". A região viva anuncia "{nome} entrou na comparação. 1 de 3.".
11. Com 3 hotéis, o "Comparar" de um 4º hotel continua focável, tem `aria-disabled="true"` e a
    descrição "Limite de 3 hotéis na comparação.". Clicar não marca e mostra o toast info "Você já
    está comparando 3 hotéis. Remova um para adicionar outro." com "Ver comparação".
12. A bandeja não aparece em `/checkout`, `/confirmation/*` nem `/comparar`. Ela aparece em `/`,
    `/search`, `/hotel/*`, `/favoritos` e `/minhas-reservas` enquanto houver ≥ 1 hotel. Com ela
    visível:
    - (a) o último elemento da página pode ser rolado para fora de baixo dela (`<main>` com o padding
      da variável);
    - (b) os toasts ficam acima dela;
    - (c) navegando por Tab, nenhum elemento focado fica coberto (E2E: `boundingBox().bottom` ≤ topo
      da bandeja);
    - (d) clicar com o mouse num "Comparar" perto do rodapé não rola a página.
13. Em 320 px a bandeja tem uma linha (IconButton "Limpar comparação", texto, "Comparar") sem rolagem
    horizontal. ≥ `sm` mostra chips com "Remover {nome} da comparação".
    "Limpar comparação" esvazia, leva o foco ao `<main>` e mostra "Comparação limpa." com "Desfazer",
    que restaura os 3.
14. "Comparar" na bandeja navega para `/comparar?hotel=1&hotel=4&hotel=7` (ordem de inclusão).
    A página faz 1 `GET /hotels?id=…` e 1 `GET /rooms?hotelId=…` (em paralelo) e mostra a tabela com:
    - caption sr "Comparação entre A, B e C";
    - uma coluna por hotel (foto, nome com link para o hotel, coração, "Remover");
    - as linhas Preço por noite ("a partir de", pelos quartos: hotel 1 → R$ 800), Avaliação,
      Avaliações, Tipo, Destino, Cancelamento, Check-in, Check-out, Disponibilidade, Tipos de quarto,
      Hóspedes por quarto e uma linha por comodidade que algum dos hotéis tem (Sim/Não com ícone).
15. Linhas que diferem seguem o DS (fundo `primary-soft`, borda à esquerda, sr ", diferente entre os
    hotéis"). "Mostrar só diferenças" filtra e anuncia "Mostrando N de M linhas.". O menor preço e a
    maior nota recebem o selo em texto ("Menor preço", "Melhor nota"). Com empate total, nenhum selo.
16. Abrir o mesmo link em um contexto sem storage mostra a mesma tabela e não cria bandeja.
    `?hotel=abc&hotel=1&hotel=1&hotel=4&hotel=7&hotel=9` mostra 1, 4 e 7.
17. "Remover" numa coluna atualiza a URL (`replaceState`, sem novo item no histórico) e tira o hotel
    da bandeja, se estiver nela. Com < 2 colunas, aparece o `Alert` info "Escolha pelo menos 2 hotéis
    para comparar" com "Buscar hotéis em {destino}" e "Ver favoritos".
18. Sem `hotel` na URL: `EmptyState` "Nenhum hotel para comparar". Se a bandeja tiver ≥ 2, aparece
    também "Comparar os N hotéis selecionados".
    Id que a API não devolve: a coluna não aparece e o `Alert` info diz "1 hotel não foi encontrado
    e saiu da comparação.".
    Estados: loading (skeleton da tabela, `aria-busy`), erro em qualquer um dos 2 requests
    (`ErrorState` + "Tentar de novo", que refaz só o que falhou) e lento (> 5 s).
19. Em 320 px a tabela rola dentro da região (`role="region"`, `tabIndex=0`, dica "Arraste para o
    lado para ver todos.") e a página não rola na horizontal. A coluna de rótulos fica fixa.

**Histórico**
20. Dado uma reserva confirmada (F6 gravou o id), quando abro `/minhas-reservas` (link "Minhas
    reservas" do header), então vejo `h1` "Minhas reservas" e a reserva com:
    - nome do hotel (h2);
    - datas e noites ("12–15 dez · 3 noites");
    - hóspedes ("2 adultos · 1 quarto");
    - total em BRL;
    - status ("Próxima estadia" | "Em andamento" | "Concluída", com `useToday`);
    - "Reservada em dd/mm/aaaa";
    - "Ver reserva" (→ `/confirmation/<id>`);
    - "Remover do histórico".
    A página **não** mostra nome do titular, e-mail, telefone, documento nem o id completo.
21. Com 3 ids, 3 `GET /bookings/:id` começam juntos e cada linha mostra seu skeleton até a sua
    resposta. A ordem das linhas é a do storage e não muda quando as respostas chegam.
22. Um id com `404` sai do storage e aparece o `Alert` info "1 reserva não existe mais e saiu da
    lista. Reservas de teste são apagadas quando o sistema reinicia.".
    Um id com 500/offline mostra na linha "Não foi possível carregar esta reserva." + "Tentar de
    novo" (refaz só aquela) + "Remover do histórico", e **continua** no storage.
    Corpo ilegível (parse): "Não foi possível exibir esta reserva." + "Remover do histórico".
23. Hotel da reserva que falha ou não existe: a linha mostra "Hotel indisponível" no lugar do nome e
    o resto da reserva.
24. "Remover do histórico" troca a linha por "Reserva removida do histórico." + "Desfazer" no mesmo
    lugar (mesma altura) e leva o foco ao "Desfazer". Desfazer reinsere na mesma posição.
25. "Limpar histórico" abre o Dialog `sm` "Limpar o histórico?" com "Cancelar" e "Limpar histórico"
    (danger). Confirmar esvazia, mostra o `EmptyState`, leva o foco ao `h1` e mostra o toast
    "Histórico apagado." com "Desfazer". Cancelar/Esc não altera nada e o foco volta ao botão.
26. Vazio: `EmptyState` "Nenhuma reserva neste navegador" + "Buscar hotéis". Sem storage disponível
    (modo privado que lança), a página mostra o vazio sem quebrar.

**Notificações**
27. Toasts com a mesma `key` não empilham: o segundo substitui o primeiro no lugar e reinicia o
    tempo. Toast com ação dura 10 s, erro 8 s e os demais 5 s.
28. Com o mouse ou o foco em qualquer toast, nenhum toast da região some. Com a aba oculta, o tempo
    para e volta a contar ao reexibir (fake timers + `visibilitychange`).
29. As regiões `role="status"` e `role="alert"` continuam sempre montadas. Toast nunca recebe foco
    sozinho. "Fechar notificação" e a ação continuam acessíveis por Tab.

**Animações**
30. `package.json` tem `"motion": "14.14.0"` (exata). Nenhum arquivo importa `framer-motion` (Biome
    bloqueia), e nenhum componente usa `motion.*` (o `LazyMotion strict` lança em teste).
31. Com `prefers-reduced-motion: reduce` (Playwright `reducedMotion: "reduce"`), abrir o sheet de
    filtros, o dialog de termos, trocar de passo no checkout, favoritar e adicionar à comparação não
    produzem `transform` animado. O `motionPreset(…, true)` não tem `x`/`y`/`scale` e tem
    `duration` ≤ 0,15 (unit).
32. Sem reduced motion:
    - os cards de resultado, favoritos e histórico aparecem com fade (só `opacity`);
    - o CLS medido por `PerformanceObserver("layout-shift")` em `/search` (carga + troca de página),
      `/favoritos` (carga + remover) e `/minhas-reservas` é < 0,01;
    - no feed da F3b, rolar para longe e voltar não faz itens já vistos piscarem.
33. Dialog e sheet: ao fechar (Esc, "Fechar", backdrop quando permitido, primária do sheet), o
    painel anima a saída e **só então** o `<dialog>` fecha e o foco volta ao gatilho. Os testes
    existentes de Dialog, sheet de filtros, lightbox e termos continuam verdes.
34. Checkout: avançar anima o passo novo vindo da direita, voltar vindo da esquerda. A primeira
    renderização não anima. O foco continua indo ao `h2` do passo, e não há rolagem horizontal em
    320 px durante a animação.
35. Nenhum conteúdo renderizado no servidor (detalhe do hotel, confirmação, casca das páginas) nem a
    imagem LCP começa invisível: o HTML do servidor não contém `style="opacity:0"` (E2E pela resposta
    HTML de `/hotel/1` e `/search?…`).

**Gerais**
36. axe sem violações em `/favoritos` (cheio, vazio, removido), `/comparar` (3 colunas, só
    diferenças, < 2, vazio), `/minhas-reservas` (cheio, erro de linha, vazio, dialog), `/search` com
    a bandeja, e no header nas duas larguras.
37. As três páginas novas têm `title` ("Favoritos | Infotera Hotéis", "Comparar hotéis | Infotera
    Hotéis", "Minhas reservas | Infotera Hotéis") e `robots` `noindex`. O foco vai ao `h1` ao chegar
    por navegação cliente.
38. `npm run typecheck && npm run lint && npm run test` verdes, `npm run build` verde e React Doctor
    sem erro novo.

## Arquivos

**Novos — `shared`**

| Caminho | Responsabilidade |
|---|---|
| `src/shared/lib/motion.ts` (+test) | tokens do DS §1.8 em segundos/arrays de bezier, `motionPreset`, `staggerDelay`, `shouldAnimateItem`, `stepDirection` |
| `src/shared/providers/MotionProvider.tsx` · `motion-features.ts` | `LazyMotion strict` (features assíncronas) + `MotionConfig reducedMotion="user"` |
| `src/shared/providers/StoreHydrator.tsx` (+test) | substitui `BookingDraftHydrator`: reidrata `booking-draft`, `favorites`, `comparison` e ouve `storage` |
| `src/shared/ui/toast/toast-model.ts` (+test) | `pushToast`, `toastDuration` |
| `src/shared/lib/comparison.ts` (+test) | `ComparisonRow`, `makeRow`, `onlyDifferences`, `YES`/`NO` (promovidos da F4) |
| `src/shared/ui/molecules/ComparisonTable.tsx` (+test) | tabela do DS com cabeçalhos por slot, "Mostrar só diferenças", anúncio, selo `best` |
| `src/shared/ui/molecules/CompactHotelCard.tsx` (+test) | promovido do `SimilarHotelCard` (F4) com `layout: "compact" \| "vertical"` e slots `media`/`actions` |
| `src/shared/saved/stores/favorites.ts` (+test) | store persist + ações (`toggle`, `restore`, `prune`) + `useIsFavorite(id)`, `useFavoriteCount()` |
| `src/shared/saved/stores/comparison.ts` (+test) | store persist + ações (`toggle`, `remove`, `clear`, `restoreAll`) + seletores |
| `src/shared/saved/model/favorites.ts` · `comparison.ts` · `tray.ts` (+tests) | funções puras da seção Contrato |
| `src/shared/saved/messages.ts` | microcopy de favoritos, comparação, bandeja e header |
| `src/shared/saved/components/FavoriteButton.tsx` (+test) | `IconButton` `aria-pressed`, pulso, toast com `key` |
| `src/shared/saved/components/CompareCheckbox.tsx` (+test) | `Checkbox` controlado, limite com `aria-disabled` |
| `src/shared/saved/components/CompareTray.tsx` · `CompareTrayChips.tsx` (+test) | bandeja, live region, variável CSS, foco não coberto |
| `src/shared/saved/hooks/useBottomBarInset.ts` · `useKeepFocusAboveBar.ts` | `ResizeObserver` → `--bottom-bar-height`; `focusin` → `scrollIntoView nearest` |
| `src/shared/saved/components/SavedNav.tsx` (+test) | links do header com contador reservado e `aria-current` |
| `src/shared/saved/index.ts` | API pública da fatia |

**Alterados — `shared`/`app`/docs**

| Caminho | Mudança |
|---|---|
| `package.json` · `package-lock.json` | `motion` `14.14.0` |
| `biome.json` | `noRestrictedImports`: `framer-motion` |
| `vitest.setup.ts` | `MotionGlobalConfig.skipAnimations = true` |
| `src/shared/providers/AppProviders.tsx` (+test) | `MotionProvider`, `StoreHydrator` |
| `src/shared/ui/toast/toast-store.ts` · `Toaster.tsx` (+test) | opções `key`/`duration`, pausa por região e visibilidade, `AnimatePresence`, `bottom` com a variável |
| `src/shared/ui/molecules/Dialog.tsx` (+test) | painel `m.div` + `AnimatePresence`, `close()` no `onExitComplete`, `data-closing` |
| `src/shared/ui/icons.tsx` · `index.ts` | `HeartIcon` (`filled`), `CompareIcon`, `SuitcaseIcon` |
| `src/shared/ui/layout/SiteHeader.tsx` (+test) | slot `actions` |
| `src/shared/api/endpoints.ts` · `queries.ts` · `query-keys.ts` (+tests) | `fetchHotelsByIds`, `hotelsByIdsQueryOptions`, `bookingQueryOptions` (promovido, `meta.sensitive`), chaves `byIds`/`byHotels` |
| `src/shared/lib/pricing.ts` · `links.ts` (+tests) | `lowestNightlyPrice` e `searchHref` promovidos da F4 |
| `src/shared/lib/booking-history.ts` (+test) | `restoreHistoryEntry`, `removeManyFromHistory`, `clearBookingHistory`, `subscribeBookingHistory` |
| `src/app/globals.css` | `scroll-padding-bottom`, `dialog[data-closing]::backdrop` |
| `src/app/layout.tsx` (+test) | `SiteHeader actions={<SavedNav/>}`, `CompareTray`, padding do `<main>` |
| `src/shared/CLAUDE.md` · `src/app/CLAUDE.md` | estrutura `saved/`, motion, toast, rotas novas |
| `docs/design/design-system.md` | §1.8 política de movimento · §5.2 Card com controles secundários · bandeja (§4.5) · Toast (key, 10 s, pausa por região) · ícones · microcopy · exceções de `calc()` |

**Alterados — features existentes**

| Caminho | Mudança |
|---|---|
| `src/features/hotel-search/components/HotelCard.tsx` · `HotelCardSkeleton.tsx` (+tests) | coração sobre a foto, linha "Comparar" |
| `src/features/hotel-search/components/ResultsList.tsx` · `HotelFeed.tsx` (+tests) | `m.li`/`m.article` com fade, `staggerDelay`, `shouldAnimateItem` no feed |
| `src/features/hotel-details/components/HotelHeader.tsx` (+test) | `FavoriteButton` ao lado do h1, `CompareCheckbox` na linha de ações |
| `src/features/hotel-details/model/room-comparison.ts` · `from-price.ts` · `breadcrumb.ts` · `components/RoomComparison*` · `SimilarHotelCard` | passam a usar os promovidos de `shared` |
| `src/features/checkout/components/CheckoutForm.tsx` (+test) | `m.div key={step}` com direção |
| `src/features/booking-confirmation/api/booking.ts` | reexporta/usa `bookingQueryOptions` de `shared` |

**Novos — features e rotas**

| Caminho | Responsabilidade |
|---|---|
| `src/features/favorites/{CLAUDE.md,index.ts}` | `FavoritesView` |
| `.../favorites/model/favorites-view.ts` · `messages.ts` (+test) | `deriveFavoritesView`, `orderBySnapshot` |
| `.../favorites/hooks/useFavoritesPage.ts` | snapshot de ids no mount, query, prune pós-sucesso, fantasmas |
| `.../favorites/components/FavoritesView.tsx` · `FavoriteCard.tsx` · `RemovedFavorite.tsx` · `FavoritesSkeleton.tsx` (+tests) | página e estados |
| `src/features/hotel-comparison/{CLAUDE.md,index.ts}` | `ComparisonView` (`headingLevel`) |
| `.../hotel-comparison/model/compare-params.ts` · `hotel-comparison.ts` · `messages.ts` (+tests) | parse da URL, linhas, selos, `missingIds` |
| `.../hotel-comparison/api/rooms.ts` (+test) | `comparisonRoomsQueryOptions` |
| `.../hotel-comparison/hooks/useComparison.ts` · `useCompareUrl.ts` | queries combinadas; remover coluna (`replaceState`) |
| `.../hotel-comparison/components/ComparisonView.tsx` · `HotelColumnHeader.tsx` · `ComparisonSkeleton.tsx` · `CompareNotice.tsx` (+tests) | tabela e estados |
| `src/features/booking-history/{CLAUDE.md,index.ts}` | `BookingHistoryView` |
| `.../booking-history/model/stay-status.ts` · `history-rows.ts` · `messages.ts` (+tests) | `stayStatus`, `classifyHistoryResults`, rótulos |
| `.../booking-history/hooks/useBookingHistory.ts` · `useHistoryRows.ts` | `useSyncExternalStore` do storage; `useQueries` + prune de 404 |
| `.../booking-history/components/BookingHistoryView.tsx` · `HistoryItem.tsx` · `HistoryItemStates.tsx` · `RemovedHistoryItem.tsx` · `ClearHistoryButton.tsx` (+tests) | página, linha e estados |
| `src/app/favoritos/page.tsx` · `src/app/comparar/page.tsx` · `src/app/minhas-reservas/page.tsx` (+ `loading.tsx` só onde houver Suspense) | cascas com `metadata` |
| `e2e/favorites.spec.ts` · `e2e/comparison.spec.ts` · `e2e/booking-history.spec.ts` · `e2e/motion.spec.ts` · `e2e/helpers/storage.ts` | E2E |

Orçamento do Biome: cada componente ≤ 80 linhas. `CompareTray` delega chips e hooks. `HistoryItem`
delega os estados a `HistoryItemStates`. `ComparisonView` delega cabeçalho de coluna e avisos.

## Tarefas

Cada item é um commit (Conventional Commits, sem atribuição de IA), com o teste que prova o fim.

1. `build(deps): add motion 14.14.0` — `package.json` (exata), `biome.json` (`framer-motion`
   restrito), `vitest.setup.ts` (`skipAnimations`; stub de `Element.prototype.animate` se o jsdom
   reclamar). Prova: `npm ci`, `npm run typecheck`, `npm run build`, `npm run test` verdes.
2. `docs(design): add saved hotels, compare tray and motion policy` — DS §1.8, §5.2 Card, bandeja,
   Toast, ícones, microcopy e exceções de `calc()` (pode ser feito pelo `ui-designer`). Prova:
   revisão.
3. `feat(shared): add motion presets and provider` — `lib/motion.ts`, `MotionProvider`,
   `AppProviders`. Prova: unit (tokens 150/200/300 ms, bezier do DS, `reduced` sem `x/y/scale` e
   `duration ≤ 0,15`, `staggerDelay` com teto, `shouldAnimateItem`, `stepDirection`) + componente
   (`m.div` renderiza dentro do provider).
4. `feat(shared): extend toasts with keys, region pause and motion` — `toast-model`, `toast-store`,
   `Toaster`. Prova: unit (`pushToast`: substitui no lugar, teto 3, ordem; `toastDuration`) +
   componente (critérios 27–29 com fake timers e `visibilitychange`; testes antigos verdes).
5. `feat(shared): animate dialog and sheet exit before closing` — `Dialog`, `globals.css`. Prova:
   componente (fecha só depois do exit, foco volta ao gatilho, `close` forçado sincroniza; Dialog,
   FiltersDrawer e lightbox verdes).
6. `feat(shared): add heart, compare and suitcase icons` — Prova: atoms test (`aria-hidden`,
   `filled`).
7. `feat(shared): add favorites store persisted with zod` — `saved/model/favorites.ts`,
   `saved/stores/favorites.ts`. Prova: unit (toggle, limite 100 → `limit`, restore com `addedAt`,
   sanitize tolerante por item, dedupe, ordem, storage que lança).
8. `feat(shared): add comparison store limited to three hotels` — `saved/model/comparison.ts`,
   `tray.ts`, store. Prova: unit (4º → `full`, remove, clear/restoreAll, sanitize corta em 3,
   `compareHref`, `isTrayHiddenOn`, `isObscuredByBar`).
9. `refactor(shared): hydrate persisted stores and sync across tabs` — `StoreHydrator` no lugar do
   `BookingDraftHydrator`. Prova: componente (evento `storage` da chave reidrata só aquele store;
   testes do `booking-draft` verdes).
10. `feat(shared): fetch hotels by ids and promote booking query options` — endpoints, queries,
    query keys, `booking-confirmation` passa a usar o de `shared`. Prova: unit (`[]` não chama
    `fetch`; query `id=1&id=4`; chave ordenada; `meta.sensitive`) + testes da F6 verdes.
11. `refactor(shared): promote comparison table, compact card, lowest price and search href` — de
    `hotel-details` para `shared`. Prova: testes da F4 (comparação de quartos, similares, breadcrumb,
    from-price) verdes sem mudar asserções + unit novo de `ComparisonTable` (selo `best`, filtro,
    anúncio).
12. `feat(shared): add favorite button and compare checkbox` — Prova: componente (critérios 1, 11;
    não dispara clique do card; `aria-describedby` no limite; toast com `key`).
13. `feat(shared): add compare tray` — `CompareTray`, chips, hooks de inset/foco, `globals.css`.
    Prova: componente (critérios 10, 12–13 em jsdom: rotas ocultas, live region, limpar + desfazer,
    variável gravada; `focusin` sob a barra chama `scrollIntoView`, `pointerdown` + foco não chama).
14. `feat(shared): show saved links in the site header` — `SiteHeader` slot, `SavedNav`,
    `app/layout.tsx`. Prova: componente (critério 4) + `layout.test` verde.
15. `feat(hotel-search): add favorite and compare controls to the hotel card` — Prova: componente
    (critério 2: ordem de Tab, clique não navega; skeleton com a linha nova; testes F3/F3b verdes).
16. `feat(hotel-search): fade in result items` — `ResultsList`, `HotelFeed`. Prova: componente
    (itens `m.*` com delay do preset; no feed, item remontado com índice < `seenCount` não tem
    `initial`).
17. `feat(hotel-details): add favorite and compare controls to the hotel header` — Prova:
    componente (critério 5; ordem de foco da F4 com os dois controles novos).
18. `feat(checkout): animate step changes by direction` — Prova: componente (critério 34: primeiro
    passo sem `initial`, direção por `stepDirection`, foco no `h2`; testes F5 verdes).
19. `feat(favorites): add favorites view model` — `model/`, `messages.ts`. Prova: unit
    (`deriveFavoritesView` em tabela, `orderBySnapshot`, `missingIds`).
20. `feat(favorites): add favorites page` — hook, componentes, `app/favoritos/page.tsx`. Prova:
    componente (critérios 6–9 com `fetch` stubado por URL).
21. `feat(hotel-comparison): parse compare params and build hotel rows` — Prova: unit (critério 16
    no parse; linhas, `differs`, `best` com empate, "a partir de" pelos quartos com hotel 1 = 800,
    sem quartos → preço do hotel, todos esgotados → "Esgotado").
22. `feat(hotel-comparison): add comparison page` — `api/rooms.ts`, hooks, componentes,
    `app/comparar/page.tsx`. Prova: componente (critérios 14–18).
23. `feat(shared): support undo and clear in booking history` — Prova: unit (restaura na posição por
    `savedAt`, teto 10, `removeMany`, `clear`, `subscribe` dispara com escrita na mesma aba e com
    `storage`).
24. `feat(booking-history): add stay status and history rows` — Prova: unit (`stayStatus` nos
    limites: check-in hoje = `ongoing`, check-out hoje = `completed`; `classifyHistoryResults` com
    404/500/parse/pending).
25. `feat(booking-history): add booking history page` — hook, componentes,
    `app/minhas-reservas/page.tsx`. Prova: componente (critérios 20–26).
26. `test(extras): add e2e for favorites, comparison, history and motion` — Prova: E2E verdes nos
    dois projetos (desktop e Pixel 7) + axe (critério 36).
27. `docs(extras): record extras decisions in claude.md files` — `CLAUDE.md` de `shared`, `app`,
    `favorites`, `hotel-comparison`, `booking-history`, `hotel-search`, `hotel-details` e
    `checkout`. Notas de README (dados locais, sem servidor, motion e reduced motion, rotas em pt-BR,
    costuras F7b/F7c). Prova: revisão.

## Plano de testes

**Unit (`model/`, `lib/`, `api/`)**
- `motion.ts`: presets × `reduced` (tabela), stagger, `shouldAnimateItem`, `stepDirection`.
- `toast-model.ts`: `key` substitui no lugar e incrementa `version`, teto 3 descarta o mais antigo,
  durações (com/sem ação, error, override).
- `saved/model/*`:
  - toggle/limite/restore;
  - sanitize com entradas `null`, string, id negativo, `addedAt` inválido, duplicados, 150 itens e
    nome com 500 caracteres;
  - `compareHref`, `isTrayHiddenOn` (tabela de rotas), `isObscuredByBar`.
- `endpoints.ts`: `fetchHotelsByIds([])` sem `fetch`; ids repetidos e desordenados → 1 request
  canônico; erro 500 vira `ApiError`.
- `comparison.ts`/`hotel-comparison.ts`: linhas e diferenças com hotéis do seed (1, 4, 11), `best` e
  empate, comodidades na ordem do enum.
- `compare-params.ts`: inválidos, duplicados, > 3, vazio.
- `booking-history.ts`/`history-rows.ts`/`stay-status.ts`: limites de data, classificação, restore.
- `favorites-view.ts`: tabela de estados (hidratando, vazio, loading, erro com/sem dados, sucesso).

**Componente (Vitest + Testing Library, `renderWithProviders`, `fetch` stubado por URL)**
- `FavoriteButton`, `CompareCheckbox`, `CompareTray`, `SavedNav`, `Toaster`, `Dialog`,
  `ComparisonTable`.
- `FavoritesView`, `ComparisonView` (com `shared/testing/next-navigation` para a URL), `BookingHistoryView`.
- `HotelCard`/`ResultsList`/`HotelFeed`, `HotelHeader`, `CheckoutForm` (regressão das features).
- Motion em teste: `skipAnimations` faz `onExitComplete` disparar logo. Asserções de fechamento usam
  `waitFor`.

**E2E (Playwright, mock-api real, desktop + Pixel 7)**
- `favorites.spec.ts`: favoritar no `/search` → contador → `/favoritos` → remover (fantasma, mesma
  `boundingBox` dos vizinhos) → desfazer → reload. Duas páginas no mesmo contexto: sincronização
  entre abas. Storage adulterado (`addInitScript`): id 999 e item inválido saem. Axe e 320 px.
- `comparison.spec.ts`: 3 hotéis pela busca, 4º bloqueado com toast. Bandeja → `/comparar` (requests
  `GET /hotels?id=` e `GET /rooms?hotelId=` observados). Só diferenças, remover coluna (URL), link em
  contexto novo sem storage, bandeja ausente em `/checkout`. Tab até o último card sem foco coberto.
  Clique perto do rodapé sem rolagem (`scrollY` igual). Axe e 320 px (`scrollWidth` da página ≤
  largura).
- `booking-history.spec.ts`: cria a reserva com o helper da F6 (`POST /bookings` com UUID) e abre a
  confirmação (que grava o id). Em `/minhas-reservas`: conteúdo sem e-mail/telefone/titular. UUID
  inexistente no storage → aviso e prune. Remover/desfazer, limpar com dialog (Esc devolve o foco).
  Axe.
- `motion.spec.ts`:
  - `reducedMotion: "reduce"`: `element.getAnimations()` sem transform no sheet/dialog/passo/coração;
  - sem reduce: CLS < 0,01 (observer injetado) em `/search`, `/favoritos` e `/minhas-reservas`;
  - `boundingBox` do botão de favoritar igual antes, durante e depois do pulso;
  - HTML de `/hotel/1` sem `opacity:0` inline.

**Cenários `_delay`/`_fail`** (os requests destas páginas saem do navegador, então `page.route`
reescreve a URL acrescentando o parâmetro, como nos fixtures da F3):
- `/favoritos` com `_delay=6000` → skeleton e depois "Está demorando mais que o normal…". Com
  `_fail=1` → `ErrorState`. "Tentar de novo" sem o parâmetro → lista.
- `/comparar` com `_fail=1` só em `/rooms` → erro único da view. O retry refaz só `/rooms` (contagem
  de requests).
- `/minhas-reservas` com `_fail=1` em 1 das 2 reservas → só aquela linha com erro, retry dela
  recupera, e o id não sai do storage. Offline (`context.setOffline(true)`) → linhas com erro +
  `Alert` offline, storage intacto.

## Riscos

| Risco | Mitigação |
|---|---|
| `fetchHotelsByIds([])` vira `GET /hotels` e lista todos | guarda explícita + `enabled: ids.length > 0` + unit que falha se o `fetch` for chamado |
| Saída animada do Dialog quebra os testes existentes (fechamento deixa de ser síncrono) | `skipAnimations` no Vitest; asserções com `waitFor`; tarefa 5 roda as suítes do Dialog, FiltersDrawer, lightbox e termos |
| Chrome (close watcher) fecha o `<dialog>` sem respeitar o `preventDefault` do segundo Esc | evento `close` sincroniza `open` e pula a animação; testado com `dialog.close()` direto |
| jsdom sem WAAPI/`matchMedia` faz o Motion lançar | `skipAnimations` + stub de `matchMedia` (já existe para `useCloseOnDesktop`) e, se preciso, `Element.prototype.animate` no setup (tarefa 1) |
| Hydration: coração/contador mudam depois da hidratação | contador com espaço reservado; coração muda só de cor (sem layout); `skipHydration` + `StoreHydrator` como no `booking-draft` |
| Bandeja cobre conteúdo/foco ou empurra a página | padding no fim do `<main>`, `scroll-padding-bottom`, `focusin` → `nearest`, nada no clique; E2E 12c/12d |
| Bandeja sobre a `ActionBar` da F5 | oculta em `/checkout` e `/confirmation/*` (`isTrayHiddenOn`, unit) |
| Promoções da F4 (tabela, card, preço, breadcrumb) mudam o visual do detalhe | tarefa 11 é `refactor` puro: testes da F4 sem mudar asserções + screenshot do `ux-reviewer` |
| PII do histórico vai parar no cache offline da F7b | `meta: { sensitive: true }` em `bookingQueryOptions` + costura documentada; a página não renderiza titular/e-mail |
| Storage adulterado (ids/nome) | Zod por item, ids inteiros só em query string montada por `buildQuery`, nome como texto (React escapa), teto de tamanho |
| Bundle do Motion em todas as rotas | `LazyMotion` com features por `import()` e `strict`; conferir o tamanho no `next build` (sem crescer > 10 kB gz no first load) |
| Rotas em pt-BR misturadas com as em inglês | registrado no README como decisão consciente (pedido desta fase); renomear é barato (só `messages`/`compareHref`/E2E) |
| Animação de lista some sem JS / atrasa LCP | só em listas montadas no cliente; critério 35 confere o HTML do servidor |
| Desfazer limpeza da comparação depois de navegar | o `restoreAll` captura a lista no momento; o toast dura 10 s e é global (sobrevive à navegação) |

## UI/UX

### Layouts

**Card da busca (F3) — mudanças**
```
┌ HotelCard (Card interactive) ─────┐
│ [ foto 4:3            (♡) ]       │  IconButton overlay absolute top-2 right-2 z-10 (rounded-full)
│ Hotel Copacabana Palace           │  h3 > a (::after cobre o card)
│ Hotel · Rio de Janeiro, RJ        │
│ 4,8 ★ Excelente · 2.847           │
│ ✓ Wi-Fi ✓ Piscina +3              │
│ ────────────────────────────────  │
│ [Apenas 2 quartos!]   R$ 3.600,00 │
│ ☐ Comparar                        │  linha min-h-11, relative z-10, Checkbox (label "Comparar")
└───────────────────────────────────┘
```
`sm+` (horizontal): o coração fica no canto superior direito da foto (`w-56`). "Comparar" fica na
última linha da coluna de conteúdo. Esgotado continua comparável e favoritável.

**Detalhe (F4) — mudanças**
```
Hotel Copacabana Palace                    (♡)   h1 + FavoriteButton (IconButton secondary), flex justify-between items-start gap-3
...
a partir de R$ 800 por noite
[☐ Comparar] [🔗 Copiar link] [ Ver quartos ▾ ]   < sm: grid grid-cols-2 gap-3 — linha 1: Comparar | Copiar link;
                                                   linha 2: Ver quartos col-span-2. ≥ sm: flex gap-3, Ver quartos por último
```

**Header**
```
320:  [Infotera]                     (♡ 2) (🧳)     links IconButton-like 44px, badge -top-1 -right-1
≥sm:  [Infotera Hotéis]     ♡ Favoritos (2)   🧳 Minhas reservas      buttonClassName ghost sm
```
O badge é `min-w-5 h-5 rounded-full bg-primary text-fg-on-primary text-xs tabular-nums` e fica
`invisible` com 0. O link ativo usa `aria-current="page"` com `text-primary` + sublinhado (cor não é
o único sinal).

**Bandeja de comparação** (`fixed inset-x-0 bottom-0 z-30 bg-surface border-t border-border
shadow-raised`, padding `px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`, conteúdo no
container do DS)
```
320:  (×)  2 de 3 hotéis                         [ Comparar ]
≥sm:  Comparar hotéis · 2 de 3                                  [Limpar]
      [Copacabana Palace ×] [Fasano ×]                    [ Comparar 2 hotéis ]
```
- `<section aria-labelledby>` com título sr-only "Comparação de hotéis" (< `sm`) ou visível (≥ `sm`).
- Chips: `Button secondary sm` com `XIcon`, nome com `truncate max-w-48` e nome acessível completo.
- "Comparar" é `Link` com `buttonClassName primary md`. Com 1 hotel vira `Button aria-disabled` com a
  dica na região viva.
- Região viva `sr-only aria-live="polite"` **fora** da bandeja (sempre montada no layout).

**`/favoritos`**
```
Favoritos                                h1 (tabIndex -1)
3 hotéis salvos                          status min-h-5 text-sm text-fg-muted (aria-live polite separado)
┌ foto 4:3 (♡) ┐ ┌──────────┐ ┌──────────┐   grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6
│ Nome (h2 > a)│ │          │ │          │   CompactHotelCard layout="vertical"
│ Tipo · Dest. │
│ 4,8 ★ (2.847)│
│ R$ 1.200     │   PriceTag nightly-line
│  por noite   │
│ ☐ Comparar   │
└──────────────┘
Fantasma (mesma célula de grid):
┌──────────────┐
│ Removido dos │  conteúdo original invisible+inert por baixo
│ favoritos.   │  text-sm text-fg-muted, centralizado na vertical
│ [Desfazer]   │  Button secondary sm (foco)
└──────────────┘
```

**`/comparar`**
```
Comparar hotéis                                        h1
Linhas marcadas mudam entre os hotéis.                 legenda text-sm text-fg-muted
☐ Mostrar só diferenças                                Checkbox
┌ region (rola em x) ───────────────────────────────────────────────┐
│               │ [foto 4:3]          │ [foto]        │ [foto]       │  th scope=col min-w-36
│               │ Copacabana Palace ♡ │ Fasano ♡      │ Emiliano ♡   │  nome = link; ♡ IconButton ghost
│               │ [Remover]           │ [Remover]     │ [Remover]    │  Button ghost sm
│ Preço p/ noite│ a partir de R$ 800  │ R$ 1.500      │ R$ 1.100     │
│               │ [Menor preço]       │               │              │  Badge success
│ Avaliação     │ 4,8 · Excelente     │ 4,9 · Excel.  │ 4,6 · Excel. │
│ …             │                     │               │              │
└───────────────────────────────────────────────────────────────────┘
Arraste para o lado para ver todos.                    lg:hidden
```
O `Alert` info de < 2 hotéis ou de hotel não encontrado fica acima da legenda.

**`/minhas-reservas`**
```
Minhas reservas                                     h1                     [Limpar histórico] (ghost, ≥ sm à direita; < sm abaixo do h1)
Reservas confirmadas ou abertas neste navegador.    p text-fg-muted
┌ Card static ───────────────────────────────────┐  ul role=list gap-4
│ [Próxima estadia]                              │  Badge info | success "Em andamento" | neutral "Concluída"
│ Hotel Copacabana Palace                        │  h2 text-lg font-semibold
│ 12–15 dez · 3 noites · 2 adultos · 1 quarto    │  text-sm tabular-nums
│ R$ 3.726,00 total                              │  text-xl bold + "total" text-sm
│ Reservada em 19/11/2026                        │  text-sm text-fg-subtle
│ [Ver reserva]            [Remover do histórico]│  Link secondary sm · Button ghost sm
└────────────────────────────────────────────────┘
```
`sm+`: foto 4:3 `w-40` à esquerda (`alt=""`). Erro de linha: `Alert danger` compacto dentro do card
com "Tentar de novo" e "Remover do histórico", na mesma altura mínima do skeleton.

### Estados (resumo)

| Tela | Carregando | Erro | Vazio | Outros |
|---|---|---|---|---|
| `/favoritos` | skeleton de N cards (N = favoritos, máx. 6) + lento > 5 s | `ErrorState` + retry; offline `Alert` warning | `EmptyState` + "Buscar hotéis" | fantasma + Desfazer; prune silencioso |
| `/comparar` | skeleton da tabela (cabeçalho 3 colunas + 6 linhas) + lento | `ErrorState` + retry (só o que falhou) | `EmptyState` (+ link da bandeja) | `Alert` < 2 · `Alert` não encontrado |
| `/minhas-reservas` | skeleton por linha | por linha + `Alert` offline | `EmptyState` | `Alert` de removidas (404) · fantasma · dialog de limpar |
| Bandeja | — | — | some com 0 | limite (dica + toast) |

### Microcopy

| Onde | Texto |
|---|---|
| Coração (nome acessível, fixo) | `Salvar nos favoritos: {nome}` + `aria-pressed` |
| Toasts de favorito | `Hotel salvo nos favoritos.` [Ver favoritos] · `Hotel removido dos favoritos.` [Desfazer] · limite: `Você já tem 100 hotéis nos favoritos. Remova algum para salvar outro.` |
| Comparar (checkbox) | `Comparar` + sr `: {nome}` · dica no limite `Limite de 3 hotéis na comparação.` |
| Toast do limite | `Você já está comparando 3 hotéis. Remova um para adicionar outro.` [Ver comparação] |
| Bandeja | título `Comparação de hotéis` · `1 de 3 hotéis · escolha mais 1` · `2 de 3 hotéis` · `3 de 3 hotéis` · botão `Comparar` (sr `Comparar 2 hotéis`; ≥ sm visível `Comparar 2 hotéis`) · `Limpar comparação` (aria) / `Limpar` (≥ sm) · chip `Remover {nome} da comparação` |
| Bandeja (anúncios) | `{nome} entrou na comparação. 2 de 3.` · `{nome} saiu da comparação.` · `Escolha pelo menos 2 hotéis para comparar.` · toast `Comparação limpa.` [Desfazer] |
| Header | `Favoritos` (aria < sm: `Favoritos, nenhum hotel` / `Favoritos, 1 hotel` / `Favoritos, 3 hotéis`) · `Minhas reservas` |
| `/favoritos` | h1 `Favoritos` · `1 hotel salvo` / `3 hotéis salvos` · vazio `Nenhum hotel salvo ainda` / `Toque no coração de um hotel para guardá-lo aqui. Seus favoritos ficam salvos neste navegador.` [Buscar hotéis] · erro `Não foi possível carregar seus favoritos` / `Verifique sua conexão e tente de novo.` [Tentar de novo] · fantasma `Removido dos favoritos.` [Desfazer] (sr `: {nome}`) · sr loading `Carregando seus favoritos…` |
| `/comparar` | h1 `Comparar hotéis` · caption `Comparação entre {A}, {B} e {C}` · legenda `Linhas marcadas mudam entre os hotéis.` · `Mostrar só diferenças` · `Mostrando 8 de 21 linhas.` · selos `Menor preço` / `Melhor nota` · `Remover` (sr `{nome} da comparação`) · < 2 `Escolha pelo menos 2 hotéis para comparar` / `Adicione hotéis pela busca ou pelos favoritos.` [Buscar hotéis em {destino}] [Ver favoritos] · vazio `Nenhum hotel para comparar` / `Marque "Comparar" em até 3 hotéis na busca ou nos favoritos.` [Buscar hotéis] [Comparar os 2 hotéis selecionados] · não encontrado `1 hotel não foi encontrado e saiu da comparação.` / `2 hotéis não foram encontrados…` · erro `Não foi possível carregar a comparação` |
| Linhas da tabela | `Preço por noite` (`a partir de R$ 800` · nota `Esgotado`) · `Avaliação` (`4,8 · Excelente`) · `Avaliações` (`2.847`) · `Tipo` · `Destino` · `Cancelamento` (rótulos do DS §6.8) · `Check-in` (`A partir de 15:00`) · `Check-out` (`Até 12:00`) · `Disponibilidade` (`Esgotado` / `Apenas 2 quartos!` / `Disponível`) · `Tipos de quarto` (`1 tipo` / `3 tipos`) · `Hóspedes por quarto` (`Até 4`) · comodidades `Sim`/`Não` · sr `, diferente entre os hotéis` |
| `/minhas-reservas` | h1 `Minhas reservas` · `Reservas confirmadas ou abertas neste navegador.` · status `Próxima estadia` / `Em andamento` / `Concluída` · `Reservada em {data}` · `Ver reserva` (sr ` em {hotel}`) · `Remover do histórico` (sr `: {hotel}, {datas}`) · `Hotel indisponível` · linha erro `Não foi possível carregar esta reserva.` [Tentar de novo] · ilegível `Não foi possível exibir esta reserva.` · removidas `1 reserva não existe mais e saiu da lista. Reservas de teste são apagadas quando o sistema reinicia.` (plural `2 reservas não existem mais…`) · fantasma `Reserva removida do histórico.` [Desfazer] · vazio `Nenhuma reserva neste navegador` / `As reservas que você confirmar aparecem aqui. Elas ficam salvas só neste navegador.` [Buscar hotéis] · sr loading `Carregando suas reservas…` |
| Dialog limpar | título `Limpar o histórico?` · `As reservas continuam válidas. Elas só deixam de aparecer neste navegador.` · [Cancelar] [Limpar histórico] (danger) · toast `Histórico apagado.` [Desfazer] |

### Interações e acessibilidade

- **Foco:**
  - páginas novas → `h1` (`tabIndex -1`, `preventScroll` + `revealBelowHeader`) na navegação
    cliente;
  - remover (fantasma) → "Desfazer"; Desfazer → o controle restaurado (coração ou "Remover do
    histórico");
  - remover coluna → `h1` da comparação (a coluna e o botão somem);
  - limpar histórico → `h1`;
  - limpar bandeja → `<main>`.
- **Teclado:** coração e "Comparar" funcionam com Enter/Espaço. Nenhum atalho novo. A região da
  tabela é focável e rola com as setas.
- **Leitor de tela:**
  - o coração é um toggle (`aria-pressed`) com nome fixo;
  - o checkbox anuncia o estado nativo;
  - a bandeja anuncia entradas e saídas na região própria;
  - as páginas anunciam a contagem em `aria-live` separado do `h1`;
  - os fantasmas são texto normal (sem live): o foco no "Desfazer" já informa.
- **Cor nunca sozinha:** coração preenchido + `aria-pressed`, selos com texto, linha diferente com
  borda + sr, status da estadia com texto.
- **Movimento:** valem a Decisão 14 e o DS §1.8. Durações: lista 200 ms (stagger 40 ms, 6 itens),
  dialog/sheet 300 ms na entrada e 200 ms na saída, toast 200/150 ms, bandeja 300/200 ms, passo
  200 ms, pulso 300 ms. Com reduced motion: só fades ≤ 150 ms.
- **320 px:** bandeja em 1 linha, tabela rola dentro da região, header com ícones, ações do detalhe em
  grid 2 colunas, nenhum texto monetário quebrado (`whitespace-nowrap`).
- **Zoom 200%:** a bandeja pode crescer (altura medida). O `<main>` e os toasts acompanham pela
  variável.

## Ajustes pós-revisão (rodada de correções)

Decisões que mudaram o comportamento depois da revisão (rotas e identificadores em inglês, textos em pt-BR):

- **Preço com taxas (busca, hotel, checkout)**: o total em `/search` e `/hotel/[hotelId]` inclui taxa de serviço (10%)
  e ISS (5%) pela mesma função pura do checkout (`feesOnBase` em `shared/lib/price-breakdown`, `stayTotalWithFees` em
  `shared/lib/pricing`). Rótulo `total com taxas · 3 noites · 1 quarto`; a diária desce como `R$ 800 por noite, sem taxas`.
  Card, hotel e checkout (sem cupom) mostram o mesmo número para 1 e 2 quartos.
- **Favoritos**: o preço vem do quarto mais barato (`lowestNightlyPrice`, 1 `GET /rooms?hotelId=…` por página), como na busca e
  na comparação; sem critérios de busca na página, só a diária (sem total). Falha dos quartos: "Preço indisponível no momento".
- **Critérios de origem**: `/search` guarda a busca (`shared/lib/last-search`, `sessionStorage`, só destino/datas/hóspedes). A
  bandeja monta `/compare?hotel=1&hotel=4&destination=…&checkIn=…` (`compareHref(ids, criteria)`); a tabela e os favoritos usam
  `hotelHref(id, criteria)`. Sem critérios o link continua válido e compartilhável.
- **Histórico**: entradas com `savedAt` > 30 dias expiram na leitura (regrava); aviso "Em computador compartilhado, limpe o
  histórico ao terminar."; offline mostra só o alerta global (linha com placeholder, sem erro vermelho); "Está demorando…" após 5 s;
  "Tentar de novo" mantém a linha, o foco e os nomes dos outros hotéis (`keepPreviousData`, `failedBefore`).
- **Confirmação**: e-mail sempre mascarado (`j***@dominio.com`) e código curto legível (8 primeiros caracteres em maiúsculas)
  acima do número completo.
- **Comparação**: `keepPreviousData` nas duas consultas (remover não volta ao skeleton); hotel não encontrado sai de verdade da
  URL e da bandeja (o aviso fica); `table-fixed` com colunas de hotel iguais e coluna de rótulos de 96 px abaixo de `sm`; o
  título só recebe foco ao chegar por navegação dentro do app (`FocusOnMount afterNavigationOnly`), não em carga direta.
- **Bandeja**: chips numa linha rolável; em viewport baixa (`max-height: 600px`) some título, dica e chips (uma linha só, ≤ 25% da
  altura); dica "Limite de 3 hotéis" também abaixo de `sm`; reveals programáticos de foco são `behavior: "instant"`.
- **Toasts**: a ação devolve o foco ao controle de origem (ou ao `returnFocus` informado); a região ficou no canto inferior
  esquerdo (320 px) para não cobrir CTAs; favorito cita o hotel (`{Hotel} salvo nos favoritos.`).
- **Checkout**: o cupom aplicado persiste (só o código) no rascunho e é revalidado ao restaurar ("Seu cupom {CÓDIGO} não vale
  mais para esta reserva."); confirmar offline não chama a action ("Você está sem conexão. Nada foi cobrado. Tente de novo quando
  a conexão voltar.") e a action expira em 15 s; falha de hotel/quarto mostra um único erro de conexão com um "Tentar de novo" e a
  barra diz "Total não carregado — tente de novo"; `/checkout` sem seleção volta à home com "Escolha um quarto para continuar."
  (`/?notice=choose-room`).
- **Navegação lenta**: o card mostra o selo "Abrindo…" (`useLinkStatus`) enquanto o hotel carrega, além do `loading.tsx`.
