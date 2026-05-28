import "server-only";

import type { CreditActionCost, CreditPackage, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const DEFAULT_CREDIT_PACKAGES = [
  {
    code: "starter",
    name: "Inicial",
    credits: 20,
    amount: 49.9,
    description: "Para validar repertório, cadastrar composições e iniciar os primeiros lançamentos.",
    sortOrder: 1,
  },
  {
    code: "pro",
    name: "Profissional",
    credits: 80,
    amount: 169.9,
    description: "Para artistas, compositores e selos com operação constante dentro da plataforma.",
    sortOrder: 2,
  },
  {
    code: "label",
    name: "Gravadora",
    credits: 220,
    amount: 399.9,
    description: "Para operações maiores que precisam distribuir e negociar catálogo em volume.",
    sortOrder: 3,
  },
] as const;

export const DEFAULT_CREDIT_ACTION_COSTS = [
  {
    code: "COMPOSITION_CREATED",
    label: "Cadastrar composição",
    credits: 2,
    description: "Cobrado do compositor ao cadastrar qualquer composição no catálogo.",
  },
  {
    code: "RELEASE_SUBMISSION",
    label: "Preparar lançamento para revisão",
    credits: 10,
    description: "Cobrado ao criar um pacote de lançamento para revisão operacional.",
  },
] as const;

type CreditDb = typeof prisma | Prisma.TransactionClient;

export async function ensureCreditCatalog(db: CreditDb = prisma) {
  for (const item of DEFAULT_CREDIT_PACKAGES) {
    await db.creditPackage.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  for (const item of DEFAULT_CREDIT_ACTION_COSTS) {
    await db.creditActionCost.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  await db.creditActionCost.updateMany({
    where: { code: "INTEREST_SENT" },
    data: {
      isActive: false,
      credits: 0,
      description: "Interesse de artista em composição não consome créditos.",
    },
  });

  await db.creditActionCost.updateMany({
    where: { code: { startsWith: "COMPOSITION_CATEGORY_" } },
    data: {
      isActive: false,
      description: "Regra substituída por COMPOSITION_CREATED, valor único para qualquer composição.",
    },
  });
}

export async function getActiveCreditPackages(db: CreditDb = prisma) {
  await ensureCreditCatalog(db);

  return db.creditPackage.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { amount: "asc" }],
  });
}

export async function getAllCreditPackages(db: CreditDb = prisma) {
  await ensureCreditCatalog(db);

  return db.creditPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { amount: "asc" }],
  });
}

export async function getCreditActionCosts(db: CreditDb = prisma) {
  await ensureCreditCatalog(db);

  return db.creditActionCost.findMany({
    orderBy: { label: "asc" },
  });
}

export async function getCreditPackage(code: string, db: CreditDb = prisma) {
  await ensureCreditCatalog(db);

  return db.creditPackage.findFirst({
    where: {
      code,
      isActive: true,
    },
  });
}

export async function getCreditActionCost(code: string, db: CreditDb = prisma) {
  await ensureCreditCatalog(db);

  const cost = await db.creditActionCost.findUnique({
    where: { code },
  });

  if (!cost || !cost.isActive) {
    return null;
  }

  return cost;
}

export async function getCompositionCreationCost(db: CreditDb = prisma) {
  return getCreditActionCost("COMPOSITION_CREATED", db);
}

export async function getCreditBalance(userId: string, db: CreditDb = prisma) {
  const aggregate = await db.creditLedgerEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return aggregate._sum.amount ?? 0;
}

export async function debitCredits({
  amount,
  entity,
  entityId,
  reason,
  type,
  userId,
  db = prisma,
}: {
  amount: number;
  entity?: string;
  entityId?: string;
  reason: string;
  type: string;
  userId: string;
  db?: CreditDb;
}) {
  if (amount <= 0) {
    return getCreditBalance(userId, db);
  }

  const currentBalance = await getCreditBalance(userId, db);

  if (currentBalance < amount) {
    return null;
  }

  const balanceAfter = currentBalance - amount;

  await db.creditLedgerEntry.create({
    data: {
      userId,
      type,
      amount: -amount,
      balanceAfter,
      reason,
      entity: entity ?? null,
      entityId: entityId ?? null,
    },
  });

  return balanceAfter;
}

export function formatCreditPackage(packageItem: CreditPackage) {
  return {
    ...packageItem,
    amount: Number(packageItem.amount),
  };
}

export function formatCreditActionCost(cost: CreditActionCost) {
  return {
    ...cost,
    credits: Number(cost.credits),
  };
}

export function formatCredits(value: number) {
  return `${value} ${value === 1 ? "crédito" : "créditos"}`;
}
