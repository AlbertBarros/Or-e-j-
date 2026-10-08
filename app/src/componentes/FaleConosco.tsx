import { useState, type FormEvent } from "react";
import { IconeCheck, IconeEmail, IconeWhatsapp } from "./Icones";
import { ASSUNTOS, SUPORTE, enviarMensagemSuporte, linkWhatsappSuporte, type Assunto } from "@/lib/suporte";
import type { Usuario } from "@/tipos";

interface Props {
  uid: string;
  perfil: Usuario;
  emailLogin: string | null;
}

/** Contato com o suporte: WhatsApp e e-mail (quando configurados) e formulário que sempre funciona. */
export default function FaleConosco({ uid, perfil, emailLogin }: Props) {
  const [assunto, setAssunto] = useState<Assunto>(ASSUNTOS[0]);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const whats = linkWhatsappSuporte(perfil);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (mensagem.trim().length < 5) {
      setErro("Conte um pouco mais para a gente conseguir ajudar.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await enviarMensagemSuporte(uid, perfil, emailLogin, assunto, mensagem);
      setEnviado(true);
      setMensagem("");
    } catch (e2) {
      console.error(e2);
      setErro("Não deu para enviar agora. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      {(whats || SUPORTE.email) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {whats && (
            <a href={whats} target="_blank" rel="noopener" className="botao-primario">
              <IconeWhatsapp /> Chamar no WhatsApp
            </a>
          )}
          {SUPORTE.email && (
            <a href={`mailto:${SUPORTE.email}?subject=${encodeURIComponent(`Ajuda · ${perfil.nomeNegocio}`)}`} className="botao-secundario">
              <IconeEmail tamanho={18} /> {SUPORTE.email}
            </a>
          )}
        </div>
      )}

      {enviado ? (
        <div className="mt-3 rounded-xl bg-[#E6F4EA] p-4 text-sm" role="status">
          <p className="flex items-center gap-2 font-semibold text-pago">
            <IconeCheck tamanho={18} /> Mensagem recebida!
          </p>
          <p className="mt-1 text-tinta">Respondemos pelo seu WhatsApp ou e-mail em até 1 dia útil.</p>
          <button type="button" onClick={() => setEnviado(false)} className="botao-texto mt-2 !px-0">
            Escrever outra mensagem
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className={`${whats || SUPORTE.email ? "mt-4 border-t border-pauta pt-4" : ""} space-y-3`} noValidate>
          <p className="text-sm text-grafite">{whats || SUPORTE.email ? "Ou escreva aqui:" : "Escreva sua dúvida. Respondemos pelo seu WhatsApp ou e-mail em até 1 dia útil."}</p>
          <div>
            <label htmlFor="sup-assunto" className="rotulo">
              Assunto
            </label>
            <select id="sup-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value as Assunto)} className="campo">
              {ASSUNTOS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sup-msg" className="rotulo">
              Mensagem
            </label>
            <textarea
              id="sup-msg"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={2900}
              rows={4}
              className="campo min-h-28 py-2"
              placeholder="Ex.: o cliente diz que o link não abre no celular dele"
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? "sup-erro" : undefined}
            />
          </div>
          {erro && (
            <p id="sup-erro" role="alert" className="erro">
              {erro}
            </p>
          )}
          <button type="submit" disabled={enviando} className="botao-primario">
            {enviando ? "Enviando…" : "Enviar mensagem"}
          </button>
        </form>
      )}
    </div>
  );
}
