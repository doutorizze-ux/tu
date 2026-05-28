import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "../actions";
import { AppShell, PageHeader } from "../components";
import { requireUser } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

function notificationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    RELEASE_APPROVED: "Aprovado",
    RELEASE_CORRECTED: "Correção",
    RELEASE_REJECTED: "Pendência",
    RELEASE_SUBMITTED: "Revisão",
  };

  return labels[type] ?? type;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Central"
        title="Notificações"
        description="Acompanhe aprovações, pendências e reenvios de lançamentos sem perder movimento da operação."
        action={
          unreadCount ? (
            <form action={markAllNotificationsRead}>
              <button className="secondaryButton" type="submit">
                Marcar todas como lidas
              </button>
            </form>
          ) : null
        }
      />

      <section className="notificationList">
        {notifications.length ? notifications.map((notification) => (
          <article className={notification.readAt ? "notificationCard" : "notificationCard unread"} key={notification.id}>
            <div>
              <span className="songStatus">{notificationTypeLabel(notification.type)}</span>
              <h2>{notification.title}</h2>
              <p>{notification.body}</p>
              <small>{new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(notification.createdAt)}</small>
            </div>
            <div className="notificationActions">
              {notification.href ? (
                <Link className="primaryButton linkButton" href={notification.href}>
                  Abrir
                </Link>
              ) : null}
              {!notification.readAt ? (
                <form action={markNotificationRead}>
                  <input name="notificationId" type="hidden" value={notification.id} />
                  <input name="returnTo" type="hidden" value="/notificacoes" />
                  <button className="secondaryButton" type="submit">
                    Marcar lida
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        )) : (
          <section className="emptyState">
            <h2>Nenhuma notificação</h2>
            <p>Quando houver aprovação, pendência ou reenvio de pacote, tudo aparece aqui.</p>
          </section>
        )}
      </section>
    </AppShell>
  );
}
