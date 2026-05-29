import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { PROJECT_ROOT } from "./lib/project-root";

/** Load .env.local from prodemundial/, not from a parent folder that has another package-lock.json */
loadEnvConfig(PROJECT_ROOT);

const nextConfig: NextConfig = {
  /**
   * Output standalone para deploy en Google Cloud Run.
   *
   * Genera `.next/standalone/` con un `server.js` autocontenido + sus
   * dependencias mínimas en `node_modules/`. El Dockerfile copia ese
   * directorio + `.next/static` + `public` al runner final, lo que reduce
   * la imagen final de ~800MB a ~180MB.
   *
   * Cloud Run inyecta la variable de entorno PORT (por defecto 8080) que
   * Next.js standalone respeta automáticamente al hacer `node server.js`.
   * Configuramos también HOSTNAME=0.0.0.0 en el Dockerfile para que el
   * server escuche en todas las interfaces (requerido por Cloud Run).
   */
  output: "standalone",
  turbopack: {
    root: PROJECT_ROOT,
  },
};

export default nextConfig;
