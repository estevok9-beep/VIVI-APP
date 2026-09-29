
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import "./AdminPanel.css";
const LIMITE_BETA = 20;
const estilos = {
  painel: {
    maxWidth: 1200,
    margin: "30px auto",
    padding: 24,
    background: "#102339",
    color: "#ffffff",
    border: "1px solid #34536b",
    borderRadius: 18
  },
  indicadores: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    margin: "22px 0"
  },
  indicador: {
    padding: 18,
    background: "#0b1d30",
    border: "1px solid #34536b",
    borderRadius: 12
  },
  campo: {
    padding: 12,
    borderRadius: 9,
    border: "1px solid #456780",
    background: "#071929",
    color: "#ffffff",
    maxWidth: "100%",
    boxSizing: "border-box"
  },
  botao: {
    padding: "10px 15px",
    border: 0,
    borderRadius: 9,
    background: "#00bb88",
    color: "#05251b",
    fontWeight: 700,
    cursor: "pointer"
  },
  secundario: {
    padding: "10px 15px",
    border: "1px solid #456780",
    borderRadius: 9,
    background: "#173c54",
    color: "#ffffff",
    cursor: "pointer"
  },
  perigo: {
    padding: "9px 13px",
    border: 0,
    borderRadius: 8,
    background: "#a72b50",
    color: "#ffffff",
    cursor: "pointer"
  },
  tabela: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  celula: {
    padding: 12,
    borderBottom: "1px solid #29465e",
    verticalAlign: "middle"
  }
};
function formatarData(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "Data inválida"
    : data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      });
}
function situacaoConvite(convite) {
  if (convite.revogado_em) return "Revogado";
  if (!convite.ativado_em) return "Pendente";
  if (
    convite.expira_em &&
    new Date(convite.expira_em).getTime() <= Date.now()
  ) {
    return "Expirado";
  }
  return "Ativo";
}
function corSituacao(situacao) {
  switch (situacao) {
    case "Administrador":
    case "Ativo":
      return "#00e59a";
    case "Pendente":
      return "#ffd27d";
    case "Expirado":
    case "Revogado":
    case "Bloqueado":
      return "#ff8496";
    default:
      return "#b5c9d8";
  }
}
function Indicador({ titulo, valor, cor }) {
  return (
    <article style={estilos.indicador}>
      <span
        style={{
          display: "block",
          color: "#b5c9d8",
          marginBottom: 10
        }}
      >
        {titulo}
      </span>
      <strong
        style={{
          color: cor || "#ffffff",
          fontSize: 28
        }}
      >
        {valor}
      </strong>
    </article>
  );
}
function ModuloUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [selecionado, setSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [bloqueios, setBloqueios] = useState({});
  const [auditoria, setAuditoria] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [diasRenovacao, setDiasRenovacao] = useState("30");
  const [motivo, setMotivo] = useState("");

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const { data, error } = await supabase.rpc(
        "vivi_listar_usuarios"
      );
      if (error) throw error;
      const [resBloqueios, resAuditoria] = await Promise.all([
        supabase.rpc("vivi_listar_bloqueios"),
        supabase.rpc("vivi_listar_auditoria")
      ]);
      if (resBloqueios.error) throw resBloqueios.error;
      if (resAuditoria.error) throw resAuditoria.error;
      setBloqueios(Object.fromEntries((resBloqueios.data || []).map(b => [b.usuario_id, b])));
      setAuditoria(resAuditoria.data || []);
      setUsuarios(data || []);
      setSelecionado(atual => atual ? (data || []).find(u => u.usuario_id === atual.usuario_id) || null : null);
    } catch (error) {
      setErro(
        "Erro ao carregar usuários: " + error.message
      );
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);
  async function alterarBloqueio(usuario, bloquear) {
    const acao = bloquear ? "bloquear" : "desbloquear";
    if (!window.confirm(`Deseja ${acao} ${usuario.email}?`)) return;
    setProcessando(true); setErro(""); setAviso("");
    try {
      const { error } = await supabase.rpc("vivi_definir_bloqueio", {
        p_usuario_id: usuario.usuario_id,
        p_bloqueado: bloquear,
        p_motivo: bloquear ? motivo.trim() || null : null
      });
      if (error) throw error;
      setAviso(`Usuário ${bloquear ? "bloqueado" : "desbloqueado"} com sucesso.`);
      setMotivo("");
      await carregarUsuarios();
    } catch (e) { setErro(e.message); }
    finally { setProcessando(false); }
  }

  async function renovar(usuario) {
    const dias = Number(diasRenovacao);
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
      setErro("Informe de 1 a 365 dias."); return;
    }
    if (!window.confirm(`Adicionar ${dias} dias ao acesso de ${usuario.email}?`)) return;
    setProcessando(true); setErro(""); setAviso("");
    try {
      const { error } = await supabase.rpc("vivi_renovar_acesso", {
        p_usuario_id: usuario.usuario_id, p_dias: dias
      });
      if (error) throw error;
      setAviso("Acesso renovado com sucesso.");
      await carregarUsuarios();
    } catch (e) { setErro(e.message); }
    finally { setProcessando(false); }
  }

  const situacaoReal = u =>
    !u.administrador && bloqueios[u.usuario_id]?.bloqueado
      ? "Bloqueado" : u.situacao;

  const total = usuarios.length;
  const administradores = usuarios.filter(
    (usuario) => usuario.administrador
  ).length;
  const ativos = usuarios.filter(
    (usuario) => situacaoReal(usuario) === "Ativo"
  ).length;
  const vencidos = usuarios.filter(
    (usuario) => situacaoReal(usuario) === "Expirado"
  ).length;
  const revogados = usuarios.filter(
    (usuario) => situacaoReal(usuario) === "Revogado"
  ).length;
  const bloqueados = usuarios.filter(u => situacaoReal(u) === "Bloqueado").length;

  const filtrados = usuarios.filter((usuario) => {
    const termo = pesquisa.toLowerCase().trim();
    const correspondePesquisa =
      (usuario.nome || "")
        .toLowerCase()
        .includes(termo) ||
      (usuario.email || "")
        .toLowerCase()
        .includes(termo);
    const correspondeFiltro =
      filtro === "Todos" ||
      situacaoReal(usuario) === filtro;
    return correspondePesquisa && correspondeFiltro;
  });
  return (
    <section style={estilos.painel}>
      <h2>👥 Gerenciamento de usuários</h2>
      <p style={{ color: "#b5c9d8" }}>
        Consulte os usuários cadastrados e acompanhe
        a situação dos acessos.
      </p>
      <div style={estilos.indicadores}>
        <Indicador
          titulo="Cadastrados"
          valor={total}
          cor="#18b8ff"
        />
        <Indicador
          titulo="Ativos"
          valor={ativos}
          cor="#00e59a"
        />
        <Indicador
          titulo="Vencidos"
          valor={vencidos}
          cor="#ffd27d"
        />
        <Indicador
          titulo="Revogados"
          valor={revogados}
          cor="#ff8496"
        />
        <Indicador titulo="Bloqueados" valor={bloqueados} cor="#ff8496" />

        <Indicador
          titulo="Administradores"
          valor={administradores}
          cor="#d4adff"
        />
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          margin: "25px 0"
        }}
      >
        <input
          type="search"
          placeholder="Pesquisar nome ou e-mail"
          value={pesquisa}
          onChange={(evento) =>
            setPesquisa(evento.target.value)
          }
          style={{
            ...estilos.campo,
            flex: "1 1 250px"
          }}
        />
        <select
          value={filtro}
          onChange={(evento) =>
            setFiltro(evento.target.value)
          }
          style={estilos.campo}
        >
          {[
            "Todos",
            "Administrador",
            "Ativo",
            "Expirado",
            "Revogado",
            "Bloqueado",
            "Sem convite"
          ].map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={carregarUsuarios}
          disabled={carregando}
          style={estilos.secundario}
        >
          {carregando
            ? "Atualizando..."
            : "Atualizar"}
        </button>
      </div>
      {aviso && <p role="status" style={{color:"#00e59a"}}>{aviso}</p>}

      {erro && (
        <p
          role="alert"
          style={{
            padding: 14,
            background: "#57283a",
            borderRadius: 9,
            color: "#ffb1c2"
          }}
        >
          {erro}
        </p>
      )}
      <p style={{ color: "#b5c9d8" }}>
        Exibindo {filtrados.length} de {total} usuários
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={estilos.tabela}>
          <thead>
            <tr>
              {[
                "Usuário",
                "Cadastro",
                "Último acesso",
                "Situação",
                "Ações"
              ].map((titulo) => (
                <th
                  key={titulo}
                  style={estilos.celula}
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((usuario) => (
              <tr key={usuario.usuario_id}>
                <td style={estilos.celula}>
                  <strong>
                    {usuario.nome || "Nome não informado"}
                  </strong>
                  <small
                    style={{
                      display: "block",
                      marginTop: 5,
                      color: "#b5c9d8",
                      overflowWrap: "anywhere"
                    }}
                  >
                    {usuario.email || "E-mail indisponível"}
                  </small>
                </td>
                <td style={estilos.celula}>
                  {formatarData(usuario.criado_em)}
                </td>
                <td style={estilos.celula}>
                  {formatarData(usuario.ultimo_acesso)}
                </td>
                <td style={estilos.celula}>
                  <strong
                    style={{
                      color: corSituacao(
                        situacaoReal(usuario)
                      )
                    }}
                  >
                    {situacaoReal(usuario)}
                  </strong>
                </td>
                <td style={estilos.celula}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelecionado(usuario)
                    }
                    style={estilos.secundario}
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!carregando && filtrados.length === 0 && (
          <p
            style={{
              padding: 25,
              textAlign: "center",
              color: "#b5c9d8"
            }}
          >
            Nenhum usuário encontrado.
          </p>
        )}
      </div>
      {selecionado && (
        <section
          style={{
            marginTop: 25,
            padding: 22,
            background: "#0b1d30",
            border: "1px solid #34536b",
            borderRadius: 14
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12
            }}
          >
            <h3>Detalhes do usuário</h3>
            <button
              type="button"
              onClick={() => setSelecionado(null)}
              style={estilos.secundario}
            >
              Fechar
            </button>
          </div>
          <div style={{ lineHeight: 2 }}>
            <div>
              <strong>Nome: </strong>
              {selecionado.nome || "Não informado"}
            </div>
            <div>
              <strong>E-mail: </strong>
              {selecionado.email}
            </div>
            <div>
              <strong>Identificador: </strong>
              <span
                style={{ overflowWrap: "anywhere" }}
              >
                {selecionado.usuario_id}
              </span>
            </div>
            <div>
              <strong>Cadastro: </strong>
              {formatarData(selecionado.criado_em)}
            </div>
            <div>
              <strong>Último acesso: </strong>
              {formatarData(selecionado.ultimo_acesso)}
            </div>
            <div>
              <strong>Situação: </strong>
              {situacaoReal(selecionado)}
            </div>
            <div>
              <strong>Tipo: </strong>
              {selecionado.administrador
                ? "Administrador"
                : "Usuário comum"}
            </div>
            <div>
              <strong>Duração do convite: </strong>
              {selecionado.duracao_dias
                ? `${selecionado.duracao_dias} dias`
                : "—"}
            </div>
            <div>
              <strong>Ativação: </strong>
              {formatarData(selecionado.ativado_em)}
            </div>
            <div>
              <strong>Vencimento: </strong>
              {formatarData(selecionado.expira_em)}
            </div>
            <div>
              <strong>Revogação: </strong>
              {formatarData(selecionado.revogado_em)}
            </div>
          </div>
          {!selecionado.administrador && (
            <div style={{marginTop:20, padding:16, border:"1px solid #34536b", borderRadius:12}}>
              <h3>Controle de acesso</h3>
              <p>Status: <strong style={{color:corSituacao(situacaoReal(selecionado))}}>{situacaoReal(selecionado)}</strong></p>
              <label style={{display:"grid",gap:8,marginBottom:12}}>
                Motivo do bloqueio (opcional)
                <input value={motivo} onChange={e=>setMotivo(e.target.value)} maxLength={500} style={estilos.campo} placeholder="Ex.: suspensão temporária" />
              </label>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
                {bloqueios[selecionado.usuario_id]?.bloqueado ? (
                  <button disabled={processando} type="button" style={estilos.botao} onClick={()=>alterarBloqueio(selecionado,false)}>Desbloquear</button>
                ) : (
                  <button disabled={processando} type="button" style={estilos.perigo} onClick={()=>alterarBloqueio(selecionado,true)}>Bloquear</button>
                )}
              </div>
              <label style={{display:"grid",gap:8,marginBottom:12}}>
                Dias para renovação
                <input type="number" min="1" max="365" step="1" value={diasRenovacao} onChange={e=>setDiasRenovacao(e.target.value)} style={estilos.campo} />
              </label>
              <button type="button" disabled={processando || !selecionado.ativado_em || !!selecionado.revogado_em} style={estilos.botao} onClick={()=>renovar(selecionado)}>Renovar acesso</button>
              {selecionado.revogado_em && <p>Convites revogados não podem ser renovados por esta função.</p>}
              <h3 style={{marginTop:22}}>Histórico administrativo</h3>
              {auditoria.filter(item=>item.usuario_id===selecionado.usuario_id).length===0 ? <p>Nenhuma operação registrada.</p> : (
                <ul style={{paddingLeft:20}}>
                  {auditoria.filter(item=>item.usuario_id===selecionado.usuario_id).map(item=>(
                    <li key={item.id} style={{marginBottom:10}}>
                      {formatarData(item.criado_em)} — {item.operacao}
                      {item.operacao==="renovar" ? ` (${item.detalhes?.dias_adicionados ?? "?"} dias)` : ""}
                      {item.detalhes?.motivo ? ` — ${item.detalhes.motivo}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        </section>
      )}
    </section>
  );
}
function ModuloConvites() {
  const [convites, setConvites] = useState([]);
  const [dias, setDias] = useState("30");
  const [personalizado, setPersonalizado] = useState("");
  const [novoCodigo, setNovoCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [revogando, setRevogando] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const carregarConvites = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const { data, error } = await supabase.rpc(
        "vivi_listar_convites"
      );
      if (error) throw error;
      setConvites(data || []);
      setAgora(Date.now());
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    carregarConvites();
    const intervalo = setInterval(() => {
      setAgora(Date.now());
    }, 60000);
    return () => clearInterval(intervalo);
  }, [carregarConvites]);
  function obterSituacao(convite) {
    if (convite.revogado_em) return "Revogado";
    if (!convite.ativado_em) return "Pendente";
    if (
      convite.expira_em &&
      new Date(convite.expira_em).getTime() <= agora
    ) {
      return "Expirado";
    }
    return "Ativo";
  }
  const ocupadas = convites.filter((convite) => {
    const status = obterSituacao(convite);
    return (
      status === "Ativo" ||
      status === "Pendente"
    );
  }).length;
  const disponiveis = Math.max(
    0,
    LIMITE_BETA - ocupadas
  );
  async function gerarConvite(evento) {
    evento.preventDefault();
    const quantidade = Number(
      dias === "personalizado"
        ? personalizado
        : dias
    );
    if (
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 365
    ) {
      setErro("Informe um prazo entre 1 e 365 dias.");
      return;
    }
    setGerando(true);
    setErro("");
    setMensagem("");
    setNovoCodigo("");
    try {
      const { data, error } = await supabase.rpc(
        "vivi_criar_convite",
        { p_duracao_dias: quantidade }
      );
      if (error) throw error;
      const codigo = data?.[0]?.codigo;
      if (!codigo) {
        throw new Error(
          "O servidor não retornou o código."
        );
      }
      setNovoCodigo(codigo);
      setMensagem("Convite gerado com sucesso.");
      await carregarConvites();
    } catch (error) {
      setErro(error.message);
    } finally {
      setGerando(false);
    }
  }
  async function copiar(codigo) {
    try {
      await navigator.clipboard.writeText(codigo);
      setMensagem("Código copiado.");
      setErro("");
    } catch {
      setErro(
        "Não foi possível copiar automaticamente."
      );
    }
  }
  async function revogar(convite) {
    const confirmou = window.confirm(
      "Revogar este convite? O usuário perderá o acesso."
    );
    if (!confirmou) return;
    setRevogando(convite.id);
    setMensagem("");
    setErro("");
    try {
      const { error } = await supabase.rpc(
        "vivi_revogar_convite",
        { p_convite_id: convite.id }
      );
      if (error) throw error;
      setMensagem("Convite revogado.");
      await carregarConvites();
    } catch (error) {
      setErro(error.message);
    } finally {
      setRevogando(null);
    }
  }
  return (
    <section style={estilos.painel}>
      <h2>✉️ Gerenciamento de convites</h2>
      <div style={estilos.indicadores}>
        <Indicador
          titulo="Vagas ocupadas"
          valor={ocupadas}
          cor="#18b8ff"
        />
        <Indicador
          titulo="Disponíveis"
          valor={disponiveis}
          cor="#00e59a"
        />
      </div>
      <form
        onSubmit={gerarConvite}
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "end",
          gap: 15,
          margin: "25px 0"
        }}
      >
        <label style={{ display: "grid", gap: 8 }}>
          Duração do acesso
          <select
            value={dias}
            onChange={(evento) =>
              setDias(evento.target.value)
            }
            style={estilos.campo}
          >
            <option value="7">7 dias</option>
            <option value="15">15 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="365">365 dias</option>
            <option value="personalizado">
              Personalizado
            </option>
          </select>
        </label>
        {dias === "personalizado" && (
          <label style={{ display: "grid", gap: 8 }}>
            Quantidade de dias
            <input
              type="number"
              min="1"
              max="365"
              step="1"
              required
              value={personalizado}
              onChange={(evento) =>
                setPersonalizado(evento.target.value)
              }
              style={estilos.campo}
            />
          </label>
        )}
        <button
          type="submit"
          disabled={
            gerando ||
            carregando ||
            ocupadas >= LIMITE_BETA
          }
          style={estilos.botao}
        >
          {gerando
            ? "Gerando..."
            : "Gerar convite"}
        </button>
      </form>
      {novoCodigo && (
        <div
          style={{
            padding: 20,
            background: "#173c30",
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <h3>Novo convite</h3>
          <code
            style={{
              display: "block",
              fontSize: 20,
              color: "#65edc8",
              overflowWrap: "anywhere",
              marginBottom: 15
            }}
          >
            {novoCodigo}
          </code>
          <button
            type="button"
            onClick={() => copiar(novoCodigo)}
            style={estilos.botao}
          >
            Copiar código
          </button>
        </div>
      )}
      {mensagem && (
        <p role="status" style={{ color: "#00e59a" }}>
          {mensagem}
        </p>
      )}
      {erro && (
        <p role="alert" style={{ color: "#ff8496" }}>
          {erro}
        </p>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <h3>Histórico de convites</h3>
        <button
          type="button"
          onClick={carregarConvites}
          disabled={carregando}
          style={estilos.secundario}
        >
          Atualizar
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={estilos.tabela}>
          <thead>
            <tr>
              {[
                "Código",
                "Prazo",
                "Criado",
                "Vencimento",
                "Situação",
                "Ações"
              ].map((titulo) => (
                <th
                  key={titulo}
                  style={estilos.celula}
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {convites.map((convite) => {
              const status = obterSituacao(convite);
              return (
                <tr key={convite.id}>
                  <td style={estilos.celula}>
                    <code
                      style={{
                        color: "#65edc8",
                        overflowWrap: "anywhere"
                      }}
                    >
                      {convite.codigo}
                    </code>
                  </td>
                  <td style={estilos.celula}>
                    {convite.duracao_dias} dias
                  </td>
                  <td style={estilos.celula}>
                    {formatarData(convite.criado_em)}
                  </td>
                  <td style={estilos.celula}>
                    {formatarData(convite.expira_em)}
                  </td>
                  <td style={estilos.celula}>
                    <strong
                      style={{
                        color: corSituacao(status)
                      }}
                    >
                      {status}
                    </strong>
                  </td>
                  <td style={estilos.celula}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap"
                      }}
                    >
                      {status === "Pendente" && (
                        <button
                          type="button"
                          onClick={() =>
                            copiar(convite.codigo)
                          }
                          style={estilos.secundario}
                        >
                          Copiar
                        </button>
                      )}
                      {(status === "Pendente" ||
                        status === "Ativo") && (
                        <button
                          type="button"
                          disabled={
                            revogando === convite.id
                          }
                          onClick={() =>
                            revogar(convite)
                          }
                          style={estilos.perigo}
                        >
                          {revogando === convite.id
                            ? "Revogando..."
                            : "Revogar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!carregando && convites.length === 0 && (
          <p>Nenhum convite cadastrado.</p>
        )}
      </div>
    </section>
  );
}
export default function AdminPanel() {
  const [modulo, setModulo] = useState("");
  const modulos = [
    {
      id: "usuarios",
      icone: "👥",
      titulo: "Usuários",
      subtitulo: "Gerenciamento das contas",
      descricao:
        "Consulte os usuários, acompanhe os acessos e visualize os perfis.",
      status: "Gerenciamento disponível",
      cor: "azul"
    },
    {
      id: "convites",
      icone: "✉️",
      titulo: "Convites",
      subtitulo: "Controle dos 20 usuários beta",
      descricao:
        "Gere, acompanhe e revogue convites temporários.",
      status: "Sistema disponível",
      cor: "roxo"
    },
    {
      id: "assinaturas",
      icone: "💳",
      titulo: "Assinaturas",
      subtitulo: "Planos e pagamentos",
      descricao:
        "Gerencie os futuros planos da Vivi.",
      status: "Em desenvolvimento",
      cor: "dourado"
    },
    {
      id: "permissoes",
      icone: "🛡️",
      titulo: "Permissões",
      subtitulo: "Controle administrativo",
      descricao:
        "Gerencie as funções administrativas.",
      status: "Em desenvolvimento",
      cor: "verde"
    }
  ];
  function alternarModulo(id) {
    setModulo((atual) =>
      atual === id ? "" : id
    );
  }
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
        <p>
          Central de gerenciamento da Vivi
        </p>
        <small>
          GERENCIE • CONTROLE • ACOMPANHE • EVOLUA
        </small>
      </header>
      <section className="admin-modulos">
        {modulos.map((item) => (
          <article
            key={item.id}
            className={
              "admin-cartao " + item.cor
            }
          >
            <div className="admin-icone">
              {item.icone}
            </div>
            <div className="admin-conteudo">
              <h2>{item.titulo}</h2>
              <h3>{item.subtitulo}</h3>
              <p>{item.descricao}</p>
              <div className="admin-status">
                {item.status}
              </div>
              <button
                type="button"
                onClick={() =>
                  alternarModulo(item.id)
                }
                style={{
                  ...estilos.secundario,
                  marginTop: 15
                }}
              >
                {modulo === item.id
                  ? "Fechar módulo"
                  : "Abrir módulo"}
              </button>
            </div>
            <div
              className="admin-decoracao"
              aria-hidden="true"
            >
              {item.icone}
            </div>
          </article>
        ))}
      </section>
      {modulo === "usuarios" && (
        <ModuloUsuarios />
      )}
      {modulo === "convites" && (
        <ModuloConvites />
      )}
      {modulo &&
        !["usuarios", "convites"].includes(
          modulo
        ) && (
          <section style={estilos.painel}>
            <h2>
              {
                modulos.find(
                  (item) => item.id === modulo
                )?.titulo
              }
            </h2>
            <p>
              Este módulo será desenvolvido
              nas próximas atualizações.
            </p>
          </section>
        )}
      <footer className="admin-rodape">
        VIVI © {new Date().getFullYear()}
        {" • "}
        Infraestrutura e tecnologia
      </footer>
    </main>
  );
}
