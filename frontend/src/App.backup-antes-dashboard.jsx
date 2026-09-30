
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Categorias from "./categorias/Categorias";
import Relatorios from "./relatorios/Relatorios";
import Metas from "./metas/Metas";
import "./App.css";

const moeda = (valor) =>
  Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function formatarData(data) {
  if (!data) return "Sem data";

  const partes = data.slice(0, 10).split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : data;
}

function Lista({ registros, categorias }) {
  if (!registros.length) {
    return (
      <p>Nenhuma movimentação encontrada.</p>
    );
  }

  return (
    <div className="vivi-lista">
      {registros.map((movimentacao) => {
        const categoria = categorias.find(
          (item) =>
            item.id === movimentacao.categoria_id
        );

        return (
          <div
            className="vivi-transacao"
            key={movimentacao.id}
          >
            <div
              className={
                "vivi-transacao-icone " +
                movimentacao.tipo
              }
            >
              {movimentacao.tipo === "entrada"
                ? "↗"
                : "↘"}
            </div>

            <div className="vivi-transacao-info">
              <strong>
                {movimentacao.descricao}
              </strong>

              <small>
                {formatarData(movimentacao.data)}
              </small>

              <small
                style={{
                  display: "block",
                  marginTop: 5,
                  color:
                    categoria?.cor || "#a7bace"
                }}
              >
                {categoria
                  ? "● " + categoria.nome
                  : "Sem categoria"}
              </small>
            </div>

            <strong
              className={
                movimentacao.tipo === "entrada"
                  ? "vivi-valor-entrada"
                  : "vivi-valor-saida"
              }
            >
              {movimentacao.tipo === "entrada"
                ? "+"
                : "-"}
              {moeda(movimentacao.valor)}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

export default function App({ pagina = "inicio", onPaginaChange }) {
  const [usuario, setUsuario] = useState(null);
  const [nomePerfil, setNomePerfil] = useState("");
  const [movimentacoes, setMovimentacoes] =
    useState([]);
  const [categorias, setCategorias] =
    useState([]);

  const [categoriaId, setCategoriaId] =
    useState("");
  const setPagina = onPaginaChange || (() => { });

  const [tipo, setTipo] = useState("saida");
  const [descricao, setDescricao] =
    useState("");
  const [valor, setValor] = useState("");
  const [busca, setBusca] = useState("");

  const [mensagem, setMensagem] =
    useState("");
  const [carregando, setCarregando] =
    useState(true);
  const [salvando, setSalvando] =
    useState(false);

  // Carregamento inicial
  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const { data, error } =
        await supabase.auth.getUser();

      if (!ativo) return;

      if (error || !data.user) {
        setMensagem(
          "Não foi possível validar sua sessão."
        );
        setCarregando(false);
        return;
      }

      const usuarioAtual = data.user;
      setUsuario(usuarioAtual);

      const [
        resultadoCategorias,
        resultadoMovimentacoes,
        resultadoPerfil
      ] = await Promise.all([
        supabase
          .from("categorias")
          .select("id, nome, tipo, cor, icone")
          .eq("usuario_id", usuarioAtual.id)
          .order("nome"),

        supabase
          .from("movimentacoes")
          .select("*")
          .eq("usuario_id", usuarioAtual.id)
          .order("criado_em", {
            ascending: false
          }),

        supabase
          .from("viv_perfis")
          .select("nome")
          .eq("id", usuarioAtual.id)
          .maybeSingle()
      ]);

      if (!ativo) return;

      if (!resultadoPerfil.error) {
        setNomePerfil(resultadoPerfil.data?.nome?.trim() || "");
      }

      if (resultadoCategorias.error) {
        setMensagem(
          "Erro nas categorias: " +
          resultadoCategorias.error.message
        );
      } else {
        setCategorias(
          resultadoCategorias.data || []
        );
      }

      if (resultadoMovimentacoes.error) {
        setMensagem(
          "Erro nas movimentações: " +
          resultadoMovimentacoes.error.message
        );
      } else {
        setMovimentacoes(
          resultadoMovimentacoes.data || []
        );
      }

      setCarregando(false);
    }

    iniciar();

    return () => {
      ativo = false;
    };
  }, []);

  // Atualizar movimentações
  async function atualizarMovimentacoes() {
    if (!usuario) return false;

    const { data, error } = await supabase
      .from("movimentacoes")
      .select("*")
      .eq("usuario_id", usuario.id)
      .order("criado_em", {
        ascending: false
      });

    if (error) {
      setMensagem(
        "Erro ao atualizar: " + error.message
      );
      return false;
    }

    setMovimentacoes(data || []);
    return true;
  }

  // Atualizar categorias
  async function atualizarCategorias() {
    if (!usuario) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    const { data, error } = await supabase
      .from("categorias")
      .select("id, nome, tipo, cor, icone")
      .eq("usuario_id", usuario.id)
      .order("nome");

    if (error) throw error;

    setCategorias(data || []);

    const atualizado =
      await atualizarMovimentacoes();

    if (!atualizado) {
      throw new Error(
        "Não foi possível atualizar o histórico."
      );
    }

    if (
      categoriaId &&
      !(data || []).some(
        (categoria) =>
          categoria.id === categoriaId &&
          categoria.tipo === tipo
      )
    ) {
      setCategoriaId("");
    }
  }

  // Registrar movimentação
  async function registrar(evento) {
    evento.preventDefault();

    if (!usuario || salvando) return;

    const numero = Number(valor);

    if (
      !descricao.trim() ||
      !Number.isFinite(numero) ||
      numero <= 0
    ) {
      setMensagem(
        "Informe uma descrição e um valor válido."
      );
      return;
    }

    const categoria = categorias.find(
      (item) =>
        item.id === categoriaId &&
        item.tipo === tipo
    );

    if (categoriaId && !categoria) {
      setMensagem(
        "Selecione uma categoria válida."
      );
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const { error } = await supabase
        .from("movimentacoes")
        .insert({
          usuario_id: usuario.id,
          tipo,
          descricao: descricao.trim(),
          valor: numero,
          categoria_id:
            categoria?.id || null
        });

      if (error) throw error;

      const atualizado =
        await atualizarMovimentacoes();

      if (atualizado) {
        setDescricao("");
        setValor("");
        setCategoriaId("");
        setPagina("inicio");
        setMensagem(
          "Movimentação registrada!"
        );
      }
    } catch (erro) {
      setMensagem(
        "Erro ao salvar: " + erro.message
      );
    } finally {
      setSalvando(false);
    }
  }

  // Indicadores
  const entradas = movimentacoes
    .filter((m) => m.tipo === "entrada")
    .reduce(
      (total, m) =>
        total + Number(m.valor),
      0
    );

  const saidas = movimentacoes
    .filter((m) => m.tipo === "saida")
    .reduce(
      (total, m) =>
        total + Number(m.valor),
      0
    );

  const saldo = entradas - saidas;

  const economia = Math.max(0, saldo);

  const percentualEconomizado =
    entradas > 0
      ? Math.max(0, (economia / entradas) * 100)
      : 0;

  // Busca
  const filtradas = movimentacoes.filter(
    (movimentacao) => {
      const categoria = categorias.find(
        (item) =>
          item.id === movimentacao.categoria_id
      );

      const pesquisa =
        busca.toLowerCase();

      return (
        movimentacao.descricao
          .toLowerCase()
          .includes(pesquisa) ||
        (categoria?.nome || "")
          .toLowerCase()
          .includes(pesquisa)
      );
    }
  );

  // Gráfico inicial
  const meses = {};

  movimentacoes.forEach(
    (movimentacao) => {
      const chave = (
        movimentacao.data ||
        movimentacao.criado_em ||
        ""
      ).slice(0, 7);

      if (!chave) return;

      if (!meses[chave]) {
        meses[chave] = {
          entrada: 0,
          saida: 0
        };
      }

      if (
        movimentacao.tipo === "entrada" ||
        movimentacao.tipo === "saida"
      ) {
        meses[chave][movimentacao.tipo] +=
          Number(movimentacao.valor);
      }
    }
  );

  const grafico = Object.entries(meses)
    .sort(
      ([a], [b]) =>
        a.localeCompare(b)
    )
    .slice(-6);

  const maior = Math.max(
    1,
    ...grafico.flatMap(([, valores]) => [
      valores.entrada,
      valores.saida
    ])
  );

  const nome =
    nomePerfil ||
    usuario?.user_metadata?.nome ||
    usuario?.email?.split("@")[0] ||
    "Usuário";

  if (carregando) {
    return (
      <div className="vivi-carregando">
        Carregando Viv...
      </div>
    );
  }

  if (!usuario) {
    return <p>{mensagem}</p>;
  }

  return (
    <div className="vivi-financeiro">
      {/* CONTEÚDO */}

      <main className="vivi-principal">
        <header className="vivi-topo">
          <div>
            <small>
              PAINEL FINANCEIRO
            </small>

            <h1>
              Olá, {nome}!
            </h1>

            <p>
              Seu dinheiro, suas decisões.
            </p>
          </div>

          <div className="vivi-avatar">
            {nome.charAt(0).toUpperCase()}
          </div>
        </header>

        {mensagem && (
          <div
            className="vivi-mensagem"
            role="status"
          >
            {mensagem}
          </div>
        )}

        {/* RESUMO */}

        <section className="vivi-indicadores">
          <article className="vivi-indicador entrada">
            <div className="vivi-indicador-icone">
              ↗
            </div>

            <span>Entradas</span>

            <strong>
              {moeda(entradas)}
            </strong>

            <small>
              Total registrado
            </small>
          </article>

          <article className="vivi-indicador saida">
            <div className="vivi-indicador-icone">
              ↘
            </div>

            <span>Saídas</span>

            <strong>
              {moeda(saidas)}
            </strong>

            <small>
              Total registrado
            </small>
          </article>

          <article className="vivi-indicador saldo">
            <div className="vivi-indicador-icone">
              ▣
            </div>

            <span>Saldo atual</span>

            <strong>
              {moeda(saldo)}
            </strong>

            <small>
              Entradas menos saídas
            </small>
          </article>

          <article className="vivi-indicador total">
            <div className="vivi-indicador-icone">
              ◉
            </div>

            <span>Transações</span>

            <strong>
              {movimentacoes.length}
            </strong>

            <small>
              Total registrado
            </small>
          </article>
        </section>

        {/* PAINEL INICIAL */}

        {pagina === "inicio" && (
          <div className="viv-dashboard">

            <section className="viv-dashboard-cards">

              <article className="viv-dash-card viv-dash-saldo">
                <div className="viv-dash-card-topo">
                  <span>Saldo disponível</span>
                  <div className="viv-dash-icon">▣</div>
                </div>

                <strong>{moeda(saldo)}</strong>

                <small>
                  Entradas menos despesas
                </small>
              </article>

              <article className="viv-dash-card viv-dash-entrada">
                <div className="viv-dash-card-topo">
                  <span>Receitas</span>
                  <div className="viv-dash-icon">↗</div>
                </div>

                <strong>{moeda(entradas)}</strong>

                <small>
                  Total recebido
                </small>
              </article>

              <article className="viv-dash-card viv-dash-saida">
                <div className="viv-dash-card-topo">
                  <span>Despesas</span>
                  <div className="viv-dash-icon">↘</div>
                </div>

                <strong>{moeda(saidas)}</strong>

                <small>
                  Total gasto
                </small>
              </article>

              <article className="viv-dash-card viv-dash-economia">
                <div className="viv-dash-card-topo">
                  <span>Economia</span>
                  <div className="viv-dash-icon">◎</div>
                </div>

                <strong>{moeda(economia)}</strong>

                <small>
                  {percentualEconomizado.toFixed(1)}% das receitas
                </small>
              </article>

            </section>

            <section className="viv-dashboard-grid">

              <article className="viv-dashboard-panel viv-dashboard-chart">

                <div className="viv-dashboard-panel-title">
                  <div>
                    <h2>Visão financeira</h2>
                    <p>Receitas e despesas dos últimos meses</p>
                  </div>

                  <div className="viv-dashboard-legend">
                    <span className="entrada">● Receitas</span>
                    <span className="saida">● Despesas</span>
                  </div>
                </div>

                {grafico.length === 0 ? (
                  <div className="viv-dashboard-empty">
                    Registre movimentações para visualizar o gráfico.
                  </div>
                ) : (
                  <div className="viv-dashboard-bars">

                    {grafico.map(([mes, valores]) => (
                      <div
                        className="viv-dashboard-bar-group"
                        key={mes}
                      >

                        <div className="viv-dashboard-bar-area">

                          <div
                            className="viv-dashboard-bar entrada"
                            title={`Receitas: ${moeda(valores.entrada)}`}
                            style={{
                              height:
                                Math.max(
                                  3,
                                  (valores.entrada / maior) * 100
                                ) + "%"
                            }}
                          />

                          <div
                            className="viv-dashboard-bar saida"
                            title={`Despesas: ${moeda(valores.saida)}`}
                            style={{
                              height:
                                Math.max(
                                  3,
                                  (valores.saida / maior) * 100
                                ) + "%"
                            }}
                          />

                        </div>

                        <small>
                          {mes.slice(5)}/{mes.slice(2, 4)}
                        </small>

                      </div>
                    ))}

                  </div>
                )}

              </article>

              <article className="viv-dashboard-panel viv-dashboard-recentes">

                <div className="viv-dashboard-panel-title">
                  <div>
                    <h2>Últimas transações</h2>
                    <p>Movimentações recentes</p>
                  </div>

                  <button
                    type="button"
                    className="viv-dashboard-link"
                    onClick={() => setPagina("historico")}
                  >
                    Ver todas →
                  </button>
                </div>

                <Lista
                  registros={movimentacoes.slice(0, 5)}
                  categorias={categorias}
                />

              </article>

            </section>

            <section className="viv-dashboard-bottom">

              <article className="viv-dashboard-panel">

                <div className="viv-dashboard-panel-title">
                  <div>
                    <h2>Resumo financeiro</h2>
                    <p>Visão geral das suas finanças</p>
                  </div>
                </div>

                <div className="viv-dashboard-summary">

                  <div>
                    <span>Receitas</span>
                    <strong className="entrada">
                      {moeda(entradas)}
                    </strong>
                  </div>

                  <div>
                    <span>Despesas</span>
                    <strong className="saida">
                      {moeda(saidas)}
                    </strong>
                  </div>

                  <div>
                    <span>Saldo</span>
                    <strong>
                      {moeda(saldo)}
                    </strong>
                  </div>

                  <div>
                    <span>Transações</span>
                    <strong>
                      {movimentacoes.length}
                    </strong>
                  </div>

                </div>

              </article>

              <article className="viv-dashboard-panel viv-dashboard-assistente">

                <div className="viv-dashboard-ai-icon">
                  V
                </div>

                <div>
                  <span>VIV IA</span>

                  <h2>
                    Sua assistente financeira
                  </h2>

                  <p>
                    Registre movimentações e consulte suas
                    finanças conversando com a VIV.
                  </p>
                </div>

              </article>

            </section>

          </div>
        )}
        {/* NOVA TRANSAÇÃO */}

        {pagina === "nova" && (
          <section className="vivi-bloco vivi-formulario">
            <h2>
              Nova transação
            </h2>

            <p>
              Registre uma entrada ou despesa.
            </p>

            <form onSubmit={registrar}>
              <label htmlFor="tipo">
                Tipo
              </label>

              <select
                id="tipo"
                value={tipo}
                onChange={(evento) => {
                  setTipo(
                    evento.target.value
                  );
                  setCategoriaId("");
                }}
              >
                <option value="entrada">
                  Entrada
                </option>

                <option value="saida">
                  Saída
                </option>
              </select>

              <label htmlFor="categoria">
                Categoria
              </label>

              <select
                id="categoria"
                value={categoriaId}
                onChange={(evento) =>
                  setCategoriaId(
                    evento.target.value
                  )
                }
              >
                <option value="">
                  Sem categoria
                </option>

                {categorias
                  .filter(
                    (categoria) =>
                      categoria.tipo === tipo
                  )
                  .map(
                    (categoria) => (
                      <option
                        key={categoria.id}
                        value={categoria.id}
                      >
                        {categoria.nome}
                      </option>
                    )
                  )}
              </select>

              <label htmlFor="descricao">
                Descrição
              </label>

              <input
                id="descricao"
                value={descricao}
                onChange={(evento) =>
                  setDescricao(
                    evento.target.value
                  )
                }
                placeholder="Ex.: Supermercado"
                required
              />

              <label htmlFor="valor">
                Valor (R$)
              </label>

              <input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(evento) =>
                  setValor(
                    evento.target.value
                  )
                }
                required
              />

              <button
                className="vivi-salvar"
                type="submit"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar movimentação"}
              </button>
            </form>
          </section>
        )}

        {/* HISTÓRICO */}

        {pagina === "historico" && (
          <section className="vivi-bloco">
            <div className="vivi-bloco-titulo">
              <h2>
                Histórico de transações
              </h2>
            </div>

            <input
              className="vivi-busca"
              value={busca}
              onChange={(evento) =>
                setBusca(
                  evento.target.value
                )
              }
              placeholder={
                "Buscar por descrição ou categoria..."
              }
            />

            <Lista
              registros={filtradas}
              categorias={categorias}
            />
          </section>
        )}

        {/* CATEGORIAS */}

        {pagina === "categorias" && (
          <Categorias
            usuario={usuario}
            categorias={categorias}
            atualizarCategorias={
              atualizarCategorias
            }
          />
        )}

        {/* METAS FINANCEIRAS */}

        {pagina === "metas" && (
          <Metas
            usuario={usuario}
            categorias={categorias}
            movimentacoes={movimentacoes}
          />
        )}

        {/* RELATÓRIOS */}

        {pagina === "relatorios" && (
          <Relatorios
            movimentacoes={movimentacoes}
            categorias={categorias}
          />
        )}
      </main>
    </div>
  );
}
