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

## Checkout (F5): decisões para registrar

- **Ambiente de demonstração**: a mock-api pública (Render) não tem autenticação e `GET /bookings/:id` é
  aberto. O checkout mostra "Ambiente de demonstração — não use dados reais." no topo do formulário. O
  payload do `POST /bookings` nunca leva CPF, passaporte nem cartão: só `cardLast4`; o documento é validado
  e descartado. O pagamento é simulado (cartão de teste `4111 1111 1111 1111`, validade futura, qualquer CVV).
- **Reserva por Server Action** (`createBookingAction`): o cliente manda só referências e escolhas; o
  servidor relê hotel e quarto, recalcula o preço com a mesma função pura (centavos inteiros, taxa de serviço
  10% e ISS 5% sobre a base com desconto), reavalia o cupom e a disponibilidade e só então grava. O id da
  reserva é um UUID v4 gerado por tentativa (retry idempotente, e ids não enumeráveis). Se `crypto.randomUUID`
  não existir (contexto sem HTTPS/localhost), a idempotência se perde.
- **CSP estrita com nonce só em `/checkout`** (`src/proxy.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'`,
  `img-src` com `images.unsplash.com`, `i.pravatar.cc` e `tile.openstreetmap.org`, `connect-src` com a origem de
  `NEXT_PUBLIC_API_URL`. As outras rotas mantêm a política base para não perder PPR/ISR. Por isso o
  "Selecionar quarto" entra no checkout com carga de documento (`location.assign`), e o checkout recarrega uma
  vez se for aberto por navegação client-side. `require-trusted-types-for` e `report-to` ficaram de fora (o
  runtime do Next não é compatível sem política própria e não há backend para relatórios). Rode a suíte de
  CSP também contra o build: `npm run build && npx next start` com `PLAYWRIGHT_BASE_URL`.
- **Cupons de demonstração** (locais; a mock-api não tem endpoint): `BEMVINDO10` (10%), `FERIAS15` (15%, mínimo
  3 noites), `DESCONTO50` (R$ 50, subtotal mínimo R$ 300) e `VERAO2024` (expirado).
- **Múltiplos quartos = N unidades do mesmo tipo.** Quartos de tipos diferentes na mesma reserva ficam como
  evolução: o contrato do `Booking` tem um único `roomId`.
- **Documento (CPF/Passaporte)**: CPF com dígito verificador; passaporte pelo formato do ICAO 9303 (não há
  dígito verificador público do número fora da MRZ).
- Com crianças, recarregar a página volta ao passo 1 (a idade nunca é persistida).

### Confirmação da reserva (F6)
- **A mock-api zera as reservas a cada restart**: um link `/confirmation/<id>` antigo vira "Reserva não encontrada".
- A página lê a reserva no servidor a cada request (`no-store`, `noindex`); o id precisa ser UUID v4 ou o id curto do json-server
  (ex.: `L-nHVI_`, o das reservas criadas pelo `curl` da mock-api); id só com dígitos não abre, para não enumerar reservas. O histórico local (`infotera:booking-history`) guarda só ids.
- Limite dos E2E: hotel e quarto são buscados pelo servidor do Next, então `_delay`/`_fail` não passam pelo `page.route`;
  esses cenários ficam em unit e teste de componente. Cancelar/alterar, imprimir/PDF e compartilhar o link ficam como evolução.

## Extras de produto (F7a): decisões para registrar
- **Favoritos, comparação e histórico são locais** (`localStorage`, só ids validados com Zod): não há autenticação e a mock-api não tem esse recurso
  (`POST /favorites` → 404 no json-server). Uma lista no servidor seria a mesma para todo mundo; fica como evolução. `GET /bookings` (todas as
  reservas, com PII) nunca é usado.
- **Rotas em inglês** (`/favorites`, `/compare`, `/my-bookings`), consistentes com `/search`, `/hotel`, `/checkout`; os textos da tela são pt-BR. Os slugs
  vivem em `shared/saved/model/routes.ts`.
- **Motion** (`motion@14.14.0`, `LazyMotion` assíncrono e `m.*` em modo `strict`): só `opacity`/`transform`, nada que o servidor renderiza começa
  invisível, `prefers-reduced-motion` respeitado (`MotionConfig reducedMotion="user"` + presets sem deslocamento e fade ≤ 150 ms).
- **Costuras com a F7b/F7c**: `bookingQueryOptions` tem `meta: { sensitive: true }` (o cache offline não deve persistir PII); todo texto novo está em
  `messages.ts` por módulo; `ComparisonView` aceita `headingLevel` e lê a URL (modal por Parallel Routes); `isTrayHiddenOn` é a condição da bandeja.


## Extras de Next.js (F7c): decisões para registrar

- **PPR (`cacheComponents` + `partialPrefetching`)**: a página do hotel é uma casca estática do catálogo (`"use cache"`: hotel, quartos, comentários e similares) com buracos só para o que depende
  da estadia (resumo, total e botão por quarto, links com critérios), alimentados por uma promessa de `searchParams` criada sem `await`.
- **ISR**: `generateStaticParams` lista todos os hotéis da API (60) com retry (8 tentativas, 2 s a 15 s) por causa do cold start da mock-api no Render. **`npm run build` precisa da API no ar**
  (`cd mock-api && npm run server`); acorde a API antes do deploy.
- **Galeria como rota**: `/hotel/{id}/photos/{n}` abre como modal por Parallel + Intercepting Route e como página cheia em reload/link direto. Voltar do navegador fecha o modal.
- **Server Actions**: continua uma só (`createBookingAction`), com `bodySizeLimit: "64kb"`. Favoritos/comparação/histórico vivem no dispositivo; não existe endpoint para eles.
- **Edge Runtime: avaliado e descartado**: `runtime = 'edge'` é *deprecated* no 16.4 e incompatível com `cacheComponents` (e o Proxy roda em Node). PPR + ISR servem a página do cache sem tocar na API.
- **Checkout continua dinâmico** (`ƒ`, nonce da CSP por request) e a confirmação nunca guarda PII na casca. `npm run test:e2e:prod` roda os testes `@prod` contra `next build && next start`.
