import { describe, it, expect } from "vitest";
import { subtotal, total, linkWhatsapp, normalizarWhatsapp, mensagemCobranca, diasEmAtraso } from "./mensagens";

describe("mensagens e cálculos", () => {
  it("soma sem erro de ponto flutuante", () => {
    expect(subtotal([{ descricao: "a", qtd: 3, valorUnit: 0.1 }])).toBe(0.3);
    expect(total([{ descricao: "a", qtd: 2, valorUnit: 100 }], 50)).toBe(150);
    expect(total([{ descricao: "a", qtd: 1, valorUnit: 10 }], 50)).toBe(0);
  });
  it("monta link do WhatsApp", () => {
    expect(normalizarWhatsapp("(61) 99999-8888")).toBe("5561999998888");
    expect(linkWhatsapp("5561999998888", "oi tudo bem")).toBe("https://wa.me/5561999998888?text=oi%20tudo%20bem");
  });
  it("gera as três mensagens de cobrança", () => {
    const p = { cliente: "Maria Silva", negocio: "X", numero: 12, total: 350, vencimento: new Date(2026, 9, 1), link: "https://l" };
    for (const tom of ["gentil", "firme", "final"] as const) {
      const m = mensagemCobranca(tom, p);
      expect(m).toContain("Maria");
      expect(m).toContain("R$");
      expect(m).toContain("https://l");
    }
  });
  it("calcula dias em atraso", () => {
    expect(diasEmAtraso(new Date(2026, 9, 1), new Date(2026, 9, 6))).toBe(5);
    expect(diasEmAtraso(new Date(2026, 9, 10), new Date(2026, 9, 6))).toBe(0);
  });
});

describe("formatarWhatsapp", () => {
  it("formata celular e fixo", async () => {
    const { formatarWhatsapp } = await import("./mensagens");
    expect(formatarWhatsapp("5561999998888")).toBe("(61) 99999-8888");
    expect(formatarWhatsapp("556133334444")).toBe("(61) 3333-4444");
    expect(formatarWhatsapp("123")).toBe("123");
  });
});
