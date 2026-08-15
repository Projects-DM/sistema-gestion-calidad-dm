/**
 * Evidence Report Model (Sprint 315)
 *
 * Transforma la selección EXISTENTE de Historial y Consulta (registros ya
 * cargados por `dynamicService.getModuleResponses`) en el modelo documental
 * del Informe de Evidencia de Registros.
 *
 * REGLAS (Sprint 315, §15):
 *  - El adapter recibe información; NO la obtiene (0 queries, 0 SSOT, 0 fetch).
 *  - Reutiliza EXACTAMENTE la normalización de valores que usa el XLSX actual
 *    (`exportDataNormalizer`) → el informe no puede perder información respecto
 *    a la exportación estructurada (§18).
 *  - No calcula estados ni fechas; presenta los que el sistema ya transporta.
 *  - Metadata Driven: la estructura de campos proviene de `sgc_response_values`
 *    + `sgc_form_fields` de cada registro, sin `if (formulario === ...)`.
 */
import {
  normalizeValue,
  normalizeSignatureCell,
  normalizeEvidenceCell,
  getDateParts,
} from '../utils/exportDataNormalizer.js';

export const ORG_NAME = 'DM DISTRIBUCIONES';
export const SYSTEM_NAME = 'SISTEMA DE GESTIÓN DE CALIDAD';
export const REPORT_TITLE = 'INFORME DE EVIDENCIA DE REGISTROS';

const STATUS_LABELS = {
  pendiente_revision: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  corregido: 'Corregido',
};

const COMPLIANCE_LABELS = {
  cumple: 'Cumple',
  advertencia: 'Alerta',
  critico: 'Crítico',
};

const pad = (n) => String(n).padStart(3, '0');

/**
 * Identificador documental propio del informe: EVID-YYYY-MM-DD-NNN.
 * Pertenece al DOCUMENTO generado, NO al registro (no reemplaza
 * `sgc_form_responses.id`).
 */
export function createEvidenceReportId(now = new Date(), sequence = 1) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `EVID-${y}-${m}-${d}-${pad(sequence)}`;
}

function buildRecord(rec) {
  const dateParts = getDateParts(rec?.created_at);
  const verifiedParts = rec?.verified_at ? getDateParts(rec.verified_at) : null;

  const fields = [];
  const signatures = [];
  let signatureCount = 0;

  for (const val of rec?.sgc_response_values || []) {
    const field = val?.sgc_form_fields;
    if (!field) continue;

    if (field.field_type === 'signature') {
      signatureCount += 1;
      const cell = normalizeSignatureCell({
        valueText: val?.value_text,
        signatureIndex: signatureCount,
      });
      if (cell?.href) {
        signatures.push({
          label: field.label || 'Firma del responsable',
          index: signatureCount,
          href: cell.href,
          text: cell.text,
        });
      }
      continue;
    }

    const raw =
      field.field_type === 'boolean' && field?.options?.choices?.length > 0
        ? val?.value_json
        : field.field_type === 'boolean'
          ? val?.value_boolean
          : field.field_type === 'number'
            ? val?.value_number
            : val?.value_text;

    fields.push({
      label: field.label,
      value: normalizeValue({ field, value: raw }),
    });
  }

  const evidenceLinks = normalizeEvidenceCell(rec?.sgc_evidences || [], 0);
  const evidences = (rec?.sgc_evidences || []).map((ev, idx) => ({
    file_url: ev?.file_url,
    file_type: ev?.file_type || '',
    text: evidenceLinks[idx]?.text || `Ver Evidencia ${idx + 1}`,
    href: evidenceLinks[idx]?.href || ev?.file_url,
  })).filter((e) => e.href);

  return {
    recordId: rec?.id || '',
    displayId: rec?.id ? String(rec.id).split('-')[0] : '',
    form: {
      id: rec?.sgc_forms?.id || '',
      name: rec?.sgc_forms?.name || '',
      moduleId: rec?.sgc_forms?.module_id || '',
    },
    user: {
      nombre: rec?.profiles?.nombre || '',
      rol: rec?.profiles?.rol || '',
    },
    createdAt: {
      iso: rec?.created_at || '',
      date: dateParts.fecha,
      time: dateParts.hora,
    },
    verifiedAt: verifiedParts ? { date: verifiedParts.fecha, time: verifiedParts.hora } : null,
    status: rec?.status || '',
    statusLabel: STATUS_LABELS[rec?.status] || rec?.status || '',
    computedStatus: rec?.computedStatus || null,
    complianceLabel: COMPLIANCE_LABELS[rec?.computedStatus] || null,
    formComplianceStatus: rec?.formComplianceStatus || null,
    complianceCounts: rec?.complianceCounts || null,
    verifier: rec?.verifier?.nombre || '',
    verifierRol: rec?.verifier?.rol || '',
    verificationComment: rec?.verification_comment || '',
    criticalIssues: Array.isArray(rec?.criticalIssues) ? rec.criticalIssues : [],
    fields,
    signatures,
    evidences,
  };
}

/**
 * Adapter → EvidenceReportModel. `registros` = la selección EXISTENTE de
 * Historial y Consulta (records ya cargados, con la forma de
 * `getModuleResponses`). `moduleName` es opcional (contexto ya disponible en
 * DynamicModule, NO una consulta nueva).
 */
export function buildEvidenceReportModel({
  registros,
  moduleId = '',
  moduleName = '',
  now = new Date(),
  documentSequence = 1,
}) {
  const list = Array.isArray(registros) ? registros : [];

  const forms = [];
  const byForm = new Map();
  for (const rec of list) {
    const name = rec?.sgc_forms?.name || 'Formulario';
    if (!byForm.has(name)) {
      const form = {
        id: rec?.sgc_forms?.id || '',
        name,
        moduleId: rec?.sgc_forms?.module_id || '',
        records: [],
      };
      byForm.set(name, form);
      forms.push(form);
    }
    byForm.get(name).records.push(buildRecord(rec));
  }

  const resolvedModuleId = moduleId || list[0]?.sgc_forms?.module_id || '';
  const module = { id: resolvedModuleId, name: moduleName };

  const statusCounts = { Pendiente: 0, Aprobado: 0, Rechazado: 0, Corregido: 0 };
  const complianceCounts = { Cumple: 0, Alerta: 0, Crítico: 0 };
  let first = null;
  let last = null;
  for (const rec of list) {
    const label = STATUS_LABELS[rec?.status];
    if (label && statusCounts[label] !== undefined) statusCounts[label] += 1;
    const compLabel = COMPLIANCE_LABELS[rec?.computedStatus];
    if (compLabel && complianceCounts[compLabel] !== undefined) complianceCounts[compLabel] += 1;
    const ts = rec?.created_at ? new Date(rec.created_at).getTime() : null;
    if (ts) {
      if (first === null || ts < first) first = ts;
      if (last === null || ts > last) last = ts;
    }
  }

  return {
    documentId: createEvidenceReportId(now, documentSequence),
    generatedAt: now.toISOString(),
    generatedAtLocal: getDateParts(now.toISOString()),
    orgName: ORG_NAME,
    systemName: SYSTEM_NAME,
    title: REPORT_TITLE,
    module,
    forms,
    summary: {
      totalRecords: list.length,
      totalForms: forms.length,
      statusCounts,
      complianceCounts,
      period: {
        first: first !== null ? new Date(first).toISOString() : null,
        last: last !== null ? new Date(last).toISOString() : null,
      },
    },
  };
}