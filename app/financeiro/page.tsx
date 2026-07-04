import React from "react";
import Link from "next/link";
import { AppShell, PageHeader } from "../components";
import { requireUser } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { requestWithdrawal } from "../actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  
  // Check if the user is an artist/producer or admin
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isArtistOrAdmin = roles.some((role) => ["ARTIST", "PRODUCER", "ADMIN"].includes(role.role));
  
  if (!isArtistOrAdmin) {
    redirect("/painel");
  }
  const params = await searchParams;

  // Retrieve current user balance
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { balance: true, name: true },
  });

  const balance = dbUser?.balance ?? 0;

  // Retrieve withdrawal requests
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Retrieve royalty earnings details
  const earnings = await prisma.royaltyParticipant.findMany({
    where: {
      name: user.name,
    },
    include: {
      statement: {
        include: {
          release: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="badge-pending">Pendente</span>;
      case "PAID":
        return <span className="badge-success">Pago</span>;
      case "REJECTED":
        return <span className="badge-danger">Recusado</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Financeiro"
        title="Minha Carteira"
        description="Acompanhe seus rendimentos musicais, visualize splits de royalties e solicite saques via Pix."
      />

      {params.erro ? (
        <p className="formError">
          {params.erro === "saldo"
            ? "Saldo insuficiente para realizar esta solicitação."
            : "Preencha todos os campos obrigatórios com valores válidos."}
        </p>
      ) : null}

      {params.sucesso ? (
        <p className="formSuccess">
          Solicitação de saque via Pix registrada com sucesso! Aguarde o processamento pela Tunix.
        </p>
      ) : null}

      <div className="finance-grid">
        {/* Wallet Balance Card */}
        <section className="finance-card balance-card">
          <h2>Saldo Disponível</h2>
          <div className="balance-value">{formatCurrency(balance)}</div>
          <p className="balance-hint">Os repasses de royalties ocorrem mensalmente de acordo com as vendas das plataformas.</p>
        </section>

        {/* Withdrawal Form Card */}
        <section className="finance-card withdrawal-form-card">
          <h2>Solicitar Saque (Pix)</h2>
          <form className="compositionForm" action={requestWithdrawal} style={{ margin: 0 }}>
            {balance < 5.00 && (
              <div style={{ background: "#fdf2f2", color: "#d32f2f", padding: "12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", marginBottom: "15px", border: "1px solid #f5c2c2", lineHeight: "1.4" }}>
                ⚠️ Saldo insuficiente: Você precisa de no mínimo R$ 5,00 de saldo disponível para solicitar saques.
              </div>
            )}
            <div className="formGroup">
              <label htmlFor="amount">Valor do Saque (R$)</label>
              <input
                type="number"
                name="amount"
                id="amount"
                step="0.01"
                min="5.00"
                max={balance}
                placeholder="0,00"
                required
                disabled={balance < 5.00}
              />
            </div>

            <div className="formRow" style={{ display: "flex", gap: "15px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label htmlFor="pixType">Tipo de Chave</label>
                <select name="pixType" id="pixType" required disabled={balance < 5.00}>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="CELULAR">Celular</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="CHAVE_ALEATORIA">Chave Aleatória</option>
                </select>
              </div>

              <div className="formGroup" style={{ flex: 2 }}>
                <label htmlFor="pixKey">Chave Pix</label>
                <input
                  type="text"
                  name="pixKey"
                  id="pixKey"
                  placeholder="Insira sua chave Pix"
                  required
                  disabled={balance < 5.00}
                />
              </div>
            </div>

            <button type="submit" className="primaryButton" disabled={balance < 5.00}>
              Solicitar Transferência
            </button>
            {balance < 5.00 && (
              <small style={{ color: "#8a8174", display: "block", marginTop: "8px" }}>
                * Limite mínimo para saques é de R$ 5,00.
              </small>
            )}
          </form>
        </section>
      </div>

      {/* Earnings History */}
      <section className="tablePanel" style={{ marginTop: "30px" }}>
        <div className="tableTitleGroup" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--ink)" }}>Extrato Detalhado de Royalties</h2>
          <p style={{ fontSize: "0.85rem", color: "#6e675d", margin: "5px 0 0 0" }}>Valores recebidos por música e plataforma.</p>
        </div>
        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ flex: 1.5 }}>Lançamento / Música</span>
          <span style={{ flex: 1 }}>Plataforma</span>
          <span style={{ flex: 1.2 }}>Período</span>
          <span style={{ flex: 1 }}>Sua Participação</span>
          <span style={{ flex: 1, textAlign: "right", paddingRight: "1.2rem" }}>Valor Creditado</span>
        </div>
        {earnings.length ? (
          earnings.map((earning) => (
            <article className="compositionRow" key={earning.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1.5 }}>
                <strong>{earning.statement.release.title}</strong>
                <small>{earning.role} ({earning.name})</small>
              </div>
              <span style={{ flex: 1 }}>{earning.statement.platform}</span>
              <span style={{ flex: 1.2, fontSize: "0.85rem", color: "#524d45" }}>
                {new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(
                  earning.statement.periodStart
                )}{" "}
                -{" "}
                {new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(
                  earning.statement.periodEnd
                )}
              </span>
              <span style={{ flex: 1 }}>{earning.share}%</span>
              <span style={{ flex: 1, textAlign: "right", paddingRight: "1rem", fontWeight: "700", color: "#0f6b5f" }}>
                {formatCurrency(earning.amount)}
              </span>
            </article>
          ))
        ) : (
          <p className="mutedText" style={{ padding: "2rem", textAlign: "center" }}>
            Nenhum crédito de royalty registrado ainda.
          </p>
        )}
      </section>

      {/* Withdrawal Requests List */}
      <section className="tablePanel" style={{ marginTop: "30px", marginBottom: "40px" }}>
        <div className="tableTitleGroup" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--ink)" }}>Solicitações de Saque</h2>
          <p style={{ fontSize: "0.85rem", color: "#6e675d", margin: "5px 0 0 0" }}>Acompanhe o status dos seus pedidos de Pix.</p>
        </div>
        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ flex: 1.5 }}>Data de Solicitação</span>
          <span style={{ flex: 1.5 }}>Chave Pix</span>
          <span style={{ flex: 1 }}>Tipo de Chave</span>
          <span style={{ flex: 1 }}>Status</span>
          <span style={{ flex: 1, textAlign: "right", paddingRight: "1.2rem" }}>Valor do Saque</span>
        </div>
        {withdrawals.length ? (
          withdrawals.map((req) => (
            <article className="compositionRow" key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ flex: 1.5 }}>
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                  req.createdAt
                )}
              </span>
              <span style={{ flex: 1.5, fontFamily: "monospace" }}>{req.pixKey}</span>
              <span style={{ flex: 1 }}>{req.pixType}</span>
              <div style={{ flex: 1 }}>{statusLabel(req.status)}</div>
              <span style={{ flex: 1, textAlign: "right", paddingRight: "1rem", fontWeight: "700" }}>
                {formatCurrency(req.amount)}
              </span>
            </article>
          ))
        ) : (
          <p className="mutedText" style={{ padding: "2rem", textAlign: "center" }}>
            Nenhuma solicitação de saque realizada ainda.
          </p>
        )}
      </section>

      <style>{`
        .finance-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 25px;
          margin-top: 20px;
        }

        .finance-card {
          background: #fffdf8;
          border: 1px solid #e2dcd0;
          border-radius: 8px;
          padding: 30px;
          box-sizing: border-box;
        }

        .balance-card {
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: linear-gradient(135deg, #fffdf8 0%, #fbfaf5 100%);
          border-left: 5px solid #0f6b5f;
        }

        .balance-card h2 {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #8a8174;
          margin: 0 0 10px 0;
        }

        .balance-value {
          font-size: 32px;
          font-weight: 800;
          color: #0f6b5f;
          margin-bottom: 15px;
        }

        .balance-hint {
          font-size: 12px;
          line-height: 1.5;
          color: #8a8174;
          margin: 0;
        }

        .withdrawal-form-card h2 {
          font-size: 16px;
          font-weight: 700;
          color: #15130f;
          margin: 0 0 20px 0;
        }

        .primaryButton:disabled {
          background-color: #c9c3b8 !important;
          color: #8a8174 !important;
          cursor: not-allowed !important;
          opacity: 0.6;
          box-shadow: none !important;
        }

        .badge-pending {
          background: #fdf5e6;
          color: #b8860b;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-success {
          background: #e6f7f2;
          color: #0f6b5f;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-danger {
          background: #fdf2f2;
          color: #ef4444;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .finance-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}
