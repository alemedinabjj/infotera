import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/shared/providers/AppProviders";
import { SiteHeader } from "@/shared/ui/layout/SiteHeader";
import { SkipLink } from "@/shared/ui/layout/SkipLink";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Infotera Hotéis",
  description: "Busque, compare e reserve hotéis com preço claro do início ao fim.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html lang="pt-BR" className={inter.variable}>
    <body className="min-h-dvh antialiased">
      <SkipLink />
      <AppProviders>
        <SiteHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 lg:py-10 xl:px-8"
        >
          {children}
        </main>
      </AppProviders>
    </body>
  </html>
);

export default RootLayout;
