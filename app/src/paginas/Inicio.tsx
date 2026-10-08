import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import Avatar from "@/componentes/Avatar";
import BarraAbas from "@/componentes/BarraAbas";
import InstalarApp from "@/componentes/InstalarApp";
import Selo from "@/componentes/Selo";
import { BarrasMensais, Rosca } from "@/componentes/Graficos";
import Sino from "@/componentes/Sino";
import BotaoAjuda from "@/componentes/BotaoAjuda";
import OfertaTour from "@/componentes/OfertaTour";
import AtivarAvisos from "@/componentes/AtivarAvisos";
import AvisoPlano from "@/componentes/AvisoPlano";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { IconeAlerta, IconeCartao, IconeCatalogo, IconeClientes, IconeContratos, IconeMais1, IconeSeta } from "@/componentes/Icones";
import { useAuth } from "@/hooks/useAuth";
import { useCatalogo, useContratos, useTodosOrcamentos } from "@/hooks/useDados";
import { buscarLogo, diasRestantesPro, emTestePro } from "@/lib/usuario";
import { LIMITE_FREE } from "@/lib/firebase";
import { porMes, totais } from "@/lib/estatisticas";
import { diasDesde, paraDate, textoHaDias } from "@/lib/datas";
import { lerRascunhoImportado } from "@/lib/rascunhoImportado";
import { primeiroNome } from "@/lib/texto";
import { formatarReais } from "@shared/src/mensagens";

function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/** Início: resumo, gráficos, pendências e atalhos. */
export default function Inicio() {
  const { usuario, perfil } = useAuth();
  const uid = usuario?.uid;
  const navegar = useNavigate();
  const [logo, setLogo] = useState<string | null>(null);
  const { orcamentos, carregando } = useTodosOrcamentos(uid);
  const { itens: catalogo, carregando: carregandoCatalogo } = useCatalogo(uid);
  const { contratos } = useContratos(uid);
  const { notificacoes, naoVistas, marcarVistas } = useNotificacoes(orcamentos, contratos, perfil);

  useEffect(() => {
    if (perfil && lerRascunhoImportado()) navegar("/orcamentos/novo", { replace: true });
  }, [perfil, navegar]);
  useEffect(() => {
    if (uid && perfil?.temLogo) buscarLogo(uid).then(setLogo).catch(() => setLogo(null));
  }, [uid, perfil?.temLogo]);

  const t = useMemo(() => totais(orcamentos), [orcamentos]);
  const meses = useMemo(() => porMes(orcamentos, 6), [orcamentos]);
  const aprovadosSemContrato = useMemo(() => {
    const comContrato = new Set(contratos.filter((c) => c.status !== "cancelado").map((c) => c.orcamentoId));
    return orcamentos.filter((o) => o.status === "aprovado" && !comContrato.has(o.id));
  }, [orcamentos, contratos]);
  const aguardandoAssinatura = contratos.filter((c) => c.status === "enviado").length;

  if (!perfil) return null;
  const pro = perfil.plano === "pro";
  const teste = emTestePro(perfil);
  const recentes = orcamentos.slice(0, 4);
  const cadastroIncompleto = !carregandoCatalogo && catalogo.length === 0;

  return (
    <main className="pb-abas mx-auto w-full max-w-[560px] px-4">
      <header className="flex items-center gap-3 pt-5">
        <Avatar nome={perfil.nomeNegocio} logo={logo} tamanho={48} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 text-sm text-grafite">
            <span className="truncate">
              {saudacao()}, {primeiroNome(perfil.nomeResponsavel)}
            </span>
            <Link
              to="/conta#plano"
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none ${pro ? "border-carbono/30 bg-carbono-claro text-carbono" : "border-pauta bg-white/70 text-grafite"}`}
              aria-label={teste ? `Teste do Pro: faltam ${diasRestantesPro(perfil)} dias` : pro ? "Plano Pro" : `Plano grátis: ${perfil.uso.enviados} de ${LIMITE_FREE} orçamentos enviados`}
            >
              {pro ? (teste ? `PRO · ${diasRestantesPro(perfil)}d` : "PRO") : `${perfil.uso.enviados}/${LIMITE_FREE} grátis`}
            </Link>
          </p>
          <h1 className="truncate text-xl font-bold leading-tight">{perfil.nomeNegocio}</h1>
        </div>
        <Sino notificacoes={notificacoes} naoVistas={naoVistas} aoAbrir={marcarVistas} />
        <BotaoAjuda />
      </header>

      {uid && <OfertaTour uid={uid} perfil={perfil} />}
      <AvisoPlano perfil={perfil} />

      {/* Destaque: dinheiro */}
      <section className="cartao-destaque surgir mt-5 p-5" aria-label="Resumo financeiro" data-tour="resumo">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">A receber</p>
            <p className="tabular mt-1 text-2xl font-bold">{formatarReais(t.aReceber)}</p>
            {t.atrasados > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
                <IconeAlerta tamanho={13} /> {t.atrasados} {t.atrasados === 1 ? "atrasado" : "atrasados"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">Recebido</p>
            <p className="tabular mt-1 text-2xl font-bold">{formatarReais(t.valorRecebido)}</p>
            <p className="mt-1 text-xs text-white/70">em {t.pagos} {t.pagos === 1 ? "orçamento pago" : "orçamentos pagos"}</p>
          </div>
        </div>
        <Link to="/orcamentos/novo" data-tour="novo-orcamento" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-carbono hover:bg-carbono-claro">
          <IconeMais1 tamanho={20} /> Novo orçamento
        </Link>
      </section>

      {/* Pendências */}
      {(cadastroIncompleto || aprovadosSemContrato.length > 0 || aguardandoAssinatura > 0 || t.atrasados > 0) && (
        <section className="surgir-2 mt-4 space-y-2" aria-label="Pendências">
          {cadastroIncompleto && (
            <Link to="/catalogo" className="cartao lista-item !rounded-2xl">
              <span className="botao-icone !bg-carbono-claro"><IconeCatalogo tamanho={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Cadastre seus produtos e serviços</span>
                <span className="block text-sm text-grafite">Eles entram no orçamento com um toque e no seu cartão de visita.</span>
              </span>
              <IconeSeta tamanho={18} className="text-grafite" />
            </Link>
          )}
          {aprovadosSemContrato.slice(0, 2).map((o) => (
            <Link key={o.id} to={`/contratos/novo?orcamento=${o.id}`} className="cartao lista-item !rounded-2xl">
              <span className="botao-icone !bg-[#E6F4EA] !text-pago"><IconeContratos tamanho={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Gerar contrato para {primeiroNome(o.cliente.nome)}</span>
                <span className="block text-sm text-grafite">Orçamento nº {String(o.numero).padStart(4, "0")} aprovado · {formatarReais(o.total)}</span>
              </span>
              <IconeSeta tamanho={18} className="text-grafite" />
            </Link>
          ))}
          {aguardandoAssinatura > 0 && (
            <Link to="/contratos" className="cartao lista-item !rounded-2xl">
              <span className="botao-icone !bg-[#FDF3E7] !text-atraso"><IconeContratos tamanho={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{aguardandoAssinatura} {aguardandoAssinatura === 1 ? "contrato aguardando" : "contratos aguardando"} assinatura</span>
                <span className="block text-sm text-grafite">Reenvie o link se o cliente ainda não assinou.</span>
              </span>
              <IconeSeta tamanho={18} className="text-grafite" />
            </Link>
          )}
          {t.atrasados > 0 && (
            <Link to="/orcamentos?filtro=atrasado" className="cartao lista-item !rounded-2xl">
              <span className="botao-icone !bg-[#FDF3E7] !text-atraso"><IconeAlerta tamanho={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t.atrasados} {t.atrasados === 1 ? "pagamento atrasado" : "pagamentos atrasados"}</span>
                <span className="block text-sm text-grafite">Mande uma cobrança pronta pelo WhatsApp.</span>
              </span>
              <IconeSeta tamanho={18} className="text-grafite" />
            </Link>
          )}
        </section>
      )}

      {/* Gráficos */}
      <section className="cartao surgir-2 mt-4 p-4" aria-labelledby="g1">
        <div className="flex items-baseline justify-between">
          <h2 id="g1" className="titulo-secao">Últimos 6 meses</h2>
          <span className="tabular text-xs text-grafite">{t.total} no total</span>
        </div>
        {carregando ? (
          <p className="py-10 text-center text-sm text-grafite">Carregando…</p>
        ) : t.total === 0 ? (
          <p className="py-8 text-center text-sm text-grafite">Seus gráficos aparecem aqui depois do primeiro orçamento enviado.</p>
        ) : (
          <div className="mt-3">
            <BarrasMensais meses={meses} />
          </div>
        )}
      </section>

      {t.total > 0 && (
        <section className="cartao surgir-3 mt-4 p-4" aria-labelledby="g2">
          <h2 id="g2" className="titulo-secao">Aprovação</h2>
          <div className="mt-3">
            <Rosca
              centro={`${Math.round(t.taxaAprovacao * 100)}%`}
              legenda="aprovação"
              partes={[
                { rotulo: "Aprovados", valor: t.aprovados, cor: "#15803D" },
                { rotulo: "Recusados", valor: t.recusados, cor: "#9F1239" },
                { rotulo: "Aguardando", valor: t.enviados, cor: "#1E3A8A" },
              ]}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-pauta pt-4 text-sm">
            <div>
              <dt className="text-grafite">Valor aprovado</dt>
              <dd className="tabular font-semibold">{formatarReais(t.valorAprovado)}</dd>
            </div>
            <div>
              <dt className="text-grafite">Ticket médio</dt>
              <dd className="tabular font-semibold">{formatarReais(t.ticketMedio)}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* Atalhos */}
      <section className="mt-4 grid grid-cols-3 gap-2" aria-label="Atalhos">
        <Link to="/clientes" className="cartao flex flex-col items-center gap-1.5 p-3 text-center text-xs font-semibold hover:border-carbono">
          <IconeClientes tamanho={22} className="text-carbono" /> Clientes
        </Link>
        <Link to="/catalogo" className="cartao flex flex-col items-center gap-1.5 p-3 text-center text-xs font-semibold hover:border-carbono">
          <IconeCatalogo tamanho={22} className="text-carbono" /> Produtos e serviços
        </Link>
        <Link to="/cartao" className="cartao flex flex-col items-center gap-1.5 p-3 text-center text-xs font-semibold hover:border-carbono">
          <IconeCartao tamanho={22} className="text-carbono" /> Cartão de visita
        </Link>
      </section>

      <div className="mt-4 space-y-2">
        {uid && <AtivarAvisos uid={uid} compacto />}
        <InstalarApp compacto />
      </div>

      {/* Recentes */}
      {recentes.length > 0 && (
        <section className="mt-4" aria-labelledby="rec">
          <div className="flex items-baseline justify-between">
            <h2 id="rec" className="titulo-secao">Recentes</h2>
            <Link to="/orcamentos" className="-my-2 inline-flex min-h-11 items-center px-2 text-sm font-medium text-carbono">Ver todos</Link>
          </div>
          <ul className="cartao mt-2 divide-y divide-pauta overflow-hidden">
            {recentes.map((o) => {
              const criado = paraDate(o.criadoEm);
              return (
                <li key={o.id}>
                  <Link to={`/orcamentos/${o.id}`} className="lista-item">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-xs font-semibold text-carbono">Nº {String(o.numero).padStart(4, "0")}</span>
                        <Selo orcamento={o} />
                      </div>
                      <p className="truncate font-medium">{o.cliente.nome}</p>
                      <p className="text-xs text-grafite">{criado ? textoHaDias(diasDesde(criado)) : ""}</p>
                    </div>
                    <span className="tabular shrink-0 font-semibold">{formatarReais(o.total)}</span>
                    <IconeSeta tamanho={18} className="shrink-0 text-grafite" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <BarraAbas />
    </main>
  );
}
