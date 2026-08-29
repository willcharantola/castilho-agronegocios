import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
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
        <BackgroundDecor />
        {children}
      </body>
    </html>
  );
}
