import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "../../../components";
import { getAsaasPixQrCode, isAsaasConfigured } from "../../../lib/asaas";
import { requireUser } from "../../../lib/auth";
import { formatCredits } from "../../../lib/credits";
import { prisma } from "../../../lib/prisma";

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
    WAITING_PAYMENT: "Aguardando Pix",
    PENDING: "Preparando pagamento",
    PROVIDER_ERROR: "Erro no pagamento",
    REFUNDED: "Estornado",
  };

  return labels[status] ?? status;
}

export default async function CreditCheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await requireUser();
  const { orderId } = await params;
  const order = await prisma.creditOrder.findFirst({
    where: {
      id: orderId,
      userId: user.id,
    },
  });

  if (!order) {
    notFound();
  }

  let pixQrCode: Awaited<ReturnType<typeof getAsaasPixQrCode>> | null = null;
  let pixError: string | null = null;

  if (order.status !== "PAID" && order.providerPaymentId && isAsaasConfigured()) {
    try {
      pixQrCode = await getAsaasPixQrCode(order.providerPaymentId);
    } catch (error) {
      pixError = error instanceof Error ? error.message : "Nao foi possivel carregar o Pix.";
    }
  }

  const qrImageSrc = pixQrCode?.encodedImage
    ? `data:image/png;base64,${pixQrCode.encodedImage}`
    : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Pagamento seguro"
        title="Checkout Tunix"
        description="Finalize o Pix sem sair da experiencia da Tunix. Assim que o pagamento for confirmado, os creditos entram automaticamente na sua conta."
      />

      {order.status === "PAID" ? (
        <p className="formSuccess">Pagamento confirmado. Seus creditos ja foram liberados.</p>
      ) : null}

      {pixError ? (
        <p className="formError">Nao foi possivel carregar o QR Code Pix. Motivo: {pixError}</p>
      ) : null}

      <section className="checkoutGrid">
        <article className="panelCard pixCheckoutCard">
          <div className="panelTitle">
            <div>
              <p className="eyebrow">Pix</p>
              <h2>Pague para liberar {formatCredits(order.credits)}</h2>
            </div>
            <span className="statusPill">{statusLabel(order.status)}</span>
          </div>

          {qrImageSrc ? (
            <div className="pixQrLayout">
              <div className="qrCodeBox">
                <img src={qrImageSrc} alt="QR Code Pix Tunix" />
              </div>
              <div className="pixInstructions">
                <strong>Como pagar</strong>
                <ol>
                  <li>Abra o app do seu banco.</li>
                  <li>Escolha Pix com QR Code ou copia e cola.</li>
                  <li>Confirme o valor e finalize o pagamento.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="emptyState compact">
              <h2>Pix em preparacao</h2>
              <p>Atualize a pagina em alguns segundos. Se persistir, fale com o suporte Tunix.</p>
            </div>
          )}

          {pixQrCode?.payload ? (
            <label className="copyField">
              Pix copia e cola
              <textarea readOnly value={pixQrCode.payload} rows={5} />
            </label>
          ) : null}

          <div className="formActions">
            <Link className="secondaryButton linkButton" href="/creditos">
              Voltar para creditos
            </Link>
            <Link className="primaryButton linkButton" href={`/creditos/checkout/${order.id}`}>
              Atualizar pagamento
            </Link>
          </div>
        </article>

        <aside className="panelCard checkoutSummary">
          <p className="eyebrow">Resumo</p>
          <dl>
            <div>
              <dt>Pacote</dt>
              <dd>{formatCredits(order.credits)}</dd>
            </div>
            <div>
              <dt>Valor</dt>
              <dd>{money(order.amount)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{statusLabel(order.status)}</dd>
            </div>
            {pixQrCode?.expirationDate ? (
              <div>
                <dt>Validade</dt>
                <dd>{pixQrCode.expirationDate}</dd>
              </div>
            ) : null}
          </dl>
          <p>
            O comprovante e a liberacao dos creditos dependem da confirmacao automatica do banco e do webhook de pagamento.
          </p>
          <Link className="secondaryButton linkButton" href="/suporte">
            Preciso de suporte
          </Link>
        </aside>
      </section>
    </AppShell>
  );
}
