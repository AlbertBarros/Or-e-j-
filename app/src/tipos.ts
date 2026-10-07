/**
 * Tipos de domínio do Orça Já (espelham docs/ARQUITETURA.md).
 * Datas ficam como Timestamp no Firestore e são convertidas na camada lib/.
 */
import type { Timestamp } from "firebase/firestore";
import type { TipoChavePix } from "@shared/src/pix";

export type { TipoChavePix };

export type Plano = "free" | "pro";
export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "pago";

export interface Endereco {
  logradouro: string; // rua/avenida e número
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

/** users/{uid} — perfil do profissional. "plano" e "planoAte" só o servidor altera. */
export interface Usuario {
  email?: string; // e-mail do login, usado para casar o pagamento do Pro
  documento?: string; // CPF ou CNPJ do emissor (recibo), opcional
  endereco?: Endereco; // dados do recibo, opcionais
  proximoRecibo?: number; // numeração própria dos recibos; começa em 1
  nomeNegocio: string;
  nomeResponsavel: string;
  nomePix: string; // nome do recebedor no BR Code (como está no banco)
  profissao: string; // slug de profissoes.json ou "outra"
  whatsapp: string; // só dígitos, com 55
  cidade: string;
  chavePix: string; // normalizada
  tipoChavePix: TipoChavePix;
  temLogo: boolean; // a imagem fica em logos/{uid}
  plano: Plano;
  planoAte?: Timestamp;
  proximoNumero: number; // começa em 1
  uso: { mes: string; enviados: number }; // mes = "AAAA-MM"
  criadoEm: Timestamp;
}

/** logos/{uid} — logo do profissional, comprimida no navegador (até 100 KB), leitura pública. */
export interface Logo {
  dataUrl: string;
  atualizadoEm: Timestamp;
}

export interface ItemOrcamento {
  descricao: string;
  qtd: number;
  unidade: string;
  valorUnit: number;
}

/** Recibo emitido a partir de um orçamento pago (Pro). Guardado dentro do próprio orçamento. */
export interface Recibo {
  numero: number;
  emitidoEm: Timestamp;
  garantiaDias: number; // 0 = sem garantia
  garantiaInicio: Timestamp;
  observacoes: string;
  emissor: {
    nome: string; // nome do negócio
    responsavel: string;
    documento?: string;
    endereco?: Endereco;
    whatsapp: string;
    email?: string;
    cidade: string;
  };
}

/** orcamentos/{id} */
export interface Orcamento {
  id: string;
  ownerId: string;
  numero: number;
  cliente: { nome: string; whatsapp: string };
  itens: ItemOrcamento[];
  desconto: number;
  total: number;
  validadeDias: number; // usado na edição; validadeAte = criadoEm + validadeDias
  validadeAte: Timestamp;
  vencimentoPagamento?: Timestamp;
  observacoes: string;
  status: StatusOrcamento;
  /** Snapshot gravado ao ENVIAR, para a página pública não ler users/ */
  negocio: {
    nome: string;
    nomePix: string;
    whatsapp: string;
    chavePix: string;
    cidade: string;
    mostrarMarca: boolean; // true no plano free
    mostrarLogo: boolean; // true no Pro com logo (a imagem vem de logos/{ownerId})
    mostrarPix: boolean; // true no Pro
  };
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  enviadoEm?: Timestamp;
  respondidoEm?: Timestamp;
  pagoEm?: Timestamp;
  recibo?: Recibo;
}
