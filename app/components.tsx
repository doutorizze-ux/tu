import Link from "next/link";
import { logoutUser } from "./actions";
import { getCurrentUser } from "./lib/auth";
import { prisma } from "./lib/prisma";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brandLogo">
        <img src="/brand/tunix-wordmark.png" alt="Tunix" />
      </span>
    </Link>
  );
}

export function MarketingHeader() {
  return (
    <header className="topbar">
      <Brand />
      <nav className="nav">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/creditos">Creditos</Link>
        <Link href="/composicoes/nova">Cadastrar música</Link>
      </nav>
      <Link className="ghostButton linkButton" href="/entrar">
        Entrar
      </Link>
    </header>
  );
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = user?.roles.some((role) => role.role === "ADMIN") ?? false;
  const isComposer = user?.roles.some((role) => role.role === "COMPOSER") ?? false;
  const isArtist = user?.roles.some((role) => ["ARTIST", "PRODUCER"].includes(role.role)) ?? false;
  const unreadNotifications = user
    ? await prisma.notification.count({
        where: {
          userId: user.id,
          readAt: null,
        },
      })
    : 0;
  const navigation = (
    <>
      <div>
        <span>Central</span>
        <Link href="/painel">Painel inicial</Link>
        {user ? <Link href="/creditos">Créditos</Link> : null}
        {user ? <Link href="/suporte">Suporte</Link> : null}
        {user ? (
          <Link href="/notificacoes">
            Notificações{unreadNotifications ? ` (${unreadNotifications})` : ""}
          </Link>
        ) : null}
      </div>
      {isComposer ? (
        <div>
          <span>Composições</span>
          <Link href="/composicoes">Minhas obras</Link>
          <Link href="/composicoes/nova">Nova composição</Link>
          <Link href="/interesses">Interesses recebidos</Link>
        </div>
      ) : null}
      {isArtist ? (
        <div>
          <span>Artista</span>
          <Link href="/catalogo">Catálogo de obras</Link>
          <Link href="/interesses">Interesses enviados</Link>
          <Link href="/lancamentos">Distribuição</Link>
        </div>
      ) : null}
      {isComposer && !isArtist ? (
        <div>
          <span>Repertório</span>
          <Link href="/catalogo">Catálogo público</Link>
        </div>
      ) : null}
      {isAdmin ? (
        <div>
          <span>Operação</span>
          <Link href="/admin/composicoes">Admin composições</Link>
          <Link href="/admin/lancamentos">Admin lançamentos</Link>
          <Link href="/admin/solicitacoes">Solicitações</Link>
          <Link href="/admin/auditoria">Auditoria</Link>
          <Link href="/admin/integracoes">Admin integrações</Link>
          <Link href="/admin/creditos">Admin créditos</Link>
        </div>
      ) : null}
    </>
  );
  const account = user ? (
    <form className="accountBox" action={logoutUser}>
      <strong>{user.name}</strong>
      <span>{user.email}</span>
      <button type="submit">Sair</button>
    </form>
  ) : (
    <div className="accountBox">
      <strong>Visitante</strong>
      <span>Entre para salvar suas obras.</span>
      <Link href="/entrar">Entrar</Link>
    </div>
  );

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop">
          <Brand />
          <details className="mobileMenu">
            <summary>Menu</summary>
            <div className="mobileMenuPanel">
              <nav className="sideNav">{navigation}</nav>
              {account}
            </div>
          </details>
        </div>
        <nav className="sideNav desktopNav">{navigation}</nav>
        <div className="desktopAccount">{account}</div>
      </aside>
      <section className="workspace">{children}</section>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="pageHeader">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function SongMeta({
  genre,
  mood,
  voice,
  bpm,
}: {
  genre: string;
  mood: string;
  voice: string;
  bpm: number;
}) {
  return (
    <dl>
      <div>
        <dt>Gênero</dt>
        <dd>{genre}</dd>
      </div>
      <div>
        <dt>Clima</dt>
        <dd>{mood}</dd>
      </div>
      <div>
        <dt>Voz</dt>
        <dd>{voice}</dd>
      </div>
      <div>
        <dt>BPM</dt>
        <dd>{bpm}</dd>
      </div>
    </dl>
  );
}
