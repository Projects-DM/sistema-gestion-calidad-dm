const LOT_PATTERN = /L\s*26\s*-\s*(\d{1,3})/gi;

export function normalizeLote(raw) {
  if (!raw) return null;
  const m = LOT_PATTERN.exec(String(raw));
  LOT_PATTERN.lastIndex = 0;
  if (!m) return null;
  const digits = m[1];
  return `L26${digits}`;
}

export function extractLotesFromRows(rows) {
  const freqs = {};
  for (const row of rows) {
    const raw = row.lote || '';
    const m = LOT_PATTERN.exec(String(raw));
    LOT_PATTERN.lastIndex = 0;
    if (m) {
      const norm = `L26${m[1]}`;
      freqs[norm] = (freqs[norm] || 0) + 1;
    }
  }
  return freqs;
}

export function findDominantLote(freqs) {
  const entries = Object.entries(freqs);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function resolveDocumentLotes(rows) {
  if (!rows?.length) return rows;
  const freqs = extractLotesFromRows(rows);
  const dominante = findDominantLote(freqs);
  return rows.map(row => {
    const raw = row.lote || '';
    const m = LOT_PATTERN.exec(String(raw));
    LOT_PATTERN.lastIndex = 0;
    if (m) return { ...row, lote: `L26${m[1]}` };
    if (dominante) return { ...row, lote: dominante };
    return { ...row, lote: null };
  });
}
