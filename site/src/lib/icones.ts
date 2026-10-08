/** Ícones por profissão (miolo de SVG 24×24, traço 1.9). Usados nos cards e nas páginas de modelo. */
export const ICONE_PROFISSAO: Record<string, string> = {
  eletricista: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  encanador: '<path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  pintor: '<rect x="4" y="3" width="14" height="6" rx="1.5"/><path d="M18 5h2v5h-8v3"/><rect x="10.5" y="13" width="3" height="8" rx="1"/>',
  pedreiro: '<path d="M3 20h18"/><path d="M5 16h6v4H5zM13 16h6v4h-6zM8 12h6v4H8zM4 8h6v4H4zM12 8h8v4h-8z"/>',
  diarista: '<path d="M12 3v4M5.5 6.5l2 2M18.5 6.5l-2 2"/><path d="M8 11h8l1 10H7z"/><path d="M9 15h6"/>',
  "tecnico-ar-condicionado": '<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>',
  "montador-de-moveis": '<path d="M14 4l6 6-9 9H5v-6z"/><path d="M12 6l6 6"/><path d="M3 21l3-3"/>',
  jardineiro: '<path d="M12 21V11"/><path d="M12 11C7 11 4 8 4 4c4 0 8 3 8 7z"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z"/>',
  fotografo: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  "marido-de-aluguel": '<path d="M3 21l6-6"/><path d="M14.5 4.5a4 4 0 0 0-4.8 5.2L4 15.5 8.5 20l5.8-5.7a4 4 0 0 0 5.2-4.8l-2.4 2.4-2.4-.6-.6-2.4z"/>',
  outra: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3"/>',
};

export function iconeProfissao(slug: string): string {
  return ICONE_PROFISSAO[slug] ?? ICONE_PROFISSAO.outra!;
}
