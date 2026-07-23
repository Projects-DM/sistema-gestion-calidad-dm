import { parseDocument } from '../services/import/index.js';
import { normalizeOperationalData, toYmd, toHm, toNumber, normalizeHeader, buildHeaderMap, pickValue } from '../services/import/operationalDataExtractionLayer.js';
import { OperationalExperienceRegistry } from '../core/capabilities/experiences/OperationalExperienceRegistry.js';
import * as XLSX from 'xlsx';

const dispatchContract = OperationalExperienceRegistry.getExperienceContract('dispatches');
const { canonicalFields: CANONICAL_FIELDS, synonyms: FIELD_SYNONYMS, fieldNormalizers: FIELD_NORMALIZERS } = dispatchContract.documentContract;

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
      const detailMap = buildHeaderMap(detailHeaders, CANONICAL_FIELDS, FIELD_SYNONYMS);
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

  // Delegar parsing al Import Engine certificado — compatible con XLSX, XLS, CSV, PDF, DOCX
  const parsedDoc = await parseDocument(file);

  // Intentar extracción vía reporte de operaciones (formato especial no tabular)
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames?.[0];
  const ws = wb.Sheets[sheetName];
  const aoa = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) : [];

  if (aoa.length) {
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
  }

  // Normalización vía Universal Pipeline — consume contrato SSOT del Registry
  const result = normalizeOperationalData({
    parsedDocument: parsedDoc,
    contract: dispatchContract,
  });

  return {
    ...result,
    preview: result.rows.slice(0, 8),
    mode: 'table',
  };
}

