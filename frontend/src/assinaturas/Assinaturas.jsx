import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import "./Assinaturas.css";

const planos = [
  {
    id: "mensal",
    titulo: "VIV Mensal",
    valor: "R$ 14,90",
    periodo: "/ mês",
  },
  {
    id: "anual",
    titulo: "VIV Anual",
    valor: "R$ 149,90",
    periodo: "/ ano",
  },
];

function formatarData(data) {
  if (!data) return "—";

  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nomePlano(plano) {
  if (plano === "mensal") return "VIV Mensal";
  if (plano === "anual") return "VIV Anual";

  return plano || "—";
}

function calcularDiasRestantes(vencimento) {
  if (!vencimento) return 0;

  const agora = new Date();
  const fim = new Date(vencimento);

  const diferenca = fim.getTime() - agora.getTime();

  return Math.max(
    0,
    Math.ceil(diferenca / (1000 * 60 * 60 * 24))
  );
}

export default function Assinaturas() {
  const [processando, setProcessando] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [assinatura, setAssinatura] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarAssinatura() {
      setCarregando(true);
      setErro("");

      try {
        const {
          data: { user },
          error: usuarioErro,
        } = await supabase.auth.getUser();

        if (usuarioErro || !user) {
          throw new Error(
            "Não foi possível identificar sua conta."
          );
        }

        const { data, error } = await supabase
          .from("viv_assinaturas")
          .select(
            "id, plano, status, valor, inicio_em, vencimento_em, criado_em"
          )
          .eq("usuario_id", user.id)
          .eq("status", "ativa")
          .order("vencimento_em", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (ativo) {
          setAssinatura(data || null);
        }
      } catch (e) {
        if (ativo) {
          setErro(
            e?.message ||
            "Não foi possível consultar sua assinatura."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarAssinatura();

    return () => {
      ativo = false;
    };
  }, []);

  async function iniciarPagamento(plano) {
    setErro("");
    setProcessando(plano);

    try {
      const {
        data: { session },
        error: sessaoErro,
      } = await supabase.auth.getSession();

      if (sessaoErro || !session) {
        throw new Error(
          "Entre na sua conta para continuar."
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          "viv-criar-checkout",
          {
            body: { plano },
          }
        );

      if (error) {
        throw new Error(
          error.message ||
          "Não foi possível iniciar o pagamento."
        );
      }

      if (!data?.url || !/^https:\/\//.test(data.url)) {
        throw new Error(
          data?.erro || "Checkout indisponível."
        );
      }

      window.location.assign(data.url);
    } catch (e) {
      setErro(
        e?.message ||
        "Não foi possível iniciar o pagamento."
      );

      setProcessando("");
    }
  }

  const assinaturaValida =
    assinatura &&
    assinatura.status === "ativa" &&
    new Date(assinatura.vencimento_em) > new Date();

  const diasRestantes = assinaturaValida
    ? calcularDiasRestantes(
      assinatura.vencimento_em
    )
    : 0;

  return (
    <section className="viv-planos">
      <header>
        <span className="viv-planos-tag">
          VIV • MINHA ASSINATURA
        </span>

        <h1>Minha Assinatura</h1>

        <p>
          Consulte seu plano atual e gerencie a renovação
          do seu acesso à VIV IA FINANCEIRA.
        </p>
      </header>

      {carregando ? (
        <article className="viv-plano">
          <h2>Carregando assinatura...</h2>
        </article>
      ) : assinaturaValida ? (
        <article className="viv-plano viv-plano-atual">
          <span className="viv-planos-tag">
            PLANO ATUAL
          </span>

          <h2>
            {nomePlano(assinatura.plano)}
          </h2>

          <strong>
            R${" "}
            {Number(
              assinatura.valor
            ).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>

          <p>
            Status: <b>Ativa</b>
          </p>

          <p>
            Início:{" "}
            <b>
              {formatarData(
                assinatura.inicio_em
              )}
            </b>
          </p>

          <p>
            Vencimento:{" "}
            <b>
              {formatarData(
                assinatura.vencimento_em
              )}
            </b>
          </p>

          <p>
            Tempo restante:{" "}
            <b>
              {diasRestantes === 1
                ? "1 dia"
                : `${diasRestantes} dias`}
            </b>
          </p>

          <span className="viv-plano-note">
            Seu acesso está ativo até a data de
            vencimento acima.
          </span>
        </article>
      ) : (
        <article className="viv-plano">
          <span className="viv-planos-tag">
            SEM PLANO ATIVO
          </span>

          <h2>
            Você não possui uma assinatura ativa
          </h2>

          <p>
            Escolha um dos planos abaixo para
            continuar utilizando a VIV IA
            FINANCEIRA.
          </p>
        </article>
      )}

      <div className="viv-planos-grid">
        {planos.map((plano) => (
          <article
            className="viv-plano"
            key={plano.id}
          >
            <h2>{plano.titulo}</h2>

            <strong>
              {plano.valor}
              <small>{plano.periodo}</small>
            </strong>

            <p>
              Pagamento seguro pelo Mercado Pago.
            </p>

            <button
              disabled={Boolean(processando)}
              onClick={() =>
                iniciarPagamento(plano.id)
              }
            >
              {processando === plano.id
                ? "Aguarde..."
                : assinaturaValida
                  ? assinatura.plano === plano.id
                    ? plano.id === "mensal"
                      ? "Renovar VIV Mensal"
                      : "Renovar VIV Anual"
                    : plano.id === "anual"
                      ? "Mudar para VIV Anual"
                      : "Mudar para VIV Mensal"
                  : plano.id === "mensal"
                    ? "Assinar VIV Mensal"
                    : "Assinar VIV Anual"}
            </button>
          </article>
        ))}
      </div>

      {erro && (
        <p
          className="viv-planos-erro"
          role="alert"
        >
          {erro}
        </p>
      )}
    </section>
  );
}