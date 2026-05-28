import { NextResponse } from "next/server";
import { getCreditBalance } from "../../../../lib/credits";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    externalReference?: string;
    invoiceUrl?: string;
  };
};

const PAID_EVENTS = new Set(["PAYMENT_RECEIVED"]);
const REVERSAL_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_CHARGEBACK_DISPUTE"]);

function expectedWebhookToken() {
  return process.env.ASAAS_WEBHOOK_TOKEN?.trim();
}

export async function POST(request: Request) {
  const token = expectedWebhookToken();
  const receivedToken = request.headers.get("asaas-access-token") ?? "";

  if (token && receivedToken !== token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production" && !token) {
    return NextResponse.json({ ok: false, error: "ASAAS_WEBHOOK_TOKEN_REQUIRED" }, { status: 500 });
  }

  const payload = (await request.json()) as AsaasWebhookPayload;
  const eventType = payload.event ?? "UNKNOWN";
  const payment = payload.payment;
  const eventId = payload.id ?? `${eventType}:${payment?.id ?? crypto.randomUUID()}`;

  try {
    await prisma.paymentWebhookEvent.create({
      data: {
        provider: "ASAAS",
        eventId,
        eventType,
        payload: payload as object,
      },
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!payment?.id && !payment?.externalReference) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const order = await prisma.creditOrder.findFirst({
    where: {
      OR: [
        { providerPaymentId: payment.id ?? "__missing__" },
        { externalReference: payment.externalReference ?? "__missing__" },
      ],
    },
  });

  if (!order) {
    await prisma.auditLog.create({
      data: {
        action: "ASAAS_WEBHOOK_UNMATCHED",
        entity: "PaymentWebhookEvent",
        entityId: eventId,
        metadata: {
          eventType,
          paymentId: payment.id ?? null,
          externalReference: payment.externalReference ?? null,
        },
      },
    });
    return NextResponse.json({ ok: true, unmatched: true });
  }

  if (PAID_EVENTS.has(eventType) && order.status !== "PAID") {
    await prisma.$transaction(async (tx) => {
      const balance = await getCreditBalance(order.userId, tx);
      const balanceAfter = balance + order.credits;

      await tx.creditOrder.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          providerPaymentId: payment.id ?? order.providerPaymentId,
          providerInvoiceUrl: payment.invoiceUrl ?? order.providerInvoiceUrl,
        },
      });
      await tx.creditLedgerEntry.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: "CREDIT_PURCHASE",
          amount: order.credits,
          balanceAfter,
          reason: "Compra de creditos confirmada pelo Asaas",
          entity: "CreditOrder",
          entityId: order.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: order.userId,
          action: "CREDIT_ORDER_PAID",
          entity: "CreditOrder",
          entityId: order.id,
          metadata: {
            eventId,
            eventType,
            paymentId: payment.id ?? null,
            credits: order.credits,
          },
        },
      });
    });
  }

  if (REVERSAL_EVENTS.has(eventType) && order.status === "PAID") {
    await prisma.$transaction(async (tx) => {
      const balance = await getCreditBalance(order.userId, tx);
      const balanceAfter = balance - order.credits;

      await tx.creditOrder.update({
        where: { id: order.id },
        data: { status: "REVERSED" },
      });
      await tx.creditLedgerEntry.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          type: "CREDIT_REVERSAL",
          amount: -order.credits,
          balanceAfter,
          reason: "Estorno/chargeback informado pelo Asaas",
          entity: "CreditOrder",
          entityId: order.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: order.userId,
          action: "CREDIT_ORDER_REVERSED",
          entity: "CreditOrder",
          entityId: order.id,
          metadata: {
            eventId,
            eventType,
            paymentId: payment.id ?? null,
          },
        },
      });
    });
  }

  return NextResponse.json({ ok: true });
}
