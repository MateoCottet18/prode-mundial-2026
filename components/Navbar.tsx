"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/reglas", label: "Reglas" },
];

const adminLinks = [
  { href: "/", label: "Inicio" },
  { href: "/partidos", label: "Partidos" },
  { href: "/resultados", label: "Resultados" },
  { href: "/tabla", label: "Tabla" },
  { href: "/admin", label: "Admin" },
  { href: "/reglas", label: "Reglas" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, logout } = useAuth();
  const links = !isReady ? [] : user ? (user.role === "admin" ? adminLinks : participantLinks) : publicLinks;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Inicio de Prode Mundial 2026">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-lime-500 text-lg font-black text-slate-950 shadow-lg shadow-emerald-500/20">
            PM
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
              Prode Mundial 2026
            </p>
            <p className="text-xs text-slate-400">
              {isReady && user ? `${user.name} · ${user.role}` : "Predicciones del Mundial"}
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-300">
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 transition hover:-translate-y-0.5 ${
                  isActive
                    ? "bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/20"
                    : "border border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isReady && user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-slate-200 transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-white/[0.08] hover:text-white"
            >
              Cerrar sesión
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
