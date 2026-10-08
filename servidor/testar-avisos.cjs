#!/usr/bin/env node
/**
 * Roda o teste de ponta a ponta dos avisos (servidor/avisos.teste.mjs) no emulador do Firestore.
 *
 * Por que este arquivo existe: no Windows, o emulador (Java 21) falha com
 * "SocketException: Invalid argument: connect" quando a pasta temporária tem
 * nome curto do tipo C:\Users\JONATH~1\... Aqui apontamos o Java para C:\tmp.
 * Também procura o Java da Microsoft caso ele não esteja no PATH.
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
    if (jdk) {
      env.PATH = `${path.join(base, jdk, "bin")};${env.PATH}`;
    } else {
      console.error("Java não encontrado. Instale com: winget install Microsoft.OpenJDK.21");
      process.exit(1);
    }
  }
}

const resultado = spawnSync(
  "npx",
  // Com shell: true, o comando interno precisa ir entre aspas para chegar inteiro ao firebase.
  ["firebase", "emulators:exec", "--only", "firestore", "--project", "demo-preco-fechado", '"node servidor/avisos.teste.mjs"'],
  { stdio: "inherit", shell: true, env, cwd: path.join(__dirname, "..") },
);
process.exit(resultado.status ?? 1);
