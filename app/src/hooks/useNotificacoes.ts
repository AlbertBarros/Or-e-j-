/**
 * Notificações no app: aprovações/recusas de orçamentos e assinaturas de contratos.
 * Derivadas dos próprios dados (sem servidor). "Vistas" fica no aparelho (localStorage).
 * Quando o app está aberto e a permissão foi dada, também mostra uma notificação do sistema.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Contrato, Orcamento, Usuario } from "@/tipos";
import { paraDate } from "@/lib/datas";
import { estaAtrasado } from "@/lib/orcamentos";
import { diasRestantesPro, emTestePro } from "@/lib/usuario";
import { diasEmAtraso } from "@shared/src/mensagens";
import { formatarReais } from "@shared/src/mensagens";

export interface Notificacao {
  id: string;
  tipo: "aprovado" | "recusado" | "assinado" | "atrasado" | "plano";
  titulo: string;
  texto: string;
  quando: Date;
  link: string;
}

const CHAVE = "orcaja:notificacoesVistasEm";

function lerVistasEm(): number {
  try {
    return Number(localStorage.getItem(CHAVE) ?? 0);
  } catch {
    return 0;
  }
}

export function useNotificacoes(orcamentos: Orcamento[], contratos: Contrato[], perfil?: Usuario | null) {
  const [vistasEm, setVistasEm] = useState<number>(lerVistasEm);
  const primeiraCarga = useRef(true);
  const conhecidas = useRef<Set<string>>(new Set());

  const lista = useMemo(() => {
    const n: Notificacao[] = [];
    for (const o of orcamentos) {
      const q = paraDate(o.respondidoEm);
      if (!q) continue;
      if (o.status === "aprovado" || o.status === "pago") {
        n.push({ id: `o-${o.id}-aprovado`, tipo: "aprovado", titulo: `${o.cliente.nome} aprovou o orçamento nº ${String(o.numero).padStart(4, "0")}`, texto: `${formatarReais(o.total)} · toque para ver`, quando: q, link: `/orcamentos/${o.id}` });
      } else if (o.status === "recusado") {
        n.push({ id: `o-${o.id}-recusado`, tipo: "recusado", titulo: `${o.cliente.nome} recusou o orçamento nº ${String(o.numero).padStart(4, "0")}`, texto: "Edite e reenvie, ou fale com o cliente", quando: q, link: `/orcamentos/${o.id}` });
      }
    }
    for (const c of contratos) {
      const q = paraDate(c.assinatura?.assinadoEm);
      if (c.status === "assinado" && q) {
        n.push({ id: `c-${c.id}`, tipo: "assinado", titulo: `${c.assinatura?.nome ?? c.contratante.nome} assinou o contrato nº ${String(c.numero).padStart(4, "0")}`, texto: `${formatarReais(c.valor)} · PDF assinado disponível`, quando: q, link: `/contratos/${c.id}` });
      }
    }
    // Pagamentos atrasados (um aviso por orçamento)
    for (const o of orcamentos) {
      if (!estaAtrasado(o)) continue;
      const venc = paraDate(o.vencimentoPagamento);
      if (!venc) continue;
      const dias = diasEmAtraso(venc);
      const quando = new Date(venc.getTime() + 86_400_000);
      n.push({ id: `a-${o.id}`, tipo: "atrasado", titulo: `Pagamento de ${o.cliente.nome} atrasado`, texto: `${formatarReais(o.total)} · venceu há ${dias} ${dias === 1 ? "dia" : "dias"}. Toque para cobrar`, quando: quando > new Date() ? new Date() : quando, link: `/orcamentos/${o.id}/cobrar` });
    }
    // Teste do Pro acabando (últimos 3 dias)
    if (perfil && emTestePro(perfil)) {
      const dias = diasRestantesPro(perfil);
      const ate = paraDate(perfil.planoAte);
      if (dias <= 3 && ate) {
        const quando = new Date(Math.min(Date.now(), ate.getTime() - 3 * 86_400_000));
        n.push({ id: `t-${ate.getTime()}`, tipo: "plano", titulo: dias === 1 ? "Último dia do seu teste do Pro" : `Seu teste do Pro acaba em ${dias} dias`, texto: "Assine para manter o Pix, o recibo e sua logo", quando, link: "/conta#plano" });
      }
    }
    return n.sort((a, b) => b.quando.getTime() - a.quando.getTime()).slice(0, 30);
  }, [orcamentos, contratos, perfil]);

  const naoVistas = lista.filter((n) => n.quando.getTime() > vistasEm).length;

  // Notificação do sistema para o que chegou enquanto o app está aberto (não na primeira carga).
  useEffect(() => {
    if (primeiraCarga.current) {
      if (lista.length || orcamentos.length) {
        lista.forEach((n) => conhecidas.current.add(n.id));
        primeiraCarga.current = false;
      }
      return;
    }
    for (const n of lista) {
      if (conhecidas.current.has(n.id)) continue;
      conhecidas.current.add(n.id);
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
        try {
          new Notification(n.titulo, { body: n.texto, icon: "/icones/icone-192.png", tag: n.id });
        } catch {
          /* sem suporte */
        }
      }
    }
  }, [lista, orcamentos.length]);

  function marcarVistas() {
    const agora = Date.now();
    setVistasEm(agora);
    try {
      localStorage.setItem(CHAVE, String(agora));
    } catch {
      /* ignora */
    }
  }

  return { notificacoes: lista, naoVistas, marcarVistas };
}

export function suportaNotificacaoSistema(): boolean {
  return typeof Notification !== "undefined";
}

export async function pedirPermissaoNotificacao(): Promise<NotificationPermission> {
  if (!suportaNotificacaoSistema()) return "denied";
  return Notification.requestPermission();
}
