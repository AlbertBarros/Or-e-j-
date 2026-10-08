/**
 * Tipos de domínio do Preço Fechado (espelham docs/ARQUITETURA.md).
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
export interface Usuario extends PerfilV2 {
  email?: string; // e-mail do login, usado para casar o pagamento do Pro
  documento?: string; // CPF ou CNPJ do emissor (recibo), opcional
  endereco?: Endereco; // dados do recibo, opcionais
  proximoRecibo?: number; // numeração própria dos recibos; começa em 1
  proximoContrato?: number; // numeração própria dos contratos; começa em 1
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
  /** Fim do teste grátis de 14 dias do Pro (igual a planoAte enquanto o teste está valendo). Só existe uma vez. */
  testeProAte?: Timestamp;
  /** Situação da assinatura no Mercado Pago (gravada pelo servidor). */
  assinatura?: { status: "ativa" | "cancelada" | "pausada"; atualizadoEm?: Timestamp };
  /** Tour guiado: quando foi oferecido e quando foi concluído. */
  tutorial?: { oferecidoEm?: Timestamp; concluidoEm?: Timestamp };
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
  frete?: FreteOrcamento;
  pagamento?: PagamentoOrcamento;
  modelo?: ModeloDocumento;
  total: number; // itens - desconto + frete (valor à vista)
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
  /** Recibo avulso: criado direto como pago, sem orçamento enviado ao cliente. */
  avulso?: boolean;
}

// ---------------------------------------------------------------------------
// V2: catálogo, clientes, contratos e cartão de visita
// ---------------------------------------------------------------------------

/** Campos extras do perfil (V2). Todos opcionais para não quebrar contas antigas. */
export interface PerfilV2 {
  descricao?: string; // frase curta do negócio ("Instalações elétricas residenciais em Brasília")
  instagram?: string; // só o @usuario
  site?: string;
  cadastroCompleto?: boolean; // passou pelo onboarding completo (V2)
  modeloCartao?: 1 | 2 | 3;
  /** Frete padrão: valor fixo + valor por km (V3) */
  frete?: { fixo: number; porKm: number };
  /** Modelo padrão do documento de orçamento (V3): 1 simples, 2 detalhado, 3 completo */
  modeloDocumento?: ModeloDocumento;
}

export type ModeloDocumento = 1 | 2 | 3;
export type MetodoPagamento = "pix" | "dinheiro" | "debito" | "credito" | "transferencia" | "outro";

/** Condições de pagamento do orçamento (V3). */
export interface PagamentoOrcamento {
  metodos: MetodoPagamento[];
  aCombinar: boolean;
  /** Segundo valor, no cartão (o total é o valor à vista) */
  valorCartao?: number;
  observacao?: string; // ex.: "50% na aprovação e 50% na entrega"
}

/** Frete do orçamento (V3): endereço do cliente, km e composição do valor. */
export interface FreteOrcamento {
  endereco: string;
  km: number;
  fixo: number;
  porKm: number;
  valor: number;
}

/** users/{uid}/catalogo/{id} — produto ou serviço do profissional. */
export interface ItemCatalogo {
  id: string;
  tipo: "servico" | "produto";
  nome: string;
  descricao: string;
  unidade: string;
  preco: number;
  ativo: boolean;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

/** clientes/{ownerId}_{whatsapp} — banco de clientes do profissional (identidade; números vêm dos orçamentos). */
export interface Cliente {
  id: string;
  ownerId: string;
  nome: string;
  whatsapp: string; // só dígitos, com 55
  email?: string;
  documento?: string;
  endereco?: Endereco;
  observacoes?: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

export type StatusContrato = "rascunho" | "enviado" | "assinado" | "cancelado";

/** contratos/{id} — contrato simples de prestação de serviço, gerado a partir de um orçamento aprovado. */
export interface Contrato {
  id: string;
  ownerId: string;
  numero: number;
  orcamentoId: string;
  orcamentoNumero: number;
  status: StatusContrato;
  contratante: { nome: string; whatsapp: string; documento?: string; endereco?: string };
  contratado: { nome: string; responsavel: string; whatsapp: string; documento?: string; endereco?: string; cidade: string };
  objeto: ItemOrcamento[];
  valor: number;
  formaPagamento: string;
  prazoExecucao: string;
  garantiaDias: number;
  texto: string; // cláusulas completas, editáveis antes do envio
  mostrarMarca: boolean;
  assinatura?: {
    nome: string;
    imagem: string; // data URL PNG do desenho
    assinadoEm: Timestamp;
    agente: string; // navegador/aparelho
  };
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  enviadoEm?: Timestamp;
}

/** cartoes/{uid} — cartão de visita virtual público (snapshot do perfil + catálogo). */
export interface CartaoVirtual {
  modelo: 1 | 2 | 3;
  nome: string;
  responsavel: string;
  profissao: string;
  descricao: string;
  cidade: string;
  whatsapp: string;
  instagram?: string;
  site?: string;
  servicos: { nome: string; preco?: number; unidade?: string }[];
  temLogo: boolean;
  mostrarMarca: boolean;
  atualizadoEm: Timestamp;
}
