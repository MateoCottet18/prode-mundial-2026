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
      <div className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{message}</p>
          <button
            type="button"
            onClick={() => setMessage("")}
            className="rounded-full border border-red-200/30 px-4 py-2 text-red-50 transition hover:bg-red-200/10"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
