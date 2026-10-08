import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { subtotal, total, formatarReais, formatarData } from "@shared/src/mensagens";
import type { DadosOrcamentoPDF } from "./Gerador";

const CARBONO = "#1E3A8A";
const TINTA = "#1A1D23";
const GRAFITE = "#5B6270";
const PAUTA = "#E4E7EC";

const estilos = StyleSheet.create({
  pagina: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: TINTA },
  cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  negocio: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  negocioSub: { color: GRAFITE, marginTop: 2 },
  numeroBloco: { alignItems: "flex-end" },
  rotuloOrc: { fontSize: 10, color: GRAFITE, letterSpacing: 1 },
  numero: { fontSize: 22, fontFamily: "Helvetica-Bold", color: CARBONO },
  data: { color: GRAFITE, marginTop: 2 },
  bloco: { marginBottom: 14 },
  rotulo: { fontSize: 9, color: GRAFITE, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  linhaCab: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: TINTA,
    paddingBottom: 4,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: GRAFITE,
  },
  linha: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: PAUTA, paddingVertical: 6 },
  colDesc: { flex: 1, paddingRight: 8 },
  colQtd: { width: 60, textAlign: "right" },
  colUnit: { width: 80, textAlign: "right" },
  colTotal: { width: 90, textAlign: "right" },
  totais: { marginTop: 10, alignItems: "flex-end" },
  totalLinha: { flexDirection: "row", justifyContent: "space-between", width: 240, paddingVertical: 2 },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 240,
    borderTopWidth: 2,
    borderTopColor: TINTA,
    marginTop: 4,
    paddingTop: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  observacoes: { lineHeight: 1.4 },
  rodape: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: PAUTA,
    paddingTop: 8,
    fontSize: 9,
    color: GRAFITE,
    textAlign: "center",
  },
});

interface Props {
  dados: DadosOrcamentoPDF;
  siteUrl: string;
}

export default function OrcamentoPDF({ dados, siteUrl }: Props) {
  const hoje = new Date();
  const validade = new Date(hoje);
  validade.setDate(validade.getDate() + dados.validadeDias);
  const valorSubtotal = subtotal(dados.itens);
  const valorTotal = total(dados.itens, dados.desconto);

  return (
    <Document title={`Orçamento — ${dados.cliente}`} author={dados.negocio} language="pt-BR">
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <View>
            <Text style={estilos.negocio}>{dados.negocio}</Text>
            <Text style={estilos.negocioSub}>
              {dados.profissaoNome}
              {dados.whatsappNegocio ? ` · WhatsApp ${dados.whatsappNegocio}` : ""}
            </Text>
          </View>
          <View style={estilos.numeroBloco}>
            <Text style={estilos.rotuloOrc}>ORÇAMENTO</Text>
            <Text style={estilos.numero}>Nº 0001</Text>
            <Text style={estilos.data}>{formatarData(hoje)}</Text>
          </View>
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Cliente</Text>
          <Text>{dados.cliente}</Text>
        </View>

        <View style={estilos.bloco}>
          <View style={estilos.linhaCab}>
            <Text style={estilos.colDesc}>DESCRIÇÃO</Text>
            <Text style={estilos.colQtd}>QTD</Text>
            <Text style={estilos.colUnit}>UNIT.</Text>
            <Text style={estilos.colTotal}>TOTAL</Text>
          </View>
          {dados.itens.map((item, i) => (
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
            {dados.desconto > 0 && (
              <>
                <View style={estilos.totalLinha}>
                  <Text>Subtotal</Text>
                  <Text>{formatarReais(valorSubtotal)}</Text>
                </View>
                <View style={estilos.totalLinha}>
                  <Text>Desconto</Text>
                  <Text>- {formatarReais(dados.desconto)}</Text>
                </View>
              </>
            )}
            <View style={estilos.totalFinal}>
              <Text>Total</Text>
              <Text>{formatarReais(valorTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Validade</Text>
          <Text>
            Este orçamento vale até {formatarData(validade)} ({dados.validadeDias} dias).
          </Text>
        </View>

        {dados.observacoes ? (
          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>Observações</Text>
            <Text style={estilos.observacoes}>{dados.observacoes}</Text>
          </View>
        ) : null}

        <Text style={estilos.rodape} fixed>
          Feito com Orça Fácil — crie o seu grátis em {siteUrl.replace(/^https?:\/\//, "")}
        </Text>
      </Page>
    </Document>
  );
}
