"use client";

import { useState } from "react";
import Link from "next/link";

interface ContractPrinterProps {
  composition: {
    id: string;
    title: string;
    genre: string;
    audio?: {
      checksum: string | null;
    } | null;
  };
  composer: {
    name: string;
    email: string;
    profile?: {
      fullName: string | null;
      cpf: string | null;
      motherName: string | null;
      city: string | null;
      state: string | null;
    } | null;
  };
}

export default function ContractPrinter({ composition, composer }: ContractPrinterProps) {
  // Form state
  const [artistName, setArtistName] = useState("");
  const [artistCpf, setArtistCpf] = useState("");
  const [artistRg, setArtistRg] = useState("");
  const [artistNationality, setArtistNationality] = useState("Brasileiro(a)");
  const [artistMaritalStatus, setArtistMaritalStatus] = useState("Solteiro(a)");
  const [artistAddress, setArtistAddress] = useState("");
  
  const [contractType, setContractType] = useState<"CESSAO" | "EXCLUSIVIDADE">("CESSAO");
  const [value, setValue] = useState("R$ 1.500,00");
  const [term, setTerm] = useState("12 meses");
  const [courtCity, setCourtCity] = useState(composer.profile?.city || "São Paulo");
  const [courtState, setCourtState] = useState(composer.profile?.state || "SP");

  const [showPreview, setShowPreview] = useState(false);

  const composerFullName = composer.profile?.fullName || composer.name;
  const composerCPF = composer.profile?.cpf || "Não cadastrado";
  const composerCity = composer.profile?.city || "";
  const composerState = composer.profile?.state || "";
  const registryHash = composition.audio?.checksum || "PROTOCOLO_TUNIX_N_" + composition.id.substring(0, 8).toUpperCase();

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const handlePrint = () => {
    window.print();
  };

  if (!showPreview) {
    return (
      <div className="formContainer" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <form
          className="compositionForm"
          onSubmit={(e) => {
            e.preventDefault();
            setShowPreview(true);
          }}
        >
          <section className="formSection">
            <h2>1. Escolha o Tipo de Contrato</h2>
            <div className="formGrid">
              <label style={{ gridColumn: "span 2" }}>
                Tipo de Contrato
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as any)}
                  required
                >
                  <option value="CESSAO">Cessão de Direitos Autorais (Venda/Compra de Música)</option>
                  <option value="EXCLUSIVIDADE">Licença Exclusiva de Gravação (Exclusividade de Repertório)</option>
                </select>
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>2. Dados Qualitativos do Artista (Cessionário/Licenciante)</h2>
            <div className="formGrid">
              <label>
                Nome Completo do Artista
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                  placeholder="Nome completo do cantor/banda/empresa"
                />
              </label>
              <label>
                CPF ou CNPJ do Artista
                <input
                  type="text"
                  value={artistCpf}
                  onChange={(e) => setArtistCpf(e.target.value)}
                  required
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </label>
              <label>
                RG do Artista
                <input
                  type="text"
                  value={artistRg}
                  onChange={(e) => setArtistRg(e.target.value)}
                  placeholder="Digite o RG do artista"
                />
              </label>
              <label>
                Nacionalidade
                <input
                  type="text"
                  value={artistNationality}
                  onChange={(e) => setArtistNationality(e.target.value)}
                  required
                  placeholder="Ex: Brasileiro(a)"
                />
              </label>
              <label>
                Estado Civil
                <select
                  value={artistMaritalStatus}
                  onChange={(e) => setArtistMaritalStatus(e.target.value)}
                  required
                >
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="União Estável">União Estável</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>
              <label style={{ gridColumn: "span 2" }}>
                Endereço Completo do Artista
                <input
                  type="text"
                  value={artistAddress}
                  onChange={(e) => setArtistAddress(e.target.value)}
                  required
                  placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>3. Condições Comerciais do Contrato</h2>
            <div className="formGrid">
              <label>
                Valor do Contrato
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  placeholder="Ex: R$ 1.500,00 ou Gratuito"
                />
              </label>

              {contractType === "EXCLUSIVIDADE" && (
                <label>
                  Prazo de Exclusividade
                  <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    required
                    placeholder="Ex: 12 meses, 24 meses..."
                  />
                </label>
              )}

              <label>
                Foro (Cidade para disputas)
                <input
                  type="text"
                  value={courtCity}
                  onChange={(e) => setCourtCity(e.target.value)}
                  required
                  placeholder="Cidade do foro"
                />
              </label>

              <label>
                Foro (UF)
                <input
                  type="text"
                  value={courtState}
                  onChange={(e) => setCourtState(e.target.value)}
                  required
                  maxLength={2}
                  placeholder="Estado do foro"
                />
              </label>
            </div>
          </section>

          <div className="formActions">
            <Link className="secondaryButton linkButton" href="/composicoes" style={{ textDecoration: "none", textAlign: "center" }}>
              Cancelar
            </Link>
            <button className="primaryButton" type="submit">
              ✨ Gerar Contrato
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="cert-page-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "20px 0" }}>
      <div className="cert-actions no-print" style={{ width: "100%", maxWidth: "800px", display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <button
          className="cert-back-btn"
          onClick={() => setShowPreview(false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 16px",
            background: "#ffffff",
            border: "1px solid #e0dbd3",
            borderRadius: "6px",
            color: "#524d45",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          ← Editar Informações
        </button>
        <button
          className="cert-print-btn"
          onClick={handlePrint}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 20px",
            background: "#0f6b5f",
            border: "none",
            borderRadius: "6px",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(15, 107, 95, 0.15)",
          }}
        >
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>

      <article className="certificate-sheet">
        <div className="cert-border-outer">
          <div className="cert-border-inner">
            <header className="cert-header">
              <span className="cert-logo-text">TUNIX</span>
              <h1 className="cert-main-title">
                {contractType === "CESSAO"
                  ? "Contrato de Cessão de Direitos Patrimoniais"
                  : "Contrato de Licença de Gravação Exclusiva"}
              </h1>
              <p className="cert-subtitle">Direitos Fonográficos & Autorais</p>
              <div className="cert-divider-gold"></div>
            </header>

            <div className="cert-body-content" style={{ fontSize: "12px", lineHeight: "1.6", color: "#222", textAlign: "justify" }}>
              <p style={{ marginBottom: "15px" }}>
                Pelo presente instrumento particular, as partes qualificadas abaixo ajustam o presente negócio jurídico, nos termos da Lei Federal nº 9.610/98 (Lei de Direitos Autorais):
              </p>

              {/* Qualificação do Compositor */}
              <div style={{ marginBottom: "12px", background: "#fcfaf4", padding: "10px", borderRadius: "6px", border: "1px solid #f4efe4" }}>
                <strong>CEDENTE/LICENCIANTE (AUTOR COMPOSITOR):</strong><br />
                Nome Completo: {composerFullName}<br />
                Portador do CPF nº: {composerCPF}<br />
                Residente em: {composerCity} - {composerState}<br />
                Nome da Mãe: {composer.profile?.motherName || "Informação não declarada"}
              </div>

              {/* Qualificação do Artista */}
              <div style={{ marginBottom: "20px", background: "#fcfaf4", padding: "10px", borderRadius: "6px", border: "1px solid #f4efe4" }}>
                <strong>CESSIONÁRIO/LICENCIATÁRIO (ARTISTA INTERPRETE):</strong><br />
                Nome Completo: {artistName || "[Nome não informado]"}<br />
                CPF ou CNPJ: {artistCpf || "[CPF não informado]"}<br />
                RG: {artistRg || "[RG não informado]"} | Nacionalidade: {artistNationality} | Estado Civil: {artistMaritalStatus}<br />
                Endereço: {artistAddress || "[Endereço não informado]"}
              </div>

              <div className="cert-section">
                <h2>Cláusula 1ª - Do Objeto da Obra Musical</h2>
                <p>
                  O CEDENTE/LICENCIANTE, sendo o legítimo autor e titular originário dos direitos sobre a composição musical intitulada <strong>"{composition.title}"</strong> (Gênero: {composition.genre}), registrada sob a garantia digital da plataforma Tunix e vinculada ao <strong>Protocolo Criptográfico SHA-256 nº: {registryHash}</strong>, cede ou licencia os direitos patrimoniais sobre a mesma ao CESSIONÁRIO/LICENCIATÁRIO.
                </p>
              </div>

              {contractType === "CESSAO" ? (
                <>
                  <div className="cert-section">
                    <h2>Cláusula 2ª - Do Caráter Definitivo (Compra/Venda)</h2>
                    <p>
                      A cessão é realizada em caráter <strong>definitivo, permanente, universal e irrevogável</strong>. O CESSIONÁRIO adquire a totalidade dos direitos patrimoniais da obra, passando a ter autonomia total para fixação, reprodução comercial, distribuição física e digital em todas as plataformas de streaming, sincronização audiovisual e execução pública, sem limites territoriais ou temporais.
                    </p>
                  </div>
                  <div className="cert-section">
                    <h2>Cláusula 3ª - Do Pagamento de Compra</h2>
                    <p>
                      Pela cessão definitiva dos direitos patrimoniais da composição, o CESSIONÁRIO pagará ao CEDENTE o valor de <strong>{value}</strong>, nos termos e prazos avençados de forma privada entre as partes. A quitação total deste valor operará a transferência plena dos direitos autorais patrimoniais.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="cert-section">
                    <h2>Cláusula 2ª - Do Prazo e Exclusividade de Gravação</h2>
                    <p>
                      A presente licença é outorgada em caráter de <strong>Exclusividade de Gravação Fonográfica</strong> pelo prazo de <strong>{term}</strong> a contar desta data. O LICENCIATÁRIO compromete-se a lançar comercialmente a faixa fonográfica da obra nas plataformas digitais em até 12 (doze) meses. Caso a música não seja gravada e disponibilizada ao público neste período, a exclusividade cessa imediatamente e a obra retorna ao portfólio livre do LICENCIANTE.
                    </p>
                  </div>
                  <div className="cert-section">
                    <h2>Cláusula 3ª - Das Condições e Licenciamento</h2>
                    <p>
                      Pela licença de gravação exclusiva, o LICENCIATÁRIO pagará ao LICENCIANTE o valor de <strong>{value}</strong>, e compromete-se a incluir o nome do LICENCIANTE como autor intelectual em todos os metadados do lançamento fonográfico, além de repassar as participações percentuais de royalties conforme split definido.
                    </p>
                  </div>
                </>
              )}

              <div className="cert-section">
                <h2>Cláusula 4ª - Dos Direitos Morais do Autor</h2>
                <p>
                  Conforme a legislação brasileira de direitos autorais, os **Direitos Morais de Autoria** são inalienáveis e pertencem sempre ao compositor original. O CESSIONÁRIO/LICENCIATÁRIO fica obrigado a creditar e indicar expressamente o nome do CEDENTE/LICENCIANTE nas fichas técnicas, encartes virtuais e metadados de qualquer lançamento fonográfico derivado desta obra.
                </p>
              </div>

              <div className="cert-section">
                <h2>Cláusula 5ª - Da Originalidade e Evicção</h2>
                <p>
                  O CEDENTE/LICENCIANTE garante a originalidade da obra musical e declara que a mesma está totalmente livre de plágio ou direitos de terceiros, assumindo responsabilidade legal integral em caso de ações judiciais de regresso por infração de direito autoral de terceiros.
                </p>
              </div>

              <div className="cert-section">
                <h2>Cláusula 6ª - Do Foro de Eleição</h2>
                <p>
                  As partes elegem de comum acordo o foro da Comarca de <strong>{courtCity} - {courtState}</strong> para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, com exclusão de qualquer outro por mais privilegiado que seja.
                </p>
              </div>

              <p style={{ marginTop: "20px", textAlign: "right" }}>
                E, por estarem justos e contratados, assinam o presente contrato eletrônica ou fisicamente.
              </p>

              <p style={{ marginTop: "5px", textAlign: "right", color: "#666" }}>
                Gerado sob o protocolo Tunix em {formattedDate}.
              </p>

              {/* Assinaturas */}
              <div className="signaturesRow" style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", gap: "40px" }}>
                <div style={{ flex: 1, textAlign: "center", borderTop: "1px solid #999", paddingTop: "8px" }}>
                  <strong>{composerFullName}</strong><br />
                  CEDENTE / LICENCIANTE
                </div>
                <div style={{ flex: 1, textAlign: "center", borderTop: "1px solid #999", paddingTop: "8px" }}>
                  <strong>{artistName || "Nome do Artista"}</strong><br />
                  CESSIONÁRIO / LICENCIATÁRIO
                </div>
              </div>
            </div>

            <footer className="cert-footer" style={{ marginTop: "30px", borderTop: "1px solid #f4efe4", paddingTop: "15px" }}>
              <div className="cert-verification-notice" style={{ maxWidth: "100%", textAlign: "center" }}>
                <p style={{ fontSize: "10px", color: "#777", margin: "2px 0" }}>
                  Este contrato está vinculado à prova criptográfica registrada na Tunix sob o hash de auditoria {registryHash}.
                </p>
                <p className="cert-disclaimer" style={{ fontSize: "8px", color: "#aaa", marginTop: "10px", textAlign: "justify" }}>
                  A Tunix fornece apenas as ferramentas de certificação de anterioridade criptográfica e modelos gerais de contratos. Os termos de pagamento, splits e negociações comerciais são de inteira responsabilidade das partes acordantes.
                </p>
              </div>
            </footer>
          </div>
        </div>
      </article>

      {/* Styled JSX embedded for 100% self-contained print behavior */}
      <style jsx global>{`
        .certificate-sheet {
          background: #fffdf8;
          width: 100%;
          max-width: 800px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          box-sizing: border-box;
          font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
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
          margin-bottom: 25px;
        }

        .cert-logo-text {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 4px;
          color: #0f6b5f;
          display: inline-block;
          margin-bottom: 8px;
        }

        .cert-main-title {
          font-size: 24px;
          font-weight: 700;
          color: #15130f;
          margin: 8px 0 4px 0;
          letter-spacing: 0.5px;
        }

        .cert-subtitle {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          color: #d4af37;
          text-transform: uppercase;
          margin: 0;
        }

        .cert-divider-gold {
          height: 2px;
          background: linear-gradient(to right, transparent, #d4af37, transparent);
          margin-top: 12px;
          width: 100%;
        }

        .cert-section {
          margin-bottom: 12px;
        }

        .cert-section h2 {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #0f6b5f;
          border-bottom: 1px solid rgba(15, 107, 95, 0.15);
          padding-bottom: 4px;
          margin-bottom: 8px;
          margin-top: 15px;
        }

        /* Print Media Queries */
        @media print {
          @page {
            size: A4;
            margin: 10mm 15mm;
          }

          /* Hide sidebar, topbar, mobile menu, and action buttons */
          .sidebar, .mobileMenu, .cert-actions, .appHeader, header, nav, .pageHeader, .no-print {
            display: none !important;
          }

          /* Force appShell grid to act as a simple block */
          .appShell {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }

          .workspace {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            display: block !important;
            border: none !important;
          }

          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
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
            border: none !important;
            margin: 0 !important;
          }

          .cert-border-outer {
            padding: 5px !important;
            border-width: 3px !important;
          }

          .cert-border-inner {
            padding: 15px 25px !important;
          }

          .cert-header {
            margin-bottom: 12px !important;
          }

          .cert-logo-text {
            font-size: 20px !important;
            margin-bottom: 4px !important;
          }

          .cert-main-title {
            font-size: 18px !important;
            margin: 5px 0 !important;
          }

          .cert-subtitle {
            font-size: 9px !important;
          }

          .cert-divider-gold {
            margin-top: 8px !important;
          }

          .cert-section h2 {
            font-size: 9px !important;
            margin-bottom: 4px !important;
            padding-bottom: 2px !important;
            margin-top: 10px !important;
          }

          .cert-body-content {
            font-size: 10px !important;
            line-height: 1.4 !important;
          }

          .cert-body-content p {
            margin-bottom: 8px !important;
          }

          .signaturesRow {
            margin-top: 25px !important;
            gap: 20px !important;
          }

          .signaturesRow div {
            font-size: 10px !important;
          }

          .cert-footer {
            margin-top: 15px !important;
            padding-top: 8px !important;
          }

          .cert-verification-notice p {
            font-size: 8px !important;
          }

          .cert-disclaimer {
            font-size: 7px !important;
            margin-top: 5px !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>
    </div>
  );
}