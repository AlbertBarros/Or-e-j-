import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Código compartilhado com o site (CLAUDE.md → alias @shared)
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Sem "host" fixo: o Vite atende em localhost (IPv4 e IPv6). O Firebase Auth só autoriza "localhost", não 127.0.0.1.
  server: { port: 5173 },
  build: { target: "es2022" },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
