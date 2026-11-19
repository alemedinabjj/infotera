# feature: hotel-comparison (`/compare`) — F7a

Compara até 3 hotéis lado a lado. **A URL é a página** (`/compare?hotel=1&hotel=4&hotel=7`), a bandeja (`shared/saved`) é só a seleção.
`app/` importa `ComparisonView` (prop `headingLevel`: 1 na página, 2 no futuro modal da F7c) e `ComparisonFallback`.

```
api/          rooms (comparisonRoomsQueryOptions: GET /rooms?hotelId=1&hotelId=4)
model/        compare-params (parseCompareParams) · hotel-comparison (buildHotelComparison) · messages
hooks/        useComparisonPage (ids da URL + 2 queries em paralelo) · compare-url (removeColumn: replaceState)
components/   ComparisonView · HotelColumnHeader · ComparisonSkeleton · CompareNotice
```

- `parseCompareParams` é tolerante (só inteiros positivos, dedupe, ordem, corte em 3). Link compartilhado funciona sem storage e não altera a bandeja.
- "A partir de" vem dos **quartos** (`lowestNightlyPrice`), como no detalhe; sem quartos usa o preço do hotel; esgotado recebe a nota e fica fora do selo
  "Menor preço". Selos de texto (`best`/`bestLabel`); empate total → sem selo.
- Só sai de `loading` com hotéis **e** quartos; um erro único cujo retry refaz só a query que falhou. Id que a API não devolve: `Alert` e a coluna some.
- Remover coluna: `history.replaceState`, tira da bandeja se estiver nela e foca o título.
- A tabela é `shared/ui/molecules/ComparisonTable`; os textos são de `model/messages.ts`.
