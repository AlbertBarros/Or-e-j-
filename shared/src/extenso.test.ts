import { describe, it, expect } from "vitest";
import { numeroPorExtenso, valorPorExtenso } from "./extenso";

describe("número por extenso", () => {
  it("unidades, dezenas e centenas", () => {
    expect(numeroPorExtenso(0)).toBe("zero");
    expect(numeroPorExtenso(1)).toBe("um");
    expect(numeroPorExtenso(15)).toBe("quinze");
    expect(numeroPorExtenso(21)).toBe("vinte e um");
    expect(numeroPorExtenso(100)).toBe("cem");
    expect(numeroPorExtenso(101)).toBe("cento e um");
    expect(numeroPorExtenso(250)).toBe("duzentos e cinquenta");
    expect(numeroPorExtenso(999)).toBe("novecentos e noventa e nove");
  });
  it("milhares e milhões", () => {
    expect(numeroPorExtenso(1000)).toBe("mil");
    expect(numeroPorExtenso(1001)).toBe("mil e um");
    expect(numeroPorExtenso(1100)).toBe("mil e cem");
    expect(numeroPorExtenso(1250)).toBe("mil duzentos e cinquenta");
    expect(numeroPorExtenso(2000)).toBe("dois mil");
    expect(numeroPorExtenso(12345)).toBe("doze mil trezentos e quarenta e cinco");
    expect(numeroPorExtenso(999999)).toBe("novecentos e noventa e nove mil novecentos e noventa e nove");
    expect(numeroPorExtenso(1_000_000)).toBe("um milhão");
    expect(numeroPorExtenso(2_500_000)).toBe("dois milhões e quinhentos mil");
  });
});

describe("valor por extenso", () => {
  it("reais e centavos", () => {
    expect(valorPorExtenso(0.01)).toBe("um centavo");
    expect(valorPorExtenso(0.5)).toBe("cinquenta centavos");
    expect(valorPorExtenso(1)).toBe("um real");
    expect(valorPorExtenso(2)).toBe("dois reais");
    expect(valorPorExtenso(90)).toBe("noventa reais");
    expect(valorPorExtenso(240)).toBe("duzentos e quarenta reais");
    expect(valorPorExtenso(1250.5)).toBe("mil duzentos e cinquenta reais e cinquenta centavos");
    expect(valorPorExtenso(999999.99)).toBe(
      "novecentos e noventa e nove mil novecentos e noventa e nove reais e noventa e nove centavos",
    );
    expect(valorPorExtenso(1_000_000)).toBe("um milhão de reais");
    expect(valorPorExtenso(0)).toBe("zero reais");
  });
  it("arredonda centavos corretamente", () => {
    expect(valorPorExtenso(10.005)).toBe("dez reais e um centavo");
    expect(valorPorExtenso(0.1 + 0.2)).toBe("trinta centavos");
  });
});
