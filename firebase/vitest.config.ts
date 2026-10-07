import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes das regras: rodam só com o emulador (npm run test:regras).
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  test: {
    environment: "node",
    include: ["firebase/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
