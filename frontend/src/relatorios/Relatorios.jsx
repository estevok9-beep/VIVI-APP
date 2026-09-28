
import { useMemo, useState } from "react";
import "./Relatorios.css";

const moeda = (valor) =>
  Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

export default function Relatorios({
  movimentacoes = [],
  categorias = []
}) {
  const [mes, setMes] = useState("todos");

  const meses = useMemo(() => {
    return [...new Set(
      movimentacoes
        .map((m) =>
          (m.data || m.criado_em || "").slice(0, 7)
        )
        .filter(Boolean)
    )].sort().reverse();
  }, [movimentacoes]);

  const registros = useMemo(() => {
    return movimentacoes.filter((m) => {
      const data =
        (m.data || m.criado_em || "").slice(0, 7);

      return mes === "todos" || data === mes;
    });
  }, [movimentacoes, mes]);

  const entradas = registros
    .filter((m) => m.tipo === "entrada")
    .reduce((soma, m) => soma + Number(m.valor), 0);

  const saidas = registros
    .filter((m) => m.tipo === "saida")
    .reduce((soma, m) => soma + Number(m.valor), 0);

  const despesas = useMemo(() => {
    const grupos = new Map();

    registros
      .filter((m) => m.tipo === "saida")
      .forEach((m) => {
        const categoria = categorias.find(
          (c) => c.id === m.categoria_id
        );

        const chave = categoria?.id || "sem-categoria";

        if (!grupos.has(chave)) {
          grupos.set(chave, {
            id: chave,
            nome: categoria?.nome || "Sem categoria",
            cor: categoria?.cor || "#64748B",
            valor: 0
          });
        }

        grupos.get(chave).valor += Number(m.valor);
      });

    return [...grupos.values()]
      .sort((a, b) => b.valor - a.valor);
  }, [registros, categorias]);

  let acumulado = 0;

  const segmentos = despesas.map((item) => {
    const inicio = acumulado;
    const percentual =
      saidas > 0 ? (item.valor / saidas) * 100 : 0;

    acumulado += percentual;

    return {
      ...item,
      percentual,
      inicio,
      fim: acumulado
    };
  });

  const fundoGrafico = segmentos.length
    ? `conic-gradient(${segmentos.map(
        (item) =>
          `${item.cor} ${item.inicio}% ${item.fim}%`
      ).join(", ")})`
    : "#213b50";

  return (
    <div className="vivi-relatorios">
      <div className="relatorios-cabecalho">
        <div>
          <h2>Análise financeira</h2>
          <p>
            Descubra como seu dinheiro está distribuído.
          </p>
        </div>

        <label>
          Período
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            <option value="todos">
              Todo o período
            </option>

            {meses.map((item) => (
              <option key={item} value={item}>
                {item.slice(5)}/{item.slice(0, 4)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="relatorios-indicadores">
        <article className="relatorios-entrada">
          <span>Entradas</span>
          <strong>{moeda(entradas)}</strong>
        </article>

        <article className="relatorios-saida">
          <span>Despesas</span>
          <strong>{moeda(saidas)}</strong>
        </article>

        <article className="relatorios-saldo">
          <span>Resultado do período</span>
          <strong>{moeda(entradas - saidas)}</strong>
        </article>
      </div>

      <section className="relatorios-painel">
        <h3>Despesas por categoria</h3>

        {saidas === 0 ? (
          <p>
            Nenhuma despesa registrada
            para o período selecionado.
          </p>
        ) : (
          <div className="relatorios-conteudo">
            <div
              className="relatorios-grafico"
              style={{ background: fundoGrafico }}
              role="img"
              aria-label="Distribuição das despesas por categoria"
            >
              <div className="relatorios-centro">
                <small>Total de despesas</small>
                <strong>{moeda(saidas)}</strong>
              </div>
            </div>

            <div className="relatorios-lista">
              {segmentos.map((item) => (
                <div
                  className="relatorios-categoria"
                  key={item.id}
                >
                  <div className="relatorios-nome">
                    <span
                      className="relatorios-cor"
                      style={{
                        background: item.cor
                      }}
                    />

                    <strong>{item.nome}</strong>

                    <span>
                      {item.percentual.toFixed(1)}%
                    </span>
                  </div>

                  <div className="relatorios-barra">
                    <div
                      style={{
                        width:
                          item.percentual + "%",
                        background: item.cor
                      }}
                    />
                  </div>

                  <small>{moeda(item.valor)}</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
