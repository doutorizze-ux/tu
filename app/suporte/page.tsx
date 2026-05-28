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
          <div className="logList">
            {tickets.length ? tickets.map((ticket) => (
              <div key={ticket.id}>
                <strong>{ticket.subject} - {ticket.status}</strong>
                <span>{ticket.category} - {ticket.priority}</span>
              </div>
            )) : <p className="mutedText">Nenhum chamado aberto.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
