#!/usr/bin/env node
/**
 * Gera a marca "Preço Fechado": SVGs (favicon, logo, marca com nome, imagem social) e PNGs (ícones do PWA).
 * Uso: node scripts/gerar-marca.cjs   (precisa do pacote sharp, já instalado pelo site)
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require(require.resolve("sharp", { paths: [path.join(__dirname, "..", "site"), path.join(__dirname, "..")] }));

const CARBONO = "#1E3A8A";
const AZUL2 = "#2B4FB8";
const VERDE = "#15803D";

/** Símbolo: selo arredondado em degradê, etiqueta de preço branca e um check verde de "fechado". */
function simbolo(tam = 96, { fundo = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="${tam}" height="${tam}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CARBONO}"/>
      <stop offset="1" stop-color="${AZUL2}"/>
    </linearGradient>
  </defs>
  ${fundo ? `<rect width="96" height="96" rx="22" fill="url(#g)"/>` : ""}
  <path d="M40 18 H70 a7 7 0 0 1 7 7 V55 a7 7 0 0 1 -7 7 H40 L17 40 Z" fill="#FFFFFF"/>
  <circle cx="34" cy="40" r="4.5" fill="#1E3A8A"/>
  <rect x="46" y="31" width="22" height="4" rx="2" fill="#DCE4F7"/>
  <rect x="46" y="40" width="16" height="4" rx="2" fill="#DCE4F7"/>
  <rect x="46" y="49" width="20" height="5" rx="2.5" fill="#1E3A8A"/>
  <circle cx="66" cy="66" r="15" fill="#15803D" stroke="#FFFFFF" stroke-width="4"/>
  <path d="M59 66.5 L64 71.5 L73.5 61" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** Símbolo + nome, para cabeçalhos e materiais. */
function marca() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 96" width="560" height="96">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CARBONO}"/>
      <stop offset="1" stop-color="${AZUL2}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="22" fill="url(#g)"/>
  <path d="M40 18 H70 a7 7 0 0 1 7 7 V55 a7 7 0 0 1 -7 7 H40 L17 40 Z" fill="#FFFFFF"/>
  <circle cx="34" cy="40" r="4.5" fill="#1E3A8A"/>
  <rect x="46" y="31" width="22" height="4" rx="2" fill="#DCE4F7"/>
  <rect x="46" y="40" width="16" height="4" rx="2" fill="#DCE4F7"/>
  <rect x="46" y="49" width="20" height="5" rx="2.5" fill="#1E3A8A"/>
  <circle cx="66" cy="66" r="15" fill="#15803D" stroke="#FFFFFF" stroke-width="4"/>
  <path d="M59 66.5 L64 71.5 L73.5 61" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="114" y="64" font-family="Archivo, 'Segoe UI', Arial, sans-serif" font-weight="800" font-size="50" letter-spacing="-1.5" fill="#1A1D23">Preço <tspan fill="${CARBONO}">Fechado</tspan></text>
</svg>`;
}

function social() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F6F7F9"/>
      <stop offset="1" stop-color="#DCE4F7"/>
    </linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${CARBONO}"/>
      <stop offset="1" stop-color="${AZUL2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="120" r="220" fill="${CARBONO}" opacity="0.08"/>
  <circle cx="980" cy="560" r="160" fill="${VERDE}" opacity="0.10"/>
  <g transform="translate(90 120) scale(1.5)">
    <rect width="96" height="96" rx="22" fill="url(#g)"/>
    <path d="M40 18 H70 a7 7 0 0 1 7 7 V55 a7 7 0 0 1 -7 7 H40 L17 40 Z" fill="#FFFFFF"/>
  <circle cx="34" cy="40" r="4.5" fill="#1E3A8A"/>
  <rect x="46" y="31" width="22" height="4" rx="2" fill="#DCE4F7"/>
  <rect x="46" y="40" width="16" height="4" rx="2" fill="#DCE4F7"/>
  <rect x="46" y="49" width="20" height="5" rx="2.5" fill="#1E3A8A"/>
  <circle cx="66" cy="66" r="15" fill="#15803D" stroke="#FFFFFF" stroke-width="4"/>
  <path d="M59 66.5 L64 71.5 L73.5 61" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="270" y="200" font-family="Archivo, 'Segoe UI', Arial, sans-serif" font-weight="800" font-size="80" letter-spacing="-2" fill="#1A1D23">Preço <tspan fill="${CARBONO}">Fechado</tspan></text>
  <text x="90" y="360" font-family="Archivo, 'Segoe UI', Arial, sans-serif" font-weight="700" font-size="54" letter-spacing="-1" fill="#1A1D23">Orçamento com cara de empresa.</text>
  <text x="90" y="430" font-family="Archivo, 'Segoe UI', Arial, sans-serif" font-weight="700" font-size="54" letter-spacing="-1" fill="${CARBONO}">Aprovado, assinado e pago em um link.</text>
  <text x="90" y="520" font-family="Archivo, 'Segoe UI', Arial, sans-serif" font-size="30" fill="#5B6270">Orçamentos, contratos assinados, Pix, clientes e recibos. Grátis para começar.</text>
</svg>`;
}

async function main() {
  const raiz = path.join(__dirname, "..");
  const sitePub = path.join(raiz, "site", "public");
  const appPub = path.join(raiz, "app", "public");
  fs.writeFileSync(path.join(sitePub, "favicon.svg"), simbolo());
  fs.writeFileSync(path.join(sitePub, "logo.svg"), simbolo(512));
  fs.writeFileSync(path.join(sitePub, "marca.svg"), marca());
  fs.writeFileSync(path.join(sitePub, "social.svg"), social());
  fs.writeFileSync(path.join(appPub, "favicon.svg"), simbolo());

  const svgBuf = Buffer.from(simbolo(512));
  await sharp(svgBuf).resize(192, 192).png().toFile(path.join(appPub, "icones", "icone-192.png"));
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(appPub, "icones", "icone-512.png"));
  await sharp(svgBuf).resize(180, 180).png().toFile(path.join(appPub, "icones", "apple-touch-icon.png"));
  // maskable: símbolo menor sobre fundo cheio (zona segura de 80%)
  const fundo = await sharp({ create: { width: 512, height: 512, channels: 4, background: CARBONO } }).png().toBuffer();
  const miolo = await sharp(Buffer.from(simbolo(512, { fundo: false }))).resize(400, 400).png().toBuffer();
  await sharp(fundo).composite([{ input: miolo, gravity: "centre" }]).png().toFile(path.join(appPub, "icones", "icone-maskable-512.png"));
  // imagem social em PNG (WhatsApp prefere PNG/JPG a SVG)
  await sharp(Buffer.from(social())).png().toFile(path.join(sitePub, "social.png"));
  await sharp(Buffer.from(simbolo(512))).resize(512, 512).png().toFile(path.join(sitePub, "icone-512.png"));
  console.log("marca Preço Fechado gerada: favicon.svg, logo.svg, marca.svg, social.svg/png, ícones PNG");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
