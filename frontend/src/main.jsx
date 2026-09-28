
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import AuthForm from "./auth/AuthForm.jsx";
import AdminPanel from "./Admin/AdminPanel.jsx";
import { supabase } from "./supabase.js";
import "./index.css";

function Vivi() {
  const [usuario, setUsuario] = useState(null);
  const [administrador, setAdministrador] = useState(false);
  const [tela, setTela] = useState("financeiro");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      setCarregando(true);

      const { data, error } =
        await supabase.auth.getUser();

      if (!ativo) return;

      if (error || !data.user) {
        setUsuario(null);
        setAdministrador(false);
        setTela("financeiro");
        setCarregando(false);
        return;
      }

      setUsuario(data.user);

      const { data: perfil, error: erroPerfil } =
        await supabase
          .from("vivi_admins")
          .select("usuario_id")
          .eq("usuario_id", data.user.id)
          .maybeSingle();

      if (!ativo) return;

      if (erroPerfil) {
        console.error(
          "Erro ao consultar administrador:",
          erroPerfil.message
        );
      }

      setAdministrador(!erroPerfil && Boolean(perfil));
      setCarregando(false);
    }

    verificarSessao();

    const { data: listener } =
      supabase.auth.onAuthStateChange(() => {
        verificarSessao();
      });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function sair() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Erro ao sair: " + error.message);
    }
  }

  if (carregando) {
    return <p>Carregando Vivi...</p>;
  }

  if (!usuario) {
    return <AuthForm />;
  }

  return (
    <>
      <header style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        padding: 15,
        background: "#173c30"
      }}>
        <button
          onClick={() => setTela("financeiro")}
        >
          Painel financeiro
        </button>

        {administrador && (
          <button
            onClick={() => setTela("admin")}
          >
            Vivi Admin
          </button>
        )}

        <button onClick={sair}>
          Sair da conta
        </button>
      </header>

      {tela === "admin" && administrador
        ? <AdminPanel />
        : <App />
      }
    </>
  );
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <Vivi />
  </React.StrictMode>
);
