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

function checkoutErrorMessage(error?: string, reason?: string) {
  if (error === "asaas") {
    return "Configure ASAAS_API_KEY no servidor antes de vender creditos reais.";
  }

  if (error === "creditos") {
    return "Saldo insuficiente. Compre creditos para continuar.";
  }

  if (error === "documento") {
    return "Informe um CPF ou CNPJ valido para abrir o checkout.";
  }

  return `Nao foi possivel abrir o checkout do Asaas.${reason ? ` Motivo: ${reason}` : " Verifique a integracao."}`;
}

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; motivo?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const asaasConfigured = isAsaasConfigured();
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
        title="Creditos da conta"
        description="Compre creditos por Pix ou cartao via Asaas e use em acoes comerciais da plataforma."
      />

      <section className="creditHero">
        <div>
          <span>Saldo disponivel</span>
          <strong>{formatCredits(balance)}</strong>
          <p>Cada uso importante gera um lancamento no extrato para auditoria e conciliacao.</p>
        </div>
        <div className="creditCosts">
          {actionCosts.filter((item) => item.isActive).map((item) => (
            <span key={item.code}>
              {item.label}: <strong>{formatCredits(item.credits)}</strong>
            </span>
          ))}
        </div>
      </section>

      {params.erro ? <p className="formError">{checkoutErrorMessage(params.erro, params.motivo)}</p> : null}
      {params.sucesso ? (
        <p className="formSuccess">Checkout aberto. Os creditos entram automaticamente quando o Asaas confirmar o pagamento.</p>
      ) : null}

      {!asaasConfigured ? (
        <p className="formError">
          Pagamento indisponivel: configure ASAAS_API_KEY no Coolify e reinicie o deploy.
        </p>
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
              <label>
                CPF ou CNPJ
                <input
                  name="cpfCnpj"
                  inputMode="numeric"
                  minLength={11}
                  placeholder="Somente numeros"
                  required
                />
              </label>
              <button className="primaryButton" type="submit" disabled={!asaasConfigured}>
                Comprar com Pix ou cartao
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
                          "Concluido"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mutedText">Nenhum pedido de credito ainda.</p>
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
            <p className="mutedText">Seu extrato aparecera aqui assim que houver compra ou uso.</p>
          )}
        </article>
      </section>
    </AppShell>
  );
}
