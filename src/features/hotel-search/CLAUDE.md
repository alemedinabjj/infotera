# feature: hotel-search (`/search`) — F3

Lista de hotéis do destino com filtros, ordenação e paginação. **A URL é a fonte da verdade**:
filtros, ordenação e página vivem nos search params, nada disso vai para o Zustand.

## Escopo
- Básico: cards, skeleton, estado vazio, paginação (`_page`, `_limit=10`, `X-Total-Count`).
- Avançados: filtros (preço, nota mínima, tipo, comodidades), ordenação (preço asc, nota desc,
  `reviewCount` desc), URL sync, compartilhar link, retry + error boundary, prefetch no hover/focus,
  imagens com blur placeholder.

## Estrutura esperada
```
model/filters.schema.ts   schema Zod dos filtros + parse/serialize de URLSearchParams
model/to-api-query.ts     filtros → query string da mock-api (função pura)
api/hotels.ts             hotelsQueryOptions(filters) → { items, total }
hooks/useSearchFilters.ts lê/escreve filtros na URL (router.replace, scroll: false)
components/SearchResults.tsx · HotelCard.tsx · HotelCardSkeleton.tsx · FiltersPanel.tsx ·
           SortSelect.tsx · ResultsPagination.tsx · EmptyResults.tsx
index.ts
```

## Regras / armadilhas da API
- `destination` exige o nome exato com acento (vem da URL gerada pela F2).
- `propertyType` múltiplo: repita o param (`propertyType=hotel&propertyType=pousada`).
- `amenities_like` repetido é **OU**. O requisito é "todas as comodidades" → filtragem no cliente,
  o que quebra o `X-Total-Count`. Decida na spec e documente no README. Sugestão: com comodidades
  ativas, buscar o destino inteiro (máx. 14 hotéis) e paginar no cliente; sem elas, paginar na API.
- Mudar qualquer filtro volta para a página 1.
- Hotel com `availableRooms === 0` aparece com selo "Esgotado" (ids 19 e 48).
- `Bonito, MS` retorna vazio: tem que mostrar estado vazio útil (sugestão de limpar filtros / nova busca).
- Param inválido na URL (ex.: `rating_gte=abc`) é descartado pelo schema, não quebra a página.

## Performance
- `placeholderData: keepPreviousData` na troca de página/filtro (sem piscar skeleton).
- Prefetch do detalhe com `queryClient.prefetchQuery` + `router.prefetch` no `onMouseEnter`/`onFocus`.
- Slider de preço: atualizar a URL com debounce, não a cada pixel.
- Sem virtualização (lista curta) — justificativa no README.

## Acessibilidade
- Filtros em `<fieldset>`/`<legend>`; contagem de resultados em `aria-live`.
- Card inteiro clicável com um único link real (sem link dentro de link).
- Painel de filtros vira drawer no mobile, com foco preso e Esc.

## Testes
- Unit: `filters.schema` (round-trip URL ↔ objeto, valores inválidos), `to-api-query`.
- Componente: aplicar filtro atualiza URL e reseta página; estado vazio; erro com retry (`_fail`).
