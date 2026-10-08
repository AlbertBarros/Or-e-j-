/** Guia completo da tela Ajuda: um tópico por assunto, em passos curtos, com atalho para a tela certa. */

export interface TopicoGuia {
  id: string;
  titulo: string;
  resumo: string;
  passos: string[];
  ir?: { para: string; rotulo: string };
}

export const GUIA: TopicoGuia[] = [
  {
    id: "primeiros-passos",
    titulo: "Primeiros passos",
    resumo: "O que deixar pronto antes do primeiro orçamento.",
    passos: [
      "Em Mais → Conta e plano, confira o nome do negócio, o WhatsApp e a chave Pix. É com eles que o cliente fala com você e paga.",
      "Coloque sua logo: ela aparece no orçamento, no contrato, no recibo e no cartão de visita.",
      "Cadastre seus produtos e serviços com preço em Mais → Produtos e serviços. Depois eles entram no orçamento com um toque.",
      "Se cobra deslocamento, defina o frete padrão (valor fixo + valor por km) na Conta.",
    ],
    ir: { para: "/conta", rotulo: "Abrir a Conta" },
  },
  {
    id: "orcamento",
    titulo: "Criar um orçamento",
    resumo: "Cliente, itens, desconto, validade e vencimento.",
    passos: [
      "Toque em Novo orçamento (na tela Início ou na aba Orçamentos).",
      "Escolha um cliente já salvo ou digite nome e WhatsApp. Clientes novos entram sozinhos no seu banco de clientes.",
      "Adicione os itens: “Do catálogo” traz o serviço com preço; “Adicionar item” cria uma linha livre.",
      "Ajuste desconto, validade e, se quiser, a data de vencimento do pagamento. O total aparece no rodapé, ao vivo.",
      "Toque em Salvar rascunho. Rascunho ainda não vai para o cliente: você revisa antes de enviar.",
    ],
    ir: { para: "/orcamentos/novo", rotulo: "Fazer um orçamento" },
  },
  {
    id: "frete",
    titulo: "Frete calculado pelo mapa",
    resumo: "Valor fixo + valor por km até o endereço do cliente.",
    passos: [
      "No orçamento, toque em “Adicionar frete” e digite o endereço do cliente.",
      "O app calcula a distância de carro a partir do seu endereço e soma: valor fixo + km × valor por km.",
      "Você pode corrigir os km ou o valor à mão antes de salvar.",
    ],
  },
  {
    id: "pagamento",
    titulo: "Formas de pagamento e dois valores",
    resumo: "Pix, dinheiro, cartão… e o preço à vista e no cartão.",
    passos: [
      "Na parte Pagamento do orçamento, marque o que você aceita: Pix, dinheiro, débito, crédito, transferência.",
      "Marque “Mostrar dois valores” para ter o preço à vista e um preço diferente no cartão.",
      "Escreva condições, se houver: “50% na aprovação e 50% na entrega”, por exemplo.",
    ],
  },
  {
    id: "enviar",
    titulo: "Escolher o modelo e enviar",
    resumo: "Prévia no celular, WhatsApp ou PDF.",
    passos: [
      "Abra o orçamento e toque em Enviar no WhatsApp.",
      "Escolha o modelo (Simples, Detalhado ou Completo) e veja a prévia exatamente como o cliente vai receber.",
      "Confirme: o WhatsApp abre com a mensagem pronta e o link de aprovação. Se preferir, baixe o PDF para mandar por onde quiser.",
    ],
    ir: { para: "/orcamentos", rotulo: "Ver meus orçamentos" },
  },
  {
    id: "aprovacao",
    titulo: "Aprovação do cliente e Pix",
    resumo: "O cliente aprova pelo link, sem instalar nada.",
    passos: [
      "O cliente abre o link, vê o orçamento e toca em Aprovar ou Recusar. Não precisa de app nem de cadastro.",
      "No Pro, logo depois de aprovar aparece o Pix com QR Code e código copia-e-cola, com o valor certo.",
      "Você recebe um aviso no celular (ligue em Ajuda → Avisos no celular) e o orçamento muda de situação sozinho.",
    ],
  },
  {
    id: "cobrar",
    titulo: "Cobrar quem atrasou",
    resumo: "Mensagens prontas no tom certo.",
    passos: [
      "Orçamentos aprovados com vencimento passado aparecem como Atrasados no Início e na lista.",
      "Abra o orçamento e toque em Cobrar: o app sugere o tom (gentil, firme ou final) pelos dias de atraso.",
      "Revise e envie pelo WhatsApp.",
    ],
    ir: { para: "/orcamentos?filtro=atrasado", rotulo: "Ver atrasados" },
  },
  {
    id: "recibo",
    titulo: "Marcar como pago e emitir recibo",
    resumo: "Recibo em PDF com sua logo e garantia.",
    passos: [
      "Recebeu? Abra o orçamento e toque em Marcar como pago (a data pode ser ajustada).",
      "Toque em Gerar recibo, escolha a garantia e envie o PDF pelo WhatsApp.",
      "Recebeu sem ter feito orçamento? Use Mais → Recibo avulso: preencha cliente, serviço e valor, e o recibo sai na hora.",
    ],
    ir: { para: "/recibos/novo", rotulo: "Fazer um recibo avulso" },
  },
  {
    id: "contratos",
    titulo: "Contratos e assinatura pelo celular",
    resumo: "Contrato sugerido ao aprovar; o cliente assina com o dedo.",
    passos: [
      "Quando um orçamento é aprovado, o app sugere o contrato já preenchido com os dados do cliente, do serviço e do pagamento.",
      "Revise as cláusulas, ajuste prazo e garantia, e envie o link pelo WhatsApp.",
      "O cliente desenha a assinatura na tela. O app registra nome, data, hora e aparelho e gera o PDF assinado.",
      "Na aba Contratos você busca por nome ou telefone e vê quais faltam assinar.",
    ],
    ir: { para: "/contratos", rotulo: "Abrir Contratos" },
  },
  {
    id: "clientes",
    titulo: "Clientes e mensagens para vários",
    resumo: "Seu banco de clientes, montado sozinho.",
    passos: [
      "Todo cliente de orçamento entra na aba Clientes, com histórico e valores.",
      "Abra a ficha para completar CPF, endereço e observações.",
      "Para mandar uma mensagem para vários (uma promoção, um aviso), toque em Selecionar, marque os clientes e envie pelo WhatsApp, um por um.",
    ],
    ir: { para: "/clientes", rotulo: "Abrir Clientes" },
  },
  {
    id: "divulgar",
    titulo: "Cartão de visita e cards",
    resumo: "Uma página sua e imagens prontas para divulgar.",
    passos: [
      "Em Mais → Cartão de visita, escolha um dos 3 modelos. O cartão vira uma página com seus serviços e um botão de pedir orçamento.",
      "Compartilhe o link no WhatsApp, no Instagram ou no status.",
      "Baixe os cards em imagem (3 modelos) para postar.",
    ],
    ir: { para: "/cartao", rotulo: "Abrir o cartão" },
  },
  {
    id: "avisos",
    titulo: "Avisos no celular",
    resumo: "Saiba na hora quando o cliente aprovar ou assinar.",
    passos: [
      "Em Ajuda → Avisos no celular, toque em Ligar avisos e permita as notificações.",
      "Você recebe aviso quando um cliente aprova ou recusa um orçamento e quando assina um contrato.",
      "Uma vez por dia, de manhã, chega um resumo se houver pagamento atrasado, orçamento sem resposta ou contrato sem assinatura.",
      "No iPhone, instale o app na Tela de Início antes (o iPhone só manda avisos para apps instalados).",
    ],
  },
  {
    id: "plano",
    titulo: "Plano Pro e teste grátis",
    resumo: "14 dias de Pro grátis; depois, mensal ou anual.",
    passos: [
      "Toda conta nova começa com 14 dias de Pro grátis, sem cartão.",
      "O Pro libera orçamentos ilimitados, Pix na aprovação, recibo em PDF, sua logo nos documentos e sem a marca Preço Fechado.",
      "Para assinar, vá em Conta → Plano e use o mesmo e-mail do login no pagamento. O Pro é liberado sozinho.",
      "Para cancelar a assinatura no cartão, use sua conta do Mercado Pago (Assinaturas). O Pro continua até o fim do período pago.",
    ],
    ir: { para: "/conta#plano", rotulo: "Ver meu plano" },
  },
  {
    id: "instalar",
    titulo: "Usar como app",
    resumo: "Ícone na tela inicial, abre sem navegador.",
    passos: [
      "Android: toque em Instalar quando o app oferecer, ou no menu ⋮ do Chrome → Instalar app.",
      "iPhone: no Safari, toque em Compartilhar → Adicionar à Tela de Início → Adicionar.",
      "Computador: no Chrome ou no Edge, clique no ícone de instalar na barra de endereço.",
    ],
  },
];
