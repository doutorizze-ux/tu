import { adminUpdateReleaseRequest, adminReplySupportTicket } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });

  if (!roles.some((role) => role.role === "ADMIN")) {
    return null;
  }

  return user;
}

export default async function AdminRequestsPage() {
  const user = await requireAdminUser();

  if (!user) {
    return (
      <AppShell>
        <section className="emptyState">
          <h2>Acesso restrito</h2>
          <p>Somente administradores podem acompanhar solicitações operacionais.</p>
        </section>
      </AppShell>
    );
  }

  const [requests, tickets] = await Promise.all([
    prisma.releaseRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        release: true,
        requestedBy: true,
      },
    }),
    prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
      },
    }),
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operação"
        title="Solicitações e suporte"
        description="Fila de takedown, alterações pós-lançamento, disputas de direitos e chamados dos usuários."
      />

      <section className="adminGrid">
        <article className="adminPanel">
          <h2>Pedidos pós-lançamento</h2>
          <div className="reviewQueue">
            {requests.length ? requests.map((request) => (
              <article className="reviewCard" key={request.id}>
                <div className="reviewCardHeader">
                  <div>
                    <span className="songStatus">{request.status}</span>
                    <h3>{request.type}</h3>
                    <p>{request.release.title} - {request.requestedBy.name}</p>
                  </div>
                </div>
                <p className="mutedText">{request.reason}</p>
                {request.details ? <p>{request.details}</p> : null}
                <form className="compositionForm" action={adminUpdateReleaseRequest}>
                  <input name="requestId" type="hidden" value={request.id} />
                  <div className="formGrid">
                    <label>
                      Status
                      <select name="status" defaultValue={request.status}>
                        <option value="OPEN">Aberta</option>
                        <option value="IN_REVIEW">Em análise</option>
                        <option value="WAITING_PARTNER">Aguardando parceira</option>
                        <option value="RESOLVED">Resolvida</option>
                        <option value="REJECTED">Recusada</option>
                      </select>
                    </label>
                    <label>
                      Nota operacional
                      <input name="adminNote" defaultValue={request.adminNote ?? ""} />
                    </label>
                  </div>
                  <button className="secondaryButton" type="submit">Atualizar</button>
                </form>
              </article>
            )) : <p className="mutedText">Nenhuma solicitação pós-lançamento.</p>}
          </div>
        </article>

        <aside className="adminPanel">
          <h2>Chamados de suporte</h2>
          <div className="reviewQueue">
            {tickets.length ? tickets.map((ticket) => (
              <article className="reviewCard" key={ticket.id} style={{ borderBottom: "1px solid #f4efe4", paddingBottom: "20px", marginBottom: "20px" }}>
                <div className="reviewCardHeader">
                  <div>
                    <span className={`songStatus ${ticket.status === "OPEN" ? "status-pending" : "status-success"}`} style={{ fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "4px", background: ticket.status === "OPEN" ? "#fdf5e6" : "#e6f7f2", color: ticket.status === "OPEN" ? "#b8860b" : "#0f6b5f" }}>
                      {ticket.status === "OPEN" ? "Aberto" : ticket.status === "IN_REVIEW" ? "Em Análise" : "Resolvido"}
                    </span>
                    <h3 style={{ marginTop: "10px", fontSize: "14px", fontWeight: "700" }}>{ticket.subject}</h3>
                    <p style={{ fontSize: "12px", color: "#8a8174", margin: "4px 0 0 0" }}>
                      Por: <strong>{ticket.user.name}</strong> ({ticket.user.email}) | Categoria: {ticket.category}
                    </p>
                  </div>
                </div>

                <div style={{ background: "#fbfaf7", padding: "12px", borderRadius: "6px", margin: "12px 0", borderLeft: "3px solid #0f6b5f" }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#15130f", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                    {ticket.message}
                  </p>
                </div>

                <form className="compositionForm" action={adminReplySupportTicket} style={{ margin: 0 }}>
                  <input name="ticketId" type="hidden" value={ticket.id} />
                  <div className="formGrid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600" }}>
                      Status
                      <select name="status" defaultValue={ticket.status} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #c9c3b8" }}>
                        <option value="OPEN">Aberto</option>
                        <option value="IN_REVIEW">Em análise</option>
                        <option value="RESOLVED">Resolvido</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px", fontWeight: "600" }}>
                      Resposta da Operação
                      <textarea
                        name="adminNote"
                        defaultValue={ticket.adminNote ?? ""}
                        placeholder="Escreva sua resposta para o artista..."
                        rows={3}
                        style={{ padding: "10px", borderRadius: "4px", border: "1px solid #c9c3b8", fontSize: "13px" }}
                      />
                    </label>
                  </div>
                  <button className="secondaryButton" type="submit" style={{ marginTop: "10px" }}>
                    Enviar Resposta
                  </button>
                </form>
              </article>
            )) : <p className="mutedText">Nenhum chamado aberto.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
