import { useMemo, useState } from "react";
import { supabase } from "../supabase";
import * as XLSX from "xlsx-js-style";
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
      categorias.find(
        (c) => c.id === movimentacao.categoria_id
      )?.nome || "Sem categoria"
    );
  }

  function periodoTexto() {
    if (mes === "todos") return "Todo o período";

    const [ano, numeroMes] = mes.split("-");
    return `${numeroMes}/${ano}`;
  }

  function nomeArquivo(extensao) {
    const periodo =
      mes === "todos" ? "todo-periodo" : mes;

    return `relatorio-financeiro-vivi-${periodo}.${extensao}`;
  }

  // ==========================================
  // EXPORTAR EXCEL
  // ==========================================

  async function exportarExcel() {
    setMenuExportar(false);

    if (!registros.length) {
      setMensagem(
        "Não há movimentações no período selecionado para exportar."
      );
      return;
    }

    try {
      // ==========================================
      // CORES DO EXCEL
      // ==========================================

      const AZUL_ESCURO = "213B50";
      const AZUL_MEDIO = "2E5B73";
      const AZUL_CLARO = "EAF2F8";

      const VERDE = "15803D";
      const VERDE_CLARO = "EAF7EE";

      const VERMELHO = "B91C1C";
      const VERMELHO_CLARO = "FDECEC";

      const BRANCO = "FFFFFF";
      const CINZA_CLARO = "F4F6F8";
      const CINZA_BORDA = "D7DEE5";

      // ==========================================
      // BORDAS
      // ==========================================

      const borda = {
        top: {
          style: "thin",
          color: { rgb: CINZA_BORDA }
        },
        bottom: {
          style: "thin",
          color: { rgb: CINZA_BORDA }
        },
        left: {
          style: "thin",
          color: { rgb: CINZA_BORDA }
        },
        right: {
          style: "thin",
          color: { rgb: CINZA_BORDA }
        }
      };

      // ==========================================
      // FUNÇÃO AUXILIAR DE ESTILO
      // ==========================================

      const estilizarLinha = (
        planilha,
        linha,
        quantidadeColunas,
        estilo
      ) => {
        for (
          let coluna = 0;
          coluna < quantidadeColunas;
          coluna++
        ) {
          const endereco =
            XLSX.utils.encode_cell({
              r: linha - 1,
              c: coluna
            });

          if (planilha[endereco]) {
            planilha[endereco].s = {
              ...(planilha[endereco].s || {}),
              ...estilo
            };
          }
        }
      };

      // ==========================================
      // DADOS DO RESUMO
      // ==========================================

      const totalLancamentos =
        registros.length;

      const quantidadeEntradas =
        registros.filter(
          (m) => m.tipo === "entrada"
        ).length;

      const quantidadeSaidas =
        registros.filter(
          (m) => m.tipo === "saida"
        ).length;

      const saldo =
        entradas - saidas;

      const resumoDados = [
        [
          "VIV — CONTROLE FINANCEIRO",
          "",
          ""
        ],

        [
          `Período: ${periodoTexto()}`,
          "",
          ""
        ],

        [
          "",
          "",
          ""
        ],

        [
          "RESUMO FINANCEIRO",
          "",
          ""
        ],

        [
          "Indicador",
          "Valor",
          "Lançamentos"
        ],

        [
          "Total de Entradas",
          entradas,
          quantidadeEntradas
        ],

        [
          "Total de Saídas",
          saidas,
          quantidadeSaidas
        ],

        [
          "Saldo do Período",
          saldo,
          totalLancamentos
        ],

        [
          "",
          "",
          ""
        ],

        [
          "DESPESAS POR CATEGORIA",
          "",
          ""
        ],

        [
          "Categoria",
          "Valor",
          "Percentual"
        ]
      ];

      // ==========================================
      // CATEGORIAS
      // ==========================================

      despesas.forEach((item) => {
        resumoDados.push([
          item.nome,
          Number(item.valor),
          saidas > 0
            ? Number(
              (
                item.valor / saidas
              ).toFixed(4)
            )
            : 0
        ]);
      });

      // ==========================================
      // CRIA ABA RESUMO
      // ==========================================

      const planilhaResumo =
        XLSX.utils.aoa_to_sheet(
          resumoDados
        );

      planilhaResumo["!cols"] = [
        { wch: 34 },
        { wch: 22 },
        { wch: 18 }
      ];

      planilhaResumo["!merges"] = [
        {
          s: {
            r: 0,
            c: 0
          },
          e: {
            r: 0,
            c: 2
          }
        },

        {
          s: {
            r: 1,
            c: 0
          },
          e: {
            r: 1,
            c: 2
          }
        },

        {
          s: {
            r: 3,
            c: 0
          },
          e: {
            r: 3,
            c: 2
          }
        },

        {
          s: {
            r: 9,
            c: 0
          },
          e: {
            r: 9,
            c: 2
          }
        }
      ];

      // ==========================================
      // TÍTULO
      // ==========================================

      if (planilhaResumo["A1"]) {
        planilhaResumo["A1"].s = {
          font: {
            bold: true,
            color: {
              rgb: BRANCO
            },
            sz: 18
          },

          fill: {
            fgColor: {
              rgb: AZUL_ESCURO
            }
          },

          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        };
      }

      // ==========================================
      // PERÍODO
      // ==========================================

      if (planilhaResumo["A2"]) {
        planilhaResumo["A2"].s = {
          font: {
            italic: true,
            color: {
              rgb: "475569"
            }
          },

          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        };
      }

      // ==========================================
      // SEÇÕES
      // ==========================================

      ["A4", "A10"].forEach(
        (celula) => {
          if (planilhaResumo[celula]) {
            planilhaResumo[celula].s = {
              font: {
                bold: true,
                color: {
                  rgb: BRANCO
                },
                sz: 12
              },

              fill: {
                fgColor: {
                  rgb: AZUL_MEDIO
                }
              },

              alignment: {
                horizontal: "left",
                vertical: "center"
              }
            };
          }
        }
      );

      // ==========================================
      // CABEÇALHOS
      // ==========================================

      [5, 11].forEach(
        (linha) => {
          estilizarLinha(
            planilhaResumo,
            linha,
            3,
            {
              font: {
                bold: true,
                color: {
                  rgb: BRANCO
                }
              },

              fill: {
                fgColor: {
                  rgb: AZUL_ESCURO
                }
              },

              alignment: {
                horizontal: "center",
                vertical: "center"
              },

              border: borda
            }
          );
        }
      );

      // ==========================================
      // ENTRADAS
      // ==========================================

      estilizarLinha(
        planilhaResumo,
        6,
        3,
        {
          font: {
            bold: true,
            color: {
              rgb: VERDE
            }
          },

          fill: {
            fgColor: {
              rgb: VERDE_CLARO
            }
          },

          border: borda,

          alignment: {
            vertical: "center"
          }
        }
      );

      // ==========================================
      // SAÍDAS
      // ==========================================

      estilizarLinha(
        planilhaResumo,
        7,
        3,
        {
          font: {
            bold: true,
            color: {
              rgb: VERMELHO
            }
          },

          fill: {
            fgColor: {
              rgb: VERMELHO_CLARO
            }
          },

          border: borda,

          alignment: {
            vertical: "center"
          }
        }
      );

      // ==========================================
      // SALDO
      // ==========================================

      estilizarLinha(
        planilhaResumo,
        8,
        3,
        {
          font: {
            bold: true,
            color: {
              rgb: AZUL_ESCURO
            }
          },

          fill: {
            fgColor: {
              rgb: AZUL_CLARO
            }
          },

          border: borda,

          alignment: {
            vertical: "center"
          }
        }
      );

      // ==========================================
      // FORMATO MONETÁRIO
      // ==========================================

      [
        "B6",
        "B7",
        "B8"
      ].forEach(
        (celula) => {
          if (planilhaResumo[celula]) {
            planilhaResumo[celula].z =
              '"R$" #,##0.00';

            planilhaResumo[celula].s =
            {
              ...(planilhaResumo[
                celula
              ].s || {}),

              alignment: {
                horizontal: "right",
                vertical: "center"
              }
            };
          }
        }
      );

      // ==========================================
      // CATEGORIAS
      // ==========================================

      const primeiraLinhaCategoria =
        12;

      despesas.forEach(
        (_, indice) => {
          const linha =
            primeiraLinhaCategoria +
            indice;

          estilizarLinha(
            planilhaResumo,
            linha,
            3,
            {
              fill: {
                fgColor: {
                  rgb:
                    linha % 2 === 0
                      ? BRANCO
                      : CINZA_CLARO
                }
              },

              border: borda,

              alignment: {
                vertical: "center"
              }
            }
          );

          const celulaValor =
            `B${linha}`;

          const celulaPercentual =
            `C${linha}`;

          if (
            planilhaResumo[
            celulaValor
            ]
          ) {
            planilhaResumo[
              celulaValor
            ].z =
              '"R$" #,##0.00';

            planilhaResumo[
              celulaValor
            ].s.alignment = {
              horizontal: "right",
              vertical: "center"
            };
          }

          if (
            planilhaResumo[
            celulaPercentual
            ]
          ) {
            planilhaResumo[
              celulaPercentual
            ].z = "0.00%";

            planilhaResumo[
              celulaPercentual
            ].s.alignment = {
              horizontal: "center",
              vertical: "center"
            };
          }
        }
      );

      // ==========================================
      // ABA LANÇAMENTOS
      // ==========================================

      const linhasLancamentos =
        registros.map((m) => {
          const dataOriginal =
            m.data ||
            m.criado_em ||
            "";

          let dataFormatada =
            dataOriginal.slice(
              0,
              10
            );

          if (dataFormatada) {
            const partes =
              dataFormatada.split(
                "-"
              );

            if (
              partes.length === 3
            ) {
              dataFormatada =
                `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
          }

          return {
            Data: dataFormatada,

            Tipo:
              m.tipo === "entrada"
                ? "Entrada"
                : "Saída",

            Categoria:
              nomeCategoria(m),

            Descrição:
              m.descricao || "",

            Valor:
              Number(m.valor || 0)
          };
        });

      const planilhaLancamentos =
        XLSX.utils.json_to_sheet(
          linhasLancamentos
        );

      planilhaLancamentos[
        "!cols"
      ] = [
          { wch: 14 },
          { wch: 14 },
          { wch: 25 },
          { wch: 42 },
          { wch: 18 }
        ];

      planilhaLancamentos[
        "!autofilter"
      ] = {
        ref:
          `A1:E${linhasLancamentos.length + 1}`
      };

      // ==========================================
      // CABEÇALHO LANÇAMENTOS
      // ==========================================

      estilizarLinha(
        planilhaLancamentos,
        1,
        5,
        {
          font: {
            bold: true,
            color: {
              rgb: BRANCO
            }
          },

          fill: {
            fgColor: {
              rgb: AZUL_ESCURO
            }
          },

          alignment: {
            horizontal: "center",
            vertical: "center"
          },

          border: borda
        }
      );

      // ==========================================
      // LINHAS DOS LANÇAMENTOS
      // ==========================================

      for (
        let linha = 2;
        linha <=
        linhasLancamentos.length + 1;
        linha++
      ) {
        const tipo =
          planilhaLancamentos[
            `B${linha}`
          ]?.v;

        const entrada =
          tipo === "Entrada";

        estilizarLinha(
          planilhaLancamentos,
          linha,
          5,
          {
            fill: {
              fgColor: {
                rgb: entrada
                  ? VERDE_CLARO
                  : VERMELHO_CLARO
              }
            },

            border: borda,

            alignment: {
              vertical: "center"
            }
          }
        );

        // Tipo
        if (
          planilhaLancamentos[
          `B${linha}`
          ]
        ) {
          planilhaLancamentos[
            `B${linha}`
          ].s.font = {
            bold: true,

            color: {
              rgb: entrada
                ? VERDE
                : VERMELHO
            }
          };

          planilhaLancamentos[
            `B${linha}`
          ].s.alignment = {
            horizontal: "center",
            vertical: "center"
          };
        }

        // Valor
        if (
          planilhaLancamentos[
          `E${linha}`
          ]
        ) {
          planilhaLancamentos[
            `E${linha}`
          ].z =
            '"R$" #,##0.00';

          planilhaLancamentos[
            `E${linha}`
          ].s.font = {
            bold: true,

            color: {
              rgb: entrada
                ? VERDE
                : VERMELHO
            }
          };

          planilhaLancamentos[
            `E${linha}`
          ].s.alignment = {
            horizontal: "right",
            vertical: "center"
          };
        }

        // Data
        if (
          planilhaLancamentos[
          `A${linha}`
          ]
        ) {
          planilhaLancamentos[
            `A${linha}`
          ].s.alignment = {
            horizontal: "center",
            vertical: "center"
          };
        }
      }

      // ==========================================
      // ALTURA DAS LINHAS
      // ==========================================

      planilhaResumo[
        "!rows"
      ] = [
          { hpt: 30 },
          { hpt: 20 },
          { hpt: 8 },
          { hpt: 24 },
          { hpt: 24 },
          { hpt: 22 },
          { hpt: 22 },
          { hpt: 22 },
          { hpt: 8 },
          { hpt: 24 },
          { hpt: 24 }
        ];

      planilhaLancamentos[
        "!rows"
      ] = [
          { hpt: 24 },
          ...linhasLancamentos.map(
            () => ({
              hpt: 20
            })
          )
        ];

      // ==========================================
      // CRIA O ARQUIVO
      // ==========================================

      const pasta =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        pasta,
        planilhaResumo,
        "RESUMO"
      );

      XLSX.utils.book_append_sheet(
        pasta,
        planilhaLancamentos,
        "LANÇAMENTOS"
      );

      XLSX.writeFile(
        pasta,
        nomeArquivo("xlsx")
      );

      setMensagem(
        "Planilha Excel profissional gerada com sucesso."
      );
    } catch (erro) {
      console.error(
        "Erro ao gerar Excel:",
        erro
      );

      setMensagem(
        "Não foi possível gerar o Excel."
      );
    }
  }

  // ==========================================
  // EXPORTAR PDF
  // ==========================================

  async function exportarPDF() {
  setMenuExportar(false);

  if (!registros.length) {
    setMensagem(
      "Não há movimentações no período selecionado para exportar."
    );
    return;
  }

  try {
    const doc = new jsPDF();

    // ==========================================
    // CORES
    // ==========================================

    const AZUL = [33, 59, 80];
    const AZUL_MEDIO = [46, 91, 115];
    const VERDE = [21, 128, 61];
    const VERMELHO = [185, 28, 28];
    const CINZA = [100, 116, 139];
    const CINZA_CLARO = [241, 245, 249];
    const BRANCO = [255, 255, 255];

    // ==========================================
    // CABEÇALHO
    // ==========================================

    doc.setFillColor(
      AZUL[0],
      AZUL[1],
      AZUL[2]
    );

    doc.rect(
      0,
      0,
      210,
      32,
      "F"
    );

    doc.setTextColor(
      BRANCO[0],
      BRANCO[1],
      BRANCO[2]
    );

    doc.setFontSize(20);

    doc.setFont(undefined, "bold");

    doc.text(
      "VIV IA FINANCEIRA",
      14,
      14
    );

    doc.setFontSize(11);

    doc.setFont(undefined, "normal");

    doc.text(
      "Relatório financeiro",
      14,
      22
    );

    doc.text(
      `Período: ${periodoTexto()}`,
      196,
      20,
      {
        align: "right"
      }
    );

    // ==========================================
    // CARDS DE RESUMO
    // ==========================================

    const cards = [
      {
        titulo: "ENTRADAS",
        valor: moeda(entradas),
        cor: VERDE
      },
      {
        titulo: "DESPESAS",
        valor: moeda(saidas),
        cor: VERMELHO
      },
      {
        titulo: "SALDO",
        valor: moeda(entradas - saidas),
        cor: AZUL_MEDIO
      }
    ];

    const cardY = 42;
    const cardW = 57;
    const cardH = 25;
    const cardGap = 8;

    cards.forEach(
      (card, indice) => {
        const x =
          14 +
          indice *
            (cardW + cardGap);

        doc.setFillColor(
          248,
          250,
          252
        );

        doc.roundedRect(
          x,
          cardY,
          cardW,
          cardH,
          3,
          3,
          "F"
        );

        doc.setFillColor(
          card.cor[0],
          card.cor[1],
          card.cor[2]
        );

        doc.roundedRect(
          x,
          cardY,
          4,
          cardH,
          2,
          2,
          "F"
        );

        doc.setTextColor(
          CINZA[0],
          CINZA[1],
          CINZA[2]
        );

        doc.setFontSize(8);

        doc.setFont(
          undefined,
          "bold"
        );

        doc.text(
          card.titulo,
          x + 8,
          cardY + 8
        );

        doc.setTextColor(
          card.cor[0],
          card.cor[1],
          card.cor[2]
        );

        doc.setFontSize(12);

        doc.text(
          card.valor,
          x + 8,
          cardY + 18
        );
      }
    );

    // ==========================================
    // GRÁFICO DE PIZZA
    // ==========================================

    const categoriasGrafico =
      despesas.filter(
        (item) =>
          Number(item.valor) > 0
      );

    const centroX = 58;
    const centroY = 105;
    const raio = 29;

    let anguloInicial = -Math.PI / 2;

    if (categoriasGrafico.length) {
      categoriasGrafico.forEach(
        (item) => {
          const percentual =
            saidas > 0
              ? Number(item.valor) /
                saidas
              : 0;

          const anguloFinal =
            anguloInicial +
            percentual *
              Math.PI *
              2;

          const corHex =
            item.cor || "#64748B";

          const cor =
            corHex.replace(
              "#",
              ""
            );

          const r = parseInt(
            cor.substring(0, 2),
            16
          );

          const g = parseInt(
            cor.substring(2, 4),
            16
          );

          const b = parseInt(
            cor.substring(4, 6),
            16
          );

          doc.setFillColor(
            r,
            g,
            b
          );

          // Divide a fatia em pequenos
          // triângulos para formar o gráfico circular.
          const passos = Math.max(
            2,
            Math.ceil(
              (anguloFinal -
                anguloInicial) *
                30
            )
          );

          let anguloAtual =
            anguloInicial;

          for (
            let i = 0;
            i < passos;
            i++
          ) {
            const proximoAngulo =
              anguloInicial +
              ((anguloFinal -
                anguloInicial) *
                (i + 1)) /
                passos;

            const x1 =
              centroX +
              Math.cos(
                anguloAtual
              ) *
                raio;

            const y1 =
              centroY +
              Math.sin(
                anguloAtual
              ) *
                raio;

            const x2 =
              centroX +
              Math.cos(
                proximoAngulo
              ) *
                raio;

            const y2 =
              centroY +
              Math.sin(
                proximoAngulo
              ) *
                raio;

            doc.triangle(
              centroX,
              centroY,
              x1,
              y1,
              x2,
              y2,
              "F"
            );

            anguloAtual =
              proximoAngulo;
          }

          anguloInicial =
            anguloFinal;
        }
      );

      // Círculo branco no centro
      // para dar aparência de gráfico
      // moderno tipo donut.

      doc.setFillColor(
        BRANCO[0],
        BRANCO[1],
        BRANCO[2]
      );

      doc.circle(
        centroX,
        centroY,
        11,
        "F"
      );

      doc.setTextColor(
        AZUL[0],
        AZUL[1],
        AZUL[2]
      );

      doc.setFontSize(8);

      doc.setFont(
        undefined,
        "bold"
      );

      doc.text(
        "DESPESAS",
        centroX,
        centroY - 1,
        {
          align: "center"
        }
      );

      doc.setFontSize(7);

      doc.setFont(
        undefined,
        "normal"
      );

      doc.text(
        moeda(saidas),
        centroX,
        centroY + 4,
        {
          align: "center"
        }
      );
    } else {
      doc.setFillColor(
        AZUL[0],
        AZUL[1],
        AZUL[2]
      );

      doc.circle(
        centroX,
        centroY,
        raio,
        "F"
      );
    }

    // ==========================================
    // TÍTULO DA LEGENDA
    // ==========================================

    doc.setTextColor(
      AZUL[0],
      AZUL[1],
      AZUL[2]
    );

    doc.setFontSize(12);

    doc.setFont(
      undefined,
      "bold"
    );

    doc.text(
      "Despesas por categoria",
      105,
      80
    );

    // ==========================================
    // LEGENDA
    // ==========================================

    let legendaY = 91;

    categoriasGrafico.forEach(
      (item) => {
        const percentual =
          saidas > 0
            ? (Number(item.valor) /
                saidas) *
              100
            : 0;

        const corHex =
          item.cor || "#64748B";

        const cor =
          corHex.replace(
            "#",
            ""
          );

        const r = parseInt(
          cor.substring(0, 2),
          16
        );

        const g = parseInt(
          cor.substring(2, 4),
          16
        );

        const b = parseInt(
          cor.substring(4, 6),
          16
        );

        doc.setFillColor(
          r,
          g,
          b
        );

        doc.circle(
          108,
          legendaY - 1,
          2.5,
          "F"
        );

        doc.setTextColor(
          AZUL[0],
          AZUL[1],
          AZUL[2]
        );

        doc.setFontSize(8);

        doc.setFont(
          undefined,
          "bold"
        );

        doc.text(
          item.nome,
          114,
          legendaY
        );

        doc.setFont(
          undefined,
          "normal"
        );

        doc.setTextColor(
          CINZA[0],
          CINZA[1],
          CINZA[2]
        );

        doc.text(
          `${moeda(
            item.valor
          )}  •  ${percentual.toFixed(
            1
          )}%`,
          114,
          legendaY + 5
        );

        legendaY += 15;
      }
    );

    // ==========================================
    // LINHA SEPARADORA
    // ==========================================

    doc.setDrawColor(
      220,
      226,
      232
    );

    doc.line(
      14,
      143,
      196,
      143
    );

    // ==========================================
    // TÍTULO DOS LANÇAMENTOS
    // ==========================================

    doc.setTextColor(
      AZUL[0],
      AZUL[1],
      AZUL[2]
    );

    doc.setFontSize(13);

    doc.setFont(
      undefined,
      "bold"
    );

    doc.text(
      "Lançamentos financeiros",
      14,
      153
    );

    // ==========================================
    // DADOS DA TABELA
    // ==========================================

    const corpo =
      registros.map(
        (m) => [
          (
            m.data ||
            m.criado_em ||
            ""
          ).slice(0, 10),

          m.descricao || "",

          nomeCategoria(m),

          m.tipo === "entrada"
            ? "Entrada"
            : "Saída",

          moeda(m.valor)
        ]
      );

    // ==========================================
    // TABELA
    // ==========================================

    autoTable(doc, {
      startY: 158,

      head: [
        [
          "Data",
          "Descrição",
          "Categoria",
          "Tipo",
          "Valor"
        ]
      ],

      body: corpo,

      theme: "grid",

      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: [
          220,
          226,
          232
        ],
        lineWidth: 0.2,
        textColor: [
          30,
          41,
          59
        ]
      },

      headStyles: {
        fillColor: AZUL,
        textColor: BRANCO,
        fontStyle: "bold",
        halign: "center"
      },

      columnStyles: {
        0: {
          halign: "center",
          cellWidth: 25
        },

        1: {
          cellWidth: 55
        },

        2: {
          cellWidth: 42
        },

        3: {
          halign: "center",
          cellWidth: 28
        },

        4: {
          halign: "right",
          cellWidth: 32
        }
      },

      didParseCell: (
        data
      ) => {
        if (
          data.section ===
          "body"
        ) {
          const tipo =
            data.row.raw?.[3];

          if (
            tipo ===
            "Entrada"
          ) {
            data.cell.styles.textColor =
              VERDE;
          }

          if (
            tipo ===
            "Saída"
          ) {
            data.cell.styles.textColor =
              VERMELHO;
          }

          if (
            data.column.index ===
            3
          ) {
            data.cell.styles.fontStyle =
              "bold";
          }

          if (
            data.column.index ===
            4
          ) {
            data.cell.styles.fontStyle =
              "bold";
          }
        }
      },

      alternateRowStyles: {
        fillColor: [
          248,
          250,
          252
        ]
      },

      margin: {
        left: 14,
        right: 14
      }
    });

    // ==========================================
    // RODAPÉ EM TODAS AS PÁGINAS
    // ==========================================

    const totalPaginas =
      doc.internal.getNumberOfPages();

    for (
      let pagina = 1;
      pagina <= totalPaginas;
      pagina++
    ) {
      doc.setPage(
        pagina
      );

      doc.setDrawColor(
        220,
        226,
        232
      );

      doc.line(
        14,
        285,
        196,
        285
      );

      doc.setFontSize(7);

      doc.setTextColor(
        100,
        116,
        139
      );

      doc.setFont(
        undefined,
        "normal"
      );

      doc.text(
        "VIV IA Financeira",
        14,
        291
      );

      doc.text(
        `Página ${pagina} de ${totalPaginas}`,
        196,
        291,
        {
          align: "right"
        }
      );
    }

    // ==========================================
    // SALVAR
    // ==========================================

    doc.save(
      nomeArquivo("pdf")
    );

    setMensagem(
      "PDF profissional com gráfico gerado com sucesso."
    );
  } catch (erro) {
    console.error(
      "Erro ao gerar PDF:",
      erro
    );

    setMensagem(
      "Não foi possível gerar o PDF."
    );
  }
}

  // ==========================================
  // ZERAR RELATÓRIO
  // ==========================================

  async function zerarRelatorio() {
    if (!movimentacoes.length) {
      setMensagem(
        "Não há movimentações para apagar."
      );
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
      const {
        data,
        error: erroUsuario
      } = await supabase.auth.getUser();

      if (erroUsuario || !data.user) {
        throw new Error(
          "Não foi possível identificar o usuário logado."
        );
      }

      const { error } = await supabase
        .from("movimentacoes")
        .delete()
        .eq(
          "usuario_id",
          data.user.id
        );

      if (error) throw error;

      setMensagem(
        "Relatório zerado com sucesso."
      );

      window.location.reload();
    } catch (erro) {
      setMensagem(
        "Erro ao zerar relatório: " +
        erro.message
      );

      setApagando(false);
    }
  }

  // ==========================================
  // MESES DISPONÍVEIS
  // ==========================================

  const meses = useMemo(() => {
    return [
      ...new Set(
        movimentacoes
          .map((m) =>
            (
              m.data ||
              m.criado_em ||
              ""
            ).slice(0, 7)
          )
          .filter(Boolean)
      )
    ]
      .sort()
      .reverse();
  }, [movimentacoes]);

  // ==========================================
  // REGISTROS DO PERÍODO
  // ==========================================

  const registros = useMemo(() => {
    return movimentacoes.filter((m) => {
      const data = (
        m.data ||
        m.criado_em ||
        ""
      ).slice(0, 7);

      return (
        mes === "todos" ||
        data === mes
      );
    });
  }, [movimentacoes, mes]);

  // ==========================================
  // TOTAIS
  // ==========================================

  const entradas = registros
    .filter(
      (m) => m.tipo === "entrada"
    )
    .reduce(
      (soma, m) =>
        soma + Number(m.valor),
      0
    );

  const saidas = registros
    .filter(
      (m) => m.tipo === "saida"
    )
    .reduce(
      (soma, m) =>
        soma + Number(m.valor),
      0
    );

  // ==========================================
  // DESPESAS POR CATEGORIA
  // ==========================================

  const despesas = useMemo(() => {
    const grupos = new Map();

    registros
      .filter(
        (m) => m.tipo === "saida"
      )
      .forEach((m) => {
        const categoria =
          categorias.find(
            (c) =>
              c.id === m.categoria_id
          );

        const chave =
          categoria?.id ||
          "sem-categoria";

        if (!grupos.has(chave)) {
          grupos.set(chave, {
            id: chave,
            nome:
              categoria?.nome ||
              "Sem categoria",
            cor:
              categoria?.cor ||
              "#64748B",
            valor: 0
          });
        }

        grupos.get(chave).valor +=
          Number(m.valor);
      });

    return [...grupos.values()].sort(
      (a, b) =>
        b.valor - a.valor
    );
  }, [registros, categorias]);

  let acumulado = 0;

  const segmentos =
    despesas.map((item) => {
      const inicio = acumulado;

      const percentual =
        saidas > 0
          ? (item.valor / saidas) * 100
          : 0;

      acumulado += percentual;

      return {
        ...item,
        percentual,
        inicio,
        fim: acumulado
      };
    });

  const fundoGrafico =
    segmentos.length
      ? `conic-gradient(${segmentos
        .map(
          (item) =>
            `${item.cor} ${item.inicio}% ${item.fim}%`
        )
        .join(", ")})`
      : "#213b50";

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="vivi-relatorios">
      <div className="relatorios-cabecalho">
        <div>
          <h2>Análise financeira</h2>

          <p>
            Descubra como seu dinheiro está
            distribuído.
          </p>
        </div>

        <div className="relatorios-acoes">
          <div className="relatorios-exportar">
            <button
              type="button"
              className="relatorios-exportar-botao"
              onClick={() =>
                setMenuExportar(
                  (aberto) => !aberto
                )
              }
              disabled={
                registros.length === 0
              }
            >
              Exportar ▾
            </button>

            {menuExportar && (
              <div className="relatorios-exportar-menu">
                <button
                  type="button"
                  onClick={exportarExcel}
                >
                  Excel (.xlsx)
                </button>

                <button
                  type="button"
                  onClick={exportarPDF}
                >
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="relatorios-zerar"
            onClick={zerarRelatorio}
            disabled={
              apagando ||
              movimentacoes.length === 0
            }
          >
            {apagando
              ? "Zerando..."
              : "Zerar relatório"}
          </button>

          <label>
            Período

            <select
              value={mes}
              onChange={(e) =>
                setMes(e.target.value)
              }
            >
              <option value="todos">
                Todo o período
              </option>

              {meses.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item.slice(5)}/
                  {item.slice(0, 4)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {mensagem && (
        <p className="relatorios-mensagem">
          {mensagem}
        </p>
      )}

      <div className="relatorios-indicadores">
        <article className="relatorios-entrada">
          <span>Entradas</span>
          <strong>
            {moeda(entradas)}
          </strong>
        </article>

        <article className="relatorios-saida">
          <span>Despesas</span>
          <strong>
            {moeda(saidas)}
          </strong>
        </article>

        <article className="relatorios-saldo">
          <span>
            Resultado do período
          </span>

          <strong>
            {moeda(
              entradas - saidas
            )}
          </strong>
        </article>
      </div>

      <section className="relatorios-painel">
        <h3>
          Despesas por categoria
        </h3>

        {saidas === 0 ? (
          <p>
            Nenhuma despesa registrada
            para o período selecionado.
          </p>
        ) : (
          <div className="relatorios-conteudo">
            <div
              className="relatorios-grafico"
              style={{
                background:
                  fundoGrafico
              }}
              role="img"
              aria-label="Distribuição das despesas por categoria"
            >
              <div className="relatorios-centro">
                <small>
                  Total de despesas
                </small>

                <strong>
                  {moeda(saidas)}
                </strong>
              </div>
            </div>

            <div className="relatorios-lista">
              {segmentos.map(
                (item) => (
                  <div
                    className="relatorios-categoria"
                    key={item.id}
                  >
                    <div className="relatorios-nome">
                      <span
                        className="relatorios-cor"
                        style={{
                          background:
                            item.cor
                        }}
                      />

                      <strong>
                        {item.nome}
                      </strong>

                      <span>
                        {item.percentual.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>

                    <div className="relatorios-barra">
                      <div
                        style={{
                          width:
                            item.percentual +
                            "%",
                          background:
                            item.cor
                        }}
                      />
                    </div>

                    <small>
                      {moeda(
                        item.valor
                      )}
                    </small>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}