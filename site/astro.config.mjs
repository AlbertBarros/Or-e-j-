// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";

// SITE_URL vem do .env.local (dev) ou das variáveis do Cloudflare Pages (produção).
const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "");
const site = env.SITE_URL || process.env.SITE_URL || "https://orca-ja-6cz.pages.dev";

export default defineConfig({
  site,
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // Código e dados compartilhados com o app (CLAUDE.md → alias @shared)
        "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
      },
    },
  },
});
