import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckoutPage, checkoutPageTitle } from "@/features/checkout";
import { localeOf } from "@/shared/i18n/params";
import { WipeOnHide } from "@/shared/ui";

export const generateMetadata = async ({
  params,
}: Pick<PageProps<"/[locale]/checkout">, "params">): Promise<Metadata> => {
  const locale = await localeOf(params);
  return {
    title: checkoutPageTitle(locale),
    robots: { index: false },
  };
};

/**
 * Casca vazia de propósito: nonce de CSP exige renderização por request e "PPR is incompatible with
 * nonce-based CSP". Com `cacheComponents` isso exige `instant = false`. Nunca crie `loading.tsx` nem
 * `<Suspense>` acima do `connection()`.
 * @see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md
 */
export const instant = false;

/**
 * `/checkout` e `/en/checkout`. Renderização dinâmica (`connection()`): o `proxy.ts` gera um nonce
 * por request e a CSP estrita só vale em página dinâmica. A seleção vive no cliente
 * (`sessionStorage`).
 */
const Page = async () => {
  await connection();
  return (
    <WipeOnHide>
      <CheckoutPage />
    </WipeOnHide>
  );
};

export default Page;
