# feature: booking-history (`/my-bookings`) — F7a

Reservas deste navegador. Lê os ids que a F6 grava (`shared/lib/booking-history`, `infotera:booking-history`) e faz um `GET /bookings/:id` por id
(até 10, em paralelo, `bookingQueryOptions` com `meta.sensitive`). `app/` importa só `BookingHistoryView`.

```
model/        stay-status (stayStatus, stayStatusTone) · history-rows (classifyHistoryResults)
i18n/         pt-BR · en-US · messages (`historyMessages`; rótulos de situação em `stay.*`, a cor sai de `stayStatusTone`)
hooks/        useHistoryMessages · useBookingHistory (useSyncExternalStore) · useHistoryRows (queries, prune de 404, hotéis)
components/   BookingHistoryView · HistoryRowItem (linha + fantasma) · HistoryItem · HistoryItemStates · RemovedHistoryItem · ClearHistoryButton
```

- **Só o `404` tira o id do storage** (uma vez, com `Alert`); erro de rede, 5xx e **consulta em pausa (offline)** são `failed` (retry por linha, id
  guardado); corpo fora do schema é `unreadable`. A ordem é a do storage e não muda quando os dados chegam.
- Nomes dos hotéis: **um** `GET /hotels?id=…`, pedido quando nenhuma reserva está pendente. Hotel que falha/não existe: "Hotel indisponível".
- A página **não** mostra titular, e-mail, telefone, documento nem o id completo (só no `href` de "Ver reserva").
- Remover: fantasma na mesma célula (mesma altura), foco no "Desfazer" e depois no "Remover". "Limpar histórico": `Dialog`, `resetSnapshot`, foco no h1
  (`focusWhenReady`, porque o botão e o dialog desmontam com a lista) e toast com Desfazer. Storage que lança → vazio, sem quebrar.
