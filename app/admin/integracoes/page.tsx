import { saveDistributionIntegration, startTooLostOAuth, testDistributionIntegration } from "../../actions";
import { AppShell, PageHeader } from "../../components";
import { requireUser } from "../../lib/auth";
import { decryptSecret, maskSecret } from "../../lib/crypto-secrets";
import { prisma } from "../../lib/prisma";
import { isTooLostOAuthConfigured, tooLostScopes } from "../../lib/toolost";

export const dynamic = "force-dynamic";

async function requireAdminUser() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });

  if (!roles.some((role) => role.role === "ADMIN")) {
    return null;
  }

  return user;
}

export default async function DistributionIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string; status?: string }>;
}) {
  const [user, params] = await Promise.all([requireAdminUser(), searchParams]);

  if (!user) {
    return (
      <AppShell>
        <section className="emptyState">
          <h2>Acesso restrito</h2>
          <p>Somente administradores podem configurar credenciais de distribuicao.</p>
        </section>
      </AppShell>
    );
  }

  const integration = await prisma.distributionIntegration.findFirst({
    orderBy: { updatedAt: "desc" },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });
  const deliveries = await prisma.distributionDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      release: true,
    },
  });
  const decryptedApiKey = integration ? decryptSecret(integration.apiKeyEncrypted) : "";
  const decryptedWebhookSecret = integration ? decryptSecret(integration.webhookSecretEncrypted) : "";
  const tooLostConfigured = isTooLostOAuthConfigured();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Integracao da distribuidora"
        description="Configure credenciais oficiais, teste conexao e acompanhe logs de envio para plataformas."
      />

      <section className="adminGrid">
        <article className="adminPanel">
          {params.erro ? (
            <p className="formError">
              {params.erro === "toolost_env"
                ? "Configure as credenciais OAuth da distribuidora no Coolify antes de conectar."
                : params.erro === "toolost_oauth"
                  ? `OAuth da distribuidora nao foi concluido: ${params.status ?? "verifique o callback"}`
                  : "Confira provider, endpoint, API key e webhook secret."}
            </p>
          ) : null}
          {params.sucesso ? (
            <p className="formSuccess">
              {params.sucesso === "salvo"
                ? "Configuracao salva."
                : params.sucesso === "toolost_conectado"
                  ? "Distribuidora conectada com OAuth. Token salvo de forma criptografada."
                  : `Teste de conexao finalizado: ${params.status ?? "verifique logs"}.`}
            </p>
          ) : null}

          <div className="oauthProviderCard">
            <div>
              <p className="eyebrow">OAuth oficial</p>
              <h2>Conectar distribuidora</h2>
              <p>
                Use o fluxo Authorization Code da documentacao oficial. O client secret fica somente no servidor.
              </p>
            </div>
            <dl className="accessList">
              <div>
                <dt>Callback</dt>
                <dd>Configurado no painel da distribuidora</dd>
              </div>
              <div>
                <dt>Scopes</dt>
                <dd>{tooLostScopes()}</dd>
              </div>
            </dl>
            <form action={startTooLostOAuth}>
              <button className="primaryButton" type="submit" disabled={!tooLostConfigured}>
                Conectar distribuidora
              </button>
            </form>
            {!tooLostConfigured ? (
              <p className="mutedText">
                Falta configurar as credenciais OAuth da distribuidora no Coolify.
              </p>
            ) : null}
          </div>

          <div className="blockHeader">
            <h2>Credenciais oficiais</h2>
            <span className="songStatus">{integration?.status ?? "Nao configurada"}</span>
          </div>

          <form className="compositionForm" action={saveDistributionIntegration}>
            <input name="integrationId" type="hidden" value={integration?.id ?? ""} />
            <div className="formGrid">
              <label>
                Provider
                <input name="provider" defaultValue={integration?.provider ?? ""} placeholder="Nome oficial do provider" />
              </label>
              <label>
                Ambiente
                <select name="environment" defaultValue={integration?.environment ?? "SANDBOX"}>
                  <option value="SANDBOX">Sandbox</option>
                  <option value="PRODUCTION">Producao</option>
                </select>
              </label>
              <label>
                Endpoint de envio
                <input name="endpoint" defaultValue={integration?.endpoint ?? ""} placeholder="https://api.provider.com/releases" />
              </label>
              <label>
                Endpoint de teste
                <input name="testEndpoint" defaultValue={integration?.testEndpoint ?? ""} placeholder="https://api.provider.com/health" />
              </label>
              <label>
                API key
                <input name="apiKey" placeholder={maskSecret(decryptedApiKey)} />
              </label>
              <label>
                Webhook secret
                <input name="webhookSecret" placeholder={maskSecret(decryptedWebhookSecret)} />
              </label>
            </div>
            <div className="checkList">
              <label>
                <input name="isActive" type="checkbox" defaultChecked={integration?.isActive ?? true} />
                Usar esta integracao como provider ativo
              </label>
            </div>
            <div className="formActions">
              <button className="primaryButton" type="submit">Salvar integracao</button>
            </div>
          </form>

          {integration ? (
            <form className="inlineActionForm" action={testDistributionIntegration}>
              <input name="integrationId" type="hidden" value={integration.id} />
              <button className="secondaryButton" type="submit">Testar conexao</button>
              <span>
                Ultimo teste: {integration.lastTestedAt ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(integration.lastTestedAt) : "nunca"}
              </span>
            </form>
          ) : null}
        </article>

        <aside className="adminPanel">
          <h2>Contrato tecnico</h2>
          <dl className="accessList">
            <div>
              <dt>OAuth</dt>
              <dd>Authorization Code</dd>
            </div>
            <div>
              <dt>API</dt>
              <dd>API oficial da distribuidora</dd>
            </div>
            <div>
              <dt>Teste</dt>
              <dd>GET /me</dd>
            </div>
            <div>
              <dt>Callback</dt>
              <dd>Callback OAuth configurado</dd>
            </div>
          </dl>
          <p className="mutedText">
            A conexao oficial usa Bearer token criptografado. O envio automatico de releases depende dos endpoints aprovados na API da distribuidora.
          </p>
        </aside>
      </section>

      <section className="adminGrid lower">
        <article className="adminPanel">
          <h2>Logs de teste</h2>
          <div className="logList">
            {integration?.logs.length ? integration.logs.map((log) => (
              <div key={log.id}>
                <strong>{log.action} - {log.status}</strong>
                <span>{log.message || "Sem mensagem"} - {log.responseStatus ?? "sem HTTP"}</span>
              </div>
            )) : <p className="mutedText">Nenhum teste registrado.</p>}
          </div>
        </article>

        <article className="adminPanel">
          <h2>Tentativas de envio</h2>
          <div className="logList">
            {deliveries.length ? deliveries.map((delivery) => (
              <div key={delivery.id}>
                <strong>{delivery.release.title} - {delivery.status}</strong>
                <span>{delivery.provider} - {delivery.responseStatus ?? "sem HTTP"} - {delivery.errorMessage ?? "sem erro"}</span>
              </div>
            )) : <p className="mutedText">Nenhuma tentativa registrada.</p>}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
