import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckoutPage, checkoutPageTitle } from "@/features/checkout";
import { isLocale } from "@/shared/i18n/config";

export const generateMetadata = async ({
  params,
}: Pick<PageProps<"/[locale]/checkout">, "params">): Promise<Metadata> => {
  const { locale } = await params;
  return {
    title: checkoutPageTitle(isLocale(locale) ? locale : "pt-BR"),
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
