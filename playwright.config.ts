import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);
const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  // Deploy externo (`PLAYWRIGHT_BASE_URL`): nada para subir. Senão sobe a mock-api e o front quando
  // ainda não estiverem rodando (`npm install` em `mock-api/` antes).
  webServer: externalBaseURL
    ? undefined
    : [
        {
          command: "npm --prefix mock-api run server",
          url: `${apiURL}/suggestions?q=sao`,
          reuseExistingServer: !isCI,
        },
        {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: !isCI,
          env: { NEXT_PUBLIC_API_URL: apiURL },
        },
      ],
});
