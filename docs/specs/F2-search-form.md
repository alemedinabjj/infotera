# F2 — search-form

## Objetivo

Entregar a página inicial (`/`) com o formulário de busca: destino com autocomplete acessível
(`GET /suggestions?q=`), período da estadia, quartos e hóspedes. Ao enviar um formulário válido, a
busca vai para as "últimas buscas" (localStorage) e o usuário segue para
`/search?<serializeSearchCriteria>`. Toda regra (datas, limites, histórico, teclado do combobox)
fica em funções puras de `model/`, testadas sem React.

## Escopo

**Básicos**
- Autocomplete de destino em `/suggestions?q=`; o destino só vale se escolhido da lista (guarda o
  `name` exato da sugestão, com acento).
- Datas: check-in ≥ hoje (data local), check-out ≥ check-in + 1, máximo 30 noites.
- Quartos (1–4), adultos (≥ 1 por quarto, ≤ 16), crianças (0–10), no máximo 5 hóspedes por quarto
  (`SEARCH_LIMITS` da F1).
- Submit válido → `router.push("/search?" + searchCriteriaToQueryString(criteria))`.

**Avançados (escolhidos no TEST_MAP)**
- Debounce de 300 ms + loading no autocomplete (combobox ARIA 1.2 completo, com teclado).
- Validação em tempo real (RHF + Zod; ver Decisão 4 sobre o `mode`).
- Últimas 5 buscas em localStorage (restaurar e limpar).

**Fora (e por quê)**
- Página `/search`: é a F3. Até lá, o submit cai no 404 global; o E2E desta feature só confere a URL.
- Idade das crianças: a API e o `Booking` só têm contagem (Decisão 5 da F1).
- Busca por nome de hotel, geolocalização ("perto de mim"): a API não suporta.
- Sincronizar últimas buscas entre abas (evento `storage`): ganho baixo, mais um caminho de bug.
- Funcionar sem JavaScript (form `GET` nativo): o destino precisa vir da lista, o que exige JS.
- Calendário próprio: usamos `<input type="date">` nativo (design system, DateRange).
- Gravar a busca no `booking-draft`: a URL é a fonte da verdade até o hotel (Decisão 1 da F1).

## Decisões

1. **Combobox e DateRange nascem na feature, sem promoção para `shared/`.** Só a F2 os usa. A F3
   precisa de "Alterar busca", mas pode reusar o `SearchForm` inteiro pela composição em `app/`
   (`<SearchForm initialCriteria={criteria} />`, prop já prevista aqui), sem importar feature.
   Para a promoção futura ser barata, o comportamento genérico fica separado do texto de negócio:
   `model/combobox.ts` (reducer puro) + `hooks/useCombobox.ts` (props ARIA e teclado) não sabem o que
   é destino; `DestinationCombobox` liga ao `/suggestions` e à microcopy. Descartado: criar
   `shared/ui/molecules/Combobox` já — viola a regra de promoção e obriga a desenhar uma API genérica
   sem segundo caso de uso para validar.

2. **Schema do formulário próprio, reaproveitando as regras da F1 sem duplicar.** O
   `searchCriteriaSchema` usa `z.coerce.number()` (input `unknown`), o que deixaria os campos do RHF
   tipados como `unknown` e exigiria `as`. Mudança em `shared/lib/search-params.ts` (sem alterar o
   comportamento): exportar `SEARCH_MESSAGES` e `applySearchCriteriaRules(value, ctx)` (o corpo atual
   do `superRefine`). A feature monta `makeSearchFormSchema(today)` com `z.number()` + as mesmas
   regras + "check-in ≥ hoje". Um teste de paridade prova que toda saída válida do form também passa
   no `searchCriteriaSchema`. Descartado: copiar as regras na feature (duas fontes de verdade) e usar
   o schema da URL direto no resolver (tipo `unknown` nos campos).

3. **"Hoje" é lido no momento da validação, não na renderização.** O resolver é
   `(values, ctx, opts) => zodResolver(makeSearchFormSchema(todayISO()))(values, ctx, opts)`: se a aba
   ficar aberta depois da meia-noite, a regra acompanha. Para os atributos `min`/`max` dos inputs,
   `useToday()` usa `useSyncExternalStore` com snapshot de servidor `null` (atributo omitido no HTML
   do servidor), evitando hydration mismatch quando o servidor (UTC) e o cliente estão em dias
   diferentes. Descartado: `todayISO()` no render (mismatch entre 21h e 24h de Brasília).

4. **RHF `mode: "onTouched"` + `reValidateMode: "onChange"`, `shouldFocusError: true`.** O TEST_MAP
   cita `onChange`, mas o design system (Field) proíbe erro enquanto a pessoa ainda digita pela
   primeira vez. Com `onTouched`, o erro aparece ao sair do campo e, daí em diante, atualiza a cada
   tecla — continua "tempo real" e não grita cedo. Dependências entre campos com `deps`: `checkIn` →
   `checkOut`; `rooms` → `adults`, `children`. Submit **nunca** desabilitado: inválido → foco no
   primeiro campo inválido (ordem de registro = ordem do DOM) e `ErrorSummary` (`Alert` danger,
   `role="alert"`) no topo: "Corrija N campos para continuar" com um botão por erro que chama
   `setFocus(campo)`. Descartado: `mode: "onChange"` puro (erro no primeiro caractere) e links
   `href="#id"` (o `Field` gera o id internamente com `useId`).

5. **Destino = valor selecionado, separado do texto digitado.** No form, `destination` guarda só o
   `name` da sugestão escolhida (ou `""`). O texto do input (`inputValue`) vive em
   `useDestinationField`. Digitar depois de escolher limpa `destination`; escolher define os dois.
   Texto sem escolha → "Escolha um destino da lista." (mensagem da F1). Descartado: aceitar o texto
   que bate com uma sugestão ao sair do campo — esconde a regra e cria caso de borda com acentos
   ("sao paulo, sp" ≠ "São Paulo, SP" no `/hotels`).

6. **Query de sugestões na feature.** `suggestionsQueryOptions(q)`: chave
   `queryKeys.suggestions(normalizeQuery(q))` (trim + minúsculas + sem acento, igual ao servidor:
   "São" e "sao" dividem cache), `enabled` só com `normalizeQuery(q).length >= 2`, `staleTime: 5 min`
   (lista estática), `placeholderData: keepPreviousData`. O texto vai para a API já normalizado.
   Debounce de 300 ms sobre o `inputValue` (`useDebouncedValue`); não busca quando o texto é igual ao
   destino já selecionado. Descartado: debounce na `queryFn` (cancelamentos e chaves intermediárias
   no cache) e `useDeferredValue` (não reduz requests).

7. **Teclado do combobox como reducer puro.** `comboboxReducer(state, action)` com
   `state = { isOpen, activeIndex }` e ações `open | close | next | prev | first | last | reset |
   itemsChanged(count)`. ↓/↑ circulam (abre se fechado); Enter com opção ativa seleciona (e
   `preventDefault`, não submete); Enter sem opção ativa segue o comportamento nativo (submit); Esc
   fecha, segundo Esc limpa o texto; Tab fecha sem selecionar; clique fora (blur) fecha; clique na
   opção usa `onMouseDown` + `preventDefault` para não perder o foco antes de selecionar. Enter
   durante composição IME (`isComposing`) é ignorado. Descartado: lib (`downshift`) — dependência
   nova para algo que é um dos avançados avaliados.

8. **Realce do trecho digitado sem acento.** `highlightMatch(name, query)` → segmentos
   `{ text, match }[]`, comparando caractere a caractere com o nome sem acento (mapeamento 1:1 para
   nomes em NFC). Sem match (o `q` do json-server também casa em `country`/`type`): nome inteiro sem
   destaque.

9. **Quartos e hóspedes: limites dinâmicos tornam o estado inválido inalcançável pela UI.**
   `guestLimits({ rooms, adults, children })` → `min/max` de cada stepper:
   quartos `[max(1, ceil((a+c)/5)), min(4, a)]`; adultos `[rooms, min(16, rooms×5 − c)]`;
   crianças `[0, min(10, rooms×5 − a)]`. No limite, a descrição do stepper explica o porquê
   (`guestHint`). O schema continua como rede de segurança (ex.: `initialCriteria` vindo de URL
   ruim), com o erro exibido sob o grupo (ref do Controller num wrapper `tabIndex={-1}`).
   Descartado: deixar escolher qualquer número e só acusar no submit.

10. **DateRange: ajustar em vez de acusar.** `adjustCheckOut(checkIn, checkOut)`: check-out vazio →
    `checkIn + 1` (silencioso); check-out ≤ check-in → `checkIn + 1` e anuncia "Check-out ajustado
    para dd/MM/aaaa" (design system); mais de 30 noites → mantém e mostra o erro (a pessoa decide).
    `dateBounds(today, checkIn)` → `min` do check-in = hoje; `min`/`max` do check-out = check-in + 1 /
    + 30 (sem check-in: hoje + 1 / sem max). Resumo "N noites" (`aria-live="polite"`) só com período
    válido. Valores iniciais de data vazios (sem "amanhã" pré-preenchido: dependeria do relógio no
    SSR).

11. **Últimas buscas: `SearchCriteria[]` em localStorage, chave `infotera:recent-searches`, via
    `createStorage("local")`.** Leitura tolerante: `z.array(z.unknown())` + `parseRecentSearches`
    descarta item a item o que não passar no `searchCriteriaSchema`. `addRecentSearch(list, c)`:
    coloca no topo, remove duplicata (mesma `searchCriteriaToQueryString`), corta em 5. Gravado só no
    submit válido. Lido em `useEffect` (servidor e 1º render = lista vazia, sem mismatch). Lista
    abaixo do form (não dentro do popover — misturar dois tipos de opção no listbox complica o ARIA e
    a busca recente é o critério inteiro, não só o destino). Clicar **preenche** o form (não envia):
    `restoreRecentSearch(item, today)` mantém destino e hóspedes; datas só se o check-in ≥ hoje,
    senão ficam vazias, foco vai para o check-in e anuncia "As datas dessa busca já passaram.
    Escolha novas datas."; com datas válidas, foco vai para "Buscar hotéis". Botão "Limpar buscas
    recentes". Sem PII: só destino, datas e contagens. localStorage (e não sessionStorage) porque o
    valor é lembrar entre visitas.

12. **`formatDateRange` vai para `shared/lib/dates.ts`.** O formato "Intervalo" é regra global do
    design system (6.1) e a F3 vai usá-lo no resumo da busca do header; a lista de buscas recentes é
    o primeiro uso. `12–15 dez` (mesmo mês), `30 dez – 2 jan` (meses diferentes), ano só quando
    diferente do atual (`today` como parâmetro, função pura).

13. **Navegação com `useTransition`.** `startTransition(() => router.push(url))`; enquanto
    `isPending`, o botão fica `loading` com "Buscando…" (padrão do `Button`: `aria-disabled`, mantém
    o foco, ignora clique duplo).

14. **`SearchForm` aceita `initialCriteria?: SearchCriteria`.** Preenche tudo e trata o destino
    como selecionado. Custa uma prop e evita que a F3 duplique o formulário. Destino arbitrário vindo
    da URL não é revalidado contra `/suggestions` (a F3 mostra o vazio).

15. **`useToday` fica na feature.** F3/F4 também vão precisar de "hoje" só no cliente para o aviso
    de check-in no passado; promover para `shared/lib` quando isso acontecer.

## Contrato de dados

| Uso | Endpoint | Params | Schema | Query key |
|---|---|---|---|---|
| Autocomplete | `GET /suggestions` | `q` (normalizado, ≥ 2 chars) | `z.array(suggestionSchema)` (`shared/api/schemas.ts`) | `queryKeys.suggestions(normalizedQ)` |

- Seed: 10 sugestões (`city` 6, `beach` 2, `island` 1, `nature` 1). Sem paginação; sem `_limit`.
- O `q` do json-server é full-text em todos os campos: `"bra"` casa `country: "Brasil"` e devolve
  as 10; `"sp"` devolve São Paulo e Campos do Jordão. Aceito: são no máximo 10 linhas (`max-h-80`
  com scroll).
- Erro: `ApiError` do `http.ts`; texto da UI é a microcopy "Não foi possível carregar os destinos."
  (nunca o corpo da API). Retry automático segue o query client (até 2, não em 4xx/parse); o botão
  "Tentar de novo" chama `refetch()`.
- Saída do form: `SearchCriteria` (F1) → `searchCriteriaToQueryString` → `/search?destination=…&checkIn=…&checkOut=…&rooms=…&adults=…&children=…`.
- localStorage: `infotera:recent-searches` = `SearchCriteria[]` (≤ 5).

Tipos do form (`model/search-form.schema.ts`):
```ts
type SearchFormValues = {
  destination: string; checkIn: string; checkOut: string; // "" quando vazio
  rooms: number; adults: number; children: number;
};
// defaults: destination "", datas "", rooms 1, adults 2, children 0
// makeSearchFormSchema(today: ISODate): z.ZodType<SearchCriteria, SearchFormValues>
```
Mensagens novas do form (exportadas em `FORM_MESSAGES`; o ui-designer pode revisar):
`checkInRequired` "Escolha a data de check-in." · `checkOutRequired` "Escolha a data de check-out." ·
`checkInPast` "Escolha uma data a partir de hoje." · demais vêm de `SEARCH_MESSAGES`.

## Critérios de aceite

Destino / autocomplete
1. Dado o campo destino, quando digito 1 caractere, então nenhum request é feito e o popover fica fechado.
2. Quando digito "flor" rápido, então é feito **um** request (`q=flor`) 300 ms após a última tecla e aparece "Florianópolis, SC" com "flor" realçado.
3. Quando digito "sao", então "São Paulo, SP" aparece (acento ignorado) e o cache é compartilhado com "São".
4. Enquanto a busca carrega, então o input mostra spinner; sem resultados anteriores, o popover mostra "Buscando destinos…"; com anteriores, eles continuam visíveis.
5. Quando os resultados chegam, então uma região `aria-live="polite"` anuncia "N destinos encontrados" (1 → "1 destino encontrado").
6. Quando não há resultados ("xyz"), então aparece a linha não selecionável `Nenhum destino encontrado para "xyz"` e o anúncio correspondente.
7. Dado `GET /suggestions` com 500, então aparece "Não foi possível carregar os destinos." com "Tentar de novo", que refaz o request.
8. O input tem `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded` coerente, `aria-controls` = id do listbox e `aria-activedescendant` = id da opção ativa (ausente sem opção ativa); opções têm `role="option"` e `aria-selected` na ativa.
9. ↓ abre/move para a próxima (circular), ↑ para a anterior; Enter na opção ativa seleciona sem submeter; Esc fecha; segundo Esc limpa o texto; Tab fecha sem selecionar; clique seleciona; clique fora fecha.
10. Ao selecionar, o input mostra o `name` exato, o popover fecha e o foco fica no input. Ao editar o texto depois, a seleção é desfeita.
11. Botão "Limpar destino" aparece quando há texto, limpa texto e seleção e devolve o foco ao input.

Datas
12. O check-in tem `min` = hoje (data local, após hidratar); o check-out tem `min` = check-in + 1 e `max` = check-in + 30.
13. Dado check-out vazio, quando escolho o check-in, então o check-out vira check-in + 1.
14. Dado check-out ≤ novo check-in, então ele vira check-in + 1 e é anunciado "Check-out ajustado para dd/MM/aaaa".
15. Com período válido, aparece "N noites" (`aria-live="polite"`).
16. Check-in no passado (digitado), 31 noites ou check-out vazio mostram a mensagem do design system ao sair do campo e a atualizam a cada mudança.

Hóspedes
17. Steppers de quartos, adultos e crianças com rótulo, `aria-label` "Diminuir/Aumentar {campo}" e valor anunciado; botões no limite ficam `aria-disabled`.
18. Os limites seguem `guestLimits` (ex.: 1 quarto + 5 hóspedes bloqueia "+" de adultos e crianças e mostra o motivo; 2 quartos exigem 2 adultos).

Submit
19. Dado o form inválido, quando clico "Buscar hotéis" (sempre habilitado), então o foco vai para o primeiro campo inválido, cada campo mostra seu erro (`aria-invalid` + `aria-describedby`) e o resumo "Corrija N campos para continuar" (`role="alert"`) lista os erros; clicar num item foca o campo.
20. Dado o form válido, quando envio, então a URL vira `/search?destination=<name>&checkIn=…&checkOut=…&rooms=…&adults=…&children=…` (ordem de `SEARCH_PARAM_KEYS`), o botão mostra "Buscando…" até a navegação e a busca é salva nas recentes.
21. Texto digitado sem escolher da lista bloqueia o envio com "Escolha um destino da lista.".

Últimas buscas
22. Sem histórico, a seção não aparece. Com histórico, lista até 5 itens (mais recente primeiro, sem duplicatas): "São Paulo, SP · 12–15 dez · 2 adultos · 1 quarto".
23. Clicar num item com datas futuras preenche o form inteiro e foca "Buscar hotéis"; com check-in passado, preenche destino e hóspedes, deixa datas vazias, foca o check-in e anuncia o motivo.
24. "Limpar buscas recentes" esvazia a lista e o storage. localStorage indisponível/corrompido não quebra a página (lista vazia).

Página e transversais
25. `/` tem `metadata.title` em pt-BR, um único `h1` e o form num `<form noValidate>` com `aria-labelledby`/rótulo.
26. axe (wcag2a/aa) sem violações com o popover aberto e com erros visíveis; 320 px sem scroll horizontal; tudo operável só com teclado e foco visível.
27. `SearchForm initialCriteria` preenche todos os campos e o destino conta como selecionado.

## Arquivos

| Caminho | Responsabilidade |
|---|---|
| `src/shared/lib/search-params.ts` (alt.) | exportar `SEARCH_MESSAGES` e `applySearchCriteriaRules`; schema usa a função (comportamento igual) |
| `src/shared/lib/dates.ts` (alt.) | `formatDateRange(checkIn, checkOut, today)` |
| `src/features/search-form/api/suggestions.ts` | `fetchSuggestions(q, signal)`, `suggestionsQueryOptions(q)` |
| `.../model/search-form.schema.ts` | `SearchFormValues`, `DEFAULT_SEARCH_FORM_VALUES`, `FORM_MESSAGES`, `makeSearchFormSchema(today)`, `toFormValues(criteria)` |
| `.../model/stay-dates.ts` | `adjustCheckOut`, `dateBounds`, `stayNights` (null se inválido) |
| `.../model/guests.ts` | `guestLimits`, `guestHint` |
| `.../model/recent-searches.ts` | `RECENT_SEARCHES_KEY`, `MAX_RECENT`, `parseRecentSearches`, `addRecentSearch`, `restoreRecentSearch`, `describeRecentSearch` |
| `.../model/combobox.ts` | `comboboxReducer`, tipos de estado/ação (switch exaustivo com `never`) |
| `.../model/suggestion-text.ts` | `normalizeQuery`, `highlightMatch`, `describeResultCount` |
| `.../hooks/useDebouncedValue.ts` | valor atrasado (setTimeout/cleanup) |
| `.../hooks/useToday.ts` | `ISODate \| null` via `useSyncExternalStore` |
| `.../hooks/useRecentSearches.ts` | `{ items, add, clear }` sobre `createStorage("local")` |
| `.../hooks/useCombobox.ts` | reducer + `getInputProps`/`getListboxProps`/`getOptionProps` + handlers de teclado |
| `.../hooks/useDestinationField.ts` | `inputValue`, seleção, debounce, query de sugestões, `select`/`clear`/`setFromCriteria` |
| `.../hooks/useSearchForm.ts` | `useForm` (resolver, modos, `deps`), submit (salva recente + transition + push), restauração de recente, mensagem do anunciador |
| `.../components/SearchForm.tsx` | `"use client"`; compõe campos, `ErrorSummary`, botão, região `aria-live`, `RecentSearches` |
| `.../components/DestinationCombobox.tsx` | `Field` + `Input` (`map-pin`, spinner/limpar no `endSlot`) + `SuggestionList` |
| `.../components/SuggestionList.tsx` | popover: carregando / resultados / vazio / erro; `SuggestionOption` com realce |
| `.../components/DateRangeFields.tsx` | `fieldset` "Datas da estadia", dois `Input type="date"` em `Field`, resumo de noites |
| `.../components/GuestsPicker.tsx` | `fieldset` com três `QuantityStepper` + erro do grupo |
| `.../components/ErrorSummary.tsx` | `Alert` danger com lista de erros focáveis |
| `.../components/RecentSearches.tsx` | lista de buscas recentes + limpar |
| `.../index.ts` | `export { SearchForm }` |
| `src/features/search-form/CLAUDE.md` (alt.) | decisões finais (modo do RHF, onde vivem Combobox/DateRange, chaves de storage) |
| `src/app/page.tsx` (alt.) | `metadata`, `h1`, `<SearchForm />` |
| `src/app/page.test.tsx` (alt.) | renderiza com providers e `next/navigation` mockado |
| `e2e/search-form.spec.ts` | fluxo, teclado, `_delay`/`_fail`, axe, 320 px |

Testes ficam ao lado (`*.test.ts(x)`). Orçamento do Biome: nenhum componente/hook passa de ~70
linhas por função; se `useSearchForm` ou `DestinationCombobox` crescer, extrair (`useRecentRestore`,
`ComboboxEndSlot`). Arquivos ≤ 250 linhas.

## Tarefas

1. `refactor(shared): export search criteria rules and messages` — extrai `applySearchCriteriaRules`/`SEARCH_MESSAGES`. Prova: `search-params.test.ts` intacto e verde + teste novo chamando a função num `ctx` de `superRefine`.
2. `feat(shared): add formatDateRange` — Prova: unit (mesmo mês, meses diferentes, virada de ano, ano diferente do atual).
3. `feat(search-form): add search form schema` — Prova: unit de `makeSearchFormSchema` (válido; destino vazio; datas vazias; check-in ontem/hoje; 0, 1, 30, 31 noites; adultos < quartos; 6 hóspedes em 1 quarto) + teste de paridade com `searchCriteriaSchema`.
4. `feat(search-form): add stay dates and guest limit rules` — Prova: unit de `adjustCheckOut`, `dateBounds`, `stayNights`, `guestLimits` (tabela de casos, incluindo virada de mês/ano), `guestHint`.
5. `feat(search-form): add recent searches model` — Prova: unit de dedupe, topo, limite 5, item corrompido descartado, `restoreRecentSearch` com check-in passado/hoje/futuro, `describeRecentSearch`.
6. `feat(search-form): add combobox reducer and suggestion text helpers` — Prova: unit do reducer (abrir com ↓, circular, `itemsChanged` reseta índice fora do limite, close/reset) e de `normalizeQuery`/`highlightMatch` ("sao" em "São Paulo, SP", sem match, query vazia)/`describeResultCount`.
7. `feat(search-form): add suggestions query options` — Prova: teste com `fetch` stubado: URL `…/suggestions?q=sao`, `enabled` falso com < 2 chars, chave normalizada, resposta inválida → `ApiError` parse.
8. `feat(search-form): add debounce, today and recent searches hooks` — Prova: `renderHook` (debounce com fake timers; `useToday` = data local; `useRecentSearches` lê/grava/limpa e sobrevive a storage que lança).
9. `feat(search-form): add accessible destination combobox` — `useCombobox`, `useDestinationField`, `DestinationCombobox`, `SuggestionList`. Prova: testes de componente dos critérios 1–11.
10. `feat(search-form): add date range fields` — Prova: componente (critérios 12–16).
11. `feat(search-form): add guests picker` — Prova: componente (critérios 17–18).
12. `feat(search-form): add search form with error summary and navigation` — `useSearchForm`, `SearchForm`, `ErrorSummary`, `index.ts`. Prova: componente (19–21, 27) com `useRouter` mockado.
13. `feat(search-form): add recent searches list` — Prova: componente (22–24).
14. `feat(search-form): compose search form on home page` — `app/page.tsx` + `page.test.tsx`. Prova: `npm run typecheck && npm run lint && npm run test` verdes; smoke E2E existente segue verde.
15. `test(search-form): add e2e for search flow` — Prova: `npm run test:e2e` verde (desktop e mobile).
16. `docs(search-form): update feature claude.md` — Prova: revisão.

## Plano de testes

**Unit (`model/`, `shared/lib`)** — 100% das funções puras listadas nas tarefas 1–6. Datas sempre
passadas por parâmetro (`today`), nunca `new Date()` dentro da função.

**Componente (Vitest + Testing Library + `renderWithProviders`)**
- `fetch` com `vi.stubGlobal`; `next/navigation` com `vi.mock` (`useRouter().push` espiado).
- Debounce: `vi.useFakeTimers({ shouldAdvanceTime: true })` + `userEvent.setup({ advanceTimers })`;
  conta requests (1 para "flor").
- Combobox: papéis/atributos ARIA, ↓/↑/Enter/Esc/Esc/Tab, clique, limpar, loading com e sem dados
  anteriores, vazio, erro + retry, anúncio da contagem.
- Form: submit inválido (foco no primeiro inválido, resumo, `aria-invalid`), submit válido (URL exata
  do `push`, item salvo no localStorage), `initialCriteria`.
- Recentes: restaurar com datas futuras/passadas (foco e anúncio), limpar, storage corrompido.

**E2E (Playwright, API real em `:3333`)** — `e2e/search-form.spec.ts`
- Fluxo feliz só com teclado: digitar "sao", ↓, Enter, preencher datas (hoje + 7 / + 10 via
  `addDays`), Tab até "Buscar hotéis", Enter → `expect(page).toHaveURL(/\/search\?destination=S%C3%A3o\+Paulo%2C\+SP&checkIn=…/)`.
- Recentes: voltar para `/` e ver o item; recarregar e continuar vendo.
- `_delay`: `page.route("**/suggestions**")` reescrevendo a URL com `&_delay=2000` → spinner e
  "Buscando destinos…" visíveis.
- `_fail`: mesma técnica com `&_fail=1` → mensagem de erro + "Tentar de novo"; remover a rota e
  clicar → resultados.
- Validação: enviar vazio → resumo com 3 erros e foco no destino.
- axe (wcag2a/aa) com popover aberto e com erros; viewport 320 px sem scroll horizontal
  (`scrollWidth <= clientWidth`).

## Riscos

| Risco | Mitigação |
|---|---|
| Hydration mismatch por "hoje" ou localStorage | `useToday` com snapshot de servidor `null`; recentes lidas em `useEffect`; nada do relógio no HTML do servidor |
| Blur do input fecha o popover antes do clique na opção | `onMouseDown` + `preventDefault` na opção; teste de componente do clique |
| Resposta antiga sobrescrevendo a nova | cada `q` tem chave própria; a UI mostra `data` da chave atual (`keepPreviousData` só como placeholder) |
| `q` full-text traz sugestões "estranhas" ("bra" → todas) | aceito e documentado; no máximo 10 itens com scroll |
| `<input type="date">` difere entre browsers e no jsdom | valor sempre `YYYY-MM-DD`; testes de componente usam `fireEvent.change`/`user.type` com ISO; E2E usa `fill` |
| Regras de cross-field não revalidam (RHF) | `deps` em `checkIn` e `rooms`; teste "mudar check-in limpa erro do check-out" |
| Funções/arquivos acima do limite do Biome | quebra planejada em hooks/componentes (tabela de Arquivos); `npm run lint` em toda tarefa |
| Submit cai em 404 até a F3 existir | esperado; E2E só verifica a URL |
| `initialCriteria` com destino arbitrário | aceito; a F3 trata vazio |
