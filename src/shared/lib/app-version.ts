/**
 * Versão do build (`next.config.ts` define `NEXT_PUBLIC_APP_VERSION`: versão do `package.json` + commit
 * ou carimbo do build). É o `buster` do cache persistido e o sufixo dos caches do service worker:
 * cada deploy descarta o que o anterior salvou.
 */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
