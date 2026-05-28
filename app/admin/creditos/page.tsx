import { adminSaveCreditActionCost, adminSaveCreditPackage } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { formatCredits, getAllCreditPackages, getCreditActionCosts } from "../../lib/credits";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PAID: "Pago",
    PENDING: "Pendente",
    FAILED: "Falhou",
    CANCELED: "Cancelado",
  };

  return labels[status] ?? status;
}

export default async function AdminCreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((role) => role.role === "ADMIN");

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Operação"
          title="Acesso restrito"
          description="Somente administradores podem acompanhar pedidos de crédito."
        />
      </AppShell>
    );
  }

  const [packages, actionCosts, orders, ledger] = await Promise.all([
    getAllCreditPackages(),
    getCreditActionCosts(),
    prisma.creditOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: true },
    }),
    prisma.creditLedgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { user: true },
    }),
  ]);

  const operationCosts = actionCosts.filter((cost) => !cost.code.startsWith("COMPOSITION_CATEGORY_"));
  const activePackages = packages.filter((item) => item.isActive).length;
  const activeRules = actionCosts.filter((item) => item.isActive).length;
  const paidOrders = orders.filter((order) => order.status === "PAID");
  const paidAmount = paidOrders.reduce((total, order) => total + Number(order.amount), 0);
  const creditsSold = paidOrders.reduce((total, order) => total + order.credits, 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Financeiro"
        title="Central de créditos"
        description="Controle pacotes, preço geral por composição e rastreio financeiro da operação."
      />

      {params.erro ? (
        <p className="formError">
          {params.erro === "acao"
            ? "Confira código, nome da regra e quantidade de créditos."
            : "Confira código, nome, descrição, créditos e valor do pacote."}
        </p>
      ) : null}
      {params.sucesso ? <p className="formSuccess">Configuração de créditos salva.</p> : null}

      <section className="financeCommandBar">
        <article>
          <span>Receita confirmada</span>
          <strong>{money(paidAmount)}</strong>
          <small>{creditsSold} créditos vendidos em pedidos pagos</small>
        </article>
        <article>
          <span>Pacotes ativos</span>
          <strong>{activePackages}</strong>
          <small>{packages.length} pacotes configurados</small>
        </article>
        <article>
          <span>Regras ativas</span>
          <strong>{activeRules}</strong>
          <small>cobranças gerais configuradas</small>
        </article>
        <article>
          <span>Pedidos recentes</span>
          <strong>{orders.length}</strong>
          <small>Últimos pedidos monitorados pelo admin</small>
        </article>
      </section>

      <section className="creditAdminLayout">
        <article className="creditAdminPanel wide">
          <div className="panelTitle">
            <div>
              <h2>Pacotes vendidos ao cliente</h2>
              <p>Defina o que o usuário compra por Pix ou cartão no checkout do Asaas.</p>
            </div>
          </div>

          <div className="packageEditorGrid">
            {packages.map((item) => (
              <form className="packageEditorCard" action={adminSaveCreditPackage} key={item.id}>
                <input name="packageId" type="hidden" value={item.id} />
                <header>
                  <div>
                    <span>{item.code}</span>
                    <input name="name" defaultValue={item.name} aria-label="Nome comercial" />
                  </div>
                  <strong>{money(item.amount)}</strong>
                </header>
                <div className="packageEditorFields">
                  <label>
                    Código
                    <input name="code" defaultValue={item.code} />
                  </label>
                  <label>
                    Créditos
                    <input name="credits" type="number" min="1" defaultValue={item.credits} />
                  </label>
                  <label>
                    Valor
                    <input name="amount" type="number" min="0.01" step="0.01" defaultValue={item.amount} />
                  </label>
                  <label>
                    Ordem
                    <input name="sortOrder" type="number" defaultValue={item.sortOrder} />
                  </label>
                </div>
                <label>
                  Descrição comercial
                  <textarea name="description" rows={3} defaultValue={item.description} />
                </label>
                <footer>
                  <label className="inlineCheck">
                    <input name="isActive" type="checkbox" defaultChecked={item.isActive} />
                    Ativo na loja
                  </label>
                  <button className="secondaryButton" type="submit">Salvar</button>
                </footer>
              </form>
            ))}

            <form className="packageEditorCard newPackage" action={adminSaveCreditPackage}>
              <header>
                <div>
                  <span>Novo pacote</span>
                  <input name="name" placeholder="Label Plus" aria-label="Nome comercial" />
                </div>
                <strong>BRL</strong>
              </header>
              <div className="packageEditorFields">
                <label>
                  Código
                  <input name="code" placeholder="label-plus" />
                </label>
                <label>
                  Créditos
                  <input name="credits" type="number" min="1" placeholder="500" />
                </label>
                <label>
                  Valor
                  <input name="amount" type="number" min="0.01" step="0.01" placeholder="799.90" />
                </label>
                <label>
                  Ordem
                  <input name="sortOrder" type="number" defaultValue="10" />
                </label>
              </div>
              <label>
                Descrição comercial
                <textarea name="description" rows={3} placeholder="Descrição que aparece para o cliente" />
              </label>
              <footer>
                <label className="inlineCheck">
                  <input name="isActive" type="checkbox" defaultChecked />
                  Ativo na loja
                </label>
                <button className="primaryButton" type="submit">Criar pacote</button>
              </footer>
            </form>
          </div>
        </article>
      </section>

      <section className="creditAdminLayout lower">
        <article className="creditAdminPanel">
          <div className="panelTitle">
            <div>
              <h2>Custos operacionais</h2>
              <p>Valor geral por composição, lançamentos e regras especiais da plataforma.</p>
            </div>
          </div>
          <div className="opsRuleGrid">
            {operationCosts.map((cost) => (
              <form className="opsRuleCard" action={adminSaveCreditActionCost} key={cost.id}>
                <input name="costId" type="hidden" value={cost.id} />
                <label>
                  Código técnico
                  <input name="code" defaultValue={cost.code} />
                </label>
                <label>
                  Nome exibido
                  <input name="label" defaultValue={cost.label} />
                </label>
                <label>
                  Créditos
                  <input name="credits" type="number" min="0" defaultValue={cost.credits} />
                </label>
                <label>
                  Descrição
                  <textarea name="description" rows={3} defaultValue={cost.description ?? ""} />
                </label>
                <footer>
                  <label className="inlineCheck">
                    <input name="isActive" type="checkbox" defaultChecked={cost.isActive} />
                    Cobrança ativa
                  </label>
                  <button className="secondaryButton" type="submit">Salvar</button>
                </footer>
              </form>
            ))}

            <form className="opsRuleCard newRule" action={adminSaveCreditActionCost}>
              <label>
                Código técnico
                <input name="code" placeholder="ex: REVIEW_EXPRESS" />
              </label>
              <label>
                Nome exibido
                <input name="label" placeholder="Revisão expressa" />
              </label>
              <label>
                Créditos
                <input name="credits" type="number" min="0" placeholder="5" />
              </label>
              <label>
                Descrição
                <textarea name="description" rows={3} placeholder="Quando esta regra deve ser cobrada" />
              </label>
              <footer>
                <label className="inlineCheck">
                  <input name="isActive" type="checkbox" defaultChecked />
                  Cobrança ativa
                </label>
                <button className="primaryButton" type="submit">Criar regra</button>
              </footer>
            </form>
          </div>
        </article>

        <aside className="creditAdminPanel">
          <div className="panelTitle">
            <div>
              <h2>Últimos movimentos</h2>
              <p>Extrato recente para auditoria financeira.</p>
            </div>
          </div>
          <div className="ledgerTimeline">
            {ledger.slice(0, 12).map((entry) => (
              <div key={entry.id}>
                <span className={entry.amount > 0 ? "positive" : "negative"}>
                  {entry.amount > 0 ? "+" : ""}
                  {formatCredits(entry.amount)}
                </span>
                <strong>{entry.user.name}</strong>
                <small>{entry.reason} | saldo {formatCredits(entry.balanceAfter)}</small>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="creditAdminPanel ordersPanel">
        <div className="panelTitle">
          <div>
            <h2>Pedidos de crédito</h2>
            <p>Compras abertas e confirmações recebidas pela integração financeira.</p>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Créditos</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Asaas</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.user.name}</td>
                  <td>{formatCredits(order.credits)}</td>
                  <td>{money(order.amount)}</td>
                  <td><span className="statusPill">{statusLabel(order.status)}</span></td>
                  <td>{order.providerPaymentId ?? "Pendente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
