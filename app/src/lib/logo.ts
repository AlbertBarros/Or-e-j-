/**
 * Logo do profissional sem Storage: a imagem é redimensionada e comprimida no navegador
 * até caber em 100 KB e guardada como data URL em logos/{uid} (ver ARQUITETURA.md).
 */
export const LOGO_MAX_BYTES = 100 * 1024;
export const LOGO_MAX_LADO = 512;

function tamanhoDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não deu para abrir essa imagem. Tente um arquivo PNG ou JPG."));
    };
    img.src = url;
  });
}

function suportaWebp(canvas: HTMLCanvasElement): boolean {
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

export async function comprimirLogo(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem (PNG, JPG ou WebP).");
  }
  const img = await carregarImagem(arquivo);
  const escala = Math.min(1, LOGO_MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
  let largura = Math.max(1, Math.round(img.naturalWidth * escala));
  let altura = Math.max(1, Math.round(img.naturalHeight * escala));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");
  const tipo = suportaWebp(canvas) ? "image/webp" : "image/jpeg";

  let qualidade = 0.9;
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    canvas.width = largura;
    canvas.height = altura;
    if (tipo === "image/jpeg") {
      ctx.fillStyle = "#ffffff"; // JPEG não tem transparência
      ctx.fillRect(0, 0, largura, altura);
    } else {
      ctx.clearRect(0, 0, largura, altura);
    }
    ctx.drawImage(img, 0, 0, largura, altura);
    const dataUrl = canvas.toDataURL(tipo, qualidade);
    if (tamanhoDataUrl(dataUrl) <= LOGO_MAX_BYTES) return dataUrl;
    if (qualidade > 0.5) {
      qualidade -= 0.15;
    } else {
      largura = Math.max(64, Math.round(largura * 0.8));
      altura = Math.max(64, Math.round(altura * 0.8));
    }
  }
  throw new Error("A imagem ficou grande demais mesmo comprimida. Tente uma logo mais simples ou menor.");
}
