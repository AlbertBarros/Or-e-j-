import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { estilos, GRAFITE } from "./estilos";
import type { Orcamento, Recibo } from "@/tipos";
import { formatarReais, formatarData, formatarWhatsapp, textoGarantia } from "@shared/src/mensagens";
import { valorPorExtenso } from "@shared/src/extenso";
import { paraDate } from "@/lib/datas";

interface Props {
  orcamento: Orcamento;
  recibo: Recibo;
  logoPng?: string | null;
}

function enderecoEmLinha(e?: Recibo["emissor"]["endereco"]): string | null {
  if (!e) return null;
  const partes = [e.logradouro, e.bairro, [e.cidade, e.uf].filter(Boolean).join("/"), e.cep ? `CEP ${e.cep}` : ""].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

/** Recibo elegante: documento do mesmo "talão", com valor por extenso, garantia e assinatura em texto. */
export default function ReciboPDF({ orcamento: o, recibo: r, logoPng }: Props) {
  const emitido = paraDate(r.emitidoEm) ?? new Date();
  const pago = paraDate(o.pagoEm) ?? emitido;
  const garantiaInicio = paraDate(r.garantiaInicio) ?? pago;
  const numero = String(r.numero).padStart(4, "0");
  const e = r.emissor;
  const endereco = enderecoEmLinha(e.endereco);
  const descricao = o.itens.map((i) => i.descricao).join(", ");

  return (
    <Document title={`Recibo nº ${numero} — ${e.nome}`} author={e.nome} language="pt-BR">
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <View style={estilos.cabecalhoEsq}>
            {logoPng ? <Image src={logoPng} style={estilos.logo} /> : null}
            <View>
              <Text style={estilos.negocio}>{e.nome}</Text>
              <Text style={estilos.negocioSub}>
                {e.responsavel}
                {e.documento ? ` · ${e.documento}` : ""}
              </Text>
              <Text style={estilos.negocioSub}>
                WhatsApp {formatarWhatsapp(e.whatsapp)}
                {e.email ? ` · ${e.email}` : ""}
              </Text>
              {endereco ? <Text style={estilos.negocioSub}>{endereco}</Text> : null}
            </View>
          </View>
          <View style={estilos.numeroBloco}>
            <Text style={estilos.rotuloDoc}>RECIBO</Text>
            <Text style={estilos.numero}>Nº {numero}</Text>
            <Text style={estilos.valorGrande}>{formatarReais(o.total)}</Text>
          </View>
        </View>

        <View style={estilos.caixa}>
          <Text style={estilos.destaque}>
            Recebi de <Text style={{ fontFamily: "Helvetica-Bold" }}>{o.cliente.nome}</Text> a importância de{" "}
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatarReais(o.total)}</Text> ({valorPorExtenso(o.total)}), referente a{" "}
            {descricao}, conforme o orçamento nº {String(o.numero).padStart(4, "0")}.
          </Text>
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Serviços</Text>
          {o.itens.map((item, i) => (
            <View key={i} style={estilos.linha} wrap={false}>
              <Text style={estilos.colDesc}>{item.descricao}</Text>
              <Text style={estilos.colQtd}>
                {item.qtd} {item.unidade}
              </Text>
              <Text style={estilos.colTotal}>{formatarReais(item.qtd * item.valorUnit)}</Text>
            </View>
          ))}
          <View style={estilos.totais}>
            {o.desconto > 0 && (
              <View style={estilos.totalLinha}>
                <Text>Desconto</Text>
                <Text>- {formatarReais(o.desconto)}</Text>
              </View>
            )}
            <View style={estilos.totalFinal}>
              <Text>Valor recebido</Text>
              <Text>{formatarReais(o.total)}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 24, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.rotulo}>Pagamento</Text>
            <Text>Recebido em {formatarData(pago)}.</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.rotulo}>Garantia</Text>
            <Text>{textoGarantia(r.garantiaDias, garantiaInicio)}</Text>
          </View>
        </View>

        {r.observacoes ? (
          <View style={estilos.bloco}>
            <Text style={estilos.rotulo}>Observações</Text>
            <Text>{r.observacoes}</Text>
          </View>
        ) : null}

        <View style={estilos.assinatura}>
          <Text style={{ color: GRAFITE, fontSize: 10, marginBottom: 28 }}>
            {e.cidade}, {formatarData(emitido)}
          </Text>
          <View style={estilos.linhaAssinatura}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{e.responsavel}</Text>
            <Text style={{ color: GRAFITE, fontSize: 10 }}>{e.nome}</Text>
          </View>
        </View>

        <Text style={estilos.rodape} fixed>
          {e.nome} · WhatsApp {formatarWhatsapp(e.whatsapp)}
          {endereco ? ` · ${endereco}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
