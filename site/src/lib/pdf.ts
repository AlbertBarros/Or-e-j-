/**
 * Geração do PDF no navegador. Importado dinamicamente pelo Gerador,
 * para a biblioteca @react-pdf/renderer só carregar ao clicar em "Baixar PDF".
 */
import { createElement, type ReactElement } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import OrcamentoPDF from "../components/OrcamentoPDF";
import type { DadosOrcamentoPDF } from "../components/Gerador";

export async function gerarPdfOrcamento(dados: DadosOrcamentoPDF): Promise<void> {
  // OrcamentoPDF devolve um <Document>, mas o TypeScript só vê as props do componente; o cast resolve.
  const documento = createElement(OrcamentoPDF, { dados, siteUrl: window.location.origin }) as unknown as ReactElement<DocumentProps>;
  const blob = await pdf(documento).toBlob();
  const url = URL.createObjectURL(blob);
  const nomeCliente = dados.cliente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "");
  const a = document.createElement("a");
  a.href = url;
  a.download = `orcamento-${dados.slug}${nomeCliente ? "-" + nomeCliente : ""}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
