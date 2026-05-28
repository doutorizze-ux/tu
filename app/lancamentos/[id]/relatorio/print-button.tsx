"use client";

export function PrintButton() {
  return (
    <button className="primaryButton printOnlyAction" type="button" onClick={() => window.print()}>
      Imprimir / salvar PDF
    </button>
  );
}
