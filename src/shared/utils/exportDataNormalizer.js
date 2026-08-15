const XLSX_REQUIRED_COLUMNS = [
  'ID',
  'Fecha',
  'Hora',
  'Operario',
  'Rol',
  'Estado',
  'Verificado por',
  'Fecha verificación',
  'Comentarios'
];

export function getDateParts(isoString) {
  const d = isoString ? new Date(isoString) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return { fecha: '', hora: '' };
  }

  const fecha = d.toLocaleDateString();
  const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
}

export function normalizeSignatureCell({ valueText, signatureIndex }) {
  if (!valueText) {
    return '';
  }
  return {
    text: `Ver Firma${signatureIndex ? ` ${signatureIndex}` : ''}`,
    href: valueText,
  };
}


export function normalizeEvidenceCell(evidences, evidenceIndexStart) {
  if (!Array.isArray(evidences) || evidences.length === 0) return [];

  return evidences.map((ev, idx) => {
    const number = evidenceIndexStart + idx + 1;
    return {
      text: `Ver Evidencia ${number}`,
      href: ev?.file_url,
    };
  }).filter(x => x.href);
}

export function normalizeValue({ field, value }) {
  if (!field) return '';

  const fieldType = field.field_type;
  if (fieldType === 'boolean') {
    if (value && typeof value === 'object' && value.value) {
      const complianceValue = value.value;
      if (complianceValue === 'No cumple' && value.comment) {
        return `${complianceValue} - ${value.comment}`;
      }
      return complianceValue;
    }
    if (value === false) return 'No cumple';
    if (value === true) return 'Cumple';
    return '';
  }

  if (fieldType === 'number' && field?.options?.unit) {
    if (value === null || value === undefined) return '';
    if (value === '') return '';
    return `${value} ${field.options.unit}`;
  }

  if (value === null || value === undefined) return '';
  return value;
}

function toSignatureHref(valueText) {
  return valueText || '';
}

export function exportDataNormalizer({ registros }) {
  console.log("Entró normalizer");
  console.log("sortedRecords.length", Array.isArray(registros) ? registros.length : 0);
  const rowsBySheet = new Map();

  const columnsBySheet = new Map();

  const sortedRecords = Array.isArray(registros) ? registros : [];

  sortedRecords.forEach((record) => {
    const formName = record?.sgc_forms?.name || 'Formulario';

    if (!rowsBySheet.has(formName)) {
      rowsBySheet.set(formName, []);
      columnsBySheet.set(formName, null);
    }

    const dateParts = getDateParts(record?.created_at);

    const operario = record?.profiles?.nombre || '';
    const rol = record?.profiles?.rol || '';

    const verificadoPor = record?.verifier?.nombre || '';
    const fechaVerificacion = record?.verified_at ? new Date(record.verified_at).toLocaleDateString() : '';
    const comentarios = record?.verification_comment || '';

    const baseRow = {
      ID: record?.id ? record.id.split('-')[0] : record?.id || '',
      Fecha: dateParts.fecha,
      Hora: dateParts.hora,
      Operario: operario,
      Rol: rol,
      Estado: record?.status || '',
      'Verificado por': verificadoPor,
      'Fecha verificación': fechaVerificacion,
      Comentarios: comentarios,
    };

    const responseValues = record?.sgc_response_values || [];

    const sheetColumns = new Set(XLSX_REQUIRED_COLUMNS);

    // First pass: collect dynamic columns in original field order (by sgc_response_values order)
    responseValues.forEach((val) => {
      const field = val?.sgc_form_fields;
      if (!field) return;

      if (field.field_type === 'signature') {
        sheetColumns.add('Ver Firma');
        return;
      }

      sheetColumns.add(field.label);
    });

    // Always include Evidencias column
    sheetColumns.add('Evidencias');

    // Preserve order: required columns first, then dynamic labels in appearance order.

    const required = XLSX_REQUIRED_COLUMNS;
    const dynamicInOrder = [];
    const seen = new Set(required);

    responseValues.forEach((val) => {
      const field = val?.sgc_form_fields;
      if (!field) return;

      if (field.field_type === 'signature') {
        if (!seen.has('Ver Firma')) {
          dynamicInOrder.push('Ver Firma');
          seen.add('Ver Firma');
        }
        return;
      }

      if (!seen.has(field.label)) {
        dynamicInOrder.push(field.label);
        seen.add(field.label);
      }
    });

    if (!seen.has('Evidencias')) {
      dynamicInOrder.push('Evidencias');
      seen.add('Evidencias');
    }

    columnsBySheet.set(formName, [...required, ...dynamicInOrder]);

    // Build row
    const row = { ...baseRow };

    // Signatures and evidences: build descriptive hyperlinks
    let signatureCount = 0;
    responseValues.forEach((val) => {
      const field = val?.sgc_form_fields;
      if (!field) return;

      if (field.field_type === 'signature') {
        signatureCount += 1;
        const cell = normalizeSignatureCell({
          fieldLabel: field.label,
          valueText: val?.value_text,
          signatureIndex: signatureCount,
        });

        // For SheetJS, we will later represent hyperlinks. Keep value as href and text in normalizer.
        if (cell?.href) {
          row['Ver Firma'] = { __hyperlink: true, text: cell.text, href: toSignatureHref(cell.href) };
        }
        return;
      }

      const raw =
        field.field_type === 'boolean' && field?.options?.choices?.length > 0
          ? val?.value_json
          : field.field_type === 'boolean'
            ? val?.value_boolean
            : field.field_type === 'number'
            ? val?.value_number
            : val?.value_text;

      row[field.label] = normalizeValue({ field, value: raw });
    });

    const evidenceLinks = normalizeEvidenceCell(record?.sgc_evidences, 0);
    if (evidenceLinks.length > 0) {
      row['Evidencias'] = {
        __hyperlinks: true,
        items: evidenceLinks,
      };
    } else {
      row['Evidencias'] = '';
    }

    rowsBySheet.get(formName).push(row);
  });

  const sheets = Array.from(rowsBySheet.keys()).map((sheetName) => {
    const columns = columnsBySheet.get(sheetName) || XLSX_REQUIRED_COLUMNS;
    const rows = rowsBySheet.get(sheetName) || [];
    return { sheetName, columns, rows };
  });

  return {
    sheets,
    requiredColumns: XLSX_REQUIRED_COLUMNS,
  };
}

