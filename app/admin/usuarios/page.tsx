import Link from "next/link";
import { adminAdjustCredits, adminUpdateUser, adminResetDatabase } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { formatCredits } from "../../lib/credits";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    erro?: string; 
    sucesso?: string; 
    editUserId?: string; 
    adjustUserId?: string; 
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((role) => role.role === "ADMIN");

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Operação"
          title="Acesso restrito"
          description="Somente administradores podem gerenciar usuários."
        />
      </AppShell>
    );
  }

  // Fetch all users
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { roles: true },
  });

  // Calculate balances in a single query
  const ledgerSums = await prisma.creditLedgerEntry.groupBy({
    by: ["userId"],
    _sum: { amount: true },
  });

  const balancesMap = new Map(
    ledgerSums.map((item) => [item.userId, item._sum.amount ?? 0])
  );

  // Find users for modals if requested in query params
  const editUser = params.editUserId 
    ? users.find((u) => u.id === params.editUserId) 
    : null;

  const adjustUser = params.adjustUserId 
    ? users.find((u) => u.id === params.adjustUserId) 
    : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administração"
        title="Usuários e Créditos"
        description="Gerencie os usuários cadastrados na plataforma, altere papéis e adicione ou remova créditos manualmente."
      />

      {params.erro ? (
        <p className="formError">
          {params.erro === "dados"
            ? "Preencha todos os campos obrigatórios."
            : params.erro === "email_existente"
            ? "Este e-mail já está sendo utilizado por outro usuário."
            : params.erro === "creditos_invalidos"
            ? "Quantidade de créditos ou motivo inválido."
            : params.erro === "saldo_negativo"
            ? "O saldo de créditos do usuário não pode ficar negativo."
            : params.erro === "reset_falhou"
            ? "Falha ao limpar o banco de dados."
            : "Ocorreu um erro ao salvar as alterações."}
        </p>
      ) : null}

      {params.sucesso ? (
        <p className="formSuccess">
          {params.sucesso === "usuario_atualizado"
            ? "Dados do usuário atualizados com sucesso."
            : params.sucesso === "creditos_ajustados"
            ? "Saldo de créditos ajustado com sucesso."
            : params.sucesso === "db_limpo"
            ? "Banco de dados limpo com sucesso! Pronto para produção."
            : "Operação realizada com sucesso."}
        </p>
      ) : null}

      <div className="creditAdminLayout" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Compact User Table */}
        <article className="creditAdminPanel wide" style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem" }}>
          <div className="panelTitle" style={{ marginBottom: "1.5rem" }}>
            <h2>Lista de Usuários ({users.length})</h2>
            <p>Edite papéis, e-mails e gerencie os saldos de créditos dos artistas e compositores.</p>
          </div>

          <div className="tableWrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", opacity: 0.8 }}>Nome / E-mail</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", opacity: 0.8 }}>Papéis</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", opacity: 0.8 }}>Saldo</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", opacity: 0.8, textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const balance = balancesMap.get(u.id) ?? 0;
                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "1rem" }}>
                        <strong style={{ display: "block", fontSize: "0.95rem" }}>{u.name}</strong>
                        <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>{u.email}</span>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          {u.roles.map((r) => (
                            <span 
                              key={r.role} 
                              style={{ 
                                fontSize: "0.75rem", 
                                padding: "0.15rem 0.5rem", 
                                borderRadius: "4px", 
                                background: r.role === "ADMIN" ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.08)",
                                color: r.role === "ADMIN" ? "var(--danger)" : "inherit"
                              }}
                            >
                              {r.role === "COMPOSER" ? "Compositor" : r.role === "ARTIST" ? "Artista" : r.role === "PRODUCER" ? "Produtor" : "Admin"}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: "bold" }}>
                        <span style={{ color: balance >= 0 ? "var(--success)" : "var(--danger)" }}>
                          {formatCredits(balance)}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <Link 
                            href={`/admin/usuarios?editUserId=${u.id}`} 
                            className="secondaryButton linkButton" 
                            style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
                          >
                            Editar
                          </Link>
                          <Link 
                            href={`/admin/usuarios?adjustUserId=${u.id}`} 
                            className="primaryButton linkButton" 
                            style={{ padding: "0.3rem 0.8rem", fontSize: "0.8rem" }}
                          >
                            Ajustar Créditos
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        {/* Danger Zone */}
        <article className="creditAdminPanel wide" style={{ border: "1px solid var(--danger)", borderRadius: "12px", padding: "1.5rem", background: "rgba(239, 68, 68, 0.03)" }}>
          <div className="panelTitle" style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ color: "var(--danger)" }}>Zona de Perigo</h2>
            <p>Ações irreversíveis do sistema de banco de dados.</p>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "0.9rem", margin: 0 }}>
              Use a opção abaixo para **limpar todos os dados fictícios** do banco (todas as músicas de teste, composições, lançamentos de demonstração e usuários falsos). 
              Apenas o seu usuário Administrador principal (`admin@tunix.com.br`) será mantido no sistema, deixando o aplicativo 100% limpo e pronto para o lançamento oficial.
            </p>
            
            <form action={adminResetDatabase} style={{ marginTop: "0.5rem" }}>
              <button 
                type="submit" 
                className="secondaryButton"
                style={{ 
                  backgroundColor: "var(--danger)", 
                  color: "white", 
                  borderColor: "var(--danger)",
                  padding: "0.75rem 1.5rem",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Limpar Banco de Dados (Preparar para Produção)
              </button>
            </form>
          </div>
        </article>
      </div>

      {/* Modal: Editar Usuário */}
      {editUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#121214",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "450px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Editar Usuário</h2>
              <Link href="/admin/usuarios" style={{ fontSize: "1.5rem", textDecoration: "none", color: "inherit", opacity: 0.7 }}>×</Link>
            </div>
            
            <form action={adminUpdateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="hidden" name="userId" value={editUser.id} />
              
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                Nome Completo
                <input 
                  name="name" 
                  defaultValue={editUser.name} 
                  required 
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "white" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                E-mail
                <input 
                  name="email" 
                  type="email" 
                  defaultValue={editUser.email} 
                  required 
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "white" }}
                />
              </label>

              <div>
                <strong style={{ fontSize: "0.85rem" }}>Papéis no Sistema</strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {["COMPOSER", "ARTIST", "PRODUCER", "ADMIN"].map((role) => (
                    <label key={role} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                      <input 
                        type="checkbox" 
                        name="roles" 
                        value={role} 
                        defaultChecked={editUser.roles.map(r => r.role).includes(role)} 
                      />
                      <span>
                        {role === "COMPOSER" ? "Compositor" : role === "ARTIST" ? "Artista" : role === "PRODUCER" ? "Produtor" : "Administrador"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <Link href="/admin/usuarios" className="secondaryButton linkButton" style={{ flex: 1, textAlign: "center", padding: "0.6rem" }}>
                  Cancelar
                </Link>
                <button className="primaryButton" type="submit" style={{ flex: 1, padding: "0.6rem" }}>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajustar Créditos */}
      {adjustUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#121214",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "450px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0 }}>Ajustar Créditos</h2>
                <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Usuário: {adjustUser.name}</span>
              </div>
              <Link href="/admin/usuarios" style={{ fontSize: "1.5rem", textDecoration: "none", color: "inherit", opacity: 0.7 }}>×</Link>
            </div>
            
            <form action={adminAdjustCredits} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="hidden" name="userId" value={adjustUser.id} />
              
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                Quantidade de Créditos
                <input 
                  name="amount" 
                  type="number" 
                  placeholder="Ex: 50 para adicionar, -20 para debitar" 
                  required 
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "white" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                Motivo do Ajuste
                <input 
                  name="reason" 
                  placeholder="Ex: Bônus de boas-vindas" 
                  required 
                  style={{ padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "white" }}
                />
              </label>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <Link href="/admin/usuarios" className="secondaryButton linkButton" style={{ flex: 1, textAlign: "center", padding: "0.6rem" }}>
                  Cancelar
                </Link>
                <button className="primaryButton" type="submit" style={{ flex: 1, padding: "0.6rem" }}>
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
