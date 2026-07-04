"use client";

import { useState } from "react";

export default function ShareShowcaseButton({ composerId }: { composerId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/catalogo?compositor=${composerId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      className="secondaryButton"
      onClick={handleCopy}
      type="button"
      style={{
        padding: "0.6rem 1rem",
        fontSize: "0.85rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        margin: 0,
        fontWeight: "600",
        background: copied ? "#d1fae5" : "transparent",
        color: copied ? "#065f46" : "inherit",
        borderColor: copied ? "#34d399" : "var(--border)",
        transition: "all 0.2s ease",
      }}
    >
      {copied ? "✅ Link copiado!" : "📋 Copiar link da minha vitrine"}
    </button>
  );
}