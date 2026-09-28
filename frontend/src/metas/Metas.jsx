
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import "./Metas.css";

const moeda = (valor) =>
  Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function mesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

function statusMeta(percentual) {
  if (percentual >= 100) {
    return {
      texto: "Limite atingido",
      classe: "excedida"
    };
  }

  if (percentual >= 80) {
    return {
      texto: "Atenção: 80%",
      classe: "alerta"
    };
  }

  return {
    texto: "Dentro do limite",
    classe: "normal"
  };
}

export default function Metas({
  usuario,
  categorias = [],
  movimentacoes = []
}) {
  const [mes, setMes] = useState(mesAtual);
  const [metas, setMetas] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [limite, setLimite] = useState("");
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const categoriasDespesa = categorias.filter(
    (categoria) => categoria.tipo === "saida"
  );

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      if (!usuario) return;

      setCarregando(true);
      setMensagem("");

      const { data, error } = await supabase
        .from("metas_financeiras")
        .select(
          "id, usuario_id, categoria_id, mes, limite"
        )
        .eq("usuario_id", usuario.id)
        .eq("mes", `${mes}-01`)
        .order("criado_em", {
          ascending: true
        });

      if (!ativo) return;

      if (error) {
        setMensagem(
          "Erro ao carregar metas: " + error.message
        );
      } else {
        setMetas(data || []);
      }

      setCarregando(false);
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [usuario, mes]);

  const gastos = useMemo(() => {
    const resultado = new Map();

    movimentacoes
      .filter(
        (movimentacao) =>
          movimentacao.tipo === "saida" &&
          (movimentacao.data ||
            movimentacao.criado_em ||
            "").slice(0, 7) === mes
      )
      .forEach((movimentacao) => {
        const id = movimentacao.categoria_id;

        if (!id) return;

        resultado.set(
          id,
          (resultado.get(id) || 0) +
            Number(movimentacao.valor)
        );
      });

    return resultado;
  }, [movimentacoes, mes]);

  const detalhes = metas.map((meta) => {
    const categoria = categoriasDespesa.find(
      (item) => item.id === meta.categoria_id
    );

    const gasto = gastos.get(meta.categoria_id) || 0;
    const percentual =
      Number(meta.limite) > 0
        ? (gasto / Number(meta.limite)) * 100
        : 0;

    return {
      ...meta,
      categoria,
      gasto,
      percentual,
      restante: Number(meta.limite) - gasto,
      status: statusMeta(percentual)
    };
  });

  const orcamento = detalhes.reduce(
    (soma, meta) => soma + Number(meta.limite),
    0
  );

  const gastoTotal = detalhes.reduce(
    (soma, meta) => soma + meta.gasto,
    0
  );

  const disponivel = orcamento - gastoTotal;

  async function atualizar() {
    const { data, error } = await supabase
      .from("metas_financeiras")
      .select(
        "id, usuario_id, categoria_id, mes, limite"
      )
      .eq("usuario_id", usuario.id)
      .eq("mes", `${mes}-01`)
      .order("criado_em", {
        ascending: true
      });

    if (error) throw error;

    setMetas(data || []);
  }

  function limpar() {
    setCategoriaId("");
    setLimite("");
    setEditando(null);
  }

  function editar(meta) {
    setEditando(meta.id);
    setCategoriaId(meta.categoria_id);
    setLimite(String(meta.limite));
    setMensagem("");
  }

  async function salvar(evento) {
    evento.preventDefault();

    if (salvando || !usuario) return;

    const numero = Number(limite);

    if (
      !categoriaId ||
      !Number.isFinite(numero) ||
      numero <= 0
    ) {
      setMensagem(
        "Selecione uma categoria e informe um limite válido."
      );
      return;
    }

    if (
      !categoriasDespesa.some(
        (categoria) => categoria.id === categoriaId
      )
    ) {
      setMensagem(
        "Selecione uma categoria de despesas válida."
      );
      return;
    }

    const duplicada = metas.some(
      (meta) =>
        meta.categoria_id === categoriaId &&
        meta.id !== editando
    );

    if (duplicada) {
      setMensagem(
        "Já existe uma meta para essa categoria neste mês."
      );
      return;
    }

    setSalvando(true);
    setMensagem("");

    try {
      const dados = {
        categoria_id: categoriaId,
        limite: numero,
        mes: `${mes}-01`
      };

      let resultado;

      if (editando) {
        resultado = await supabase
          .from("metas_financeiras")
          .update(dados)
          .eq("id", editando)
          .eq("usuario_id", usuario.id)
          .select("id");
      } else {
        resultado = await supabase
          .from("metas_financeiras")
          .insert({
            ...dados,
            usuario_id: usuario.id
          })
          .select("id");
      }

      if (resultado.error) {
        throw resultado.error;
      }

      if (!resultado.data?.length) {
        throw new Error(
          "Nenhuma meta foi alterada."
        );
      }

      await atualizar();
      limpar();

      setMensagem(
        "Meta financeira salva com sucesso!"
      );
    } catch (erro) {
      setMensagem(
        "Erro ao salvar meta: " + erro.message
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!usuario || !excluindo || salvando) return;

    setSalvando(true);
    setMensagem("");

    try {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .delete()
        .eq("id", excluindo.id)
        .eq("usuario_id", usuario.id)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Meta não encontrada."
        );
      }

      await atualizar();

      if (editando === excluindo.id) {
        limpar();
      }

      setMensagem(
        "Meta excluída com sucesso."
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
    <section className="vivi-metas">
      <header className="metas-cabecalho">
        <div>
          <h2>Central de metas financeiras</h2>
          <p>
            Planeje seus gastos e acompanhe
            seus limites mensais.
          </p>
        </div>

        <label>
          Mês de referência
          <input
            type="month"
            value={mes}
            onChange={(evento) => {
              setMes(evento.target.value);
              limpar();
            }}
          />
        </label>
      </header>

      {mensagem && (
        <div className="metas-mensagem" role="status">
          {mensagem}
        </div>
      )}

      <div className="metas-indicadores">
        <article>
          <span>Orçamento planejado</span>
          <strong>{moeda(orcamento)}</strong>
        </article>

        <article>
          <span>Gasto nas categorias com metas</span>
          <strong>{moeda(gastoTotal)}</strong>
        </article>

        <article>
          <span>Disponível</span>
          <strong
            className={
              disponivel < 0
                ? "metas-negativo"
                : "metas-positivo"
            }
          >
            {moeda(disponivel)}
          </strong>
        </article>
      </div>

      <div className="metas-formulario">
        <h3>
          {editando ? "Editar meta" : "Criar nova meta"}
        </h3>

        <form onSubmit={salvar}>
          <label htmlFor="meta-categoria">
            Categoria de despesa
          </label>

          <select
            id="meta-categoria"
            value={categoriaId}
            onChange={(evento) =>
              setCategoriaId(evento.target.value)
            }
            required
          >
            <option value="">
              Selecione uma categoria
            </option>

            {categoriasDespesa.map((categoria) => (
              <option
                key={categoria.id}
                value={categoria.id}
              >
                {categoria.nome}
              </option>
            ))}
          </select>

          <label htmlFor="meta-limite">
            Limite mensal (R$)
          </label>

          <input
            id="meta-limite"
            type="number"
            min="0.01"
            step="0.01"
            value={limite}
            onChange={(evento) =>
              setLimite(evento.target.value)
            }
            placeholder="Ex.: 600.00"
            required
          />

          <div className="metas-acoes">
            <button
              className="metas-salvar"
              type="submit"
              disabled={salvando}
            >
              {salvando
                ? "Salvando..."
                : editando
                  ? "Salvar alterações"
                  : "Criar meta"}
            </button>

            {editando && (
              <button
                className="metas-cancelar"
                type="button"
                onClick={limpar}
                disabled={salvando}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="metas-listagem">
        <h3>Minhas metas do mês</h3>

        {carregando ? (
          <p>Carregando metas...</p>
        ) : detalhes.length === 0 ? (
          <p>
            Você ainda não cadastrou metas
            para este mês.
          </p>
        ) : (
          <div className="metas-grade">
            {detalhes.map((meta) => (
              <article
                className="metas-cartao"
                key={meta.id}
              >
                <div className="metas-cartao-topo">
                  <div>
                    <span
                      className="metas-ponto"
                      style={{
                        background:
                          meta.categoria?.cor ||
                          "#18b8ff"
                      }}
                    />

                    <strong>
                      {meta.categoria?.nome ||
                        "Categoria indisponível"}
                    </strong>
                  </div>

                  <span
                    className={
                      "metas-status " +
                      meta.status.classe
                    }
                  >
                    {meta.status.texto}
                  </span>
                </div>

                <div className="metas-valores">
                  <span>
                    Gasto: {moeda(meta.gasto)}
                  </span>
                  <span>
                    Limite: {moeda(meta.limite)}
                  </span>
                </div>

                <div
                  className="metas-progresso"
                  role="progressbar"
                  aria-label={
                    "Uso da meta " +
                    (meta.categoria?.nome || "")
                  }
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    Math.min(
                      100,
                      Math.round(meta.percentual)
                    )
                  }
                >
                  <div
                    className={meta.status.classe}
                    style={{
                      width:
                        Math.min(
                          100,
                          meta.percentual
                        ) + "%"
                    }}
                  />
                </div>

                <div className="metas-cartao-rodape">
                  <span>
                    {meta.percentual.toFixed(1)}%
                    {" "}utilizado
                  </span>

                  <strong
                    className={
                      meta.restante < 0
                        ? "metas-negativo"
                        : "metas-positivo"
                    }
                  >
                    {meta.restante < 0
                      ? "Excedido: "
                      : "Restante: "}
                    {moeda(
                      Math.abs(meta.restante)
                    )}
                  </strong>
                </div>

                <div className="metas-acoes">
                  <button
                    className="metas-editar"
                    type="button"
                    onClick={() => editar(meta)}
                  >
                    Editar
                  </button>

                  <button
                    className="metas-excluir"
                    type="button"
                    onClick={() =>
                      setExcluindo(meta)
                    }
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {excluindo && (
        <div
          className="metas-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="metas-excluir-titulo"
        >
          <div className="metas-modal-conteudo">
            <h3 id="metas-excluir-titulo">
              Excluir esta meta?
            </h3>

            <p>
              Os lançamentos financeiros
              continuarão preservados.
            </p>

            <div className="metas-acoes">
              <button
                type="button"
                className="metas-cancelar"
                disabled={salvando}
                onClick={() =>
                  setExcluindo(null)
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="metas-excluir"
                disabled={salvando}
                onClick={excluir}
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
