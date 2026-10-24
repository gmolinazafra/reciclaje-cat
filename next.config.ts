import type { NextConfig } from "next";

/**
 * Exportación estática (carpeta `out/`): la app funciona entera en el equipo del usuario.
 * La versión de Windows (carpeta `escritorio/`) empaqueta esa carpeta con Electron.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};
export default nextConfig;
