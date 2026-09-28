
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [pagina, setPagina] = useState("Início");
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [tipo, setTipo] = useState("saida");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const dinheiro = (numero) =>
    Number(numero).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  // Identifica o usuário conectado
  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const { data, error } =
        await supabase.auth.getUser();

      if (!ativo) return;

      if (error || !data.user) {
        setMensagem("Sessão inválida. Entre novamente.");
        setCarregando(false);
        return;
      }

      setUsuario(data.user);

      const { data: registros, error: erroConsulta } =
        await supabase
          .from("movimentacoes")
          .select("*")
          .eq("usuario_id", data.user.id)
          .order("criado_em", { ascending: false });

      if (!ativo) return;

      if (erroConsulta) {
        setMensagem(
          "Erro ao carregar: " + erroConsulta.message
        );
      } else {
        setMovimentacoes(registros || []);
      }

      setCarregando(false);
    }

    iniciar();

    return () => {
      ativo = false;
    };
  }, []);

  // Atualiza a lista a partir do banco
  async function atualizar() {
    if (!usuario) return;

    const { data, error } = await supabase
      .from("movimentacoes")
      .select("*")
      .eq("usuario_id", usuario.id)
      .order("criado_em", { ascending: false });

    if (error) {
      setMensagem("Erro ao atualizar: " + error.message);
      return;
    }

    setMovimentacoes(data || []);
  }

  // Registra uma entrada ou saída
  async function registrar(evento) {
    evento.preventDefault();

    if (!usuario || salvando) return;

    const numero = Number(valor);

    if (
      !Number.isFinite(numero) ||
      numero <= 0 ||
      !descricao.trim()
    ) {
      setMensagem(
        "Informe uma descrição e um valor válido."
      );
      return;
    }

    setSalvando(true);
    setMensagem("");

    const { error } = await supabase
      .from("movimentacoes")
      .insert({
        usuario_id: usuario.id,
        tipo,
        descricao: descricao.trim(),
        valor: numero
      });

    if (error) {
      setMensagem(
        "Erro ao salvar: " + error.message
      );
      setSalvando(false);
      return;
    }

    await atualizar();

    setValor("");
    setDescricao("");
    setSalvando(false);
    setPagina("Início");
  }

  // Calcula os totais
  const entradas = movimentacoes
    .filter((m) => m.tipo === "entrada")
    .reduce(
      (total, m) => total + Number(m.valor),
      0
    );

  const saidas = movimentacoes
    .filter((m) => m.tipo === "saida")
    .reduce(
      (total, m) => total + Number(m.valor),
      0
    );

  const saldo = entradas - saidas;

  const cartao = {
    background: "#ffffff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15
  };

  if (carregando) {
    return <p>Carregando suas finanças...</p>;
  }

  if (!usuario) {
    return <p>{mensagem}</p>;
  }

  return (
    <main style={{
      maxWidth: 650,
      margin: "auto",
      padding: 20,
      fontFamily: "Arial",
      color: "#18382d"
    }}>
      <h1>VIVI</h1>
      <p>Sua assistente financeira</p>
      <small>{usuario.email}</small>

      <nav style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        margin: "25px 0"
      }}>
        {[
          "Início",
          "Movimentações",
          "Relatórios",
          "Vivi IA"
        ].map((item) => (
          <button
            key={item}
            onClick={() => {
              setPagina(item);
              setMensagem("");
            }}
            style={{
              padding: 12,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              background:
                pagina === item ? "#238457" : "#eee",
              color:
                pagina === item ? "white" : "#18382d"
            }}
          >
            {item}
          </button>
        ))}
      </nav>

      {mensagem && (
        <p role="alert" style={{ color: "#b42318" }}>
          {mensagem}
        </p>
      )}

      {pagina === "Início" && (
        <>
          <section style={{
            ...cartao,
            background: "#173c30",
            color: "white"
          }}>
            <p>Saldo disponível</p>
            <h1>{dinheiro(saldo)}</h1>
            <p>Entradas: {dinheiro(entradas)}</p>
            <p>Saídas: {dinheiro(saidas)}</p>
          </section>

          <h2>Movimentações recentes</h2>

          {movimentacoes.length === 0 && (
            <p>Nenhuma movimentação registrada.</p>
          )}

          {movimentacoes.map((m) => (
            <div key={m.id} style={cartao}>
              <strong>{m.descricao}</strong>
              <p>{m.data}</p>
              <strong style={{
                color:
                  m.tipo === "entrada"
                    ? "green"
                    : "#bd4939"
              }}>
                {m.tipo === "entrada" ? "+" : "-"}
                {dinheiro(m.valor)}
              </strong>
            </div>
          ))}
        </>
      )}

      {pagina === "Movimentações" && (
        <form onSubmit={registrar} style={cartao}>
          <h2>Novo lançamento</h2>

          <label>Tipo</label>
          <select
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value)
            }
            style={{
              display: "block",
              padding: 10,
              margin: "10px 0"
            }}
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>

          <label>Descrição</label>
          <input
            value={descricao}
            onChange={(e) =>
              setDescricao(e.target.value)
            }
            placeholder="Ex.: Supermercado"
            required
            style={{
              display: "block",
              padding: 10,
              margin: "10px 0"
            }}
          />

          <label>Valor em reais</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={valor}
            onChange={(e) =>
              setValor(e.target.value)
            }
            required
            style={{
              display: "block",
              padding: 10,
              margin: "10px 0"
            }}
          />

          <button
            type="submit"
            disabled={salvando}
            style={{
              background: "#238457",
              color: "white",
              padding: 12,
              border: "none",
              borderRadius: 8
            }}
          >
            {salvando
              ? "Salvando..."
              : "Registrar movimentação"}
          </button>
        </form>
      )}

      {pagina === "Relatórios" && (
        <section style={cartao}>
          <h2>Resumo financeiro</h2>
          <p>Entradas: {dinheiro(entradas)}</p>
          <p>Despesas: {dinheiro(saidas)}</p>
          <h3>Saldo: {dinheiro(saldo)}</h3>
        </section>
      )}

      {pagina === "Vivi IA" && (
        <section style={cartao}>
          <h2>Converse com a Vivi</h2>
          <p>
            A inteligência artificial será
            integrada em uma próxima etapa.
          </p>
        </section>
      )}
    </main>
  );
}
