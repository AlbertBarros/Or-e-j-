/**
 * POST /api/rotina — chamado de hora em hora pelo GitHub Actions (.github/workflows/rotina.yml).
 * Exige o cabeçalho x-segredo igual à variável ROTINA_SEGREDO do projeto no Cloudflare.
 * Reenvia avisos perdidos, manda o resumo do dia e volta para "free" quem tem o Pro vencido.
 */
import { abrirFirestore } from "../../servidor/firestore.js";
import { pushConfigurado, rotina } from "../../servidor/avisos.js";

export async function onRequestPost({ request, env }) {
  if (!env.ROTINA_SEGREDO || request.headers.get("x-segredo") !== env.ROTINA_SEGREDO) {
    return new Response("não autorizado", { status: 401 });
  }
  if (!pushConfigurado(env)) return new Response("avisos não configurados", { status: 503 });
  try {
    const fs = await abrirFirestore(env);
    const relatorio = await rotina(fs, env);
    console.log("rotina", JSON.stringify(relatorio));
    return Response.json(relatorio);
  } catch (e) {
    console.error("rotina", String(e));
    return new Response(String(e), { status: 500 });
  }
}
