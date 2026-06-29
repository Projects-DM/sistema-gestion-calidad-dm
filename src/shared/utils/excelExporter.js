import * as XLSX from 'xlsx';
import { buildExcelSheetName } from './excelSheetNameBuilder';

function escapeCellText(v) {
  if (v === null || v === undefined) return '';
  return v.toString();
}

function coerceHyperlinkCell(value) {
  // Normalizer stores either:
  // - { __hyperlink: true, text, href }
  // - { __hyperlinks: true, items: [{text, href}] }
  // - ''
  if (!value) return { display: '', hrefs: [] };

  if (typeof value === 'string') return { display: value, hrefs: [] };

  if (value.__hyperlink && value.href) {
    return { display: value.text || 'Link', hrefs: [value.href] };
  }

  if (value.__hyperlinks && Array.isArray(value.items)) {
    const display = value.items.map((it) => it.text).join(', ');
    const hrefs = value.items.map((it) => it.href).filter(Boolean);
    return { display, hrefs };
  }

  return { display: '', hrefs: [] };
}

function rowsToSheetData({ columns, rows }) {
  const aoa = [];
  aoa.push(columns);

  rows.forEach((row) => {
    const line = columns.map((col) => {
      const value = row?.[col];

      if (col === 'Ver Firma' || col === 'Evidencias') {
        const { display } = coerceHyperlinkCell(value);
        return display;
      }

      return escapeCellText(value);
    });
    aoa.push(line);
  });

  return aoa;
}

function applyHyperlinksToWorkbook(workbook, sheetName, columns, rows) {
  // SheetJS can store links via cell object with l/r.
  const ws = workbook.Sheets[sheetName];
  if (!ws) return;

  const colIndex = (colName) => columns.indexOf(colName);
  const colVerFirma = colIndex('Ver Firma');
  const colEvidencias = colIndex('Evidencias');

  const hyperlinkCols = [colVerFirma, colEvidencias].filter((i) => i >= 0);
  if (hyperlinkCols.length === 0) return;

  // Data starts at row 2 (1-based in Excel; row 1 header)
  rows.forEach((row, rIdx) => {
    const excelRowNumber = rIdx + 2;

    if (colVerFirma >= 0) {
      const cellValue = row?.['Ver Firma'];
      const { display, hrefs } = coerceHyperlinkCell(cellValue);
      if (hrefs.length > 0) {
        const cellAddress = XLSX.utils.encode_cell({ c: colVerFirma, r: excelRowNumber - 1 });
        ws[cellAddress] = {
          t: 's',
          v: display,
          l: { Target: hrefs[0], Tooltip: display },
        };
      }
    }

    if (colEvidencias >= 0) {
      const cellValue = row?.['Evidencias'];
      const { display, hrefs } = coerceHyperlinkCell(cellValue);
      if (hrefs.length > 0) {
        const cellAddress = XLSX.utils.encode_cell({ c: colEvidencias, r: excelRowNumber - 1 });
        // Prefer first link; display contains all labels.
        ws[cellAddress] = {
          t: 's',
          v: display,
          l: { Target: hrefs[0], Tooltip: display },
        };
      }
    }
  });
}

export function excelExporter({ normalized, fileName }) {
  const wb = XLSX.utils.book_new();
  console.log("Entró excelExporter");

  (normalized?.sheets || []).forEach(({ sheetName, columns, rows }) => {
    const builtName = buildExcelSheetName(sheetName, {
      existingNames: wb.SheetNames,
    });
    console.log(
      "Exportando hoja:",
      sheetName,
      "rows:",
      rows.length,
      "columns:",
      columns.length
    );
    const aoa = rowsToSheetData({ columns, rows });
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    XLSX.utils.book_append_sheet(wb, ws, builtName);

    applyHyperlinksToWorkbook(wb, builtName, columns, rows);
  });

  console.log(
    "Workbook.SheetNames",
    wb.SheetNames
  );
  XLSX.writeFile(wb, fileName);
}


