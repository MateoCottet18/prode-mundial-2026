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
          Capas de fondo (orden de abajo → arriba):
          1. Base midnight con halos de color FIFA (lime arriba, magenta lateral, cyan inferior).
          2. Halftone lime sutil para textura impresa.
          3. Diagonales finas + pitch-grid.
          4. Vignette inferior que ancla el contenido.
          5. Grain noise micro para evitar la sensación 100% vector.
        */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-30 bg-[radial-gradient(ellipse_60%_45%_at_50%_-5%,_rgba(212,255,63,0.18)_0%,_rgba(15,23,42,0)_50%),radial-gradient(ellipse_38%_55%_at_92%_8%,_rgba(255,45,111,0.12)_0%,_rgba(2,6,12,0)_60%),radial-gradient(ellipse_50%_45%_at_8%_85%,_rgba(56,212,255,0.1)_0%,_rgba(2,6,12,0)_60%),linear-gradient(180deg,_#03070f_0%,_#02050b_55%,_#010308_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-20 fc-halftone-lime opacity-50"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 fc-pitch-grid opacity-35"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 fc-diagonal opacity-60"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[18vh] bg-gradient-to-t from-[#02050b] via-[#02050b]/55 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 fc-noise opacity-[0.18] mix-blend-overlay"
        />

        <Navbar />
        <StorageErrorBanner />
        {children}
      </body>
    </html>
  );
}
