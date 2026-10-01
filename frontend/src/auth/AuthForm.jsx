
import { useState } from "react";
import { supabase } from "../supabase";
import "./AuthForm.css";
import vivLogo from "../assets/viv-logo-centralizado.png";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modo, setModo] = useState("login");
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setMensagem("");
    setTipoMensagem("");
    setCarregando(true);

    try {
      if (modo === "cadastro") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
        });

        if (error) throw error;

        setMensagem(
          "Solicitação recebida. Confira seu e-mail para confirmar o cadastro."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });

        if (error) throw error;

        setMensagem("Login realizado com sucesso!");
      }

      setTipoMensagem("sucesso");
    } catch (erro) {
      setMensagem(erro.message || "Ocorreu um erro. Tente novamente.");
      setTipoMensagem("erro");
    } finally {
      setCarregando(false);
    }
  }

  function alternarModo() {
    setModo((atual) =>
      atual === "login" ? "cadastro" : "login"
    );
    setMensagem("");
    setTipoMensagem("");
    setSenha("");
    setMostrarSenha(false);
  }

  return (
    <main className="vivi-auth">
      <div className="vivi-auth-glow vivi-auth-glow-1" />
      <div className="vivi-auth-glow vivi-auth-glow-2" />
      <div className="vivi-auth-grid" />

      <div className="vivi-auth-layout">
        <section className="vivi-auth-brand">
          <div className="vivi-auth-brand-top">
            <div className="vivi-auth-symbol"><img src={vivLogo} alt="VIV" /></div>
            <span>Viv FINANCE</span>
          </div>

          <div className="vivi-auth-brand-content">
            <div className="vivi-auth-tag">
              <span className="vivi-auth-status-dot" />
              SUA EVOLUÇÃO FINANCEIRA
            </div>

            <h1>
              O futuro das suas
              <br />
              finanças <span>começa aqui.</span>
            </h1>

            <p>
              Organize suas movimentações, acompanhe suas metas
              e tenha o controle da sua vida financeira
              em um só lugar.
            </p>

            <div className="vivi-auth-features">
              <div>
                <span className="vivi-auth-feature-icon">↗</span>
                Controle financeiro
              </div>
              <div>
                <span className="vivi-auth-feature-icon">◎</span>
                Metas e planejamento
              </div>
              <div>
                <span className="vivi-auth-feature-icon">◈</span>
                Relatórios inteligentes
              </div>
            </div>
          </div>

          <div className="vivi-auth-brand-footer">
            Viv • INTELIGÊNCIA PARA SUAS FINANÇAS
          </div>
        </section>

        <section className="vivi-auth-panel">
          <div className="vivi-auth-card">
            <div className="vivi-auth-mobile-logo">
              <div className="vivi-auth-symbol"><img src={vivLogo} alt="VIV" /></div>
              <span>Viv</span>
            </div>

            <div className="vivi-auth-card-heading">
              <div className="vivi-auth-eyebrow">
                <span className="vivi-auth-status-dot" />
                ACESSO SEGURO
              </div>

              <h2>
                {modo === "login"
                  ? "Bem-vindo de volta"
                  : "Comece com a Viv"}
              </h2>

              <p>
                {modo === "login"
                  ? "Entre com suas credenciais para continuar."
                  : "Preencha seus dados para solicitar uma conta."}
              </p>
            </div>

            <form onSubmit={enviar} className="vivi-auth-form">
              <div className="vivi-auth-field">
                <label htmlFor="vivi-email">E-mail</label>
                <div className="vivi-auth-input-wrap">
                  <span className="vivi-auth-input-icon">✉</span>
                  <input
                    id="vivi-email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="vivi-auth-field">
                <label htmlFor="vivi-senha">Senha</label>
                <div className="vivi-auth-input-wrap">
                  <span className="vivi-auth-input-icon">◇</span>
                  <input
                    id="vivi-senha"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete={
                      modo === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    minLength={6}
                    required
                  />
                  <button
                    className="vivi-auth-show-password"
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    aria-label={
                      mostrarSenha
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                  >
                    {mostrarSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {mensagem && (
                <div
                  className={`vivi-auth-message ${tipoMensagem}`}
                  role="status"
                  aria-live="polite"
                >
                  {mensagem}
                </div>
              )}

              <button
                className="vivi-auth-submit"
                type="submit"
                disabled={carregando}
              >
                {carregando
                  ? "Aguarde..."
                  : modo === "login"
                    ? "Acessar minha conta"
                    : "Criar minha conta"}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className="vivi-auth-divider">
              <span />
              <span>Viv FINANCE</span>
              <span />
            </div>

            <p className="vivi-auth-switch">
              {modo === "login"
                ? "Ainda não possui uma conta?"
                : "Já possui uma conta?"}
              <button type="button" onClick={alternarModo}>
                {modo === "login" ? "Criar conta" : "Fazer login"}
              </button>
            </p>

            <div className="vivi-auth-security">
              <span aria-hidden="true">◇</span>
              Conexão protegida
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
