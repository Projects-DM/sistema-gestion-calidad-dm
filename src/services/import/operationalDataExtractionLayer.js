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
    const labelCount = row.filter(c => c.endsWith(':')).length;
    const isLabelRow = labelCount >= Math.ceil(row.length / 2);
    if (isLabelRow) continue;
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

export function normalizeOperationalData({ parsedDocument, contract, structureAnalysis, operationalSection, relationshipModel }) {
  const { canonicalFields, synonyms, fieldNormalizers = {} } = contract.documentContract || contract;
  const { rawHeaders, rawRows } = parsedDocument;
  const relModel = relationshipModel || structureAnalysis?.relationshipModel;

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
      let rawValue = pickValue(rowObj, matchedHeaders[field]);

      if (!rawValue && relModel?.sharedFields) {
        for (const [metaKey, metaVal] of Object.entries(relModel.sharedFields)) {
          const syns = synonyms[field] || [field];
          if (syns.some(s => normalizeHeader(s) === normalizeHeader(metaKey) || normalizeHeader(s).includes(normalizeHeader(metaKey)) || normalizeHeader(metaKey).includes(normalizeHeader(s)))) {
            rawValue = metaVal;
            break;
          }
        }
      }

      const normalizer = fieldNormalizers[field] || defaultNormalizer;
      record[field] = normalizer(rawValue);
    }
    return record;
  });

  const LABEL_KEYWORDS = ['cliente:', 'vendedor', 'fecha:', 'factura:', 'nit:', 'tel:', 'direccion', 'total', 'subtotal', 'vuelto', 'saldo', 'descuento', 'cancelado', 'neto', 'iva', 'retencion', 'banco', 'consignar', 'resolucion', 'gracias', '----', 'destino'];
  const ADDRESS_PREFIXES = ['cll ', 'cr ', 'calle ', 'avenida ', 'carrera ', 'ce ', 'diagonal ', 'autopista ', 'torre ', 'km '];
  const HEADER_LABELS = ['descripcion', 'lote', 'cant.', 'cant'];

  const hasData = rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));

  const filtered = hasData.filter(r => {
    const prodField = canonicalFields.find(f => f === 'producto' || f === 'descripcion');
    const prodVal = prodField ? String(r[prodField] ?? '').trim().toLowerCase() : '';
    if (!prodVal) return false;
    if (HEADER_LABELS.includes(prodVal)) return false;
    const colonCount = (prodVal.match(/:/g) || []).length;
    if (colonCount > 0 && prodVal.length < 20) return false;
    if (LABEL_KEYWORDS.some(kw => prodVal.startsWith(kw) || prodVal.includes(kw))) return false;
    if (!isNaN(Number(prodVal.replace(/[,.]/g, ''))) && prodVal.replace(/[,.]/g, '').length > 2) return false;
    if (ADDRESS_PREFIXES.some(p => prodVal.startsWith(p))) return false;
    if (/\d{7,}/.test(prodVal) && /[-–]/.test(prodVal)) return false;
    if (prodVal.replace(/[^a-záéíóúñ]/g, '').length < 2) return false;
    return true;
  });
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

  const discarded = records.filter(r => !filtered.includes(r));
  const discardReasons = [];
  for (const r of discarded) {
    for (const f of r._missingFields) {
      discardReasons.push(`${f} vacío.`);
    }
  }

  const recordBuilderDiagnostics = {
    constructedRecords: filtered.length,
    discardedRecords: records.length - filtered.length,
    discardReasons: [...new Set(discardReasons)],
    completenessScore: filtered.length > 0
      ? Math.round(filtered.reduce((s, r) => s + r._completeness, 0) / filtered.length)
      : 0,
    status: filtered.length > 0 ? 'OK' : 'FAILED',
  };

  return { records: filtered, totalBuilt: records.length, totalFiltered: filtered.length, recordBuilderDiagnostics };
}



export function buildDocumentRecords({ rawRows, rawHeaders, documentPattern, operationalRegion }) {
  const allRows = rawRows || [];
  const pattern = documentPattern || {};

  const rows = operationalRegion && allRows.length
    ? allRows.slice(operationalRegion.startRow, operationalRegion.endRow + 1)
    : allRows;

  if (!rows.length) return { records: [], totalRecords: 0 };

  const records = [];

  if (pattern.type === 'TABULAR' || pattern.type === 'MULTI_TABLE' || pattern.type === 'MIXED_DOCUMENT') {
    const startRow = pattern.recordPattern?.recordStartsAt || 0;
    const endRow = pattern.recordPattern?.recordEndsAt || (rows.length - 1);
    for (let i = startRow; i <= endRow && i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.some(c => String(c ?? '').trim() !== '')) {
        records.push({ rawRecord: row.map(c => String(c ?? '').trim()), pattern: pattern.type, recordIndex: records.length });
      }
    }
  } else if (pattern.type === 'REPEATING_GROUP') {
    const cycle = pattern.repeatingStructures?.[0]?.cycle || pattern.recordPattern?.recordSize || 1;
    for (let i = 0; i + cycle <= rows.length; i += cycle) {
      const group = rows.slice(i, i + cycle);
      const rawRecord = [];
      for (const row of group) {
        for (const cell of row) {
          if (String(cell ?? '').trim()) rawRecord.push(String(cell).trim());
        }
      }
      records.push({ rawRecord, pattern: 'REPEATING_GROUP', recordIndex: records.length, groupStartRow: i, groupSize: cycle });
    }
  } else if (pattern.type === 'HIERARCHICAL') {
    const startRow = pattern.recordPattern?.recordStartsAt || 0;
    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.some(c => String(c ?? '').trim() !== '')) {
        records.push({ rawRecord: row.map(c => String(c ?? '').trim()), pattern: 'HIERARCHICAL', recordIndex: records.length });
      }
    }
  } else if (pattern.type === 'ERP_EXPORT') {
    let current = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || [];
      const filled = row.filter(c => String(c ?? '').trim() !== '');
      if (filled.length === 0 && current.length > 0) {
        records.push({ rawRecord: [...current], pattern: 'ERP_EXPORT', recordIndex: records.length });
        current = [];
      } else if (filled.length > 0) {
        for (const cell of row) {
          const v = String(cell ?? '').trim();
          if (v) current.push(v);
        }
      }
    }
    if (current.length > 0) {
      records.push({ rawRecord: [...current], pattern: 'ERP_EXPORT', recordIndex: records.length });
    }
  } else {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || [];
      if (row.some(c => String(c ?? '').trim() !== '')) {
        records.push({ rawRecord: row.map(c => String(c ?? '').trim()), pattern: pattern.type || 'TABULAR', recordIndex: records.length });
      }
    }
  }

  return { records, totalRecords: records.length };
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
