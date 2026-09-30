const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extrairTextoResposta(data: any): string {
  if (!Array.isArray(data?.output)) {
    return "";
  }

  const textos: string[] = [];

  for (const item of data.output) {
    if (
      item?.type !== "message" ||
      !Array.isArray(item?.content)
    ) {
      continue;
    }

    for (const content of item.content) {
      if (
        content?.type === "output_text" &&
        typeof content?.text === "string"
      ) {
        textos.push(content.text);
      }
    }
  }

  return textos.join("\n").trim();
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarReal(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBrasilISO(): string {
  const partes = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const ano =
    partes.find((p) => p.type === "year")?.value;

  const mes =
    partes.find((p) => p.type === "month")?.value;

  const dia =
    partes.find((p) => p.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(
  dataISO: string,
  quantidade: number,
): string {
  const [ano, mes, dia] =
    dataISO.split("-").map(Number);

  const data = new Date(
    Date.UTC(ano, mes - 1, dia),
  );

  data.setUTCDate(
    data.getUTCDate() + quantidade,
  );

  const novoAno =
    data.getUTCFullYear();

  const novoMes =
    String(
      data.getUTCMonth() + 1,
    ).padStart(2, "0");

  const novoDia =
    String(
      data.getUTCDate(),
    ).padStart(2, "0");

  return `${novoAno}-${novoMes}-${novoDia}`;
}

function dataValidaISO(
  dataISO: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dataISO)
  ) {
    return false;
  }

  const [ano, mes, dia] =
    dataISO.split("-").map(Number);

  const data = new Date(
    Date.UTC(ano, mes - 1, dia),
  );

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() + 1 === mes &&
    data.getUTCDate() === dia
  );
}

function formatarDataBR(
  dataISO: string,
): string {
  const [ano, mes, dia] =
    dataISO.split("-");

  return `${dia}/${mes}/${ano}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Método não permitido.",
        },
        405,
      );
    }

    const openaiApiKey =
      Deno.env.get("OPENAI_API_KEY");

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    if (!openaiApiKey) {
      throw new Error(
        "OPENAI_API_KEY não configurada.",
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Configuração do Supabase não encontrada.",
      );
    }

    /*
     * AUTENTICAÇÃO
     */

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        {
          success: false,
          error: "Usuário não autenticado.",
        },
        401,
      );
    }

    const authResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          Authorization: authorization,
          apikey: supabaseAnonKey,
        },
      },
    );

    if (!authResponse.ok) {
      return jsonResponse(
        {
          success: false,
          error: "Sessão inválida ou expirada.",
        },
        401,
      );
    }

    const usuario =
      await authResponse.json();

    if (!usuario?.id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível identificar o usuário.",
        },
        401,
      );
    }

    /*
     * RECEBE A MENSAGEM
     */

    let body: any;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Corpo da requisição inválido.",
        },
        400,
      );
    }

    const mensagem =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!mensagem) {
      return jsonResponse(
        {
          success: false,
          error:
            "Envie uma mensagem para a VIV.",
        },
        400,
      );
    }

    if (mensagem.length > 4000) {
      return jsonResponse(
        {
          success: false,
          error: "Mensagem muito longa.",
        },
        400,
      );
    }

    /*
     * BUSCA CATEGORIAS DO USUÁRIO
     */

    const categoriasUrl =
      `${supabaseUrl}/rest/v1/categorias` +
      `?select=id,nome,tipo` +
      `&usuario_id=eq.${encodeURIComponent(
        usuario.id,
      )}` +
      `&order=nome.asc`;

    const categoriasResponse =
      await fetch(
        categoriasUrl,
        {
          method: "GET",
          headers: {
            Authorization: authorization,
            apikey: supabaseAnonKey,
          },
        },
      );

    if (!categoriasResponse.ok) {
      const erroCategorias =
        await categoriasResponse.text();

      console.error(
        "Erro ao buscar categorias:",
        erroCategorias,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível carregar suas categorias.",
        },
        500,
      );
    }

    const categorias =
      await categoriasResponse.json();

    const listaCategorias =
      Array.isArray(categorias) &&
      categorias.length > 0
        ? categorias
            .map(
              (categoria: any) =>
                `${categoria.nome} [${categoria.tipo}]`,
            )
            .join(", ")
        : "Nenhuma categoria cadastrada.";

    /*
     * DATAS DO BRASIL
     */

    const hojeISO =
      dataBrasilISO();

    const ontemISO =
      adicionarDias(
        hojeISO,
        -1,
      );

    const hojeBR =
      formatarDataBR(hojeISO);

    const ontemBR =
      formatarDataBR(ontemISO);

    /*
     * OPENAI
     */

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${openaiApiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: "gpt-6-luna",

          reasoning: {
            effort: "low",
          },

          instructions: `
Você é VIV, uma assistente financeira pessoal brasileira.

Sua função é conversar com o usuário e identificar movimentações financeiras que devem ser registradas.

INFORMAÇÕES DE DATA:

Hoje no Brasil é:
${hojeBR}

Data ISO de hoje:
${hojeISO}

Ontem foi:
${ontemBR}

Data ISO de ontem:
${ontemISO}

O fuso horário utilizado pelo sistema é America/Sao_Paulo.

CATEGORIAS CADASTRADAS PELO USUÁRIO:

${listaCategorias}

REGRAS:

1. Fale sempre em português do Brasil.

2. Existem duas ações:

"registrar_movimentacao"
"conversar"

3. Use "registrar_movimentacao" quando o usuário informar claramente uma movimentação financeira que já aconteceu.

Exemplos:

"Gastei 85 reais de combustível hoje."

"Paguei 120 de internet ontem."

"Comprei material por 350 reais dia 25."

"Recebi 1500 reais de um serviço hoje."

"Entrou 500 reais ontem."

4. Para despesas:

tipo = "saida"

5. Para receitas e recebimentos:

tipo = "entrada"

6. O valor deve ser apenas numérico.

Exemplo:

R$ 85,00
vira:
85

R$ 1.250,50
vira:
1250.50

7. A descrição deve ser curta e clara.

Exemplos:

"Combustível"
"Internet"
"Material"
"Serviço"
"Supermercado"
"Uber"

8. CATEGORIA:

Escolha SOMENTE uma categoria existente na lista fornecida.

A categoria escolhida precisa ter tipo compatível com a movimentação.

Para uma saída, escolha categoria [saida].

Para uma entrada, escolha categoria [entrada].

Retorne exatamente o nome da categoria cadastrada.

Se nenhuma categoria existente for adequada, retorne uma string vazia.

Nunca invente categorias.

9. DATA:

O campo "data" deve SEMPRE estar no formato:

AAAA-MM-DD

Se o usuário disser "hoje", use:
${hojeISO}

Se o usuário não informar nenhuma data, considere:
${hojeISO}

Se disser "ontem", use:
${ontemISO}

Se informar uma data completa, converta para AAAA-MM-DD.

Exemplo:

"25/09/2026"
vira:
"2026-09-25"

10. Quando o usuário disser apenas:

"dia 25"

interprete como o dia 25 mais recente compatível com uma movimentação que já aconteceu.

Se o dia já ocorreu no mês atual, use o mês atual.

Se esse dia ainda estiver no futuro dentro do mês atual, interprete como o mês anterior.

11. Nunca registre uma movimentação em uma data futura.

Se o usuário estiver falando claramente de algo que ainda vai acontecer, use:

acao = "conversar"

e explique que nesta etapa a VIV registra movimentações que já aconteceram.

12. Se faltar o valor, não registre.

Use:
acao = "conversar"

e faça uma pergunta curta pedindo o valor.

13. Se a frase for apenas uma pergunta, não registre movimentação.

Exemplo:

"Quanto gastei com combustível?"

Isso é uma consulta, não uma nova despesa.

14. Para conversa normal:

acao = "conversar"
tipo = "nenhum"
descricao = ""
valor = 0
data = ""
categoria = ""

15. Para registrar:

acao = "registrar_movimentacao"

tipo deve ser:
"entrada"
ou
"saida"

descricao deve estar preenchida.

valor deve ser maior que zero.

data deve ser uma data válida no formato AAAA-MM-DD.

categoria deve conter o nome exato de uma categoria existente ou uma string vazia.

16. Nunca diga que registrou ou salvou uma movimentação.

O sistema fará o registro no banco somente depois da sua análise.

17. Entenda linguagem informal, abreviações e erros simples de digitação.

18. A resposta no campo "resposta" deve ser curta e natural.

19. Não invente valores, datas ou movimentações.

20. Se houver ambiguidade importante sobre valor ou data, pergunte antes de registrar.
          `.trim(),

          input: mensagem,

          text: {
            format: {
              type: "json_schema",

              name:
                "viv_acao_financeira",

              strict: true,

              schema: {
                type: "object",

                properties: {
                  acao: {
                    type: "string",
                    enum: [
                      "registrar_movimentacao",
                      "conversar",
                    ],
                  },

                  tipo: {
                    type: "string",
                    enum: [
                      "entrada",
                      "saida",
                      "nenhum",
                    ],
                  },

                  descricao: {
                    type: "string",
                  },

                  valor: {
                    type: "number",
                    minimum: 0,
                  },

                  data: {
                    type: "string",
                  },

                  categoria: {
                    type: "string",
                  },

                  resposta: {
                    type: "string",
                  },
                },

                required: [
                  "acao",
                  "tipo",
                  "descricao",
                  "valor",
                  "data",
                  "categoria",
                  "resposta",
                ],

                additionalProperties:
                  false,
              },
            },
          },

          max_output_tokens: 500,

          store: false,
        }),
      },
    );

    const openaiData =
      await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error(
        "Erro OpenAI:",
        JSON.stringify(openaiData),
      );

      return jsonResponse(
        {
          success: false,
          error:
            openaiData?.error?.message ||
            "Não foi possível consultar a IA.",
        },
        500,
      );
    }

    const textoEstruturado =
      extrairTextoResposta(
        openaiData,
      );

    if (!textoEstruturado) {
      console.error(
        "Resposta OpenAI sem texto:",
        JSON.stringify(openaiData),
      );

      return jsonResponse(
        {
          success: false,
          error:
            "A IA respondeu, mas nenhum texto foi retornado.",
        },
        500,
      );
    }

    let analise: any;

    try {
      analise =
        JSON.parse(
          textoEstruturado,
        );
    } catch (erro) {
      console.error(
        "Erro ao interpretar JSON da IA:",
        textoEstruturado,
        erro,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Não foi possível interpretar a resposta da VIV.",
        },
        500,
      );
    }

    /*
     * CONVERSA NORMAL
     */

    if (
      analise.acao !==
      "registrar_movimentacao"
    ) {
      return jsonResponse({
        success: true,

        resposta:
          analise.resposta ||
          "Como posso ajudar com suas finanças?",

        acao: "conversar",
      });
    }

    /*
     * VALIDA MOVIMENTAÇÃO
     */

    const tipo =
      analise.tipo;

    const descricao =
      typeof analise.descricao ===
        "string"
        ? analise.descricao.trim()
        : "";

    const valor =
      Number(analise.valor);

    const dataMovimentacao =
      typeof analise.data === "string"
        ? analise.data.trim()
        : "";

    if (
      !["entrada", "saida"].includes(
        tipo,
      ) ||
      !descricao ||
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      return jsonResponse({
        success: true,

        resposta:
          "Entendi que é uma movimentação, mas preciso do tipo, da descrição e do valor para registrá-la.",

        acao: "conversar",
      });
    }

    /*
     * VALIDA DATA
     */

    if (
      !dataValidaISO(
        dataMovimentacao,
      )
    ) {
      return jsonResponse({
        success: true,

        resposta:
          "Entendi a movimentação, mas não consegui identificar a data com segurança. Qual foi a data?",

        acao: "conversar",
      });
    }

    /*
     * BLOQUEIA DATA FUTURA
     */

    if (
      dataMovimentacao >
      hojeISO
    ) {
      return jsonResponse({
        success: true,

        resposta:
          "Essa data ainda está no futuro. Nesta etapa eu registro movimentações que já aconteceram.",

        acao: "conversar",
      });
    }

    /*
     * VALIDA CATEGORIA
     */

    let categoriaId:
      string | null = null;

    let categoriaNome = "";

    const categoriaInformada =
      typeof analise.categoria ===
        "string"
        ? analise.categoria.trim()
        : "";

    if (
      categoriaInformada &&
      Array.isArray(categorias)
    ) {
      const categoriaEncontrada =
        categorias.find(
          (categoria: any) =>
            categoria.tipo === tipo &&
            normalizarTexto(
              categoria.nome || "",
            ) ===
              normalizarTexto(
                categoriaInformada,
              ),
        );

      if (categoriaEncontrada) {
        categoriaId =
          categoriaEncontrada.id;

        categoriaNome =
          categoriaEncontrada.nome;
      }
    }

    /*
     * REGISTRA NO BANCO
     *
     * Agora enviamos "data" explicitamente.
     */

    const movimentacao = {
      usuario_id: usuario.id,
      tipo,
      descricao,
      valor,
      data: dataMovimentacao,
      categoria_id: categoriaId,
    };

    const inserirResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/movimentacoes`,
        {
          method: "POST",

          headers: {
            Authorization:
              authorization,

            apikey:
              supabaseAnonKey,

            "Content-Type":
              "application/json",

            Prefer:
              "return=minimal",
          },

          body: JSON.stringify(
            movimentacao,
          ),
        },
      );

    if (!inserirResponse.ok) {
      const erroBanco =
        await inserirResponse.text();

      console.error(
        "Erro ao registrar movimentação:",
        erroBanco,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Entendi a movimentação, mas não consegui registrá-la no banco.",
        },
        500,
      );
    }

    /*
     * CONFIRMAÇÃO
     */

    const nomeTipo =
      tipo === "entrada"
        ? "entrada"
        : "saída";

    let resposta =
      `Registrei: ${nomeTipo} de ` +
      `${formatarReal(valor)} — ${descricao}.`;

    if (categoriaNome) {
      resposta +=
        ` Categoria: ${categoriaNome}.`;
    }

    if (
      dataMovimentacao !==
      hojeISO
    ) {
      resposta +=
        ` Data: ${formatarDataBR(
          dataMovimentacao,
        )}.`;
    }

    return jsonResponse({
      success: true,

      resposta,

      acao:
        "movimentacao_registrada",

      movimentacao: {
        tipo,
        descricao,
        valor,
        data:
          dataMovimentacao,
        categoria_id:
          categoriaId,
        categoria:
          categoriaNome || null,
      },
    });
  } catch (error) {
    console.error(
      "Erro vivi-ai:",
      error,
    );

    return jsonResponse(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erro interno da VIV.",
      },
      500,
    );
  }
});