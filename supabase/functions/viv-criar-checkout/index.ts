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

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
      !serviceRoleKey ||
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

    /*
     * Cliente autenticado como o usuário.
     * Usado somente para validar quem está
     * solicitando o checkout.
     */
    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return resposta(
        { erro: "Usuário não autenticado" },
        401,
      );
    }

    const supabaseUsuario = createClient(
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
    } = await supabaseUsuario.auth.getUser();

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

    /*
     * Cliente interno do servidor.
     * A service role nunca é enviada ao frontend.
     */
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

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

    /*
     * Identificador único criado pela própria VIV.
     */
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

      /*
       * Metadata adicional para identificar
       * que a preferência foi criada pela VIV.
       */
      metadata: {
        viv_app: true,
        viv_usuario_id: user.id,
        viv_plano: plano,
        viv_external_reference:
          externalReference,
      },

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

    /*
     * Criação da preferência no Mercado Pago.
     */
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

    /*
     * O Mercado Pago precisa retornar
     * obrigatoriamente o ID da preferência.
     */
    const preferenceId =
      String(data?.id || "");

    if (!preferenceId) {
      console.error(
        "Mercado Pago não retornou preference_id.",
        data,
      );

      return resposta(
        {
          erro:
            "Preferência de pagamento inválida",
        },
        502,
      );
    }

    /*
     * Registra no banco que esta preferência
     * foi criada oficialmente pela VIV.
     */
    const {
      error: erroRegistroCheckout,
    } = await supabaseAdmin
      .from("vivi_checkouts")
      .insert({
        usuario_id: user.id,
        preference_id: preferenceId,
        external_reference:
          externalReference,
        plano,
        valor: configuracaoPlano.valor,
        status: "criado",
        atualizado_em:
          new Date().toISOString(),
      });

    if (erroRegistroCheckout) {
      console.error(
        "Erro ao registrar checkout VIV.",
        erroRegistroCheckout,
      );

      /*
       * Não entregamos a URL ao usuário se
       * não conseguimos registrar a preferência.
       *
       * Assim nenhum checkout novo fica fora
       * do controle interno da VIV.
       */
      return resposta(
        {
          erro:
            "Não foi possível registrar o checkout",
        },
        500,
      );
    }

    const checkoutUrl =
      checkoutTesteAtivo
        ? data.sandbox_init_point
        : data.init_point;

    if (!checkoutUrl) {
      console.error(
        "Mercado Pago não retornou URL de checkout.",
        {
          preference_id: preferenceId,
          modo: checkoutTesteAtivo
            ? "sandbox"
            : "producao",
        },
      );

      return resposta(
        {
          erro: "Checkout indisponível",
        },
        502,
      );
    }

    console.log(
      "Checkout VIV criado.",
      {
        usuarioId: user.id,
        plano,
        preferenceId,
        modo: checkoutTesteAtivo
          ? "sandbox"
          : "producao",
      },
    );

    return resposta({
      url: checkoutUrl,
      preference_id: preferenceId,
      modo: checkoutTesteAtivo
        ? "sandbox"
        : "producao",
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