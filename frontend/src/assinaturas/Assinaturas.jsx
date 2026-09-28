import { useState } from "react";
import { supabase } from "../supabase";
import "./Assinaturas.css";

const planos = [
  { id: "mensal", titulo: "Viv Mensal", valor: "R$ 20,00", periodo: "/ mês" },
  { id: "anual", titulo: "Viv Anual", valor: "R$ 180,00", periodo: "/ ano" }
];

export default function Assinaturas() {
  const [processando, setProcessando] = useState("");
  const [erro, setErro] = useState("");
  async function iniciarPagamento(plano) {
    setErro(""); setProcessando(plano);
    try {
      const { data: { session }, error: sessaoErro } = await supabase.auth.getSession();
      if (sessaoErro || !session) throw new Error("Entre na sua conta para continuar.");
      const { data, error } = await supabase.functions.invoke("viv-criar-checkout", { body: { plano } });
      if (error) throw new Error(error.message || "Não foi possível iniciar o pagamento.");
      if (!data?.url || !/^https:\/\//.test(data.url)) throw new Error(data?.erro || "Checkout indisponível.");
      window.location.assign(data.url);
    } catch (e) { setErro(e.message); setProcessando(""); }
  }
  return <section className="viv-planos">
    <header><span className="viv-planos-tag">VIV • ASSINATURAS</span><h1>Escolha seu plano</h1>
      <p>Pagamento seguro pelo Mercado Pago. Os planos pagos serão liberados após a confirmação do pagamento e a ativação do sistema de assinaturas.</p></header>
    <div className="viv-planos-grid">
      <article className="viv-plano"><h2>Teste gratuito</h2><strong>R$ 0</strong><p>7 dias de acesso completo para novos usuários elegíveis.</p><span className="viv-plano-note">A liberação depende das regras de acesso atuais.</span></article>
      {planos.map(p => <article className="viv-plano" key={p.id}><h2>{p.titulo}</h2><strong>{p.valor}<small>{p.periodo}</small></strong><p>Pagamento por Pix ou cartão, conforme disponibilidade no checkout.</p>
        <button disabled={Boolean(processando)} onClick={() => iniciarPagamento(p.id)}>{processando === p.id ? "Aguarde..." : "Ir para pagamento"}</button></article>)}
    </div>{erro && <p className="viv-planos-erro" role="alert">{erro}</p>}
    <p className="viv-plano-note">Ambiente de integração: não efetue pagamentos reais antes de configurar e validar o webhook e as regras de acesso.</p>
  </section>;
}
