import Link from "next/link";
import { AppShell, PageHeader } from "../components";
import { requireUser } from "../lib/auth";
import { interestStatusLabel, purposeLabel } from "../lib/format";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

export default async function InterestsPage() {
  const user = await requireUser();
  const isComposer = user.roles.some((role) => role.role === "COMPOSER");
  const sentInterests = !isComposer ? await prisma.interest.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      composition: {
        include: {
          composer: true,
        },
      },
    },
  }) : [];
  const receivedInterests = isComposer ? await prisma.interest.findMany({
    where: {
      composition: {
        composerId: user.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        include: {
          roles: true,
          profile: true,
        },
      },
      composition: true,
    },
  }) : [];

  if (!isComposer) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Repertorio"
          title="Interesses enviados"
          description="Acompanhe as composicoes que voce marcou para avaliar, reservar ou gravar."
          action={
            <Link className="secondaryButton linkButton" href="/catalogo">
              Abrir catalogo
            </Link>
          }
        />

        {sentInterests.length ? (
          <section className="interestBoard">
            {sentInterests.map((interest) => (
              <article className="interestCard" key={interest.id}>
                <div className="interestTopline">
                  <span className="songStatus">{interestStatusLabel(interest.status)}</span>
                  <small>{new Intl.DateTimeFormat("pt-BR").format(interest.createdAt)}</small>
                </div>
                <h2>{interest.composition.title}</h2>
                <p>
                  {purposeLabel(interest.purpose)} com <strong>{interest.composition.composer.name}</strong>
                </p>
                {interest.message ? <blockquote>{interest.message}</blockquote> : null}
                <dl className="interestDetails">
                  <div>
                    <dt>Compositor</dt>
                    <dd>{interest.composition.composer.name}</dd>
                  </div>
                  <div>
                    <dt>Genero da obra</dt>
                    <dd>{interest.composition.genre}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{interestStatusLabel(interest.status)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>
        ) : (
          <section className="emptyState">
            <h2>Nenhum interesse enviado ainda</h2>
            <p>Abra o catalogo, encontre composicoes para seu repertorio e envie interesse ao compositor.</p>
            <Link className="primaryButton linkButton" href="/catalogo">
              Procurar composicoes
            </Link>
          </section>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Oportunidades"
        title="Interesses recebidos"
        description="Veja artistas e produtores que demonstraram interesse nas suas composicoes."
        action={
          <Link className="secondaryButton linkButton" href="/catalogo">
            Abrir catalogo
          </Link>
        }
      />

      {receivedInterests.length ? (
        <section className="interestBoard">
          {receivedInterests.map((interest) => (
            <article className="interestCard" key={interest.id}>
              <div className="interestTopline">
                <span className="songStatus">{interestStatusLabel(interest.status)}</span>
                <small>{new Intl.DateTimeFormat("pt-BR").format(interest.createdAt)}</small>
              </div>
              <h2>{interest.user.name}</h2>
              <p>
                {purposeLabel(interest.purpose)} em <strong>{interest.composition.title}</strong>
              </p>
              {interest.message ? <blockquote>{interest.message}</blockquote> : null}
              <dl className="interestDetails">
                <div>
                  <dt>Email</dt>
                  <dd>{interest.user.email}</dd>
                </div>
                <div>
                  <dt>Perfil</dt>
                  <dd>{interest.user.roles.map((role) => role.role).join(", ") || "Usuario"}</dd>
                </div>
                <div>
                  <dt>Genero da obra</dt>
                  <dd>{interest.composition.genre}</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      ) : (
        <section className="emptyState">
          <h2>Nenhum interesse recebido ainda</h2>
          <p>Publique composicoes no catalogo para artistas e produtores poderem entrar em contato.</p>
          <Link className="primaryButton linkButton" href="/composicoes/nova">
            Cadastrar composicao
          </Link>
        </section>
      )}
    </AppShell>
  );
}
