import { createSupportTicket } from "../actions";
import { AppShell, PageHeader } from "../components";
import { requireUser } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Suporte"
        title="Central de atendimento"
        description="Registre problemas de composição, distribuição, pagamentos, acesso ou direitos autorais."
      />

      {query.erro ? <p className="formError">Informe assunto e mensagem com detalhes suficientes.</p> : null}
      {query.sucesso ? <p className="formSuccess">Chamado aberto para a operação.</p> : null}

      <section className="adminGrid">
        <article className="adminPanel">
          <h2>Novo chamado</h2>
          <form className="compositionForm" action={createSupportTicket}>
            <label>
              Assunto
              <input name="subject" placeholder="Resumo do problema" />
            </label>
            <div className="formGrid">
              <label>
                Categoria
                <select name="category" defaultValue="GENERAL">
                  <option value="GENERAL">Geral</option>
                  <option value="RIGHTS">Direitos autorais</option>
                  <option value="DISTRIBUTION">Distribuição</option>
                  <option value="FINANCE">Financeiro</option>
                  <option value="ACCESS">Acesso</option>
                </select>
              </label>
              <label>
                Prioridade
                <select name="priority" defaultValue="NORMAL">
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </label>
            </div>
            <label>
              Mensagem
              <textarea name="message" rows={6} placeholder="Descreva o ocorrido, links, datas e evidências." />
            </label>
            <div className="formActions">
              <button className="primaryButton" type="submit">Abrir chamado</button>
            </div>
          </form>
        </article>

        <aside className="adminPanel">
          <h2>Meus chamados</h2>
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
                      Categoria: {ticket.category} | Prioridade: {ticket.priority}
                    </p>
                  </div>
                </div>

                <div style={{ background: "#fbfaf7", padding: "12px", borderRadius: "6px", margin: "12px 0 0 0", borderLeft: "3px solid #0f6b5f" }}>
                  <strong style={{ fontSize: "11px", textTransform: "uppercase", color: "#8a8174", display: "block", marginBottom: "4px" }}>Minha Mensagem:</strong>
                  <p style={{ margin: 0, fontSize: "13px", color: "#15130f", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                    {ticket.message}
                  </p>
                </div>

                {ticket.adminNote && (
                  <div style={{ background: "#e6f7f2", padding: "12px", borderRadius: "6px", margin: "12px 0 0 0", borderLeft: "3px solid #0f6b5f" }}>
                    <strong style={{ fontSize: "11px", textTransform: "uppercase", color: "#0f6b5f", display: "block", marginBottom: "4px" }}>Resposta da Tunix:</strong>
                    <p style={{ margin: 0, fontSize: "13px", color: "#15130f", whiteSpace: "pre-wrap", lineHeight: "1.4", fontWeight: "600" }}>
                      {ticket.adminNote}
                    </p>
                  </div>
                )}
              </article>
            )) : <p className="mutedText">Nenhum chamado aberto.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
