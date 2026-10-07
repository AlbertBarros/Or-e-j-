import { describe, it, expect } from "vitest";
import { cpfValido, cnpjValido, validarChavePix, validarWhatsapp, validarNome, validarEmail } from "./validacao";

describe("validação do cadastro", () => {
  it("valida CPF pelos dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("529.982.247-26")).toBe(false);
    expect(cpfValido("1234567890")).toBe(false);
  });

  it("valida CNPJ pelos dígitos verificadores", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00.000.000/0000-00")).toBe(false);
  });

  it("valida chave Pix conforme o tipo", () => {
    expect(validarChavePix("529.982.247-25", "cpf")).toBeNull();
    expect(validarChavePix("123", "cpf")).toMatch(/11 números/);
    expect(validarChavePix("(61) 99999-8888", "telefone")).toBeNull();
    expect(validarChavePix("fulano@email.com", "email")).toBeNull();
    expect(validarChavePix("fulano@email", "email")).toMatch(/E-mail|e-mail/);
    expect(validarChavePix("123e4567-e12b-12d1-a456-426655440000", "aleatoria")).toBeNull();
    expect(validarChavePix("abc", "aleatoria")).toMatch(/aleatória/i);
  });

  it("valida WhatsApp com ou sem 55", () => {
    expect(validarWhatsapp("(61) 99999-8888")).toBeNull();
    expect(validarWhatsapp("+55 61 99999-8888")).toBeNull();
    expect(validarWhatsapp("6199998888")).toBeNull();
    expect(validarWhatsapp("99999")).not.toBeNull();
  });

  it("valida nome e e-mail", () => {
    expect(validarNome("JS Elétrica", "o nome do negócio")).toBeNull();
    expect(validarNome("J", "o nome do negócio")).toBe("Digite o nome do negócio.");
    expect(validarEmail("a@b.co")).toBeNull();
    expect(validarEmail("a@b")).not.toBeNull();
  });
});
