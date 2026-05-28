import "server-only";

import type { User } from "@prisma/client";
import { prisma } from "./prisma";

const SANDBOX_URL = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_URL = "https://api.asaas.com/v3";

type AsaasCustomer = {
  id: string;
};

type AsaasPayment = {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  status?: string;
};

type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

function apiKey() {
  return process.env.ASAAS_API_KEY?.trim() || process.env.ASAAS_ACCESS_TOKEN?.trim();
}

export function isAsaasConfigured() {
  return Boolean(apiKey());
}

export function asaasBaseUrl() {
  return process.env.ASAAS_ENVIRONMENT === "PRODUCTION" ? PRODUCTION_URL : SANDBOX_URL;
}

async function asaasRequest<T>(path: string, init: RequestInit) {
  const key = apiKey();

  if (!key) {
    throw new Error("ASAAS_NOT_CONFIGURED");
  }

  const response = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers: {
      "User-Agent": "Tunix/1.0",
      accept: "application/json",
      "content-type": "application/json",
      access_token: key,
      ...(init.headers ?? {}),
    },
  });
  const bodyText = await response.text();
  const body = bodyText ? JSON.parse(bodyText) : {};

  if (!response.ok) {
    const message = typeof body?.errors?.[0]?.description === "string"
      ? body.errors[0].description
      : `Asaas HTTP ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export async function ensureAsaasCustomer(user: Pick<User, "id" | "name" | "email" | "asaasCustomerId">) {
  if (user.asaasCustomerId) {
    return user.asaasCustomerId;
  }

  const customer = await asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      externalReference: user.id,
      notificationDisabled: false,
    }),
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { asaasCustomerId: customer.id },
  });

  return customer.id;
}

export async function ensureAsaasCustomerWithDocument(
  user: Pick<User, "id" | "name" | "email" | "asaasCustomerId">,
  cpfCnpj: string,
) {
  if (user.asaasCustomerId) {
    return user.asaasCustomerId;
  }

  const customer = await asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      cpfCnpj,
      externalReference: user.id,
      notificationDisabled: false,
    }),
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { asaasCustomerId: customer.id },
  });

  return customer.id;
}

export async function createAsaasCreditPayment({
  amount,
  credits,
  customerId,
  externalReference,
}: {
  amount: number;
  credits: number;
  customerId: string;
  externalReference: string;
}) {
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const payment = await asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: amount,
      dueDate,
      description: `Compra de ${credits} créditos - Tunix`,
      externalReference,
    }),
  });

  return {
    id: payment.id,
    invoiceUrl: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
    status: payment.status ?? "CREATED",
  };
}

export async function getAsaasPixQrCode(paymentId: string) {
  return asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`, {
    method: "GET",
  });
}
