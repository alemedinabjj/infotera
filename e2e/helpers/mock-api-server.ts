import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { test as base } from "../fixtures";

type ServerOptions = { delay: number; failRate: number };

const waitForServer = async (url: string, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // `_fail=1` responde 500: basta o servidor responder para considerá-lo no ar.
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`mock-api não subiu em ${url}`);
};

/** Sobe uma mock-api real (server.js) com flags próprias, numa porta exclusiva do worker. */
const startServer = async (port: number, { delay, failRate }: ServerOptions) => {
  const child: ChildProcess = spawn(
    process.execPath,
    [
      "server.js",
      "--port",
      String(port),
      "--delay",
      String(delay),
      "--fail-rate",
      String(failRate),
    ],
    { cwd: path.join(__dirname, "..", "..", "mock-api"), stdio: "ignore" },
  );
  await waitForServer(`http://localhost:${port}/suggestions?q=sao&_delay=0&_fail=1`);
  return { url: `http://localhost:${port}`, stop: () => child.kill() };
};

type Fixtures = {
  /** mock-api com `--delay 2000`. */
  slowApi: { url: string };
  /** mock-api com `--fail-rate 1` (todo request responde 500). */
  failingApi: { url: string };
};

export const test = base.extend<object, Fixtures>({
  slowApi: [
    // biome-ignore lint/correctness/noEmptyPattern: o Playwright exige destructuring no 1º argumento do fixture
    async ({}, use, workerInfo) => {
      const server = await startServer(3400 + workerInfo.parallelIndex * 2, {
        delay: 2000,
        failRate: 0,
      });
      await use({ url: server.url });
      server.stop();
    },
    { scope: "worker" },
  ],
  failingApi: [
    // biome-ignore lint/correctness/noEmptyPattern: o Playwright exige destructuring no 1º argumento do fixture
    async ({}, use, workerInfo) => {
      const server = await startServer(3401 + workerInfo.parallelIndex * 2, {
        delay: 0,
        failRate: 1,
      });
      await use({ url: server.url });
      server.stop();
    },
    { scope: "worker" },
  ],
});
