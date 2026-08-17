/**
 * Evidence Report Professional Renderer (Sprint 315)
 *
 * Dibuja el modelo (`evidenceReportModel`) como PDF profesional:
 * portada / identificación / resumen / contexto / registros / campos /
 * firmas / evidencias / pie de página con "Página X de Y".
 *
 * REGLAS (Sprint 315, §15):
 *  - El renderer SOLO recibe el modelo; NUNCA consulta Supabase ni
 *    `dynamicService` (0 queries, 0 async).
 *  - Metadata Driven: no existe `if (formulario === ...)`; la estructura de
 *    campos proviene del modelo.
 *  - Presenta firmas/evidencias como enlaces verificables (URL pública),
 *    sin incrustar binarios (más seguro y práctico: sin fetch async).
 *  - El orden de registros y formularios del modelo (selección) se preserva.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDateParts } from '../utils/exportDataNormalizer.js';

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN_X = 40;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = PAGE_H - 24;
const SAFE_BOTTOM = PAGE_H - 44;

const PRIMARY = [30, 41, 59];
const ACCENT = [245, 158, 11];
const GRAY = [107, 114, 128];
const INK = [17, 24, 39];
const LIGHT_FILL = [248, 250, 252];

function createDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
}

function ensureSpace(doc, y, needed) {
  if (y + needed > SAFE_BOTTOM) {
    doc.addPage();
    return 40;
  }
  return y;
}

function sectionTitle(doc, y, text, width = CONTENT_W) {
  doc.setFillColor(...PRIMARY);
  doc.rect(MARGIN_X, y, width, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(text, MARGIN_X + 6, y + 13);
}

function kv(doc, x, y, key, value, labelWidth = 150) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(key, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK);
  const wrapped = doc.splitTextToSize(String(value), CONTENT_W - labelWidth - 8);
  doc.text(wrapped, x + labelWidth, y);
  return Math.max(12, wrapped.length * 12);
}

function linkLine(doc, x, y, text, url) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  try {
    doc.textWithLink(text, x, y, { url });
  } catch {
    doc.text(text, x, y);
  }
  doc.setTextColor(...INK);
}

function drawFooter(doc, model, pageNumber, total) {
  doc.setPage(pageNumber);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    `${model.orgName} · ${model.systemName} · ${model.documentId}`,
    MARGIN_X,
    FOOTER_Y,
  );
  doc.text(
    `Página ${pageNumber} de ${total}`,
    PAGE_W - MARGIN_X,
    FOOTER_Y,
    { align: 'right' },
  );
  doc.setTextColor(...INK);
}

function drawHeaderBand(doc, model) {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_W, 104, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(model.orgName, MARGIN_X, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(model.systemName, MARGIN_X, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(model.title, MARGIN_X, 84);

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(3);
  doc.line(MARGIN_X, 112, MARGIN_X + 160, 112);
}

function drawIdentification(doc, model) {
  const y0 = 128;
  doc.setDrawColor(200, 205, 215);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN_X, y0, CONTENT_W, 88, 4, 4);
  let y = y0 + 24;

  y += kv(doc, MARGIN_X + 12, y, 'Informe', model.documentId);
  y += kv(doc, MARGIN_X + 12, y, 'Módulo', model.module.name || model.module.id || '—');
  const formSummary =
    model.forms.length === 1
      ? model.forms[0].name
      : `${model.forms.length} formularios incluidos`;
  y += kv(doc, MARGIN_X + 12, y, 'Formulario', formSummary);
  y += kv(
    doc,
    MARGIN_X + 12,
    y,
    'Fecha de generación',
    `${model.generatedAtLocal.fecha} ${model.generatedAtLocal.hora}`,
  );
  y += kv(doc, MARGIN_X + 12, y, 'Registros incluidos', model.summary.totalRecords);
  return y0 + 88;
}

function drawSummary(doc, model, startY) {
  let y = startY + 14;
  y = ensureSpace(doc, y, 40);
  y += 4;
  sectionTitle(doc, y, 'RESUMEN');
  y += 28;

  const s = model.summary;
  y += kv(doc, MARGIN_X, y, 'Registros incluidos', s.totalRecords);
  y += kv(doc, MARGIN_X, y, 'Formularios', s.totalForms);
  const periodText =
    s.period.first && s.period.last
      ? `${getDateParts(s.period.first).fecha} → ${getDateParts(s.period.last).fecha}`
      : 'Según registros seleccionados';
  y += kv(doc, MARGIN_X, y, 'Periodo de los registros', periodText);

  const statusParts = Object.entries(s.statusCounts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label.toLowerCase()}`);
  const statusText = statusParts.length ? statusParts.join(', ') : 'Sin estados';
  y += kv(doc, MARGIN_X, y, 'Estados', statusText);

  const compParts = Object.entries(s.complianceCounts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label.toLowerCase()}`);
  const compText = compParts.length ? compParts.join(', ') : 'Sin cumplimiento';
  y += kv(doc, MARGIN_X, y, 'Cumplimiento', compText);
  return y;
}

function drawFormContext(doc, form, moduleName, startY = 40) {
  let y = startY;
  sectionTitle(doc, y, 'CONTEXTO DEL FORMULARIO');
  y += 28;
  y += kv(doc, MARGIN_X, y, 'Formulario', form.name);
  y += kv(doc, MARGIN_X, y, 'Módulo', moduleName || form.moduleId || '—');
  y += kv(doc, MARGIN_X, y, 'Registros', form.records.length);
  return y;
}

function drawRecord(doc, record, startY) {
  let y = ensureSpace(doc, startY, 70) + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(`Registro ${record.displayId || '—'}`, MARGIN_X, y);
  y += 16;

  doc.setDrawColor(200, 205, 215);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  y += 14;

  y = ensureSpace(doc, y, 24);
  sectionTitle(doc, y, 'INFORMACIÓN DEL REGISTRO');
  y += 26;

  y += kv(doc, MARGIN_X, y, 'ID del registro', record.recordId || '—');
  if (record.criticalIssues.length > 0) {
    y += kv(doc, MARGIN_X, y, 'Hallazgos', record.criticalIssues.join('; '));
  }
  const statusValue = record.complianceLabel || record.statusLabel || '—';
  y += kv(doc, MARGIN_X, y, 'Estado', statusValue);
  y += kv(doc, MARGIN_X, y, 'Verificación', record.statusLabel || '—');
  if (record.verifiedAt) {
    y += kv(doc, MARGIN_X, y, 'Verificado', `${record.verifiedAt.date} ${record.verifiedAt.time}`);
  }
  if (record.verifier) {
    const verifierValue = record.verifierRol
      ? `${record.verifier} (${record.verifierRol})`
      : record.verifier;
    y += kv(doc, MARGIN_X, y, 'Verificado por', verifierValue);
  }
  if (record.verificationComment) {
    y += kv(doc, MARGIN_X, y, 'Comentario', record.verificationComment);
  }
  y += kv(doc, MARGIN_X, y, 'Usuario', record.user.nombre || '—');
  if (record.user.rol) y += kv(doc, MARGIN_X, y, 'Rol', record.user.rol);
  y += kv(
    doc,
    MARGIN_X,
    y,
    'Fecha de creación',
    `${record.createdAt.date} ${record.createdAt.time}`,
  );
  y += 8;

  const informativeFields = record.fields.filter((f) => f.presentation);
  const responseFields = record.fields.filter((f) => !f.presentation);

  // INFORMACIÓN DEL FORMULARIO — informative como DISPLAY BLOCK: presentación
  // estructural del formulario, independiente de las respuestas. NO genera
  // filas en Campo | Valor. Wrapping + altura dinámica + paginación segura.
  if (informativeFields.length > 0) {
    y = ensureSpace(doc, y, 24);
    sectionTitle(doc, y, 'INFORMACIÓN DEL FORMULARIO');
    y += 26;
    for (const f of informativeFields) {
      const lines = doc.splitTextToSize(f.label, CONTENT_W - 16);
      const bandLineHeight = 12;
      const bandPadding = 8;
      const bandHeight = lines.length * bandLineHeight + bandPadding;
      y = ensureSpace(doc, y, bandHeight + 4);
      doc.setFillColor(238, 242, 246);
      doc.rect(MARGIN_X, y, CONTENT_W, bandHeight, 'F');
      doc.setTextColor(...PRIMARY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(lines, MARGIN_X + 8, y + bandPadding + bandLineHeight);
      y += bandHeight + 4;
    }
    y += 4;
  }

  // DATOS DEL REGISTRO — SOLO campos respondibles (Campo | Valor).
  // El informative nunca aparece aquí ni como Campo ni como Valor.
  y = ensureSpace(doc, y, 24);
  sectionTitle(doc, y, 'DATOS DEL REGISTRO');
  y += 6;

  const tableStyles = {
    font: 'helvetica',
    fontSize: 9,
    cellPadding: 6,
    overflow: 'linebreak',
    textColor: INK,
  };
  const tableHead = [['Campo', 'Valor']];

  const renderTable = (body) => {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_X, right: MARGIN_X },
      head: tableHead,
      body,
      styles: tableStyles,
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_FILL },
      columnStyles: { 0: { cellWidth: 170, fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 10;
  };

  if (responseFields.length === 0) {
    renderTable([['Sin datos registrados', '—']]);
  } else {
    renderTable(responseFields.map((f) => [f.label, f.value]));
  }

  y = ensureSpace(doc, y, 24);
  sectionTitle(doc, y, 'FIRMAS Y EVIDENCIAS');
  y += 26;

  const signCount = record.signatures.length;
  const evCount = record.evidences.length;
  if (signCount + evCount === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text('Sin firmas ni evidencias registradas.', MARGIN_X, y);
    y += 14;
  } else {
    for (const sig of record.signatures) {
      y = ensureSpace(doc, y, 14);
      linkLine(doc, MARGIN_X, y, `${sig.text} — ${sig.label}`, sig.href);
      y += 14;
    }
    for (const ev of record.evidences) {
      y = ensureSpace(doc, y, 14);
      linkLine(doc, MARGIN_X, y, `${ev.text}${ev.file_type ? ` (${ev.file_type})` : ''}`, ev.href);
      y += 14;
    }
  }

  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Fin del registro ${record.displayId || record.recordId || '—'}.`, MARGIN_X, y);
  y += 16;

  return y;
}

/**
 * Renderiza el modelo como PDF y devuelve el `doc` (jsPDF).
 * `doc` es opcional (para pruebas inyecta uno).
 */
export function renderEvidenceReport({ model, doc, fileName }) {
  const target = doc || createDoc();

  drawHeaderBand(target, model);
  const afterId = drawIdentification(target, model);
  let y = drawSummary(target, model, afterId + 6);

  for (let f = 0; f < model.forms.length; f += 1) {
    const form = model.forms[f];
    if (f > 0) {
      target.addPage();
      y = 40;
    }
    y = ensureSpace(target, y, 80);
    y += 4;
    y = drawFormContext(target, form, model.module.name, y) + 6;

    for (const record of form.records) {
      y = drawRecord(target, record, y);
    }
    y += 8;
  }

  const total = target.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    drawFooter(target, model, i, total);
  }

  if (fileName && typeof target.save === 'function') {
    target.save(fileName);
  }
  return target;
}