import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Force la racine du workspace au dossier courant
    // Evite que Turbopack scanne C:\Users\valmo\ à cause d'un package-lock.json parasite
    root: process.cwd(),
  },
};

export default nextConfig;
