
import { useState } from "react";
import { supabase } from "../supabase";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState("login");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setMensagem("");
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
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password: senha,
          });

        if (error) throw error;

        setMensagem("Login realizado com sucesso!");
      }
    } catch (erro) {
      setMensagem(erro.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main style={{
      maxWidth: 400,
      margin: "60px auto",
      padding: 24,
      fontFamily: "Arial"
    }}>
      <h1>VIVI</h1>
      <h2>
        {modo === "login" ? "Entrar" : "Criar conta"}
      </h2>

      <form onSubmit={enviar}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            display: "block",
            width: "100%",
            padding: 12,
            marginBottom: 12,
            boxSizing: "border-box"
          }}
        />

        <input
          type="password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={6}
          required
          style={{
            display: "block",
            width: "100%",
            padding: 12,
            marginBottom: 12,
            boxSizing: "border-box"
          }}
        />

        <button
          type="submit"
          disabled={carregando}
        >
          {carregando
            ? "Aguarde..."
            : modo === "login"
              ? "Entrar"
              : "Cadastrar"}
        </button>
      </form>

      <p>{mensagem}</p>

      <button
        type="button"
        onClick={() => {
          setModo(
            modo === "login" ? "cadastro" : "login"
          );
          setMensagem("");
        }}
      >
        {modo === "login"
          ? "Criar uma conta"
          : "Já tenho uma conta"}
      </button>
    </main>
  );
}
