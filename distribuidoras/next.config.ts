import type { NextConfig } from "next";

// Sitio 100 % estático: se reconstruye después de cada actualización semanal.
// NEXT_BASE_PATH permite publicarlo en un subdirectorio (por ejemplo, GitHub Pages).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NEXT_BASE_PATH || undefined,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
