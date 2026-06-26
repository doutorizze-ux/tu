import { adminAdjustCredits, adminUpdateUser } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { formatCredits } from "../../lib/credits";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
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
            : "Ocorreu um erro ao salvar as alterações."}
        </p>
      ) : null}

      {params.sucesso ? (
        <p className="formSuccess">
          {params.sucesso === "usuario_atualizado"
            ? "Dados do usuário atualizados com sucesso."
            : "Saldo de créditos ajustado com sucesso."}
        </p>
      ) : null}

      <div className="creditAdminLayout" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <article className="creditAdminPanel wide" style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem" }}>
          <div className="panelTitle" style={{ marginBottom: "1.5rem" }}>
            <h2>Lista de Usuários ({users.length})</h2>
            <p>Edite papéis, emails e gerencie os saldos de créditos dos artistas e compositores.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1.5rem" }}>
            {users.map((u) => {
              const balance = balancesMap.get(u.id) ?? 0;
              const userRolesList = u.roles.map((r) => r.role);

              return (
                <div 
                  key={u.id} 
                  style={{ 
                    border: "1px solid var(--border)", 
                    borderRadius: "12px", 
                    padding: "1.25rem", 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "1.25rem", 
                    background: "rgba(255, 255, 255, 0.02)" 
                  }}
                >
                  {/* Header info */}
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{u.name}</h3>
                    <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{u.email}</span>
                    <div style={{ marginTop: "0.5rem" }}>
                      <strong>Saldo atual: </strong>
                      <span style={{ color: balance >= 0 ? "var(--success)" : "var(--danger)" }}>
                        {formatCredits(balance)}
                      </span>
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: 0 }} />

                  {/* Form 1: Edit User Profile & Roles */}
                  <form action={adminUpdateUser} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <input type="hidden" name="userId" value={u.id} />
                    
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                      Nome Completo
                      <input 
                        name="name" 
                        defaultValue={u.name} 
                        required 
                        style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent" }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                      E-mail
                      <input 
                        name="email" 
                        type="email" 
                        defaultValue={u.email} 
                        required 
                        style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent" }}
                      />
                    </label>

                    <div style={{ fontSize: "0.85rem" }}>
                      <strong>Papéis no Sistema</strong>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.25rem" }}>
                        {["COMPOSER", "ARTIST", "PRODUCER", "ADMIN"].map((role) => (
                          <label key={role} style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                            <input 
                              type="checkbox" 
                              name="roles" 
                              value={role} 
                              defaultChecked={userRolesList.includes(role)} 
                            />
                            <span style={{ fontSize: "0.8rem" }}>
                              {role === "COMPOSER" ? "Compositor" : role === "ARTIST" ? "Artista" : role === "PRODUCER" ? "Produtor" : "Admin"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button className="secondaryButton" type="submit" style={{ width: "100%", padding: "0.5rem" }}>
                      Salvar Alterações
                    </button>
                  </form>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: 0 }} />

                  {/* Form 2: Adjust Credits */}
                  <form action={adminAdjustCredits} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <input type="hidden" name="userId" value={u.id} />
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.5rem" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                        Quantidade
                        <input 
                          name="amount" 
                          type="number" 
                          placeholder="Ex: 50 ou -10" 
                          required 
                          style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent" }}
                        />
                      </label>

                      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                        Motivo do Ajuste
                        <input 
                          name="reason" 
                          placeholder="Ex: Bônus de boas-vindas" 
                          required 
                          style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent" }}
                        />
                      </label>
                    </div>

                    <button className="primaryButton" type="submit" style={{ width: "100%", padding: "0.5rem" }}>
                      Ajustar Saldo
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </AppShell>
  );
}
