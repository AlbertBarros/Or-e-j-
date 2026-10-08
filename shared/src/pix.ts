/**
 * Orça Fácil — gerador de Pix "copia-e-cola" (BR Code estático, padrão EMV/BCB).
 *
 * - Sem dependências, roda no navegador e no Node.
 * - Pix ESTÁTICO não confirma pagamento: o profissional marca "pago" manualmente no MVP.
 * - Sempre teste o código gerado no app de 2–3 bancos antes de lançar.
 */

export type TipoChavePix = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

export interface DadosPix {
  chave: string;
  nomeRecebedor: string; // até 25 caracteres (truncado)
  cidade: string; // até 15 caracteres (truncado)
  valor?: number; // em reais; omitido = pagador digita o valor
  txid?: string; // até 25 alfanuméricos; padrão "***"
  descricao?: string; // opcional, curta
}

/** Remove acentos e caracteres fora do conjunto aceito pelos bancos. */
export function limparTexto(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-@]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Detecta o tipo provável da chave a partir do texto digitado. */
export function detectarTipoChave(chave: string): TipoChavePix {
  const c = chave.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return "aleatoria";
  if (c.includes("@")) return "email";
  const digitos = c.replace(/\D/g, "");
  if (c.startsWith("+") || /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(c)) {
    if (digitos.length === 11 && !c.startsWith("+")) {
      // 11 dígitos sem "+" é ambíguo (CPF ou celular). Preferimos CPF se o formato tiver pontos.
      if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(c)) return "cpf";
    }
    return "telefone";
  }
  if (digitos.length === 11) return "cpf";
  if (digitos.length === 14) return "cnpj";
  return "aleatoria";
}

/** Normaliza a chave para o formato exigido no BR Code. */
export function normalizarChave(chave: string, tipo: TipoChavePix = detectarTipoChave(chave)): string {
  const c = chave.trim();
  switch (tipo) {
    case "cpf":
    case "cnpj":
      return c.replace(/\D/g, "");
    case "telefone": {
      const d = c.replace(/\D/g, "");
      return d.startsWith("55") && d.length >= 12 ? `+${d}` : `+55${d}`;
    }
    case "email":
      return c.toLowerCase();
    default:
      return c.toLowerCase();
  }
}

function campo(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, "0");
  if (valor.length > 99) throw new Error(`Campo ${id} excede 99 caracteres`);
  return `${id}${tamanho}${valor}`;
}

/** CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF), exigido pelo BCB. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o código Pix copia-e-cola.
 * Observação: a chave deve chegar JÁ normalizada (use normalizarChave ao salvar o cadastro).
 */
export function gerarPixCopiaECola(dados: DadosPix): string {
  const contaInfo =
    campo("00", "br.gov.bcb.pix") +
    campo("01", dados.chave) +
    (dados.descricao ? campo("02", limparTexto(dados.descricao, 40)) : "");

  const txid = dados.txid ? dados.txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***" : "***";

  let payload =
    campo("00", "01") +
    campo("26", contaInfo) +
    campo("52", "0000") +
    campo("53", "986") +
    (dados.valor && dados.valor > 0 ? campo("54", dados.valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limparTexto(dados.nomeRecebedor, 25) || "RECEBEDOR") +
    campo("60", limparTexto(dados.cidade, 15) || "BRASIL") +
    campo("62", campo("05", txid));

  payload += "6304";
  return payload + crc16(payload);
}
