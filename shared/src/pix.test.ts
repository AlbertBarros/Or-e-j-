import { describe, it, expect } from "vitest";
import { crc16, gerarPixCopiaECola, normalizarChave, detectarTipoChave, limparTexto } from "./pix";

describe("pix", () => {
  it("reproduz o exemplo oficial do Manual do BR Code (BCB)", () => {
    const codigo = gerarPixCopiaECola({
      chave: "123e4567-e12b-12d1-a456-426655440000",
      nomeRecebedor: "Fulano de Tal",
      cidade: "BRASILIA",
    });
    expect(codigo).toBe(
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D"
    );
  });

  it("inclui valor com duas casas decimais", () => {
    const codigo = gerarPixCopiaECola({ chave: "fulano@email.com", nomeRecebedor: "Fulano", cidade: "Brasilia", valor: 150 });
    expect(codigo).toContain("5406150.00");
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  it("normaliza chaves", () => {
    expect(normalizarChave("123.456.789-09", "cpf")).toBe("12345678909");
    expect(normalizarChave("(61) 99999-8888", "telefone")).toBe("+5561999998888");
    expect(normalizarChave("Fulano@Email.com")).toBe("fulano@email.com");
  });

  it("detecta tipos de chave", () => {
    expect(detectarTipoChave("123.456.789-09")).toBe("cpf");
    expect(detectarTipoChave("12.345.678/0001-90")).toBe("cnpj");
    expect(detectarTipoChave("a@b.com")).toBe("email");
    expect(detectarTipoChave("+5561999998888")).toBe("telefone");
  });

  it("remove acentos e trunca", () => {
    expect(limparTexto("João Elétrica & Cia Ltda Serviços Gerais", 25)).toBe("Joao Eletrica Cia Ltda Se");
  });
});
