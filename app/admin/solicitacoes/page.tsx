import { adminUpdateReleaseRequest } from "../../actions";
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
          <div className="logList">
            {tickets.length ? tickets.map((ticket) => (
              <div key={ticket.id}>
                <strong>{ticket.subject} - {ticket.status}</strong>
                <span>{ticket.user.name} - {ticket.category} - {ticket.priority}</span>
              </div>
            )) : <p className="mutedText">Nenhum chamado aberto.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
