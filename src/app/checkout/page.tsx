import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckoutPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: "Finalizar reserva | Infotera Hotéis",
  robots: { index: false },
};

/**
 * `/checkout`. Renderização dinâmica (`connection()`): o `proxy.ts` gera um nonce por request e a
 * CSP estrita só vale em página dinâmica. A seleção vive no cliente (`sessionStorage`).
 */
const Page = async () => {
  await connection();
  return <CheckoutPage />;
};

export default Page;
