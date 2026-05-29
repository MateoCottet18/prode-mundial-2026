"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const publicLinks = [
  { href: "/", label: "Inicio" },
  { href: "/reglas", label: "Reglas" },
  { href: "/login", label: "Iniciar sesión" },
  { href: "/registro", label: "Registrarme" },
];

const participantLinks = [
  { href: "/", label: "Inicio" },
  { href: "/partidos", label: "Partidos" },
  { href: "/resultados", label: "Resultados" },
  { href: "/tabla", label: "Tabla" },
  { href: "/perfil", label: "Mi perfil" },
  { href: "/reglas", label: "Reglas" },
];

const adminLinks = [
  { href: "/", label: "Inicio" },
  { href: "/partidos", label: "Partidos" },
  { href: "/resultados", label: "Resultados" },
  { href: "/tabla", label: "Tabla" },
  { href: "/perfil", label: "Mi perfil" },
  { href: "/admin", label: "Admin" },
  { href: "/reglas", label: "Reglas" },
];

const TICKER_ITEMS = [
  "FIFA WORLD CUP 26",
  "USA · CANADA · MEXICO",
  "PRODE PRIVADO",
  "48 SELECCIONES",
  "104 PARTIDOS",
  "$250.000 + PREMIOS EN JUEGO",
  "PREDECÍ · COMPETÍ · GANÁ",
];

/**
 * Navbar broadcast FIFA. Tres capas:
 *   1. FIFA flag-stripe arriba (multicolor 5 tonos torneo).
 *   2. Ticker LED con keywords del evento (deslizante).
 *   3. Barra principal: logo bloque diagonal + nav tabs angulares.
 */
export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();
  const links = !isReady ? [] : user ? (user.role === "admin" ? adminLinks : participantLinks) : publicLinks;

  if (typeof window !== "undefined") {
    console.log("[navbar] render", { isReady, user: user?.username, role: user?.role });
  }

  useEffect(() => {
    console.log("[navbar] user changed", user?.username ?? "(anon)", user?.role ?? "");
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#02040a]/95 backdrop-blur">
      {/* FIFA flag-stripe finita arriba: mantenemos la identidad multicolor
          como acento de torneo, pero a 3px en vez de 6px para que no compita
          con la información. */}
      <div aria-hidden className="fc-flag-stripe h-[3px] w-full opacity-90" />

      {/* Ticker LED — frases del evento, sin glow ni halos. Mantiene
          el código del torneo sin protagonismo visual. */}
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-black/40">
        <div className="fc-ticker-track">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {TICKER_ITEMS.map((item, idx) => (
                <span
                  key={`${dup}-${idx}`}
                  className="fc-display-italic flex shrink-0 items-center gap-3 whitespace-nowrap px-5 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-400"
                >
                  <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--fc-lime)]/70" />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#02040a] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#02040a] to-transparent"
        />
      </div>

      {/* Barra principal */}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        {/* Logo: bloque lima sólido, sin gradiente ni glow. */}
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Inicio de Prode Mundial 2026"
        >
          <span className="fc-broadcast-cut relative grid h-11 w-12 place-items-center bg-[var(--fc-lime)] text-slate-950">
            <span className="fc-display-italic text-lg leading-none tracking-[-0.01em]">
              PM
            </span>
          </span>
          <div className="leading-tight">
            <p className="fc-display-italic text-[0.74rem] uppercase tracking-[0.18em] text-[var(--fc-lime)]">
              Prode · Mundial 2026
            </p>
            <p className="fc-display text-[0.68rem] uppercase tracking-[0.16em] text-slate-500">
              {isReady && user
                ? `${user.name} · ${user.role}`
                : "Predicciones · Ranking · Llave"}
            </p>
          </div>
        </Link>

        {/* Tabs sobrias: activa lima sólido, inactiva borde finito. Sin
            shadows ni hover translate exagerado. */}
        <nav className="flex flex-wrap items-center gap-1.5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative inline-flex items-center gap-2 px-3.5 py-1.5 transition-colors ${
                  isActive
                    ? "fc-broadcast-cut-sm bg-[var(--fc-lime)] text-slate-950"
                    : "fc-broadcast-cut-sm border border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-[var(--fc-lime)]/35 hover:bg-[var(--fc-lime)]/[0.06] hover:text-white"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-slate-950" : "bg-white/20 group-hover:bg-[var(--fc-lime)]"
                  }`}
                />
                <span className="fc-display-italic text-[0.74rem] uppercase tracking-[0.14em]">
                  {link.label}
                </span>
              </Link>
            );
          })}
          {isReady && user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="fc-broadcast-cut-sm ml-1 inline-flex items-center gap-1.5 border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 text-slate-300 transition-colors hover:border-[var(--fc-magenta)]/40 hover:bg-[var(--fc-magenta)]/[0.08] hover:text-[var(--fc-magenta)]"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-magenta)]/70" />
              <span className="fc-display-italic text-[0.74rem] uppercase tracking-[0.14em]">
                Salir
              </span>
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
