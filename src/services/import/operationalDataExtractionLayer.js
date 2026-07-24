import * as XLSX from 'xlsx';

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toYmd(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value === 'number') {
    const dc = XLSX.SSF.parse_date_code(value);
    if (!dc) return '';
    return `${dc.y}-${pad2(dc.m)}-${pad2(dc.d)}`;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return '';
    const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`;
    const latam = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (latam) {
      const y = latam[3].length === 2 ? `20${latam[3]}` : latam[3];
      return `${y}-${pad2(latam[2])}-${pad2(latam[1])}`;
    }
  }
  return '';
}

export function toHm(value) {
  if (!value && value !== 0) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }
  if (typeof value === 'number') {
    const dc = XLSX.SSF.parse_date_code(value);
    if (!dc) {
      const minutes = Math.round(value * 24 * 60);
      const hh = Math.floor(minutes / 60) % 24;
      const mm = minutes % 60;
      return `${pad2(hh)}:${pad2(mm)}`;
    }
    return `${pad2(dc.H)}:${pad2(dc.M)}`;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return '';
    const m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
    if (m) return `${pad2(m[1])}:${pad2(m[2])}`;
  }
  return '';
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(',', '.').trim());
    return Number.isFinite(n) ? n : '';
  }
  return '';
}

export function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreHeaderMatch(normalizedHeader, synonyms) {
  if (!normalizedHeader) return 0;
  const h = normalizedHeader;
  let score = 0;
  for (const syn of synonyms) {
    const s = normalizeHeader(syn);
    if (!s) continue;
    if (h === s) score = Math.max(score, 100);
    else if (h.startsWith(s) || s.startsWith(h)) score = Math.max(score, 85);
    else if (h.includes(s)) score = Math.max(score, 70);
    else {
      const hTokens = new Set(h.split(' ').filter(Boolean));
      const sTokens = s.split(' ').filter(Boolean);
      const hits = sTokens.filter((t) => hTokens.has(t)).length;
      if (hits) score = Math.max(score, 40 + hits * 10);
    }
  }
  return score;
}

export function buildHeaderMap(headers, canonicalFields, fieldSynonyms) {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const map = {};
  const used = new Set();

  for (const field of canonicalFields) {
    const synonyms = fieldSynonyms[field] || [field];
    let best = { key: null, score: 0 };
    for (const h of normalized) {
      if (!h.norm || used.has(h.raw)) continue;
      const score = scoreHeaderMatch(h.norm, synonyms);
      if (score > best.score) best = { key: h.raw, score };
    }
    if (best.score >= 55 && best.key) {
      map[field] = best.key;
      used.add(best.key);
    } else {
      map[field] = null;
    }
  }

  return map;
}

export function pickValue(row, key) {
  return key ? row[key] : '';
}

export function detectHeaderRow(headers, rows, canonicalFields, fieldSynonyms, maxScanRows = 80) {
  let best = { rowIndex: -1, score: 0, rowHeaders: [] };
  let fallback = { rowIndex: -1, score: -999, rowHeaders: [] };
  const aoa = [headers, ...rows];
  for (let i = 0; i < Math.min(maxScanRows, aoa.length); i++) {
    const rawRow = aoa[i] || [];
    const row = rawRow.map((v) => String(v ?? '').trim()).filter(Boolean);
    if (row.length < 2) continue;
    const map = buildHeaderMap(row, canonicalFields, fieldSynonyms);
    const hits = canonicalFields.reduce((acc, f) => acc + (map[f] ? 1 : 0), 0);
    if (hits > best.score) best = { rowIndex: i, score: hits, rowHeaders: row };
    const numericCount = rawRow.filter(v => !isNaN(Number(v)) && String(v ?? '').trim() !== '').length;
    const allShort = row.every(v => v.length < 40);
    const headerScore = row.length * 2 + (allShort ? 5 : 0) - numericCount * 3;
    if (headerScore > fallback.score) fallback = { rowIndex: i, score: headerScore, rowHeaders: row };
  }
  if (best.rowIndex === -1 && fallback.rowIndex >= 0) best = fallback;
  return best;
}

function getOriginalRow(aoa, rowIndex) {
  return (aoa[rowIndex] || []).map((v) => v !== undefined && v !== null ? String(v).trim() : '');
}

export function normalizeOperationalData({ parsedDocument, contract, structureAnalysis, operationalSection }) {
  const { canonicalFields, synonyms, fieldNormalizers = {} } = contract.documentContract || contract;
  let { rawHeaders, rawRows } = parsedDocument;

  if (operationalSection?.rows?.length > 0) {
    rawHeaders = operationalSection.headers || [];
    rawRows = operationalSection.rows;
  }

  if (structureAnalysis?.documentType === 'SEMI_STRUCTURED' && structureAnalysis?.sections?.length > 0) {
    return normalizeSemiStructured({ rawHeaders, rawRows, canonicalFields, synonyms, fieldNormalizers, structureAnalysis });
  }

  const aoa = [rawHeaders || [], ...(rawRows || [])];
  const best = detectHeaderRow(rawHeaders || [], rawRows || [], canonicalFields, synonyms);
  const headerRowIndex = best.rowIndex >= 0 ? best.rowIndex : 0;

  const actualRows = rawRows ? rawRows.slice(headerRowIndex) : [];
  if (!actualRows.length) return { rows: [], matchedHeaders: {}, missingHeaders: canonicalFields };

  const actualHeaders = getOriginalRow(aoa, headerRowIndex).filter(Boolean);

  const matchedHeaders = buildHeaderMap(actualHeaders, canonicalFields, synonyms);
  const missingHeaders = canonicalFields.filter((f) => !matchedHeaders[f]);
  const defaultNormalizer = (v) => String(v ?? '').trim();

  const rows = actualRows.map((r) => {
    const rowObj = {};
    for (let col = 0; col < actualHeaders.length; col++) {
      rowObj[actualHeaders[col]] = r[col] !== undefined ? r[col] : '';
    }
    const record = {};
    for (const field of canonicalFields) {
      const rawValue = pickValue(rowObj, matchedHeaders[field]);
      const normalizer = fieldNormalizers[field] || defaultNormalizer;
      record[field] = normalizer(rawValue);
    }
    return record;
  });

  const filtered = rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
  const matchedCount = Object.values(matchedHeaders).filter(Boolean).length;
  return { rows: filtered, matchedHeaders, missingHeaders, completenessScore: canonicalFields.length > 0 ? matchedCount / canonicalFields.length : 0 };
}

function extractMetadataRowPairs(rows, endRow) {
  const meta = {};
  for (let i = 0; i < Math.min(endRow, rows.length); i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length - 1; j += 2) {
      const label = String(row[j] ?? '').trim();
      const value = String(row[j + 1] ?? '').trim();
      if (label.endsWith(':') && value) {
        meta[normalizeHeader(label.replace(/:$/, ''))] = value;
      }
    }
  }
  return meta;
}

export function buildOperationalRecords({ operationalDocumentModel, contract, recordBuilderHints }) {
  const { metadata, table } = operationalDocumentModel || {};
  const hints = recordBuilderHints || { allowMetadataInheritance: true, allowPartialRecords: true, minimumCompletenessScore: 60 };
  const canonicalFields = contract?.documentContract?.canonicalFields || [];
  const synonyms = contract?.documentContract?.synonyms || {};
  const fieldNormalizers = contract?.documentContract?.fieldNormalizers || {};
  const defaultNormalizer = (v) => String(v ?? '').trim();

  const matchedHeaders = buildHeaderMap(table?.headers || [], canonicalFields, synonyms);

  const records = (table?.rows || []).map((row) => {
    const rowObj = {};
    for (let col = 0; col < (table?.headers || []).length; col++) {
      rowObj[table.headers[col]] = row[col] !== undefined ? row[col] : '';
    }

    const record = {};
    const completenessDetail = {};
    for (const field of canonicalFields) {
      let value = pickValue(rowObj, matchedHeaders[field]);

      if (!value && hints.allowMetadataInheritance && metadata) {
        const syns = synonyms[field] || [field];
        for (const syn of syns) {
          const norm = normalizeHeader(syn);
          for (const [metaKey, metaVal] of Object.entries(metadata)) {
            if (norm === normalizeHeader(metaKey) || norm.includes(normalizeHeader(metaKey)) || normalizeHeader(metaKey).includes(norm)) {
              value = metaVal;
              break;
            }
          }
          if (value) break;
        }
      }

      const normalizer = fieldNormalizers[field] || defaultNormalizer;
      record[field] = normalizer(value);
      completenessDetail[field] = String(record[field] ?? '').trim() !== '';
    }

    const filledFields = Object.values(completenessDetail).filter(Boolean).length;
    const completeness = canonicalFields.length > 0 ? Math.round((filledFields / canonicalFields.length) * 100) : 0;
    const missingFields = canonicalFields.filter(f => !completenessDetail[f]);

    return { ...record, _completeness: completeness, _missingFields: missingFields };
  });

  const filtered = hints.allowPartialRecords
    ? records
    : records.filter(r => r._completeness >= hints.minimumCompletenessScore);

  return { records: filtered, totalBuilt: records.length, totalFiltered: filtered.length };
}



export function buildOperationalDocumentModel({ parsedDocument, structureAnalysis }) {
  const { rawRows } = parsedDocument || {};
  const analysis = structureAnalysis || {};

  const metadata = {};
  const labels = analysis.metadata?.discoveredLabels;
  if (labels) {
    if (labels.fecha) metadata.fecha = labels.fecha;
    if (labels.cliente) metadata.cliente = labels.cliente;
    if (labels.factura) metadata.factura = labels.factura;
    if (labels.destino) metadata.destino = labels.destino;
    if (labels.conductor) metadata.conductor = labels.conductor;
    if (labels.placa) metadata.placa = labels.placa;
    if (labels.observaciones) metadata.observaciones = labels.observaciones;
  }

  const table = {};
  if (analysis.tableBlock) {
    table.headers = analysis.tableBlock.headers || [];
    table.rows = analysis.tableBlock.rows || [];
  } else {
    table.headers = [];
    table.rows = rawRows || [];
  }

  const documentSummary = analysis.documentSummary || {
    hasMetadata: Object.keys(metadata).length > 0,
    hasTable: table.headers.length > 0 && table.rows.length > 0,
    totalRows: (rawRows || []).length,
    totalHeaders: table.headers.length,
    metadataFieldsFound: Object.keys(metadata).length,
    tableHeadersFound: table.headers.length,
    tableRowsFound: table.rows.length,
  };

  return { metadata, table, documentSummary };
}

function normalizeSemiStructured({ rawHeaders, rawRows, canonicalFields, synonyms, fieldNormalizers, structureAnalysis }) {
  const region = structureAnalysis.sections[0];
  const tableHeaders = (rawRows || [])[region.startRow] || [];
  const tableRows = (rawRows || []).slice(region.startRow + 1, region.endRow + 1);

  const metaPre = extractMetadataRowPairs(rawRows || [], region.startRow);

  const actualHeaders = tableHeaders.map((v) => String(v ?? '').trim()).filter(Boolean);
  const matchedHeaders = buildHeaderMap(actualHeaders, canonicalFields, synonyms);
  const missingHeaders = canonicalFields.filter((f) => !matchedHeaders[f]);
  const defaultNormalizer = (v) => String(v ?? '').trim();

  const rows = tableRows.map((r) => {
    const rowObj = {};
    for (let col = 0; col < actualHeaders.length; col++) {
      rowObj[actualHeaders[col]] = r[col] !== undefined ? r[col] : '';
    }
    const record = {};
    for (const field of canonicalFields) {
      let rawValue = pickValue(rowObj, matchedHeaders[field]);
      if (!rawValue && Object.keys(metaPre).length > 0) {
        const syns = synonyms[field] || [field];
        for (const syn of syns) {
          const key = normalizeHeader(syn);
          if (metaPre[key]) { rawValue = metaPre[key]; break; }
          const found = Object.entries(metaPre).find(([k]) => k.includes(key) || key.includes(k));
          if (found) { rawValue = found[1]; break; }
        }
      }
      const normalizer = fieldNormalizers[field] || defaultNormalizer;
      record[field] = normalizer(rawValue);
    }
    return record;
  });

  const filtered = rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
  const matchedCount = Object.values(matchedHeaders).filter(Boolean).length;
  return { rows: filtered, matchedHeaders, missingHeaders, completenessScore: canonicalFields.length > 0 ? matchedCount / canonicalFields.length : 0 };
}
