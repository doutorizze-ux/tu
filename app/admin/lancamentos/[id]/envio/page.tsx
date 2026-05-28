import Link from "next/link";
import { notFound } from "next/navigation";
import { adminSubmitReleaseToPartner } from "../../../../actions";
import { AppShell, PageHeader } from "../../../../components";
import { requireUser } from "../../../../lib/auth";
import { buildDistributionPayload, getDistributionProviderConfig } from "../../../../lib/distribution-provider";
import { platformLabel, releaseStatusLabel } from "../../../../lib/format";
import { prisma } from "../../../../lib/prisma";
import { validateReleasePackage } from "../../../../lib/release-validator";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });

  if (!roles.some((role) => role.role === "ADMIN")) {
    return null;
  }

  return user;
}

export default async function AdminReleaseSendPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const [user, { id }, query] = await Promise.all([requireAdminUser(), params, searchParams]);

  if (!user) {
    return (
      <AppShell>
        <section className="emptyState">
          <h2>Acesso restrito</h2>
          <p>Somente administradores podem disparar envio para a distribuidora.</p>
        </section>
      </AppShell>
    );
  }

  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      assets: true,
      contributors: true,
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      owner: true,
      platforms: true,
    },
  });

  if (!release) {
    notFound();
  }

  const validation = validateReleasePackage(release);
  const providerConfig = await getDistributionProviderConfig();
  const payload = buildDistributionPayload(release);
  const canSend = release.status === "READY" && validation.canSubmit && Boolean(providerConfig.endpoint);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Envio assistido"
        title={release.title}
        description={`Conferencia final antes de enviar para ${providerConfig.provider}. Status: ${releaseStatusLabel(release.status)}.`}
        action={
          <Link className="secondaryButton linkButton" href="/admin/lancamentos">
            Voltar
          </Link>
        }
      />

      {query.erro ? (
        <p className="formError">
          {query.erro === "confirmacao"
            ? "Confirme que revisou o payload antes de disparar."
            : query.erro === "provider"
              ? "O provider recusou ou a integracao nao esta configurada. Veja a tentativa registrada."
              : query.erro === "incompleto"
                ? "O pacote ainda tem bloqueios no validador."
                : "O lancamento precisa estar pronto para envio."}
        </p>
      ) : null}
      {query.sucesso ? <p className="formSuccess">Envio disparado para a distribuidora e registrado no historico.</p> : null}

      <section className="adminGrid">
        <article className="adminPanel">
          <div className="blockHeader">
            <h2>Payload que sera enviado</h2>
            <span className="songStatus">{providerConfig.environment}</span>
          </div>
          <pre className="payloadPreview">{JSON.stringify(payload, null, 2)}</pre>
        </article>

        <aside className="adminPanel">
          <h2>Conferencia operacional</h2>
          <dl className="accessList">
            <div>
              <dt>Provider</dt>
              <dd>{providerConfig.provider}</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>{providerConfig.endpoint || "Nao configurado"}</dd>
            </div>
            <div>
              <dt>Cliente</dt>
              <dd>{release.owner.name}</dd>
            </div>
            <div>
              <dt>Plataformas</dt>
              <dd>{release.platforms.map((platform) => platformLabel(platform.platform)).join(", ")}</dd>
            </div>
          </dl>

          {validation.issues.length ? (
            <div className="validationList compact">
              {validation.issues.map((issue) => (
                <div className={issue.severity === "WARNING" ? "validationItem warning" : "validationItem blocker"} key={issue.code}>
                  <span>{issue.severity === "WARNING" ? "Alerta" : "Bloqueio"}</span>
                  <strong>{issue.label}</strong>
                  <small>{issue.detail}</small>
                </div>
              ))}
            </div>
          ) : <p className="formSuccess">Validador aprovado.</p>}

          <form className="compositionForm" action={adminSubmitReleaseToPartner}>
            <input name="releaseId" type="hidden" value={release.id} />
            <div className="checkList">
              <label>
                <input name="confirmSend" type="checkbox" />
                Revisei o payload, arquivos, splits e plataformas antes do disparo.
              </label>
            </div>
            <button className="primaryButton" disabled={!canSend} type="submit">
              Enviar para distribuidora real
            </button>
          </form>

          <section className="protectedBlock">
            <h2>Ultimas tentativas</h2>
            <div className="logList">
              {release.deliveries.length ? release.deliveries.map((delivery) => (
                <div key={delivery.id}>
                  <strong>{delivery.provider} - {delivery.status}</strong>
                  <span>{delivery.responseStatus ?? "sem HTTP"} - {delivery.errorMessage ?? "sem erro"}</span>
                </div>
              )) : <p className="mutedText">Nenhuma tentativa registrada.</p>}
            </div>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
