import { useEffect, useState } from "react";
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
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [documentoLegal, setDocumentoLegal] = useState(null);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const veioDaRecuperacao = parametros.get("recovery") === "1";

    if (veioDaRecuperacao) {
      setRecuperandoSenha(true);
      setMensagem("");
      setTipoMensagem("");
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecuperandoSenha(true);
        setMensagem("");
        setTipoMensagem("");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  const whatsappUrl =
    "https://wa.me/5521997843506?text=Ol%C3%A1%21%20Quero%20conhecer%20a%20VIV%20IA%20FINANCEIRA%20e%20solicitar%20meu%20c%C3%B3digo%20de%20convite%20para%20o%20teste%20gr%C3%A1tis%20de%207%20dias.";

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
      setMensagem(
        erro.message || "Ocorreu um erro. Tente novamente."
      );
      setTipoMensagem("erro");
    } finally {
      setCarregando(false);
    }
  }

  async function recuperarSenha() {
    if (!email.trim()) {
      setMensagem("Digite seu e-mail para recuperar a senha.");
      setTipoMensagem("erro");
      return;
    }

    setMensagem("");
    setTipoMensagem("");
    setCarregando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/?recovery=1`,
        }
      );

      if (error) throw error;

      setMensagem(
        "Enviamos um link de recuperação para o seu e-mail. Verifique também a caixa de spam."
      );
      setTipoMensagem("sucesso");
    } catch (erro) {
      setMensagem(
        erro.message ||
          "Não foi possível enviar o e-mail de recuperação."
      );
      setTipoMensagem("erro");
    } finally {
      setCarregando(false);
    }
  }

  async function salvarNovaSenha(evento) {
    evento.preventDefault();
    setMensagem("");
    setTipoMensagem("");

    if (novaSenha.length < 6) {
      setMensagem("A nova senha precisa ter pelo menos 6 caracteres.");
      setTipoMensagem("erro");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem("As senhas não coincidem.");
      setTipoMensagem("erro");
      return;
    }

    setCarregando(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) throw error;

      setMensagem("Senha alterada com sucesso! Você já pode entrar com a nova senha.");
      setTipoMensagem("sucesso");
      setNovaSenha("");
      setConfirmarSenha("");
      setMostrarNovaSenha(false);
      setRecuperandoSenha(false);

      window.history.replaceState({}, document.title, window.location.pathname);

      await supabase.auth.signOut();
    } catch (erro) {
      setMensagem(
        erro.message || "Não foi possível alterar a senha. Solicite um novo link."
      );
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

  if (documentoLegal) {
    const politica = documentoLegal === "privacidade";

    return (
      <main className="vivi-auth">
        <div className="vivi-auth-light vivi-auth-light-left" />
        <div className="vivi-auth-light vivi-auth-light-right" />

        <section
          className="vivi-login"
          style={{
            width: "min(820px, 94vw)",
            maxHeight: "88vh",
            overflowY: "auto",
            textAlign: "left",
          }}
        >
          <header className="vivi-login-header" style={{ textAlign: "center" }}>
            <img className="vivi-login-logo" src={vivLogo} alt="VIV IA FINANCEIRA" />
            <h2 style={{ margin: "8px 0 4px" }}>
              {politica ? "Política de Privacidade" : "Termos de Uso"}
            </h2>
            <p style={{ margin: 0, opacity: 0.75 }}>Última atualização: 2 de outubro de 2026</p>
          </header>

          <div style={{ lineHeight: 1.65, fontSize: "0.94rem", padding: "8px 4px" }}>
            {politica ? (
              <>
                <p>
                  A VIV IA FINANCEIRA respeita a privacidade de seus usuários e trata dados pessoais de
                  acordo com a legislação brasileira aplicável, incluindo a Lei Geral de Proteção de Dados
                  Pessoais (LGPD — Lei nº 13.709/2018).
                </p>
                <h3>1. Responsável e contato</h3>
                <p>
                  Responsável pela VIV IA FINANCEIRA: <strong>Estevão da Silva Motta</strong>.<br />
                  Contato para privacidade, suporte e assuntos relacionados a dados pessoais:{" "}
                  <strong>vivifinaceiroapp@hotmail.com</strong>.
                </p>
                <h3>2. Dados que podem ser tratados</h3>
                <p>
                  Podemos tratar dados fornecidos pelo próprio usuário, como endereço de e-mail, dados de
                  autenticação e informações financeiras registradas no aplicativo, incluindo receitas,
                  despesas, categorias, descrições e demais informações inseridas voluntariamente. Também
                  podem existir dados técnicos necessários à segurança, autenticação e funcionamento do
                  serviço.
                </p>
                <h3>3. Finalidades do tratamento</h3>
                <p>
                  Os dados são utilizados para criar e proteger a conta, autenticar o acesso, registrar e
                  organizar informações financeiras, disponibilizar recursos do aplicativo, oferecer
                  funcionalidades assistidas por inteligência artificial, prestar suporte, prevenir abuso e
                  manter a segurança e a continuidade do serviço.
                </p>
                <h3>4. Inteligência artificial</h3>
                <p>
                  Recursos de IA podem processar informações fornecidas pelo usuário para interpretar
                  solicitações, organizar dados e gerar respostas ou análises. Respostas geradas por IA podem
                  conter imprecisões e não substituem orientação profissional contábil, financeira, jurídica
                  ou de investimentos.
                </p>
                <h3>5. Serviços de terceiros</h3>
                <p>
                  A VIV IA FINANCEIRA utiliza provedores de infraestrutura e autenticação, incluindo o
                  Supabase, e pode utilizar outros fornecedores necessários à hospedagem, segurança e
                  funcionamento do aplicativo. Esses fornecedores podem tratar dados conforme suas próprias
                  políticas e obrigações legais, na medida necessária à prestação dos serviços contratados.
                </p>
                <h3>6. Compartilhamento</h3>
                <p>
                  A VIV IA FINANCEIRA não comercializa dados pessoais. Informações podem ser compartilhadas
                  com prestadores essenciais ao funcionamento do serviço, mediante necessidade operacional,
                  ou quando houver obrigação legal, regulatória ou determinação válida de autoridade
                  competente.
                </p>
                <h3>7. Segurança e retenção</h3>
                <p>
                  São adotadas medidas técnicas e organizacionais razoáveis para proteger os dados contra
                  acesso, alteração, divulgação ou destruição não autorizados. Nenhum sistema conectado à
                  internet oferece segurança absoluta. Os dados serão mantidos pelo período necessário às
                  finalidades informadas e às obrigações legais aplicáveis.
                </p>
                <h3>8. Direitos do titular</h3>
                <p>
                  Nos termos da LGPD, o titular pode solicitar, quando aplicável, confirmação do tratamento,
                  acesso, correção, informações sobre compartilhamento, portabilidade, anonimização, bloqueio
                  ou eliminação de dados e demais direitos previstos em lei. Solicitações podem ser enviadas
                  ao e-mail de contato informado nesta Política e poderão exigir confirmação de identidade.
                </p>
                <h3>9. Exclusão de conta e dados</h3>
                <p>
                  O usuário pode solicitar a exclusão da conta e dos dados pessoais pelo canal de contato.
                  Determinados registros poderão ser preservados quando houver obrigação legal, necessidade de
                  exercício regular de direitos ou outra hipótese autorizada pela legislação.
                </p>
                <h3>10. Alterações desta Política</h3>
                <p>
                  Esta Política poderá ser atualizada para refletir mudanças no aplicativo, nos serviços
                  utilizados ou na legislação. A versão vigente será disponibilizada na VIV IA FINANCEIRA com
                  a respectiva data de atualização.
                </p>
              </>
            ) : (
              <>
                <p>
                  Estes Termos regulam o acesso e o uso da VIV IA FINANCEIRA. Ao criar uma conta e utilizar o
                  aplicativo, o usuário declara ter lido e concordado com estes Termos e com a Política de
                  Privacidade.
                </p>
                <h3>1. Responsável pelo serviço</h3>
                <p>
                  Responsável: <strong>Estevão da Silva Motta</strong>.<br />
                  Contato: <strong>vivifinaceiroapp@hotmail.com</strong>.
                </p>
                <h3>2. Finalidade da VIV IA FINANCEIRA</h3>
                <p>
                  O aplicativo oferece ferramentas para registro, organização e acompanhamento de informações
                  financeiras pessoais, além de recursos automatizados e assistidos por inteligência
                  artificial.
                </p>
                <h3>3. Cadastro e segurança da conta</h3>
                <p>
                  O usuário deve fornecer informações válidas, manter suas credenciais protegidas e não
                  permitir o uso indevido de sua conta. Atividades realizadas por meio da conta poderão ser
                  associadas ao respectivo usuário, observadas as medidas de segurança disponíveis.
                </p>
                <h3>4. Uso permitido</h3>
                <p>
                  O serviço deve ser utilizado de forma lícita. É proibido tentar acessar contas ou dados de
                  terceiros sem autorização, explorar vulnerabilidades, prejudicar a infraestrutura do
                  serviço, utilizar o aplicativo para fraude ou praticar atos contrários à legislação.
                </p>
                <h3>5. Informações financeiras e IA</h3>
                <p>
                  A VIV IA FINANCEIRA é uma ferramenta de organização e apoio. Informações, classificações,
                  projeções e respostas produzidas pelo sistema ou por IA podem conter erros e devem ser
                  conferidas pelo usuário. O aplicativo não presta consultoria financeira, contábil, jurídica
                  ou de investimentos e não garante resultados financeiros.
                </p>
                <h3>6. Teste, planos e pagamentos</h3>
                <p>
                  Quando houver período gratuito, assinatura ou recurso pago, as condições aplicáveis — como
                  duração, preço, renovação e benefícios — deverão ser apresentadas ao usuário antes da
                  contratação. Promoções e códigos de convite podem possuir regras e prazos próprios.
                </p>
                <h3>7. Disponibilidade e alterações</h3>
                <p>
                  O serviço pode receber atualizações, correções, novos recursos ou alterações. Interrupções
                  temporárias podem ocorrer por manutenção, falhas de terceiros, segurança ou eventos fora do
                  controle razoável do responsável.
                </p>
                <h3>8. Responsabilidades</h3>
                <p>
                  O usuário é responsável pela exatidão dos dados que registra e pelas decisões tomadas com
                  base nas informações exibidas. Nada nestes Termos exclui direitos ou responsabilidades que
                  não possam ser afastados pela legislação brasileira aplicável.
                </p>
                <h3>9. Suspensão e encerramento</h3>
                <p>
                  Contas poderão ser suspensas ou encerradas em caso de uso ilícito, fraude, violação destes
                  Termos ou risco à segurança do serviço ou de terceiros, respeitada a legislação aplicável.
                  O usuário também poderá solicitar o encerramento da própria conta.
                </p>
                <h3>10. Privacidade</h3>
                <p>
                  O tratamento de dados pessoais é descrito na Política de Privacidade da VIV IA FINANCEIRA,
                  que integra estes Termos.
                </p>
                <h3>11. Legislação aplicável</h3>
                <p>
                  Estes Termos são regidos pela legislação brasileira. Eventuais controvérsias serão tratadas
                  pelos meios legalmente competentes, preservados os direitos do consumidor e demais normas
                  obrigatórias aplicáveis.
                </p>
                <h3>12. Alterações dos Termos</h3>
                <p>
                  Estes Termos poderão ser atualizados quando houver mudanças relevantes no serviço ou na
                  legislação. A versão vigente ficará disponível no aplicativo com sua data de atualização.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            className="vivi-create-account"
            onClick={() => setDocumentoLegal(null)}
            style={{ width: "100%", marginTop: 12 }}
          >
            <strong>← Voltar para o login</strong>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="vivi-auth">
      <div className="vivi-auth-light vivi-auth-light-left" />
      <div className="vivi-auth-light vivi-auth-light-right" />

      <section className="vivi-login">
        <header className="vivi-login-header">
          <img
            className="vivi-login-logo"
            src={vivLogo}
            alt="VIV IA FINANCEIRA"
          />

          <p className="vivi-login-slogan">
            Sua vida financeira
            <br />
            <strong>mais simples e inteligente</strong>
          </p>
        </header>

        {recuperandoSenha ? (
          <>
            <div className="vivi-recovery-heading">
              <h2>Criar nova senha</h2>
              <p>Digite e confirme sua nova senha para continuar.</p>
            </div>

            <form className="vivi-login-form" onSubmit={salvarNovaSenha}>
              <div className="vivi-login-field">
                <div className="vivi-login-input">
                  <span className="vivi-input-icon">▣</span>
                  <input
                    type={mostrarNovaSenha ? "text" : "password"}
                    placeholder="Nova senha"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="vivi-password-eye"
                    onClick={() => setMostrarNovaSenha((atual) => !atual)}
                    aria-label={mostrarNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarNovaSenha ? "◉" : "◌"}
                  </button>
                </div>
              </div>

              <div className="vivi-login-field">
                <div className="vivi-login-input">
                  <span className="vivi-input-icon">▣</span>
                  <input
                    type={mostrarNovaSenha ? "text" : "password"}
                    placeholder="Confirmar nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
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
                className="vivi-login-submit"
                type="submit"
                disabled={carregando}
              >
                <span>{carregando ? "Salvando..." : "Salvar nova senha"}</span>
                <strong>→</strong>
              </button>
            </form>
          </>
        ) : (
          <>
            <form
              className="vivi-login-form"
              onSubmit={enviar}
            >
              <div className="vivi-login-field">
                <div className="vivi-login-input">
                  <span className="vivi-input-icon">✉</span>
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="vivi-login-field">
                <div className="vivi-login-input">
                  <span className="vivi-input-icon">▣</span>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete={
                      modo === "login" ? "current-password" : "new-password"
                    }
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="vivi-password-eye"
                    onClick={() => setMostrarSenha((atual) => !atual)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? "◉" : "◌"}
                  </button>
                </div>

                {!recuperandoSenha && modo === "login" && (
                  <button
                    className="vivi-forgot"
                    type="button"
                    onClick={recuperarSenha}
                    disabled={carregando}
                  >
                    {carregando ? "Aguarde..." : "Esqueceu a senha?"}
                  </button>
                )}
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
                className="vivi-login-submit"
                type="submit"
                disabled={carregando}
              >
                <span>
                  {carregando
                    ? "Aguarde..."
                    : modo === "login"
                      ? "Entrar"
                      : "Criar conta"}
                </span>
                <strong>→</strong>
              </button>
            </form>

            <div className="vivi-login-or">
              <span />
              <p>OU</p>
              <span />
            </div>

            <button
              type="button"
              className="vivi-create-account"
              onClick={alternarModo}
            >
              <span className="vivi-user-icon">♙</span>
              <strong>
                {modo === "login" ? "Criar uma conta" : "Voltar para o login"}
              </strong>
            </button>
          </>
        )}


        {!recuperandoSenha && modo === "login" && (
          <section className="vivi-trial-area">
            <span className="vivi-new-label">
              NOVO AQUI?
            </span>

            <a
              className="vivi-whatsapp-button"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="vivi-whatsapp-logo">
                ☎
              </span>

              <span className="vivi-whatsapp-copy">
                <strong>QUERO TESTAR GRÁTIS</strong>

                <small>
                  Receba seu código de convite pelo WhatsApp
                </small>
              </span>

              <span className="vivi-whatsapp-arrow">
                →
              </span>
            </a>
          </section>
        )}

        {!recuperandoSenha && (
          <div
            className="vivi-legal-links"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              margin: "18px 0 4px",
              fontSize: "0.78rem",
            }}
          >
            <button
              type="button"
              onClick={() => setDocumentoLegal("privacidade")}
              style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer", opacity: 0.8 }}
            >
              Política de Privacidade
            </button>
            <span style={{ opacity: 0.45 }}>•</span>
            <button
              type="button"
              onClick={() => setDocumentoLegal("termos")}
              style={{ background: "none", border: 0, padding: 0, color: "inherit", cursor: "pointer", opacity: 0.8 }}
            >
              Termos de Uso
            </button>
          </div>
        )}

        <footer className="vivi-login-benefits">
          <div>
            <span>◇</span>
            <p>
              Seus dados
              <br />
              sempre seguros
            </p>
          </div>

          <i />

          <div>
            <span>▥</span>
            <p>
              Organize suas
              <br />
              finanças
            </p>
          </div>

          <i />

          <div>
            <span>AI</span>
            <p>
              Com inteligência
              <br />
              artificial
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}