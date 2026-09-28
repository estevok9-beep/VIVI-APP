import "./Categorias.css";
import { useState } from "react";
import { supabase } from "../supabase";

const cores = [
  "#00E59A",
  "#18B8FF",
  "#A855F7",
  "#FFC63D",
  "#FF5877",
  "#FF9F43",
  "#64748B",
  "#EC4899"
];

const icones = [
  ["wallet", "Carteira"],
  ["shopping-bag", "Compras"],
  ["wrench", "Serviços"],
  ["trending-up", "Investimentos"],
  ["utensils", "Alimentação"],
  ["car", "Transporte"],
  ["house", "Moradia"],
  ["heart-pulse", "Saúde"],
  ["gamepad-2", "Lazer"],
  ["circle-plus", "Outros"]
];

const emojis = {
  wallet: "💰",
  "shopping-bag": "🛍️",
  wrench: "🔧",
  "trending-up": "📈",
  utensils: "🍽️",
  car: "🚗",
  house: "🏠",
  "heart-pulse": "❤️",
  "gamepad-2": "🎮",
  "circle-plus": "✨"
};

const campo = {
  width: "100%",
  padding: 12,
  border: "1px solid #36678a",
  borderRadius: 10,
  background: "#0b2034",
  color: "#ffffff",
  fontSize: 15
};

const botao = {
  padding: "11px 16px",
  border: 0,
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700
};

export default function Categorias({
  usuario,
  categorias,
  atualizarCategorias
}) {
  const [editando, setEditando] = useState(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("saida");
  const [cor, setCor] = useState(cores[0]);
  const [icone, setIcone] = useState("wallet");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [excluindo, setExcluindo] = useState(null);

  function limpar() {
    setEditando(null);
    setNome("");
    setTipo("saida");
    setCor(cores[0]);
    setIcone("wallet");
    setMensagem("");
  }

  function editar(categoria) {
    setEditando(categoria.id);
    setNome(categoria.nome);
    setTipo(categoria.tipo);
    setCor(categoria.cor || cores[0]);
    setIcone(categoria.icone || "wallet");
    setMensagem("");
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function salvar(evento) {
    evento.preventDefault();

    if (!usuario || salvando) return;

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      setMensagem("Informe o nome da categoria.");
      return;
    }

    if (nomeLimpo.length > 60) {
      setMensagem("Utilize até 60 caracteres.");
      return;
    }

    const duplicada = categorias.some(
      (categoria) =>
        categoria.id !== editando &&
        categoria.tipo === tipo &&
        categoria.nome.toLowerCase() ===
          nomeLimpo.toLowerCase()
    );

    if (duplicada) {
      setMensagem(
        "Já existe uma categoria com esse nome e tipo."
      );
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      let resultado;

      if (editando) {
        resultado = await supabase
          .from("categorias")
          .update({
            nome: nomeLimpo,
            tipo,
            cor,
            icone
          })
          .eq("id", editando)
          .eq("usuario_id", usuario.id)
          .select("id");
      } else {
        resultado = await supabase
          .from("categorias")
          .insert({
            usuario_id: usuario.id,
            nome: nomeLimpo,
            tipo,
            cor,
            icone
          })
          .select("id");
      }

      if (resultado.error) {
        throw resultado.error;
      }

      if (!resultado.data?.length) {
        throw new Error(
          "Nenhuma categoria foi alterada."
        );
      }

      await atualizarCategorias();

      limpar();
      setMensagem(
        "Categoria salva com sucesso!"
      );
    } catch (erro) {
      setMensagem(
        "Erro ao salvar: " + erro.message
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!usuario || !excluindo) return;

    setSalvando(true);
    setMensagem("");

    try {
      const { data, error } = await supabase
        .from("categorias")
        .delete()
        .eq("id", excluindo.id)
        .eq("usuario_id", usuario.id)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Categoria não encontrada."
        );
      }

      await atualizarCategorias();

      if (editando === excluindo.id) {
        limpar();
      }

      setMensagem(
        "Categoria excluída com sucesso."
      );
    } catch (erro) {
      setMensagem(
        "Erro ao excluir: " + erro.message
      );
    } finally {
      setExcluindo(null);
      setSalvando(false);
    }
  }

  return (
    <section style={{
      display: "grid",
      gap: 24
    }}>
      <div className="vivi-bloco">
        <h2>Minhas categorias</h2>
        <p>
          Personalize a organização
          das suas finanças.
        </p>

        {mensagem && (
          <p role="status" style={{
            color: "#57efbe"
          }}>
            {mensagem}
          </p>
        )}

        <form
          onSubmit={salvar}
          style={{
            display: "grid",
            gap: 16,
            maxWidth: 550,
            marginTop: 25
          }}
        >
          <h3 style={{ color: "white" }}>
            {editando
              ? "Editar categoria"
              : "Nova categoria"}
          </h3>

          <label htmlFor="cat-nome">
            Nome
          </label>

          <input
            id="cat-nome"
            style={campo}
            value={nome}
            maxLength={60}
            onChange={(e) =>
              setNome(e.target.value)
            }
            placeholder="Ex.: Combustível"
            required
          />

          <label htmlFor="cat-tipo">
            Tipo
          </label>

          <select
            id="cat-tipo"
            style={campo}
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value)
            }
          >
            <option value="entrada">
              Entrada
            </option>
            <option value="saida">
              Despesa
            </option>
          </select>

          <label>Escolha uma cor</label>

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12
          }}>
            {cores.map((opcao) => (
              <button
                type="button"
                key={opcao}
                aria-label={
                  "Selecionar cor " + opcao
                }
                aria-pressed={cor === opcao}
                onClick={() => setCor(opcao)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: opcao,
                  border:
                    cor === opcao
                      ? "4px solid white"
                      : "3px solid #183248",
                  cursor: "pointer"
                }}
              />
            ))}
          </div>

          <label htmlFor="cat-icone">
            Ícone
          </label>

          <select
            id="cat-icone"
            style={campo}
            value={icone}
            onChange={(e) =>
              setIcone(e.target.value)
            }
          >
            {icones.map(([valor, titulo]) => (
              <option
                key={valor}
                value={valor}
              >
                {emojis[valor]} {titulo}
              </option>
            ))}
          </select>

          <div style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap"
          }}>
            <button
              type="submit"
              disabled={salvando}
              style={{
                ...botao,
                background:
                  "linear-gradient(110deg, #00c58a, #168de0)",
                color: "white"
              }}
            >
              {salvando
                ? "Aguarde..."
                : editando
                  ? "Salvar alterações"
                  : "Criar categoria"}
            </button>

            {editando && (
              <button
                type="button"
                onClick={limpar}
                style={{
                  ...botao,
                  background: "#34465b",
                  color: "white"
                }}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      {["entrada", "saida"].map(
        (grupo) => (
          <div
            className="vivi-bloco"
            key={grupo}
          >
            <h2>
              {grupo === "entrada"
                ? "💚 Categorias de entradas"
                : "💗 Categorias de despesas"}
            </h2>

            {categorias
              .filter((c) => c.tipo === grupo)
              .map((categoria) => (
                <div
                  key={categoria.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    padding: "16px 0",
                    borderBottom:
                      "1px solid #29445c"
                  }}
                >
                  <span style={{
                    display: "grid",
                    placeItems: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    border:
                      "1px solid " +
                      (categoria.cor || "#20bfff"),
                    fontSize: 25
                  }}>
                    {emojis[categoria.icone] || "✨"}
                  </span>

                  <strong style={{
                    flex: 1,
                    minWidth: 100,
                    color: "white"
                  }}>
                    {categoria.nome}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      editar(categoria)
                    }
                    style={{
                      ...botao,
                      background: "#164e76",
                      color: "white"
                    }}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setExcluindo(categoria)
                    }
                    style={{
                      ...botao,
                      background: "#76233e",
                      color: "white"
                    }}
                  >
                    Excluir
                  </button>
                </div>
              ))}
          </div>
        )
      )}

      {excluindo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="excluir-titulo"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "#000b"
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: 420,
            padding: 25,
            border: "1px solid #ff5877",
            borderRadius: 18,
            background: "#102239",
            color: "white"
          }}>
            <h2 id="excluir-titulo">
              Excluir categoria?
            </h2>

            <p>
              Deseja excluir
              {" "}<strong>{excluindo.nome}</strong>?
              Os lançamentos serão preservados,
              mas ficarão sem categoria.
            </p>

            <div style={{
              display: "flex",
              gap: 12
            }}>
              <button
                type="button"
                disabled={salvando}
                onClick={() =>
                  setExcluindo(null)
                }
                style={{
                  ...botao,
                  background: "#34465b",
                  color: "white"
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={salvando}
                onClick={excluir}
                style={{
                  ...botao,
                  background: "#c52b52",
                  color: "white"
                }}
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
