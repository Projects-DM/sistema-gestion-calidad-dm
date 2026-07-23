import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

let pdfjsLib = null;

async function getPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
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
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rawHeaders = jsonData[0] ? jsonData[0].map(String) : [];
  const rawRows = jsonData.slice(1);
  const rows = rawRows.map(row => row.map(String));
  const allText = jsonData.map(row => row.join(' ')).join('\n');
  return { headers: rawHeaders, rows, rawRows, textContent: allText };
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
  let text = '';
  for (let i = 0; i < doc.numPages; i++) {
    const page = await doc.getPage(i + 1);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  return { headers: lines.length > 0 ? [lines[0]] : [], rows: lines.map(l => [l]), textContent: text };
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

  return {
    fileName,
    fileType: fileTypeMap[ext],
    title: title || fileName.replace(/\.\w+$/, ''),
    rows: parsed.rows,
    rawRows: parsed.rawRows || parsed.rows,
    textContent: parsed.textContent || '',
    rawHeaders: parsed.headers || [],
  };
}
