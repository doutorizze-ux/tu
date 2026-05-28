export type RoyaltyImportRow = {
  platform: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  grossAmount: number;
  netAmount: number;
  source: string | null;
  notes: string | null;
};

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

type ParseOptions = {
  defaultCurrency?: string;
  defaultSource?: string;
};

const columnAliases = {
  platform: ["platform", "plataforma"],
  periodStart: ["period_start", "periodstart", "inicio_periodo", "periodo_inicio", "inicio"],
  periodEnd: ["period_end", "periodend", "fim_periodo", "periodo_fim", "fim"],
  currency: ["currency", "moeda"],
  grossAmount: ["gross_amount", "grossamount", "receita_bruta", "bruto", "gross"],
  netAmount: ["net_amount", "netamount", "receita_liquida", "liquido", "net"],
  source: ["source", "fonte", "arquivo"],
  notes: ["notes", "observacoes", "obs", "nota"],
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  const [headers = [], ...dataRows] = rows;
  return { headers: headers.map(normalizeHeader), rows: dataRows };
}

function columnIndex(headers: string[], aliases: string[]) {
  return aliases
    .map((alias) => headers.indexOf(normalizeHeader(alias)))
    .find((index) => index >= 0) ?? -1;
}

function getCell(row: string[], index: number) {
  return index >= 0 ? (row[index] ?? "").trim() : "";
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();

  if (!cleaned) {
    return Number.NaN;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      return Number(cleaned.replace(/\./g, "").replace(",", "."));
    }

    return Number(cleaned.replace(/,/g, ""));
  }

  if (lastComma >= 0) {
    return Number(cleaned.replace(",", "."));
  }

  return Number(cleaned);
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function parseRoyaltyImportCsv(text: string, options: ParseOptions = {}) {
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""));
  const errors: string[] = [];
  const requiredColumns = [
    ["platform", columnAliases.platform],
    ["period_start", columnAliases.periodStart],
    ["period_end", columnAliases.periodEnd],
    ["gross_amount", columnAliases.grossAmount],
    ["net_amount", columnAliases.netAmount],
  ] as const;

  const indexes = {
    platform: columnIndex(parsed.headers, columnAliases.platform),
    periodStart: columnIndex(parsed.headers, columnAliases.periodStart),
    periodEnd: columnIndex(parsed.headers, columnAliases.periodEnd),
    currency: columnIndex(parsed.headers, columnAliases.currency),
    grossAmount: columnIndex(parsed.headers, columnAliases.grossAmount),
    netAmount: columnIndex(parsed.headers, columnAliases.netAmount),
    source: columnIndex(parsed.headers, columnAliases.source),
    notes: columnIndex(parsed.headers, columnAliases.notes),
  };

  for (const [name, aliases] of requiredColumns) {
    if (columnIndex(parsed.headers, aliases) < 0) {
      errors.push(`Coluna obrigatoria ausente: ${name}.`);
    }
  }

  if (errors.length) {
    return { errors, rows: [] as RoyaltyImportRow[] };
  }

  const rows = parsed.rows.map((row, index) => {
    const line = index + 2;
    const platform = getCell(row, indexes.platform).toUpperCase();
    const periodStart = parseDateOnly(getCell(row, indexes.periodStart));
    const periodEnd = parseDateOnly(getCell(row, indexes.periodEnd));
    const currency = (getCell(row, indexes.currency) || options.defaultCurrency || "BRL").toUpperCase();
    const grossAmount = parseAmount(getCell(row, indexes.grossAmount));
    const netAmount = parseAmount(getCell(row, indexes.netAmount));
    const source = getCell(row, indexes.source) || options.defaultSource || null;
    const notes = getCell(row, indexes.notes) || null;

    if (!platform) {
      errors.push(`Linha ${line}: plataforma obrigatoria.`);
    }
    if (!periodStart) {
      errors.push(`Linha ${line}: period_start precisa estar no formato AAAA-MM-DD.`);
    }
    if (!periodEnd) {
      errors.push(`Linha ${line}: period_end precisa estar no formato AAAA-MM-DD.`);
    }
    if (periodStart && periodEnd && periodEnd < periodStart) {
      errors.push(`Linha ${line}: period_end nao pode ser menor que period_start.`);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      errors.push(`Linha ${line}: currency precisa ter 3 letras, como BRL ou USD.`);
    }
    if (!Number.isFinite(grossAmount) || grossAmount < 0) {
      errors.push(`Linha ${line}: gross_amount invalido.`);
    }
    if (!Number.isFinite(netAmount) || netAmount < 0) {
      errors.push(`Linha ${line}: net_amount invalido.`);
    }

    return {
      platform,
      periodStart: periodStart ?? new Date(),
      periodEnd: periodEnd ?? new Date(),
      currency,
      grossAmount,
      netAmount,
      source,
      notes,
    };
  });

  if (!rows.length) {
    errors.push("O CSV nao possui linhas de fechamento.");
  }

  return { errors, rows };
}

export function royaltyImportTemplateCsv() {
  return [
    "platform,period_start,period_end,currency,gross_amount,net_amount,source,notes",
    "SPOTIFY,2026-04-01,2026-04-30,BRL,1520.45,1378.22,Relatorio distribuidora abril,Streaming premium e ad-supported",
  ].join("\r\n");
}
