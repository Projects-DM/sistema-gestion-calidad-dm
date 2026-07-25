const KNOWN_META_LABELS = [
  ['fecha', 'fec', 'date', 'fecha despacho', 'fecha salida'],
  ['cliente', 'razon social', 'razon', 'comprador', 'cliente destino'],
  ['destino', 'direccion', 'dir', 'ciudad', 'bodega', 'punto entrega'],
  ['conductor', 'chofer', 'driver', 'transportista'],
  ['placa', 'vehiculo', 'camion', 'vehicle', 'license plate'],
  ['factura', 'nro factura', 'numero factura', 'factura nro', 'doc number', 'invoice'],
  ['observaciones', 'obs', 'notas', 'comentarios', 'observacion'],
  ['producto', 'descripcion', 'articulo', 'item', 'material', 'sku'],
  ['lote', 'batch', 'numero lote', 'lote prod'],
  ['temperatura', 'temp', 'temperatura producto', 'temp carga'],
  ['cantidad', 'cant', 'cant bolsas', 'cantidad bolsas', 'qty'],
];

function countNonEmpty(row) {
  return row.filter(c => String(c ?? '').trim() !== '').length;
}

function collectColumnStats(rows) {
  const colCounts = rows.map(r => r.length);
  const total = rows.length || 1;
  const avg = colCounts.reduce((a, b) => a + b, 0) / total;
  const variance = colCounts.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / total;
  return { totalRows: rows.length, avgCols: avg, stdDev: Math.sqrt(variance), minCols: Math.min(...colCounts), maxCols: Math.max(...colCounts) };
}

function detectMetadataBlock(rows, sections) {
  if (!sections || sections.length === 0) return null;
  const endRow = sections[0].startRow;
  if (endRow <= 0) return null;
  return { startRow: 0, endRow: endRow - 1 };
}

function detectTableBlock(rows, sections) {
  if (!sections || sections.length === 0) {
    if (rows.length > 0) {
      return { startRow: 0, endRow: rows.length - 1, headers: [], rows, columns: rows[0]?.length || 0 };
    }
    return null;
  }
  const sorted = [...sections].sort((a, b) => b.rowCount - a.rowCount);
  for (const section of sorted) {
    const headerRow = rows[section.startRow] || [];
    const nonEmpty = headerRow.filter(h => String(h ?? '').trim() !== '');
    const labelCount = nonEmpty.filter(c => String(c).trim().endsWith(':')).length;
    const isLabelRow = labelCount >= Math.ceil(nonEmpty.length / 2);
    if (!isLabelRow && nonEmpty.length >= 2) {
      const dataRows = rows.slice(section.startRow + 1, section.endRow + 1);
      return { startRow: section.startRow, endRow: section.endRow, headers: nonEmpty, rows: dataRows, columns: headerRow.length };
    }
  }
  const fall = sorted[0];
  return { startRow: fall.startRow, endRow: fall.endRow, headers: [], rows: rows.slice(fall.startRow, fall.endRow + 1), columns: 0 };
}

const FINANCIAL_KEYWORDS = ['iva', 'subtotal', 'sub total', 'total', 'saldo', 'retencion', 'retefuente', 'reteiva', 'pago', 'neto', 'descuento', 'banco', 'bancolombia', 'precio', 'moneda', 'valor unitario', 'valor total', 'total factura', 'monto', 'cancelado', 'metodo pago', 'forma pago'];
const ADMIN_KEYWORDS = ['nit', 'resolucion', 'resolucion dian', 'direccion', 'sede', 'ciudad', 'telefono', 'correo', 'email', 'web', ' regimen'];
const COMMERCIAL_KEYWORDS = ['logo', 'empresa', 'compañia', 'compania', 'comercial', 'razon social', 'nombre comercial'];
const OPERATIONAL_KEYWORDS = ['fecha', 'cliente', 'destino', 'conductor', 'placa', 'factura', 'observaciones', 'despacho', 'hora', 'vehiculo', 'camion', 'transportista', 'firma', 'chofer'];

function normalizeText(str) {
  return String(str ?? '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function classifyRowContent(row) {
  const text = row.map(c => normalizeText(c)).join(' ').trim();
  if (!text) return null;
  let scores = { financiero: 0, administrativo: 0, comercial: 0, operacional: 0 };
  for (const kw of FINANCIAL_KEYWORDS) { if (text.includes(kw)) scores.financiero++; }
  for (const kw of ADMIN_KEYWORDS) { if (text.includes(kw)) scores.administrativo++; }
  for (const kw of COMMERCIAL_KEYWORDS) { if (text.includes(kw)) scores.comercial++; }
  for (const kw of OPERATIONAL_KEYWORDS) { if (text.includes(kw)) scores.operacional++; }
  let best = 'ignorable', bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) { best = type; bestScore = score; }
  }
  return { type: best === 'ignorable' ? 'ignorable' : best, score: bestScore, text };
}

function segmentDocument(rows, sections, discoveredMetadata) {
  const operationalSection = { rows: [], metadata: {}, headers: [] };
  const administrativeSection = { rows: [], metadata: {} };
  const financialSection = { rows: [], metadata: {} };
  const ignoredSections = [];

  const allSections = [];

  if (sections && sections.length > 0 && sections[0].startRow > 0) {
    allSections.push({ startRow: 0, endRow: sections[0].startRow - 1, source: 'pre_table' });
  }

  for (const section of sections || []) {
    allSections.push({ startRow: section.startRow, endRow: section.endRow, source: 'table' });
  }

  if (sections && sections.length > 0) {
    const lastEnd = sections[sections.length - 1].endRow;
    if (lastEnd < rows.length - 1) {
      allSections.push({ startRow: lastEnd + 1, endRow: rows.length - 1, source: 'post_table' });
    }
  }

  if (allSections.length === 0 && rows.length > 0) {
    allSections.push({ startRow: 0, endRow: rows.length - 1, source: 'full_document' });
  }

  for (const section of allSections) {
    const sectionRows = rows.slice(section.startRow, section.endRow + 1);
    const textContent = sectionRows.map(r => r.join(' ')).join(' ').toLowerCase();

    let finScore = 0, admScore = 0, comScore = 0, opeScore = 0;
    for (const kw of FINANCIAL_KEYWORDS) { if (textContent.includes(kw)) finScore++; }
    for (const kw of ADMIN_KEYWORDS) { if (textContent.includes(kw)) admScore++; }
    for (const kw of COMMERCIAL_KEYWORDS) { if (textContent.includes(kw)) comScore++; }
    for (const kw of OPERATIONAL_KEYWORDS) { if (textContent.includes(kw)) opeScore++; }

    const isOperational = opeScore > 0 && (section.source === 'table' || section.source === 'full_document' || opeScore >= Math.max(finScore, admScore, comScore));
    const isFinancial = finScore > 0 && finScore > opeScore && section.source !== 'table' && section.source !== 'full_document';
    const isAdmin = admScore > 0 && admScore > opeScore && section.source !== 'table' && section.source !== 'full_document';
    const isCommercial = comScore > 0 && comScore > opeScore && section.source !== 'table' && section.source !== 'full_document';

    const sectionMeta = {};
    for (let i = 0; i < Math.min(sectionRows.length, 50); i++) {
      const row = sectionRows[i] || [];
      for (let j = 0; j < row.length - 1; j++) {
        const label = String(row[j] ?? '').trim().toLowerCase();
        const value = String(row[j + 1] ?? '').trim();
        if (!value || isFormatPlaceholder(value)) continue;
        for (const group of KNOWN_META_LABELS) {
          if (group.some(g => g === label || label.startsWith(g))) {
            sectionMeta[group[0]] = value;
          }
        }
      }
    }

    if (isOperational) {
      operationalSection.rows.push(...sectionRows);
      Object.assign(operationalSection.metadata, sectionMeta);
    } else if (isFinancial) {
      financialSection.rows.push(...sectionRows);
      Object.assign(financialSection.metadata, sectionMeta);
    } else if (isAdmin) {
      administrativeSection.rows.push(...sectionRows);
      Object.assign(administrativeSection.metadata, sectionMeta);
    } else {
      ignoredSections.push({ rows: sectionRows, reason: isCommercial ? 'información comercial' : 'información no clasificada' });
    }
  }

  for (let i = 0; i < Math.min(operationalSection.rows.length, 10); i++) {
    const nonEmpty = operationalSection.rows[i].filter(c => String(c ?? '').trim());
    if (nonEmpty.length >= 2) {
      operationalSection.headers = operationalSection.rows[i].filter(c => String(c ?? '').trim());
      break;
    }
  }

  return { operationalSection, administrativeSection, financialSection, ignoredSections };
}

function resolveOperationalRelationships(operationalSection, discoveredMetadata) {
  const opMeta = operationalSection?.metadata || {};
  const docMeta = discoveredMetadata || {};

  const sharedFields = {};
  for (const [key, value] of Object.entries(docMeta)) {
    if (value) sharedFields[key] = value;
  }
  for (const [key, value] of Object.entries(opMeta)) {
    if (value) sharedFields[key] = value;
  }

  const headers = operationalSection?.headers || [];
  const dataRows = (operationalSection?.rows || []).slice(1).filter(r => r.some(c => String(c ?? '').trim() !== ''));

  const repeatingCandidates = ['producto', 'lote', 'cantidad', 'temperatura', 'peso', 'cant bolsas', 'cantidad bolsas'];
  const repeatingFields = [];
  if (headers.length > 0) {
    const headerLabels = headers.map(h => normalizeText(h));
    for (const candidate of repeatingCandidates) {
      const norm = normalizeText(candidate);
      for (let i = 0; i < headerLabels.length; i++) {
        if (headerLabels[i] === norm || headerLabels[i].includes(norm) || norm.includes(headerLabels[i])) {
          repeatingFields.push({ field: candidate, header: headers[i], index: i });
          break;
        }
      }
    }
  }

  const fieldCounts = {};
  for (const rf of repeatingFields) {
    const values = new Set(dataRows.map(r => String(r[rf.index] ?? '').trim()).filter(Boolean));
    fieldCounts[rf.field] = values.size;
  }

  return {
    sharedFields,
    repeatingFields: repeatingFields.map(rf => rf.field),
    headerMap: repeatingFields.reduce((acc, rf) => { acc[rf.field] = rf.header; return acc; }, {}),
    fieldCounts,
    estimatedRecords: dataRows.length || 0,
    hierarchy: {
      shared: Object.keys(sharedFields),
      repeating: repeatingFields.map(rf => rf.field),
    },
  };
}

function detectSparseFirstRow(rows) {
  if (!rows.length) return false;
  return countNonEmpty(rows[0]) <= 2;
}

function detectLabelPatternRatio(rows) {
  let labelCount = 0, checked = 0;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const v = String(rows[i]?.[0] ?? '').trim();
    if (v) { checked++; if (v.endsWith(':')) labelCount++; }
  }
  return checked > 0 ? labelCount / checked : 0;
}

function countSectionHeaders(rows) {
  let n = 0;
  for (const r of rows) {
    const c = countNonEmpty(r);
    if (c === 1) { const v = String(r[0] ?? '').trim(); if (v.length > 1 && v.length < 80) n++; }
  }
  return n;
}

function countEmptyRows(rows) {
  return rows.filter(r => countNonEmpty(r) === 0).length;
}

function checkHeaderQuality(rawHeaders) {
  if (!rawHeaders || rawHeaders.length < 2) return false;
  const nonEmpty = rawHeaders.filter(h => String(h ?? '').trim() !== '');
  if (nonEmpty.length < 2) return false;
  const labels = nonEmpty.filter(h => String(h).trim().endsWith(':')).length;
  return labels / nonEmpty.length < 0.3;
}

function extractTableRegions(rows) {
  const regions = [];
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    const nonEmpty = countNonEmpty(rows[i]);
    const rowLabels = (rows[i] || []).filter(c => String(c ?? '').trim().endsWith(':')).length;
    const isLabelRow = rowLabels >= Math.ceil(nonEmpty / 2) && nonEmpty >= 2;
    const isTableRow = nonEmpty >= 3 && !isLabelRow;
    if (isTableRow) { if (start === -1) start = i; }
    else if (start !== -1) { if (i - start >= 3) regions.push({ startRow: start, endRow: i - 1, rowCount: i - start }); start = -1; }
  }
  if (start !== -1 && rows.length - start >= 3) regions.push({ startRow: start, endRow: rows.length - 1, rowCount: rows.length - start });
  return regions;
}

function multiCellFirstRow(rows) {
  if (!rows.length) return false;
  return countNonEmpty(rows[0]) >= 3;
}

function detectSequentialFirstCol(rows) {
  const vals = rows.slice(0, 20).map(r => parseInt(r[0], 10)).filter(n => !isNaN(n));
  if (vals.length < 5) return 0;
  const sorted = [...new Set(vals)].sort((a, b) => a - b);
  let seq = 1, maxSeq = 1;
  for (let i = 1; i < sorted.length; i++) { if (sorted[i] === sorted[i - 1] + 1) { seq++; maxSeq = Math.max(maxSeq, seq); } else seq = 1; }
  return maxSeq;
}

function dataDensityScore(rows) {
  let filled = 0, total = 0;
  for (const r of rows) { for (const c of r) { total++; if (String(c ?? '').trim()) filled++; } }
  return total > 0 ? filled / total : 0;
}

function normalizeLabel(str) {
  return str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function isFormatPlaceholder(v) {
  const s = String(v ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return false;
  if (s === 'dd/mm/aaaa' || s === 'dd-mm-aaaa' || s === 'ddmmaaaa') return true;
  if (s === 'aaaa/mm/dd' || s === 'aaaa-mm-dd' || s === 'aaaammdd') return true;
  if (s === '--:--' || s === '--:-----' || s === '--:----') return true;
  if (s === 'hh:mm' || s === 'hh:mm:ss') return true;
  if (/^_+$/.test(s)) return true;
  return false;
}

function extractAllMetadata(rows) {
  const meta = {};
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] ?? '').trim();
      if (!cell) continue;
      const norm = normalizeLabel(cell);
      for (const group of KNOWN_META_LABELS) {
        if (group.some(g => norm === g || norm.startsWith(g) || norm.includes(g))) {
          const value = String(row[j + 1] ?? '').trim();
          const valueNext = String(row[j + 2] ?? '').trim();
          if (value && !value.endsWith(':') && !group.includes(normalizeLabel(value)) && !isFormatPlaceholder(value)) {
            meta[group[0]] = value;
          } else if (valueNext && !valueNext.endsWith(':') && !group.includes(normalizeLabel(valueNext)) && !isFormatPlaceholder(valueNext)) {
            meta[group[0]] = valueNext;
          }
        }
      }
      if (norm.endsWith(':') && j + 1 < row.length) {
        const val = String(row[j + 1] ?? '').trim();
        if (val && !isFormatPlaceholder(val)) {
          const key = norm.replace(/:$/, '').trim();
          if (key) meta[key] = val;
        }
      }
    }
  }
  return meta;
}

export function analyzeDocumentStructure({ rawRows, rawHeaders, textContent, fileType }) {
  const rows = rawRows || [];
  if (!rows.length) {
    return { documentType: 'TABULAR', confidence: 0.5, signals: {}, sections: [], metadata: {}, recommendation: 'empty_default' };
  }

  const stats = collectColumnStats(rows);
  const sparseFirst = detectSparseFirstRow(rows);
  const multiCellFirst = multiCellFirstRow(rows);
  const labelRatio = detectLabelPatternRatio(rows);
  const sectionHeaders = countSectionHeaders(rows);
  const emptyRows = countEmptyRows(rows);
  const goodHeaders = checkHeaderQuality(rawHeaders);
  const sequential = detectSequentialFirstCol(rows);
  const density = dataDensityScore(rows);

  let tabular = 0, semi = 0;

  if (stats.stdDev < 0.8) tabular += 20;
  else if (stats.stdDev > 2) semi += 15;

  if (sparseFirst) semi += 20;
  else if (multiCellFirst) tabular += 15;

  if (labelRatio > 0.3) semi += 25;
  else if (labelRatio < 0.1) tabular += 10;

  if (sectionHeaders > rows.length * 0.08) semi += 15;
  else tabular += 5;

  if (emptyRows > 2) semi += 10;
  else if (emptyRows === 0) tabular += 5;

  if (goodHeaders) tabular += 15;
  else semi += 10;

  if (stats.avgCols <= 2 && stats.totalRows > 5) semi += 15;
  else if (stats.avgCols >= 3) tabular += 10;

  if (sequential >= 5) tabular += 20;
  if (density > 0.6) tabular += 10;
  else if (density < 0.3) semi += 10;

  const total = tabular + semi;
  const isSemi = semi > tabular;
  const confidence = total > 0 ? Math.max(tabular, semi) / total : 0.5;

  const sections = isSemi || (confidence > 0.55 && semi > tabular * 0.6) ? extractTableRegions(rows) : [];
  const mappedSections = sections.map((s, i) => ({ ...s, id: `table_${i + 1}`, type: 'data_table' }));

  const discoveredMetadata = extractAllMetadata(rows);
  const metadataBlockInfo = detectMetadataBlock(rows, sections);
  const tableBlockInfo = detectTableBlock(rows, sections);

  const documentSegments = segmentDocument(rows, sections, discoveredMetadata);
  const relationshipModel = resolveOperationalRelationships(documentSegments?.operationalSection, discoveredMetadata);

  const analysisDiagnostics = {
    metadataFound: Object.keys(discoveredMetadata).length,
    tablesFound: sections.length,
    headersFound: !!(tableBlockInfo && tableBlockInfo.headers.length > 0),
    confidence: Math.round(confidence * 100) / 100,
    status: tableBlockInfo && tableBlockInfo.rows.length > 0 ? 'OK' : Object.keys(discoveredMetadata).length > 0 ? 'WARNING' : 'FAILED',
  };

  const segmentationDiagnostics = {
    operationalRows: documentSegments?.operationalSection?.rows?.length || 0,
    administrativeRows: documentSegments?.administrativeSection?.rows?.length || 0,
    financialRows: documentSegments?.financialSection?.rows?.length || 0,
    ignoredRows: (documentSegments?.ignoredSections || []).reduce((s, sec) => s + (sec.rows?.length || 0), 0),
    status: (documentSegments?.operationalSection?.rows?.length || 0) > 0 ? 'OK' : 'WARNING',
  };

  const tableConfidence = tableBlockInfo ? Math.round(
    (density * 0.4 +
      (tableBlockInfo.headers.length > 0 ? Math.min(tableBlockInfo.headers.length / 10, 1) * 0.3 : 0) +
      (tableBlockInfo.rows.length > 0 ? Math.min(tableBlockInfo.rows.length / 50, 1) * 0.3 : 0)
    ) * 100) / 100 : 0;

  const metadataConfidence = Object.keys(discoveredMetadata).length > 0 ? Math.round(
    (Math.min(Object.keys(discoveredMetadata).length / 7, 1) * 0.6 +
      (labelRatio > 0.3 ? 0.4 : labelRatio > 0.15 ? 0.2 : 0))
    * 100) / 100 : 0;

  const recordConfidence = Math.round(
    (tableConfidence * 0.6 + metadataConfidence * 0.4)
  ) * 100 / 100;

  const documentSummary = {
    hasMetadata: metadataBlockInfo !== null && Object.keys(discoveredMetadata).length > 0,
    hasTable: tableBlockInfo !== null && tableBlockInfo.rows.length > 0,
    totalRows: rows.length,
    totalHeaders: tableBlockInfo ? tableBlockInfo.headers.length : 0,
    metadataFieldsFound: Object.keys(discoveredMetadata).length,
    tableHeadersFound: tableBlockInfo ? tableBlockInfo.headers.length : 0,
    tableRowsFound: tableBlockInfo ? tableBlockInfo.rows.length : 0,
    tableConfidence,
    metadataConfidence,
    recordConfidence,
  };

  const documentAnatomy = analyzeDocumentAnatomy({ rows, segments: documentSegments, sections, discoveredMetadata });
  const operationalRegion = resolveOperationalRegion({ anatomy: documentAnatomy });
  const operationalRows = operationalRegion ? rows.slice(operationalRegion.startRow, operationalRegion.endRow + 1) : [];
  const operationalHeaders = detectOperationalHeaders({ rows, operationalRegion });
  const documentPattern = recognizeDocumentPattern({ rawRows: operationalRows.length ? operationalRows : rows, rawHeaders, structureAnalysis: { stats, signals: { tabularScore: tabular, semiStructuredScore: semi, columnStdDev: Math.round(stats.stdDev * 10) / 10, avgColumns: Math.round(stats.avgCols * 10) / 10, labelRatio: Math.round(labelRatio * 100) / 100, sparseFirstRow: sparseFirst, sectionHeaderCount: sectionHeaders, emptyRowCount: emptyRows, dataDensity: Math.round(density * 100) / 100, sequentialFirstCol: sequential }, sections: mappedSections, documentSegments, relationshipModel, tableBlock: tableBlockInfo }, operationalRegion });

  const anatomyConfidence = operationalRegion ? 100 : 0;
  const pipelineConfidence = Math.round(
    ((analysisDiagnostics.confidence || 0) * 100 * 0.15 +
     anatomyConfidence * 0.20 +
     (operationalRegion ? 100 : 0) * 0.25 +
     (documentPattern?.confidence || 0) * 0.25 +
     (documentSummary?.recordConfidence || 0) * 0.15)
  ) / 100;

  return {
    documentType: isSemi ? 'SEMI_STRUCTURED' : 'TABULAR',
    confidence: Math.round(confidence * 100) / 100,
    signals: {
      tabularScore: tabular,
      semiStructuredScore: semi,
      columnStdDev: Math.round(stats.stdDev * 10) / 10,
      avgColumns: Math.round(stats.avgCols * 10) / 10,
      labelRatio: Math.round(labelRatio * 100) / 100,
      sparseFirstRow: sparseFirst,
      sectionHeaderCount: sectionHeaders,
      emptyRowCount: emptyRows,
      dataDensity: Math.round(density * 100) / 100,
      sequentialFirstCol: sequential,
    },
    sections: mappedSections,
    metadata: {
      totalRows: rows.length,
      totalColumns: stats.maxCols,
      discoveredLabels: Object.keys(discoveredMetadata).length > 0 ? discoveredMetadata : undefined,
    },
    hasMetadataBlock: Object.keys(discoveredMetadata).length > 0,
    recommendation: isSemi ? 'section_aware' : 'standard',
    metadataBlock: metadataBlockInfo ? { startRow: metadataBlockInfo.startRow, endRow: metadataBlockInfo.endRow, fields: discoveredMetadata } : null,
    tableBlock: tableBlockInfo,
    documentSummary,
    documentSegments,
    relationshipModel,
    analysisDiagnostics,
    segmentationDiagnostics,
    documentPattern,
    documentAnatomy,
    operationalRegion,
    operationalHeaders,
    pipelineConfidence,
  };
}

export function analyzeDocumentAnatomy({ rows, segments, sections, discoveredMetadata }) {
  const regions = [];

  const segs = segments || {};
  const metaKeys = Object.keys(discoveredMetadata || {});

  const metadataRows = metaKeys.length > 0 ? (segs?.operationalSection?.rows?.length > 0 ? Math.min(segs.operationalSection.rows.length, 18) : 0) : 0;
  const opRows = segs?.operationalSection?.rows?.length || 0;
  const finRows = segs?.financialSection?.rows?.length || 0;
  const admRows = segs?.administrativeSection?.rows?.length || 0;

  if (rows.length === 0) return { regions: [], totalRegions: 0 };

  let currentStart = 0;

  if (metaKeys.length > 0 && opRows > 0) {
    const metaEnd = Math.min(currentStart + metadataRows, rows.length - 1);
    if (metaEnd >= currentStart) {
      regions.push({ type: 'metadata', startRow: currentStart, endRow: metaEnd, processable: false, containsRecords: false });
      currentStart = metaEnd + 1;
    }
  }

  if (opRows > 0) {
    const opEnd = Math.min(currentStart + opRows - 1, rows.length - 1);
    if (opEnd >= currentStart) {
      regions.push({ type: 'operational', startRow: currentStart, endRow: opEnd, processable: true, containsRecords: true });
      currentStart = opEnd + 1;
    }
  }

  if (finRows > 0) {
    const finEnd = Math.min(currentStart + finRows - 1, rows.length - 1);
    if (finEnd >= currentStart) {
      regions.push({ type: 'financial', startRow: currentStart, endRow: finEnd, processable: false, containsRecords: false });
      currentStart = finEnd + 1;
    }
  }

  if (admRows > 0) {
    const admEnd = Math.min(currentStart + admRows - 1, rows.length - 1);
    if (admEnd >= currentStart) {
      regions.push({ type: 'administrative', startRow: currentStart, endRow: admEnd, processable: false, containsRecords: false });
      currentStart = admEnd + 1;
    }
  }

  if (currentStart < rows.length) {
    regions.push({ type: 'footer', startRow: currentStart, endRow: rows.length - 1, processable: false, containsRecords: false });
  }

  const totalRowsAccounted = regions.reduce((s, r) => s + (r.endRow - r.startRow + 1), 0);
  if (totalRowsAccounted < rows.length) {
    regions.push({ type: 'mixed', startRow: totalRowsAccounted, endRow: rows.length - 1, processable: false, containsRecords: false });
  }

  return { regions, totalRegions: regions.length };
}

export function resolveOperationalRegion({ anatomy }) {
  if (!anatomy?.regions) return null;
  const region = anatomy.regions.find(r => r.type === 'operational' && r.containsRecords);
  if (!region) return null;
  return {
    startRow: region.startRow,
    endRow: region.endRow,
    rowCount: region.endRow - region.startRow + 1,
    containsRecords: true,
    confidence: 100,
  };
}

export function detectOperationalHeaders({ rows, operationalRegion }) {
  if (!operationalRegion || !rows?.length) {
    return { headers: [], headerRow: -1, columnCount: 0, confidence: 0 };
  }

  const regionRows = rows.slice(operationalRegion.startRow, operationalRegion.endRow + 1);
  if (!regionRows.length) return { headers: [], headerRow: -1, columnCount: 0, confidence: 0 };

  for (let i = 0; i < Math.min(regionRows.length, 5); i++) {
    const row = regionRows[i] || [];
    const nonEmpty = row.filter(c => String(c ?? '').trim() !== '');
    if (nonEmpty.length >= 2) {
      const labelEndings = nonEmpty.filter(c => String(c).trim().endsWith(':')).length;
      const isLabelRow = labelEndings >= Math.ceil(nonEmpty.length / 2);
      if (!isLabelRow) {
        const allShort = nonEmpty.every(c => String(c).trim().length < 40);
        const confidence = allShort ? Math.min(80 + nonEmpty.length * 3, 98) : 60;
        return {
          headers: nonEmpty.map(c => String(c).trim()),
          headerRow: operationalRegion.startRow + i,
          columnCount: nonEmpty.length,
          confidence,
        };
      }
    }
  }

  return { headers: [], headerRow: -1, columnCount: 0, confidence: 0 };
}

function countFilledCells(row) {
  return row.filter(c => String(c ?? '').trim() !== '').length;
}

function detectGroupCycle(rows, maxCycle = 6) {
  if (rows.length < maxCycle * 2) return null;
  const fillCounts = rows.slice(0, 60).map(r => countFilledCells(r));
  for (let cycle = 2; cycle <= maxCycle; cycle++) {
    let matches = 0;
    for (let i = 0; i < fillCounts.length - cycle; i++) {
      if (fillCounts[i] === fillCounts[i + cycle]) matches++;
    }
    const rate = matches / (fillCounts.length - cycle);
    if (rate > 0.65) return { cycle, confidence: rate };
  }
  return null;
}

function detectGroupDelimiters(rows) {
  const groups = [];
  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    const c = countFilledCells(rows[i]);
    if (c >= 3 && start === -1) start = i;
    else if (c <= 2 && start !== -1) {
      if (i - start >= 2) groups.push({ startRow: start, endRow: i - 1, rowCount: i - start });
      start = -1;
    }
  }
  if (start !== -1 && rows.length - start >= 2) groups.push({ startRow: start, endRow: rows.length - 1, rowCount: rows.length - start });
  return groups;
}

function hasSequentialNumbers(rows) {
  let seqCount = 0;
  for (let i = 1; i < Math.min(rows.length, 30); i++) {
    const a = parseInt(rows[i - 1]?.[0], 10);
    const b = parseInt(rows[i]?.[0], 10);
    if (!isNaN(a) && !isNaN(b) && b === a + 1) seqCount++;
  }
  return seqCount >= 5;
}

export function recognizeDocumentPattern({ rawRows, rawHeaders, structureAnalysis, operationalRegion }) {
  const rows = rawRows || [];
  if (!rows.length) return { type: 'TABULAR', confidence: 0, recordPattern: null, documentGroups: [], repeatingStructures: [], documentSections: [] };
  const regionOffset = operationalRegion?.startRow || 0;

  const signals = structureAnalysis?.signals || {};
  const sections = structureAnalysis?.sections || [];
  const segments = structureAnalysis?.documentSegments || {};
  const relModel = structureAnalysis?.relationshipModel || {};
  const tableBlock = structureAnalysis?.tableBlock;
  const stats = { avgCols: signals.avgColumns || 0, stdDev: signals.columnStdDev || 0, totalRows: rows.length };

  const hasMultipleSections = sections.length > 1;
  const hasMetadata = signals.labelRatio > 0.15;
  const hasTableHeaders = tableBlock && tableBlock.headers && tableBlock.headers.length >= 2;
  const opsRows = segments?.operationalSection?.rows?.length || 0;
  const finRows = segments?.financialSection?.rows?.length || 0;
  const admRows = segments?.administrativeSection?.rows?.length || 0;
  const hasDiverseContent = finRows > 0 || admRows > 0;
  const isSingleColumn = stats.avgCols <= 2.5;
  const hasRepeating = (relModel?.repeatingFields?.length || 0) > 0;
  const hasShared = Object.keys(relModel?.sharedFields || {}).length > 0;

  const groupCycle = detectGroupCycle(rows);
  const groupDelimiters = detectGroupDelimiters(rows);
  const sequential = hasSequentialNumbers(rows);
  const density = signals.dataDensity || 0;

  const candidates = [];

  // ERP_EXPORT: single column, label:value pairs, or single-column sequential data
  if (isSingleColumn && (signals.labelRatio > 0.2 || sequential)) {
    const erpConf = Math.round((signals.labelRatio * 50 + (sequential ? 30 : 0) + (stats.avgCols <= 2 ? 20 : 0)) * 100) / 100;
    candidates.push({ type: 'ERP_EXPORT', confidence: Math.min(erpConf, 99) });
  }

  // HIERARCHICAL: shared fields + repeating fields, moderate columns
  if (hasShared && hasRepeating && opsRows > 0) {
    const hierConf = Math.round(((hasShared ? 30 : 0) + (hasRepeating ? 30 : 0) + (opsRows > 5 ? 20 : 0) + (density > 0.4 ? 20 : 0)) * 100) / 100;
    candidates.push({ type: 'HIERARCHICAL', confidence: Math.min(hierConf, 99) });
  }

  // REPEATING_GROUP: detected cycle or group delimiters with multi-row groups
  if (groupCycle || (groupDelimiters.length > 0 && groupDelimiters.some(g => g.rowCount > 1))) {
    const cycle = groupCycle?.cycle || 1;
    const cycleConf = groupCycle ? groupCycle.confidence * 60 : 0;
    const delimConf = groupDelimiters.filter(g => g.rowCount > 1).length * 20;
    candidates.push({ type: 'REPEATING_GROUP', confidence: Math.min(Math.round((cycleConf + delimConf + (density > 0.3 ? 20 : 0)) * 100) / 100, 99) });
  }

  // TABULAR: consistent columns, good headers, high density
  if (hasTableHeaders || (stats.stdDev < 0.8 && stats.avgCols >= 3 && density > 0.5)) {
    const tabConf = Math.round(((hasTableHeaders ? 30 : 0) + (stats.stdDev < 0.8 ? 25 : 0) + (density > 0.5 ? 25 : 0) + (stats.avgCols >= 3 ? 20 : 0)) * 100) / 100;
    candidates.push({ type: 'TABULAR', confidence: Math.min(tabConf, 99) });
  }

  // MULTI_TABLE: multiple table regions detected
  if (hasMultipleSections && sections.filter(s => s.type === 'data_table').length >= 2) {
    const mtConf = Math.round((sections.filter(s => s.type === 'data_table').length * 25 + (hasDiverseContent ? 20 : 0) + 20) * 100) / 100;
    candidates.push({ type: 'MULTI_TABLE', confidence: Math.min(mtConf, 95) });
  }

  // MIXED_DOCUMENT: has metadata + table + other sections
  if (hasMetadata && hasDiverseContent && (hasTableHeaders || stats.avgCols >= 3)) {
    const mixConf = Math.round(((hasMetadata ? 25 : 0) + (hasDiverseContent ? 30 : 0) + (hasTableHeaders ? 25 : 0) + 20) * 100) / 100;
    candidates.push({ type: 'MIXED_DOCUMENT', confidence: Math.min(mixConf, 95) });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) {
    candidates.push({ type: 'TABULAR', confidence: 30 });
  }

  const best = candidates[0];

  // Build recordPattern (offsets are relative to the full document when region is provided)
  let recordStartsAt = -1;
  let recordEndsAt = -1;
  let recordSize = 1;
  let estimatedRecords = 0;

  if (best.type === 'TABULAR' && tableBlock) {
    recordStartsAt = tableBlock.startRow + regionOffset;
    recordEndsAt = tableBlock.endRow + regionOffset;
    recordSize = tableBlock.columns || Math.round(stats.avgCols);
    estimatedRecords = tableBlock.rows?.length || rows.length;
  } else if (best.type === 'REPEATING_GROUP' && groupCycle) {
    recordSize = groupCycle.cycle;
    estimatedRecords = Math.floor(rows.length / recordSize);
    recordStartsAt = regionOffset;
    recordEndsAt = regionOffset + rows.length - 1;
  } else if (best.type === 'REPEATING_GROUP' && groupDelimiters.length > 0) {
    recordStartsAt = groupDelimiters[0].startRow + regionOffset;
    recordEndsAt = groupDelimiters[groupDelimiters.length - 1].endRow + regionOffset;
    estimatedRecords = groupDelimiters.length;
  } else if (best.type === 'HIERARCHICAL') {
    recordStartsAt = regionOffset;
    recordEndsAt = regionOffset + rows.length - 1;
    recordSize = (relModel?.repeatingFields?.length || 1) + Object.keys(relModel?.sharedFields || {}).length;
    estimatedRecords = relModel?.estimatedRecords || rows.length;
  } else if (best.type === 'ERP_EXPORT') {
    recordStartsAt = regionOffset;
    recordEndsAt = regionOffset + rows.length - 1;
    recordSize = Math.round(stats.avgCols);
    estimatedRecords = Math.ceil(rows.length / 5);
  } else {
    recordStartsAt = regionOffset;
    recordEndsAt = regionOffset + rows.length - 1;
    recordSize = Math.round(stats.avgCols) || 1;
    estimatedRecords = rows.length;
  }

  // Build documentGroups
  const documentGroups = [];
  if (best.type === 'MULTI_TABLE' || best.type === 'MIXED_DOCUMENT') {
    for (const sec of sections) {
      documentGroups.push({ startRow: sec.startRow, endRow: sec.endRow, type: sec.type || 'data_table', rowCount: sec.rowCount });
    }
  } else if (best.type === 'REPEATING_GROUP' && groupDelimiters.length > 0) {
    for (const g of groupDelimiters) {
      documentGroups.push({ startRow: g.startRow, endRow: g.endRow, type: 'group', rowCount: g.rowCount });
    }
  }

  // Build repeatingStructures
  const repeatingStructures = [];
  if (best.type === 'REPEATING_GROUP' && groupCycle) {
    repeatingStructures.push({ cycle: groupCycle.cycle, confidence: Math.round(groupCycle.confidence * 100), estimatedGroups: estimatedRecords });
  }

  // Build documentSections
  const documentSections = [];
  if (segments?.operationalSection?.rows?.length > 0) {
    documentSections.push({ type: 'operational', rowCount: segments.operationalSection.rows.length });
  }
  if (segments?.administrativeSection?.rows?.length > 0) {
    documentSections.push({ type: 'administrative', rowCount: segments.administrativeSection.rows.length });
  }
  if (segments?.financialSection?.rows?.length > 0) {
    documentSections.push({ type: 'financial', rowCount: segments.financialSection.rows.length });
  }

  return {
    type: best.type,
    confidence: Math.round(best.confidence * 100) / 100,
    recordPattern: {
      recordStartsAt,
      recordEndsAt,
      recordSize,
      estimatedRecords: Math.max(estimatedRecords, 1),
    },
    documentGroups,
    repeatingStructures,
    documentSections,
  };
}
