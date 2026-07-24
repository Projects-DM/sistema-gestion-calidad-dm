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
  const best = sections.reduce((a, b) => a.rowCount > b.rowCount ? a : b);
  const headerRow = rows[best.startRow] || [];
  const dataRows = rows.slice(best.startRow + 1, best.endRow + 1);
  return {
    startRow: best.startRow,
    endRow: best.endRow,
    headers: headerRow.filter(h => String(h ?? '').trim() !== ''),
    rows: dataRows,
    columns: headerRow.length,
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
    const isTableRow = nonEmpty >= 3;
    if (isTableRow) { if (start === -1) start = i; }
    else if (start !== -1) { if (i - start >= 2) regions.push({ startRow: start, endRow: i - 1, rowCount: i - start }); start = -1; }
  }
  if (start !== -1 && rows.length - start >= 2) regions.push({ startRow: start, endRow: rows.length - 1, rowCount: rows.length - start });
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
          if (value && !value.endsWith(':') && !group.includes(normalizeLabel(value))) {
            meta[group[0]] = value;
          } else if (valueNext && !valueNext.endsWith(':') && !group.includes(normalizeLabel(valueNext))) {
            meta[group[0]] = valueNext;
          }
        }
      }
      if (norm.endsWith(':') && j + 1 < row.length) {
        const key = norm.replace(/:$/, '').trim();
        const val = String(row[j + 1] ?? '').trim();
        if (key && val) meta[key] = val;
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
  };
}
