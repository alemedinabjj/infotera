import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/shared/providers/AppProviders";
import { CompareTray } from "@/shared/saved/components/CompareTray";
import { SavedNav } from "@/shared/saved/components/SavedNav";
import { SiteHeader } from "@/shared/ui/layout/SiteHeader";
import { SkipLink } from "@/shared/ui/layout/SkipLink";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Infotera Hotéis",
  description: "Busque, compare e reserve hotéis com preço claro do início ao fim.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html lang="pt-BR" className={inter.variable} data-scroll-behavior="smooth">
    <body className="min-h-dvh antialiased">
      <SkipLink />
      <AppProviders>
        <SiteHeader actions={<SavedNav />} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl scroll-mt-14 px-4 py-6 pb-[calc(var(--bottom-bar-height,0px)+1.5rem)] md:px-6 lg:scroll-mt-16 lg:py-10 lg:pb-[calc(var(--bottom-bar-height,0px)+2.5rem)] xl:px-8"
        >
          {children}
        </main>
        <CompareTray />
      </AppProviders>
    </body>
  </html>
);

export default RootLayout;
