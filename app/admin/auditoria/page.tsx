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

export default async function AdminAuditPage() {
  const user = await requireAdminUser();

  if (!user) {
    return (
      <AppShell>
        <section className="emptyState">
          <h2>Acesso restrito</h2>
          <p>Somente administradores podem consultar auditoria.</p>
        </section>
      </AppShell>
    );
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      user: true,
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Auditoria"
        title="Eventos criticos"
        description="Ultimas acoes administrativas, declaracoes, falhas de login, envios, alteracoes e eventos financeiros."
      />

      <section className="adminPanel">
        <div className="logList">
          {logs.map((log) => (
            <div key={log.id}>
              <strong>{log.action}</strong>
              <span>
                {log.entity} {log.entityId} - {log.user?.email ?? "sistema"} - {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
