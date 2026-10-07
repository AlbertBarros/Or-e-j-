import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { estilos } from "./estilos";
import type { Orcamento } from "@/tipos";
import { formatarReais, formatarData, formatarWhatsapp, subtotal } from "@shared/src/mensagens";
import { paraDate } from "@/lib/datas";

interface Props {
  orcamento: Orcamento;
  logoPng?: string | null; // data URL PNG/JPEG (react-pdf não lê WebP)
  siteUrl: string;
}

export default function OrcamentoPDF({ orcamento: o, logoPng, siteUrl }: Props) {
  const criado = paraDate(o.criadoEm) ?? new Date();
  const validade = paraDate(o.validadeAte);
  const vencimento = paraDate(o.vencimentoPagamento);
  const numero = String(o.numero).padStart(4, "0");

  return (
    <Document title={`Orçamento nº ${numero} — ${o.negocio.nome}`} author={o.negocio.nome} language="pt-BR">
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <View style={estilos.cabecalhoEsq}>
            {logoPng && o.negocio.mostrarLogo ? <Image src={logoPng} style={estilos.logo} /> : null}
            <View>
              <Text style={estilos.negocio}>{o.negocio.nome}</Text>
              <Text style={estilos.negocioSub}>
                WhatsApp {formatarWhatsapp(o.negocio.whatsapp)}
                {o.negocio.cidade ? ` · ${o.negocio.cidade}` : ""}
              </Text>
            </View>
          </View>
          <View style={estilos.numeroBloco}>
            <Text style={estilos.rotuloDoc}>ORÇAMENTO</Text>
            <Text style={estilos.numero}>Nº {numero}</Text>
            <Text style={estilos.data}>{formatarData(criado)}</Text>
          </View>
        </View>

        {(o.status === "aprovado" || o.status === "pago") && (
          <Text style={estilos.carimbo}>{o.status === "pago" ? "PAGO" : "APROVADO"}</Text>
        )}

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Cliente</Text>
          <Text>{o.cliente.nome}</Text>
          <Text style={{ color: "#5B6270", fontSize: 10 }}>{formatarWhatsapp(o.cliente.whatsapp)}</Text>
        </View>

        <View style={estilos.bloco}>
          <View style={estilos.linhaCab}>
            <Text style={estilos.colDesc}>DESCRIÇÃO</Text>
            <Text style={estilos.colQtd}>QTD</Text>
            <Text style={estilos.colUnit}>UNIT.</Text>
            <Text style={estilos.colTotal}>TOTAL</Text>
          </View>
          {o.itens.map((item, i) => (
            <View key={i} style={estilos.linha} wrap={false}>
              <Text style={estilos.colDesc}>{item.descricao}</Text>
              <Text style={estilos.colQtd}>
                {item.qtd} {item.unidade}
              </Text>
              <Text style={estilos.colUnit}>{formatarReais(item.valorUnit)}</Text>
              <Text style={estilos.colTotal}>{formatarReais(item.qtd * item.valorUnit)}</Text>
            </View>
          ))}
          <View style={estilos.totais}>
            {o.desconto > 0 && (
              <>
                <View style={estilos.totalLinha}>
                  <Text>Subtotal</Text>
                  <Text>{formatarReais(subtotal(o.itens))}</Text>
                </View>
                <View style={estilos.totalLinha}>
                  <Text>Desconto</Text>
                  <Text>- {formatarReais(o.desconto)}</Text>
                </View>
              </>
            )}
            <View style={estilos.totalFinal}>
              <Text>Total</Text>
              <Text>{formatarReais(o.total)}</Text>
            </View>
          </View>
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Condições</Text>
          {validade && <Text>Este orçamento vale até {formatarData(validade)}.</Text>}
          {vencimento && <Text>Pagamento até {formatarData(vencimento)}.</Text>}
        </View>

        {o.observacoes ? (
          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>Observações</Text>
            <Text>{o.observacoes}</Text>
          </View>
        ) : null}

        <Text style={estilos.rodape} fixed>
          {o.negocio.mostrarMarca ? `Feito com Orça Já — crie o seu grátis em ${siteUrl}` : `${o.negocio.nome} · ${formatarWhatsapp(o.negocio.whatsapp)}`}
        </Text>
      </Page>
    </Document>
  );
}
