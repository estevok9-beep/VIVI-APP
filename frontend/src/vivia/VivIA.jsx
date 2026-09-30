import { useState } from "react";
import { supabase } from "../supabase";
import "./VivIA.css";

export default function VivIA() {
  const [mensagens, setMensagens] = useState([
    {
      id: 1,
      autor: "viv",
      texto:
        "Olá! Eu sou a VIV. Posso ajudar você a organizar e entender suas finanças. 💜",
    },
  ]);

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviarMensagem(evento) {
    evento?.preventDefault();

    const mensagem = texto.trim();

    if (!mensagem || enviando) {
      return;
    }

    const mensagemUsuario = {
      id: Date.now(),
      autor: "usuario",
      texto: mensagem,
    };

    setMensagens((anteriores) => [
      ...anteriores,
      mensagemUsuario,
    ]);

    setTexto("");
    setEnviando(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "vivi-ai",
        {
          body: {
            message: mensagem,
          },
        }
      );

      if (error) {
        console.error("Erro ao chamar vivi-ai:", error);

        throw new Error(
          "Não consegui me comunicar com a VIV agora."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "A VIV não conseguiu responder."
        );
      }

      const mensagemViv = {
        id: Date.now() + 1,
        autor: "viv",
        texto: data.resposta,
      };

      setMensagens((anteriores) => [
        ...anteriores,
        mensagemViv,
      ]);
    } catch (erro) {
      console.error("Erro VIV IA:", erro);

      const mensagemErro = {
        id: Date.now() + 2,
        autor: "viv",
        erro: true,
        texto:
          erro?.message ||
          "Ocorreu um erro ao falar com a VIV.",
      };

      setMensagens((anteriores) => [
        ...anteriores,
        mensagemErro,
      ]);
    } finally {
      setEnviando(false);
    }
  }

  function aoPressionarTecla(evento) {
    if (
      evento.key === "Enter" &&
      !evento.shiftKey
    ) {
      evento.preventDefault();
      enviarMensagem();
    }
  }

  return (
    <div className="viv-ia-page">
      <header className="viv-ia-header">
        <div className="viv-ia-avatar">
          V
        </div>

        <div>
          <h1>VIV IA</h1>
          <p>
            Sua assistente financeira
          </p>
        </div>
      </header>

      <section className="viv-ia-chat">
        <div className="viv-ia-mensagens">
          {mensagens.map((mensagem) => (
            <div
              key={mensagem.id}
              className={`viv-ia-linha ${
                mensagem.autor === "usuario"
                  ? "viv-ia-linha--usuario"
                  : "viv-ia-linha--viv"
              }`}
            >
              <div
                className={`viv-ia-balao ${
                  mensagem.autor === "usuario"
                    ? "viv-ia-balao--usuario"
                    : "viv-ia-balao--viv"
                } ${
                  mensagem.erro
                    ? "viv-ia-balao--erro"
                    : ""
                }`}
              >
                {mensagem.texto}
              </div>
            </div>
          ))}

          {enviando && (
            <div className="viv-ia-linha viv-ia-linha--viv">
              <div className="viv-ia-balao viv-ia-balao--viv">
                <span className="viv-ia-digitando">
                  VIV está pensando...
                </span>
              </div>
            </div>
          )}
        </div>

        <form
          className="viv-ia-form"
          onSubmit={enviarMensagem}
        >
          <textarea
            value={texto}
            onChange={(evento) =>
              setTexto(evento.target.value)
            }
            onKeyDown={aoPressionarTecla}
            placeholder="Converse com a VIV..."
            maxLength={4000}
            rows={1}
            disabled={enviando}
          />

          <button
            type="submit"
            disabled={
              enviando || !texto.trim()
            }
          >
            {enviando
              ? "Enviando..."
              : "Enviar"}
          </button>
        </form>

        <p className="viv-ia-aviso">
          A VIV pode cometer erros. Confira informações financeiras importantes.
        </p>
      </section>
    </div>
  );
}