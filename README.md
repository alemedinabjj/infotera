# infotera
## Detalhe do hotel (F4): decisões para registrar

- **Hotel inexistente responde `200` com `noindex`**: o `loading.tsx` precisa de streaming para mostrar o
  skeleton no cold start da API (Render), e o status HTTP já foi enviado quando o `notFound()` roda. A UI e o
  título são de "Hotel não encontrado"; id fora do formato (`/hotel/abc`) nem chama a API.
- **Regras de cancelamento são texto ilustrativo**: a API só informa a categoria (`free`, `moderate`, `strict`);
  os prazos exibidos ficam centralizados em `cancellationDetails` para trocar por dados reais.
- **Mapa estático** com tiles do OpenStreetMap (atribuição e link visíveis); o interativo fica para os extras.
