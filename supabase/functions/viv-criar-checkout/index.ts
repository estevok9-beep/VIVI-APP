import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const resposta = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers,
  });

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
    /*
     * 1. Usuário precisa estar autenticado na VIV.
     */
    const authorization =
      req.headers.get("Authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return resposta(
        { erro: "Autenticação obrigatória" },
        401,
      );
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !anonKey) {
      return resposta(
        { erro: "Configuração do Supabase incompleta" },
        503,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      anonKey,
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
      error: erroUsuario,
    } = await supabase.auth.getUser();

    if (erroUsuario || !user?.id || !user?.email) {
      return resposta(
        { erro: "Sessão inválida" },
        401,
      );
    }

    /*
     * 2. Identifica o plano solicitado.
     */
    let body: any = {};

    try {
      body = await req.json();
    } catch {
      return resposta(
        { erro: "Dados inválidos" },
        400,
      );
    }

    const plano = String(body?.plano || "");

    const planos: Record<
      string,
      {
        titulo: string;
        valor: number;
      }
    > = {
      mensal: {
        titulo: "VIV IA Financeira - Plano Mensal",
        valor: 20,
      },

      anual: {
        titulo: "VIV IA Financeira - Plano Anual",
        valor: 180,
      },
    };

    if (!Object.hasOwn(planos, plano)) {
      return resposta(
        { erro: "Plano inválido" },
        400,
      );
    }

    /*
     * 3. Credenciais/configurações.
     */
    const accessToken =
      Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");

    const site =
      Deno.env.get("VIV_SITE_URL");

    const checkoutTesteAtivo =
      Deno.env.get("VIV_CHECKOUT_TESTE_ATIVO") ===
      "true";

    if (!accessToken) {
      return resposta(
        {
          erro:
            "MERCADOPAGO_ACCESS_TOKEN não configurado",
        },
        503,
      );
    }

    if (!site || !/^https:\/\//i.test(site)) {
      return resposta(
        {
          erro:
            "VIV_SITE_URL precisa ser um endereço HTTPS válido",
        },
        503,
      );
    }

    /*
     * Por enquanto mantemos a trava de teste.
     *
     * Só depois de validarmos as credenciais e
     * configurações do Mercado Pago vamos
     * habilitar o fluxo definitivo de produção.
     */
    if (!checkoutTesteAtivo) {
      return resposta(
        {
          erro:
            "Checkout de teste está desativado",
        },
        503,
      );
    }

    const item = planos[plano];

    /*
     * 4. Referência que permitirá ao webhook
     * identificar usuário e plano.
     */
    const externalReference =
      `${user.id}:${plano}:${crypto.randomUUID()}`;

    const projectRef =
      "gawtsodwexprxuokzvlm";

    const notificationUrl =
      `https://${projectRef}.supabase.co/functions/v1/viv-mercadopago-webhook`;

    /*
     * 5. Criação da preferência no Mercado Pago.
     */
    const respostaMercadoPago = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          "X-Idempotency-Key":
            crypto.randomUUID(),
        },

        body: JSON.stringify({
          items: [
            {
              title: item.titulo,
              quantity: 1,
              currency_id: "BRL",
              unit_price: item.valor,
            },
          ],

          payer: {
            email: user.email,
          },

          external_reference:
            externalReference,

          notification_url:
            notificationUrl,

          back_urls: {
            success: site,
            pending: site,
            failure: site,
          },

          auto_return: "approved",
        }),
      },
    );

    const data =
      await respostaMercadoPago.json();

    if (!respostaMercadoPago.ok) {
      console.error(
        "Erro Mercado Pago:",
        data,
      );

      return resposta(
        {
          erro:
            "Não foi possível criar o checkout",
          detalhe:
            data?.message ||
            "Erro retornado pelo Mercado Pago",
        },
        502,
      );
    }

    /*
     * Enquanto estivermos em teste,
     * aceitamos somente sandbox_init_point.
     */
    if (!data?.sandbox_init_point) {
      console.error(
        "Checkout criado sem sandbox_init_point:",
        {
          preference_id: data?.id,
        },
      );

      return resposta(
        {
          erro:
            "Mercado Pago não retornou checkout de teste",
        },
        502,
      );
    }

    console.log(
      "Checkout VIV criado.",
      {
        usuarioId: user.id,
        plano,
        preferenceId: data.id,
        modo: "sandbox",
      },
    );

    return resposta({
      url: data.sandbox_init_point,
      preference_id: data.id,
      modo: "sandbox",
    });
  } catch (erro) {
    console.error(
      "Erro inesperado ao criar checkout:",
      erro,
    );

    return resposta(
      { erro: "Falha ao preparar checkout" },
      500,
    );
  }
});