import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dbPath = join(dirname(fileURLToPath(import.meta.url)), "dev.db");
const db = new DatabaseSync(dbPath);

function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT,
    asaasCustomerId TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS UserRole (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT UserRole_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS UserRole_userId_role_key ON UserRole(userId, role);

  CREATE TABLE IF NOT EXISTS UserSession (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    sessionToken TEXT NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT UserSession_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Profile (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL UNIQUE,
    displayName TEXT NOT NULL,
    city TEXT,
    state TEXT,
    bio TEXT,
    website TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Profile_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Composition (
    id TEXT PRIMARY KEY NOT NULL,
    composerId TEXT NOT NULL,
    title TEXT NOT NULL,
    lyrics TEXT,
    genre TEXT NOT NULL,
    theme TEXT,
    mood TEXT,
    bpm INTEGER,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    voiceType TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    isPublished BOOLEAN NOT NULL DEFAULT false,
    authorsDeclaration BOOLEAN NOT NULL DEFAULT false,
    publishedAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Composition_composerId_fkey FOREIGN KEY (composerId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS Composition_composerId_title_key ON Composition(composerId, title);

  CREATE TABLE IF NOT EXISTS CompositionVersion (
    id TEXT PRIMARY KEY NOT NULL,
    compositionId TEXT NOT NULL,
    title TEXT NOT NULL,
    lyrics TEXT,
    metadata JSONB NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CompositionVersion_compositionId_fkey FOREIGN KEY (compositionId) REFERENCES Composition (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS AudioAsset (
    id TEXT PRIMARY KEY NOT NULL,
    compositionId TEXT NOT NULL UNIQUE,
    storageKey TEXT NOT NULL,
    fileName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    sizeBytes INTEGER NOT NULL,
    durationSec INTEGER,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT AudioAsset_compositionId_fkey FOREIGN KEY (compositionId) REFERENCES Composition (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CompositionDeclaration (
    id TEXT PRIMARY KEY NOT NULL,
    compositionId TEXT NOT NULL,
    userId TEXT NOT NULL,
    declarationType TEXT NOT NULL,
    version TEXT NOT NULL,
    authorshipRole TEXT NOT NULL,
    aiUsage TEXT NOT NULL,
    aiDisclosure TEXT,
    rightsNotes TEXT,
    assertions JSONB NOT NULL,
    acceptedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CompositionDeclaration_compositionId_fkey FOREIGN KEY (compositionId) REFERENCES Composition (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT CompositionDeclaration_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Release (
    id TEXT PRIMARY KEY NOT NULL,
    ownerId TEXT NOT NULL,
    title TEXT NOT NULL,
    artistName TEXT NOT NULL,
    labelName TEXT,
    genre TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'pt-BR',
    releaseType TEXT NOT NULL DEFAULT 'SINGLE',
    releaseDate DATETIME,
    isrc TEXT,
    upc TEXT,
    masterFileName TEXT,
    coverFileName TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Release_ownerId_fkey FOREIGN KEY (ownerId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS UserAgreement (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    documentType TEXT NOT NULL,
    documentVersion TEXT NOT NULL,
    acceptedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    context TEXT,
    CONSTRAINT UserAgreement_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS UserAgreement_userId_documentType_documentVersion_key
  ON UserAgreement(userId, documentType, documentVersion);

  CREATE TABLE IF NOT EXISTS ReleaseDeclaration (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    userId TEXT NOT NULL,
    declarationType TEXT NOT NULL,
    version TEXT NOT NULL,
    assertions JSONB NOT NULL,
    acceptedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReleaseDeclaration_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ReleaseDeclaration_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ReleaseDeclaration_releaseId_declarationType_version_key
  ON ReleaseDeclaration(releaseId, declarationType, version);

  CREATE TABLE IF NOT EXISTS ReleaseRequest (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    requestedById TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    reason TEXT NOT NULL,
    details TEXT,
    adminNote TEXT,
    resolvedAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReleaseRequest_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ReleaseRequest_requestedById_fkey FOREIGN KEY (requestedById) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS SupportTicket (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'OPEN',
    message TEXT NOT NULL,
    adminNote TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT SupportTicket_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CreditOrder (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    packageCode TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'PENDING',
    provider TEXT NOT NULL DEFAULT 'ASAAS',
    providerPaymentId TEXT,
    providerInvoiceUrl TEXT,
    externalReference TEXT NOT NULL UNIQUE,
    paidAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CreditOrder_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CreditLedgerEntry (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    orderId TEXT,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balanceAfter INTEGER NOT NULL,
    reason TEXT NOT NULL,
    entity TEXT,
    entityId TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CreditLedgerEntry_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS CreditPackage (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT true,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS CreditActionCost (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    credits INTEGER NOT NULL,
    description TEXT,
    isActive BOOLEAN NOT NULL DEFAULT true,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS PaymentWebhookEvent (
    id TEXT PRIMARY KEY NOT NULL,
    provider TEXT NOT NULL,
    eventId TEXT NOT NULL UNIQUE,
    eventType TEXT NOT NULL,
    payload JSONB NOT NULL,
    processedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ReleasePlatform (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReleasePlatform_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ReleasePlatform_releaseId_platform_key ON ReleasePlatform(releaseId, platform);

  CREATE TABLE IF NOT EXISTS ReleaseAsset (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    type TEXT NOT NULL,
    storageKey TEXT NOT NULL,
    fileName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    sizeBytes INTEGER NOT NULL,
    checksum TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReleaseAsset_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ReleaseAsset_releaseId_type_key ON ReleaseAsset(releaseId, type);

  CREATE TABLE IF NOT EXISTS ReleaseContributor (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    royaltyShare REAL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReleaseContributor_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ReleaseReview (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    reviewerId TEXT NOT NULL,
    decision TEXT NOT NULL,
    note TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ReleaseReview_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT ReleaseReview_reviewerId_fkey FOREIGN KEY (reviewerId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Notification (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    href TEXT,
    entity TEXT,
    entityId TEXT,
    readAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Notification_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS RoyaltyStatement (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    platform TEXT NOT NULL,
    periodStart DATETIME NOT NULL,
    periodEnd DATETIME NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    grossAmount REAL NOT NULL,
    netAmount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    source TEXT,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT RoyaltyStatement_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS RoyaltyParticipant (
    id TEXT PRIMARY KEY NOT NULL,
    statementId TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    share REAL NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT RoyaltyParticipant_statementId_fkey FOREIGN KEY (statementId) REFERENCES RoyaltyStatement (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS RoyaltyStatement_releaseId_platform_periodStart_periodEnd_currency_key
  ON RoyaltyStatement (releaseId, platform, periodStart, periodEnd, currency);

  CREATE TABLE IF NOT EXISTS DistributionDelivery (
    id TEXT PRIMARY KEY NOT NULL,
    releaseId TEXT NOT NULL,
    provider TEXT NOT NULL,
    endpoint TEXT,
    status TEXT NOT NULL DEFAULT 'CREATED',
    requestPayload JSONB NOT NULL,
    responseStatus INTEGER,
    responseBody TEXT,
    errorMessage TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT DistributionDelivery_releaseId_fkey FOREIGN KEY (releaseId) REFERENCES Release (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS DistributionIntegration (
    id TEXT PRIMARY KEY NOT NULL,
    provider TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'SANDBOX',
    endpoint TEXT NOT NULL,
    testEndpoint TEXT,
    apiKeyEncrypted TEXT NOT NULL,
    webhookSecretEncrypted TEXT NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'NOT_TESTED',
    lastTestStatus INTEGER,
    lastTestMessage TEXT,
    lastTestedAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS DistributionIntegrationLog (
    id TEXT PRIMARY KEY NOT NULL,
    integrationId TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    responseStatus INTEGER,
    message TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT DistributionIntegrationLog_integrationId_fkey FOREIGN KEY (integrationId) REFERENCES DistributionIntegration (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Tag (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS CompositionTag (
    compositionId TEXT NOT NULL,
    tagId TEXT NOT NULL,
    CONSTRAINT CompositionTag_compositionId_fkey FOREIGN KEY (compositionId) REFERENCES Composition (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT CompositionTag_tagId_fkey FOREIGN KEY (tagId) REFERENCES Tag (id) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (compositionId, tagId)
  );

  CREATE TABLE IF NOT EXISTS Favorite (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    compositionId TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Favorite_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT Favorite_compositionId_fkey FOREIGN KEY (compositionId) REFERENCES Composition (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS Favorite_userId_compositionId_key ON Favorite(userId, compositionId);

  CREATE TABLE IF NOT EXISTS Interest (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    compositionId TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT',
    message TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT Interest_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT Interest_compositionId_fkey FOREIGN KEY (compositionId) REFERENCES Composition (id) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS Interest_userId_compositionId_key ON Interest(userId, compositionId);

  CREATE TABLE IF NOT EXISTS AuditLog (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entityId TEXT NOT NULL,
    metadata JSONB,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT AuditLog_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE SET NULL ON UPDATE CASCADE
  );
`);

addColumnIfMissing("Composition", "lyricsVisibility", "TEXT NOT NULL DEFAULT 'INTERESTED'");
addColumnIfMissing("Composition", "audioVisibility", "TEXT NOT NULL DEFAULT 'INTERESTED'");
addColumnIfMissing("Composition", "accessNote", "TEXT");
addColumnIfMissing("User", "asaasCustomerId", "TEXT");

db.close();
console.log(`Created development database at ${dbPath}`);
