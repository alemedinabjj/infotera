import { createSerwistRoute } from "@serwist/turbopack";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/**
 * Service worker em `/serwist/sw.js` (escopo `/`), compilado por esbuild a partir de
 * `features/app-shell/worker/sw.ts` com o manifest de precache dos assets do build. As páginas
 * offline dos dois idiomas entram no precache com a revisão do build.
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: "src/features/app-shell/worker/sw.ts",
    useNativeEsbuild: true,
    additionalPrecacheEntries: [
      { url: "/offline", revision: VERSION },
      { url: "/en/offline", revision: VERSION },
    ],
    esbuildOptions: {
      define: {
        "process.env.NEXT_PUBLIC_APP_VERSION": JSON.stringify(VERSION),
        "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(process.env.NEXT_PUBLIC_API_URL ?? ""),
      },
    },
  },
);
