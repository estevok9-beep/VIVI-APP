const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function extrairTextoResposta(data: any): string {
  if (!Array.isArray(data?.output)) return "";

  const textos: string[] = [];

  for (const item of data.output) {
    if (item?.type !== "message" || !Array.isArray(item?.content)) continue;

    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
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
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const dia = partes.find((p) => p.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(dataISO: string, quantidade: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + quantidade);

  const novoAno = data.getUTCFullYear();
  const novoMes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const novoDia = String(data.getUTCDate()).padStart(2, "0");

  return `${novoAno}-${novoMes}-${novoDia}`;
}

function dataValidaISO(dataISO: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return false;

  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() + 1 === mes &&
    data.getUTCDate() === dia
  );
}

function formatarDataBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function primeiroDiaMes(dataISO: string): string {
  const [ano, mes] = dataISO.split("-");
  return `${ano}-${mes}-01`;
}

function ultimoDiaMes(dataISO: string): string {
  const [ano, mes] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes, 0));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`;
}

function inicioAno(dataISO: string): string {
  return `${dataISO.slice(0, 4)}-01-01`;
}

function mesAnterior(dataISO: string): { inicio: string; fim: string } {
  const [ano, mes] = dataISO.split("-").map(Number);
  const primeiroAtual = new Date(Date.UTC(ano, mes - 1, 1));
  primeiroAtual.setUTCMonth(primeiroAtual.getUTCMonth() - 1);

  const anoAnterior = primeiroAtual.getUTCFullYear();
  const mesAnteriorNumero = primeiroAtual.getUTCMonth() + 1;
  const inicio = `${anoAnterior}-${String(mesAnteriorNumero).padStart(2, "0")}-01`;
  const fimData = new Date(Date.UTC(anoAnterior, mesAnteriorNumero, 0));
  const fim = `${fimData.getUTCFullYear()}-${String(fimData.getUTCMonth() + 1).padStart(2, "0")}-${String(fimData.getUTCDate()).padStart(2, "0")}`;

  return { inicio, fim };
}

function somarValores(movimentacoes: any[], tipo?: "entrada" | "saida"): number {
  return movimentacoes
    .filter((m) => !tipo || m.tipo === tipo)
    .reduce((total, m) => total + Number(m.valor || 0), 0);
}

function descricaoPeriodo(inicio: string, fim: string, hojeISO: string, ontemISO: string): string {
  if (inicio === hojeISO && fim === hojeISO) return "hoje";
  if (inicio === ontemISO && fim === ontemISO) return "ontem";
  if (inicio === primeiroDiaMes(hojeISO) && fim === hojeISO) return "neste mês";
  if (inicio === inicioAno(hojeISO) && fim === hojeISO) return "neste ano";
  if (inicio === fim) return `em ${formatarDataBR(inicio)}`;
  return `de ${formatarDataBR(inicio)} a ${formatarDataBR(fim)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Método não permitido." }, 405);
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!openaiApiKey) throw new Error("OPENAI_API_KEY não configurada.");
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Configuração do Supabase não encontrada.");
    }

    // AUTENTICAÇÃO
    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse({ success: false, error: "Usuário não autenticado." }, 401);
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        Authorization: authorization,
        apikey: supabaseAnonKey,
      },
    });

    if (!authResponse.ok) {
      return jsonResponse({ success: false, error: "Sessão inválida ou expirada." }, 401);
    }

    const usuario = await authResponse.json();

    if (!usuario?.id) {
      return jsonResponse(
        { success: false, error: "Não foi possível identificar o usuário." },
        401,
      );
    }

    // MENSAGEM
    let body: any;

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Corpo da requisição inválido." }, 400);
    }

    const mensagem = typeof body?.message === "string" ? body.message.trim() : "";

    if (!mensagem) {
      return jsonResponse({ success: false, error: "Envie uma mensagem para a VIV." }, 400);
    }

    if (mensagem.length > 4000) {
      return jsonResponse({ success: false, error: "Mensagem muito longa." }, 400);
    }

    // CATEGORIAS DO USUÁRIO
    const categoriasUrl =
      `${supabaseUrl}/rest/v1/categorias` +
      `?select=id,nome,tipo` +
      `&usuario_id=eq.${encodeURIComponent(usuario.id)}` +
      `&order=nome.asc`;

    const categoriasResponse = await fetch(categoriasUrl, {
      method: "GET",
      headers: {
        Authorization: authorization,
        apikey: supabaseAnonKey,
      },
    });

    if (!categoriasResponse.ok) {
      const erroCategorias = await categoriasResponse.text();
      console.error("Erro ao buscar categorias:", erroCategorias);
      return jsonResponse(
        { success: false, error: "Não foi possível carregar suas categorias." },
        500,
      );
    }

    const categorias = await categoriasResponse.json();

    const listaCategorias =
      Array.isArray(categorias) && categorias.length > 0
        ? categorias
            .map((categoria: any) => `${categoria.nome} [${categoria.tipo}]`)
            .join(", ")
        : "Nenhuma categoria cadastrada.";

    // DATAS DO BRASIL
    const hojeISO = dataBrasilISO();
    const ontemISO = adicionarDias(hojeISO, -1);
    const hojeBR = formatarDataBR(hojeISO);
    const ontemBR = formatarDataBR(ontemISO);
    const inicioMesISO = primeiroDiaMes(hojeISO);
    const fimMesISO = ultimoDiaMes(hojeISO);
    const inicioAnoISO = inicioAno(hojeISO);
    const mesAnteriorISO = mesAnterior(hojeISO);
    const ultimos7DiasISO = adicionarDias(hojeISO, -6);

    // OPENAI: interpreta intenção, nunca calcula os totais
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        reasoning: { effort: "low" },
        instructions: `
Você é VIV, uma assistente financeira pessoal brasileira.

Sua função é conversar com o usuário, identificar movimentações financeiras para registro e identificar consultas sobre movimentações já registradas.

INFORMAÇÕES DE DATA:
Hoje no Brasil é ${hojeBR} (${hojeISO}).
Ontem foi ${ontemBR} (${ontemISO}).
Início do mês atual: ${inicioMesISO}.
Fim do mês atual: ${fimMesISO}.
Início do ano atual: ${inicioAnoISO}.
Mês passado: ${mesAnteriorISO.inicio} até ${mesAnteriorISO.fim}.
Últimos 7 dias: ${ultimos7DiasISO} até ${hojeISO}.
Fuso horário: America/Sao_Paulo.

CATEGORIAS CADASTRADAS PELO USUÁRIO:
${listaCategorias}

AÇÕES POSSÍVEIS:
- "registrar_movimentacao"
- "consultar_movimentacoes"
- "conversar"

REGRAS PARA REGISTRO:
1. Use "registrar_movimentacao" quando o usuário informar claramente uma movimentação que já aconteceu.
2. Despesa: tipo = "saida". Receita/recebimento: tipo = "entrada".
3. O valor deve ser numérico e maior que zero.
4. A descrição deve ser curta e clara.
5. Escolha SOMENTE uma categoria existente e compatível com o tipo. Se nenhuma servir, categoria = "". Nunca invente categoria.
6. O campo data deve ser AAAA-MM-DD.
7. "hoje" = ${hojeISO}; sem data = ${hojeISO}; "ontem" = ${ontemISO}.
8. Para "dia 25", use o dia 25 mais recente que não esteja no futuro.
9. Nunca registre data futura. Se for algo futuro, use "conversar".
10. Se faltar valor ou houver ambiguidade importante, use "conversar" e faça uma pergunta curta.
11. Nunca diga que salvou/registrou. O servidor confirmará somente depois do INSERT.

REGRAS PARA CONSULTAS:
12. Use "consultar_movimentacoes" quando o usuário perguntar sobre dados financeiros já registrados.
13. consulta deve ser UMA destas opções:
- "total_saidas": quanto gastou/despesas.
- "total_entradas": quanto recebeu/entradas.
- "saldo": entradas menos saídas.
- "maior_despesa": maior saída individual.
- "maior_receita": maior entrada individual.
- "categoria_maior_gasto": categoria com maior soma de saídas.
- "categoria_maior_entrada": categoria com maior soma de entradas.
- "listar_movimentacoes": quando pedir quais/últimas movimentações ou histórico de um período.
14. Para consulta, defina data_inicio e data_fim em AAAA-MM-DD.
15. "hoje": início=fim=${hojeISO}.
16. "ontem": início=fim=${ontemISO}.
17. "este mês"/"nesse mês": início=${inicioMesISO}, fim=${hojeISO}.
18. "este ano": início=${inicioAnoISO}, fim=${hojeISO}.
19. "mês passado": início=${mesAnteriorISO.inicio}, fim=${mesAnteriorISO.fim}.
20. "últimos 7 dias"/"última semana": início=${ultimos7DiasISO}, fim=${hojeISO}.
21. Se a consulta NÃO informar período, use o mês atual: início=${inicioMesISO}, fim=${hojeISO}.
22. Nunca use data futura como fim de uma consulta.
23. Se a consulta mencionar uma categoria, retorne o nome exato de uma categoria cadastrada em categoria_consulta. Se não mencionar, use "".
24. Para consultas, NÃO invente valores e NÃO tente calcular totais. O servidor buscará o banco e fará os cálculos.
25. Em consultas, resposta pode ser uma frase curta como "Vou consultar."; ela não será usada como resultado financeiro.

CONVERSA NORMAL:
26. Use "conversar" para conversa comum ou quando faltarem dados indispensáveis.
27. Para conversar: tipo="nenhum", descricao="", valor=0, data="", categoria="", consulta="nenhuma", data_inicio="", data_fim="", categoria_consulta="".
28. Entenda português informal, abreviações e erros simples de digitação.
29. Fale sempre em português do Brasil.
        `.trim(),
        input: mensagem,
        text: {
          format: {
            type: "json_schema",
            name: "viv_acao_financeira",
            strict: true,
            schema: {
              type: "object",
              properties: {
                acao: {
                  type: "string",
                  enum: [
                    "registrar_movimentacao",
                    "consultar_movimentacoes",
                    "conversar",
                  ],
                },
                tipo: {
                  type: "string",
                  enum: ["entrada", "saida", "nenhum"],
                },
                descricao: { type: "string" },
                valor: { type: "number", minimum: 0 },
                data: { type: "string" },
                categoria: { type: "string" },
                consulta: {
                  type: "string",
                  enum: [
                    "total_saidas",
                    "total_entradas",
                    "saldo",
                    "maior_despesa",
                    "maior_receita",
                    "categoria_maior_gasto",
                    "categoria_maior_entrada",
                    "listar_movimentacoes",
                    "nenhuma",
                  ],
                },
                data_inicio: { type: "string" },
                data_fim: { type: "string" },
                categoria_consulta: { type: "string" },
                resposta: { type: "string" },
              },
              required: [
                "acao",
                "tipo",
                "descricao",
                "valor",
                "data",
                "categoria",
                "consulta",
                "data_inicio",
                "data_fim",
                "categoria_consulta",
                "resposta",
              ],
              additionalProperties: false,
            },
          },
        },
        max_output_tokens: 700,
        store: false,
      }),
    });

    const openaiData = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("Erro OpenAI:", JSON.stringify(openaiData));
      return jsonResponse(
        {
          success: false,
          error: openaiData?.error?.message || "Não foi possível consultar a IA.",
        },
        500,
      );
    }

    const textoEstruturado = extrairTextoResposta(openaiData);

    if (!textoEstruturado) {
      console.error("Resposta OpenAI sem texto:", JSON.stringify(openaiData));
      return jsonResponse(
        { success: false, error: "A IA respondeu, mas nenhum texto foi retornado." },
        500,
      );
    }

    let analise: any;

    try {
      analise = JSON.parse(textoEstruturado);
    } catch (erro) {
      console.error("Erro ao interpretar JSON da IA:", textoEstruturado, erro);
      return jsonResponse(
        { success: false, error: "Não foi possível interpretar a resposta da VIV." },
        500,
      );
    }

    // CONSULTA FINANCEIRA
    if (analise.acao === "consultar_movimentacoes") {
      const consultasPermitidas = [
        "total_saidas",
        "total_entradas",
        "saldo",
        "maior_despesa",
        "maior_receita",
        "categoria_maior_gasto",
        "categoria_maior_entrada",
        "listar_movimentacoes",
      ];

      const consulta = typeof analise.consulta === "string" ? analise.consulta : "";
      let dataInicio = typeof analise.data_inicio === "string" ? analise.data_inicio.trim() : "";
      let dataFim = typeof analise.data_fim === "string" ? analise.data_fim.trim() : "";

      if (!consultasPermitidas.includes(consulta)) {
        return jsonResponse({
          success: true,
          resposta: "Não consegui identificar qual consulta financeira você quer fazer.",
          acao: "conversar",
        });
      }

      if (!dataValidaISO(dataInicio) || !dataValidaISO(dataFim)) {
        dataInicio = inicioMesISO;
        dataFim = hojeISO;
      }

      if (dataFim > hojeISO) dataFim = hojeISO;

      if (dataInicio > dataFim) {
        return jsonResponse({
          success: true,
          resposta: "Não consegui identificar esse período com segurança. Informe a data ou o período que deseja consultar.",
          acao: "conversar",
        });
      }

      let categoriaConsulta: any = null;
      const categoriaInformada =
        typeof analise.categoria_consulta === "string"
          ? analise.categoria_consulta.trim()
          : "";

      if (categoriaInformada && Array.isArray(categorias)) {
        categoriaConsulta = categorias.find(
          (categoria: any) =>
            normalizarTexto(categoria.nome || "") ===
            normalizarTexto(categoriaInformada),
        );

        if (!categoriaConsulta) {
          return jsonResponse({
            success: true,
            resposta: `Não encontrei a categoria "${categoriaInformada}" nas suas categorias cadastradas.`,
            acao: "consulta_realizada",
          });
        }
      }

      const params = new URLSearchParams();
      params.set("select", "id,tipo,descricao,valor,data,categoria_id");
      params.set("usuario_id", `eq.${usuario.id}`);
      params.set("data", `gte.${dataInicio}`);
      params.append("data", `lte.${dataFim}`);
      params.set("order", "data.desc,criado_em.desc");
      params.set("limit", "1000");

      if (categoriaConsulta?.id) {
        params.set("categoria_id", `eq.${categoriaConsulta.id}`);
      }

      const movimentacoesResponse = await fetch(
        `${supabaseUrl}/rest/v1/movimentacoes?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: authorization,
            apikey: supabaseAnonKey,
          },
        },
      );

      if (!movimentacoesResponse.ok) {
        const erroConsulta = await movimentacoesResponse.text();
        console.error("Erro ao consultar movimentações:", erroConsulta);
        return jsonResponse(
          { success: false, error: "Não foi possível consultar suas movimentações." },
          500,
        );
      }

      const movimentacoes = await movimentacoesResponse.json();
      const lista = Array.isArray(movimentacoes) ? movimentacoes : [];
      const periodo = descricaoPeriodo(dataInicio, dataFim, hojeISO, ontemISO);
      const sufixoCategoria = categoriaConsulta?.nome
        ? ` na categoria ${categoriaConsulta.nome}`
        : "";

      if (consulta === "total_saidas") {
        const total = somarValores(lista, "saida");
        return jsonResponse({
          success: true,
          resposta: `Você gastou ${formatarReal(total)} ${periodo}${sufixoCategoria}.`,
          acao: "consulta_realizada",
          consulta: { tipo: consulta, total, data_inicio: dataInicio, data_fim: dataFim },
        });
      }

      if (consulta === "total_entradas") {
        const total = somarValores(lista, "entrada");
        return jsonResponse({
          success: true,
          resposta: `Você recebeu ${formatarReal(total)} ${periodo}${sufixoCategoria}.`,
          acao: "consulta_realizada",
          consulta: { tipo: consulta, total, data_inicio: dataInicio, data_fim: dataFim },
        });
      }

      if (consulta === "saldo") {
        const entradas = somarValores(lista, "entrada");
        const saidas = somarValores(lista, "saida");
        const saldo = entradas - saidas;
        return jsonResponse({
          success: true,
          resposta: `Seu saldo ${periodo} é ${formatarReal(saldo)}. Entradas: ${formatarReal(entradas)}. Saídas: ${formatarReal(saidas)}.`,
          acao: "consulta_realizada",
          consulta: { tipo: consulta, entradas, saidas, saldo, data_inicio: dataInicio, data_fim: dataFim },
        });
      }

      if (consulta === "maior_despesa" || consulta === "maior_receita") {
        const tipoAlvo = consulta === "maior_despesa" ? "saida" : "entrada";
        const candidatos = lista.filter((m: any) => m.tipo === tipoAlvo);
        const maior = candidatos.reduce(
          (atual: any, item: any) =>
            !atual || Number(item.valor) > Number(atual.valor) ? item : atual,
          null,
        );

        if (!maior) {
          const nome = tipoAlvo === "saida" ? "despesas" : "entradas";
          return jsonResponse({
            success: true,
            resposta: `Não encontrei ${nome} registradas ${periodo}${sufixoCategoria}.`,
            acao: "consulta_realizada",
          });
        }

        const rotulo = tipoAlvo === "saida" ? "maior despesa" : "maior entrada";
        return jsonResponse({
          success: true,
          resposta: `Sua ${rotulo} ${periodo}${sufixoCategoria} foi ${formatarReal(Number(maior.valor))} — ${maior.descricao}, em ${formatarDataBR(maior.data)}.`,
          acao: "consulta_realizada",
          consulta: { tipo: consulta, movimentacao: maior },
        });
      }

      if (consulta === "categoria_maior_gasto" || consulta === "categoria_maior_entrada") {
        const tipoAlvo = consulta === "categoria_maior_gasto" ? "saida" : "entrada";
        const totais = new Map<string, number>();

        for (const item of lista.filter((m: any) => m.tipo === tipoAlvo)) {
          const chave = item.categoria_id || "sem_categoria";
          totais.set(chave, (totais.get(chave) || 0) + Number(item.valor || 0));
        }

        let melhorId = "";
        let melhorTotal = 0;

        for (const [id, total] of totais.entries()) {
          if (!melhorId || total > melhorTotal) {
            melhorId = id;
            melhorTotal = total;
          }
        }

        if (!melhorId) {
          const nome = tipoAlvo === "saida" ? "despesas" : "entradas";
          return jsonResponse({
            success: true,
            resposta: `Não encontrei ${nome} registradas ${periodo}.`,
            acao: "consulta_realizada",
          });
        }

        const categoria = Array.isArray(categorias)
          ? categorias.find((c: any) => c.id === melhorId)
          : null;
        const nomeCategoria = categoria?.nome || "Sem categoria";
        const rotulo = tipoAlvo === "saida" ? "mais gastos" : "mais entradas";

        return jsonResponse({
          success: true,
          resposta: `A categoria com ${rotulo} ${periodo} foi ${nomeCategoria}, com ${formatarReal(melhorTotal)}.`,
          acao: "consulta_realizada",
          consulta: { tipo: consulta, categoria: nomeCategoria, total: melhorTotal },
        });
      }

      // listar_movimentacoes
      const itens = lista.slice(0, 10);

      if (itens.length === 0) {
        return jsonResponse({
          success: true,
          resposta: `Não encontrei movimentações ${periodo}${sufixoCategoria}.`,
          acao: "consulta_realizada",
        });
      }

      const linhas = itens.map((item: any) => {
        const sinal = item.tipo === "saida" ? "-" : "+";
        return `${formatarDataBR(item.data)}: ${item.descricao} (${sinal}${formatarReal(Number(item.valor))})`;
      });

      return jsonResponse({
        success: true,
        resposta: `Encontrei ${lista.length} movimentação(ões) ${periodo}${sufixoCategoria}. Mostrando até 10:\n${linhas.join("\n")}`,
        acao: "consulta_realizada",
        consulta: { tipo: consulta, quantidade: lista.length, itens },
      });
    }

    // CONVERSA NORMAL
    if (analise.acao !== "registrar_movimentacao") {
      return jsonResponse({
        success: true,
        resposta: analise.resposta || "Como posso ajudar com suas finanças?",
        acao: "conversar",
      });
    }

    // VALIDA MOVIMENTAÇÃO
    const tipo = analise.tipo;
    const descricao =
      typeof analise.descricao === "string" ? analise.descricao.trim() : "";
    const valor = Number(analise.valor);
    const dataMovimentacao =
      typeof analise.data === "string" ? analise.data.trim() : "";

    if (
      !["entrada", "saida"].includes(tipo) ||
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

    if (!dataValidaISO(dataMovimentacao)) {
      return jsonResponse({
        success: true,
        resposta:
          "Entendi a movimentação, mas não consegui identificar a data com segurança. Qual foi a data?",
        acao: "conversar",
      });
    }

    if (dataMovimentacao > hojeISO) {
      return jsonResponse({
        success: true,
        resposta:
          "Essa data ainda está no futuro. Nesta etapa eu registro movimentações que já aconteceram.",
        acao: "conversar",
      });
    }

    // VALIDA CATEGORIA
    let categoriaId: string | null = null;
    let categoriaNome = "";
    const categoriaInformada =
      typeof analise.categoria === "string" ? analise.categoria.trim() : "";

    if (categoriaInformada && Array.isArray(categorias)) {
      const categoriaEncontrada = categorias.find(
        (categoria: any) =>
          categoria.tipo === tipo &&
          normalizarTexto(categoria.nome || "") === normalizarTexto(categoriaInformada),
      );

      if (categoriaEncontrada) {
        categoriaId = categoriaEncontrada.id;
        categoriaNome = categoriaEncontrada.nome;
      }
    }

    // REGISTRA NO BANCO
    const movimentacao = {
      usuario_id: usuario.id,
      tipo,
      descricao,
      valor,
      data: dataMovimentacao,
      categoria_id: categoriaId,
    };

    const inserirResponse = await fetch(`${supabaseUrl}/rest/v1/movimentacoes`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(movimentacao),
    });

    if (!inserirResponse.ok) {
      const erroBanco = await inserirResponse.text();
      console.error("Erro ao registrar movimentação:", erroBanco);
      return jsonResponse(
        {
          success: false,
          error: "Entendi a movimentação, mas não consegui registrá-la no banco.",
        },
        500,
      );
    }

    // CONFIRMAÇÃO
    const nomeTipo = tipo === "entrada" ? "entrada" : "saída";
    let resposta = `Registrei: ${nomeTipo} de ${formatarReal(valor)} — ${descricao}.`;

    if (categoriaNome) resposta += ` Categoria: ${categoriaNome}.`;
    if (dataMovimentacao !== hojeISO) {
      resposta += ` Data: ${formatarDataBR(dataMovimentacao)}.`;
    }

    return jsonResponse({
      success: true,
      resposta,
      acao: "movimentacao_registrada",
      movimentacao: {
        tipo,
        descricao,
        valor,
        data: dataMovimentacao,
        categoria_id: categoriaId,
        categoria: categoriaNome || null,
      },
    });
  } catch (error) {
    console.error("Erro vivi-ai:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno da VIV.",
      },
      500,
    );
  }
});
