import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#030712] text-white">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.22),transparent_32%),radial-gradient(circle_at_75%_5%,rgba(59,130,246,0.18),transparent_28%),linear-gradient(135deg,#030712_0%,#07111f_45%,#020617_100%)]" />
        <div className="fixed left-1/2 top-24 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        <Navbar />
        <StorageErrorBanner />
        {children}
      </body>
    </html>
  );
}
