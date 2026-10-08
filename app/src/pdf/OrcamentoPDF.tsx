import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { estilos, CARBONO, GRAFITE } from "./estilos";
import type { ModeloDocumento, Orcamento } from "@/tipos";
import { formatarReais, formatarData, formatarWhatsapp, subtotal } from "@shared/src/mensagens";
import { paraDate } from "@/lib/datas";
import { descreverPagamento } from "@/lib/pagamento";

interface Props {
  orcamento: Orcamento;
  logoPng?: string | null; // data URL PNG/JPEG (react-pdf não lê WebP)
  siteUrl: string;
  modelo?: ModeloDocumento;
}

/** PDF do orçamento nos 3 modelos (simples, detalhado, completo). */
export default function OrcamentoPDF({ orcamento: o, logoPng, siteUrl, modelo }: Props) {
  const m: ModeloDocumento = modelo ?? o.modelo ?? 2;
  const simples = m === 1;
  const completo = m === 3;
  const criado = paraDate(o.criadoEm) ?? new Date();
  const validade = paraDate(o.validadeAte);
  const vencimento = paraDate(o.vencimentoPagamento);
  const numero = String(o.numero).padStart(4, "0");
  const temLogo = Boolean(logoPng && o.negocio.mostrarLogo);
  const pagamento = descreverPagamento(o.pagamento);
  const valorCartao = o.pagamento?.valorCartao;

  return (
    <Document title={`Orçamento nº ${numero} — ${o.negocio.nome}`} author={o.negocio.nome} language="pt-BR">
      <Page size="A4" style={completo ? { ...estilos.pagina, padding: 0 } : estilos.pagina}>
        {completo ? (
          <View style={{ backgroundColor: CARBONO, paddingHorizontal: 40, paddingVertical: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, maxWidth: 340 }}>
              {temLogo ? <Image src={logoPng!} style={{ width: 56, height: 56, objectFit: "contain", backgroundColor: "#FFFFFF", borderRadius: 8, padding: 4 }} /> : null}
              <View>
                <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>{o.negocio.nome}</Text>
                <Text style={{ fontSize: 10, color: "#DCE4F7", marginTop: 3 }}>
                  WhatsApp {formatarWhatsapp(o.negocio.whatsapp)}
                  {o.negocio.cidade ? ` · ${o.negocio.cidade}` : ""}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 9, color: "#DCE4F7", letterSpacing: 1.5 }}>ORÇAMENTO</Text>
              <Text style={{ fontSize: 24, fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}>Nº {numero}</Text>
              <Text style={{ fontSize: 10, color: "#DCE4F7", marginTop: 2 }}>{formatarData(criado)}</Text>
            </View>
          </View>
        ) : (
          <View style={estilos.cabecalho}>
            <View style={estilos.cabecalhoEsq}>
              {temLogo ? <Image src={logoPng!} style={estilos.logo} /> : null}
              <View>
                <Text style={estilos.negocio}>{o.negocio.nome}</Text>
                {!simples && (
                  <Text style={estilos.negocioSub}>
                    WhatsApp {formatarWhatsapp(o.negocio.whatsapp)}
                    {o.negocio.cidade ? ` · ${o.negocio.cidade}` : ""}
                  </Text>
                )}
              </View>
            </View>
            <View style={estilos.numeroBloco}>
              <Text style={estilos.rotuloDoc}>ORÇAMENTO</Text>
              <Text style={estilos.numero}>Nº {numero}</Text>
              <Text style={estilos.data}>{formatarData(criado)}</Text>
            </View>
          </View>
        )}

        <View style={completo ? { paddingHorizontal: 40, paddingTop: 24 } : undefined}>
          {(o.status === "aprovado" || o.status === "pago") && <Text style={estilos.carimbo}>{o.status === "pago" ? "PAGO" : "APROVADO"}</Text>}

          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>{completo ? "Preparado para" : "Cliente"}</Text>
            <Text>{o.cliente.nome}</Text>
            {!simples && <Text style={{ color: GRAFITE, fontSize: 10 }}>{formatarWhatsapp(o.cliente.whatsapp)}</Text>}
          </View>

          <View style={estilos.bloco}>
            <View style={estilos.linhaCab}>
              <Text style={estilos.colDesc}>DESCRIÇÃO</Text>
              {!simples && <Text style={estilos.colQtd}>QTD</Text>}
              {!simples && <Text style={estilos.colUnit}>UNIT.</Text>}
              <Text style={estilos.colTotal}>TOTAL</Text>
            </View>
            {o.itens.map((item, i) => (
              <View key={i} style={estilos.linha} wrap={false}>
                <Text style={estilos.colDesc}>{item.descricao}</Text>
                {!simples && (
                  <Text style={estilos.colQtd}>
                    {item.qtd} {item.unidade}
                  </Text>
                )}
                {!simples && <Text style={estilos.colUnit}>{formatarReais(item.valorUnit)}</Text>}
                <Text style={estilos.colTotal}>{formatarReais(item.qtd * item.valorUnit)}</Text>
              </View>
            ))}
            <View style={estilos.totais}>
              {!simples && (o.desconto > 0 || o.frete) && (
                <View style={estilos.totalLinha}>
                  <Text>Subtotal</Text>
                  <Text>{formatarReais(subtotal(o.itens))}</Text>
                </View>
              )}
              {!simples && o.desconto > 0 && (
                <View style={estilos.totalLinha}>
                  <Text>Desconto</Text>
                  <Text>- {formatarReais(o.desconto)}</Text>
                </View>
              )}
              {o.frete && (
                <View style={estilos.totalLinha}>
                  <Text>Frete{!simples && o.frete.km > 0 ? ` (${o.frete.km.toLocaleString("pt-BR")} km)` : ""}</Text>
                  <Text>{formatarReais(o.frete.valor)}</Text>
                </View>
              )}
              <View style={estilos.totalFinal}>
                <Text>{valorCartao ? "Total à vista" : "Total"}</Text>
                <Text style={completo ? { color: CARBONO } : undefined}>{formatarReais(o.total)}</Text>
              </View>
              {valorCartao && valorCartao > 0 ? (
                <View style={{ ...estilos.totalLinha, marginTop: 2 }}>
                  <Text>No cartão</Text>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: GRAFITE }}>{formatarReais(valorCartao)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {(completo && pagamento) || o.frete?.endereco || validade || (!simples && vencimento) ? (
            <View style={estilos.bloco}>
              <Text style={estilos.rotulo}>Condições</Text>
              {completo && pagamento ? (
                <Text>
                  Pagamento: {pagamento}
                  {o.pagamento?.observacao ? ` · ${o.pagamento.observacao}` : ""}.
                </Text>
              ) : null}
              {!completo && !simples && o.pagamento?.observacao ? <Text>Pagamento: {o.pagamento.observacao}.</Text> : null}
              {completo && o.frete?.endereco ? <Text>Local do serviço: {o.frete.endereco}.</Text> : null}
              {validade && <Text>Este orçamento vale até {formatarData(validade)}.</Text>}
              {!simples && vencimento && <Text>Pagamento até {formatarData(vencimento)}.</Text>}
            </View>
          ) : null}

          {!simples && o.observacoes ? (
            <View style={estilos.bloco}>
              <Text style={estilos.rotulo}>Observações</Text>
              <Text>{o.observacoes}</Text>
            </View>
          ) : null}
        </View>

        <Text style={estilos.rodape} fixed>
          {o.negocio.mostrarMarca ? `Feito com Orça Fácil — crie o seu grátis em ${siteUrl}` : `${o.negocio.nome} · ${formatarWhatsapp(o.negocio.whatsapp)}`}
        </Text>
      </Page>
    </Document>
  );
}
