# feature: booking-confirmation (`/confirmation/[bookingId]`) — F6

Mostra a reserva criada. Tem que funcionar com reload e com o link aberto em outra aba, então a
fonte de dados é **sempre** `GET /bookings/:id`, nunca o store.

## Escopo
- Número da reserva em destaque, resumo completo (hotel, quarto, datas, noites, hóspedes, total),
  botão "Nova busca" (limpa a seleção do `booking-draft` e vai para `/`).

## Estrutura esperada
```
api/booking.ts            bookingQueryOptions(id) — schema Booking de shared/api
components/ConfirmationView.tsx · BookingSummaryCard.tsx · NewSearchButton.tsx ("use client")
index.ts
```

## Regras
- Server Component busca reserva + hotel + quarto em paralelo (hotel/quarto pelos ids da reserva).
- 404 → `notFound()` com página "Reserva não encontrada" e link para nova busca.
- Lembrete no README: a mock-api zera as reservas a cada restart.
- Não exibir dados sensíveis além do necessário (sem CPF completo; email pode aparecer).

## Acessibilidade
- Título "Reserva confirmada" como `h1` e recebe o foco ao carregar; número da reserva copiável.

## Testes
- Componente: renderiza a partir do dado da API; estado de não encontrada.
- Parte do E2E do fluxo completo (F7).
