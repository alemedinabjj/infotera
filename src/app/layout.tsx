import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infotera Hotéis",
  description: "Busque, compare e reserve hotéis com preço claro do início ao fim.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html lang="pt-BR">
    <body className="min-h-dvh antialiased">{children}</body>
  </html>
);

export default RootLayout;
