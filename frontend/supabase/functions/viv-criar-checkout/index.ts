// Etapa 1: checkout de teste, pagamento avulso. NÃO concede acesso nem renova assinaturas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const resposta = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return resposta({ erro: "Método não permitido" }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return resposta({ erro: "Autenticação obrigatória" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return resposta({ erro: "Sessão inválida" }, 401);
    const body = await req.json();
    const plano = body?.plano;
    const planos: Record<string, { titulo: string; valor: number }> = { mensal: { titulo: "Viv Mensal - teste", valor: 20 }, anual: { titulo: "Viv Anual - teste", valor: 180 } };
    if (!Object.hasOwn(planos, plano)) return resposta({ erro: "Plano inválido" }, 400);
    const token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!token) return resposta({ erro: "Token de teste não configurado" }, 503);
    // Para evitar cobranças acidentais, a função exige habilitação explícita no ambiente de teste.
    if (Deno.env.get("VIV_CHECKOUT_TESTE_ATIVO") !== "true") return resposta({ erro: "Checkout de teste desativado. Configure VIV_CHECKOUT_TESTE_ATIVO=true somente após revisar a integração." }, 503);
    const site = Deno.env.get("VIV_SITE_URL");
    if (!site || !/^https:\/\//.test(site)) return resposta({ erro: "Configure VIV_SITE_URL com o endereço HTTPS da Viv" }, 503);
    const item = planos[plano];
    const mp = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ items: [{ title: item.titulo, quantity: 1, currency_id: "BRL", unit_price: item.valor }], payer: { email: user.email }, external_reference: `${user.id}:${plano}:${crypto.randomUUID()}`, back_urls: { success: site, pending: site, failure: site } }) });
    const data = await mp.json();
    if (!mp.ok || !data.sandbox_init_point) return resposta({ erro: "Não foi possível criar checkout de teste", detalhe: data?.message || "Confira a configuração da aplicação Mercado Pago" }, 502);
    return resposta({ url: data.sandbox_init_point });
  } catch { return resposta({ erro: "Falha ao preparar checkout" }, 500); }
});
