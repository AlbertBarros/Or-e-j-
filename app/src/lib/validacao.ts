/**
 * Validações do cadastro. Funções puras: devolvem a mensagem de erro (pt-BR) ou null quando está tudo certo.
 * As mensagens seguem o DESIGN.md: dizem o que houve e o que fazer.
 */
import type { TipoChavePix } from "@shared/src/pix";

export function validarNome(valor: string, oQue: string): string | null {
  const v = valor.trim();
  if (v.length < 2) return `Digite ${oQue}.`;
  if (v.length > 60) return `${oQue[0]?.toUpperCase()}${oQue.slice(1)} muito longo. Use até 60 letras.`;
  return null;
}

export function validarWhatsapp(valor: string): string | null {
  const d = valor.replace(/\D/g, "");
  const semPais = d.startsWith("55") && d.length >= 12 ? d.slice(2) : d;
  if (semPais.length < 10 || semPais.length > 11) {
    return "WhatsApp inválido. Digite com DDD, por exemplo (61) 99999-8888.";
  }
  return null;
}

export function validarEmail(valor: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim())) {
    return "E-mail inválido. Confira se digitou certo, com o @ e o ponto.";
  }
  return null;
}

/** Dígitos verificadores do CPF. */
export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Dígitos verificadores do CNPJ. */
export function cnpjValido(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (tamanho: number) => {
    const pesos = tamanho === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (pesos[i] ?? 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

export function validarChavePix(chave: string, tipo: TipoChavePix): string | null {
  const c = chave.trim();
  if (!c) return "Digite a sua chave Pix.";
  switch (tipo) {
    case "cpf":
      if (!cpfValido(c)) return "Chave Pix inválida. Confira se digitou o CPF completo, com 11 números.";
      return null;
    case "cnpj":
      if (!cnpjValido(c)) return "Chave Pix inválida. Confira se digitou o CNPJ completo, com 14 números.";
      return null;
    case "telefone":
      return validarWhatsapp(c) ? "Chave Pix inválida. Digite o celular com DDD, por exemplo (61) 99999-8888." : null;
    case "email":
      return validarEmail(c) ? "Chave Pix inválida. Confira o e-mail, com o @ e o ponto." : null;
    case "aleatoria":
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) {
        return "Chave aleatória inválida. Ela tem 32 letras e números separados por traços; copie do app do banco.";
      }
      return null;
  }
}

export const ROTULO_TIPO_CHAVE: Record<TipoChavePix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  telefone: "Celular",
  email: "E-mail",
  aleatoria: "Aleatória",
};
