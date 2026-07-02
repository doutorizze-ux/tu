"use client";

import React from "react";

export function CopyHashButton({ hash }: { hash: string }) {
  return (
    <button
      title="Copiar Hash SHA-256"
      className="copy-btn-small"
      onClick={() => {
        navigator.clipboard.writeText(hash);
        alert("Hash copiado com sucesso!");
      }}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: "12px",
        padding: "2px",
      }}
    >
      📋
    </button>
  );
}

export function CopyLinkButton({ hash }: { hash: string }) {
  return (
    <button
      className="secondaryButton action-btn-small"
      title="Copiar Link de Validação Pública"
      onClick={() => {
        navigator.clipboard.writeText(`https://tunix.com.br/validar?hash=${hash}`);
        alert("Link de validação copiado com sucesso!");
      }}
      style={{
        padding: "6px 12px",
        fontSize: "12px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      🔗 Link
    </button>
  );
}
