import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckoutPage, checkoutPageTitle } from "@/features/checkout";
import { localeOf } from "@/shared/i18n/params";

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
 * `/checkout` e `/en/checkout`. Renderização dinâmica (`connection()`): o `proxy.ts` gera um nonce
 * por request e a CSP estrita só vale em página dinâmica. A seleção vive no cliente
 * (`sessionStorage`).
 */
const Page = async () => {
  await connection();
  return <CheckoutPage />;
};

export default Page;
