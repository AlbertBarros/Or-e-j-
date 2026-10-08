/**
 * Passos do tour guiado. Cada passo abre uma tela de verdade do app e destaca um elemento marcado com
 * data-tour="...". Sem alvo (ou se o alvo não aparecer), a explicação fica no centro da tela.
 */
export interface PassoTour {
  rota: string;
  alvo?: string;
  titulo: string;
  texto: string;
}

export const PASSOS_TOUR: PassoTour[] = [
  {
    rota: "/",
    titulo: "Boas-vindas ao Preço Fechado 👋",
    texto: "Em 2 minutos você aprende a fazer, enviar e receber um orçamento. Toque em Próximo para seguir, ou use as setas do teclado.",
  },
  {
    rota: "/",
    alvo: "resumo",
    titulo: "Seu dinheiro em primeiro lugar",
    texto: "Quanto você tem a receber, quanto já recebeu e quem está atrasado. Daqui também sai o Novo orçamento.",
  },
  {
    rota: "/",
    alvo: "sino",
    titulo: "Avisos",
    texto: "O sininho mostra quando um cliente aprova, recusa ou assina. Ligue os avisos no celular para saber na hora, mesmo com o app fechado.",
  },
  {
    rota: "/",
    alvo: "ajuda",
    titulo: "Ajuda sempre à mão",
    texto: "Neste botão ficam o tutorial, o passo a passo para instalar o app, os avisos e o contato com o suporte.",
  },
  {
    rota: "/",
    alvo: "abas",
    titulo: "Tudo em 5 abas",
    texto: "Início, Orçamentos, Clientes, Contratos e Mais. Vamos começar pelo mais importante: um orçamento.",
  },
  {
    rota: "/orcamentos/novo",
    alvo: "orc-cliente",
    titulo: "1. O cliente",
    texto: "Escolha um cliente já salvo ou digite nome e WhatsApp. Cliente novo entra sozinho no seu banco de clientes.",
  },
  {
    rota: "/orcamentos/novo",
    alvo: "orc-itens",
    titulo: "2. Os itens",
    texto: "“Do catálogo” traz seus serviços com preço em um toque. “Adicionar item” cria uma linha livre. O total soma sozinho.",
  },
  {
    rota: "/orcamentos/novo",
    alvo: "orc-pagamento",
    titulo: "3. Como o cliente paga",
    texto: "Marque Pix, cartão, dinheiro… Se quiser, mostre dois valores: um à vista e outro no cartão.",
  },
  {
    rota: "/orcamentos/novo",
    alvo: "orc-frete",
    titulo: "4. Frete pelo mapa",
    texto: "Cobra deslocamento? Digite o endereço do cliente e o app calcula: valor fixo + km × valor por km.",
  },
  {
    rota: "/orcamentos/novo",
    alvo: "orc-salvar",
    titulo: "5. Salve e envie",
    texto: "O total aparece aqui, ao vivo. Salve o rascunho; depois escolha o modelo, veja a prévia e envie no WhatsApp ou em PDF.",
  },
  {
    rota: "/orcamentos",
    alvo: "orc-filtros",
    titulo: "Acompanhe cada orçamento",
    texto: "Rascunhos, enviados, aprovados, atrasados e pagos. Toque num orçamento para enviar, cobrar, marcar como pago ou emitir o recibo.",
  },
  {
    rota: "/orcamentos",
    titulo: "E do lado do cliente?",
    texto: "Ele abre o link, aprova com um toque e, no Pro, já vê o Pix com o valor certo. Sem app e sem cadastro. Você recebe o aviso na hora.",
  },
  {
    rota: "/contratos",
    alvo: "contratos-busca",
    titulo: "Contratos assinados pelo celular",
    texto: "Quando o cliente aprova, o app sugere o contrato já preenchido. Ele assina com o dedo e o PDF assinado fica guardado aqui.",
  },
  {
    rota: "/clientes",
    alvo: "clientes-busca",
    titulo: "Seus clientes",
    texto: "Todo cliente fica salvo com histórico e valores. Use Selecionar para mandar uma mensagem para vários de uma vez.",
  },
  {
    rota: "/mais",
    alvo: "mais-lista",
    titulo: "Divulgue e organize",
    texto: "Cartão de visita virtual, cards para postar, produtos e serviços, recibo avulso e os dados da sua conta e do seu plano.",
  },
  {
    rota: "/",
    alvo: "novo-orcamento",
    titulo: "Pronto! Agora é com você 🎉",
    texto: "Toque em Novo orçamento e mande o primeiro. O tutorial fica guardado em Ajuda, se quiser ver de novo.",
  },
];
