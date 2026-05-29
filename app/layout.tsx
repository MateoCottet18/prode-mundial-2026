import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { StorageErrorBanner } from "@/components/StorageErrorBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Oswald: condensed display sans inspirada en posters deportivos y lower-thirds
 * televisivos. Se usa para titulares, overlines, scores y badges. Italic
 * agresivo para hero/scoreboards (.fc-headline-mega y .fc-stencil).
 */
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prode Mundial 2026 | Predicciones",
  description: "Cargá predicciones del Mundial, sumá puntos y competí en la tabla de posiciones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="relative min-h-full bg-[#02040a] text-white">
        {/*
          Fondo sobrio. Antes había 5 capas (radial-halos + halftone-lime +
          pitch-grid + diagonal + vignette + noise) que daban sensación de
          template generado por IA. Lo bajamos a 1 capa: dark con un degradado
          vertical apenas perceptible que ancla la composición. Apps como
          Flashscore / Sofascore / OneFootball usan exactamente esto: un dark
          consistente, sin halos de torneo, sin texturas de impresión.
        */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,#03060d_0%,#02040a_60%,#010206_100%)]"
        />

        <Navbar />
        <StorageErrorBanner />
        {children}
      </body>
    </html>
  );
}
