# feature: search-form (`/`) — F2

Formulário de busca da página inicial. Ao enviar, grava a busca nas recentes e navega para
`/search?<serializeSearchCriteria>`. Spec: `docs/specs/F2-search-form.md` (inclui `## UI/UX`).

## Estrutura
```
api/suggestions.ts          suggestionsQueryOptions(q): chave normalizada, enabled com >= 2 chars, staleTime 5 min, keepPreviousData
model/search-form.schema.ts makeSearchFormSchema(today) (reusa applySearchCriteriaRules da F1) · FORM_MESSAGES · toFormValues
model/search-form.resolver.ts  resolver do RHF que lê todayISO() a cada validação
model/stay-dates.ts         adjustCheckOut · dateBounds · stayNights
model/guests.ts             guestLimits · guestHint (limites dinâmicos: estado inválido inalcançável pela UI)
model/recent-searches.ts    add/dedupe/limit(5), parse tolerante, restoreRecentSearch, describeRecent*
model/combobox.ts           reducer puro do teclado (genérico: não sabe o que é destino)
model/suggestion-text.ts    normalizeQuery · highlightMatch · describeResultCount
model/error-summary.ts      erros do RHF → itens do resumo (ordem do DOM)
model/notices.ts            textos dos avisos automáticos
hooks/useCombobox.ts        ARIA 1.2 + teclado (genérico) · useDestinationField.ts: texto, seleção, debounce, query
hooks/useSearchForm.ts      useForm + submit (recente + transition + push) + restaurar recente
hooks/useToday.ts · useOnline.ts · useRecentSearches.ts   useSyncExternalStore (servidor = null / true / [])
components/                 SearchForm · DestinationCombobox · SuggestionList/Option · DateRangeFields · GuestsPicker · ErrorSummary · RecentSearches
index.ts                    export { SearchForm }
```

## Decisões que valem daqui para frente
- **Combobox e DateRange vivem na feature** (só a F2 os usa). Promover para `shared/ui` quando houver
  segundo uso; `useCombobox` + `model/combobox.ts` já são genéricos para isso.
- **RHF `mode: "onTouched"` + `reValidateMode: "onChange"`**: erro só ao sair do campo e, depois,
  em tempo real. Submit nunca desabilitado; inválido → foco no 1º campo + `ErrorSummary`.
- **Destino = `name` da sugestão escolhida**, separado do texto digitado (`useDestinationField`). Digitar
  desfaz a seleção **sem validar** (`setValue(..., shouldValidate: name !== "")`), para o erro não piscar
  enquanto a pessoa digita. O blur do RHF só dispara quando o foco sai do wrapper (input + popover).
- **"Hoje" é lido na validação** (`searchFormResolver`); `useToday()` (snapshot de servidor `null`) só
  alimenta `min`/`max` e o selo "Datas passadas", evitando hydration mismatch.
- **Limites de hóspedes**: quartos 1–4, adultos 1–16 (≥ quartos), crianças 0–10, ≤ 5 hóspedes por quarto
  (`SEARCH_LIMITS`). `guestLimits` calcula min/max de cada stepper; o schema é só rede de segurança.
  Empate entre teto de capacidade e teto absoluto: vale a mensagem de capacidade.
- **Datas**: `<input type="date">` nativo; check-out vazio/≤ check-in vira check-in + 1 (aviso só no
  caso ≤); > 30 noites mantém e mostra o erro. Avisos ficam visíveis (`description` do campo) e no
  anunciador `sr-only` do form.
- **Listbox `hidden` quando não há opções** (carregando/vazio/erro): um `role="listbox"` vazio e
  visível reprova no axe (`aria-required-children`). As linhas de status ficam fora do `ul`.
- **Estado de erro do combobox**: Tab NÃO fecha (foco vai para "Tentar de novo"); fecha quando o foco
  sai do wrapper. "Tentar de novo" mantém a linha de erro (loading "Tentando…") até o refetch acabar.
- **Recentes**: `createStorage("local")`, chave `infotera:recent-searches`, lidas via
  `useSyncExternalStore` (servidor = lista vazia). Clicar preenche o form (não envia). Gravadas só no
  submit válido; storage indisponível = lista vazia e nada quebra (a busca não é persistida).
- **Sem marca de "selecionado" na opção**: com o destino escolhido o popover não reabre (query desligada).
- Submit cai no 404 até a F3 existir; o E2E só confere a URL.
- E2E: inputs de data do Chromium têm segmentos que consomem Tab (não dá para "Tab até" o botão a partir
  deles); clicar em "Buscar hotéis" logo após digitar um destino inválido pode errar o clique, porque o
  erro do blur empurra o botão para baixo (os testes usam Enter no botão).

## Regras de negócio
- Check-in ≥ hoje (data local). Check-out ≥ check-in + 1 dia. Máximo 30 noites.
- O destino só é válido se escolhido da lista: guarde o `name` exato (com acento).
- Busca com < 2 caracteres não dispara request.

## Acessibilidade
- Combobox ARIA 1.2: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`;
  ↑/↓/Enter/Esc/Tab. Contagem anunciada em `aria-live="polite"` própria.
- Erros de campo com `aria-invalid` + `aria-describedby` (via `Field`); `ErrorSummary` é `role="alert"`.
- Regiões vivas sempre montadas: contagem do combobox, resumo de noites, steppers (valor e hint), anunciador do form.

## Testes
- Unit em `model/` (schema + paridade com a URL, datas, hóspedes, recentes, reducer, texto) e `api/`.
- Componente: combobox (debounce, ARIA, teclado, loading, vazio, erro), datas, hóspedes, form (submit
  inválido/válido, `initialCriteria`), recentes.
- E2E `e2e/search-form.spec.ts`: fluxo por teclado, recentes, `_delay`, `_fail`, axe, 320 px.
