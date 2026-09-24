import Link from "next/link";
import { logoutUser } from "./actions";
import { getCurrentUser } from "./lib/auth";
import { prisma } from "./lib/prisma";
import { MobileDrawer, PanelNavLink } from "./mobile-drawer";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brandLogo">
        <img src="/brand/tunix-wordmark.png" alt="Tunix" />
      </span>
    </Link>
  );
}

export async function MarketingHeader() {
  const user = await getCurrentUser();
  const accessHref = user ? "/painel" : "/entrar";
  const accessLabel = user ? "Acessar Painel" : "Entrar";
  return (
    <header className="topbar marketingTopbar">
      <MobileDrawer>
        <nav className="marketingDrawerNav" aria-label="Navegação pública">
          <Link href="/#distribuicao">Como funciona</Link>
          <Link href="/catalogo">Catálogo</Link>
          <Link href="/creditos">Créditos</Link>
          <Link href="/lancamentos/novo">Distribuir música</Link>
          <Link className="primaryButton linkButton marketingDrawerAction" href={accessHref}>{accessLabel}</Link>
        </nav>
      </MobileDrawer>
      <Brand />
      <nav className="nav">
        <Link href="/#distribuicao">Como funciona</Link>
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/creditos">Créditos</Link>
        <Link href="/lancamentos/novo">Distribuir música</Link>
      </nav>
      {user ? (
        <Link className="primaryButton linkButton" href={accessHref} style={{ padding: "8px 16px", textDecoration: "none" }}>
          {accessLabel}
        </Link>
      ) : (
        <Link className="ghostButton linkButton" href={accessHref}>
          {accessLabel}
        </Link>
      )}
    </header>
  );
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = user?.roles.some((role) => role.role === "ADMIN") ?? false;
  const isComposer = user?.roles.some((role) => role.role === "COMPOSER") ?? false;
  const isArtist = user?.roles.some((role) => ["ARTIST", "PRODUCER"].includes(role.role)) ?? false;

  const isPublicDistActive = isAdmin
    ? true
    : (
        await prisma.distributionIntegration.findFirst({
          where: { provider: "PUBLIC_DISTRIBUTION_ENABLED" },
        })
      )?.isActive ?? false;

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
        <PanelNavLink href="/painel">Painel inicial</PanelNavLink>
        {user ? <PanelNavLink href="/perfil">Meu Perfil</PanelNavLink> : null}
        {user ? <PanelNavLink href="/creditos">Créditos</PanelNavLink> : null}
        {user && (isArtist || isAdmin) ? <PanelNavLink href="/financeiro">Carteira & Royalties</PanelNavLink> : null}
        {user ? <PanelNavLink href="/suporte">Suporte</PanelNavLink> : null}
        {user ? (
          <PanelNavLink href="/notificacoes">
            Notificações{unreadNotifications ? ` (${unreadNotifications})` : ""}
          </PanelNavLink>
        ) : null}
      </div>
      {isComposer ? (
        <div>
          <span>Área Autoral (Obras)</span>
          <PanelNavLink href="/registro">Registrar Letra / Obra</PanelNavLink>
          <PanelNavLink href="/composicoes">Minhas Letras / Obras</PanelNavLink>
          <PanelNavLink href="/interesses">Interesses Recebidos</PanelNavLink>
          <PanelNavLink href="/validar">Validar Certidão</PanelNavLink>
        </div>
      ) : null}
      {isArtist ? (
        <div>
          <span>Área do Artista (Distribuição)</span>
          <PanelNavLink href="/lancamentos/novo">Subir Lançamento</PanelNavLink>
          <PanelNavLink href="/lancamentos">
            Meus Lançamentos
            {!isPublicDistActive && (
              <span
                style={{
                  background: "#d4af37",
                  color: "#ffffff",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.68rem",
                  fontWeight: "bold",
                  marginLeft: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "inline-block",
                  verticalAlign: "middle"
                }}
              >
                Em breve
              </span>
            )}
          </PanelNavLink>
          <PanelNavLink href="/catalogo">Encontrar Obras (Catálogo)</PanelNavLink>
          <PanelNavLink href="/interesses">Interesses Enviados</PanelNavLink>
        </div>
      ) : null}
      {isComposer && !isArtist ? (
        <div>
          <span>Repertório</span>
          <PanelNavLink href="/catalogo">Catálogo Público</PanelNavLink>
        </div>
      ) : null}
      {isAdmin ? (
        <div>
          <span>Operação</span>
          <PanelNavLink href="/admin/composicoes">Admin composições</PanelNavLink>
          <PanelNavLink href="/admin/lancamentos">Admin lançamentos</PanelNavLink>
          <PanelNavLink href="/admin/financeiro">Admin Saques Pix</PanelNavLink>
          <PanelNavLink href="/admin/solicitacoes">Solicitações</PanelNavLink>
          <PanelNavLink href="/admin/auditoria">Auditoria</PanelNavLink>
          <PanelNavLink href="/admin/integracoes">Admin integrações</PanelNavLink>
          <PanelNavLink href="/admin/creditos">Admin créditos</PanelNavLink>
          <PanelNavLink href="/admin/usuarios">Usuários e Créditos</PanelNavLink>
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
          <MobileDrawer>
            <div className="mobileMenuPanel">
              <nav className="sideNav">{navigation}</nav>
              {account}
            </div>
          </MobileDrawer>
          <Brand />
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
    <dl className="songMeta">
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
