import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

function aiLabel(value: string) {
  const labels: Record<string, string> = {
    ASSISTED: "IA assistiva",
    GENERATED: "IA integral",
    NONE: "Sem IA",
    PARTIAL: "IA parcial",
  };

  return labels[value] ?? value;
}

function roleLabel(value: string) {
  const labels: Record<string, string> = {
    COAUTHOR_AUTHORIZED: "Coautor autorizado",
    ORIGINAL_AUTHOR: "Autor original",
    RIGHTS_HOLDER: "Titular/representante",
  };

  return labels[value] ?? value;
}

export default async function AdminCompositionsPage() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((role) => role.role === "ADMIN");

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Operação"
          title="Acesso restrito"
          description="Somente administradores podem revisar composições e declarações de autoria."
        />
      </AppShell>
    );
  }

  const compositions = await prisma.composition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      composer: true,
      declarations: {
        orderBy: { acceptedAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          interests: true,
          favorites: true,
        },
      },
    },
    take: 80,
  });

  const flagged = compositions.filter((item) => {
    const declaration = item.declarations[0];

    return !declaration || declaration.aiUsage === "PARTIAL" || declaration.aiUsage === "GENERATED" || item.status === "REVIEW";
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Autoria"
        title="Admin de composições"
        description="Revise declarações de autoria, uso de IA e sinais de risco antes de liberar obras no catálogo."
      />

      <section className="metricGrid">
        <article className="metricCard">
          <strong>{compositions.length}</strong>
          <span>Obras cadastradas</span>
        </article>
        <article className="metricCard">
          <strong>{flagged.length}</strong>
          <span>Precisam atenção</span>
        </article>
        <article className="metricCard">
          <strong>{compositions.filter((item) => item.isPublished).length}</strong>
          <span>Publicadas</span>
        </article>
        <article className="metricCard">
          <strong>{compositions.filter((item) => item.declarations[0]?.aiUsage !== "NONE").length}</strong>
          <span>Com IA declarada</span>
        </article>
      </section>

      <section className="adminPanel dashboardSection">
        <h2>Fila de autoria e IA</h2>
        <div className="reviewQueue">
          {compositions.map((composition) => {
            const declaration = composition.declarations[0];
            const needsAttention = !declaration || declaration.aiUsage === "PARTIAL" || declaration.aiUsage === "GENERATED" || composition.status === "REVIEW";

            return (
              <article className={needsAttention ? "reviewCard highlighted" : "reviewCard"} key={composition.id}>
                <div className="reviewCardHeader">
                  <div>
                    <span className="songStatus">{needsAttention ? "Revisar" : composition.status}</span>
                    <h3>{composition.title}</h3>
                    <p>{composition.composer.name} - {composition.genre}</p>
                  </div>
                </div>
                <dl className="reviewFacts">
                  <div>
                    <dt>Autoria</dt>
                    <dd>{declaration ? roleLabel(declaration.authorshipRole) : "Sem declaração"}</dd>
                  </div>
                  <div>
                    <dt>IA</dt>
                    <dd>{declaration ? aiLabel(declaration.aiUsage) : "Sem declaração"}</dd>
                  </div>
                  <div>
                    <dt>Catálogo</dt>
                    <dd>{composition.isPublished ? "Publicado" : "Privado/revisão"}</dd>
                  </div>
                  <div>
                    <dt>Interesses</dt>
                    <dd>{composition._count.interests}</dd>
                  </div>
                </dl>
                {declaration?.aiDisclosure ? <p className="mutedText">IA: {declaration.aiDisclosure}</p> : null}
                {declaration?.rightsNotes ? <p className="mutedText">Direitos: {declaration.rightsNotes}</p> : null}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
