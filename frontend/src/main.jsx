import "./registerPWA.js";
import vivLogo from "./assets/viv-logo.png";



import React, {

  useCallback,

  useEffect,

  useState

} from "react";

import ReactDOM from "react-dom/client";

import App from "./App.jsx";

import AuthForm from "./auth/AuthForm.jsx";

import AdminPanel from "./Admin/AdminPanel.jsx";
import Configuracoes from "./configuracoes/Configuracoes.jsx";
import Assinaturas from "./assinaturas/Assinaturas.jsx";
import VivIA from "./vivia/VivIA.jsx";

import { supabase } from "./supabase.js";

import "./index.css";
import "./VivSidebar.css";

// ==========================================

// TELA DE ATIVAÇÃO DE CONVITES

// ==========================================

function TelaConvite({

  acesso,

  atualizarAcesso,

  sair

}) {

  const [codigo, setCodigo] = useState("");

  const [ativando, setAtivando] = useState(false);

  const [erro, setErro] = useState("");

  const possuiConviteAnterior =

    Boolean(acesso?.expira_em);

  async function ativarConvite(evento) {

    evento.preventDefault();

    if (ativando || !codigo.trim()) {

      return;

    }

    setAtivando(true);

    setErro("");

    try {

      const { error } = await supabase.rpc(

        "vivi_ativar_convite",

        {

          p_codigo: codigo

            .trim()

            .toUpperCase()

        }

      );

      if (error) {

        throw error;

      }

      await atualizarAcesso();

    } catch (error) {

      setErro(

        "Não foi possível ativar o convite: " +

        error.message

      );

    } finally {

      setAtivando(false);

    }

  }

  return (

    <main

      style={{

        minHeight: "100vh",

        display: "grid",

        placeItems: "center",

        padding: 20,

        background: "#081b2d",

        color: "#ffffff"

      }}

    >

      <section

        style={{

          width: "100%",

          maxWidth: 480,

          padding: 32,

          borderRadius: 20,

          border: "1px solid #28546a",

          background: "#102339",

          boxShadow: "0 20px 60px #0005"

        }}

      >

        <h1

          style={{

            marginBottom: 5,

            color: "#00e59a",

            fontSize: 38

          }}

        >

          Viv

        </h1>

        <p

          style={{

            color: "#9eb6c8",

            marginTop: 0

          }}

        >

          CONTROLE FINANCEIRO

        </p>

        <div

          style={{

            height: 3,

            width: 65,

            background: "#00e59a",

            margin: "25px 0"

          }}

        />

        <h2>

          {possuiConviteAnterior

            ? "Seu acesso está encerrado"

            : "Ative seu convite"}

        </h2>

        <p

          style={{

            color: "#b4cada",

            lineHeight: 1.7

          }}

        >

          {possuiConviteAnterior

            ? "O prazo do seu convite terminou ou ele foi revogado. Entre em contato com o administrador da Viv."

            : "Informe o código recebido para ativar seu período de acesso à plataforma."}

        </p>

        {possuiConviteAnterior &&

          acesso?.expira_em && (

            <div

              style={{

                margin: "20px 0",

                padding: 15,

                borderRadius: 10,

                background: "#4a2939",

                color: "#ffb3c4"

              }}

            >

              Vencimento:{" "}

              {new Date(

                acesso.expira_em

              ).toLocaleString("pt-BR")}

            </div>

          )}

        {!possuiConviteAnterior && (

          <form

            onSubmit={ativarConvite}

            style={{

              display: "grid",

              gap: 15,

              marginTop: 25

            }}

          >

            <label

              htmlFor="codigo-convite"

              style={{

                fontWeight: 700

              }}

            >

              Código do convite

            </label>

            <input

              id="codigo-convite"

              type="text"

              value={codigo}

              onChange={(evento) => {

                setCodigo(

                  evento.target.value

                    .toUpperCase()

                );

              }}

              placeholder="Digite seu código"

              autoComplete="off"

              required

              style={{

                width: "100%",

                boxSizing: "border-box",

                padding: 15,

                borderRadius: 10,

                border:

                  "1px solid #36839b",

                background: "#071929",

                color: "#ffffff",

                fontSize: 16,

                letterSpacing: 1

              }}

            />

            {erro && (

              <p

                role="alert"

                style={{

                  padding: 12,

                  borderRadius: 8,

                  background: "#57283a",

                  color: "#ffb1c2"

                }}

              >

                {erro}

              </p>

            )}

            <button

              type="submit"

              disabled={ativando}

              style={{

                padding: 15,

                border: "none",

                borderRadius: 10,

                background: "#00bb88",

                color: "#05251b",

                fontWeight: 800,

                cursor: ativando

                  ? "wait"

                  : "pointer",

                opacity: ativando

                  ? 0.6

                  : 1

              }}

            >

              {ativando

                ? "Ativando convite..."

                : "Ativar convite"}

            </button>

          </form>

        )}

        <button

          type="button"

          onClick={sair}

          style={{

            display: "block",

            marginTop: 25,

            padding: "12px 18px",

            border:

              "1px solid #456780",

            borderRadius: 9,

            background: "transparent",

            color: "#ffffff",

            cursor: "pointer"

          }}

        >

          Sair da conta

        </button>

      </section>

    </main>

  );

}

// ==========================================
// SPLASH VIV — LOGO FIXA + ARCO SEMPRE ANIMADO
// ==========================================
function SplashViv() {
  return (
    <main className="viv-launch-splash" aria-label="Abrindo VIV">
      <style>{`
        .viv-launch-splash {
          min-height: 100vh;
          min-height: 100dvh;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 48%, rgba(16,111,200,.16), transparent 32%),
            radial-gradient(circle at 50% 55%, rgba(37,229,203,.08), transparent 42%),
            #050d19;
        }

        .viv-launch-logo {
          position: relative;
          width: min(68vw, 290px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          filter: drop-shadow(0 0 20px rgba(37,229,203,.16));
        }

        .viv-launch-logo img {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .viv-launch-spinner {
          position: absolute;
          z-index: 3;
          inset: 2%;
          border-radius: 50%;
          border: 4px solid transparent;
          border-top-color: #ffffff;
          border-right-color: #0fe7ff;
          border-bottom-color: #246dff;
          box-shadow:
            0 0 8px rgba(15,231,255,.9),
            inset 0 0 8px rgba(15,231,255,.35);
          animation-name: vivSpinForcado;
          animation-duration: .85s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          transform-origin: 50% 50%;
          will-change: transform;
          pointer-events: none;
        }

        .viv-launch-spinner::after {
          content: "";
          position: absolute;
          width: 9px;
          height: 9px;
          right: 11%;
          top: 10%;
          border-radius: 50%;
          background: #ffffff;
          box-shadow:
            0 0 8px #0fe7ff,
            0 0 18px #246dff;
        }

        @keyframes vivSpinForcado {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div className="viv-launch-logo">
        <img src={vivLogo} alt="VIV IA Financeira" />
        <span className="viv-launch-spinner" aria-hidden="true" />
      </div>
    </main>
  );
}

// ==========================================

// APLICATIVO PRINCIPAL

// ==========================================

function MenuIcon({ name }) {
  const paths = {
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    admin: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    settings: <><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 2-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.05 1.56V21h-2.82v-.1a1.7 1.7 0 0 0-1.05-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2-2 .06-.06A1.7 1.7 0 0 0 7.4 15a1.7 1.7 0 0 0-1.56-1.05H5v-2.82h.84A1.7 1.7 0 0 0 7.4 10a1.7 1.7 0 0 0-.34-1.88L7 8.06l2-2 .06.06A1.7 1.7 0 0 0 11 6.46a1.7 1.7 0 0 0 1.05-1.56V4h2.82v.9A1.7 1.7 0 0 0 15.92 6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2 2-.06.06A1.7 1.7 0 0 0 19.46 10a1.7 1.7 0 0 0 1.56 1.05H22v2.82h-.98A1.7 1.7 0 0 0 19.4 15Z" transform="translate(-.5 -.5)" /></>,
    nova: <><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" /></>,
    historico: <><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="6" cy="7" r="1" /></>,
    categorias: <><path d="m3 12 9-9h8v8l-9 9-8-8Z" /><circle cx="16" cy="8" r="1" /></>,
    metas: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    relatorios: <><path d="M4 20V10M10 20V4M16 20v-8M22 20V7" /></>,
    ia: <><path d="M12 3a6 6 0 0 0-6 6v1a4 4 0 0 0-2 3.5A4.5 4.5 0 0 0 8.5 18H10v3h4v-3h1.5a4.5 4.5 0 0 0 4.5-4.5A4 4 0 0 0 18 10V9a6 6 0 0 0-6-6Z" /><path d="M9 10h.01M15 10h.01M9.5 14c1.5 1 3.5 1 5 0" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></>,
    moon: <><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" /></>
  };
  return <svg className="viv-nav-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Viv() {

  const [menuExpandido, setMenuExpandido] = useState(() => window.innerWidth > 700);
  const [paginaFinanceira, setPaginaFinanceira] = useState("inicio");
  const [buscaTopo, setBuscaTopo] = useState("");
  const [nomeTopo, setNomeTopo] = useState("");
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem("viv-tema") || "escuro";
    } catch {
      return "escuro";
    }
  });
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [usuario, setUsuario] =

    useState(null);

  const [

    administrador,

    setAdministrador

  ] = useState(false);

  const [

    autorizado,

    setAutorizado

  ] = useState(false);

  const [acesso, setAcesso] =

    useState(null);

  const [bloqueado, setBloqueado] = useState(false);

  const [tela, setTela] =

    useState("financeiro");

  const [

    carregando,

    setCarregando

  ] = useState(true);

  const [splashMinimaConcluida, setSplashMinimaConcluida] = useState(false);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    const timerSplash = window.setTimeout(() => {
      setSplashMinimaConcluida(true);
    }, 2000);

    return () => window.clearTimeout(timerSplash);
  }, []);

  const [

    verificando,

    setVerificando

  ] = useState(false);

  const [

    erroAcesso,

    setErroAcesso

  ] = useState("");

  // ========================================

  // CONSULTAR PERMISSÃO NO SUPABASE

  // ========================================

  const verificarAcesso = useCallback(

    async () => {

      setVerificando(true);

      try {

        const { data, error } =

          await supabase.rpc(

            "vivi_meu_acesso"

          );

        if (error) {

          throw error;

        }

        const resultado =

          data?.[0] || null;

        if (!resultado) {

          throw new Error(

            "O servidor não retornou informações de acesso."

          );

        }

        const admin =

          resultado.administrador === true;

        // O RPC antigo pode não conhecer o bloqueio novo.

        // A função de segurança do banco é a autoridade final.

        const { data: acessoValido, error: erroValidade } =

          await supabase.rpc("vivi_acesso_valido");

        if (erroValidade) throw erroValidade;

        const { data: estaBloqueado, error: erroBloqueio } =

          await supabase.rpc("vivi_meu_bloqueio");

        if (erroBloqueio) throw erroBloqueio;

        const permitido = resultado.autorizado === true && acessoValido === true && estaBloqueado !== true;

        setBloqueado(estaBloqueado === true);

        setAcesso(resultado);

        setAdministrador(admin);

        setAutorizado(permitido);

        setErroAcesso("");

        if (!admin) {

          setTela("financeiro");

        }

        return permitido;

      } catch (error) {

        setAdministrador(false);

        setAutorizado(false);

        setBloqueado(false);

        setErroAcesso(

          "Erro ao verificar acesso: " +

          error.message

        );

        return false;

      } finally {

        setVerificando(false);

      }

    },

    []

  );

  // ========================================

  // AUTENTICAÇÃO

  // ========================================

  useEffect(() => {

    let ativo = true;

    let sequencia = 0;

    async function verificarSessao() {

      const chamada = ++sequencia;

      setCarregando(true);

      try {

        const { data, error } =

          await supabase.auth.getUser();

        if (

          !ativo ||

          chamada !== sequencia

        ) {

          return;

        }

        if (error || !data.user) {

          setUsuario(null);

          setAdministrador(false);

          setAutorizado(false);

          setBloqueado(false);

          setAcesso(null);

          setErroAcesso("");

          setTela("financeiro");

          return;

        }

        setUsuario(data.user);

        await verificarAcesso();

      } catch (error) {

        if (ativo) {

          setErroAcesso(

            "Erro de autenticação: " +

            error.message

          );

          setAutorizado(false);

        }

      } finally {

        if (

          ativo &&

          chamada === sequencia

        ) {

          setCarregando(false);

        }

      }

    }

    verificarSessao();

    const { data: listener } =

      supabase.auth.onAuthStateChange(

        (event) => {

          if (event === "PASSWORD_RECOVERY") {

            setRecuperandoSenha(true);

            setCarregando(false);

            return;

          }

          // Evita executar chamadas do Supabase

          // diretamente dentro do callback.

          setTimeout(() => {

            if (ativo) {

              verificarSessao();

            }

          }, 0);

        }

      );

    // Revalidação periódica do convite.

    const intervalo = setInterval(

      () => {

        verificarAcesso();

      },

      60000

    );

    // Revalidar quando o usuário

    // retornar à aba do aplicativo.

    function verificarAoRetornar() {

      if (

        document.visibilityState ===

        "visible"

      ) {

        verificarAcesso();

      }

    }

    document.addEventListener(

      "visibilitychange",

      verificarAoRetornar

    );

    return () => {

      ativo = false;

      sequencia++;

      clearInterval(intervalo);

      document.removeEventListener(

        "visibilitychange",

        verificarAoRetornar

      );

      listener.subscription.unsubscribe();

    };

  }, [verificarAcesso]);

  // ========================================

  // TEMA DO APLICATIVO

  // ========================================

  useEffect(() => {
    document.documentElement.setAttribute("data-viv-theme", tema);

    try {
      localStorage.setItem("viv-tema", tema);
    } catch {
      // O tema continua funcionando mesmo se o navegador bloquear o armazenamento.
    }
  }, [tema]);

  // ========================================

  // NOME DO USUÁRIO NO TOPO

  // ========================================

  useEffect(() => {
    let ativo = true;

    async function carregarNomeTopo() {
      if (!usuario?.id) {
        if (ativo) setNomeTopo("");
        return;
      }

      const nomeFallback =
        usuario.user_metadata?.nome ||
        usuario.user_metadata?.name ||
        usuario.email?.split("@")[0] ||
        "Usuário";

      try {
        const { data, error } = await supabase
          .from("viv_perfis")
          .select("nome")
          .eq("id", usuario.id)
          .maybeSingle();

        if (!ativo) return;

        if (error) {
          setNomeTopo(nomeFallback);
          return;
        }

        setNomeTopo(data?.nome?.trim() || nomeFallback);
      } catch {
        if (ativo) setNomeTopo(nomeFallback);
      }
    }

    carregarNomeTopo();

    return () => {
      ativo = false;
    };
  }, [usuario]);

  // ========================================

  // SAIR DA CONTA

  // ========================================

  async function sair() {

    const { error } =

      await supabase.auth.signOut();

    if (error) {

      alert(

        "Erro ao sair: " +

        error.message

      );

    }

  }

  // ========================================

  // TELAS DE CARREGAMENTO

  // ========================================

  if (carregando || !splashMinimaConcluida) {
    return <SplashViv />;
  }

  // ========================================

  // LOGIN — Viv 2.5 NEON GLASS

  // ========================================

  if (recuperandoSenha || !usuario) {

    return <AuthForm />;
  }





  // ========================================

  // ERRO NA CONSULTA DE ACESSO

  // ========================================

  if (erroAcesso) {

    return (

      <main

        style={{

          minHeight: "100vh",

          display: "grid",

          placeItems: "center",

          padding: 20,

          background: "#081b2d",

          color: "#ffffff"

        }}

      >

        <section

          style={{

            maxWidth: 460,

            padding: 30,

            borderRadius: 16,

            background: "#102339"

          }}

        >

          <h2>

            Não foi possível verificar

            seu acesso.

          </h2>

          <p

            style={{

              lineHeight: 1.6

            }}

          >

            {erroAcesso}

          </p>

          <button

            type="button"

            onClick={verificarAcesso}

            disabled={verificando}

          >

            {verificando

              ? "Verificando..."

              : "Tentar novamente"}

          </button>

          <button

            type="button"

            onClick={sair}

            style={{

              marginLeft: 10

            }}

          >

            Sair da conta

          </button>

        </section>

      </main>

    );

  }

  // ========================================

  // CONVITE OBRIGATÓRIO

  // ========================================

  if (bloqueado) {

    return (

      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#081b2d", color: "white", padding: 20 }}>

        <section style={{ maxWidth: 480, background: "#102339", padding: 30, borderRadius: 16 }}>

          <h1 style={{ color: "#ff8496" }}>Acesso temporariamente bloqueado</h1>

          <p>Entre em contato com o administrador da Viv. Seus dados financeiros foram preservados.</p>

          <button type="button" onClick={verificarAcesso} disabled={verificando}>Verificar novamente</button>{" "}

          <button type="button" onClick={sair}>Sair da conta</button>

        </section>

      </main>

    );

  }



  if (!autorizado) {

    return (

      <TelaConvite

        acesso={acesso}

        atualizarAcesso={

          verificarAcesso

        }

        sair={sair}

      />

    );

  }

  // ========================================

  // APLICATIVO LIBERADO

  // ========================================

  const nomeExibicao =
    nomeTopo ||
    usuario?.user_metadata?.nome ||
    usuario?.user_metadata?.name ||
    usuario?.email?.split("@")[0] ||
    "Usuário";

  const inicialUsuario =
    nomeExibicao.trim().charAt(0).toUpperCase() || "V";

  const dataTopo = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());

  function abrirHistoricoPelaBusca(evento) {
    evento.preventDefault();

    if (!buscaTopo.trim()) {
      return;
    }

    setTela("financeiro");
    setPaginaFinanceira("historico");
  }

  const notificacoes = [];

  if (acesso?.expira_em) {
    const vencimento = new Date(acesso.expira_em);
    const agora = new Date();
    const diferenca = vencimento.getTime() - agora.getTime();
    const diasRestantes = Math.ceil(diferenca / 86400000);

    if (diasRestantes >= 0 && diasRestantes <= 7) {
      notificacoes.push({
        id: "acesso-vencimento",
        titulo: "Acesso próximo do vencimento",
        texto:
          diasRestantes === 0
            ? "Seu período de acesso vence hoje."
            : `Seu período de acesso vence em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}.`,
        tipo: "alerta"
      });
    }
  }

  if (administrador) {
    notificacoes.push({
      id: "admin",
      titulo: "VIV Admin ativo",
      texto: "Seu acesso administrativo está disponível.",
      tipo: "info"
    });
  }

  if (notificacoes.length === 0) {
    notificacoes.push({
      id: "status",
      titulo: "Tudo certo por aqui",
      texto: "Não há avisos importantes no momento.",
      tipo: "ok"
    });
  }

  const possuiAviso =
    notificacoes.some((item) => item.tipo === "alerta");

  function alternarTema() {
    setTema((temaAtual) =>
      temaAtual === "escuro" ? "claro" : "escuro"
    );
  }

  return (
    <div className="viv-shell">
      <aside
        className={`viv-sidebar ${menuExpandido ? "viv-sidebar--expanded" : ""}`}
        aria-label="Menu principal"
      >
        <div className="viv-sidebar-brand">
          <div className="viv-brand-logo">
            <img src={vivLogo} alt="VIV" />
          </div>

          <div className="viv-sidebar-label viv-brand-copy">
            <span className="viv-brand-name">VIV</span>
            <small>CONTROLE FINANCEIRO</small>
          </div>

          <button
            type="button"
            className="viv-menu-toggle"
            aria-label={menuExpandido ? "Recolher menu" : "Expandir menu"}
            aria-expanded={menuExpandido}
            onClick={() => setMenuExpandido(!menuExpandido)}
          >
            <MenuIcon name="menu" />
          </button>
        </div>

        <nav className="viv-sidebar-nav" aria-label="Navegação">
          {[
            ["inicio", "dashboard", "Painel financeiro"],
            ["nova", "nova", "Nova transação"],
            ["historico", "historico", "Transações"],
            ["categorias", "categorias", "Categorias"],
            ["metas", "metas", "Metas financeiras"],
            ["relatorios", "relatorios", "Relatórios"]
          ].map(([id, icone, rotulo]) => (
            <button
              key={id}
              type="button"
              className={`viv-nav-item ${
                tela === "financeiro" && paginaFinanceira === id
                  ? "viv-nav-item--active"
                  : ""
              }`}
              title={rotulo}
              aria-label={rotulo}
              aria-current={
                tela === "financeiro" && paginaFinanceira === id
                  ? "page"
                  : undefined
              }
              onClick={() => {
                setTela("financeiro");
                setPaginaFinanceira(id);
              }}
            >
              <MenuIcon name={icone} />
              <span className="viv-sidebar-label">{rotulo}</span>
            </button>
          ))}

          <button
            type="button"
            className={`viv-nav-item ${
              tela === "vivia" ? "viv-nav-item--active" : ""
            }`}
            title="VIV IA"
            aria-label="VIV IA"
            aria-current={tela === "vivia" ? "page" : undefined}
            onClick={() => setTela("vivia")}
          >
            <MenuIcon name="ia" />
            <span className="viv-sidebar-label">VIV IA</span>
          </button>

          <button
            type="button"
            className={`viv-nav-item ${
              tela === "assinaturas" ? "viv-nav-item--active" : ""
            }`}
            title="Assinaturas"
            aria-label="Assinaturas"
            onClick={() => setTela("assinaturas")}
          >
            <MenuIcon name="admin" />
            <span className="viv-sidebar-label">Assinaturas</span>
          </button>

          {administrador && (
            <button
              type="button"
              className={`viv-nav-item ${
                tela === "admin" ? "viv-nav-item--active" : ""
              }`}
              title="VIV Admin"
              aria-label="VIV Admin"
              aria-current={tela === "admin" ? "page" : undefined}
              onClick={() => setTela("admin")}
            >
              <MenuIcon name="admin" />
              <span className="viv-sidebar-label">VIV Admin</span>
            </button>
          )}
        </nav>

        <div className="viv-sidebar-label viv-sidebar-card">
          <div className="viv-sidebar-card-head">
            <img src={vivLogo} alt="" aria-hidden="true" />
            <div>
              <strong>VIV</strong>
              <small>Controle Financeiro</small>
            </div>
          </div>
          <p>Organize hoje um futuro melhor.</p>
        </div>

        <div className="viv-sidebar-bottom">
          <button
            type="button"
            className={`viv-nav-item ${
              tela === "configuracoes" ? "viv-nav-item--active" : ""
            }`}
            title="Configurações"
            aria-label="Configurações"
            aria-current={tela === "configuracoes" ? "page" : undefined}
            onClick={() => setTela("configuracoes")}
          >
            <MenuIcon name="settings" />
            <span className="viv-sidebar-label">Configurações</span>
          </button>

          <button
            type="button"
            className="viv-nav-item viv-nav-exit"
            title="Sair"
            aria-label="Sair"
            onClick={sair}
          >
            <MenuIcon name="logout" />
            <span className="viv-sidebar-label">Sair</span>
          </button>
        </div>
      </aside>

      <div className="viv-shell-main">
        <header className="viv-topbar">
          <button
            type="button"
            className="viv-topbar-menu"
            aria-label={menuExpandido ? "Recolher menu" : "Expandir menu"}
            onClick={() => setMenuExpandido(!menuExpandido)}
          >
            <MenuIcon name="menu" />
          </button>

          <form
            className="viv-topbar-search"
            role="search"
            onSubmit={abrirHistoricoPelaBusca}
          >
            <MenuIcon name="search" />
            <input
              type="search"
              value={buscaTopo}
              onChange={(evento) => setBuscaTopo(evento.target.value)}
              placeholder="Buscar transações, categorias ou descrições..."
              aria-label="Buscar transações, categorias ou descrições"
            />
          </form>

          <div className="viv-topbar-actions">
            <button
              type="button"
              className="viv-topbar-icon viv-topbar-sun"
              aria-label={
                tema === "escuro"
                  ? "Ativar tema claro"
                  : "Ativar tema escuro"
              }
              title={
                tema === "escuro"
                  ? "Ativar tema claro"
                  : "Ativar tema escuro"
              }
              aria-pressed={tema === "claro"}
              onClick={alternarTema}
            >
              <MenuIcon name={tema === "escuro" ? "sun" : "moon"} />
            </button>

            <div className="viv-notification-wrap">
              <button
                type="button"
                className={`viv-topbar-icon viv-topbar-bell ${
                  notificacoesAbertas ? "viv-topbar-icon--active" : ""
                }`}
                aria-label="Notificações"
                title="Notificações"
                aria-expanded={notificacoesAbertas}
                aria-controls="viv-notification-panel"
                onClick={() =>
                  setNotificacoesAbertas((aberta) => !aberta)
                }
              >
                <MenuIcon name="bell" />
                {possuiAviso && <span className="viv-notification-dot" />}
              </button>

              {notificacoesAbertas && (
                <div
                  id="viv-notification-panel"
                  className="viv-notification-panel"
                  role="dialog"
                  aria-label="Central de notificações"
                >
                  <div className="viv-notification-header">
                    <div>
                      <strong>Notificações</strong>
                      <span>Central VIV</span>
                    </div>

                    <button
                      type="button"
                      className="viv-notification-close"
                      aria-label="Fechar notificações"
                      onClick={() => setNotificacoesAbertas(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="viv-notification-list">
                    {notificacoes.map((item) => (
                      <div
                        key={item.id}
                        className={`viv-notification-item viv-notification-item--${item.tipo}`}
                      >
                        <span className="viv-notification-status">
                          {item.tipo === "alerta"
                            ? "!"
                            : item.tipo === "ok"
                              ? "✓"
                              : "i"}
                        </span>

                        <div>
                          <strong>{item.titulo}</strong>
                          <p>{item.texto}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="viv-notification-refresh"
                    onClick={async () => {
                      await verificarAcesso();
                    }}
                    disabled={verificando}
                  >
                    {verificando
                      ? "Verificando..."
                      : "Atualizar notificações"}
                  </button>
                </div>
              )}
            </div>

            <div className="viv-topbar-profile">
              <div className="viv-topbar-avatar" aria-hidden="true">
                {inicialUsuario}
              </div>

              <div className="viv-topbar-user">
                <strong>{nomeExibicao}</strong>
                <span>{administrador ? "Administrador" : "Usuário"}</span>
              </div>
            </div>
          </div>
        </header>

        {tela === "financeiro" && paginaFinanceira === "inicio" && (
          <div className="viv-topbar-date" aria-label={`Data atual: ${dataTopo}`}>
            <span className="viv-topbar-date-icon">▣</span>
            <span>{dataTopo}</span>
          </div>
        )}

        <main className="viv-shell-content" id="conteudo-principal">
          {tela === "configuracoes" ? (
            <Configuracoes usuario={usuario} />
          ) : tela === "vivia" ? (
            <VivIA />
          ) : tela === "assinaturas" ? (
            <Assinaturas />
          ) : tela === "admin" && administrador ? (
            <AdminPanel />
          ) : (
            <App
              pagina={paginaFinanceira}
              onPaginaChange={setPaginaFinanceira}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ==========================================

// INICIALIZAÇÃO

// ==========================================

ReactDOM.createRoot(

  document.getElementById("root")

).render(

  <React.StrictMode>

    <Viv />

  </React.StrictMode>

);
