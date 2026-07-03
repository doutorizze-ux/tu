import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/auth";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const composition = await prisma.composition.findUnique({
    where: { id },
    include: {
      composer: true,
      audio: true,
      declarations: true,
    },
  });

  if (!composition) {
    notFound();
  }

  const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
  const isAdmin = roles.some((r) => r.role === "ADMIN");

  if (composition.composerId !== user.id && !isAdmin) {
    return (
      <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
        <h2>Acesso não autorizado</h2>
        <p>Apenas o compositor titular ou administradores podem visualizar este certificado.</p>
        <Link href="/composicoes" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          Voltar para Composições
        </Link>
      </div>
    );
  }

  let formattedDate = "";
  try {
    formattedDate = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(composition.createdAt);
  } catch (e) {
    formattedDate = composition.createdAt.toLocaleString("pt-BR");
  }

  const declaration = composition.declarations.find(
    (d) => d.declarationType === "AUTHORSHIP_AND_AI"
  );

  let signatureDate = "";
  if (declaration) {
    try {
      signatureDate = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(declaration.acceptedAt));
    } catch (e) {
      signatureDate = new Date(declaration.acceptedAt).toLocaleDateString("pt-BR");
    }
  }

  return (
    <div className="cert-page-container">
      {/* Print Controls - Hidden during print */}
      <div className="cert-actions no-print">
        <Link href="/composicoes" className="cert-back-btn">
          ← Voltar
        </Link>
        <button onClick={() => window.print()} className="cert-print-btn">
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>

      {/* Actual Certificate Document */}
      <div className="certificate-sheet">
        <div className="cert-border-outer">
          <div className="cert-border-inner">
            {/* Header */}
            <header className="cert-header">
              <div className="cert-logo-container">
                <span className="cert-logo-text">TUNIX</span>
              </div>
              <h1 className="cert-main-title">CERTIDÃO DIGITAL DE ANTERIORIDADE</h1>
              <p className="cert-subtitle">REGISTRO DE OBRA MUSICAL E PROVA DE AUTORIA</p>
              <div className="cert-divider-gold"></div>
            </header>

            {/* Certificate Core Text */}
            <main className="cert-body">
              <p className="cert-intro">
                Certificamos para os devidos fins de direito e prova de anterioridade autoral que a obra musical descrita abaixo foi protocolada e registrada eletronicamente na plataforma de direitos fonográficos <strong>TUNIX</strong>, nos termos da Lei de Direitos Autorais (Lei nº 9.610/98).
              </p>

              {/* Composition details */}
              <section className="cert-section">
                <h2>1. Identificação da Obra</h2>
                <table className="cert-table">
                  <tbody>
                    <tr>
                      <th>Título da Obra</th>
                      <td className="cert-highlight">{composition.title}</td>
                    </tr>
                    {composition.genre && (
                      <tr>
                        <th>Gênero Principal</th>
                        <td>{composition.genre}</td>
                      </tr>
                    )}
                    {composition.bpm && (
                      <tr>
                        <th>Características</th>
                        <td>{composition.bpm} BPM</td>
                      </tr>
                    )}
                    <tr>
                      <th>Protocolo de Registro</th>
                      <td className="cert-code">{composition.id}</td>
                    </tr>
                    <tr>
                      <th>Data e Hora do Registro</th>
                      <td>{formattedDate} (Horário de Brasília)</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Composer details */}
              <section className="cert-section">
                <h2>2. Identificação do Autor Registrante</h2>
                <table className="cert-table">
                  <tbody>
                    <tr>
                      <th>Nome do Autor</th>
                      <td>{composition.composer.name}</td>
                    </tr>
                    <tr>
                      <th>E-mail de Cadastro</th>
                      <td>{composition.composer.email}</td>
                    </tr>
                    <tr>
                      <th>Status da Conta</th>
                      <td>Titular Verificado Tunix</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Cryptographic Proof */}
              <section className="cert-section">
                <h2>3. Provas de Integridade do Arquivo (Áudio Guia)</h2>
                {composition.audio ? (
                  <table className="cert-table">
                    <tbody>
                      <tr>
                        <th>Nome do Arquivo</th>
                        <td>{composition.audio.fileName}</td>
                      </tr>
                      <tr>
                        <th>Tamanho e Formato</th>
                        <td>
                          {(composition.audio.sizeBytes / (1024 * 1024)).toFixed(2)} MB (
                          {composition.audio.mimeType})
                        </td>
                      </tr>
                      <tr>
                        <th>Código Hash SHA-256 (Identidade do Arquivo)</th>
                        <td className="cert-hash-code">{composition.audio.checksum || "Não calculado"}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="cert-warning">Nenhum arquivo de áudio guia foi anexado a este registro.</p>
                )}
              </section>

              {/* Legal Declaration */}
              {declaration && (
                <section className="cert-section">
                  <h2>4. Declaração Jurídica Firmada</h2>
                  <blockquote className="cert-quote">
                    "Declaro, sob as penas da lei, ser o criador e detentor exclusivo dos direitos autorais desta composição, assumindo total responsabilidade civil e criminal por sua autoria perante terceiros."
                    <span className="cert-signature-date">
                      Assinado digitalmente por {composition.composer.name} em{" "}
                      {signatureDate}
                    </span>
                  </blockquote>
                </section>
              )}
            </main>

            {/* Footer */}
            <footer className="cert-footer">
              <div className="cert-seal">
                <span className="seal-gold-star">★</span>
                <span className="seal-text">TUNIX SECURE</span>
              </div>
              <div className="cert-verification-notice">
                <p>
                  Para verificar a autenticidade deste certificado ou do arquivo de áudio original, acesse:
                </p>
                <strong className="cert-link">https://tunix.com.br/validar</strong>
                <p className="cert-disclaimer">
                  Esta certidão constitui prova técnica de integridade de dados e anterioridade temporal de posse de arquivo digital, servindo como meio de convicção em contestações de autoria.
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <style>{`
        .cert-page-container {
          min-height: 100vh;
          background-color: #f7f5f0;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: sans-serif;
          color: #1e1b18;
        }

        .cert-actions {
          width: 100%;
          max-width: 800px;
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .cert-back-btn {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          background: #ffffff;
          border: 1px solid #e0dbd3;
          border-radius: 6px;
          color: #524d45;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .cert-back-btn:hover {
          background: #fdfdfc;
          border-color: #c9c3b8;
          color: #15130f;
        }

        .cert-print-btn {
          display: inline-flex;
          align-items: center;
          padding: 8px 20px;
          background: #0f6b5f;
          border: none;
          border-radius: 6px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(15, 107, 95, 0.15);
        }

        .cert-print-btn:hover {
          background: #0d5c52;
          box-shadow: 0 4px 8px rgba(15, 107, 95, 0.25);
        }

        /* Certificate Styling */
        .certificate-sheet {
          background: #fffdf8;
          width: 100%;
          max-width: 800px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          box-sizing: border-box;
        }

        .cert-border-outer {
          border: 4px double #d4af37;
          padding: 10px;
        }

        .cert-border-inner {
          border: 1px solid rgba(212, 175, 55, 0.4);
          padding: 30px 40px;
          display: flex;
          flex-direction: column;
        }

        .cert-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .cert-logo-text {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 4px;
          color: #0f6b5f;
          display: inline-block;
          margin-bottom: 10px;
        }

        .cert-main-title {
          font-size: 26px;
          font-weight: 700;
          color: #15130f;
          margin: 10px 0 5px 0;
          letter-spacing: 1px;
        }

        .cert-subtitle {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 2px;
          color: #d4af37;
          text-transform: uppercase;
          margin: 0;
        }

        .cert-divider-gold {
          height: 2px;
          background: linear-gradient(to right, transparent, #d4af37, transparent);
          margin-top: 15px;
          width: 100%;
        }

        .cert-intro {
          font-size: 14px;
          line-height: 1.6;
          color: #524d45;
          text-align: justify;
          margin-bottom: 25px;
        }

        .cert-section {
          margin-bottom: 25px;
        }

        .cert-section h2 {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #0f6b5f;
          border-bottom: 1px solid rgba(15, 107, 95, 0.15);
          padding-bottom: 6px;
          margin-bottom: 12px;
        }

        .cert-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .cert-table th {
          width: 30%;
          text-align: left;
          font-weight: 600;
          color: #6e675d;
          padding: 8px 10px 8px 0;
          vertical-align: top;
          border-bottom: 1px solid #f4efe4;
        }

        .cert-table td {
          padding: 8px 0 8px 10px;
          color: #15130f;
          border-bottom: 1px solid #f4efe4;
        }

        .cert-highlight {
          font-weight: 700;
          color: #0f6b5f;
        }

        .cert-code {
          font-family: monospace;
          background: #f7f5f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }

        .cert-hash-code {
          font-family: monospace;
          background: #f7f5f0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          word-break: break-all;
        }

        .cert-quote {
          font-style: italic;
          color: #524d45;
          border-left: 3px solid #d4af37;
          padding-left: 15px;
          margin: 10px 0;
          font-size: 13px;
          line-height: 1.5;
        }

        .cert-signature-date {
          display: block;
          font-style: normal;
          font-size: 11px;
          font-weight: 600;
          color: #a19789;
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .cert-footer {
          margin-top: 35px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .cert-seal {
          border: 2px solid #d4af37;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          margin-bottom: 15px;
          background: #fffdf8;
          box-shadow: 0 4px 10px rgba(212, 175, 55, 0.1);
        }

        .seal-gold-star {
          color: #d4af37;
          font-size: 20px;
          line-height: 1;
        }

        .seal-text {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #0f6b5f;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .cert-verification-notice {
          max-width: 500px;
        }

        .cert-verification-notice p {
          font-size: 12px;
          color: #6e675d;
          margin: 4px 0;
        }

        .cert-link {
          font-size: 14px;
          color: #0f6b5f;
          display: inline-block;
          margin: 5px 0;
          letter-spacing: 0.5px;
        }

        .cert-disclaimer {
          font-size: 10px;
          color: #a19789 !important;
          line-height: 1.4;
          margin-top: 15px !important;
          text-align: justify;
        }

        /* Print Media Queries */
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }

          .cert-page-container {
            background: none !important;
            padding: 0 !important;
            min-height: auto !important;
          }

          .no-print {
            display: none !important;
          }

          .certificate-sheet {
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            background: #ffffff !important;
          }

          .cert-border-inner {
            padding: 20px 30px !important;
          }
        }
      `}</style>
    </div>
  );
}
