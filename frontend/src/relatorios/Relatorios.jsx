
import { useMemo, useState } from "react";
import { supabase } from "../supabase";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  const [apagando, setApagando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [menuExportar, setMenuExportar] = useState(false);

  function nomeCategoria(movimentacao) {
    return (
      categorias.find((c) => c.id === movimentacao.categoria_id)?.nome ||
      "Sem categoria"
    );
  }

  function periodoTexto() {
    if (mes === "todos") return "Todo o período";
    const [ano, numeroMes] = mes.split("-");
    return `${numeroMes}/${ano}`;
  }

  function nomeArquivo(extensao) {
    const periodo = mes === "todos" ? "todo-periodo" : mes;
    return `relatorio-financeiro-vivi-${periodo}.${extensao}`;
  }

  async function exportarExcel() {
    setMenuExportar(false);

    if (!registros.length) {
      setMensagem("Não há movimentações no período selecionado para exportar.");
      return;
    }

    try {
      const linhas = registros.map((m) => ({
        Data: (m.data || m.criado_em || "").slice(0, 10),
        Descrição: m.descricao || "",
        Categoria: nomeCategoria(m),
        Tipo: m.tipo === "entrada" ? "Entrada" : "Saída",
        Valor: Number(m.valor || 0)
      }));

      const resumo = [
        ["Relatório Financeiro - VIVI"],
        ["Período", periodoTexto()],
        [],
        ["Resumo"],
        ["Entradas", entradas],
        ["Despesas", saidas],
        ["Saldo", entradas - saidas],
        [],
        ["Movimentações"]
      ];

      const planilha = XLSX.utils.aoa_to_sheet(resumo);
      XLSX.utils.sheet_add_json(planilha, linhas, {
        origin: "A10",
        skipHeader: false
      });

      planilha["!cols"] = [
        { wch: 14 },
        { wch: 34 },
        { wch: 24 },
        { wch: 14 },
        { wch: 16 }
      ];

      const pasta = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(pasta, planilha, "Relatório");
      XLSX.writeFile(pasta, nomeArquivo("xlsx"));
      setMensagem("Planilha Excel gerada com sucesso.");
    } catch (erro) {
      console.error("Erro ao gerar Excel:", erro);
      setMensagem("Não foi possível gerar o Excel.");
    }
  }

  async function exportarPDF() {
    setMenuExportar(false);

    if (!registros.length) {
      setMensagem("Não há movimentações no período selecionado para exportar.");
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório Financeiro - VIVI", 14, 18);
      doc.setFontSize(11);
      doc.text(`Período: ${periodoTexto()}`, 14, 27);
      doc.text(`Entradas: ${moeda(entradas)}`, 14, 36);
      doc.text(`Despesas: ${moeda(saidas)}`, 14, 43);
      doc.text(`Saldo: ${moeda(entradas - saidas)}`, 14, 50);

      const corpo = registros.map((m) => [
        (m.data || m.criado_em || "").slice(0, 10),
        m.descricao || "",
        nomeCategoria(m),
        m.tipo === "entrada" ? "Entrada" : "Saída",
        moeda(m.valor)
      ]);

      autoTable(doc, {
        startY: 58,
        head: [["Data", "Descrição", "Categoria", "Tipo", "Valor"]],
        body: corpo,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [33, 59, 80] }
      });

      doc.save(nomeArquivo("pdf"));
      setMensagem("PDF gerado com sucesso.");
    } catch (erro) {
      console.error("Erro ao gerar PDF:", erro);
      setMensagem("Não foi possível gerar o PDF.");
    }
  }

  async function zerarRelatorio() {
    if (!movimentacoes.length) {
      setMensagem("Não há movimentações para apagar.");
      return;
    }

    const confirmou = window.confirm(
      "ATENÇÃO: esta ação apagará definitivamente todas as suas entradas, despesas e todo o histórico financeiro. Deseja continuar?"
    );

    if (!confirmou) return;

    const confirmouNovamente = window.confirm(
      "Esta exclusão não poderá ser desfeita. Confirma que deseja ZERAR TODO O RELATÓRIO?"
    );

    if (!confirmouNovamente) return;

    setApagando(true);
    setMensagem("");

    try {
      const { data, error: erroUsuario } = await supabase.auth.getUser();

      if (erroUsuario || !data.user) {
        throw new Error("Não foi possível identificar o usuário logado.");
      }

      const { error } = await supabase
        .from("movimentacoes")
        .delete()
        .eq("usuario_id", data.user.id);

      if (error) throw error;

      setMensagem("Relatório zerado com sucesso.");
      window.location.reload();
    } catch (erro) {
      setMensagem("Erro ao zerar relatório: " + erro.message);
      setApagando(false);
    }
  }

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

        <div className="relatorios-acoes">
          <div className="relatorios-exportar">
            <button
              type="button"
              className="relatorios-exportar-botao"
              onClick={() => setMenuExportar((aberto) => !aberto)}
              disabled={registros.length === 0}
            >
              Exportar ▾
            </button>

            {menuExportar && (
              <div className="relatorios-exportar-menu">
                <button type="button" onClick={exportarExcel}>
                  Excel (.xlsx)
                </button>
                <button type="button" onClick={exportarPDF}>
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="relatorios-zerar"
            onClick={zerarRelatorio}
            disabled={apagando || movimentacoes.length === 0}
          >
            {apagando ? "Zerando..." : "Zerar relatório"}
          </button>

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
      </div>

      {mensagem && (
        <p className="relatorios-mensagem">{mensagem}</p>
      )}

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
