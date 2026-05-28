"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAsaasCreditPayment, ensureAsaasCustomerWithDocument, isAsaasConfigured } from "./lib/asaas";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "./lib/auth";
import { saveAudioGuide } from "./lib/audio-storage";
import { decryptSecret, encryptSecret } from "./lib/crypto-secrets";
import { debitCredits, getCompositionCreationCost, getCreditActionCost, getCreditPackage } from "./lib/credits";
import {
  buildDistributionPayload,
  getDistributionProviderConfig,
  submitToDistributionPartner,
} from "./lib/distribution-provider";
import { prisma } from "./lib/prisma";
import { saveReleaseAsset } from "./lib/release-storage";
import { validateReleasePackage } from "./lib/release-validator";
import { parseRoyaltyImportCsv } from "./lib/royalty-import";
import { COMPOSITION_AUTHORSHIP_ASSERTIONS, LEGAL_VERSIONS, RELEASE_RIGHTS_ASSERTIONS } from "./lib/legal";
import { checkRateLimit } from "./lib/rate-limit";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

type StoredReleaseAsset = NonNullable<Awaited<ReturnType<typeof saveReleaseAsset>>>;

function isStoredReleaseAsset(asset: StoredReleaseAsset | null): asset is StoredReleaseAsset {
  return Boolean(asset);
}

async function upsertReleaseAsset(releaseId: string, file: FormDataEntryValue | null, type: "MASTER" | "COVER") {
  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  const asset = await saveReleaseAsset(file, releaseId, type);

  if (!asset) {
    return null;
  }

  await prisma.releaseAsset.upsert({
    where: {
      releaseId_type: {
        releaseId,
        type: asset.type,
      },
    },
    update: {
      storageKey: asset.storageKey,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      checksum: asset.checksum,
    },
    create: {
      releaseId,
      type: asset.type,
      storageKey: asset.storageKey,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      checksum: asset.checksum,
    },
  });

  return asset;
}

async function requireAdmin() {
  const user = await requireUser();
  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((role) => role.role === "ADMIN");

  if (!isAdmin) {
    redirect("/painel");
  }

  return user;
}

async function adminUserIds() {
  const roles = await prisma.userRole.findMany({
    where: { role: "ADMIN" },
    select: { userId: true },
  });

  return [...new Set(roles.map((role) => role.userId))];
}

async function notifyUsers({
  body,
  entity,
  entityId,
  href,
  recipients,
  title,
  type,
}: {
  body: string;
  entity?: string;
  entityId?: string;
  href?: string;
  recipients: string[];
  title: string;
  type: string;
}) {
  const uniqueRecipients = [...new Set(recipients)].filter(Boolean);

  if (!uniqueRecipients.length) {
    return;
  }

  await prisma.notification.createMany({
    data: uniqueRecipients.map((userId) => ({
      userId,
      type,
      title,
      body,
      href: href ?? null,
      entity: entity ?? null,
      entityId: entityId ?? null,
    })),
  });
}

export async function registerUser(formData: FormData) {
  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const role = formString(formData, "role") || "COMPOSER";
  const acceptedTerms = formData.get("acceptTerms") === "on";

  if (!checkRateLimit(`register:${email || "unknown"}`, 5, 15 * 60 * 1000)) {
    redirect("/criar-conta?erro=limite");
  }

  if (!name || !email || password.length < 8 || !acceptedTerms) {
    redirect("/criar-conta?erro=dados");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect("/criar-conta?erro=email");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashPassword(password),
      profile: {
        create: {
          displayName: name,
        },
      },
      roles: {
        create: {
          role,
        },
      },
    },
  });

  await prisma.userAgreement.createMany({
    data: [
      {
        userId: user.id,
        documentType: "TERMS_OF_USE",
        documentVersion: LEGAL_VERSIONS.termsOfUse,
        context: `register:${role}`,
      },
      {
        userId: user.id,
        documentType: "PRIVACY_POLICY",
        documentVersion: LEGAL_VERSIONS.privacyPolicy,
        context: `register:${role}`,
      },
    ],
  });

  await createSession(user.id);
  redirect("/painel");
}

export async function loginUser(formData: FormData) {
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");

  if (!checkRateLimit(`login:${email || "unknown"}`, 8, 15 * 60 * 1000)) {
    redirect("/entrar?erro=limite");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.password)) {
    await prisma.auditLog.create({
      data: {
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user?.id ?? email,
        metadata: {
          email,
          reason: user ? "INVALID_PASSWORD" : "USER_NOT_FOUND",
        },
      },
    });
    redirect("/entrar?erro=credenciais");
  }

  await createSession(user.id);
  redirect("/painel");
}

export async function logoutUser() {
  await destroySession();
  redirect("/");
}

export async function createCreditOrder(formData: FormData) {
  const user = await requireUser();
  const packageCode = formString(formData, "packageCode");
  const cpfCnpj = formString(formData, "cpfCnpj").replace(/\D/g, "");
  const selectedPackage = await getCreditPackage(packageCode);

  if (!selectedPackage) {
    redirect("/creditos?erro=pacote");
  }

  if (![11, 14].includes(cpfCnpj.length)) {
    redirect("/creditos?erro=documento");
  }

  if (!isAsaasConfigured()) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREDIT_ORDER_BLOCKED_ASAAS_CONFIG",
        entity: "User",
        entityId: user.id,
        metadata: { packageCode },
      },
    });
    redirect("/creditos?erro=asaas");
  }

  const externalReference = `TUNIX-CREDITS-${randomUUID()}`;
  const order = await prisma.creditOrder.create({
    data: {
      userId: user.id,
      packageCode: selectedPackage.code,
      credits: selectedPackage.credits,
      amount: selectedPackage.amount,
      status: "PENDING",
      externalReference,
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://127.0.0.1:3000";
  let invoiceUrl: string | null = null;

  try {
    const customerId = await ensureAsaasCustomerWithDocument(user, cpfCnpj);
    const payment = await createAsaasCreditPayment({
      amount: selectedPackage.amount,
      credits: selectedPackage.credits,
      customerId,
      externalReference,
      returnUrl: `${appUrl}/creditos?sucesso=checkout`,
    });

    await prisma.creditOrder.update({
      where: { id: order.id },
      data: {
        providerPaymentId: payment.id,
        providerInvoiceUrl: payment.invoiceUrl,
        status: "WAITING_PAYMENT",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREDIT_ORDER_CREATED",
        entity: "CreditOrder",
        entityId: order.id,
        metadata: {
          packageCode: selectedPackage.code,
          credits: selectedPackage.credits,
          amount: selectedPackage.amount,
          providerPaymentId: payment.id,
        },
      },
    });

    invoiceUrl = payment.invoiceUrl;
  } catch (error) {
    await prisma.creditOrder.update({
      where: { id: order.id },
      data: {
        status: "PROVIDER_ERROR",
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREDIT_ORDER_PROVIDER_ERROR",
        entity: "CreditOrder",
        entityId: order.id,
        metadata: {
          message: error instanceof Error ? error.message : "Erro desconhecido no Asaas.",
        },
      },
    });
    const message = error instanceof Error ? error.message : "Erro desconhecido no Asaas.";
    redirect(`/creditos?erro=checkout&motivo=${encodeURIComponent(message)}`);
  }

  if (invoiceUrl) {
    redirect(invoiceUrl);
  }

  redirect("/creditos?erro=checkout");
}

export async function adminSaveCreditPackage(formData: FormData) {
  const user = await requireAdmin();
  const packageId = formString(formData, "packageId");
  const code = formString(formData, "code").toLowerCase();
  const name = formString(formData, "name");
  const description = formString(formData, "description");
  const credits = Number(formData.get("credits"));
  const amount = Number(formData.get("amount"));
  const sortOrder = Number(formData.get("sortOrder"));
  const isActive = formData.get("isActive") === "on";

  if (!code || !name || !description || !Number.isFinite(credits) || credits <= 0 || !Number.isFinite(amount) || amount <= 0) {
    redirect("/admin/creditos?erro=pacote");
  }

  const data = {
    code,
    name,
    description,
    credits: Math.round(credits),
    amount: Number(amount.toFixed(2)),
    sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
    isActive,
  };
  const packageItem = packageId
    ? await prisma.creditPackage.update({
        where: { id: packageId },
        data,
      })
    : await prisma.creditPackage.create({
        data,
      });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: packageId ? "CREDIT_PACKAGE_UPDATED" : "CREDIT_PACKAGE_CREATED",
      entity: "CreditPackage",
      entityId: packageItem.id,
      metadata: data,
    },
  });

  revalidatePath("/creditos");
  revalidatePath("/admin/creditos");
  redirect("/admin/creditos?sucesso=pacote");
}

export async function adminSaveCreditActionCost(formData: FormData) {
  const user = await requireAdmin();
  const costId = formString(formData, "costId");
  const code = formString(formData, "code");
  const label = formString(formData, "label");
  const description = formString(formData, "description");
  const credits = Number(formData.get("credits"));
  const isActive = formData.get("isActive") === "on";

  if (!code || !label || !Number.isFinite(credits) || credits < 0) {
    redirect("/admin/creditos?erro=acao");
  }

  const data = {
    code,
    label,
    description: description || null,
    credits: Math.round(credits),
    isActive,
  };
  const cost = costId
    ? await prisma.creditActionCost.update({
        where: { id: costId },
        data,
      })
    : await prisma.creditActionCost.create({
        data,
      });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: costId ? "CREDIT_ACTION_COST_UPDATED" : "CREDIT_ACTION_COST_CREATED",
      entity: "CreditActionCost",
      entityId: cost.id,
      metadata: data,
    },
  });

  revalidatePath("/creditos");
  revalidatePath("/admin/creditos");
  redirect("/admin/creditos?sucesso=acao");
}

export async function createComposition(formData: FormData) {
  const composer = await requireUser();
  const title = formString(formData, "title");
  const authors = formString(formData, "authors");
  const genre = formString(formData, "genre");
  const theme = formString(formData, "theme");
  const mood = formString(formData, "mood");
  const voiceType = formString(formData, "voice");
  const language = formString(formData, "language") || "Portugues";
  const lyrics = formString(formData, "lyrics");
  const lyricsVisibility = formString(formData, "lyricsVisibility") || "INTERESTED";
  const audioVisibility = formString(formData, "audioVisibility") || "INTERESTED";
  const accessNote = formString(formData, "accessNote");
  const bpmValue = Number(formData.get("bpm"));
  const audioFile = formData.get("audio");
  const shouldPublish = formData.get("publish") === "on";
  const authorsDeclaration = formData.get("authorship") === "on";
  const authorshipRole = formString(formData, "authorshipRole");
  const aiUsage = formString(formData, "aiUsage") || "NONE";
  const aiDisclosure = formString(formData, "aiDisclosure");
  const rightsNotes = formString(formData, "rightsNotes");
  const acceptedOwnership = formData.get("ownershipDeclaration") === "on";
  const acceptedNoPlagiarism = formData.get("noPlagiarismDeclaration") === "on";
  const acceptedAiDisclosure = formData.get("aiDeclaration") === "on";

  if (!title || !genre || !authorshipRole) {
    redirect("/composicoes/nova?erro=dados");
  }

  if (!authorsDeclaration || !acceptedOwnership || !acceptedNoPlagiarism || !acceptedAiDisclosure) {
    redirect("/composicoes/nova?erro=declaracao");
  }

  if (aiUsage === "GENERATED") {
    redirect("/composicoes/nova?erro=ia");
  }

  let composition;

  try {
    composition = await prisma.$transaction(async (tx) => {
      const createdComposition = await tx.composition.create({
        data: {
          composerId: composer.id,
          title,
          lyrics: lyrics || null,
          genre,
          theme: theme || null,
          mood: mood || null,
          bpm: Number.isFinite(bpmValue) ? bpmValue : null,
          language,
          voiceType: voiceType || null,
          status: aiUsage === "PARTIAL" ? "REVIEW" : shouldPublish ? "AVAILABLE" : "DRAFT",
          isPublished: shouldPublish && aiUsage !== "PARTIAL",
          authorsDeclaration,
          lyricsVisibility,
          audioVisibility,
          accessNote: accessNote || null,
          publishedAt: shouldPublish && aiUsage !== "PARTIAL" ? new Date() : null,
          versions: {
            create: {
              title,
              lyrics: lyrics || null,
              metadata: {
                authors,
                genre,
                theme,
                mood,
                bpm: Number.isFinite(bpmValue) ? bpmValue : null,
                voiceType,
                language,
                lyricsVisibility,
                audioVisibility,
              },
            },
          },
        },
      });

      const cost = await getCompositionCreationCost(tx);
      const chargedCredits = cost?.credits ?? 0;
      const balanceAfter = await debitCredits({
        userId: composer.id,
        amount: chargedCredits,
        type: cost?.code ?? "COMPOSITION_CREATED",
        reason: cost?.label ?? "Cadastrar composição",
        entity: "Composition",
        entityId: createdComposition.id,
        db: tx,
      });

      if (balanceAfter === null) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      await tx.compositionDeclaration.create({
        data: {
          compositionId: createdComposition.id,
          userId: composer.id,
          declarationType: "AUTHORSHIP_AND_AI",
          version: LEGAL_VERSIONS.compositionAuthorshipDeclaration,
          authorshipRole,
          aiUsage,
          aiDisclosure: aiDisclosure || null,
          rightsNotes: rightsNotes || null,
          assertions: {
            accepted: COMPOSITION_AUTHORSHIP_ASSERTIONS,
            title,
            authors,
            shouldPublish,
            acceptedAt: new Date().toISOString(),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: composer.id,
          action: "COMPOSITION_CREATED",
          entity: "Composition",
          entityId: createdComposition.id,
          metadata: { title, genre, shouldPublish, authorshipRole, aiUsage, chargedCredits },
        },
      });

      return createdComposition;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      redirect("/composicoes/nova?erro=creditos");
    }

    throw error;
  }

  if (audioFile instanceof File && audioFile.size > 0) {
    const storedAudio = await saveAudioGuide(audioFile, composition.id);

    if (storedAudio) {
      await prisma.audioAsset.create({
        data: {
          compositionId: composition.id,
          storageKey: storedAudio.storageKey,
          fileName: storedAudio.fileName,
          mimeType: storedAudio.mimeType,
          sizeBytes: storedAudio.sizeBytes,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: composer.id,
          action: "AUDIO_GUIDE_UPLOADED",
          entity: "Composition",
          entityId: composition.id,
          metadata: {
            fileName: storedAudio.fileName,
            mimeType: storedAudio.mimeType,
            sizeBytes: storedAudio.sizeBytes,
          },
        },
      });
    }
  }

  redirect("/composicoes");
}

export async function toggleFavorite(formData: FormData) {
  const user = await requireUser();
  const compositionId = formString(formData, "compositionId");
  const returnTo = formString(formData, "returnTo") || "/catalogo";

  if (!compositionId) {
    redirect(`${returnTo}?erro=favorito`);
  }

  const composition = await prisma.composition.findUnique({
    where: { id: compositionId },
    select: { composerId: true },
  });

  if (!composition || composition.composerId === user.id) {
    redirect(`${returnTo}?erro=favorito`);
  }

  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_compositionId: {
        userId: user.id,
        compositionId,
      },
    },
  });

  if (existingFavorite) {
    await prisma.favorite.delete({ where: { id: existingFavorite.id } });
  } else {
    await prisma.favorite.create({
      data: {
        userId: user.id,
        compositionId,
      },
    });
  }

  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${compositionId}`);
  revalidatePath("/painel");
  redirect(returnTo);
}

export async function expressInterest(formData: FormData) {
  const user = await requireUser();
  const compositionId = formString(formData, "compositionId");
  const purpose = formString(formData, "purpose") || "CONTACT_AUTHOR";
  const message = formString(formData, "message");
  const returnTo = formString(formData, "returnTo") || "/catalogo";

  if (!compositionId) {
    redirect(`${returnTo}?erro=interesse`);
  }

  const composition = await prisma.composition.findUnique({
    where: { id: compositionId },
    select: { composerId: true },
  });

  if (!composition || composition.composerId === user.id) {
    redirect(`${returnTo}?erro=interesse`);
  }

  const existingInterest = await prisma.interest.findUnique({
    where: {
      userId_compositionId: {
        userId: user.id,
        compositionId,
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.interest.upsert({
      where: {
        userId_compositionId: {
          userId: user.id,
          compositionId,
        },
      },
      update: {
        purpose,
        message: message || null,
        status: "SENT",
      },
      create: {
        userId: user.id,
        compositionId,
        purpose,
        message: message || null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: existingInterest ? "INTEREST_UPDATED" : "INTEREST_SENT",
        entity: "Composition",
        entityId: compositionId,
        metadata: { purpose, chargedCredits: 0 },
      },
    });
  });

  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${compositionId}`);
  revalidatePath("/painel");
  revalidatePath("/interesses");
  redirect(`${returnTo}?sucesso=interesse`);
}

export async function createRelease(formData: FormData) {
  const user = await requireUser();
  const title = formString(formData, "title");
  const artistName = formString(formData, "artistName");
  const labelName = formString(formData, "labelName");
  const genre = formString(formData, "genre");
  const language = formString(formData, "language") || "pt-BR";
  const releaseType = formString(formData, "releaseType") || "SINGLE";
  const releaseDateValue = formString(formData, "releaseDate");
  const isrc = formString(formData, "isrc");
  const upc = formString(formData, "upc");
  const notes = formString(formData, "notes");
  const masterFile = formData.get("master");
  const coverFile = formData.get("cover");
  const platforms = formData.getAll("platforms").map(String).filter(Boolean);
  const contributorNames = formData.getAll("contributorName").map(String);
  const contributorRoles = formData.getAll("contributorRole").map(String);
  const contributorShares = formData.getAll("contributorShare").map(String);
  const acceptedRights = formData.get("rightsDeclaration") === "on";
  const acceptedDistribution = formData.get("distributionAgreement") === "on";

  if (!title || !artistName || !genre || !platforms.length) {
    redirect("/lancamentos/novo?erro=dados");
  }

  if (!acceptedRights || !acceptedDistribution) {
    redirect("/lancamentos/novo?erro=declaracao");
  }

  const release = await prisma.$transaction(async (tx) => {
    const createdRelease = await tx.release.create({
      data: {
        ownerId: user.id,
        title,
        artistName,
        labelName: labelName || null,
        genre,
        language,
        releaseType,
        releaseDate: releaseDateValue ? new Date(`${releaseDateValue}T12:00:00`) : null,
        isrc: isrc || null,
        upc: upc || null,
        masterFileName: masterFile instanceof File && masterFile.size > 0 ? masterFile.name : null,
        coverFileName: coverFile instanceof File && coverFile.size > 0 ? coverFile.name : null,
        status: "REVIEW",
        notes: notes || null,
        platforms: {
          create: platforms.map((platform) => ({
            platform,
            status: "PENDING",
          })),
        },
        contributors: {
          create: contributorNames
            .map((name, index) => ({
              name: name.trim(),
              role: contributorRoles[index]?.trim() || "ARTIST",
              royaltyShare: contributorShares[index] ? Number(contributorShares[index]) : null,
            }))
            .filter((contributor) => contributor.name),
        },
      },
    });
    const cost = await getCreditActionCost("RELEASE_SUBMISSION", tx);
    const balanceAfter = await debitCredits({
      userId: user.id,
      amount: cost?.credits ?? 0,
      type: "RELEASE_SUBMISSION",
      reason: cost?.label ?? "Preparar lançamento para revisão",
      entity: "Release",
      entityId: createdRelease.id,
      db: tx,
    });

    if (balanceAfter === null) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "RELEASE_CREATED",
        entity: "Release",
        entityId: createdRelease.id,
        metadata: {
          title,
          artistName,
          platforms,
          chargedCredits: cost?.credits ?? 0,
        },
      },
    });

    await tx.releaseDeclaration.createMany({
      data: [
        {
          releaseId: createdRelease.id,
          userId: user.id,
          declarationType: "RIGHTS_AND_OWNERSHIP",
          version: LEGAL_VERSIONS.releaseRightsDeclaration,
          assertions: {
            accepted: RELEASE_RIGHTS_ASSERTIONS,
            title,
            artistName,
            acceptedAt: new Date().toISOString(),
          },
        },
        {
          releaseId: createdRelease.id,
          userId: user.id,
          declarationType: "DISTRIBUTION_AUTHORIZATION",
          version: LEGAL_VERSIONS.distributionAgreement,
          assertions: {
            authorizedPlatforms: platforms,
            title,
            artistName,
            acceptedAt: new Date().toISOString(),
          },
        },
      ],
    });

    return createdRelease;
  }).catch((error) => {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      redirect("/lancamentos/novo?erro=creditos");
    }

    throw error;
  });

  await notifyUsers({
    recipients: await adminUserIds(),
    type: "RELEASE_SUBMITTED",
    title: "Novo lancamento para revisar",
    body: `${artistName} enviou ${title} para a fila operacional.`,
    href: "/admin/lancamentos",
    entity: "Release",
    entityId: release.id,
  });

  const releaseAssets = (
    await Promise.all([
      upsertReleaseAsset(release.id, masterFile, "MASTER"),
      upsertReleaseAsset(release.id, coverFile, "COVER"),
    ])
  ).filter(isStoredReleaseAsset);

  if (releaseAssets.length) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RELEASE_ASSETS_UPLOADED",
        entity: "Release",
        entityId: release.id,
        metadata: {
          assets: releaseAssets.map((asset) => ({
            type: asset.type,
            fileName: asset.fileName,
            sizeBytes: asset.sizeBytes,
            checksum: asset.checksum,
          })),
        },
      },
    });
  }

  redirect(`/lancamentos/${release.id}`);
}

export async function updateRelease(formData: FormData) {
  const user = await requireUser();
  const releaseId = formString(formData, "releaseId");
  const title = formString(formData, "title");
  const artistName = formString(formData, "artistName");
  const labelName = formString(formData, "labelName");
  const genre = formString(formData, "genre");
  const language = formString(formData, "language") || "pt-BR";
  const releaseType = formString(formData, "releaseType") || "SINGLE";
  const releaseDateValue = formString(formData, "releaseDate");
  const isrc = formString(formData, "isrc");
  const upc = formString(formData, "upc");
  const notes = formString(formData, "notes");
  const masterFile = formData.get("master");
  const coverFile = formData.get("cover");
  const platforms = formData.getAll("platforms").map(String).filter(Boolean);
  const contributorNames = formData.getAll("contributorName").map(String);
  const contributorRoles = formData.getAll("contributorRole").map(String);
  const contributorShares = formData.getAll("contributorShare").map(String);
  const acceptedRights = formData.get("rightsDeclaration") === "on";

  const release = await prisma.release.findFirst({
    where: { id: releaseId, ownerId: user.id },
    include: {
      assets: true,
    },
  });

  if (!release) {
    redirect("/lancamentos");
  }

  if (!["DRAFT", "REVIEW", "REJECTED"].includes(release.status)) {
    redirect(`/lancamentos/${release.id}/editar?erro=status`);
  }

  if (!title || !artistName || !genre || !platforms.length) {
    redirect(`/lancamentos/${release.id}/editar?erro=dados`);
  }

  if (!acceptedRights) {
    redirect(`/lancamentos/${release.id}/editar?erro=declaracao`);
  }

  const uploadedAssets = (
    await Promise.all([
      upsertReleaseAsset(release.id, masterFile, "MASTER"),
      upsertReleaseAsset(release.id, coverFile, "COVER"),
    ])
  ).filter(isStoredReleaseAsset);

  await prisma.$transaction([
    prisma.release.update({
      where: { id: release.id },
      data: {
        title,
        artistName,
        labelName: labelName || null,
        genre,
        language,
        releaseType,
        releaseDate: releaseDateValue ? new Date(`${releaseDateValue}T12:00:00`) : null,
        isrc: isrc || null,
        upc: upc || null,
        masterFileName: masterFile instanceof File && masterFile.size > 0 ? masterFile.name : release.masterFileName,
        coverFileName: coverFile instanceof File && coverFile.size > 0 ? coverFile.name : release.coverFileName,
        status: "REVIEW",
        notes: notes || null,
      },
    }),
    prisma.releasePlatform.deleteMany({
      where: { releaseId: release.id },
    }),
    prisma.releaseContributor.deleteMany({
      where: { releaseId: release.id },
    }),
    prisma.releasePlatform.createMany({
      data: platforms.map((platform) => ({
        releaseId: release.id,
        platform,
        status: "PENDING",
      })),
    }),
    prisma.releaseContributor.createMany({
      data: contributorNames
        .map((name, index) => ({
          releaseId: release.id,
          name: name.trim(),
          role: contributorRoles[index]?.trim() || "ARTIST",
          royaltyShare: contributorShares[index] ? Number(contributorShares[index]) : null,
        }))
        .filter((contributor) => contributor.name),
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RELEASE_CORRECTED_AND_RESUBMITTED",
        entity: "Release",
        entityId: release.id,
        metadata: {
          platforms,
          uploadedAssets: uploadedAssets.map((asset) => ({
            type: asset.type,
            fileName: asset.fileName,
            checksum: asset.checksum,
          })),
        },
      },
    }),
    prisma.releaseDeclaration.upsert({
      where: {
        releaseId_declarationType_version: {
          releaseId: release.id,
          declarationType: "RIGHTS_AND_OWNERSHIP",
          version: LEGAL_VERSIONS.releaseRightsDeclaration,
        },
      },
      update: {
        userId: user.id,
        assertions: {
          accepted: RELEASE_RIGHTS_ASSERTIONS,
          title,
          artistName,
          updatedDuringCorrection: true,
          acceptedAt: new Date().toISOString(),
        },
      },
      create: {
        releaseId: release.id,
        userId: user.id,
        declarationType: "RIGHTS_AND_OWNERSHIP",
        version: LEGAL_VERSIONS.releaseRightsDeclaration,
        assertions: {
          accepted: RELEASE_RIGHTS_ASSERTIONS,
          title,
          artistName,
          updatedDuringCorrection: true,
          acceptedAt: new Date().toISOString(),
        },
      },
    }),
  ]);

  await notifyUsers({
    recipients: await adminUserIds(),
    type: "RELEASE_CORRECTED",
    title: "Pacote corrigido pelo cliente",
    body: `${artistName} reenviou ${title} para revisao operacional.`,
    href: "/admin/lancamentos",
    entity: "Release",
    entityId: release.id,
  });

  revalidatePath("/admin/lancamentos");
  revalidatePath("/notificacoes");
  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${release.id}`);
  revalidatePath(`/lancamentos/${release.id}/editar`);
  redirect(`/lancamentos/${release.id}?sucesso=corrigido`);
}

export async function createReleaseRequest(formData: FormData) {
  const user = await requireUser();
  const releaseId = formString(formData, "releaseId");
  const type = formString(formData, "type");
  const reason = formString(formData, "reason");
  const details = formString(formData, "details");
  const allowedTypes = new Set(["TAKEDOWN", "METADATA_CHANGE", "COVER_CHANGE", "RIGHTS_DISPUTE", "OTHER"]);

  const release = await prisma.release.findFirst({
    where: { id: releaseId, ownerId: user.id },
  });

  if (!release) {
    redirect("/lancamentos");
  }

  if (!allowedTypes.has(type) || reason.length < 10) {
    redirect(`/lancamentos/${release.id}/solicitacoes?erro=dados`);
  }

  const request = await prisma.releaseRequest.create({
    data: {
      releaseId: release.id,
      requestedById: user.id,
      type,
      reason,
      details: details || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "RELEASE_POST_DELIVERY_REQUEST_CREATED",
      entity: "Release",
      entityId: release.id,
      metadata: {
        requestId: request.id,
        type,
      },
    },
  });

  await notifyUsers({
    recipients: await adminUserIds(),
    type: "RELEASE_REQUEST",
    title: "Nova solicitacao pos-lancamento",
    body: `${release.artistName} abriu uma solicitacao: ${type}.`,
    href: "/admin/solicitacoes",
    entity: "Release",
    entityId: release.id,
  });

  revalidatePath(`/lancamentos/${release.id}/solicitacoes`);
  revalidatePath("/admin/solicitacoes");
  redirect(`/lancamentos/${release.id}/solicitacoes?sucesso=solicitacao`);
}

export async function adminUpdateReleaseRequest(formData: FormData) {
  const user = await requireAdmin();
  const requestId = formString(formData, "requestId");
  const status = formString(formData, "status");
  const adminNote = formString(formData, "adminNote");
  const allowedStatuses = new Set(["OPEN", "IN_REVIEW", "WAITING_PARTNER", "RESOLVED", "REJECTED"]);

  if (!allowedStatuses.has(status)) {
    redirect("/admin/solicitacoes?erro=status");
  }

  const request = await prisma.releaseRequest.findUnique({
    where: { id: requestId },
    include: { release: true },
  });

  if (!request) {
    redirect("/admin/solicitacoes?erro=solicitacao");
  }

  await prisma.releaseRequest.update({
    where: { id: request.id },
    data: {
      status,
      adminNote: adminNote || null,
      resolvedAt: ["RESOLVED", "REJECTED"].includes(status) ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ADMIN_RELEASE_REQUEST_UPDATED",
      entity: "Release",
      entityId: request.releaseId,
      metadata: {
        requestId: request.id,
        status,
        adminNote: adminNote || null,
      },
    },
  });

  await notifyUsers({
    recipients: [request.requestedById],
    type: "RELEASE_REQUEST_UPDATED",
    title: "Solicitacao atualizada",
    body: `${request.release.title}: status da solicitacao atualizado para ${status}.`,
    href: `/lancamentos/${request.releaseId}/solicitacoes`,
    entity: "Release",
    entityId: request.releaseId,
  });

  revalidatePath("/admin/solicitacoes");
  revalidatePath(`/lancamentos/${request.releaseId}/solicitacoes`);
  redirect("/admin/solicitacoes?sucesso=atualizada");
}

export async function createSupportTicket(formData: FormData) {
  const user = await requireUser();
  const subject = formString(formData, "subject");
  const category = formString(formData, "category");
  const priority = formString(formData, "priority") || "NORMAL";
  const message = formString(formData, "message");

  if (!subject || message.length < 10) {
    redirect("/suporte?erro=dados");
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject,
      category: category || "GENERAL",
      priority,
      message,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "SUPPORT_TICKET_CREATED",
      entity: "SupportTicket",
      entityId: ticket.id,
      metadata: { category, priority },
    },
  });

  await notifyUsers({
    recipients: await adminUserIds(),
    type: "SUPPORT_TICKET",
    title: "Novo chamado de suporte",
    body: `${user.name} abriu chamado: ${subject}.`,
    href: "/admin/solicitacoes",
    entity: "SupportTicket",
    entityId: ticket.id,
  });

  revalidatePath("/suporte");
  redirect("/suporte?sucesso=chamado");
}

export async function submitReleaseForReview(formData: FormData) {
  const user = await requireUser();
  const releaseId = formString(formData, "releaseId");
  const release = await prisma.release.findFirst({
    where: { id: releaseId, ownerId: user.id },
    include: {
      platforms: true,
      contributors: true,
      assets: true,
    },
  });

  if (!release) {
    redirect("/lancamentos");
  }

  const validation = validateReleasePackage(release);

  if (!validation.canSubmit) {
    redirect(`/lancamentos/${release.id}?erro=incompleto`);
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { status: "REVIEW" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "RELEASE_SUBMITTED_FOR_OPERATIONS_REVIEW",
      entity: "Release",
      entityId: release.id,
      metadata: {
        platformCount: release.platforms.length,
        warnings: validation.warnings.map((issue) => issue.code),
      },
    },
  });

  await notifyUsers({
    recipients: await adminUserIds(),
    type: "RELEASE_SUBMITTED",
    title: "Lancamento enviado para revisao",
    body: `${release.artistName} enviou ${release.title} para revisao operacional.`,
    href: "/admin/lancamentos",
    entity: "Release",
    entityId: release.id,
  });

  revalidatePath("/lancamentos");
  revalidatePath("/notificacoes");
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/lancamentos/${release.id}?sucesso=revisao`);
}

export async function adminApproveRelease(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const note = formString(formData, "note");
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      assets: true,
      platforms: true,
      contributors: true,
    },
  });

  if (!release) {
    redirect("/admin/lancamentos");
  }

  const validation = validateReleasePackage(release);

  if (!validation.canSubmit) {
    redirect(`/admin/lancamentos?erro=incompleto&releaseId=${release.id}`);
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { status: "READY" },
  });

  await prisma.releasePlatform.updateMany({
    where: { releaseId: release.id },
    data: { status: "QUEUED" },
  });

  await prisma.releaseReview.create({
    data: {
      releaseId: release.id,
      reviewerId: user.id,
      decision: "APPROVED",
      note: note || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "RELEASE_APPROVED_BY_OPERATIONS",
      entity: "Release",
      entityId: release.id,
      metadata: {
        note: note || null,
        platformCount: release.platforms.length,
        warnings: validation.warnings.map((issue) => issue.code),
      },
    },
  });

  await notifyUsers({
    recipients: [release.ownerId],
    type: "RELEASE_APPROVED",
    title: "Lancamento aprovado para envio",
    body: `${release.title} foi aprovado pela operacao e entrou na fila de distribuicao.`,
    href: `/lancamentos/${release.id}`,
    entity: "Release",
    entityId: release.id,
  });

  revalidatePath("/admin/lancamentos");
  revalidatePath("/notificacoes");
  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${release.id}`);
  redirect("/admin/lancamentos?sucesso=aprovado");
}

export async function adminRejectRelease(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const note = formString(formData, "note");
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      platforms: true,
    },
  });

  if (!release) {
    redirect("/admin/lancamentos");
  }

  if (!note) {
    redirect(`/admin/lancamentos?erro=nota&releaseId=${release.id}`);
  }

  await prisma.release.update({
    where: { id: release.id },
    data: {
      notes: [release.notes, `Operacao: ${note}`].filter(Boolean).join("\n\n"),
      status: "REJECTED",
    },
  });

  await prisma.releasePlatform.updateMany({
    where: { releaseId: release.id },
    data: { status: "ERROR" },
  });

  await prisma.releaseReview.create({
    data: {
      releaseId: release.id,
      reviewerId: user.id,
      decision: "REJECTED",
      note,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "RELEASE_REJECTED_BY_OPERATIONS",
      entity: "Release",
      entityId: release.id,
      metadata: { note },
    },
  });

  await notifyUsers({
    recipients: [release.ownerId],
    type: "RELEASE_REJECTED",
    title: "Pendencia no lancamento",
    body: `${release.title} precisa de correcao: ${note}`,
    href: `/lancamentos/${release.id}/editar`,
    entity: "Release",
    entityId: release.id,
  });

  revalidatePath("/admin/lancamentos");
  revalidatePath("/notificacoes");
  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${release.id}`);
  redirect("/admin/lancamentos?sucesso=reprovado");
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireUser();
  const notificationId = formString(formData, "notificationId");
  const returnTo = formString(formData, "returnTo") || "/notificacoes";

  if (notificationId) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  revalidatePath("/notificacoes");
  revalidatePath("/painel");
  redirect(returnTo);
}

export async function markAllNotificationsRead() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/notificacoes");
  revalidatePath("/painel");
  redirect("/notificacoes");
}

export async function submitReleaseToPartner(formData: FormData) {
  const user = await requireUser();
  const releaseId = formString(formData, "releaseId");
  const release = await prisma.release.findFirst({
    where: { id: releaseId, ownerId: user.id },
    include: {
      assets: true,
      platforms: true,
      contributors: true,
    },
  });

  if (!release) {
    redirect("/lancamentos");
  }

  if (!["READY", "SUBMITTED"].includes(release.status)) {
    redirect(`/lancamentos/${release.id}?erro=envio`);
  }

  const validation = validateReleasePackage(release);

  if (!validation.canSubmit) {
    redirect(`/lancamentos/${release.id}?erro=incompleto`);
  }

  const payload = buildDistributionPayload(release);
  const providerConfig = await getDistributionProviderConfig();
  const result = await submitToDistributionPartner(payload);

  await prisma.distributionDelivery.create({
    data: {
      releaseId: release.id,
      provider: providerConfig.provider,
      endpoint: providerConfig.endpoint || null,
      status: result.status,
      requestPayload: payload,
      responseStatus: result.responseStatus ?? null,
      responseBody: result.responseBody ?? null,
      errorMessage: result.errorMessage ?? null,
    },
  });

  if (!result.ok) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RELEASE_DELIVERY_BLOCKED",
        entity: "Release",
        entityId: release.id,
        metadata: {
          provider: providerConfig.provider,
          status: result.status,
          errorMessage: result.errorMessage,
        },
      },
    });

    revalidatePath("/lancamentos");
    revalidatePath(`/lancamentos/${release.id}`);
    redirect(`/lancamentos/${release.id}?erro=provider`);
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { status: "SUBMITTED" },
  });

  await prisma.releasePlatform.updateMany({
    where: { releaseId: release.id },
    data: { status: "SENT" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "RELEASE_SUBMITTED_TO_DISTRIBUTION_PARTNER",
      entity: "Release",
      entityId: release.id,
      metadata: {
        provider: providerConfig.provider,
        platforms: release.platforms.map((item) => item.platform),
      },
    },
  });

  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/lancamentos/${release.id}?sucesso=envio`);
}

export async function adminSubmitReleaseToPartner(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const confirm = formData.get("confirmSend") === "on";
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      assets: true,
      platforms: true,
      contributors: true,
    },
  });

  if (!release) {
    redirect("/admin/lancamentos");
  }

  if (!confirm) {
    redirect(`/admin/lancamentos/${release.id}/envio?erro=confirmacao`);
  }

  if (release.status !== "READY") {
    redirect(`/admin/lancamentos/${release.id}/envio?erro=status`);
  }

  const validation = validateReleasePackage(release);

  if (!validation.canSubmit) {
    redirect(`/admin/lancamentos/${release.id}/envio?erro=incompleto`);
  }

  const payload = buildDistributionPayload(release);
  const providerConfig = await getDistributionProviderConfig();
  const result = await submitToDistributionPartner(payload);

  await prisma.distributionDelivery.create({
    data: {
      releaseId: release.id,
      provider: providerConfig.provider,
      endpoint: providerConfig.endpoint || null,
      status: result.status,
      requestPayload: payload,
      responseStatus: result.responseStatus ?? null,
      responseBody: result.responseBody ?? null,
      errorMessage: result.errorMessage ?? null,
    },
  });

  if (!result.ok) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ADMIN_RELEASE_DELIVERY_BLOCKED",
        entity: "Release",
        entityId: release.id,
        metadata: {
          provider: providerConfig.provider,
          status: result.status,
          errorMessage: result.errorMessage,
        },
      },
    });

    revalidatePath("/admin/lancamentos");
    revalidatePath(`/admin/lancamentos/${release.id}/envio`);
    revalidatePath(`/lancamentos/${release.id}`);
    redirect(`/admin/lancamentos/${release.id}/envio?erro=provider`);
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { status: "SUBMITTED" },
  });

  await prisma.releasePlatform.updateMany({
    where: { releaseId: release.id },
    data: { status: "SENT" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ADMIN_RELEASE_SUBMITTED_TO_DISTRIBUTION_PARTNER",
      entity: "Release",
      entityId: release.id,
      metadata: {
        provider: providerConfig.provider,
        platforms: release.platforms.map((item) => item.platform),
      },
    },
  });

  await notifyUsers({
    recipients: [release.ownerId],
    type: "RELEASE_SUBMITTED",
    title: "Lancamento enviado para distribuidora",
    body: `${release.title} foi enviado pela operacao para o provider configurado.`,
    href: `/lancamentos/${release.id}`,
    entity: "Release",
    entityId: release.id,
  });

  revalidatePath("/admin/lancamentos");
  revalidatePath("/notificacoes");
  revalidatePath(`/admin/lancamentos/${release.id}/envio`);
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/admin/lancamentos/${release.id}/envio?sucesso=envio`);
}

export async function adminRetryReleaseDelivery(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const reason = formString(formData, "reason");
  const confirm = formData.get("confirmRetry") === "on";
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      assets: true,
      platforms: true,
      contributors: true,
    },
  });

  if (!release) {
    redirect("/admin/lancamentos");
  }

  if (!confirm || !reason) {
    redirect(`/admin/lancamentos/${release.id}/status?erro=confirmacao`);
  }

  if (!["READY", "SUBMITTED"].includes(release.status)) {
    redirect(`/admin/lancamentos/${release.id}/status?erro=status`);
  }

  const validation = validateReleasePackage(release);

  if (!validation.canSubmit) {
    redirect(`/admin/lancamentos/${release.id}/status?erro=incompleto`);
  }

  const payload = buildDistributionPayload(release);
  const providerConfig = await getDistributionProviderConfig();
  const result = await submitToDistributionPartner(payload);

  await prisma.distributionDelivery.create({
    data: {
      releaseId: release.id,
      provider: providerConfig.provider,
      endpoint: providerConfig.endpoint || null,
      status: result.status,
      requestPayload: {
        retryReason: reason,
        payload,
      },
      responseStatus: result.responseStatus ?? null,
      responseBody: result.responseBody ?? null,
      errorMessage: result.errorMessage ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: result.ok ? "ADMIN_RELEASE_DELIVERY_RETRIED" : "ADMIN_RELEASE_RETRY_BLOCKED",
      entity: "Release",
      entityId: release.id,
      metadata: {
        provider: providerConfig.provider,
        status: result.status,
        reason,
        errorMessage: result.errorMessage ?? null,
      },
    },
  });

  if (!result.ok) {
    revalidatePath(`/admin/lancamentos/${release.id}/status`);
    revalidatePath(`/lancamentos/${release.id}`);
    redirect(`/admin/lancamentos/${release.id}/status?erro=provider`);
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { status: "SUBMITTED" },
  });

  await prisma.releasePlatform.updateMany({
    where: {
      releaseId: release.id,
      status: { in: ["QUEUED", "ERROR"] },
    },
    data: { status: "SENT" },
  });

  await notifyUsers({
    recipients: [release.ownerId],
    type: "RELEASE_SUBMITTED",
    title: "Reenvio disparado para distribuidora",
    body: `${release.title} foi reenviado pela operacao. Motivo: ${reason}`,
    href: `/lancamentos/${release.id}`,
    entity: "Release",
    entityId: release.id,
  });

  revalidatePath("/admin/lancamentos");
  revalidatePath("/notificacoes");
  revalidatePath(`/admin/lancamentos/${release.id}/status`);
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/admin/lancamentos/${release.id}/status?sucesso=reenvio`);
}

export async function adminUpdatePlatformStatus(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const platform = formString(formData, "platform");
  const status = formString(formData, "status");
  const note = formString(formData, "note");
  const allowedStatuses = new Set(["QUEUED", "SENT", "DELIVERED", "ERROR"]);

  if (!platform || !allowedStatuses.has(status)) {
    redirect(`/admin/lancamentos/${releaseId}/status?erro=dados`);
  }

  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: { platforms: true },
  });

  if (!release) {
    redirect("/admin/lancamentos");
  }

  await prisma.releasePlatform.updateMany({
    where: {
      releaseId: release.id,
      platform,
    },
    data: { status },
  });

  const updatedPlatforms = await prisma.releasePlatform.findMany({
    where: { releaseId: release.id },
  });
  const allDelivered = updatedPlatforms.length > 0 && updatedPlatforms.every((item) => item.status === "DELIVERED");
  const hasError = updatedPlatforms.some((item) => item.status === "ERROR");

  if (allDelivered) {
    await prisma.release.update({
      where: { id: release.id },
      data: { status: "DELIVERED" },
    });
  } else if (hasError && release.status === "DELIVERED") {
    await prisma.release.update({
      where: { id: release.id },
      data: { status: "SUBMITTED" },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ADMIN_PLATFORM_STATUS_UPDATED",
      entity: "Release",
      entityId: release.id,
      metadata: {
        platform,
        status,
        note: note || null,
      },
    },
  });

  revalidatePath("/admin/lancamentos");
  revalidatePath(`/admin/lancamentos/${release.id}/status`);
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/admin/lancamentos/${release.id}/status?sucesso=status`);
}

export async function adminCreateRoyaltyStatement(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const platform = formString(formData, "platform");
  const periodStartValue = formString(formData, "periodStart");
  const periodEndValue = formString(formData, "periodEnd");
  const currency = formString(formData, "currency") || "BRL";
  const grossAmount = Number(formData.get("grossAmount"));
  const netAmount = Number(formData.get("netAmount"));
  const source = formString(formData, "source");
  const notes = formString(formData, "notes");
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: { contributors: true },
  });

  if (!release) {
    redirect("/admin/lancamentos");
  }

  if (!platform || !periodStartValue || !periodEndValue || !Number.isFinite(grossAmount) || !Number.isFinite(netAmount)) {
    redirect(`/admin/lancamentos/${releaseId}/financeiro?erro=dados`);
  }

  const splitTotal = release.contributors.reduce(
    (total, contributor) => total + (contributor.royaltyShare ?? 0),
    0,
  );

  if (!release.contributors.length || Math.abs(splitTotal - 100) > 0.01) {
    redirect(`/admin/lancamentos/${releaseId}/financeiro?erro=splits`);
  }

  const periodStart = new Date(`${periodStartValue}T12:00:00`);
  const periodEnd = new Date(`${periodEndValue}T12:00:00`);
  const normalizedCurrency = currency.toUpperCase();
  const existingStatement = await prisma.royaltyStatement.findFirst({
    where: {
      releaseId: release.id,
      platform,
      periodStart,
      periodEnd,
      currency: normalizedCurrency,
    },
  });

  if (existingStatement) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ROYALTY_RECONCILIATION_DUPLICATE_BLOCKED",
        entity: "Release",
        entityId: release.id,
        metadata: {
          existingStatementId: existingStatement.id,
          platform,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          currency: normalizedCurrency,
        },
      },
    });
    redirect(`/admin/lancamentos/${releaseId}/financeiro?erro=duplicado`);
  }

  const statement = await prisma.royaltyStatement.create({
    data: {
      releaseId: release.id,
      platform,
      periodStart,
      periodEnd,
      currency: normalizedCurrency,
      grossAmount,
      netAmount,
      source: source || null,
      notes: notes || null,
      participants: {
        create: release.contributors.map((contributor) => {
          const share = contributor.royaltyShare ?? 0;

          return {
            name: contributor.name,
            role: contributor.role,
            share,
            amount: Number(((netAmount * share) / 100).toFixed(2)),
          };
        }),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "ROYALTY_STATEMENT_CREATED",
      entity: "Release",
      entityId: release.id,
      metadata: {
        statementId: statement.id,
        platform,
        grossAmount,
        netAmount,
        currency: normalizedCurrency,
      },
    },
  });

  revalidatePath(`/admin/lancamentos/${release.id}/financeiro`);
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/admin/lancamentos/${release.id}/financeiro?sucesso=criado`);
}

export async function adminImportRoyaltyCsv(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const defaultCurrency = formString(formData, "defaultCurrency") || "BRL";
  const defaultSource = formString(formData, "defaultSource");
  const csvFile = formData.get("csvFile");
  const release = await prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      contributors: true,
      platforms: true,
    },
  });

  if (!release) {
    redirect("/admin/lancamentos");
  }

  if (!(csvFile instanceof File) || csvFile.size <= 0 || csvFile.size > 2 * 1024 * 1024) {
    redirect(`/admin/lancamentos/${releaseId}/financeiro?erro=arquivo`);
  }

  const splitTotal = release.contributors.reduce(
    (total, contributor) => total + (contributor.royaltyShare ?? 0),
    0,
  );

  if (!release.contributors.length || Math.abs(splitTotal - 100) > 0.01) {
    redirect(`/admin/lancamentos/${releaseId}/financeiro?erro=splits`);
  }

  const parsed = parseRoyaltyImportCsv(await csvFile.text(), {
    defaultCurrency,
    defaultSource,
  });
  const platforms = new Set(release.platforms.map((platform) => platform.platform.toUpperCase()));
  const platformErrors = platforms.size
    ? parsed.rows
        .filter((row) => !platforms.has(row.platform))
        .map((row) => `Plataforma nao selecionada no lancamento: ${row.platform}.`)
    : [];
  const importKeys = new Set<string>();
  const importDuplicateErrors: string[] = [];

  for (const row of parsed.rows) {
    const key = [
      row.platform,
      row.periodStart.toISOString(),
      row.periodEnd.toISOString(),
      row.currency,
    ].join("|");

    if (importKeys.has(key)) {
      importDuplicateErrors.push(`Linha duplicada no CSV: ${row.platform} ${row.currency}.`);
    }

    importKeys.add(key);
  }

  const existingStatements = parsed.rows.length
    ? await prisma.royaltyStatement.findMany({
        where: {
          releaseId: release.id,
          OR: parsed.rows.map((row) => ({
            platform: row.platform,
            periodStart: row.periodStart,
            periodEnd: row.periodEnd,
            currency: row.currency,
          })),
        },
        select: {
          id: true,
          platform: true,
          periodStart: true,
          periodEnd: true,
          currency: true,
        },
      })
    : [];
  const existingErrors = existingStatements.map(
    (statement) => `Fechamento ja existe: ${statement.platform} ${statement.currency} ${statement.periodStart.toISOString()} ${statement.periodEnd.toISOString()}.`,
  );
  const errors = [...parsed.errors, ...platformErrors, ...importDuplicateErrors, ...existingErrors];

  if (errors.length) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: existingErrors.length || importDuplicateErrors.length
          ? "ROYALTY_RECONCILIATION_IMPORT_BLOCKED"
          : "ROYALTY_CSV_IMPORT_REJECTED",
        entity: "Release",
        entityId: release.id,
        metadata: {
          fileName: csvFile.name,
          errors: errors.slice(0, 12),
          existingStatementIds: existingStatements.map((statement) => statement.id),
        },
      },
    });
    redirect(`/admin/lancamentos/${release.id}/financeiro?erro=${existingErrors.length || importDuplicateErrors.length ? "duplicado" : "csv"}`);
  }

  const statements = await prisma.$transaction(async (tx) => {
    const created = [];

    for (const row of parsed.rows) {
      const statement = await tx.royaltyStatement.create({
        data: {
          releaseId: release.id,
          platform: row.platform,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          currency: row.currency,
          grossAmount: row.grossAmount,
          netAmount: row.netAmount,
          source: row.source,
          notes: row.notes,
          participants: {
            create: release.contributors.map((contributor) => {
              const share = contributor.royaltyShare ?? 0;

              return {
                name: contributor.name,
                role: contributor.role,
                share,
                amount: Number(((row.netAmount * share) / 100).toFixed(2)),
              };
            }),
          },
        },
      });

      created.push(statement);
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "ROYALTY_CSV_IMPORTED",
        entity: "Release",
        entityId: release.id,
        metadata: {
          fileName: csvFile.name,
          rows: parsed.rows.length,
          statementIds: created.map((statement) => statement.id),
        },
      },
    });

    return created;
  });

  revalidatePath(`/admin/lancamentos/${release.id}/financeiro`);
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/admin/lancamentos/${release.id}/financeiro?sucesso=importado&linhas=${statements.length}`);
}

export async function adminMarkRoyaltyStatementPaid(formData: FormData) {
  const user = await requireAdmin();
  const statementId = formString(formData, "statementId");
  const statement = await prisma.royaltyStatement.findUnique({
    where: { id: statementId },
  });

  if (!statement) {
    redirect("/admin/lancamentos");
  }

  await prisma.$transaction([
    prisma.royaltyStatement.update({
      where: { id: statement.id },
      data: { status: "PAID" },
    }),
    prisma.royaltyParticipant.updateMany({
      where: { statementId: statement.id },
      data: { status: "PAID" },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ROYALTY_STATEMENT_PAID",
        entity: "Release",
        entityId: statement.releaseId,
        metadata: {
          statementId: statement.id,
          netAmount: statement.netAmount,
          currency: statement.currency,
        },
      },
    }),
  ]);

  revalidatePath(`/admin/lancamentos/${statement.releaseId}/financeiro`);
  redirect(`/admin/lancamentos/${statement.releaseId}/financeiro?sucesso=pago`);
}

export async function markReleaseDelivered(formData: FormData) {
  const user = await requireAdmin();
  const releaseId = formString(formData, "releaseId");
  const release = await prisma.release.findFirst({
    where: { id: releaseId },
  });

  if (!release) {
    redirect("/lancamentos");
  }

  if (release.status !== "SUBMITTED") {
    redirect(`/lancamentos/${release.id}?erro=entrega`);
  }

  await prisma.release.update({
    where: { id: release.id },
    data: { status: "DELIVERED" },
  });

  await prisma.releasePlatform.updateMany({
    where: { releaseId: release.id },
    data: { status: "DELIVERED" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "RELEASE_DELIVERED_TO_PLATFORMS",
      entity: "Release",
      entityId: release.id,
      metadata: { mode: "MANUAL_OPERATIONS_OVERRIDE" },
    },
  });

  revalidatePath("/lancamentos");
  revalidatePath(`/lancamentos/${release.id}`);
  redirect(`/lancamentos/${release.id}?sucesso=entrega`);
}

export async function saveDistributionIntegration(formData: FormData) {
  const user = await requireAdmin();
  const integrationId = formString(formData, "integrationId");
  const provider = formString(formData, "provider");
  const environment = formString(formData, "environment") || "SANDBOX";
  const endpoint = formString(formData, "endpoint");
  const testEndpoint = formString(formData, "testEndpoint");
  const apiKey = formString(formData, "apiKey");
  const webhookSecret = formString(formData, "webhookSecret");
  const isActive = formData.get("isActive") === "on";

  if (!provider || !endpoint || (!integrationId && (!apiKey || !webhookSecret))) {
    redirect("/admin/integracoes?erro=dados");
  }

  if (isActive) {
    await prisma.distributionIntegration.updateMany({
      data: { isActive: false },
    });
  }

  const data = {
    provider,
    environment,
    endpoint,
    testEndpoint: testEndpoint || null,
    isActive,
    ...(apiKey ? { apiKeyEncrypted: encryptSecret(apiKey) } : {}),
    ...(webhookSecret ? { webhookSecretEncrypted: encryptSecret(webhookSecret) } : {}),
  };

  const integration = integrationId
    ? await prisma.distributionIntegration.update({
        where: { id: integrationId },
        data,
      })
    : await prisma.distributionIntegration.create({
        data: {
          ...data,
          apiKeyEncrypted: encryptSecret(apiKey),
          webhookSecretEncrypted: encryptSecret(webhookSecret),
        },
      });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DISTRIBUTION_INTEGRATION_SAVED",
      entity: "DistributionIntegration",
      entityId: integration.id,
      metadata: { provider, environment, isActive },
    },
  });

  revalidatePath("/admin/integracoes");
  redirect("/admin/integracoes?sucesso=salvo");
}

export async function testDistributionIntegration(formData: FormData) {
  const user = await requireAdmin();
  const integrationId = formString(formData, "integrationId");
  const integration = await prisma.distributionIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    redirect("/admin/integracoes?erro=integracao");
  }

  const endpoint = integration.testEndpoint || integration.endpoint;
  const startedAt = Date.now();
  let status = "ERROR";
  let responseStatus: number | null = null;
  let message = "";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${decryptSecret(integration.apiKeyEncrypted)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "healthcheck",
        provider: integration.provider,
        environment: integration.environment,
        timestamp: new Date().toISOString(),
      }),
    });
    responseStatus = response.status;
    const body = await response.text();
    status = response.ok ? "OK" : "ERROR";
    message = body.slice(0, 500) || `HTTP ${response.status}`;
  } catch (error) {
    status = "ERROR";
    message = error instanceof Error ? error.message : "Erro desconhecido no teste.";
  }

  await prisma.distributionIntegration.update({
    where: { id: integration.id },
    data: {
      status: status === "OK" ? "ACTIVE" : "ERROR",
      lastTestStatus: responseStatus,
      lastTestMessage: message,
      lastTestedAt: new Date(),
    },
  });

  await prisma.distributionIntegrationLog.create({
    data: {
      integrationId: integration.id,
      action: "TEST_CONNECTION",
      status,
      responseStatus,
      message: `${message} (${Date.now() - startedAt}ms)`,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "DISTRIBUTION_INTEGRATION_TESTED",
      entity: "DistributionIntegration",
      entityId: integration.id,
      metadata: { status, responseStatus },
    },
  });

  revalidatePath("/admin/integracoes");
  redirect(`/admin/integracoes?sucesso=teste&status=${status}`);
}
