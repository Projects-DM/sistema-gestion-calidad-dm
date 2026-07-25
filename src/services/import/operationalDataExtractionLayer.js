import * as XLSX from 'xlsx';

// =============================================================================
// Normalization Engine (Sprint 94 — Certified)
// =============================================================================

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
    if (!s || s.includes('#')) return '';
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
    const m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?(?:\s*(am|pm))?$/i);
    if (m) {
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      if (m[3]) {
        const ampm = m[3].toLowerCase();
        if (ampm === 'pm' && hh < 12) hh += 12;
        if (ampm === 'am' && hh === 12) hh = 0;
      }
      return `${pad2(hh)}:${pad2(mm)}`;
    }
  }
  return '';
}

export function toNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const s = value.replace(',', '.').trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : '';
  }
  return '';
}

// =============================================================================
// Header Mapping Engine (Sprint 94 — Certified)
// =============================================================================

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

// =============================================================================
// Document Spatial & Block Recognition Engine (Sprint 129 — SSOT)
// =============================================================================

const ADMIN_NOISE_KEYWORDS = [
  'bancolombia',
  'consignar a cuenta',
  'resolucion dian',
  'resolución dian',
  'gracias por su compra',
  'total factura',
  'valor total',
  'subtotal',
  'total neto',
  'descuento',
  'monto cancelado',
  'saldo',
  'vuelto',
  'nit:',
  'tel:',
  'telefono',
  'teléfono',
  'pagina',
  'página',
];

export function detectAdministrativeNoise(cellOrRow) {
  const str = (Array.isArray(cellOrRow) ? cellOrRow.join(' ') : String(cellOrRow ?? '')).toLowerCase();
  return ADMIN_NOISE_KEYWORDS.some(keyword => str.includes(keyword));
}

const METADATA_LABELS = {
  empresa: ['empresa', 'dm distribuciones', 'dm'],
  cliente: ['cliente:', 'cliente :', 'nombre:', 'razon social:', 'razón social:', 'tercero:'],
  direccion: ['direccion:', 'dirección:', 'dir:', 'direc:', 'domicilio:'],
  vendedor: ['vendedor:', 'vendedor', 'vend:'],
  fecha: ['fecha:', 'fec:', 'date:'],
  hora: ['hora:', 'hr:', 'hora despacho:'],
  factura: ['factura:', 'factura n°', 'n° factura', 'numero factura:', 'n°:'],
};

export function extractClient(rawRowsOrSpatial) {
  if (!rawRowsOrSpatial?.length) return '';
  const clientLabels = METADATA_LABELS.cliente;
  
  for (let i = 0; i < Math.min(rawRowsOrSpatial.length, 40); i++) {
    const item = rawRowsOrSpatial[i];
    const row = Array.isArray(item) ? item : (item.cells ? item.cells.map(c => c.text) : []);
    
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim();
      const lower = cell.toLowerCase();
      for (const label of clientLabels) {
        if (lower.startsWith(label)) {
          let val = cell.includes(':') ? cell.slice(cell.indexOf(':') + 1).trim() : '';
          if (!val && c + 1 < row.length) {
            val = String(row[c + 1] ?? '').trim();
          }
          if (!val && i + 1 < rawRowsOrSpatial.length) {
            const nextItem = rawRowsOrSpatial[i + 1];
            const nextRow = Array.isArray(nextItem) ? nextItem : (nextItem.cells ? nextItem.cells.map(k => k.text) : []);
            if (nextRow.length > 0 && !nextRow[0].toLowerCase().includes('tel') && !nextRow[0].toLowerCase().includes('dir')) {
              val = nextRow.join(' ').trim();
            }
          }
          if (val) return val;
        }
      }
    }
  }
  return '';
}

export function extractDateTime(rawRowsOrSpatial) {
  let fecha = '';
  let hora = '';
  if (!rawRowsOrSpatial?.length) return { fecha, hora };

  for (let i = 0; i < Math.min(rawRowsOrSpatial.length, 40); i++) {
    const item = rawRowsOrSpatial[i];
    const row = Array.isArray(item) ? item : (item.cells ? item.cells.map(c => c.text) : []);

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim();
      if (!cell) continue;

      if (!fecha) {
        const parsedDate = toYmd(cell);
        if (parsedDate) {
          fecha = parsedDate;
        } else {
          const dateMatch = cell.match(/(?:fecha:?|fec:?)\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i);
          if (dateMatch) fecha = toYmd(dateMatch[1]);
        }
      }

      if (!hora) {
        const parsedTime = toHm(cell);
        if (parsedTime) {
          hora = parsedTime;
        } else {
          const timeMatch = cell.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)/i);
          if (timeMatch && (cell.toLowerCase().includes('hora') || cell.toLowerCase().includes('am') || cell.toLowerCase().includes('pm'))) {
            hora = toHm(timeMatch[1]);
          }
        }
      }
    }
  }
  return { fecha, hora };
}

// =============================================================================
// Operational Intelligence & Business Rule Engine (Sprint 130 — SSOT)
// =============================================================================

const REFRIGERATED_KEYWORDS = [
  'pollo',
  'pechuga',
  'filete',
  'muslo',
  'contramuslo',
  'ripio',
  'chuzo',
  'ala',
  'pierna',
  'carne',
  'tocino',
  'mollejas',
  'menudencia',
];

export function isTrazableProduct(productName) {
  if (!productName) return false;
  const name = String(productName).toLowerCase();
  return REFRIGERATED_KEYWORDS.some(k => name.includes(k));
}

export function detectProductPatterns(text) {
  if (!text) return null;
  const str = String(text).trim();
  const m = str.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (!m) return null;
  const grams = parseInt(m[1], 10);
  const packQty = parseInt(m[2], 10);
  return {
    grams,
    packQty,
    pattern: m[0],
    isProductPattern: true,
  };
}

export function calculateProductWeight(productName, quantity = 1) {
  const q = Number(quantity) || 1;
  const name = String(productName || '').trim();

  // Rule 1: Packaged (numero X numero)
  const patternMatch = name.match(/(\d+)\s*[xX]\s*(\d+)/);
  if (patternMatch) {
    const grams = parseInt(patternMatch[1], 10);
    const packQty = parseInt(patternMatch[2], 10);
    const pesoUnidad = Math.round((grams * packQty) / 100) / 10;
    const pesoTotal = Math.round(pesoUnidad * q * 100) / 100;
    return {
      pesoUnidad,
      pesoTotal,
      pesoProducto: pesoUnidad,
      peso: pesoTotal,
      rule: 'packaged',
    };
  }

  // Rule 3: Explicit Weight (e.g. 1.3 KG, 1.3 KILO)
  const explicitMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilos)/i);
  if (explicitMatch) {
    const pesoUnidad = parseFloat(explicitMatch[1].replace(',', '.'));
    const pesoTotal = Math.round(pesoUnidad * q * 100) / 100;
    return {
      pesoUnidad,
      pesoTotal,
      pesoProducto: pesoUnidad,
      peso: pesoTotal,
      rule: 'explicit',
    };
  }

  // Rule 2: Sold per Kilogram (1 product = 1 KG)
  const pesoUnidad = 1;
  const pesoTotal = Math.round(pesoUnidad * q * 100) / 100;
  return {
    pesoUnidad,
    pesoTotal,
    pesoProducto: pesoUnidad,
    peso: pesoTotal,
    rule: 'per_kg',
  };
}

export function calculateWeight(grams, packQty, cantidad = 1) {
  const g = Number(grams) || 0;
  const p = Number(packQty) || 0;
  const c = Number(cantidad) || 1;
  if (!g || !p) return calculateProductWeight('', c);
  const pesoUnidad = Math.round((g * p) / 100) / 10;
  const pesoTotal = Math.round(pesoUnidad * c * 100) / 100;
  return { pesoUnidad, pesoTotal, pesoProducto: pesoUnidad, peso: pesoTotal, rule: 'packaged' };
}

export function resolveTemperature(productName) {
  const name = String(productName || '').toLowerCase();
  const isRefrigerated = REFRIGERATED_KEYWORDS.some(k => name.includes(k));
  return isRefrigerated ? -18 : 20;
}

export function resolveDefaultFields() {
  return {
    destino: null,
    vehiculo: 'TRG786',
    conductor: 'Juan Gómez',
    estado: 'Pendiente',
  };
}

export function resolveOperationalFields(record = {}) {
  const nowStr = new Date().toISOString().slice(0, 10);
  const fechaDespacho = record.fechaDespacho || record.fecha || record._fechaDoc || nowStr;
  const hora = record.hora || record.horaDoc || '10:30';
  const cliente = record.cliente || record._cliente || '';
  const producto = record.producto || record.cleanProducto || '';
  const lote = record.lote || '';
  const cantidad = toNumber(record.cantidad || record.cantidad_bolsas || 1) || 1;

  const weights = calculateProductWeight(producto, cantidad);
  const temperatura = record.temperatura !== undefined && record.temperatura !== null
    ? record.temperatura
    : resolveTemperature(producto);
  const defaults = resolveDefaultFields();

  return {
    fechaDespacho,
    hora,
    cliente,
    producto,
    lote,
    cantidad,
    pesoUnidad: weights.pesoUnidad,
    pesoTotal: weights.pesoTotal,
    peso: weights.pesoTotal,
    temperatura,
    destino: defaults.destino,
    vehiculo: record.vehiculo || defaults.vehiculo,
    conductor: record.conductor || defaults.conductor,
    estado: defaults.estado,
    _pesoUnitario: weights.pesoUnidad,
    _pesoTotal: weights.pesoTotal,
    _trazable: isTrazableProduct(producto),
  };
}

export function validateImportableRecord(record = {}) {
  const criticalErrors = [];
  const warnings = [];

  if (!record.cliente || String(record.cliente).trim() === '') {
    criticalErrors.push({ field: 'cliente', message: 'Cliente es obligatorio' });
  }
  if (!record.producto || String(record.producto).trim() === '') {
    criticalErrors.push({ field: 'producto', message: 'Producto es obligatorio' });
  }
  if (record.cantidad === undefined || record.cantidad === null || Number(record.cantidad) <= 0) {
    criticalErrors.push({ field: 'cantidad', message: 'Cantidad debe ser mayor a 0' });
  }

  if (!record.fechaDespacho) {
    warnings.push({ field: 'fechaDespacho', message: 'Fecha asignada automáticamente' });
  }
  if (!record.hora) {
    warnings.push({ field: 'hora', message: 'Hora asignada por defecto' });
  }

  return {
    isImportable: criticalErrors.length === 0,
    criticalErrors,
    warnings,
  };
}

export function extractLot(textOrRows) {
  if (Array.isArray(textOrRows)) {
    for (const item of textOrRows) {
      const row = Array.isArray(item) ? item : (item.cells ? item.cells.map(c => c.text) : [String(item)]);
      for (const cell of row) {
        const lot = extractLot(String(cell ?? ''));
        if (lot) return lot;
      }
    }
    return '';
  }
  const str = String(textOrRows ?? '').trim();
  if (!str) return '';
  const m = str.match(/L\s*\.?\s*(\d{2})\s*[-/]?\s*(\d{3})/i);
  if (m) return `L${m[1]}-${m[2]}`;
  const m2 = str.match(/\bL(\d{2})(\d{3})\b/i);
  if (m2) return `L${m2[1]}-${m2[2]}`;
  const m3 = str.match(/\b(\d{2}[-]\d{2,3})\b/);
  if (m3) return `L${m3[1]}`;
  return '';
}

export function associateLot(products, lotes) {
  const lotList = Array.isArray(lotes) ? lotes : (lotes ? [lotes] : []);
  let currentLot = lotList.length > 0 ? lotList[0] : '';

  return products.map(prod => {
    if (prod.lote) {
      currentLot = prod.lote;
    }
    return {
      ...prod,
      lote: prod.lote || currentLot || (lotList[0] || ''),
    };
  });
}

export function associateLotToProducts(products, lotes) {
  return associateLot(products, lotes);
}

// =============================================================================
// Spatial & Document Structure Engine (Sprint 129 & 130 — SSOT)
// =============================================================================

export function detectDocumentStructure(parsedDocument) {
  const { rawRows = [], spatialRows = [] } = parsedDocument || {};
  const hasSpatial = spatialRows && spatialRows.length > 0;
  const text = (parsedDocument?.textContent || '').toLowerCase();
  const sections = [];

  if (text.includes('dm distribuciones') || text.includes('soluciones a tu cocina')) sections.push('header');
  if (text.includes('cliente') || text.includes('razon social') || text.includes('tercero')) sections.push('customer');
  if (text.includes('bodeg') || text.includes('cant') || text.includes('descripcion')) sections.push('products');
  if (text.includes('total factura') || text.includes('total neto')) sections.push('totals');
  if (/\bL26\d{3}\b/i.test(text) || /\bL\s*\.?\s*\d{2}\s*[-/]?\s*\d+/i.test(text)) sections.push('lot');

  const confidence = Math.min(100, Math.max(70, sections.length * 20));

  return {
    type: sections.length >= 3 ? 'invoice_operational' : 'tabular',
    confidence,
    hasSpatial,
    sections,
  };
}

export function detectOperationalBlocks(parsedDocument) {
  const { spatialRows = [], rawRows = [] } = parsedDocument || {};
  const blocks = [];

  if (spatialRows && spatialRows.length > 0) {
    const pageMap = {};
    for (const row of spatialRows) {
      const p = row.page || 1;
      if (!pageMap[p]) pageMap[p] = [];
      pageMap[p].push(row);
    }

    for (const [pageNum, pRows] of Object.entries(pageMap)) {
      const block = extractBusinessFieldsFromSpatialRows(pRows, Number(pageNum));
      if (block.products.length > 0 || block.client) {
        blocks.push(block);
      }
    }
  } else if (rawRows && rawRows.length > 0) {
    let currentBlock = { client: '', fecha: '', hora: '', vendedor: '', products: [], lotes: [], rawRows: [] };

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i] || [];

      if (detectAdministrativeNoise(row)) continue;

      const clientFound = extractClient([row]);
      if (clientFound) {
        if (currentBlock.products.length > 0) {
          blocks.push(currentBlock);
          currentBlock = { client: clientFound, fecha: '', hora: '', vendedor: '', products: [], lotes: [], rawRows: [] };
        } else {
          currentBlock.client = clientFound;
        }
      }

      const { fecha, hora } = extractDateTime([row]);
      if (fecha && !currentBlock.fecha) currentBlock.fecha = fecha;
      if (hora && !currentBlock.hora) currentBlock.hora = hora;

      const lotFound = extractLot([row]);
      if (lotFound && !currentBlock.lotes.includes(lotFound)) {
        currentBlock.lotes.push(lotFound);
      }

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? '').trim();
        const prodInfo = detectProductPatterns(cell);
        if (prodInfo || isTrazableProduct(cell)) {
          let cant = 0;
          for (let k = 0; k < row.length; k++) {
            const val = toNumber(row[k]);
            if (typeof val === 'number' && val > 0 && val < 1000) {
              cant = val;
              break;
            }
          }
          currentBlock.products.push({
            producto: cell,
            grams: prodInfo?.grams,
            packQty: prodInfo?.packQty,
            cantidad: cant || 1,
            lote: lotFound || '',
            row,
          });
          break;
        }
      }
      currentBlock.rawRows.push(row);
    }
    if (currentBlock.products.length > 0) {
      blocks.push(currentBlock);
    }
  }

  return blocks;
}

function extractBusinessFieldsFromSpatialRows(pRows, pageNum) {
  const client = extractClient(pRows);
  const { fecha, hora } = extractDateTime(pRows);
  const lotes = [];
  const products = [];

  for (const sRow of pRows) {
    const rowCells = sRow.cells || [];
    const lineText = rowCells.map(c => c.text).join(' ');

    const lotFound = extractLot(lineText);
    if (lotFound && !lotes.includes(lotFound)) {
      lotes.push(lotFound);
    }

    if (detectAdministrativeNoise(lineText)) continue;

    for (let i = 0; i < rowCells.length; i++) {
      const cellText = rowCells[i].text.trim();
      const prodInfo = detectProductPatterns(cellText);
      const trazable = isTrazableProduct(cellText);

      if (prodInfo || (trazable && !cellText.toLowerCase().includes('cliente') && cellText.length > 3)) {
        let cant = 0;
        const bodegMatch = lineText.match(/BODEG(?:A)?\s*(\d+(?:[.,]\d+)?)/i);
        if (bodegMatch) {
          cant = toNumber(bodegMatch[1]);
        } else {
          for (const c of rowCells) {
            const num = toNumber(c.text);
            if (typeof num === 'number' && num > 0 && num < 1000) {
              cant = num;
              break;
            }
          }
        }

        products.push({
          producto: cellText,
          grams: prodInfo?.grams,
          packQty: prodInfo?.packQty,
          cantidad: cant || 1,
          lote: lotFound || '',
          page: pageNum,
        });
        break;
      }
    }
  }

  return {
    page: pageNum,
    client,
    fecha,
    hora,
    lotes,
    products,
  };
}

export function extractBusinessFields(blockOrRows) {
  if (blockOrRows && blockOrRows.products) {
    return blockOrRows;
  }
  const blocks = detectOperationalBlocks({ rawRows: blockOrRows });
  return blocks[0] || { client: '', fecha: '', hora: '', lotes: [], products: [] };
}

export function buildOperationalRecord(item, context = {}) {
  const rawRec = {
    ...context,
    ...item,
    fecha: item.fecha || context.fecha || context.fechaDoc,
    hora: item.hora || context.hora || context.horaDoc,
    cliente: item.cliente || context.cliente || context.clienteDoc,
    producto: item.producto || item.cleanProducto || item.nombre,
    lote: item.lote || context.lote,
    cantidad: item.cantidad || context.cantidad,
  };
  return resolveOperationalFields(rawRec);
}

// =============================================================================
// Public API (Sprint 130 — SSOT)
// =============================================================================

export function normalizeOperationalData({ parsedDocument, canonicalFields = [], synonyms = {}, fieldNormalizers = {} }) {
  const { rawHeaders = [], rawRows = [], spatialRows = [] } = parsedDocument || {};
  if (!rawRows?.length && !spatialRows?.length) {
    return { rows: [], matchedHeaders: {}, missingHeaders: canonicalFields, metadata: {} };
  }

  const structure = detectDocumentStructure(parsedDocument);
  const blocks = detectOperationalBlocks(parsedDocument);

  const globalClient = extractClient(spatialRows.length ? spatialRows : rawRows);
  const globalDateTime = extractDateTime(spatialRows.length ? spatialRows : rawRows);
  const globalLotes = Array.from(new Set(blocks.flatMap(b => b.lotes)));

  const records = [];
  for (const block of blocks) {
    const blockClient = block.client || globalClient;
    const blockFecha = block.fecha || globalDateTime.fecha;
    const blockHora = block.hora || globalDateTime.hora;
    const blockLote = block.lotes?.[0] || globalLotes[0] || '';

    const associatedProducts = associateLot(block.products, block.lotes.length ? block.lotes : globalLotes);

    for (const prod of associatedProducts) {
      const resolved = buildOperationalRecord(prod, {
        clienteDoc: blockClient,
        fechaDoc: blockFecha,
        horaDoc: blockHora,
        lote: prod.lote || blockLote,
      });
      records.push(resolved);
    }
  }

  if (records.length > 0) {
    const matchedHeaders = {
      fechaDespacho: 'Fecha Despacho',
      hora: 'Hora',
      cliente: 'Cliente',
      producto: 'Producto',
      lote: 'Lote',
      cantidad: 'Cantidad',
      peso: 'Peso Total',
      temperatura: 'Temperatura',
    };
    const missingHeaders = canonicalFields.filter(f => !matchedHeaders[f]);

    return {
      rows: records,
      matchedHeaders,
      missingHeaders,
      metadata: {
        cliente: globalClient,
        fecha: globalDateTime.fecha,
        hora: globalDateTime.hora,
        lotes: globalLotes,
        structure,
      },
    };
  }

  const aoa = [rawHeaders || [], ...rawRows];
  const best = detectHeaderRow(rawHeaders || [], rawRows || [], canonicalFields, synonyms);
  const headerRowIndex = best.rowIndex >= 0 ? best.rowIndex : 0;
  const actualHeaders = getOriginalRow(aoa, headerRowIndex).filter(Boolean);
  const matchedHeaders = buildHeaderMap(actualHeaders, canonicalFields, synonyms);
  const missingHeaders = canonicalFields.filter((f) => !matchedHeaders[f]);
  const dataRows = rawRows.slice(headerRowIndex).filter(row => !detectAdministrativeNoise(row));

  const fallbackRecords = dataRows.map(row => {
    const rec = {};
    for (const f of canonicalFields) {
      rec[f] = pickValue(row, matchedHeaders[f]);
    }
    return buildOperationalRecord(rec, {
      clienteDoc: globalClient,
      fechaDoc: globalDateTime.fecha,
      horaDoc: globalDateTime.hora,
    });
  });

  return {
    rows: fallbackRecords.filter(r => r.producto),
    matchedHeaders,
    missingHeaders,
    metadata: {
      cliente: globalClient,
      fecha: globalDateTime.fecha,
      hora: globalDateTime.hora,
      lotes: globalLotes,
      structure,
    },
  };
}

// =============================================================================
// Persistence Contract Mapper (Sprint 131.1 — Certified)
// =============================================================================

const EXCLUDED_FIELDS = new Set([
  '_compliance', '_validation', '_metadata', '_pesoUnitario', '_pesoTotal',
  '_trazable', '_cliente', '_fechaDoc', '_direccion', '_factura',
  'confidence', 'diagnostics', 'matchedHeaders', 'unknownHeaders',
  'documentAnalysis', 'rawData', 'pesoUnidad',
]);

export function mapOperationalRecordToPersistence(record) {
  const r = record || {};
  return {
    fecha: r.fechaDespacho ?? r.fecha ?? null,
    hora: r.hora ?? null,
    cliente: r.cliente ?? null,
    producto: r.producto ?? null,
    lote: r.lote ?? null,
    cantidad_bolsas: Number(r.cantidad) || 0,
    peso: r.peso ?? r.pesoTotal ?? null,
    temperatura: r.temperatura ?? null,
    destino: r.destino ?? null,
    placa: r.placa ?? r.vehiculo ?? null,
    conductor: r.conductor ?? null,
    observaciones: r.observaciones ?? null,
    estado: r.estado || 'Pendiente',
  };
}

export function validatePersistencePayload(payload) {
  const errors = [];
  if (!payload.producto || String(payload.producto).trim() === '') {
    errors.push({ field: 'producto', value: payload.producto, reason: 'Campo obligatorio vacío' });
  }
  if (!payload.cliente || String(payload.cliente).trim() === '') {
    errors.push({ field: 'cliente', value: payload.cliente, reason: 'Campo obligatorio vacío' });
  }
  if (!payload.cantidad_bolsas || Number(payload.cantidad_bolsas) <= 0) {
    errors.push({ field: 'cantidad_bolsas', value: payload.cantidad_bolsas, reason: 'Debe ser mayor a 0' });
  }
  return errors;
}

export function sanitizeRecordForPersistence(record) {
  const clean = {};
  for (const [key, val] of Object.entries(record || {})) {
    if (EXCLUDED_FIELDS.has(key)) continue;
    if (key.startsWith('_')) continue;
    clean[key] = val === undefined ? null : val;
  }
  return clean;
}
