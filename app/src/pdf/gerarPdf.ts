/**
 * Geração e envio dos PDFs. Este módulo é importado dinamicamente (import()) pelas telas,
 * para a biblioteca @react-pdf/renderer só carregar quando a pessoa pedir um PDF.
 */
import { createElement, type ReactElement } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import OrcamentoPDF from "./OrcamentoPDF";
import ReciboPDF from "./ReciboPDF";
import ContratoPDF from "./ContratoPDF";
import type { Contrato, Orcamento, Recibo } from "@/tipos";

const SITE = "orca-ja-6cz.pages.dev";

/** react-pdf só lê PNG e JPEG: converte qualquer data URL (ex.: WebP) para PNG pelo canvas. */
export async function logoParaPng(dataUrl: string | null | undefined): Promise<string | null> {
  if (!dataUrl) return null;
  if (dataUrl.startsWith("data:image/png") || dataUrl.startsWith("data:image/jpeg")) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function nomeArquivo(prefixo: string, numero: number, cliente: string): string {
  const slug = cliente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "");
  return `${prefixo}-${String(numero).padStart(4, "0")}${slug ? "-" + slug : ""}.pdf`;
}

export async function gerarPdfOrcamento(orcamento: Orcamento, logo?: string | null): Promise<File> {
  const logoPng = await logoParaPng(logo);
  const el = createElement(OrcamentoPDF, { orcamento, logoPng, siteUrl: SITE }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(el).toBlob();
  return new File([blob], nomeArquivo("orcamento", orcamento.numero, orcamento.cliente.nome), { type: "application/pdf" });
}

export async function gerarPdfRecibo(orcamento: Orcamento, recibo: Recibo, logo?: string | null): Promise<File> {
  const logoPng = await logoParaPng(logo);
  const el = createElement(ReciboPDF, { orcamento, recibo, logoPng }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(el).toBlob();
  return new File([blob], nomeArquivo("recibo", recibo.numero, orcamento.cliente.nome), { type: "application/pdf" });
}

export async function gerarPdfContrato(contrato: Contrato, logo?: string | null): Promise<File> {
  const logoPng = await logoParaPng(logo);
  const assinaturaPng = contrato.assinatura ? await logoParaPng(contrato.assinatura.imagem) : null;
  const el = createElement(ContratoPDF, { contrato, logoPng, assinaturaPng }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(el).toBlob();
  return new File([blob], nomeArquivo("contrato", contrato.numero, contrato.contratante.nome), { type: "application/pdf" });
}

export function baixarArquivo(arquivo: File): void {
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Envia o PDF pelo WhatsApp. No celular, usa o compartilhamento nativo com o arquivo anexado
 * (a pessoa escolhe a conversa). Sem suporte, baixa o PDF e abre o wa.me com a mensagem pronta
 * para a pessoa anexar. Devolve "compartilhado" ou "baixado".
 */
export async function enviarPdfPeloWhatsapp(arquivo: File, mensagem: string, linkWaMe: string): Promise<"compartilhado" | "baixado"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], text: mensagem });
      return "compartilhado";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "compartilhado"; // pessoa cancelou: nada a fazer
    }
  }
  baixarArquivo(arquivo);
  window.open(linkWaMe, "_blank", "noopener");
  return "baixado";
}
