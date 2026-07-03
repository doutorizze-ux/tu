import React from "react";
import Link from "next/link";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { adminProcessWithdrawal } from "../../actions";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((r) => r.role === "ADMIN");
  if (!isAdmin) {
    redirect("/painel");
  }
  return user;
}

export default async function AdminFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;

  // Retrieve pending requests
  const pendingRequests = await prisma.withdrawalRequest.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  // Retrieve past processed requests
  const processedRequests = await prisma.withdrawalRequest.findMany({
    where: {
      status: { in: ["PAID", "REJECTED"] },
    },
    include: { user: true },
    orderBy: { updatedAt: "desc" },
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
        return <span className="badge-pending">Aguardando Pagamento</span>;
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
        eyebrow="Operações Admin"
        title="Gerenciamento de Saques Pix"
        description="Analise, aprove e recuse solicitações de transferência de royalties realizadas por artistas."
      />

      {params.erro ? (
        <p className="formError">
          Ocorreu um erro ao processar esta solicitação. Certifique-se de que a requisição ainda está ativa.
        </p>
      ) : null}

      {params.sucesso ? (
        <p className="formSuccess">
          Saque processado com sucesso e status atualizado na plataforma!
        </p>
      ) : null}

      {/* Pending Requests Section */}
      <section className="tablePanel" style={{ marginTop: "20px" }}>
        <div className="tableTitleGroup" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--danger, #ef4444)" }}>Solicitações Pendentes (Pix a Pagar)</h2>
          <p style={{ fontSize: "0.85rem", color: "#6e675d", margin: "5px 0 0 0" }}>Processar as transferências e atualizar o status abaixo.</p>
        </div>

        {pendingRequests.length ? (
          <div className="admin-requests-list">
            {pendingRequests.map((req) => (
              <article key={req.id} className="admin-request-card">
                <div className="card-info">
                  <div className="info-user">
                    <strong>{req.user.name}</strong>
                    <span className="user-email">{req.user.email}</span>
                  </div>
                  <div className="info-amount">{formatCurrency(req.amount)}</div>
                </div>

                <div className="card-pix-details">
                  <span className="pix-type">Chave {req.pixType}:</span>
                  <code className="pix-key">{req.pixKey}</code>
                  <span className="request-date">
                    Solicitado em: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(req.createdAt)}
                  </span>
                </div>

                {/* Form to Process request */}
                <form action={adminProcessWithdrawal} className="admin-action-form">
                  <input type="hidden" name="requestId" value={req.id} />
                  <input
                    type="text"
                    name="adminNote"
                    placeholder="Nota de pagamento (opcional, ex: ID da transação)"
                    className="admin-note-input"
                  />
                  <div className="form-buttons">
                    <button type="submit" name="decision" value="PAID" className="approve-btn">
                      Confirmar Pix Pago
                    </button>
                    <button type="submit" name="decision" value="REJECTED" className="reject-btn">
                      Recusar & Reembolsar
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <p className="mutedText" style={{ padding: "3rem", textAlign: "center" }}>
            Não há solicitações de saque pendentes de pagamento. Tudo em dia! 🎉
          </p>
        )}
      </section>

      {/* Processed Requests Section */}
      <section className="tablePanel" style={{ marginTop: "30px", marginBottom: "40px" }}>
        <div className="tableTitleGroup" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--ink)" }}>Histórico de Saques Processados</h2>
          <p style={{ fontSize: "0.85rem", color: "#6e675d", margin: "5px 0 0 0" }}>Registro histórico de saques pagos ou recusados no sistema.</p>
        </div>
        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ flex: 1.5 }}>Usuário / E-mail</span>
          <span style={{ flex: 1.5 }}>Chave Pix</span>
          <span style={{ flex: 1.2 }}>Processado Em</span>
          <span style={{ flex: 1 }}>Status</span>
          <span style={{ flex: 1, textAlign: "right", paddingRight: "1.2rem" }}>Valor Pago</span>
        </div>
        {processedRequests.length ? (
          processedRequests.map((req) => (
            <article className="compositionRow" key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1.5 }}>
                <strong>{req.user.name}</strong>
                <small>{req.user.email}</small>
              </div>
              <div style={{ flex: 1.5 }}>
                <span style={{ fontSize: "0.8rem", color: "#8a8174" }}>({req.pixType})</span>{" "}
                <code style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{req.pixKey}</code>
              </div>
              <span style={{ flex: 1.2 }}>
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(req.updatedAt)}
              </span>
              <div style={{ flex: 1 }}>{statusLabel(req.status)}</div>
              <span style={{ flex: 1, textAlign: "right", paddingRight: "1rem", fontWeight: "700" }}>
                {formatCurrency(req.amount)}
              </span>
            </article>
          ))
        ) : (
          <p className="mutedText" style={{ padding: "2rem", textAlign: "center" }}>
            Nenhum saque processado registrado ainda.
          </p>
        )}
      </section>

      <style>{`
        .admin-requests-list {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .admin-request-card {
          background: #fffdf8;
          border: 1px solid #e0dbd3;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }

        .card-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #f4efe4;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }

        .info-user strong {
          font-size: 16px;
          color: #15130f;
          display: block;
        }

        .user-email {
          font-size: 13px;
          color: #8a8174;
        }

        .info-amount {
          font-size: 20px;
          font-weight: 800;
          color: #0f6b5f;
        }

        .card-pix-details {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #524d45;
          margin-bottom: 18px;
        }

        .pix-key {
          font-family: monospace;
          background: #f4efe4;
          padding: 2px 6px;
          border-radius: 4px;
          color: #15130f;
          font-size: 13px;
        }

        .request-date {
          margin-left: auto;
          color: #8a8174;
          font-size: 12px;
        }

        .admin-action-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .admin-note-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #c9c3b8;
          border-radius: 6px;
          font-size: 13px;
          background: #ffffff;
          outline: none;
          box-sizing: border-box;
        }

        .admin-note-input:focus {
          border-color: #0f6b5f;
        }

        .form-buttons {
          display: flex;
          gap: 10px;
        }

        .approve-btn {
          padding: 10px 20px;
          background: #0f6b5f;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .approve-btn:hover {
          background: #0d5c52;
        }

        .reject-btn {
          padding: 10px 20px;
          background: transparent;
          color: #ef4444;
          border: 1px solid #ef4444;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reject-btn:hover {
          background: #fdf2f2;
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
      `}</style>
    </AppShell>
  );
}
