import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { BackgroundDecor } from "@/components/background-decor";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Castilho Agronegócios",
  description: "Sistema de gestão de negócios e gado da Castilho Agronegócios.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Castilho Agronegócios",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#fefce5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body>
        {/*
          reloadOnOnline desligado: por padrão o Serwist recarrega a página quando a
          conexão volta, o que apagaria um formulário em preenchimento. A sincronização
          da fila offline cuida da volta da rede (components/offline/sync-status).
          Desativado em `next dev`: cache de service worker atrapalha o desenvolvimento.
        */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          reloadOnOnline={false}
          disable={process.env.NODE_ENV === "development"}
        >
          <BackgroundDecor />
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
