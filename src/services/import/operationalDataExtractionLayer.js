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
  const aoa = [headers, ...rows];
  for (let i = 0; i < Math.min(maxScanRows, aoa.length); i++) {
    const row = (aoa[i] || []).map((v) => String(v ?? '').trim()).filter(Boolean);
    if (row.length < 3) continue;
    const map = buildHeaderMap(row, canonicalFields, fieldSynonyms);
    const hits = canonicalFields.reduce((acc, f) => acc + (map[f] ? 1 : 0), 0);
    if (hits > best.score) best = { rowIndex: i, score: hits, rowHeaders: row };
  }
  return best;
}

function getOriginalRow(aoa, rowIndex) {
  return (aoa[rowIndex] || []).map((v) => v !== undefined && v !== null ? String(v).trim() : '');
}

export function normalizeOperationalData({ parsedDocument, contract, structureAnalysis }) {
  const { canonicalFields, synonyms, fieldNormalizers = {} } = contract.documentContract || contract;
  const { rawHeaders, rawRows } = parsedDocument;

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
  return { rows: filtered, matchedHeaders, missingHeaders };
}
