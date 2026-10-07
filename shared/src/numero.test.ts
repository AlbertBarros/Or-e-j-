import { describe, it, expect } from "vitest";
import { paraNumero, paraTexto } from "./numero";

describe("números em pt-BR", () => {
  it("lê vírgula como decimal e ponto como milhar", () => {
    expect(paraNumero("1.250,50")).toBe(1250.5);
    expect(paraNumero("90,5")).toBe(90.5);
    expect(paraNumero("150")).toBe(150);
    expect(paraNumero("1.500")).toBe(1500);
    expect(paraNumero("90.5")).toBe(90.5);
    expect(paraNumero("")).toBe(0);
    expect(paraNumero("abc")).toBe(0);
  });
  it("formata para edição", () => {
    expect(paraTexto(90)).toBe("90");
    expect(paraTexto(90.5)).toBe("90,50");
    expect(paraTexto(Number.NaN)).toBe("");
  });
});
