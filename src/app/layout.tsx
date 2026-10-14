import type { Metadata, Viewport } from "next";
import "@fontsource/russo-one/400.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DS Hidráulica | Especialistas em Direção Hidráulica para Caminhões e Ônibus",
    template: "%s | DS Hidráulica",
  },
  description:
    "Especialistas em direção hidráulica para caminhões, ônibus e veículos pesados. Manutenção de caixa de direção, bomba hidráulica, mangueiras e diagnóstico. Agende online.",
  applicationName: "DS Hidráulica",
  keywords: [
    "direção hidráulica para caminhões",
    "manutenção de caixa de direção",
    "bomba hidráulica para caminhão",
    "conserto de direção hidráulica",
    "especialista em direção hidráulica",
    "manutenção de direção de ônibus",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DS Hidráulica",
  },
  robots: { index: true, follow: true },
  icons: { icon: "/brand/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
