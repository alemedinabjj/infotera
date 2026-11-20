import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const frontPort = Number(process.env.E2E_FRONT_PORT ?? 3000);
const baseURL = externalBaseURL ?? `http://localhost:${frontPort}`;
const isCI = Boolean(process.env.CI);
// Cadeia do E2E: navegador e servidor do Next -> proxy de controle (`e2e/helpers/control-proxy.mjs`)
// -> mock-api. O proxy repassa tudo e deixa os testes atrasar/falhar/segurar requests do servidor
// do Next (que o `page.route` não vê). Portas por env para conviver com outros servidores.
const upstreamURL =
  process.env.E2E_UPSTREAM_URL ?? `http://localhost:${process.env.E2E_MOCK_API_PORT ?? 3333}`;
const proxyPort = Number(process.env.E2E_PROXY_PORT ?? 3334);
const proxyURL = `http://localhost:${proxyPort}`;
// Os workers herdam o env: os helpers (`API_URL`) falam com o proxy. Deploy externo mantém o valor.
if (!externalBaseURL) process.env.NEXT_PUBLIC_API_URL = proxyURL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // O site rola suave nas âncoras (só sem `prefers-reduced-motion`); nos testes a rolagem é
    // instantânea para as medições de posição não pegarem a animação no meio.
    reducedMotion: "reduce",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  // Deploy externo (`PLAYWRIGHT_BASE_URL`): nada para subir (os testes que precisam do proxy de
  // controle são pulados se `NEXT_PUBLIC_API_URL` não apontar para ele). Senão sobe a mock-api, o
  // proxy na frente dela e o front quando ainda não estiverem rodando (`npm install` em `mock-api/`).
  webServer: externalBaseURL
    ? undefined
    : [
        {
          command: "npm --prefix mock-api run server",
          url: `${upstreamURL}/suggestions?q=sao`,
          reuseExistingServer: !isCI,
          env: { PORT: new URL(upstreamURL).port },
        },
        {
          command: "node e2e/helpers/control-proxy.mjs",
          url: `${proxyURL}/__control/health`,
          reuseExistingServer: !isCI,
          env: { PROXY_PORT: String(proxyPort), UPSTREAM_URL: upstreamURL },
        },
        {
          command: `npm run dev -- -p ${frontPort}`,
          url: baseURL,
          reuseExistingServer: !isCI,
          env: { NEXT_PUBLIC_API_URL: proxyURL },
        },
      ],
});
