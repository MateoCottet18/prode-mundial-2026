"use client";

import { useEffect, useState } from "react";

export function StorageErrorBanner() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleStorageError = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : "";
      setMessage(
        typeof detail === "string"
          ? detail
          : "No se pudo guardar localmente. Probá limpiar datos locales desde el panel admin.",
      );
    };

    window.addEventListener("prode-storage-error", handleStorageError);

    return () => {
      window.removeEventListener("prode-storage-error", handleStorageError);
    };
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="mx-auto mt-4 w-full max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full bg-red-300 fc-pulse-dot" />
            <p className="font-bold">{message}</p>
          </div>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="fc-display rounded-lg border border-red-200/30 px-3.5 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-red-50 transition hover:bg-red-200/10"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
