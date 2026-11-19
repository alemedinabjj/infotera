# feature: favorites (`/favorites`) — F7a

Lista os hotéis favoritos deste navegador. Sem servidor: o storage guarda só `{ id, addedAt }` (`shared/saved`) e os dados vêm de
**1** `GET /hotels?id=…` (`hotelsByIdsQueryOptions`). Spec: `docs/specs/F7a-product-extras.md`. `app/` importa só `FavoritesView`.

```
model/        favorites-view (deriveFavoritesView, orderBySnapshot) · messages
hooks/        useFavoritesPage (snapshot de ids no mount, query, prune pós-sucesso)
components/   FavoritesView · FavoriteCard (card + fantasma) · RemovedFavorite · FavoritesSkeleton
```

- **Snapshot no mount**: remover um favorito aqui não reflui a lista; o card vira "fantasma" na mesma célula do grid (conteúdo original
  `invisible` + `inert` por baixo, mesma altura). O foco vai ao "Desfazer" e, ao desfazer, volta ao coração (`focusWhenReady`).
  O `FavoriteButton` usa `notify={false}` aqui (sem toast; o desfazer é inline).
- **Prune só com resposta**: ids que a API não devolveu (e itens inválidos) saem do storage depois do sucesso; erro/offline nunca apagam.
- Estados: hidratando/carregando (skeleton + "demorando" > 5 s), erro (retry), vazio, offline (`Alert` warning; `deriveFavoritesView` tem o
  6º valor `offline`), sucesso. Nunca "vazio" antes de o storage ser lido.
