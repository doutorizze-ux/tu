"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="cert-print-btn">
      🖨️ Imprimir / Salvar PDF
    </button>
  );
}