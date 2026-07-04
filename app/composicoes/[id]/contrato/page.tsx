import { notFound, redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";
import ContractPrinter from "./ContractPrinter";
import { AppShell } from "../../../components";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const composition = await prisma.composition.findUnique({
      where: { id },
      include: {
        audio: true,
      },
    });

    if (!composition) {
      notFound();
    }

    if (composition.composerId !== user.id) {
      redirect("/composicoes?erro=permissao");
    }

    const composer = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    if (!composer) {
      redirect("/entrar");
    }

    // Enforce profile completeness before generating a contract
    if (
      !composer.profile ||
      !composer.profile.fullName ||
      !composer.profile.cpf ||
      !composer.profile.motherName
    ) {
      redirect("/perfil?alerta=registro_pendente");
    }

    return (
      <AppShell>
        <div style={{ padding: "20px 0" }}>
          <div className="no-print" style={{ textAlign: "center", marginBottom: "30px" }}>
            <span style={{
              background: "#fcfaf4",
              border: "1px solid #d4af37",
              color: "#d4af37",
              padding: "4px 12px",
              borderRadius: "100px",
              fontSize: "0.75rem",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "1px",
              display: "inline-block",
              marginBottom: "8px"
            }}>
              Tunix Legal
            </span>
            <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "var(--ink)", margin: 0 }}>
              Gerador de Contratos
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "1.05rem", marginTop: "6px" }}>
              Crie termos de exclusividade ou cessão vinculados à prova criptográfica da sua obra.
            </p>
          </div>
          
          <ContractPrinter composition={composition} composer={composer} />
        </div>
      </AppShell>
    );
  } catch (error: any) {
    if (
      error.digest?.startsWith("NEXT_REDIRECT") ||
      error.digest?.startsWith("NEXT_NOT_FOUND") ||
      error.message === "NEXT_REDIRECT" ||
      error.message === "NEXT_NOT_FOUND"
    ) {
      throw error;
    }
    console.error("CONTRACT PAGE CRASH:", error);
    return (
      <AppShell>
        <div style={{ padding: "40px", maxWidth: "800px", margin: "40px auto", fontFamily: "sans-serif", background: "#fff0f0", border: "1px solid #ffc0c0", borderRadius: "12px", color: "#c00000", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "1.3rem" }}>Erro ao carregar gerador de contratos</h2>
          <p style={{ color: "#555", fontSize: "0.9rem" }}>Por favor, envie este print ao suporte técnico com o erro abaixo:</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#ffffff", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "0.85rem", color: "#333", overflowX: "auto" }}>
            {error.stack || error.message || String(error)}
          </pre>
          <Link href="/composicoes" style={{ display: "inline-block", marginTop: "20px", color: "#0f6b5f", fontWeight: "bold", textDecoration: "underline" }}>
            Voltar para Minhas Composições
          </Link>
        </div>
      </AppShell>
    );
  }
}