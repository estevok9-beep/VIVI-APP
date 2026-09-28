
import "./AdminPanel.css";

export default function AdminPanel() {
  const modulos = [
    {
      id: "usuarios",
      icone: "👥",
      titulo: "Usuários",
      subtitulo: "Gerenciamento das contas cadastradas",
      descricao:
        "Visualize, gerencie e acompanhe os usuários da plataforma Vivi.",
      status: "Gerenciamento em desenvolvimento",
      cor: "azul"
    },
    {
      id: "convites",
      icone: "✉️",
      titulo: "Convites",
      subtitulo: "Controle dos 20 usuários beta",
      descricao:
        "Crie, gerencie e acompanhe os convites para os primeiros usuários.",
      status: "Sistema de convites em desenvolvimento",
      cor: "roxo"
    },
    {
      id: "assinaturas",
      icone: "💳",
      titulo: "Assinaturas",
      subtitulo: "Planos e pagamentos futuros",
      descricao:
        "Gerencie planos, acompanhe assinaturas e pagamentos da plataforma.",
      status: "Em desenvolvimento",
      cor: "dourado"
    },
    {
      id: "permissoes",
      icone: "🛡️",
      titulo: "Permissões",
      subtitulo: "Controle de acesso administrativo",
      descricao:
        "Gerencie os níveis de acesso e as funções administrativas.",
      status: "Em desenvolvimento",
      cor: "verde"
    }
  ];

  return (
    <main className="vivi-admin">
      <header className="admin-cabecalho">
        <div className="admin-etiqueta">
          CENTRAL ADMINISTRATIVA
        </div>

        <h1>
          VIVI <span>ADMIN</span>
        </h1>

        <div className="admin-linha" />

        <p>Central de gerenciamento da Vivi</p>

        <small>
          GERENCIE • CONTROLE • ACOMPANHE • EVOLUA
        </small>
      </header>

      <section className="admin-modulos">
        {modulos.map((modulo) => (
          <article
            key={modulo.id}
            className={
              "admin-cartao " + modulo.cor
            }
          >
            <div className="admin-icone">
              {modulo.icone}
            </div>

            <div className="admin-conteudo">
              <h2>{modulo.titulo}</h2>

              <h3>{modulo.subtitulo}</h3>

              <p>{modulo.descricao}</p>

              <div className="admin-status">
                {modulo.status}
              </div>
            </div>

            <div
              className="admin-decoracao"
              aria-hidden="true"
            >
              {modulo.icone}
            </div>
          </article>
        ))}
      </section>

      <footer className="admin-rodape">
        VIVI © {new Date().getFullYear()}
        {" • "}
        Infraestrutura e tecnologia
      </footer>
    </main>
  );
}
