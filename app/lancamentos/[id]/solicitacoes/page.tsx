import Link from "next/link";
import { notFound } from "next/navigation";
import { createReleaseRequest } from "../../../actions";
import { AppShell, PageHeader } from "../../../components";
import { requireUser } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReleaseRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const release = await prisma.release.findFirst({
    where: { id, ownerId: user.id },
    include: {
      requests: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!release) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pos-lancamento"
        title="Solicitacoes do lancamento"
        description="Abra pedidos de takedown, alteracao de metadata, capa, disputa de direitos ou suporte operacional."
        action={<Link className="secondaryButton linkButton" href={`/lancamentos/${release.id}`}>Voltar</Link>}
      />

      {query.erro ? <p className="formError">Informe tipo e motivo com pelo menos 10 caracteres.</p> : null}
      {query.sucesso ? <p className="formSuccess">Solicitacao registrada e enviada para a operacao.</p> : null}

      <section className="adminGrid">
        <article className="adminPanel">
          <h2>Nova solicitacao</h2>
          <form className="compositionForm" action={createReleaseRequest}>
            <input name="releaseId" type="hidden" value={release.id} />
            <label>
              Tipo
              <select name="type" defaultValue="METADATA_CHANGE">
                <option value="METADATA_CHANGE">Alteracao de metadata</option>
                <option value="COVER_CHANGE">Troca de capa</option>
                <option value="TAKEDOWN">Takedown/remocao</option>
                <option value="RIGHTS_DISPUTE">Disputa de direitos</option>
                <option value="OTHER">Outro</option>
              </select>
            </label>
            <label>
              Motivo
              <input name="reason" placeholder="Explique o motivo principal" />
            </label>
            <label>
              Detalhes
              <textarea name="details" rows={5} placeholder="Inclua links, plataformas afetadas, urgencia e evidencias." />
            </label>
            <div className="formActions">
              <button className="primaryButton" type="submit">Enviar solicitacao</button>
            </div>
          </form>
        </article>

        <aside className="adminPanel">
          <h2>Historico</h2>
          <div className="logList">
            {release.requests.length ? release.requests.map((request) => (
              <div key={request.id}>
                <strong>{request.type} - {request.status}</strong>
                <span>{request.reason}</span>
              </div>
            )) : <p className="mutedText">Nenhuma solicitacao registrada.</p>}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
