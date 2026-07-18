"use client";

import { useState } from "react";
import { platformLabel } from "../lib/format";

interface PlatformItem {
  id?: string;
  platform: string;
}

export function PlatformListCompact({
  platforms,
  maxVisible = 4,
}: {
  platforms: (string | PlatformItem)[];
  maxVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!platforms || platforms.length === 0) {
    return <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Nenhuma plataforma selecionada</span>;
  }

  const normalized = platforms.map((p) => typeof p === "string" ? p : p.platform);
  const total = normalized.length;

  if (total <= maxVisible) {
    return (
      <div className="platformChips" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {normalized.map((p, idx) => (
          <span key={idx} style={{ padding: "4px 10px", fontSize: "0.78rem", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", lineHeight: "1.2" }}>
            {platformLabel(p)}
          </span>
        ))}
      </div>
    );
  }

  const visible = normalized.slice(0, maxVisible);
  const hiddenCount = total - maxVisible;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div className="platformChips" style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        {visible.map((p, idx) => (
          <span key={idx} style={{ padding: "4px 10px", fontSize: "0.78rem", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", lineHeight: "1.2" }}>
            {platformLabel(p)}
          </span>
        ))}
        
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: expanded ? "var(--accent)" : "rgba(15, 107, 95, 0.15)",
            color: expanded ? "#ffffff" : "var(--accent-strong)",
            border: "1px solid var(--accent)",
            borderRadius: "999px",
            padding: "4px 12px",
            fontSize: "0.78rem",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          {expanded ? `▲ Ocultar lista` : `+${hiddenCount} plataformas ▼`}
        </button>
      </div>

      {expanded && (
        <div 
          style={{
            marginTop: "4px",
            padding: "12px",
            background: "var(--paper, #fffdf8)",
            border: "1px solid var(--line, #ded6ca)",
            borderRadius: "8px",
            maxHeight: "180px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.03)"
          }}
        >
          {normalized.map((p, idx) => (
            <span 
              key={idx} 
              style={{
                fontSize: "0.75rem",
                padding: "3px 8px",
                borderRadius: "4px",
                background: "var(--bg, #f4efe4)",
                color: "var(--ink, #15130f)",
                border: "1px solid var(--line, #ded6ca)"
              }}
            >
              {platformLabel(p)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
