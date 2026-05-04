import * as XLSX from 'xlsx';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toYmd(value) {
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

function toHm(value) {
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

function toNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(',', '.').trim());
    return Number.isFinite(n) ? n : '';
  }
  return '';
}

function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CANONICAL_FIELDS = [
  'fecha',
  'hora',
  'cliente',
  'producto',
  'lote',
  'cantidad',
  'peso',
  'destino',
  'placa',
  'conductor',
  'observaciones',
];

const FIELD_SYNONYMS = {
  fecha: ['fecha', 'fec', 'fecha despacho', 'fecha de despacho', 'f despacho', 'f'],
  hora: ['hora', 'hr', 'time', 'hora despacho'],
  cliente: ['cliente', 'clientes', 'razon social', 'razon', 'cliente nombre', 'nombre cliente', 'tercero', 'nit', 'comprador'],
  producto: ['producto', 'descripcion', 'desc', 'articulo', 'item', 'referencia', 'material'],
  lote: ['lote', 'lote prod', 'numero lote', 'batch'],
  cantidad: ['cantidad', 'cant', 'cant bolsas', 'cantidad bolsas', 'unidades', 'uds', 'qty', 'cant bultos', 'bolsas'],
  peso: ['peso', 'kilos', 'kilo', 'kg', 'kilogramos', 'peso total'],
  destino: ['destino', 'direccion', 'dir', 'ciudad', 'bodega', 'punto entrega', 'punto de entrega', 'sede'],
  placa: ['placa', 'vehiculo', 'vehiculo placa', 'camion', 'tracto', 'placa vehiculo'],
  conductor: ['conductor', 'chofer', 'driver', 'transportista', 'nombre conductor'],
  observaciones: ['observaciones', 'obs', 'nota', 'notas', 'comentarios', 'observacion'],
};

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

function buildHeaderMap(headers) {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const map = {};
  const used = new Set();

  for (const field of CANONICAL_FIELDS) {
    const synonyms = FIELD_SYNONYMS[field] || [field];
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

function pickValue(row, key) {
  return key ? row[key] : '';
}

function detectHeaderRow(aoa, maxScanRows = 80) {
  let best = { rowIndex: -1, score: 0, headers: [] };
  for (let i = 0; i < Math.min(maxScanRows, aoa.length); i++) {
    const row = (aoa[i] || []).map((v) => String(v ?? '').trim()).filter(Boolean);
    if (row.length < 3) continue;
    const map = buildHeaderMap(row);
    const hits = CANONICAL_FIELDS.reduce((acc, f) => acc + (map[f] ? 1 : 0), 0);
    if (hits > best.score) best = { rowIndex: i, score: hits, headers: row };
  }
  return best;
}

function parseOperationsReport(aoa) {
  // Compatible con `reports/Report.xlsx` incluido en el proyecto:
  // - Encabezado general (Fecha, Número, Cliente, ...)
  // - Cliente aparece en una fila separada
  // - Tabla de items (Código, Descripción, Cantidad, ...)
  const rows = [];
  let i = 0;

  const looksLikeOperationsTitle = (row) =>
    row.some((v) => normalizeHeader(v).includes('reporte de operaciones'));

  const hasOperationsTitle = aoa.slice(0, 20).some((r) =>
    looksLikeOperationsTitle((r || []).map((v) => String(v ?? '').trim()).filter(Boolean)),
  );
  if (!hasOperationsTitle) return null;

  const findRowIndexContaining = (tokens, start, end) => {
    for (let k = start; k <= end; k++) {
      const row = (aoa[k] || []).map((v) => String(v ?? '').trim()).filter(Boolean);
      const joined = normalizeHeader(row.join(' '));
      const ok = tokens.every((t) => joined.includes(t));
      if (ok) return k;
    }
    return -1;
  };

  while (i < aoa.length) {
    // Buscar una fila que parezca "operación": primera celda fecha, segunda número/código
    const row = aoa[i] || [];
    const c0 = row[0];
    const c1 = row[1];
    const fecha = toYmd(c0);
    const numero = String(c1 ?? '').trim();

    if (fecha && numero) {
      // Cliente suele venir en la siguiente fila, col 1
      const next = aoa[i + 1] || [];
      const cliente = String(next[1] ?? '').trim();

      // Buscar encabezado de detalle de items cerca
      const detailHeaderIndex = findRowIndexContaining(['descripcion', 'cantidad'], i, Math.min(i + 15, aoa.length - 1));
      if (detailHeaderIndex === -1) {
        i += 1;
        continue;
      }

      const detailHeaders = (aoa[detailHeaderIndex] || []).map((v) => String(v ?? '').trim());
      const detailMap = buildHeaderMap(detailHeaders);
      const descKey = detailMap.producto || detailHeaders.find((h) => normalizeHeader(h) === 'descripcion') || null;
      const qtyKey = detailMap.cantidad || detailHeaders.find((h) => normalizeHeader(h) === 'cantidad') || null;

      // Leer filas de items hasta encontrar una fila vacía o una nueva operación
      let j = detailHeaderIndex + 1;
      while (j < aoa.length) {
        const r = aoa[j] || [];
        const maybeNewFecha = toYmd(r[0]);
        if (maybeNewFecha && String(r[1] ?? '').trim()) break;

        const isAllBlank = r.every((v) => String(v ?? '').trim() === '');
        if (isAllBlank) {
          // a veces hay separación, pero puede continuar; cortamos si hay muchas vacías seguidas
          let blanks = 1;
          while (j + blanks < aoa.length && (aoa[j + blanks] || []).every((v) => String(v ?? '').trim() === '')) blanks++;
          if (blanks >= 2) break;
          j += blanks;
          continue;
        }

        // Construir objeto con headers para poder reutilizar pickValue()
        const obj = {};
        for (let col = 0; col < detailHeaders.length; col++) obj[detailHeaders[col]] = r[col];

        const producto = String(pickValue(obj, descKey) ?? '').trim();
        const cantidadBolsas = toNumber(pickValue(obj, qtyKey));

        if (producto) {
          rows.push({
            fechaDespacho: fecha,
            hora: '',
            cliente: cliente || '',
            producto,
            lote: '',
            cantidadBolsas,
            peso: '',
            destino: '',
            placa: '',
            conductor: '',
            observaciones: numero ? `Operación: ${numero}` : '',
          });
        }

        j += 1;
      }

      i = j;
      continue;
    }

    i += 1;
  }

  return rows;
}

export async function parseDispatchesExcelFile(file) {
  if (!file) throw new Error('No se seleccionó ningún archivo.');
  const isXlsx =
    file.name?.toLowerCase().endsWith('.xlsx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (!isXlsx) throw new Error('Formato inválido. Solo se permite .xlsx');

  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) throw new Error('El archivo no contiene hojas.');
  const ws = wb.Sheets[sheetName];

  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  if (!aoa.length) return { rows: [], preview: [], missingHeaders: [], matchedHeaders: {} };

  // 1) Fallback específico para reportes tipo "operaciones" (como el Report.xlsx del repo)
  const opsRows = parseOperationsReport(aoa);
  if (opsRows && opsRows.length) {
    const filteredOps = opsRows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
    return {
      rows: filteredOps,
      preview: filteredOps.slice(0, 8),
      missingHeaders: CANONICAL_FIELDS,
      matchedHeaders: {},
      mode: 'operations',
    };
  }

  // 2) Modo tabla estándar: detectar fila de encabezados aunque no sea la primera
  const best = detectHeaderRow(aoa);
  const headerRowIndex = best.rowIndex >= 0 ? best.rowIndex : 0;

  const raw = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: true,
    range: headerRowIndex,
  });
  if (!raw.length) return { rows: [], preview: [], missingHeaders: [], matchedHeaders: {} };

  const actualHeaders = Object.keys(raw[0] ?? {}).filter(Boolean);
  const matchedHeaders = buildHeaderMap(actualHeaders);
  const missingHeaders = CANONICAL_FIELDS.filter((f) => !matchedHeaders[f]);

  const rows = raw.map((r) => ({
    fechaDespacho: toYmd(pickValue(r, matchedHeaders.fecha)),
    hora: toHm(pickValue(r, matchedHeaders.hora)),
    cliente: String(pickValue(r, matchedHeaders.cliente) ?? '').trim(),
    producto: String(pickValue(r, matchedHeaders.producto) ?? '').trim(),
    lote: String(pickValue(r, matchedHeaders.lote) ?? '').trim(),
    cantidadBolsas: toNumber(pickValue(r, matchedHeaders.cantidad)),
    peso: toNumber(pickValue(r, matchedHeaders.peso)),
    destino: String(pickValue(r, matchedHeaders.destino) ?? '').trim(),
    placa: String(pickValue(r, matchedHeaders.placa) ?? '').trim(),
    conductor: String(pickValue(r, matchedHeaders.conductor) ?? '').trim(),
    observaciones: String(pickValue(r, matchedHeaders.observaciones) ?? '').trim(),
  }));

  const filtered = rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
  const preview = filtered.slice(0, 8);
  return { rows: filtered, preview, missingHeaders, matchedHeaders, mode: 'table' };
}

