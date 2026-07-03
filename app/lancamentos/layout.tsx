import { requireUser } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { AppShell } from "../components";
import Link from "next/link";

export default async function ReleasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Admins always bypass the lock
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((r) => r.role === "ADMIN");

  if (!isAdmin) {
    const publicConfig = await prisma.distributionIntegration.findFirst({
      where: { provider: "PUBLIC_DISTRIBUTION_ENABLED" },
    });
    const isEnabled = publicConfig?.isActive ?? false;

    if (!isEnabled) {
      return (
        <AppShell>
          <div className="emptyState" style={{ maxWidth: "600px", margin: "80px auto", textAlign: "center" }}>
            <div style={{ fontSize: "4.5rem", marginBottom: "20px" }}>🚀</div>
            <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: "var(--ink)", marginBottom: "15px", letterSpacing: "-0.5px" }}>
              Distribuição Digital (Em Breve)
            </h2>
            <p style={{ fontSize: "1.05rem", color: "var(--muted)", lineHeight: "1.6", marginBottom: "30px" }}>
              Estamos finalizando a integração oficial com as maiores plataformas digitais do mundo (Spotify, Apple Music, Deezer, TikTok e mais). Em breve, você poderá lançar suas músicas globalmente direto pela Tunix e receber 100% de seus royalties!
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link href="/painel" className="primaryButton" style={{ textDecoration: "none" }}>
                Voltar para o Painel
              </Link>
            </div>
          </div>
        </AppShell>
      );
    }
  }

  return <>{children}</>;
}