import Link from "next/link";
import { AppShell } from "../components";
import { requireUser } from "../lib/auth";
import { interestStatusLabel, purposeLabel, releaseStatusLabel } from "../lib/format";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

type Metric = {
  label: string;
  value: string;
};

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="metricGrid">
      {metrics.map((metric) => (
        <article className="metricCard" key={metric.label}>
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
        </article>
      ))}
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const isAdmin = user.roles.some((role) => role.role === "ADMIN");
  const isComposer = user.roles.some((role) => role.role === "COMPOSER");
  const isArtist = user.roles.some((role) => ["ARTIST", "PRODUCER"].includes(role.role));

  const [
    compositionCount,
    publishedCount,
    receivedInterestCount,
    sentInterestCount,
    favoriteCount,
    releaseCount,
    pendingReviews,
    readyToSend,
    activeIntegrations,
    unreadNotifications,
    compositions,
    receivedInterests,
    sentInterests,
    releases,
    notifications,
  ] = await Promise.all([
    isComposer ? prisma.composition.count({ where: { composerId: user.id } }) : Promise.resolve(0),
    isComposer
      ? prisma.composition.count({ where: { composerId: user.id, isPublished: true } })
      : prisma.composition.count({ where: { isPublished: true } }),
    isComposer ? prisma.interest.count({ where: { composition: { composerId: user.id } } }) : Promise.resolve(0),
    isArtist ? prisma.interest.count({ where: { userId: user.id } }) : Promise.resolve(0),
    isComposer
      ? prisma.favorite.count({ where: { composition: { composerId: user.id } } })
      : isArtist
        ? prisma.favorite.count({ where: { userId: user.id } })
        : Promise.resolve(0),
    isArtist ? prisma.release.count({ where: { ownerId: user.id } }) : Promise.resolve(0),
    isAdmin ? prisma.release.count({ where: { status: "REVIEW" } }) : Promise.resolve(0),
    isAdmin ? prisma.release.count({ where: { status: "READY" } }) : Promise.resolve(0),
    isAdmin ? prisma.distributionIntegration.count({ where: { isActive: true } }) : Promise.resolve(0),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    isComposer
      ? prisma.composition.findMany({
          where: { composerId: user.id },
          orderBy: [{ interests: { _count: "desc" } }, { createdAt: "desc" }],
          take: 3,
          include: {
            _count: {
              select: { favorites: true, interests: true },
            },
          },
        })
      : Promise.resolve([]),
    isComposer
      ? prisma.interest.findMany({
          where: { composition: { composerId: user.id } },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            user: true,
            composition: true,
          },
        })
      : Promise.resolve([]),
    isArtist
      ? prisma.interest.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            composition: {
              include: {
                composer: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    isArtist
      ? prisma.release.findMany({
          where: { ownerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const enabledModules = [
    {
      available: isComposer,
      eyebrow: "Compositor",
      title: "Vender ou licenciar composições",
      description: "Cadastre obras, controle letra/áudio e receba interesses de artistas e produtores.",
      href: "/composicoes",
      action: "Abrir composições",
      secondaryHref: "/composicoes/nova",
      secondaryAction: "Nova composição",
    },
    {
      available: isArtist || isComposer,
      eyebrow: "Repertório",
      title: "Encontrar músicas para gravar",
      description: "Explore o catálogo, salve ideias e envie interesse ao compositor da obra.",
      href: "/catalogo",
      action: "Abrir catálogo",
      secondaryHref: "/interesses",
      secondaryAction: isComposer ? "Interesses recebidos" : "Interesses enviados",
    },
    {
      available: isArtist,
      eyebrow: "Distribuição",
      title: "Distribuir meu lançamento",
      description: "Prepare master, capa, créditos, splits e acompanhe royalties do pacote.",
      href: "/lancamentos",
      action: "Abrir lançamentos",
      secondaryHref: "/lancamentos/novo",
      secondaryAction: "Novo lançamento",
    },
    {
      available: isAdmin,
      eyebrow: "Operação",
      title: "Operar como admin",
      description: "Revise lançamentos, envie para distribuidora, acompanhe plataformas e financeiro.",
      href: "/admin/lancamentos",
      action: "Abrir operação",
      secondaryHref: "/admin/integracoes",
      secondaryAction: "Integrações",
    },
  ].filter((module) => module.available);

  const roleLabel = isAdmin
    ? "Admin da operação"
    : isComposer
      ? "Compositor"
      : isArtist
        ? "Artista"
        : "Usuário";
  const metrics = isAdmin
    ? [
        { label: "Pacotes em revisão", value: String(pendingReviews) },
        { label: "Prontos para envio", value: String(readyToSend) },
        { label: "Integrações ativas", value: String(activeIntegrations) },
        { label: "Notificações novas", value: String(unreadNotifications) },
      ]
    : isArtist
      ? [
          { label: "Composições disponíveis", value: String(publishedCount) },
          { label: "Interesses enviados", value: String(sentInterestCount) },
          { label: "Favoritos salvos", value: String(favoriteCount) },
          { label: "Lançamentos preparados", value: String(releaseCount) },
          { label: "Notificações novas", value: String(unreadNotifications) },
        ]
      : [
          { label: "Composições no catálogo", value: String(compositionCount) },
          { label: "Publicadas", value: String(publishedCount) },
          { label: "Interesses recebidos", value: String(receivedInterestCount) },
          { label: "Favoritos de artistas", value: String(favoriteCount) },
          { label: "Notificações novas", value: String(unreadNotifications) },
        ];

  return (
    <AppShell>
      <section className="commandHero">
        <div>
          <p className="eyebrow">Central Tunix</p>
          <h1>Escolha o que você quer fazer agora</h1>
          <p>
            Sua conta está como {roleLabel}. Cada módulo abaixo tem um objetivo separado para manter composições,
            repertório, distribuição e operação sem confusão.
          </p>
        </div>
      </section>

      <section className="moduleGrid">
        {enabledModules.map((module) => (
          <article className="moduleCard" key={module.title}>
            <span>{module.eyebrow}</span>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
            <div>
              <Link className="primaryButton linkButton" href={module.href}>
                {module.action}
              </Link>
              <Link className="secondaryButton linkButton" href={module.secondaryHref}>
                {module.secondaryAction}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboardSection">
        <div className="blockHeader">
          <h2>Indicadores da sua área</h2>
          <Link href="/notificacoes">Notificações</Link>
        </div>
        <MetricGrid metrics={metrics} />
      </section>

      {isAdmin ? (
        <section className="twoColumn">
          <article className="panelBlock">
            <div className="blockHeader">
              <h2>Esteira operacional</h2>
              <Link href="/admin/lancamentos">Lançamentos</Link>
            </div>
            <p className="mutedText">
              Aqui ficam revisão, aprovação, envio para distribuidora, status por plataforma e financeiro operacional.
            </p>
          </article>
          <article className="panelBlock">
            <div className="blockHeader">
              <h2>Integrações</h2>
              <Link href="/admin/integracoes">Configurar</Link>
            </div>
            <p className="mutedText">
              Somente a sua empresa acessa endpoint, API key, webhook e credenciais da distribuidora.
            </p>
          </article>
        </section>
      ) : null}

      {isArtist ? (
        <section className="twoColumn">
          <article className="panelBlock">
            <div className="blockHeader">
              <h2>Interesses enviados</h2>
              <Link href="/interesses">Ver interesses</Link>
            </div>
            <div className="interestList">
              {sentInterests.length ? sentInterests.map((interest) => (
                <div className="interestItem" key={interest.id}>
                  <div>
                    <strong>{interest.composition.title}</strong>
                    <span>{purposeLabel(interest.purpose)} com {interest.composition.composer.name}</span>
                  </div>
                  <small>{interestStatusLabel(interest.status)}</small>
                </div>
              )) : <p className="mutedText">Nenhum interesse enviado ainda.</p>}
            </div>
          </article>

          <article className="panelBlock">
            <div className="blockHeader">
              <h2>Lançamentos recentes</h2>
              <Link href="/lancamentos">Ver lançamentos</Link>
            </div>
            <div className="logList">
              {releases.length ? releases.map((release) => (
                <div key={release.id}>
                  <strong>{release.title}</strong>
                  <span>{release.artistName} - {releaseStatusLabel(release.status)}</span>
                </div>
              )) : <p className="mutedText">Nenhum lançamento preparado ainda.</p>}
            </div>
          </article>
        </section>
      ) : null}

      {isComposer ? (
        <section className="twoColumn">
          <article className="panelBlock">
            <div className="blockHeader">
              <h2>Interesses recentes</h2>
              <Link href="/interesses">Ver interesses</Link>
            </div>
            <div className="interestList">
              {receivedInterests.length ? receivedInterests.map((interest) => (
                <div className="interestItem" key={interest.id}>
                  <div>
                    <strong>{interest.user.name}</strong>
                    <span>{purposeLabel(interest.purpose)} em {interest.composition.title}</span>
                  </div>
                  <small>{interestStatusLabel(interest.status)}</small>
                </div>
              )) : <p className="mutedText">Nenhum interesse recebido ainda.</p>}
            </div>
          </article>

          <article className="panelBlock">
            <div className="blockHeader">
              <h2>Mais salvas</h2>
              <Link href="/catalogo">Abrir catálogo</Link>
            </div>
            <div className="rankList">
              {compositions.length ? compositions.map((song, index) => (
                <div className="rankItem" key={song.title}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{song.title}</strong>
                    <small>{song._count.favorites} favoritos - {song._count.interests} interesses</small>
                  </div>
                </div>
              )) : <p className="mutedText">Cadastre sua primeira composição para iniciar a vitrine.</p>}
            </div>
          </article>
        </section>
      ) : null}

      <section className="panelBlock dashboardSection">
        <div className="blockHeader">
          <h2>Notificações recentes</h2>
          <Link href="/notificacoes">Ver todas</Link>
        </div>
        <div className="logList">
          {notifications.length ? notifications.map((notification) => (
            <div key={notification.id}>
              <strong>{notification.title}</strong>
              <span>{notification.body}</span>
            </div>
          )) : <p className="mutedText">Nenhuma notificação nova.</p>}
        </div>
      </section>
    </AppShell>
  );
}
