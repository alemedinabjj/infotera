# infotera
## Detalhe do hotel (F4): decisões para registrar

- **Hotel inexistente responde `200` com `noindex`**: o `loading.tsx` precisa de streaming para mostrar o
  skeleton no cold start da API (Render), e o status HTTP já foi enviado quando o `notFound()` roda. A UI e o
  título são de "Hotel não encontrado"; id fora do formato (`/hotel/abc`) nem chama a API.
- **Regras de cancelamento são texto ilustrativo**: a API só informa a categoria (`free`, `moderate`, `strict`);
  os prazos exibidos ficam centralizados em `cancellationDetails` para trocar por dados reais.
- **Mapa estático** com tiles do OpenStreetMap (atribuição e link visíveis); o interativo fica para os extras.
- **`pricePerNight` do hotel diverge do menor quarto nos hotéis 1 e 4** (dado da mock-api, não bug do app):
  hotel 1 (Copacabana Palace) informa R$ 1.200 e tem quartos de R$ 800 e R$ 1.200; hotel 4 (Costão do
  Santinho) informa R$ 890 e tem quartos a partir de R$ 720. As listas (F3 e "similares") usam o
  `pricePerNight` do hotel, pois é o único preço que a API entrega sem buscar os quartos de cada um; o
  detalhe mostra "a partir de" pelo **menor quarto com estoque** (`lowestNightlyPrice`) e os totais do quarto
  e do checkout vêm sempre do `pricePerNight` do quarto. Por isso o preço pode mudar entre a lista e o
  detalhe nesses dois hotéis.
