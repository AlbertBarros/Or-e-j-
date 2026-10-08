/** Cartão de visita virtual (cartoes/{uid}, público) e cards em imagem gerados no navegador. */
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { CartaoVirtual, ItemCatalogo, Usuario } from "@/tipos";
import { nomeProfissao } from "./profissoes";
import { comPlanoEfetivo } from "./usuario";
import { formatarReais, formatarWhatsapp } from "@shared/src/mensagens";

export function linkCartao(uid: string): string {
  const base = (import.meta.env.DEV ? window.location.origin : import.meta.env.VITE_APP_URL) || window.location.origin;
  return `${base.replace(/\/$/, "")}/v/${uid}`;
}

/** Publica (ou atualiza) o cartão público a partir do perfil e do catálogo. */
export async function publicarCartao(uid: string, perfilBruto: Usuario, catalogo: ItemCatalogo[], modelo?: 1 | 2 | 3): Promise<void> {
  const perfil = comPlanoEfetivo(perfilBruto);
  const cartao: Omit<CartaoVirtual, "atualizadoEm"> = {
    modelo: modelo ?? perfil.modeloCartao ?? 1,
    nome: perfil.nomeNegocio,
    responsavel: perfil.nomeResponsavel,
    profissao: nomeProfissao(perfil.profissao),
    descricao: perfil.descricao ?? "",
    cidade: perfil.cidade,
    whatsapp: perfil.whatsapp,
    ...(perfil.instagram ? { instagram: perfil.instagram.replace(/^@/, "") } : {}),
    ...(perfil.site ? { site: perfil.site } : {}),
    servicos: catalogo
      .filter((i) => i.ativo)
      .slice(0, 12)
      .map((i) => ({ nome: i.nome, ...(i.preco > 0 ? { preco: i.preco, unidade: i.unidade } : {}) })),
    temLogo: perfil.temLogo,
    mostrarMarca: perfil.plano !== "pro",
  };
  await setDoc(doc(db, "cartoes", uid), { ...cartao, atualizadoEm: serverTimestamp() });
}

export const MODELOS_CARTAO: { modelo: 1 | 2 | 3; nome: string; descricao: string }[] = [
  { modelo: 1, nome: "Clássico", descricao: "Fundo claro, azul-carbono. Sóbrio e profissional." },
  { modelo: 2, nome: "Noite", descricao: "Fundo escuro com destaque dourado. Elegante." },
  { modelo: 3, nome: "Vibrante", descricao: "Degradê azul e verde. Moderno e chamativo." },
];

export const MODELOS_CARD: { modelo: 1 | 2 | 3; nome: string; descricao: string }[] = [
  { modelo: 1, nome: "Apresentação", descricao: "Logo, nome, profissão e WhatsApp em destaque." },
  { modelo: 2, nome: "Serviços", descricao: "Lista dos seus principais serviços com preços." },
  { modelo: 3, nome: "Chamada", descricao: "Frase forte 'Peça seu orçamento' com contato." },
];

interface DadosCard {
  nome: string;
  responsavel: string;
  profissao: string;
  descricao: string;
  cidade: string;
  whatsapp: string;
  instagram?: string;
  servicos: { nome: string; preco?: number; unidade?: string }[];
  link: string;
  mostrarMarca: boolean;
}

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function arredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FONTE = '"Archivo Variable", Archivo, system-ui, sans-serif';

/** Gera o card (1080×1080) como PNG, no navegador. */
export async function gerarCardPng(modelo: 1 | 2 | 3, d: DadosCard, logoDataUrl: string | null): Promise<Blob> {
  const L = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = L;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.load(`700 60px ${FONTE}`);
  } catch {
    /* segue com a fonte do sistema */
  }

  // Fundo
  if (modelo === 1) {
    ctx.fillStyle = "#F6F7F9";
    ctx.fillRect(0, 0, L, L);
    ctx.fillStyle = "#1E3A8A";
    ctx.fillRect(0, 0, L, 24);
  } else if (modelo === 2) {
    const g = ctx.createLinearGradient(0, 0, L, L);
    g.addColorStop(0, "#0B1437");
    g.addColorStop(1, "#1E3A8A");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, L);
  } else {
    const g = ctx.createLinearGradient(0, 0, L, L);
    g.addColorStop(0, "#1E3A8A");
    g.addColorStop(1, "#15803D");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, L);
  }
  const escuro = modelo !== 1;
  const corTexto = escuro ? "#FFFFFF" : "#1A1D23";
  const corSuave = escuro ? "rgba(255,255,255,0.78)" : "#5B6270";
  const corDestaque = modelo === 2 ? "#F5C451" : escuro ? "#FFFFFF" : "#1E3A8A";

  // Logo
  const logo = logoDataUrl ? await carregarImagem(logoDataUrl) : null;
  let y = 120;
  if (logo) {
    const tam = 200;
    ctx.save();
    arredondado(ctx, L / 2 - tam / 2, y, tam, tam, 32);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.clip();
    const esc = Math.min((tam - 24) / logo.width, (tam - 24) / logo.height);
    ctx.drawImage(logo, L / 2 - (logo.width * esc) / 2, y + tam / 2 - (logo.height * esc) / 2, logo.width * esc, logo.height * esc);
    ctx.restore();
    y += tam + 48;
  } else {
    const tam = 160;
    arredondado(ctx, L / 2 - tam / 2, y, tam, tam, 32);
    ctx.fillStyle = escuro ? "rgba(255,255,255,0.15)" : "#1E3A8A";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 84px ${FONTE}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(d.nome.trim().charAt(0).toUpperCase(), L / 2, y + tam / 2 + 6);
    y += tam + 48;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  if (modelo === 3) {
    // Chamada forte
    ctx.fillStyle = corTexto;
    ctx.font = `800 76px ${FONTE}`;
    for (const linha of quebrar(ctx, "Peça seu orçamento sem compromisso", 880)) {
      ctx.fillText(linha, L / 2, y + 60);
      y += 90;
    }
    y += 20;
    ctx.fillStyle = corSuave;
    ctx.font = `500 40px ${FONTE}`;
    for (const linha of quebrar(ctx, `${d.nome} · ${d.profissao}${d.cidade ? ` · ${d.cidade}` : ""}`, 900)) {
      ctx.fillText(linha, L / 2, y + 40);
      y += 54;
    }
  } else {
    ctx.fillStyle = corTexto;
    ctx.font = `800 72px ${FONTE}`;
    for (const linha of quebrar(ctx, d.nome, 900)) {
      ctx.fillText(linha, L / 2, y + 60);
      y += 84;
    }
    ctx.fillStyle = corDestaque;
    ctx.font = `600 42px ${FONTE}`;
    ctx.fillText(d.profissao + (d.cidade ? ` · ${d.cidade}` : ""), L / 2, y + 40);
    y += 70;
    if (modelo === 1 && d.descricao) {
      ctx.fillStyle = corSuave;
      ctx.font = `400 34px ${FONTE}`;
      for (const linha of quebrar(ctx, d.descricao, 860).slice(0, 2)) {
        ctx.fillText(linha, L / 2, y + 36);
        y += 46;
      }
    }
  }

  if (modelo === 2) {
    // Lista de serviços
    y += 30;
    const lista = d.servicos.slice(0, 6);
    ctx.textAlign = "left";
    const x0 = 140;
    ctx.fillStyle = corDestaque;
    ctx.font = `700 30px ${FONTE}`;
    ctx.fillText("SERVIÇOS", x0, y + 30);
    y += 60;
    for (const s of lista) {
      ctx.fillStyle = corTexto;
      ctx.font = `500 36px ${FONTE}`;
      const nome = quebrar(ctx, s.nome, 560)[0] ?? s.nome;
      ctx.fillText(nome, x0, y + 36);
      if (s.preco) {
        ctx.textAlign = "right";
        ctx.fillStyle = corDestaque;
        ctx.font = `700 36px ${FONTE}`;
        ctx.fillText(`${formatarReais(s.preco)}${s.unidade ? `/${s.unidade}` : ""}`, L - 140, y + 36);
        ctx.textAlign = "left";
      }
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(x0, y + 56, L - 280, 2);
      y += 72;
    }
    ctx.textAlign = "center";
  }

  // Rodapé: WhatsApp em destaque
  const yBtn = L - 230;
  arredondado(ctx, 140, yBtn, L - 280, 110, 28);
  ctx.fillStyle = modelo === 1 ? "#1E3A8A" : "#FFFFFF";
  ctx.fill();
  ctx.fillStyle = modelo === 1 ? "#FFFFFF" : "#1E3A8A";
  ctx.font = `700 44px ${FONTE}`;
  ctx.fillText(`WhatsApp ${formatarWhatsapp(d.whatsapp)}`, L / 2, yBtn + 70);
  ctx.fillStyle = corSuave;
  ctx.font = `500 28px ${FONTE}`;
  const extras = [d.instagram ? `@${d.instagram.replace(/^@/, "")}` : "", d.link.replace(/^https?:\/\//, "")].filter(Boolean).join("   ·   ");
  ctx.fillText(extras, L / 2, L - 80);
  if (d.mostrarMarca) {
    ctx.fillStyle = corSuave;
    ctx.font = `500 22px ${FONTE}`;
    ctx.fillText("Feito com Orça Já", L / 2, L - 36);
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/png"));
}

export async function compartilharArquivo(arquivo: File, texto: string): Promise<"compartilhado" | "baixado"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], text: texto });
      return "compartilhado";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "compartilhado";
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return "baixado";
}
