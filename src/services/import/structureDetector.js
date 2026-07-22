const MODULE_KEYWORDS = [
  { keywords: ['calidad', 'calidad', 'aseguramiento', 'auditoria', 'norma', 'iso', 'inocuidad', 'higiene', 'sanitizacion', 'limpieza'], slug: 'calidad' },
  { keywords: ['operacion', 'operacione', 'produccion', 'producción', 'proceso', 'fabricacion', 'fabricación', 'elaboracion', 'elaboración', 'linea', 'línea'], slug: 'operaciones' },
  { keywords: ['trazabilidad', 'rastreo', 'lote', 'lote', 'despacho', 'envio', 'envío', 'salida', 'distribucion', 'distribución', 'logistica', 'logística'], slug: 'trazabilidad' },
  { keywords: ['mantenimiento', 'reparacion', 'reparación', 'calibracion', 'calibración', 'equipo', 'maquina', 'máquina', 'instrumento'], slug: 'mantenimiento' },
  { keywords: ['recepcion', 'recepción', 'ingreso', 'entrada', 'proveedor', 'compra', 'adquisicion', 'adquisición'], slug: 'operaciones' },
];

function detectFieldType(label, sampleValues) {
  const labelLower = label.toLowerCase();

  if (/\b(si|no|cumple|no.cumple|aprobado|rechazado|conforme|no.conforme|verdadero|falso|boolean|check|casilla|ok)\b/i.test(labelLower)) {
    return 'boolean';
  }

  if (/\b(firma|signature|firmar|rubrica|rúbrica)\b/i.test(labelLower)) {
    return 'signature';
  }

  if (sampleValues && sampleValues.length > 0) {
    const nonEmpty = sampleValues.filter(v => v != null && v !== '');
    if (nonEmpty.length > 0) {
      const allNumbers = nonEmpty.every(v => !isNaN(Number(v)) && v.trim() !== '');
      const hasDecimal = nonEmpty.some(v => v.includes('.') || v.includes(','));
      if (allNumbers) {
        return hasDecimal ? 'number' : 'number';
      }
      const avgLength = nonEmpty.reduce((sum, v) => sum + v.length, 0) / nonEmpty.length;
      if (avgLength > 80) {
        return 'textarea';
      }
      const uniqueRatio = new Set(nonEmpty).size / nonEmpty.length;
      if (uniqueRatio < 0.5 && nonEmpty.length > 3) {
        return 'select';
      }
    }
  }

  if (/\b(observacion|observaciones|comentario|comentarios|descripcion|descripción|detalle|nota|notas|texto.largo|rarea)\b/i.test(labelLower)) {
    return 'textarea';
  }

  if (/\b(cantidad|numero|número|n°|total|peso|kg|g|mg|litro|ml|m3|temperatura|°c|°f|ph|porcentaje|humedad|ppm|medida|dimension|dimensión|tolerancia|limite|límite|rango)\b/i.test(labelLower)) {
    return 'number';
  }

  if (/\b(tipo|categoria|categoría|opcion|opción|seleccionar|seleccione|estado|opciones|lista|dropdown|motivo|responsable|area|área|departamento|turno|producto|proveedor|cliente|ubicacion|ubicación|zona|color|modelo|marca)\b/i.test(labelLower)) {
    return 'select';
  }

  return 'text';
}

function detectRequired(labelLower) {
  const requiredHints = [
    /\b(obligatorio|requerido|necesario|imprescindible|requisito|\*)\b/,
    /\b(imprescindible|indispensable)\b/,
  ];
  return requiredHints.some(pattern => pattern.test(labelLower));
}

export function detectStructure(rawModel, modules) {
  const { fileName, title, rows, rawHeaders, textContent } = rawModel;

  const name = title || fileName.replace(/\.\w+$/, '');

  let suggestedModuleId = null;
  let suggestedModuleName = null;
  const nameLower = name.toLowerCase();
  const textLower = (textContent || '').toLowerCase();
  for (const entry of MODULE_KEYWORDS) {
    const matches = entry.keywords.some(kw => nameLower.includes(kw) || textLower.includes(kw));
    if (matches) {
      const found = modules.find(m => m.slug === entry.slug);
      if (found) {
        suggestedModuleId = found.id;
        suggestedModuleName = found.name;
        break;
      }
    }
  }

  const fields = [];
  const seenLabels = new Set();

  if (rawHeaders && rawHeaders.length > 0) {
    rawHeaders.forEach((header, idx) => {
      const label = header.trim();
      if (!label || seenLabels.has(label.toLowerCase())) return;
      seenLabels.add(label.toLowerCase());

      const sampleValues = rows
        .filter(r => r[idx] != null && String(r[idx]).trim() !== '')
        .map(r => String(r[idx]));

      const fieldType = detectFieldType(label, sampleValues);
      const required = detectRequired(label.toLowerCase());

      const options = {};
      if (fieldType === 'select' && sampleValues.length > 0) {
        const choices = [...new Set(sampleValues)].filter(Boolean).slice(0, 50);
        if (choices.length > 1) {
          options.choices = choices;
        }
      }

      fields.push({ label, fieldType, required, orderIndex: idx + 1, options });
    });
  }

  if (fields.length === 0) {
    const lines = textContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      lines.forEach((line, idx) => {
        const parts = line.split(/[:|;\t]/).map(s => s.trim()).filter(Boolean);
        parts.forEach((part, pidx) => {
          const label = part;
          if (!label || label.length < 3 || seenLabels.has(label.toLowerCase())) return;
          seenLabels.add(label.toLowerCase());
          const fieldType = detectFieldType(label, []);
          const required = detectRequired(label.toLowerCase());
          fields.push({ label, fieldType, required, orderIndex: fields.length + 1, options: {} });
        });
      });
    }
  }

  if (fields.length === 0) {
    fields.push({ label: 'Campo 1', fieldType: 'text', required: false, orderIndex: 1, options: {} });
  }

  return {
    suggestedName: name,
    suggestedModuleId,
    suggestedModuleName,
    fields,
  };
}
