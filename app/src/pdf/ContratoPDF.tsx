import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { estilos, GRAFITE, TINTA } from "./estilos";
import type { Contrato } from "@/tipos";
import { formatarData, formatarReais } from "@shared/src/mensagens";
import { paraDate } from "@/lib/datas";

interface Props {
  contrato: Contrato;
  logoPng?: string | null;
  assinaturaPng?: string | null;
}

/** PDF do contrato: texto integral + bloco de assinaturas (com a imagem da assinatura eletrônica). */
export default function ContratoPDF({ contrato: c, logoPng, assinaturaPng }: Props) {
  const assinadoEm = paraDate(c.assinatura?.assinadoEm);
  const numero = String(c.numero).padStart(4, "0");
  const paragrafos = c.texto.split("\n");
  return (
    <Document title={`Contrato nº ${numero} — ${c.contratado.nome}`} author={c.contratado.nome} language="pt-BR">
      <Page size="A4" style={{ ...estilos.pagina, fontSize: 10.5 }}>
        <View style={estilos.cabecalho}>
          <View style={estilos.cabecalhoEsq}>
            {logoPng ? <Image src={logoPng} style={estilos.logo} /> : null}
            <View>
              <Text style={estilos.negocio}>{c.contratado.nome}</Text>
              <Text style={estilos.negocioSub}>{c.contratado.cidade}</Text>
            </View>
          </View>
          <View style={estilos.numeroBloco}>
            <Text style={estilos.rotuloDoc}>CONTRATO</Text>
            <Text style={estilos.numero}>Nº {numero}</Text>
            <Text style={estilos.data}>{formatarReais(c.valor)}</Text>
          </View>
        </View>

        {paragrafos.map((p, i) => {
          const titulo = /^(CLÁUSULA|CONTRATO DE PRESTAÇÃO)/.test(p);
          return (
            <Text key={i} style={titulo ? { fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 2 } : { marginBottom: p ? 2 : 4 }}>
              {p || " "}
            </Text>
          );
        })}

        <View style={{ flexDirection: "row", gap: 30, marginTop: 36 }} wrap={false}>
          <View style={{ flex: 1, alignItems: "center" }}>
            {assinaturaPng ? <Image src={assinaturaPng} style={{ height: 56, width: 180, objectFit: "contain" }} /> : <View style={{ height: 56 }} />}
            <View style={{ width: 220, borderTopWidth: 1, borderTopColor: TINTA, paddingTop: 5, alignItems: "center" }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{c.assinatura?.nome ?? c.contratante.nome}</Text>
              <Text style={{ color: GRAFITE, fontSize: 9 }}>CONTRATANTE</Text>
              {assinadoEm && (
                <Text style={{ color: GRAFITE, fontSize: 8, marginTop: 2 }}>
                  Assinatura eletrônica em {formatarData(assinadoEm)} às {assinadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              )}
            </View>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ height: 56 }} />
            <View style={{ width: 220, borderTopWidth: 1, borderTopColor: TINTA, paddingTop: 5, alignItems: "center" }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{c.contratado.responsavel}</Text>
              <Text style={{ color: GRAFITE, fontSize: 9 }}>CONTRATADO · {c.contratado.nome}</Text>
            </View>
          </View>
        </View>

        {c.assinatura && (
          <Text style={{ marginTop: 16, fontSize: 8, color: GRAFITE }}>
            Registro da assinatura eletrônica: nome informado "{c.assinatura.nome}", contrato nº {numero}, id {c.id}, dispositivo: {c.assinatura.agente}
          </Text>
        )}

        <Text style={estilos.rodape} fixed>
          {c.mostrarMarca ? "Contrato gerado com Preço Fechado — orca-ja-6cz.pages.dev" : `${c.contratado.nome} · contrato nº ${numero}`}
        </Text>
      </Page>
    </Document>
  );
}
