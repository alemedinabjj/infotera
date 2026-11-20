# feature: hotel-details (`/hotel/[hotelId]`) — F4

Página do hotel. Server-first: dados estáticos renderizados no servidor, client só para interação.

## Escopo
- Básico: `GET /hotels/:id`, galeria, informações, quartos (`GET /rooms?hotelId=`), botão
  "Selecionar" que grava `{ hotelId, roomId }` no `booking-draft` e navega para `/checkout`.
- Avançados: fetch paralelo + Suspense por seção, disponibilidade/escassez/esgotado, lightbox com
  teclado, reviews paginadas, política de cancelamento expansível, breadcrumb, copiar link.

## Estrutura esperada
```
api/hotel.ts · api/rooms.ts · api/reviews.ts     queryOptions reutilizáveis no server e no client
model/availability.ts    nível de escassez: 'sold_out' | 'low' (1–2) | 'available' — função pura
model/cancellation.ts    texto por policy: 'free' | 'moderate' | 'strict' (switch exaustivo)
components/HotelHeader.tsx · Gallery.tsx · Lightbox.tsx ("use client") · HotelInfo.tsx ·
           RoomList.tsx · RoomCard.tsx · SelectRoomButton.tsx ("use client") ·
           Reviews.tsx ("use client", paginado) · CancellationPolicy.tsx · Breadcrumb.tsx · ShareButton.tsx
index.ts
```

## Regras
- `hotelId` não numérico ou 404 da API → `notFound()`.
- Disparar hotel, quartos e 1ª página de reviews em paralelo (`Promise.all` ou prefetch +
  `HydrationBoundary`), cada seção com seu `<Suspense>` e skeleton. Sem waterfall.
- "A partir de" = menor `pricePerNight` dos quartos, não o do hotel (hotéis 1 e 4 divergem).
- Quarto com `available === 0` → botão desabilitado com texto "Esgotado". `available ≤ 2` → "Apenas N quartos!".
- Quarto com `maxGuests` menor que os hóspedes da busca → avisar e não permitir selecionar.
- Sem critérios de busca no store/URL (acesso direto pela URL) → permitir ver, mas pedir datas antes de selecionar.
- Reviews: `_page`, `_limit=5`, `_sort=date&_order=desc`; total pelo `X-Total-Count`.

## Acessibilidade
- Lightbox: `role="dialog"`, `aria-modal`, foco preso, ←/→/Esc, devolve o foco ao thumbnail.
- Imagens com `alt` descritivo (nome do hotel + índice). Thumbnails com `loading="lazy"`.
- Política expansível com `<details>`/`<summary>` ou botão com `aria-expanded`.

## Testes
- Unit: `availability`, `cancellation`, menor preço dos quartos.
- Componente: lightbox por teclado; selecionar quarto grava no store e navega; quarto esgotado desabilitado.

## Contrato com a F3
- A F3 prefetcha (hover/foco do card) `hotelQueryOptions(id)` e `hotelRoomsQueryOptions(id)` de `shared/api/queries`.
  Leia hotel e quartos com **as mesmas options** nas partes cliente (ou hidrate com a mesma chave) para o prefetch valer.
- Preço do card da F3 = `pricePerNight` do hotel; "a partir de" aqui vem dos quartos (hotéis 1 e 4 divergem: o detalhe mostra menos).
- `unsplashLoader`, `BLUR_DATA_URL`, `RatingScore`, `PriceTag` e `HotelCard` nasceram na F3: promova para `shared/` ao reusar.
