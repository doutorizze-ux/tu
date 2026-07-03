import React from "react";
import Link from "next/link";
import { AppShell, PageHeader } from "../components";
import { requireUser } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { CopyHashButton, CopyLinkButton } from "./CopyButtons";
import { getCompositionCreationCost } from "../lib/credits";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const user = await requireUser();

  // Fetch composition registrations for this user
  const compositions = await prisma.composition.findMany({
    where: { composerId: user.id },
    include: {
      audio: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch composition registration credits cost configured by admin
  const costInfo = await getCompositionCreationCost();
  const chargedCredits = costInfo?.credits ?? 1;

  // Count registered assets
  const registeredCount = compositions.filter((c) => c.audio).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Propriedade Intelectual"
        title="Registro de Obras & Anterioridade"
        description="Proteja suas composições gerando certidões digitais de autoria com carimbo criptográfico SHA-256."
      />

      {/* Premium Explanation Banner */}
      <section className="registration-hero">
        <div className="hero-content">
          <span className="hero-badge">Selo Criptográfico Tunix</span>
          <h1>Como funciona a proteção criptográfica?</h1>
          <p>
            Toda vez que você cadastra uma obra com áudio guia, a plataforma calcula uma 
            <strong> Assinatura Criptográfica SHA-256</strong> exclusiva do seu arquivo. Esse hash é imutável e 
            serve como prova incontestável de anterioridade de autoria sob a Lei de Direitos Autorais (Lei 9.610/98).
          </p>
          <div className="hero-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">🛡️</span>
              <div>
                <strong>Prova Jurídica</strong>
                <span>Presunção de autoria com carimbo de data oficial.</span>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔗</span>
              <div>
                <strong>Validador Público</strong>
                <span>Qualquer pessoa pode validar a guia em tunix.com.br/validar.</span>
              </div>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🪙</span>
              <div>
                <strong>Custo Acessível</strong>
                <span>Consome apenas {chargedCredits} crédito{chargedCredits !== 1 ? "s" : ""} por cadastro com certidão inclusa.</span>
              </div>
            </div>
          </div>
          <Link href="/composicoes/nova" className="primaryButton hero-cta">
            Registrar Nova Obra ({chargedCredits} Crédito{chargedCredits !== 1 ? "s" : ""})
          </Link>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Minhas Obras Protegidas</span>
            <span className="stat-value">{registeredCount}</span>
          </div>
          <div className="stat-card highlight-stat">
            <span className="stat-label">Valor por Registro</span>
            <span className="stat-value">{chargedCredits} <span style={{ fontSize: "14px", fontWeight: "normal" }}>{chargedCredits === 1 ? "Crédito" : "Créditos"}</span></span>
          </div>
        </div>
      </section>

      {/* Compositions Table Panel */}
      <section className="tablePanel" style={{ marginTop: "30px", marginBottom: "40px" }}>
        <div className="tableTitleGroup" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--ink)" }}>Catálogo de Certidões Digitais</h2>
          <p style={{ fontSize: "0.85rem", color: "#6e675d", margin: "5px 0 0 0" }}>
            Acesse as certidões e compartilhe os hashes para validar a anterioridade da obra.
          </p>
        </div>

        <div className="tableHeader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ flex: 1.5 }}>Título / Obra</span>
          <span style={{ flex: 1 }}>Gênero</span>
          <span style={{ flex: 1.2 }}>Data de Registro</span>
          <span style={{ flex: 2 }}>Código Hash SHA-256</span>
          <span style={{ flex: 1.5, textAlign: "right", paddingRight: "1.2rem" }}>Ações de Prova</span>
        </div>

        {compositions.length ? (
          compositions.map((comp) => {
            const hasAudio = !!comp.audio;
            const hash = comp.audio?.checksum;

            return (
              <article className="compositionRow" key={comp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1.5 }}>
                  <strong style={{ display: "block" }}>{comp.title}</strong>
                  {hasAudio ? (
                    <span className="audio-status-badge success">Guia anexada</span>
                  ) : (
                    <span className="audio-status-badge warning">Sem guia de áudio</span>
                  )}
                </div>

                <span style={{ flex: 1 }}>{comp.genre}</span>

                <span style={{ flex: 1.2, fontSize: "0.85rem", color: "#524d45" }}>
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                    comp.createdAt
                  )}
                </span>

                <div style={{ flex: 2 }}>
                  {hash ? (
                    <div className="hash-copy-wrapper">
                      <code>{hash.slice(0, 12)}...{hash.slice(-8)}</code>
                      <CopyHashButton hash={hash} />
                    </div>
                  ) : (
                    <span style={{ color: "#a19789", fontSize: "0.85rem" }}>Não certificado</span>
                  )}
                </div>

                <div style={{ flex: 1.5, display: "flex", gap: "8px", justifyContent: "flex-end", paddingRight: "1rem" }}>
                  {hasAudio ? (
                    <>
                      <Link
                        href={`/composicoes/${comp.id}/certificado`}
                        className="secondaryButton action-btn-small"
                        title="Ver Certidão Oficial de Anterioridade"
                      >
                        📜 Certidão
                      </Link>
                      <CopyLinkButton hash={hash!} />
                    </>
                  ) : (
                    <Link
                      href="/composicoes"
                      className="secondaryButton action-btn-small warning-border"
                      title="Para certificar, a composição precisa ter um áudio guia anexado."
                    >
                      Adicionar Áudio
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <p className="mutedText" style={{ padding: "3rem", textAlign: "center" }}>
            Nenhuma composição cadastrada na sua conta. Clique no botão acima para registrar!
          </p>
        )}
      </section>

      <style>{`
        .registration-hero {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
          background: #fffdf8;
          border: 1px solid #e2dcd0;
          border-radius: 8px;
          padding: 40px;
          margin-top: 20px;
          box-shadow: 0 4px 12px rgba(21, 19, 15, 0.02);
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-badge {
          background: #e6f7f2;
          color: #0f6b5f;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .hero-content h1 {
          font-size: 24px;
          font-weight: 800;
          color: #15130f;
          margin: 0 0 12px 0;
        }

        .hero-content p {
          font-size: 14px;
          line-height: 1.6;
          color: #524d45;
          margin: 0 0 25px 0;
        }

        .hero-benefits {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
          margin-bottom: 30px;
        }

        .benefit-item {
          display: flex;
          gap: 12px;
        }

        .benefit-icon {
          font-size: 20px;
          margin-top: 2px;
        }

        .benefit-item strong {
          display: block;
          font-size: 13px;
          color: #15130f;
          margin-bottom: 2px;
        }

        .benefit-item span {
          display: block;
          font-size: 11px;
          color: #6e675d;
          line-height: 1.4;
        }

        .hero-cta {
          padding: 12px 24px;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
        }

        .hero-stats {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stat-card {
          flex: 1;
          background: #fbfaf5;
          border: 1px solid #e2dcd0;
          border-radius: 6px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .highlight-stat {
          background: linear-gradient(135deg, #fffdf8 0%, #fbfaf5 100%);
          border-left: 4px solid #0f6b5f;
        }

        .stat-label {
          font-size: 12px;
          color: #8a8174;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          color: #0f6b5f;
        }

        /* Table Badges */
        .audio-status-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
        }

        .audio-status-badge.success {
          background: #e6f7f2;
          color: #0f6b5f;
        }

        .audio-status-badge.warning {
          background: #fdf5e6;
          color: #b8860b;
        }

        .hash-copy-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hash-copy-wrapper code {
          font-family: monospace;
          background: #f4efe4;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          color: #15130f;
        }

        .copy-btn-small {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 12px;
          padding: 2px;
        }

        .action-btn-small {
          padding: 6px 12px !important;
          font-size: 12px !important;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .warning-border {
          border-color: #d4af37 !important;
          color: #b8860b !important;
        }

        .warning-border:hover {
          background-color: #fdfaf2 !important;
        }

        @media (max-width: 992px) {
          .registration-hero {
            grid-template-columns: 1fr;
          }
          .hero-benefits {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AppShell>
  );
}
