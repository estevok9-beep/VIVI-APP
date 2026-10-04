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
  const xSignature =
    req.headers.get("x-signature") || "";

  const xRequestId =
    req.headers.get("x-request-id") || "";

  if (!xSignature || !xRequestId) {
    return false;
  }

  let ts = "";
  let v1 = "";

  for (const parte of xSignature.split(",")) {
    const [chave, valor] =
      parte.trim().split("=");

    if (chave === "ts") {
      ts = valor || "";
    }

    if (chave === "v1") {
      v1 = valor || "";
    }
  }

  if (!ts || !v1) {
    return false;
  }

  /*
   * Proteção contra replay.
   */
  const timestamp = Number(ts);

  if (!Number.isFinite(timestamp)) {
    console.error(
      "Timestamp HMAC inválido.",
    );

    return false;
  }

  const agora = Date.now();

  /*
   * O timestamp pode chegar em segundos
   * ou milissegundos.
   */
  const timestampMs =
    timestamp < 10_000_000_000
      ? timestamp * 1000
      : timestamp;

  /*
   * Janela máxima aceita: 5 minutos.
   */
  const diferenca =
    Math.abs(agora - timestampMs);

  if (diferenca > 5 * 60 * 1000) {
    console.error(
      "Webhook rejeitado por timestamp expirado.",
      {
        diferencaMs: diferenca,
      },
    );

    return false;
  }

  const manifesto =
    `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const chave =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );

  const assinatura =
    await crypto.subtle.sign(
      "HMAC",
      chave,
      encoder.encode(manifesto),
    );

  const hashCalculado =
    bytesParaHex(
      new Uint8Array(assinatura),
    );

  return comparacaoSegura(
    hashCalculado.toLowerCase(),
    v1.toLowerCase(),
  );
}

function adicionarMeses(
  data: Date,
  meses: number,
) {
  const resultado = new Date(data);

  const diaOriginal =
    resultado.getUTCDate();

  resultado.setUTCDate(1);

  resultado.setUTCMonth(
    resultado.getUTCMonth() + meses,
  );

  const ultimoDia =
    new Date(
      Date.UTC(
        resultado.getUTCFullYear(),
        resultado.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();

  resultado.setUTCDate(
    Math.min(
      diaOriginal,
      ultimoDia,
    ),
  );

  return resultado;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(
      null,
      { headers },
    );
  }

  if (req.method !== "POST") {
    return resposta(
      {
        erro:
          "Método não permitido",
      },
      405,
    );
  }

  try {
    const accessToken =
      Deno.env.get(
        "MERCADOPAGO_ACCESS_TOKEN",
      );

    const webhookSecret =
      Deno.env.get(
        "MERCADOPAGO_WEBHOOK_SECRET",
      );

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

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
        {
          erro:
            "Configuração incompleta",
        },
        503,
      );
    }

    const url =
      new URL(req.url);

    let body: any = {};

    try {
      body =
        await req.json();
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

    if (
      tipo &&
      tipo !== "payment"
    ) {
      return resposta({
        recebido: true,
        ignorado: true,
        tipo,
      });
    }

    if (!dataId) {
      return resposta(
        {
          erro:
            "ID do pagamento ausente",
        },
        400,
      );
    }

    /*
     * Validação HMAC.
     */
    const assinaturaValida =
      await validarAssinaturaMercadoPago(
        req,
        dataId,
        webhookSecret,
      );

    if (!assinaturaValida) {
      console.error(
        "Assinatura HMAC inválida.",
        {
          dataId,
        },
      );

      return resposta(
        {
          erro:
            "Assinatura inválida",
        },
        401,
      );
    }

    /*
     * Consulta o pagamento diretamente
     * na API do Mercado Pago.
     */
    const respostaPagamento =
      await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
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

    const pagamentoId =
      String(pagamento.id);

    const statusPagamento =
      String(
        pagamento.status || "",
      );

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
      );

    /*
     * ESTORNO / CHARGEBACK
     *
     * Mantemos o processamento existente
     * através da função PostgreSQL.
     */
    if (
      statusPagamento ===
        "refunded" ||
      statusPagamento ===
        "charged_back"
    ) {
      const {
        data: resultadoEstorno,
        error: erroEstorno,
      } = await supabase.rpc(
        "vivi_processar_estorno",
        {
          p_pagamento_id:
            pagamentoId,

          p_status_pagamento:
            statusPagamento,
        },
      );

      if (erroEstorno) {
        console.error(
          "Erro ao processar estorno da assinatura.",
          erroEstorno,
        );

        return resposta(
          {
            erro:
              "Erro ao processar estorno",
          },
          500,
        );
      }

      console.log(
        "Pagamento VIV estornado.",
        {
          pagamentoId,
          status:
            statusPagamento,
          resultado:
            resultadoEstorno,
        },
      );

      return resposta({
        recebido: true,
        pagamento_id:
          pagamentoId,
        status:
          statusPagamento,
        assinatura_ativada:
          false,
        assinatura_estornada:
          true,
        resultado:
          resultadoEstorno,
      });
    }

    /*
     * Pagamentos que ainda não foram
     * aprovados não ativam assinatura.
     */
    if (
      statusPagamento !==
        "approved"
    ) {
      return resposta({
        recebido: true,
        pagamento_id:
          pagamentoId,
        status:
          statusPagamento,
        assinatura_ativada:
          false,
      });
    }

    /*
     * IMPORTANTE:
     *
     * Primeiro verificamos se esse pagamento
     * já foi processado anteriormente.
     *
     * Isso mantém compatibilidade com os
     * pagamentos realizados antes da criação
     * da tabela vivi_checkouts.
     */
    const {
      data: assinaturaExistente,
      error: erroConsultaPagamento,
    } = await supabase
      .from("viv_assinaturas")
      .select(
        "id, status, status_pagamento, vencimento_em",
      )
      .eq(
        "pagamento_id",
        pagamentoId,
      )
      .maybeSingle();

    if (erroConsultaPagamento) {
      console.error(
        "Erro ao verificar pagamento existente.",
        erroConsultaPagamento,
      );

      return resposta(
        {
          erro:
            "Erro interno",
        },
        500,
      );
    }

    if (assinaturaExistente) {
      /*
       * Pagamentos antigos ou notificações
       * repetidas continuam sendo reconhecidos
       * normalmente.
       */
      return resposta({
        recebido: true,
        pagamento_id:
          pagamentoId,
        assinatura_ativada:
          assinaturaExistente.status ===
          "ativa",
        ja_processado: true,
        status_pagamento:
          assinaturaExistente
            .status_pagamento,
      });
    }

    /*
     * A partir daqui é obrigatória
     * a existência de um checkout
     * criado oficialmente pela VIV.
     */
    const referencia =
      String(
        pagamento.external_reference ||
        "",
      );

    const partes =
      referencia.split(":");

    if (partes.length !== 3) {
      console.error(
        "External reference inválida.",
        referencia,
      );

      return resposta(
        {
          erro:
            "Referência inválida",
        },
        400,
      );
    }

    const [
      usuarioId,
      plano,
      identificador,
    ] = partes;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      !uuidRegex.test(usuarioId) ||
      !uuidRegex.test(identificador)
    ) {
      console.error(
        "UUID inválido na referência.",
      );

      return resposta(
        {
          erro:
            "Referência inválida",
        },
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

    if (
      !Object.hasOwn(
        planos,
        plano,
      )
    ) {
      return resposta(
        {
          erro:
            "Plano inválido",
        },
        400,
      );
    }

    const configuracaoPlano =
      planos[plano];

    const moeda =
      String(
        pagamento.currency_id ||
        "",
      );

    const valor =
      Number(
        pagamento.transaction_amount,
      );

    if (
      moeda !== "BRL" ||
      !Number.isFinite(valor) ||
      Math.abs(
        valor -
          configuracaoPlano.valor,
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

    /*
     * PROVA DE ORIGEM DO CHECKOUT
     *
     * O external_reference precisa existir
     * na tabela criada pelo servidor da VIV.
     */
    const {
      data: checkout,
      error: erroCheckout,
    } = await supabase
      .from("vivi_checkouts")
      .select(
        "id, usuario_id, preference_id, external_reference, plano, valor, status, pagamento_id",
      )
      .eq(
        "external_reference",
        referencia,
      )
      .maybeSingle();

    if (erroCheckout) {
      console.error(
        "Erro ao validar checkout VIV.",
        erroCheckout,
      );

      return resposta(
        {
          erro:
            "Erro ao validar checkout",
        },
        500,
      );
    }

    if (!checkout) {
      console.error(
        "Pagamento rejeitado: checkout não registrado pela VIV.",
        {
          pagamentoId,
          referencia,
        },
      );

      return resposta(
        {
          erro:
            "Checkout não reconhecido",
        },
        403,
      );
    }

    /*
     * Confere se os dados do pagamento
     * são exatamente os dados registrados
     * quando o checkout foi criado.
     */
    if (
      checkout.usuario_id !==
        usuarioId ||
      checkout.plano !==
        plano ||
      Math.abs(
        Number(checkout.valor) -
          configuracaoPlano.valor,
      ) > 0.01
    ) {
      console.error(
        "Pagamento incompatível com checkout VIV.",
        {
          pagamentoId,
          checkoutId:
            checkout.id,
        },
      );

      return resposta(
        {
          erro:
            "Checkout incompatível",
        },
        403,
      );
    }

    /*
     * Um checkout que já possui outro
     * pagamento não pode ser reutilizado.
     */
    if (
      checkout.pagamento_id &&
      checkout.pagamento_id !==
        pagamentoId
    ) {
      console.error(
        "Checkout já utilizado por outro pagamento.",
        {
          checkoutId:
            checkout.id,
          pagamentoId,
        },
      );

      return resposta(
        {
          erro:
            "Checkout já utilizado",
        },
        409,
      );
    }

    const agora =
      new Date();

    /*
     * Se já existe assinatura ativa,
     * a renovação começa no maior
     * vencimento atual.
     */
    const {
      data: assinaturaAtual,
      error: erroAssinaturaAtual,
    } = await supabase
      .from("viv_assinaturas")
      .select(
        "vencimento_em",
      )
      .eq(
        "usuario_id",
        usuarioId,
      )
      .eq(
        "status",
        "ativa",
      )
      .gt(
        "vencimento_em",
        agora.toISOString(),
      )
      .order(
        "vencimento_em",
        {
          ascending: false,
        },
      )
      .limit(1)
      .maybeSingle();

    if (erroAssinaturaAtual) {
      console.error(
        "Erro ao consultar assinatura atual.",
        erroAssinaturaAtual,
      );

      return resposta(
        {
          erro:
            "Erro interno",
        },
        500,
      );
    }

    const inicioRenovacao =
      assinaturaAtual?.vencimento_em
        ? new Date(
            assinaturaAtual
              .vencimento_em,
          )
        : agora;

    const vencimento =
      adicionarMeses(
        inicioRenovacao,
        configuracaoPlano.meses,
      );

    /*
     * O preference_id agora vem do
     * registro interno da VIV.
     */
    const preferenciaId =
      checkout.preference_id;

    /*
     * Registra a assinatura.
     */
    const {
      data: novaAssinatura,
      error: erroInsercao,
    } = await supabase
      .from("viv_assinaturas")
      .insert({
        usuario_id:
          usuarioId,

        plano,

        status:
          "ativa",

        status_pagamento:
          "approved",

        pagamento_id:
          pagamentoId,

        preferencia_id:
          preferenciaId,

        valor:
          configuracaoPlano.valor,

        inicio_em:
          agora.toISOString(),

        vencimento_em:
          vencimento.toISOString(),

        atualizado_em:
          agora.toISOString(),

        origem:
          "mercadopago",
      })
      .select(
        "id, plano, status, status_pagamento, vencimento_em",
      )
      .single();

    if (erroInsercao) {
      console.error(
        "Erro ao registrar assinatura.",
        erroInsercao,
      );

      return resposta(
        {
          erro:
            "Erro ao registrar assinatura",
        },
        500,
      );
    }

    /*
     * Marca o checkout como efetivamente pago
     * e vincula o ID real do pagamento.
     */
    const {
      error: erroAtualizarCheckout,
    } = await supabase
      .from("vivi_checkouts")
      .update({
        status:
          "pago",

        pagamento_id:
          pagamentoId,

        atualizado_em:
          agora.toISOString(),
      })
      .eq(
        "id",
        checkout.id,
      );

    if (erroAtualizarCheckout) {
      /*
       * A assinatura já foi registrada.
       * Não apagamos nem adicionamos período
       * novamente. Registramos o problema
       * para auditoria.
       */
      console.error(
        "Assinatura criada, mas houve erro ao atualizar checkout.",
        {
          pagamentoId,
          checkoutId:
            checkout.id,
          erro:
            erroAtualizarCheckout,
        },
      );
    }

    console.log(
      "Assinatura VIV ativada.",
      {
        usuarioId,
        plano,
        pagamentoId,
        preferenceId:
          preferenciaId,
        checkoutId:
          checkout.id,
        vencimento:
          novaAssinatura
            .vencimento_em,
      },
    );

    return resposta({
      recebido: true,
      pagamento_id:
        pagamentoId,
      preference_id:
        preferenciaId,
      checkout_validado:
        true,
      assinatura_ativada:
        true,
      plano:
        novaAssinatura.plano,
      status_pagamento:
        novaAssinatura
          .status_pagamento,
      vencimento_em:
        novaAssinatura
          .vencimento_em,
    });
  } catch (erro) {
    console.error(
      "Erro inesperado no webhook.",
      erro,
    );

    return resposta(
      {
        erro:
          "Erro interno do webhook",
      },
      500,
    );
  }
});