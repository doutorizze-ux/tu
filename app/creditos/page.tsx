import Link from "next/link";
import { createCreditOrder } from "../actions";
import { AppShell, PageHeader } from "../components";
import { isAsaasConfigured } from "../lib/asaas";
import { formatCredits, getActiveCreditPackages, getCreditActionCosts, getCreditBalance } from "../lib/credits";
import { requireUser } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [balance, packages, actionCosts, orders, ledger] = await Promise.all([
    getCreditBalance(user.id),
    getActiveCreditPackages(),
    getCreditActionCosts(),
    prisma.creditOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.creditLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Carteira"
        title="Créditos da conta"
        description="Compre créditos por Pix ou cartão via Asaas e use em ações comerciais da plataforma."
      />

      <section className="creditHero">
        <div>
          <span>Saldo disponível</span>
          <strong>{formatCredits(balance)}</strong>
          <p>Cada uso importante gera um lançamento no extrato para auditoria e conciliação.</p>
        </div>
        <div className="creditCosts">
          {actionCosts.filter((item) => item.isActive).map((item) => (
            <span key={item.code}>
              {item.label}: <strong>{formatCredits(item.credits)}</strong>
            </span>
          ))}
        </div>
      </section>

      {params.erro ? (
        <p className="formError">
          {params.erro === "asaas"
            ? "Configure ASAAS_API_KEY no servidor antes de vender créditos reais."
            : params.erro === "creditos"
              ? "Saldo insuficiente. Compre créditos para continuar."
              : "Não foi possível abrir o checkout do Asaas. Verifique a integração."}
        </p>
      ) : null}
      {params.sucesso ? (
        <p className="formSuccess">Checkout aberto. Os créditos entram automaticamente quando o Asaas confirmar o pagamento.</p>
      ) : null}

      <section className="creditPackages">
        {packages.map((item) => (
          <article className="creditPackage" key={item.code}>
            <div>
              <p className="eyebrow">Pacote {item.name}</p>
              <h2>{formatCredits(item.credits)}</h2>
              <p>{item.description}</p>
            </div>
            <strong>{money(item.amount)}</strong>
            <form action={createCreditOrder}>
              <input name="packageCode" type="hidden" value={item.code} />
              <button className="primaryButton" type="submit" disabled={!isAsaasConfigured()}>
                Comprar com Pix ou cartão
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className="twoColumn">
        <article className="panelCard">
          <div className="panelTitle">
            <h2>Pedidos recentes</h2>
            <Link href="/suporte">Suporte</Link>
          </div>
          {orders.length ? (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Pacote</th>
                    <th>Status</th>
                    <th>Valor</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{formatCredits(order.credits)}</td>
                      <td>{order.status}</td>
                      <td>{money(order.amount)}</td>
                      <td>
                        {order.providerInvoiceUrl && order.status !== "PAID" ? (
                          <Link href={order.providerInvoiceUrl}>Abrir</Link>
                        ) : (
                          "Concluído"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mutedText">Nenhum pedido de crédito ainda.</p>
          )}
        </article>

        <article className="panelCard">
          <div className="panelTitle">
            <h2>Extrato</h2>
          </div>
          {ledger.length ? (
            <div className="activityList">
              {ledger.map((entry) => (
                <div key={entry.id}>
                  <strong>{entry.reason}</strong>
                  <span>
                    {entry.amount > 0 ? "+" : ""}
                    {formatCredits(entry.amount)} | saldo {formatCredits(entry.balanceAfter)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mutedText">Seu extrato aparecerá aqui assim que houver compra ou uso.</p>
          )}
        </article>
      </section>
    </AppShell>
  );
}
