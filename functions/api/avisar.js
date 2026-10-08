/**
 * POST /api/avisar  { tipo: "orcamento" | "contrato", id }
 * Chamado pela página pública logo depois que o cliente aprova, recusa ou assina.
 * Não confia no pedido: confere no banco que a resposta existe e é recente, e avisa o dono uma única vez.
 * No projeto do site (sem as variáveis), responde 204 e não faz nada.
 */
import { abrirFirestore } from "../../servidor/firestore.js";
import { avisoImediato, pushConfigurado } from "../../servidor/avisos.js";

export async function onRequestPost({ request, env }) {
  if (!pushConfigurado(env)) return new Response(null, { status: 204 });
  let corpo = {};
  try {
    corpo = await request.json();
  } catch {
    return new Response("json inválido", { status: 400 });
  }
  const { tipo, id } = corpo;
  if (!["orcamento", "contrato"].includes(tipo) || typeof id !== "string" || !/^[A-Za-z0-9_-]{10,40}$/.test(id)) {
    return new Response("pedido inválido", { status: 400 });
  }
  try {
    const fs = await abrirFirestore(env);
    const enviados = await avisoImediato(fs, env, tipo, id);
    return Response.json({ enviados });
  } catch (e) {
    console.error("avisar", String(e));
    return new Response("erro", { status: 500 });
  }
}
