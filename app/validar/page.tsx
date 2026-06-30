"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { validateChecksum } from "../actions";

type ValidationResult = {
  type: string;
  title: string;
  owner: string;
  createdAt: Date;
  fileName: string;
  checksum: string | null;
  sizeBytes: number;
} | null;

function ValidateContent() {
  const [hashInput, setHashInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");

  const searchParams = useSearchParams();
  const queryHash = searchParams.get("hash");

  // Client-side SHA-256 calculator using Web Crypto API
  const calculateSHA256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setFileLoading(true);
    setResult(undefined);
    setErrorMsg("");
    try {
      const computedHash = await calculateSHA256(file);
      setHashInput(computedHash);
      const res = await validateChecksum(computedHash);
      setResult(res);
      if (!res) {
        setErrorMsg("Este arquivo não está registrado na base de dados da Tunix.");
      }
    } catch (err) {
      setErrorMsg("Erro ao calcular hash do arquivo. Certifique-se de que é um formato válido.");
    } finally {
      setFileLoading(false);
    }
  };

  const executeValidation = async (hash: string) => {
    setLoading(true);
    setResult(undefined);
    setErrorMsg("");
    try {
      const res = await validateChecksum(hash.trim());
      setResult(res);
      if (!res) {
        setErrorMsg("Nenhum registro ou lançamento foi encontrado com este código hash.");
      }
    } catch (err) {
      setErrorMsg("Erro ao consultar a base de dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleHashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;
    await executeValidation(hashInput);
  };

  // Trigger validation automatically if hash is passed in the URL
  useEffect(() => {
    if (queryHash) {
      setHashInput(queryHash);
      executeValidation(queryHash);
    }
  }, [queryHash]);

  return (
    <div className="validate-container">
      {/* Small Header */}
      <header className="validate-header">
        <Link href="/" className="validate-brand">
          TUNIX
        </Link>
      </header>

      {/* Main Panel */}
      <main className="validate-card">
        <h1 className="validate-title">Validador Criptográfico de Obras</h1>
        <p className="validate-subtitle">
          Verifique a autenticidade e a anterioridade de composições e lançamentos registrados na Tunix inserindo o código hash ou arrastando o arquivo original.
        </p>

        {/* Drag and Drop Zone */}
        <div
          className={`drop-zone ${fileLoading ? "uploading" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <input
            type="file"
            id="audio-uploader"
            className="hidden-file-input"
            onChange={handleFileSelect}
            accept="audio/*,image/*"
          />
          <label htmlFor="audio-uploader" className="drop-zone-label">
            {fileLoading ? (
              <div className="spinner-container">
                <div className="spinner"></div>
                <span>Calculando assinatura criptográfica...</span>
              </div>
            ) : (
              <>
                <span className="drop-icon">🎵</span>
                <strong>Arraste o arquivo original aqui</strong>
                <span>ou clique para selecionar do computador</span>
                <span className="file-hint">Calculado de forma 100% segura no seu navegador</span>
              </>
            )}
          </label>
        </div>

        <div className="or-divider">
          <span>ou pesquise pelo Hash SHA-256</span>
        </div>

        {/* Text Form */}
        <form onSubmit={handleHashSubmit} className="hash-form">
          <input
            type="text"
            className="hash-input-text"
            placeholder="Ex: 5a596248ca27c69d95bd678cc31805fe2d59723e..."
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
          />
          <button type="submit" className="hash-submit-btn" disabled={loading || fileLoading}>
            {loading ? "Pesquisando..." : "Validar Código"}
          </button>
        </form>

        {/* Results display */}
        {result !== undefined && (
          <div className="result-container animate-fade-in">
            {result ? (
              <div className="result-box success">
                <div className="result-badge success-badge">
                  🟢 REGISTRO HOMOLOGADO E VÁLIDO
                </div>
                <h3 className="result-song-title">{result.title}</h3>
                <p className="result-meta-item">
                  <strong>Proprietário/Autor:</strong> {result.owner}
                </p>
                <p className="result-meta-item">
                  <strong>Tipo de Registro:</strong>{" "}
                  {result.type === "COMPOSITION" ? "Composição (Ficha / Obra)" : "Lançamento (Fonograma / Master)"}
                </p>
                <p className="result-meta-item">
                  <strong>Data de Registro:</strong>{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "long",
                    timeStyle: "medium",
                  }).format(new Date(result.createdAt))}
                </p>
                <p className="result-meta-item">
                  <strong>Nome do Arquivo original:</strong> {result.fileName}
                </p>
                <div className="result-checksum-box">
                  <strong>SHA-256:</strong>
                  <code>{result.checksum}</code>
                </div>
              </div>
            ) : (
              <div className="result-box failure">
                <div className="result-badge failure-badge">
                  🔴 REGISTRO NÃO LOCALIZADO
                </div>
                <p className="failure-message">{errorMsg}</p>
                <p className="failure-subtext">
                  A assinatura do arquivo ou o código inserido não coincidem com nenhuma obra registrada na nossa base de dados.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        .validate-container {
          min-height: 100vh;
          background-color: #f4efe4;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 30px 20px;
          font-family: sans-serif;
          color: #15130f;
          box-sizing: border-box;
        }

        .validate-header {
          width: 100%;
          max-width: 680px;
          margin-bottom: 30px;
          display: flex;
          justify-content: flex-start;
        }

        .validate-brand {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 3px;
          color: #0f6b5f;
          text-decoration: none;
        }

        .validate-card {
          width: 100%;
          max-width: 680px;
          background: #fffdf8;
          border: 1px solid #e2dcd0;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 20px rgba(21, 19, 15, 0.03);
          box-sizing: border-box;
        }

        .validate-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 10px 0;
          color: #15130f;
          text-align: center;
        }

        .validate-subtitle {
          font-size: 14px;
          line-height: 1.6;
          color: #6e675d;
          text-align: center;
          margin: 0 0 30px 0;
        }

        /* Drop Zone */
        .drop-zone {
          border: 2px dashed #c9c3b8;
          border-radius: 8px;
          background: #fdfdfc;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .drop-zone:hover {
          border-color: #0f6b5f;
          background: #fbfaf7;
        }

        .drop-zone.uploading {
          border-color: #d4af37;
          background: #fdfcf7;
          cursor: wait;
        }

        .hidden-file-input {
          display: none;
        }

        .drop-zone-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        }

        .drop-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .drop-zone-label strong {
          font-size: 15px;
          color: #15130f;
          margin-bottom: 4px;
        }

        .drop-zone-label span {
          font-size: 13px;
          color: #6e675d;
        }

        .file-hint {
          margin-top: 8px;
          font-size: 11px !important;
          color: #a19789 !important;
          background: #f4efe4;
          padding: 2px 8px;
          border-radius: 12px;
        }

        /* Spinner */
        .spinner-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(15, 107, 95, 0.1);
          border-top-color: #0f6b5f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .or-divider {
          display: flex;
          align-items: center;
          margin: 25px 0;
          color: #a19789;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .or-divider::before,
        .or-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2dcd0;
        }

        .or-divider span {
          padding: 0 15px;
        }

        /* Hash Form */
        .hash-form {
          display: flex;
          gap: 12px;
        }

        .hash-input-text {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #c9c3b8;
          border-radius: 6px;
          font-size: 14px;
          background: #ffffff;
          color: #15130f;
          outline: none;
          font-family: monospace;
        }

        .hash-input-text:focus {
          border-color: #0f6b5f;
        }

        .hash-submit-btn {
          padding: 12px 24px;
          background: #0f6b5f;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .hash-submit-btn:hover {
          background: #0d5c52;
        }

        .hash-submit-btn:disabled {
          background: #c9c3b8;
          cursor: not-allowed;
        }

        /* Result Container */
        .result-container {
          margin-top: 30px;
        }

        .result-box {
          border-radius: 8px;
          padding: 24px;
          box-sizing: border-box;
        }

        .result-box.success {
          background: #f2faf8;
          border: 1px solid #b6e2d8;
        }

        .result-box.failure {
          background: #fdf5f5;
          border: 1px solid #f5c2c2;
        }

        .result-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 4px 10px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .success-badge {
          background: #0f6b5f;
          color: #ffffff;
        }

        .failure-badge {
          background: #d32f2f;
          color: #ffffff;
        }

        .result-song-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #15130f;
        }

        .result-meta-item {
          font-size: 13px;
          margin: 6px 0;
          color: #524d45;
        }

        .result-meta-item strong {
          color: #15130f;
        }

        .result-checksum-box {
          margin-top: 16px;
          padding: 10px;
          background: #ffffff;
          border: 1px solid #e0dbd3;
          border-radius: 4px;
          font-size: 12px;
          word-break: break-all;
        }

        .result-checksum-box code {
          display: block;
          margin-top: 4px;
          font-family: monospace;
          color: #0f6b5f;
        }

        .failure-message {
          font-size: 14px;
          font-weight: 600;
          color: #d32f2f;
          margin: 0 0 8px 0;
        }

        .failure-subtext {
          font-size: 12px;
          color: #6e675d;
          line-height: 1.5;
          margin: 0;
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function ValidatePage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>Carregando validador...</div>}>
      <ValidateContent />
    </Suspense>
  );
}
