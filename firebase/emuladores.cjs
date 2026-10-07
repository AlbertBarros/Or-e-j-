#!/usr/bin/env node
/**
 * Sobe os emuladores de Auth e Firestore para testar o app localmente (npm run emuladores),
 * com o mesmo ajuste de pasta temporária do Java usado em testar-regras.cjs (Windows).
 * Em outro terminal: npm run dev:app:emulador
 */
const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, readdirSync } = require("node:fs");
const path = require("node:path");

const env = { ...process.env };
if (process.platform === "win32") {
  const tmp = "C:\\tmp";
  if (!existsSync(tmp)) mkdirSync(tmp, { recursive: true });
  env.JAVA_TOOL_OPTIONS = [env.JAVA_TOOL_OPTIONS, `-Djava.io.tmpdir=${tmp}`, `-Djdk.net.unixdomain.tmpdir=${tmp}`]
    .filter(Boolean)
    .join(" ");
  const temJava = spawnSync("java", ["-version"], { stdio: "ignore", shell: true }).status === 0;
  if (!temJava) {
    const base = "C:\\Program Files\\Microsoft";
    const jdk = existsSync(base) ? readdirSync(base).find((d) => d.toLowerCase().startsWith("jdk")) : undefined;
    if (jdk) env.PATH = `${path.join(base, jdk, "bin")};${env.PATH}`;
    else {
      console.error("Java não encontrado. Instale com: winget install Microsoft.OpenJDK.21");
      process.exit(1);
    }
  }
}

const r = spawnSync("npx", ["firebase", "emulators:start", "--only", "auth,firestore"], {
  stdio: "inherit",
  shell: true,
  env,
  cwd: path.join(__dirname, ".."),
});
process.exit(r.status ?? 1);
