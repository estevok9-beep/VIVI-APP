import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import "./Configuracoes.css";

export default function Configuracoes({ usuario }) {
  const [nome, setNome] = useState("");
  const [avatar, setAvatar] = useState("");
  const [foto, setFoto] = useState(null);
  const [assunto, setAssunto] = useState("Bug / erro");
  const [descricao, setDescricao] = useState("");
  const [tickets, setTickets] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(() => {
    return localStorage.getItem("viv-tamanho-fonte") || "normal";
  });

  useEffect(() => {
    const tamanhos = {
      normal: "100%",
      grande: "112.5%",
      "extra-grande": "125%",
    };

    document.documentElement.style.fontSize =
      tamanhos[tamanhoFonte] || tamanhos.normal;

    localStorage.setItem("viv-tamanho-fonte", tamanhoFonte);
  }, [tamanhoFonte]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [perfil, chamados] = await Promise.all([
        supabase.from("viv_perfis").select("nome,avatar_path").eq("id", usuario.id).maybeSingle(),
        supabase.from("viv_chamados").select("id,assunto,descricao,status,created_at").order("created_at", { ascending: false }).limit(20)
      ]);
      if (!ativo) return;
      if (perfil.error || chamados.error) {
        setErro(perfil.error?.message || chamados.error?.message);
        return;
      }
      setNome(perfil.data?.nome || usuario.user_metadata?.nome || "");
      if (perfil.data?.avatar_path) {
        const { data } = await supabase.storage.from("viv-avatares").createSignedUrl(perfil.data.avatar_path, 3600);
        if (ativo && data?.signedUrl) setAvatar(data.signedUrl);
      }
      setTickets(chamados.data || []);
    }
    carregar();
    return () => { ativo = false; };
  }, [usuario.id]);

  async function salvarPerfil(e) {
    e.preventDefault();
    setErro(""); setMensagem(""); setSalvando(true);
    try {
      const nomeLimpo = nome.trim();
      if (nomeLimpo.length < 2 || nomeLimpo.length > 80) throw new Error("Informe um nome entre 2 e 80 caracteres.");
      let avatarPath;
      if (foto) {
        if (!foto.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(foto.type)) throw new Error("Envie uma foto JPG, PNG ou WebP.");
        if (foto.size > 2 * 1024 * 1024) throw new Error("A foto deve ter até 2 MB.");
        const extensao = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[foto.type];
        avatarPath = `${usuario.id}/perfil-${crypto.randomUUID()}.${extensao}`;
        const { error } = await supabase.storage.from("viv-avatares").upload(avatarPath, foto, { contentType: foto.type });
        if (error) throw error;
      }
      const dados = { id: usuario.id, nome: nomeLimpo, updated_at: new Date().toISOString() };
      if (avatarPath) dados.avatar_path = avatarPath;
      const { error } = await supabase.from("viv_perfis").upsert(dados, { onConflict: "id" });
      if (error) throw error;
      if (avatarPath) {
        const { data } = await supabase.storage.from("viv-avatares").createSignedUrl(avatarPath, 3600);
        setAvatar(data?.signedUrl || ""); setFoto(null);
      }
      setMensagem("Perfil atualizado com sucesso!");
    } catch (e) { setErro(e.message); }
    finally { setSalvando(false); }
  }

  async function enviarChamado(e) {
    e.preventDefault();
    setErro(""); setMensagem(""); setEnviando(true);
    try {
      if (descricao.trim().length < 10 || descricao.trim().length > 3000) throw new Error("Descreva o problema em 10 a 3000 caracteres.");
      const { data, error } = await supabase.from("viv_chamados")
        .insert({ usuario_id: usuario.id, assunto, descricao: descricao.trim() })
        .select("id,assunto,descricao,status,created_at").single();
      if (error) throw error;
      setTickets((atual) => [data, ...atual].slice(0, 20));
      setDescricao(""); setMensagem("Chamado registrado! Você pode acompanhar o status abaixo.");
    } catch (e) { setErro(e.message); }
    finally { setEnviando(false); }
  }

  return (
    <main className="viv-settings">
      <div className="viv-settings-heading"><span>MINHA CONTA</span><h1>Configurações</h1><p>Personalize seu perfil e converse com o suporte da Viv.</p></div>
      {erro && <p className="viv-settings-alert error" role="alert">{erro}</p>}
      {mensagem && <p className="viv-settings-alert success" role="status">{mensagem}</p>}
      <div className="viv-settings-grid">
        <section className="viv-settings-card">
          <h2>Meu perfil</h2><p>Escolha sua foto e como quer ser chamado.</p>
          <form onSubmit={salvarPerfil}>
            <div className="viv-settings-avatar">
              {avatar ? <img src={avatar} alt="Foto do perfil" /> : <span>{(nome || usuario.email || "V").charAt(0).toUpperCase()}</span>}
            </div>
            <label htmlFor="viv-foto">Foto de perfil (JPG, PNG ou WebP, até 2 MB)</label>
            <input id="viv-foto" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
            {foto && <small>Nova foto: {foto.name}</small>}
            <label htmlFor="viv-nome">Nome de exibição</label>
            <input id="viv-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Como quer ser chamado?" required />
            <label>E-mail da conta</label><input value={usuario.email || ""} readOnly aria-label="E-mail da conta" />
            <button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar perfil"}</button>
          </form>
        </section>
        <section className="viv-settings-card">
          <h2>Suporte</h2><p>Encontrou um erro ou tem uma sugestão? Registre um chamado.</p>
          <form onSubmit={enviarChamado}>
            <label htmlFor="viv-assunto">Tipo de chamado</label>
            <select id="viv-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)}>
              <option>Bug / erro</option><option>Dúvida</option><option>Sugestão</option><option>Outro</option>
            </select>
            <label htmlFor="viv-descricao">Descreva o ocorrido</label>
            <textarea id="viv-descricao" rows={7} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={3000} placeholder="O que aconteceu? Em qual tela? O que você esperava? Evite enviar senhas ou dados financeiros sensíveis." required />
            <small>{descricao.length}/3000 caracteres</small>
            <button type="submit" disabled={enviando}>{enviando ? "Enviando..." : "Abrir chamado"}</button>
          </form>
        </section>
      </div>
      <section className="viv-settings-card viv-settings-accessibility">
        <div className="viv-settings-accessibility-header">
          <div>
            <span>ACESSIBILIDADE</span>
            <h2>Tamanho da fonte</h2>
            <p>Escolha o tamanho dos textos do Viv.</p>
          </div>
          <strong aria-live="polite">
            {tamanhoFonte === "normal"
              ? "Normal"
              : tamanhoFonte === "grande"
                ? "Grande"
                : "Extra grande"}
          </strong>
        </div>

        <div className="viv-font-options" role="group" aria-label="Tamanho da fonte">
          <button
            type="button"
            className={tamanhoFonte === "normal" ? "active" : ""}
            aria-pressed={tamanhoFonte === "normal"}
            onClick={() => setTamanhoFonte("normal")}
          >
            <span className="viv-font-preview viv-font-preview-normal">Aa</span>
            <span>Normal</span>
          </button>

          <button
            type="button"
            className={tamanhoFonte === "grande" ? "active" : ""}
            aria-pressed={tamanhoFonte === "grande"}
            onClick={() => setTamanhoFonte("grande")}
          >
            <span className="viv-font-preview viv-font-preview-grande">Aa</span>
            <span>Grande</span>
          </button>

          <button
            type="button"
            className={tamanhoFonte === "extra-grande" ? "active" : ""}
            aria-pressed={tamanhoFonte === "extra-grande"}
            onClick={() => setTamanhoFonte("extra-grande")}
          >
            <span className="viv-font-preview viv-font-preview-extra">Aa</span>
            <span>Extra grande</span>
          </button>
        </div>

        <small>A escolha fica salva neste dispositivo.</small>
      </section>

      <section className="viv-settings-card viv-settings-history"><h2>Meus chamados</h2>
        {tickets.length === 0 ? <p>Você ainda não abriu nenhum chamado.</p> : tickets.map((ticket) => (
          <article key={ticket.id}><div><strong>{ticket.assunto}</strong><span className="viv-settings-status">{ticket.status}</span></div>
            <p>{ticket.descricao}</p><small>{new Date(ticket.created_at).toLocaleString("pt-BR")}</small>
          </article>
        ))}
      </section>
    </main>
  );
}
