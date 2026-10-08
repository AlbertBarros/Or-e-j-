/**
 * Frete por distância: geocodifica os endereços (OpenStreetMap/Nominatim) e calcula a rota de carro (OSRM).
 * Serviços públicos e gratuitos, sem chave. Se falharem, a tela deixa digitar os km à mão.
 */
export interface Coordenada {
  lat: number;
  lon: number;
}

const CABECALHOS = { Accept: "application/json" };

export async function geocodificar(endereco: string): Promise<Coordenada | null> {
  const q = encodeURIComponent(`${endereco}, Brasil`);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${q}`, { headers: CABECALHOS });
  if (!r.ok) return null;
  const lista = (await r.json()) as { lat: string; lon: string }[];
  const p = lista[0];
  return p ? { lat: Number(p.lat), lon: Number(p.lon) } : null;
}

/** Distância de carro em km (OSRM). Cai para a distância em linha reta × 1,3 se a rota falhar. */
export async function distanciaKm(origem: Coordenada, destino: Coordenada): Promise<number> {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=false`, { headers: CABECALHOS });
    if (r.ok) {
      const j = (await r.json()) as { routes?: { distance: number }[] };
      const d = j.routes?.[0]?.distance;
      if (d) return Math.round((d / 1000) * 10) / 10;
    }
  } catch {
    /* usa a estimativa abaixo */
  }
  return Math.round(haversineKm(origem, destino) * 1.3 * 10) / 10;
}

function haversineKm(a: Coordenada, b: Coordenada): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Limpa CEP e barras ("Brasília/DF" → "Brasília, DF") e tenta versões cada vez mais simples do endereço. */
export async function geocodificarTolerante(endereco: string): Promise<Coordenada | null> {
  const limpo = endereco
    .replace(/\bCEP\s*[\d.-]+/gi, "")
    .replace(/\b\d{5}-?\d{3}\b/g, "")
    .replace(/\//g, ", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/(, )+/g, ", ")
    .replace(/^, |, $/g, "")
    .trim();
  const partes = limpo.split(", ").filter(Boolean);
  // tenta completo, depois sem o 1º trecho (ex.: sem o número/complemento), depois só os 2 últimos (cidade, UF)
  const tentativas = [partes.join(", "), partes.slice(1).join(", "), partes.slice(-2).join(", ")].filter((t, i, arr) => t && arr.indexOf(t) === i);
  for (const t of tentativas) {
    const c = await geocodificar(t);
    if (c) return c;
  }
  return null;
}

/** Calcula os km entre o endereço do profissional e o do cliente. Lança erro com mensagem amigável. */
export async function calcularKm(enderecoOrigem: string, enderecoDestino: string): Promise<number> {
  const [o, d] = await Promise.all([geocodificarTolerante(enderecoOrigem), geocodificarTolerante(enderecoDestino)]);
  if (!o) throw new Error("Não achei o seu endereço no mapa. Confira em Conta → Dados do recibo (rua, número, bairro, cidade).");
  if (!d) throw new Error("Não achei o endereço do cliente no mapa. Confira rua, número, bairro e cidade, ou digite os km à mão.");
  return distanciaKm(o, d);
}

export function valorFrete(km: number, fixo: number, porKm: number): number {
  return Math.round((Math.max(0, fixo) + Math.max(0, km) * Math.max(0, porKm)) * 100) / 100;
}
