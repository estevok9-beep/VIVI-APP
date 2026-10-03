import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const resposta = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers });

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
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const accessToken =
      Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    const siteUrl =
      Deno.env.get("VIV_SITE_URL") ||
      "https://viv-financas.vercel.app";

    const checkoutTesteAtivo =
      Deno.env.get("VIV_CHECKOUT_TESTE_ATIVO") === "true";

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !accessToken
    ) {
      console.error(
        "Configuração incompleta do checkout.",
      );

      return resposta(
        { erro: "Configuração incompleta" },
        503,
      );
    }

    if (!checkoutTesteAtivo) {
      return resposta(
        {
          erro:
            "Checkout temporariamente desativado.",
        },
        503,
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return resposta(
        { erro: "Usuário não autenticado" },
        401,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error(
        "Falha ao validar usuário.",
        userError,
      );

      return resposta(
        { erro: "Usuário não autenticado" },
        401,
      );
    }

    let body: any = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const plano =
      String(body?.plano || "")
        .trim()
        .toLowerCase();

    const planos: Record<
      string,
      {
        titulo: string;
        valor: number;
      }
    > = {
      mensal: {
        titulo:
          "VIV IA Financeira - Plano Mensal",
        valor: 20,
      },

      anual: {
        titulo:
          "VIV IA Financeira - Plano Anual",
        valor: 180,
      },
    };

    if (!Object.hasOwn(planos, plano)) {
      return resposta(
        { erro: "Plano inválido" },
        400,
      );
    }

    const configuracaoPlano =
      planos[plano];

    const externalReference =
      `${user.id}:${plano}:${crypto.randomUUID()}`;

    const preferenceBody = {
      items: [
        {
          title: configuracaoPlano.titulo,
          quantity: 1,
          currency_id: "BRL",
          unit_price: configuracaoPlano.valor,
        },
      ],

      payer: {
        email: user.email,
      },

      external_reference:
        externalReference,

      back_urls: {
        success:
          `${siteUrl}/?pagamento=sucesso`,
        pending:
          `${siteUrl}/?pagamento=pendente`,
        failure:
          `${siteUrl}/?pagamento=falhou`,
      },

      auto_return: "approved",
    };

    const respostaMercadoPago =
      await fetch(
        "https://api.mercadopago.com/checkout/preferences",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            preferenceBody,
          ),
        },
      );

    const data =
      await respostaMercadoPago.json();

    if (!respostaMercadoPago.ok) {
      console.error(
        "Erro ao criar preferência no Mercado Pago.",
        data,
      );

      return resposta(
        {
          erro:
            "Não foi possível criar o checkout",
          detalhes: data,
        },
        502,
      );
    }

    if (!data.sandbox_init_point) {
      console.error(
        "Mercado Pago não retornou sandbox_init_point.",
        data,
      );

      return resposta(
        {
          erro:
            "Checkout de teste indisponível",
        },
        502,
      );
    }

    return resposta({
      url: data.sandbox_init_point,
      preference_id: data.id,
      modo: "sandbox",
    });
  } catch (erro) {
    console.error(
      "Erro inesperado no checkout.",
      erro,
    );

    return resposta(
      {
        erro:
          "Erro interno ao criar checkout",
      },
      500,
    );
  }
});