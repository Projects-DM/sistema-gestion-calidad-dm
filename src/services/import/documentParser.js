import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pdfjsLib = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
  return pdfjsLib;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => parseLine(line).map(v => v.replace(/^"|"$/g, '')));
  return { headers, rows };
}

async function parseXLSX(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  let bestName = sheetNames[0];
  let bestScore = -1;
  for (const name of sheetNames) {
    const s = workbook.Sheets[name];
    if (!s || !s['!ref']) continue;
    const range = XLSX.utils.decode_range(s['!ref']);
    const rows = range.e.r - range.s.r + 1;
    const cols = range.e.c - range.s.c + 1;
    const score = rows * cols;
    if (score > bestScore) { bestScore = score; bestName = name; }
  }

  const sheet = workbook.Sheets[bestName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rawHeaders = jsonData[0] ? jsonData[0].map(String) : [];
  const rawRows = jsonData.slice(1);
  const rows = rawRows.map(row => row.map(String));
  const allText = jsonData.map(row => row.join(' ')).join('\n');
  return { headers: rawHeaders, rows, rawRows, textContent: allText, sheetNames, activeSheet: bestName };
}

async function parseDOCX(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = result.value || '';
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  return { headers: lines.length > 0 ? [lines[0]] : [], rows: lines.map(l => [l]), textContent: text };
}

async function parsePDF(file) {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const allRows = [];
  let allText = '';

  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const content = await page.getTextContent();

    const ROW_TOLERANCE = 5;
    const groups = [];
    for (const item of content.items) {
      const text = (item.str || '').trim();
      if (!text) continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      let group = groups.find(g => Math.abs(g.y - y) <= ROW_TOLERANCE);
      if (!group) { group = { y, items: [] }; groups.push(group); }
      group.items.push({ x, text });
    }

    groups.sort((a, b) => a.y - b.y);
    for (const g of groups) {
      g.items.sort((a, b) => a.x - b.x);
      const row = g.items.map(it => it.text);
      allRows.push(row);
      allText += row.join(' ') + '\n';
    }
  }

  if (allRows.length === 0) {
    throw new Error('El PDF no contiene texto extraíble. Asegúrate de que no sea un documento escaneado (imagen).');
  }

  return { headers: allRows[0] || [], rows: allRows.slice(1), textContent: allText };
}

export async function parseDocument(file) {
  const fileName = file.name;
  const ext = fileName.split('.').pop().toLowerCase();

  const fileTypeMap = {
    xlsx: 'xlsx',
    xls: 'xlsx',
    csv: 'csv',
    docx: 'docx',
    pdf: 'pdf',
  };

  if (!fileTypeMap[ext]) {
    throw new Error(`Formato no soportado: .${ext}. Formatos válidos: XLSX, XLS, CSV, DOCX, PDF`);
  }

  let parsed;
  if (ext === 'xlsx' || ext === 'xls') {
    parsed = await parseXLSX(file);
  } else if (ext === 'csv') {
    const text = await file.text();
    parsed = parseCSV(text);
    parsed.textContent = text;
  } else if (ext === 'docx') {
    parsed = await parseDOCX(file);
  } else if (ext === 'pdf') {
    parsed = await parsePDF(file);
  }

  const title = parsed.textContent
    ? parsed.textContent.split(/\r?\n/).filter(l => l.trim())[0] || null
    : null;

  const parserDiagnostics = {
    textFound: !!(parsed.textContent && parsed.textContent.trim().length > 0),
    totalCharacters: (parsed.textContent || '').length,
    totalRows: parsed.rows.length,
    totalColumns: parsed.headers ? parsed.headers.length : (parsed.rows[0]?.length || 0),
    parserStatus: parsed.rows.length > 0 ? 'OK' : 'FAILED',
  };

  return {
    fileName,
    fileType: fileTypeMap[ext],
    title: title || fileName.replace(/\.\w+$/, ''),
    rows: parsed.rows,
    rawRows: parsed.rawRows || parsed.rows,
    textContent: parsed.textContent || '',
    rawHeaders: parsed.headers || [],
    sheetNames: parsed.sheetNames || null,
    activeSheet: parsed.activeSheet || null,
    documentSegments: null,
    parserDiagnostics,
  };
}
