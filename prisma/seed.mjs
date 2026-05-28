import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const songs = [
  {
    title: "Volta Pra Minha Estrada",
    genre: "Sertanejo",
    mood: "Romantica",
    voiceType: "Dueto",
    bpm: 84,
    theme: "Reencontro",
    status: "AVAILABLE",
    lyrics: "Verso guia da composicao para demonstracao comercial.",
    lyricsVisibility: "INTERESTED",
    audioVisibility: "INTERESTED",
    accessNote: "Letra completa e guia liberados para artistas com interesse registrado.",
    interests: [
      {
        artistEmail: "duo@tunix.local",
        purpose: "RECORD",
        status: "SENT",
        message: "Queremos avaliar esta musica para single.",
      },
    ],
  },
  {
    title: "Promessa de Domingo",
    genre: "Gospel",
    mood: "Esperanca",
    voiceType: "Voz feminina",
    bpm: 72,
    theme: "Fe",
    status: "IN_NEGOTIATION",
    lyrics: "Letra guia para validar busca, detalhes e negociacao.",
    lyricsVisibility: "PUBLIC",
    audioVisibility: "INTERESTED",
    accessNote: "Letra aberta para avaliacao; audio guia apenas apos interesse.",
    interests: [
      {
        artistEmail: "sarah@tunix.local",
        purpose: "RESERVE",
        status: "VIEWED",
        message: "Gostaria de reservar para o proximo projeto.",
      },
    ],
  },
  {
    title: "Na Batida do Interior",
    genre: "Piseiro",
    mood: "Festa",
    voiceType: "Voz masculina",
    bpm: 156,
    theme: "Festa",
    status: "AVAILABLE",
    lyrics: "Refrao forte, energia popular e apelo para show.",
    lyricsVisibility: "PUBLIC",
    audioVisibility: "PUBLIC",
    accessNote: "Previa liberada para acelerar avaliacao de produtores.",
    interests: [
      {
        artistEmail: "nortehits@tunix.local",
        purpose: "EVALUATE",
        status: "ACCEPTED",
        message: "Vamos testar no repertorio do artista.",
      },
    ],
  },
  {
    title: "Carta Que Eu Nao Mandei",
    genre: "Arrocha",
    mood: "Sofrencia",
    voiceType: "Voz masculina",
    bpm: 92,
    theme: "Saudade",
    status: "RESERVED",
    lyrics: "Balada sentimental para demonstrar obra reservada.",
    lyricsVisibility: "PRIVATE",
    audioVisibility: "PRIVATE",
    accessNote: "Obra reservada; acesso bloqueado para novos interessados.",
    interests: [],
  },
];

const artists = [
  { name: "Duo Horizonte", email: "duo@tunix.local", role: "ARTIST" },
  { name: "Sarah Lima", email: "sarah@tunix.local", role: "ARTIST" },
  { name: "Produtora Norte Hits", email: "nortehits@tunix.local", role: "PRODUCER" },
];

const creditPackages = [
  {
    code: "starter",
    name: "Inicial",
    credits: 20,
    amount: 49.9,
    description: "Para validar repertório, enviar interesses e iniciar os primeiros lançamentos.",
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
];

const creditActionCosts = [
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
];

async function upsertUser({ name, email, role, password = "demo123456" }) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hashPassword(password) },
    create: {
      name,
      email,
      password: hashPassword(password),
      profile: {
        create: {
          displayName: name,
          city: "Goiania",
          state: "GO",
        },
      },
    },
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role } },
    update: {},
    create: { userId: user.id, role },
  });

  return user;
}

async function ensureDemoCredits(user, amount) {
  const existingGrant = await prisma.creditLedgerEntry.findFirst({
    where: {
      userId: user.id,
      type: "DEMO_GRANT",
    },
  });

  if (existingGrant) {
    return;
  }

  await prisma.creditLedgerEntry.create({
    data: {
      userId: user.id,
      type: "DEMO_GRANT",
      amount,
      balanceAfter: amount,
      reason: "Creditos de demonstracao para ambiente local",
    },
  });
}

async function refundLegacyInterestCredits() {
  const debits = await prisma.creditLedgerEntry.findMany({
    where: {
      type: "INTEREST_SENT",
      amount: { lt: 0 },
    },
  });

  for (const debit of debits) {
    const existingRefund = await prisma.creditLedgerEntry.findFirst({
      where: {
        userId: debit.userId,
        type: "INTEREST_SENT_REFUND",
        entity: debit.entity,
        entityId: debit.entityId,
      },
    });

    if (existingRefund) {
      continue;
    }

    const aggregate = await prisma.creditLedgerEntry.aggregate({
      where: { userId: debit.userId },
      _sum: { amount: true },
    });
    const currentBalance = aggregate._sum.amount ?? 0;
    const refundAmount = Math.abs(debit.amount);

    await prisma.creditLedgerEntry.create({
      data: {
        userId: debit.userId,
        type: "INTEREST_SENT_REFUND",
        amount: refundAmount,
        balanceAfter: currentBalance + refundAmount,
        reason: "Estorno de interesse: demonstrar interesse agora é gratuito",
        entity: debit.entity,
        entityId: debit.entityId,
      },
    });
  }
}

async function renameLegacyUserEmail(oldEmail, newEmail, name) {
  const legacyUser = await prisma.user.findUnique({ where: { email: oldEmail } });

  if (!legacyUser) {
    return;
  }

  const targetUser = await prisma.user.findUnique({ where: { email: newEmail } });
  const safeEmail = targetUser ? oldEmail.replace("@musicaponte.local", ".legacy@tunix.local") : newEmail;

  await prisma.user.update({
    where: { id: legacyUser.id },
    data: {
      name: name ?? legacyUser.name,
      email: safeEmail,
    },
  });
}

async function ensureCreditCatalog() {
  for (const item of creditPackages) {
    await prisma.creditPackage.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  for (const item of creditActionCosts) {
    await prisma.creditActionCost.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  await prisma.creditActionCost.updateMany({
    where: { code: "INTEREST_SENT" },
    data: {
      isActive: false,
      credits: 0,
      description: "Interesse de artista em composição não consome créditos.",
    },
  });

  await prisma.creditActionCost.updateMany({
    where: { code: { startsWith: "COMPOSITION_CATEGORY_" } },
    data: {
      isActive: false,
      description: "Regra substituída por COMPOSITION_CREATED, valor único para qualquer composição.",
    },
  });
}

async function main() {
  await ensureCreditCatalog();

  await renameLegacyUserEmail("admin@musicaponte.local", "admin@tunix.com.br", "Admin Tunix");
  await renameLegacyUserEmail("admin@tunix.local", "admin@tunix.com.br", "Admin Tunix");
  await renameLegacyUserEmail("luan@musicaponte.local", "luan@tunix.local");
  await renameLegacyUserEmail("duo@musicaponte.local", "duo@tunix.local");

  const composer = await upsertUser({
    name: "Luan Martins",
    email: "luan@tunix.local",
    role: "COMPOSER",
    password: "demo123456",
  });

  await prisma.userRole.deleteMany({
    where: {
      userId: composer.id,
      role: "ADMIN",
    },
  });

  await upsertUser({
    name: "Admin Tunix",
    email: "admin@tunix.com.br",
    role: "ADMIN",
    password: "tunix080782",
  });

  await ensureDemoCredits(composer, 100);

  const artistMap = new Map();
  for (const artist of artists) {
    const user = await upsertUser(artist);
    await ensureDemoCredits(user, 100);
    artistMap.set(artist.email, user);
  }

  for (const song of songs) {
    const composition = await prisma.composition.upsert({
      where: {
        composerId_title: {
          composerId: composer.id,
          title: song.title,
        },
      },
      update: {
        genre: song.genre,
        mood: song.mood,
        voiceType: song.voiceType,
        bpm: song.bpm,
        theme: song.theme,
        status: song.status,
        lyrics: song.lyrics,
        lyricsVisibility: song.lyricsVisibility,
        audioVisibility: song.audioVisibility,
        accessNote: song.accessNote,
        isPublished: true,
        authorsDeclaration: true,
        publishedAt: new Date(),
      },
      create: {
        composerId: composer.id,
        title: song.title,
        genre: song.genre,
        mood: song.mood,
        voiceType: song.voiceType,
        bpm: song.bpm,
        theme: song.theme,
        status: song.status,
        lyrics: song.lyrics,
        lyricsVisibility: song.lyricsVisibility,
        audioVisibility: song.audioVisibility,
        accessNote: song.accessNote,
        isPublished: true,
        authorsDeclaration: true,
        publishedAt: new Date(),
        versions: {
          create: {
            title: song.title,
            lyrics: song.lyrics,
            metadata: {
              genre: song.genre,
              mood: song.mood,
              bpm: song.bpm,
              voiceType: song.voiceType,
              lyricsVisibility: song.lyricsVisibility,
              audioVisibility: song.audioVisibility,
            },
          },
        },
      },
    });

    for (const interest of song.interests) {
      const interestedUser = artistMap.get(interest.artistEmail);
      await prisma.interest.upsert({
        where: {
          userId_compositionId: {
            userId: interestedUser.id,
            compositionId: composition.id,
          },
        },
        update: {
          purpose: interest.purpose,
          status: interest.status,
          message: interest.message,
        },
        create: {
          userId: interestedUser.id,
          compositionId: composition.id,
          purpose: interest.purpose,
          status: interest.status,
          message: interest.message,
        },
      });
    }
  }

  await refundLegacyInterestCredits();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
