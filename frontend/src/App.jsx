
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
  const [metasDashboard, setMetasDashboard] =
    useState([]);
  const [assinatura, setAssinatura] = useState(null);
  const [carregandoAssinatura, setCarregandoAssinatura] =
    useState(false);

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

      const hoje = new Date();
      const mesAtual =
        `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      const [
        resultadoCategorias,
        resultadoMovimentacoes,
        resultadoPerfil,
        resultadoMetas
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
          .maybeSingle(),

        supabase
          .from("metas_financeiras")
          .select("id, usuario_id, categoria_id, mes, limite")
          .eq("usuario_id", usuarioAtual.id)
          .eq("mes", `${mesAtual}-01`)
          .order("criado_em", { ascending: true })
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

      if (!resultadoMetas.error) {
        setMetasDashboard(resultadoMetas.data || []);
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

  // Carregar assinatura
  async function carregarAssinatura() {
    if (!usuario) return;

    setCarregandoAssinatura(true);

    const { data, error } = await supabase
      .from("viv_assinaturas")
      .select(
        "id, plano, status, valor, inicio_em, vencimento_em, origem"
      )
      .eq("usuario_id", usuario.id)
      .eq("status", "ativa")
      .order("vencimento_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Erro ao carregar assinatura:",
        error.message
      );
      setMensagem(
        "Não foi possível carregar sua assinatura."
      );
      setAssinatura(null);
    } else {
      setAssinatura(data || null);
    }

    setCarregandoAssinatura(false);
  }

  useEffect(() => {
    if (usuario && pagina === "assinatura") {
      carregarAssinatura();
    }
  }, [usuario, pagina]);

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

  // Dados do dashboard
  const agora = new Date();
  const chaveMesAtual =
    `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

  const movimentacoesMesAtual = movimentacoes.filter((movimentacao) =>
    (movimentacao.data || movimentacao.criado_em || "").slice(0, 7) === chaveMesAtual
  );

  const entradasMes = movimentacoesMesAtual
    .filter((m) => m.tipo === "entrada")
    .reduce((total, m) => total + Number(m.valor), 0);

  const saidasMes = movimentacoesMesAtual
    .filter((m) => m.tipo === "saida")
    .reduce((total, m) => total + Number(m.valor), 0);

  const saldoMes = entradasMes - saidasMes;

  const gastosPorCategoria = categorias
    .map((categoria) => {
      const total = movimentacoesMesAtual
        .filter(
          (movimentacao) =>
            movimentacao.tipo === "saida" &&
            movimentacao.categoria_id === categoria.id
        )
        .reduce(
          (soma, movimentacao) => soma + Number(movimentacao.valor),
          0
        );

      return {
        id: categoria.id,
        nome: categoria.nome,
        cor: categoria.cor || "#4f8cff",
        total
      };
    })
    .filter((categoria) => categoria.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalGastosCategorias = gastosPorCategoria.reduce(
    (soma, categoria) => soma + categoria.total,
    0
  );

  const principaisCategorias = gastosPorCategoria.slice(0, 6);

  let acumuladoDonut = 0;
  const fatiasDonut = principaisCategorias.map((categoria) => {
    const inicio = totalGastosCategorias > 0
      ? (acumuladoDonut / totalGastosCategorias) * 360
      : 0;
    acumuladoDonut += categoria.total;
    const fim = totalGastosCategorias > 0
      ? (acumuladoDonut / totalGastosCategorias) * 360
      : 0;

    return `${categoria.cor} ${inicio}deg ${fim}deg`;
  });

  const donutStyle = {
    background:
      fatiasDonut.length > 0
        ? `conic-gradient(${fatiasDonut.join(", ")})`
        : "conic-gradient(#18324d 0deg 360deg)"
  };

  const metasComProgresso = metasDashboard
    .map((meta) => {
      const categoria = categorias.find(
        (item) => item.id === meta.categoria_id
      );

      const gasto = movimentacoesMesAtual
        .filter(
          (movimentacao) =>
            movimentacao.tipo === "saida" &&
            movimentacao.categoria_id === meta.categoria_id
        )
        .reduce(
          (total, movimentacao) => total + Number(movimentacao.valor),
          0
        );

      const limite = Number(meta.limite) || 0;
      const percentual = limite > 0 ? (gasto / limite) * 100 : 0;

      return {
        ...meta,
        nome: categoria?.nome || "Meta financeira",
        cor: categoria?.cor || "#00d9ff",
        gasto,
        limite,
        percentual
      };
    })
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 4);

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
        </header>

        {mensagem && (
          <div
            className="vivi-mensagem"
            role="status"
          >
            {mensagem}
          </div>
        )}


        {/* PAINEL INICIAL */}

        {pagina === "inicio" && (
          <div className="viv-dashboard viv-dashboard-modelo">

            <section className="viv-dashboard-cards">

              <article className="viv-dash-card viv-dash-entrada">
                <div className="viv-dash-card-topo">
                  <span>Entradas</span>
                  <div className="viv-dash-icon">↗</div>
                </div>
                <strong>{moeda(entradasMes)}</strong>
                <small>Receitas deste mês</small>
              </article>

              <article className="viv-dash-card viv-dash-saida">
                <div className="viv-dash-card-topo">
                  <span>Saídas</span>
                  <div className="viv-dash-icon">↘</div>
                </div>
                <strong>{moeda(saidasMes)}</strong>
                <small>Despesas deste mês</small>
              </article>

              <article className="viv-dash-card viv-dash-saldo">
                <div className="viv-dash-card-topo">
                  <span>Saldo atual</span>
                  <div className="viv-dash-icon">▣</div>
                </div>
                <strong>{moeda(saldoMes)}</strong>
                <small>Saldo do mês atual</small>
              </article>

              <article className="viv-dash-card viv-dash-economia">
                <div className="viv-dash-card-topo">
                  <span>Total de transações</span>
                  <div className="viv-dash-icon">◔</div>
                </div>
                <strong>{movimentacoesMesAtual.length}</strong>
                <small>Este mês</small>
              </article>

            </section>

            <section className="viv-dashboard-grid viv-dashboard-grid-principal">

              <article className="viv-dashboard-panel viv-dashboard-chart">

                <div className="viv-dashboard-panel-title">
                  <div>
                    <h2>▥ Visão financeira</h2>
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
                                Math.max(3, (valores.entrada / maior) * 100) + "%"
                            }}
                          />
                          <div
                            className="viv-dashboard-bar saida"
                            title={`Despesas: ${moeda(valores.saida)}`}
                            style={{
                              height:
                                Math.max(3, (valores.saida / maior) * 100) + "%"
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

              <article className="viv-dashboard-panel viv-dashboard-categorias">

                <div className="viv-dashboard-panel-title">
                  <div>
                    <h2>◔ Gastos por categoria</h2>
                    <p>Veja para onde seu dinheiro está indo</p>
                  </div>
                  <span className="viv-dashboard-periodo">Este mês⌄</span>
                </div>

                {principaisCategorias.length === 0 ? (
                  <div className="viv-dashboard-empty">
                    Ainda não há despesas categorizadas neste mês.
                  </div>
                ) : (
                  <div className="viv-category-content">
                    <div className="viv-category-donut" style={donutStyle}>
                      <div className="viv-category-donut-center">
                        <strong>{moeda(totalGastosCategorias)}</strong>
                        <small>Total de gastos</small>
                      </div>
                    </div>

                    <div className="viv-category-list">
                      {principaisCategorias.map((categoria) => {
                        const percentual =
                          totalGastosCategorias > 0
                            ? (categoria.total / totalGastosCategorias) * 100
                            : 0;

                        return (
                          <div className="viv-category-row" key={categoria.id}>
                            <span
                              className="viv-category-dot"
                              style={{ background: categoria.cor }}
                            />
                            <span className="viv-category-name">
                              {categoria.nome}
                            </span>
                            <strong>{percentual.toFixed(0)}%</strong>
                            <span>{moeda(categoria.total)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </article>

            </section>

            <section className="viv-dashboard-grid viv-dashboard-grid-inferior">

              <article className="viv-dashboard-panel viv-dashboard-recentes">

                <div className="viv-dashboard-panel-title">
                  <div>
                    <h2>☷ Últimas transações</h2>
                    <p>Suas movimentações mais recentes</p>
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

              <article className="viv-dashboard-panel viv-dashboard-metas">

                <div className="viv-dashboard-panel-title">
                  <div>
                    <h2>◎ Metas do mês</h2>
                    <p>Acompanhe o progresso das suas metas</p>
                  </div>

                  <button
                    type="button"
                    className="viv-dashboard-link"
                    onClick={() => setPagina("metas")}
                  >
                    Gerenciar metas →
                  </button>
                </div>

                {metasComProgresso.length === 0 ? (
                  <div className="viv-dashboard-empty viv-dashboard-meta-empty">
                    <p>Nenhuma meta configurada para este mês.</p>
                    <button
                      type="button"
                      className="viv-dashboard-link"
                      onClick={() => setPagina("metas")}
                    >
                      Criar uma meta
                    </button>
                  </div>
                ) : (
                  <div className="viv-goals-list">
                    {metasComProgresso.map((meta) => (
                      <div className="viv-goal-row" key={meta.id}>
                        <div
                          className="viv-goal-icon"
                          style={{ color: meta.cor }}
                        >
                          ◎
                        </div>

                        <div className="viv-goal-info">
                          <div className="viv-goal-head">
                            <div>
                              <strong>{meta.nome}</strong>
                              <small>
                                {moeda(meta.gasto)} de {moeda(meta.limite)}
                              </small>
                            </div>
                            <strong style={{ color: meta.cor }}>
                              {Math.round(meta.percentual)}%
                            </strong>
                          </div>

                          <div className="viv-goal-track">
                            <div
                              className="viv-goal-progress"
                              style={{
                                width: `${Math.min(meta.percentual, 100)}%`,
                                background: meta.cor
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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

        {/* MINHA ASSINATURA */}

        {pagina === "assinatura" && (
          <section className="vivi-bloco">
            <div className="vivi-bloco-titulo">
              <div>
                <h2>Minha Assinatura</h2>
                <p>
                  Consulte os detalhes do seu plano VIV.
                </p>
              </div>
            </div>

            {carregandoAssinatura ? (
              <p>Carregando assinatura...</p>
            ) : assinatura ? (
              <div className="vivi-assinatura-card">
                <div>
                  <small>PLANO ATUAL</small>
                  <h2>
                    VIV{" "}
                    {assinatura.plano === "mensal"
                      ? "Mensal"
                      : assinatura.plano === "anual"
                        ? "Anual"
                        : assinatura.plano === "vitalicio"
                          ? "Vitalício"
                          : assinatura.plano}
                  </h2>
                </div>

                <p>
                  <strong>Status:</strong>{" "}
                  {assinatura.status === "ativa"
                    ? "Ativa"
                    : assinatura.status}
                </p>

                <p>
                  <strong>Valor:</strong>{" "}
                  {moeda(assinatura.valor)}
                </p>

                <p>
                  <strong>Ativada em:</strong>{" "}
                  {formatarData(assinatura.inicio_em)}
                </p>

                <p>
                  <strong>Válida até:</strong>{" "}
                  {assinatura.plano === "vitalicio"
                    ? "Vitalício"
                    : formatarData(
                        assinatura.vencimento_em
                      )}
                </p>

                <button
                  type="button"
                  className="vivi-salvar"
                  onClick={() => setPagina("assinaturas")}
                >
                  Renovar ou alterar plano
                </button>
              </div>
            ) : (
              <div className="vivi-assinatura-card">
                <h2>Nenhuma assinatura ativa</h2>
                <p>
                  Escolha um plano para liberar os recursos
                  da VIV.
                </p>

                <button
                  type="button"
                  className="vivi-salvar"
                  onClick={() => setPagina("assinaturas")}
                >
                  Ver planos
                </button>
              </div>
            )}
          </section>
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
