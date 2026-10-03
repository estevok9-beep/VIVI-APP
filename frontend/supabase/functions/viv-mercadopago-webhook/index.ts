import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const resposta = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers });

const encoder = new TextEncoder();

function bytesParaHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function comparacaoSegura(a: string, b: string) {
  if (a.length !== b.length) return false;

  let diferenca = 0;

  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diferenca === 0;
}

async function validarAssinaturaMercadoPago(
  req: Request,
  dataId: string,
  webhookSecret: string,
) {
  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";

  if (!xSignature || !xRequestId) {
    return false;
  }

  let ts = "";
  let v1 = "";

  for (const parte of xSignature.split(",")) {
    const [chave, valor] = parte.trim().split("=");

    if (chave === "ts") ts = valor || "";
    if (chave === "v1") v1 = valor || "";
  }

  if (!ts || !v1) {
    return false;
  }

  const manifesto =
    `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const chave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const assinatura = await crypto.subtle.sign(
    "HMAC",
    chave,
    encoder.encode(manifesto),
  );

  const hashCalculado = bytesParaHex(
    new Uint8Array(assinatura),
  );

  return comparacaoSegura(
    hashCalculado.toLowerCase(),
    v1.toLowerCase(),
  );
}

function adicionarMeses(data: Date, meses: number) {
  const resultado = new Date(data);

  const diaOriginal = resultado.getUTCDate();

  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);

  const ultimoDia = new Date(
    Date.UTC(
      resultado.getUTCFullYear(),
      resultado.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  resultado.setUTCDate(
    Math.min(diaOriginal, ultimoDia),
  );

  return resultado;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return resposta(
      { erro: "Método não permitido" },
      405,
    );
  }

  try {
    const accessToken =
      Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    const webhookSecret =
      Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !accessToken ||
      !webhookSecret ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Configuração incompleta do webhook.",
      );

      return resposta(
        { erro: "Configuração incompleta" },
        503,
      );
    }

    const url = new URL(req.url);

    let body: any = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const dataId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      body?.data?.id?.toString() ||
      body?.id?.toString() ||
      "";

    const tipo =
      url.searchParams.get("type") ||
      url.searchParams.get("topic") ||
      body?.type ||
      body?.topic ||
      "";

    /*
     * Mercado Pago pode enviar outros tipos
     * de notificação. Só processamos payment.
     */
    if (tipo && tipo !== "payment") {
      return resposta({
        recebido: true,
        ignorado: true,
        tipo,
      });
    }

    if (!dataId) {
      return resposta(
        { erro: "ID do pagamento ausente" },
        400,
      );
    }

    const assinaturaValida =
      await validarAssinaturaMercadoPago(
        req,
        dataId,
        webhookSecret,
      );

    if (!assinaturaValida) {
      console.error(
        "Assinatura HMAC inválida.",
        { dataId },
      );

      return resposta(
        { erro: "Assinatura inválida" },
        401,
      );
    }

    /*
     * Nunca confiamos apenas no conteúdo
     * recebido pelo webhook.
     *
     * Consultamos o pagamento diretamente
     * na API oficial do Mercado Pago.
     */
    const respostaPagamento = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const pagamento =
      await respostaPagamento.json();

    if (!respostaPagamento.ok) {
      console.error(
        "Falha ao consultar pagamento.",
        pagamento,
      );

      return resposta(
        {
          erro:
            "Não foi possível consultar o pagamento",
        },
        502,
      );
    }

    /*
     * Pagamentos pendentes/rejeitados não
     * liberam assinatura.
     */
    if (pagamento.status !== "approved") {
      return resposta({
        recebido: true,
        pagamento_id: String(pagamento.id),
        status: pagamento.status,
        assinatura_ativada: false,
      });
    }

    const referencia =
      String(
        pagamento.external_reference || "",
      );

    const partes = referencia.split(":");

    if (partes.length !== 3) {
      console.error(
        "External reference inválida.",
        referencia,
      );

      return resposta(
        { erro: "Referência inválida" },
        400,
      );
    }

    const [usuarioId, plano, identificador] =
      partes;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      !uuidRegex.test(usuarioId) ||
      !uuidRegex.test(identificador)
    ) {
      return resposta(
        { erro: "Referência inválida" },
        400,
      );
    }

    const planos: Record<
      string,
      {
        valor: number;
        meses: number;
      }
    > = {
      mensal: {
        valor: 20,
        meses: 1,
      },

      anual: {
        valor: 180,
        meses: 12,
      },
    };

    if (!Object.hasOwn(planos, plano)) {
      return resposta(
        { erro: "Plano inválido" },
        400,
      );
    }

    const configuracaoPlano = planos[plano];

    const moeda =
      String(pagamento.currency_id || "");

    const valor =
      Number(pagamento.transaction_amount);

    if (
      moeda !== "BRL" ||
      !Number.isFinite(valor) ||
      Math.abs(
        valor - configuracaoPlano.valor,
      ) > 0.01
    ) {
      console.error(
        "Valor ou moeda incompatível.",
        {
          moeda,
          valor,
          plano,
        },
      );

      return resposta(
        {
          erro:
            "Valor ou moeda do pagamento inválido",
        },
        400,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const pagamentoId =
      String(pagamento.id);

    /*
     * Proteção contra notificações repetidas.
     */
    const {
      data: assinaturaExistente,
      error: erroConsultaPagamento,
    } = await supabase
      .from("viv_assinaturas")
      .select("id, vencimento_em")
      .eq("pagamento_id", pagamentoId)
      .maybeSingle();

    if (erroConsultaPagamento) {
      console.error(
        "Erro ao verificar pagamento existente.",
        erroConsultaPagamento,
      );

      return resposta(
        { erro: "Erro interno" },
        500,
      );
    }

    if (assinaturaExistente) {
      return resposta({
        recebido: true,
        pagamento_id: pagamentoId,
        assinatura_ativada: true,
        ja_processado: true,
      });
    }

    const agora = new Date();

    /*
     * Se o usuário já possui assinatura ativa,
     * a renovação começa no vencimento atual.
     */
    const {
      data: assinaturaAtual,
      error: erroAssinaturaAtual,
    } = await supabase
      .from("viv_assinaturas")
      .select("vencimento_em")
      .eq("usuario_id", usuarioId)
      .eq("status", "ativa")
      .gt(
        "vencimento_em",
        agora.toISOString(),
      )
      .order(
        "vencimento_em",
        { ascending: false },
      )
      .limit(1)
      .maybeSingle();

    if (erroAssinaturaAtual) {
      console.error(
        "Erro ao consultar assinatura atual.",
        erroAssinaturaAtual,
      );

      return resposta(
        { erro: "Erro interno" },
        500,
      );
    }

    const inicioRenovacao =
      assinaturaAtual?.vencimento_em
        ? new Date(
            assinaturaAtual.vencimento_em,
          )
        : agora;

    const vencimento = adicionarMeses(
      inicioRenovacao,
      configuracaoPlano.meses,
    );

    const preferenciaId =
      pagamento?.metadata?.preference_id ||
      pagamento?.order?.id ||
      null;

    const {
      data: novaAssinatura,
      error: erroInsercao,
    } = await supabase
      .from("viv_assinaturas")
      .insert({
        usuario_id: usuarioId,
        plano,
        status: "ativa",
        pagamento_id: pagamentoId,
        preferencia_id: preferenciaId,
        valor:
          configuracaoPlano.valor,
        inicio_em: agora.toISOString(),
        vencimento_em:
          vencimento.toISOString(),
        atualizado_em:
          agora.toISOString(),
        origem: "mercadopago",
      })
      .select(
        "id, plano, status, vencimento_em",
      )
      .single();

    if (erroInsercao) {
      /*
       * Se duas notificações do mesmo pagamento
       * chegarem simultaneamente, uma proteção
       * UNIQUE no banco impedirá duplicidade.
       */
      console.error(
        "Erro ao registrar assinatura.",
        erroInsercao,
      );

      return resposta(
        { erro: "Erro ao registrar assinatura" },
        500,
      );
    }

    console.log(
      "Assinatura VIV ativada.",
      {
        usuarioId,
        plano,
        pagamentoId,
        vencimento:
          novaAssinatura.vencimento_em,
      },
    );

    return resposta({
      recebido: true,
      pagamento_id: pagamentoId,
      assinatura_ativada: true,
      plano:
        novaAssinatura.plano,
      vencimento_em:
        novaAssinatura.vencimento_em,
    });
  } catch (erro) {
    console.error(
      "Erro inesperado no webhook.",
      erro,
    );

    return resposta(
      { erro: "Erro interno do webhook" },
      500,
    );
  }
});