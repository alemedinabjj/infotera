# mock-api — API fornecida pelo teste

Cópia da `mock-api/` do repo `ygor-infotera/test-front`. **Não é código nosso: não altere**
`server.js`, `db.seed.json` nem `package.json`. O teste exige consumir esta API como está.

- Rodar: `npm install && npm run server` (porta 3333, delay 300 ms). `npm run server:fast` sem delay.
- Erros: `?_fail=1`, `?_delay=3000`, `npm run server -- --fail-rate 0.3`.
- `db.json` é gerado a cada start e está no `.gitignore`.
- Contrato: `README.md` desta pasta. Armadilhas dos dados: `docs/TEST_MAP.md` → "Mock API".
- `types.ts` é referência. Os tipos que o front usa saem dos schemas Zod em `src/shared/api/schemas.ts`.
- Deploy (bônus): Render/Railway com root `mock-api`, build `npm install`, start `npm start`.
