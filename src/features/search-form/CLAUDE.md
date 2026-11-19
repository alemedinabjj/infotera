# feature: search-form (`/`) — F2

Formulário de busca da página inicial. Ao enviar, navega para `/search?<params>`.

## Escopo
- Destino com autocomplete (`GET /suggestions?q=`), datas, quartos, adultos, crianças.
- Avançados escolhidos: debounce 300 ms, loading no autocomplete, validação em tempo real,
  últimas 5 buscas no localStorage.

## Estrutura esperada
```
api/suggestions.ts        suggestionsQueryOptions(q) — enabled só com q.trim().length >= 2
model/search-form.schema.ts  schema Zod do form (reusa shared/lib/search-params + regras de data)
model/recent-searches.ts  add/dedupe/limit(5) — funções puras
hooks/useDebouncedValue.ts
hooks/useRecentSearches.ts
components/SearchForm.tsx · DestinationCombobox.tsx · DateRangeFields.tsx · GuestsPicker.tsx · RecentSearches.tsx
index.ts                  export { SearchForm }
```

## Regras de negócio
- Check-in ≥ hoje (data local). Check-out ≥ check-in + 1 dia. Máximo 30 noites.
- Quartos ≥ 1; adultos ≥ 1 por quarto; crianças ≥ 0. Defina e documente limites máximos.
- O destino só é válido se escolhido da lista: guarde o `name` exato da sugestão (é o que `/hotels?destination=` exige, com acento).
- Busca vazia em `/suggestions` não dispara request. Mantenha os resultados anteriores enquanto carrega (`placeholderData: keepPreviousData`).

## Acessibilidade
- Combobox ARIA 1.2: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; ↑/↓/Enter/Esc.
- Resultado do autocomplete anunciado em `aria-live="polite"` ("5 destinos encontrados").
- Erros de campo com `aria-invalid` + `aria-describedby`.

## Testes
- Unit: schema (datas no passado, 0 noites, 31 noites, limites de hóspedes), `recent-searches`.
- Componente: digitar → debounce → lista; teclado no combobox; submit navega com a URL certa.
