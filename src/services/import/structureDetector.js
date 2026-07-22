const MODULE_KEYWORDS = [
  { keywords: ['calidad', 'aseguramiento', 'auditoria', 'norma', 'iso', 'inocuidad', 'higiene', 'sanitizacion', 'limpieza'], slug: 'calidad' },
  { keywords: ['operacion', 'produccion', 'proceso', 'fabricacion', 'elaboracion', 'linea'], slug: 'operaciones' },
  { keywords: ['trazabilidad', 'rastreo', 'lote', 'despacho', 'envio', 'salida', 'distribucion', 'logistica'], slug: 'trazabilidad' },
  { keywords: ['mantenimiento', 'reparacion', 'calibracion', 'equipo', 'maquina', 'instrumento'], slug: 'mantenimiento' },
  { keywords: ['recepcion', 'ingreso', 'entrada', 'proveedor', 'compra', 'adquisicion'], slug: 'operaciones' },
];

const RUNTIME_METADATA = [
  'fecha', 'fecha de creacion', 'fecha de emision', 'fecha de vencimiento', 'fecha elaboracion',
  'hora', 'hora de creacion',
  'dia', 'día',
  'mes',
  'año', 'anio', 'año',
  'usuario', 'creado por', 'creado_por', 'created by', 'creado',
  'actualizado por', 'actualizado_por', 'modificado por',
  'id', 'identificador', 'identificacion',
  'codigo', 'código',
  'folio',
  'version', 'versión',
  'nº', 'no.', 'numero de', 'número de', 'nro',
];

const TABLE_PATTERNS = [
  { columns: ['item', 'cumple', 'no cumple'], types: ['text', 'boolean', 'boolean'] },
  { columns: ['item', 'si', 'no'], types: ['text', 'boolean', 'boolean'] },
  { columns: ['item', 'conforme', 'no conforme'], types: ['text', 'boolean', 'boolean'] },
  { columns: ['parametro', 'resultado'], types: ['text', 'number'] },
  { columns: ['parametro', 'valor'], types: ['text', 'number'] },
  { columns: ['parametro', 'medicion'], types: ['text', 'number'] },
  { columns: ['parámetro', 'resultado'], types: ['text', 'number'] },
  { columns: ['producto', 'cantidad'], types: ['text', 'number'] },
  { columns: ['producto', 'precio'], types: ['text', 'number'] },
  { columns: ['nombre', 'valor'], types: ['text', 'number'] },
  { columns: ['nombre', 'descripcion'], types: ['text', 'textarea'] },
  { columns: ['item', 'descripcion', 'cantidad'], types: ['text', 'textarea', 'number'] },
  { columns: ['concepto', 'importe'], types: ['text', 'number'] },
  { columns: ['concepto', 'monto'], types: ['text', 'number'] },
];

const TYPE_RULES = [
  { type: 'boolean', priority: 90, keywords: ['si', 'no', 'sí', 'no'], label: /^(sí|si|no)\s*(\/|\||-)\s*(no|sí|si)$/i },
  { type: 'boolean', priority: 90, keywords: ['cumple', 'no cumple', 'no_cumple', 'nocumple'], label: /^(cumple|no cumple|no_cumple)\s*(\/|\||-)\s*(no cumple|cumple)$/i },
  { type: 'boolean', priority: 90, keywords: ['conforme', 'no conforme', 'no_conforme'], label: /^(conforme|no conforme)\s*(\/|\||-)\s*(no conforme|conforme)$/i },
  { type: 'boolean', priority: 85, keywords: ['aprobado', 'rechazado'], label: /^aprobado\s*(\/|\||-)\s*rechazado$/i },
  { type: 'boolean', priority: 85, keywords: ['verdadero', 'falso'], label: /^verdadero\s*(\/|\||-)\s*falso$/i },
  { type: 'boolean', priority: 80, keywords: ['autorizado', 'no autorizado', 'no_autorizado'], label: /^autorizado\s*(\/|\||-)\s*(no autorizado|no_autorizado)$/i },
  { type: 'boolean', priority: 75, keywords: ['aplica', 'no aplica', 'no_aplica'], label: /^aplica\s*(\/|\||-)\s*(no aplica|no_aplica)$/i },
  { type: 'boolean', priority: 70, keywords: ['check', 'casilla', 'ok', 'booleano'], label: /\b(booleano|check|casilla)\b/i },
  { type: 'boolean', priority: 60, keywords: ['cumple', 'nocumple'], label: /\b(cumple|no cumple|nocumple)\b/i },

  { type: 'signature', priority: 90, keywords: ['firma', 'firmar', 'firma digital'], label: /\b(firma|firmar|rúbrica|rubrica)\b/i },
  { type: 'signature', priority: 85, keywords: ['cargo', 'cargo responsable'], label: /^cargo$/i },
  { type: 'signature', priority: 85, keywords: ['verifica', 'verificacion'], label: /\b(verifica|verificación)\b/i },
  { type: 'signature', priority: 80, keywords: ['reviso', 'revisó', 'revisa'], label: /\b(reviso|revisó|revisa|revisión|revision)\b/i },
  { type: 'signature', priority: 80, keywords: ['aprobo', 'aprobó', 'aprueba'], label: /\b(aprobo|aprobó|aprueba|aprobación|aprobacion)\b/i },
  { type: 'signature', priority: 75, keywords: ['autoriza'], label: /\b(autoriza|autorización|autorizacion)\b/i },
  { type: 'signature', priority: 70, keywords: ['responsable', 'elaboro', 'elaboró'], label: /\b(elaboro|elaboró|responsable)\b/i },

  { type: 'number', priority: 90, keywords: ['temperatura', '°c', '°f', 'c°'], label: /\b(temperatura|°c|°f)\b/i },
  { type: 'number', priority: 90, keywords: ['hipoclorito'], label: /\bhipoclorito\b/i },
  { type: 'number', priority: 90, keywords: ['ppm'], label: /\bppm\b/i },
  { type: 'number', priority: 90, keywords: ['concentracion'], label: /\bconcentración|concentracion\b/i },
  { type: 'number', priority: 85, keywords: ['cantidad', 'cant'], label: /\b(cantidad|cant)\b/i },
  { type: 'number', priority: 85, keywords: ['numero', 'número', 'n°', 'nº'], label: /^(n[°º]|numero|número)\b/i },
  { type: 'number', priority: 85, keywords: ['total'], label: /\btotal\b/i },
  { type: 'number', priority: 85, keywords: ['peso', 'kg', 'g.', 'gramos', 'kilogramo'], label: /\b(peso|kg|g\.?|gramos|kilogramos|lb|libras)\b/i },
  { type: 'number', priority: 85, keywords: ['litro', 'ml', 'm3', 'volumen'], label: /\b(litro|ml|m3|volumen|capacidad)\b/i },
  { type: 'number', priority: 85, keywords: ['ph'], label: /\bph\b/i },
  { type: 'number', priority: 85, keywords: ['porcentaje', '%'], label: /\b(porcentaje|%|humedad)\b/i },
  { type: 'number', priority: 80, keywords: ['medida', 'medicion'], label: /\b(medida|medición|medicion)\b/i },
  { type: 'number', priority: 80, keywords: ['dimension'], label: /\bdimensión|dimension\b/i },
  { type: 'number', priority: 80, keywords: ['tolerancia'], label: /\btolerancia\b/i },
  { type: 'number', priority: 80, keywords: ['limite'], label: /\blímite|limite\b/i },
  { type: 'number', priority: 80, keywords: ['rango'], label: /\brango\b/i },
  { type: 'number', priority: 75, keywords: ['resultado'], label: /\bresultado\b/i },
  { type: 'number', priority: 75, keywords: ['valor'], label: /^valor$/i },
  { type: 'number', priority: 70, keywords: ['importe', 'monto', 'precio', 'costo'], label: /\b(importe|monto|precio|costo)\b/i },

  { type: 'textarea', priority: 80, keywords: ['observaciones', 'observacion'], label: /\b(observaciones|observacion)\b/i },
  { type: 'textarea', priority: 80, keywords: ['comentarios', 'comentario'], label: /\b(comentarios|comentario)\b/i },
  { type: 'textarea', priority: 80, keywords: ['descripcion'], label: /\bdescripción|descripcion\b/i },
  { type: 'textarea', priority: 75, keywords: ['detalle'], label: /\bdetalle\b/i },
  { type: 'textarea', priority: 75, keywords: ['nota', 'notas'], label: /^notas?\b/i },
  { type: 'textarea', priority: 70, keywords: ['texto largo', 'texto_largo'], label: /\b(texto largo|texto_largo)\b/i },
  { type: 'textarea', priority: 60, keywords: ['rarea'], label: /\brarea\b/i },

  { type: 'select', priority: 80, keywords: ['tipo'], label: /^tipo\b/i },
  { type: 'select', priority: 80, keywords: ['categoria'], label: /\bcategoría|categoria\b/i },
  { type: 'select', priority: 80, keywords: ['opcion'], label: /\bopción|opcion\b/i },
  { type: 'select', priority: 75, keywords: ['seleccionar', 'seleccione'], label: /\bseleccionar|seleccione\b/i },
  { type: 'select', priority: 75, keywords: ['estado'], label: /\bestado\b/i },
  { type: 'select', priority: 75, keywords: ['lista', 'dropdown'], label: /\b(lista|dropdown|opciones)\b/i },
  { type: 'select', priority: 75, keywords: ['motivo'], label: /\bmotivo\b/i },
  { type: 'select', priority: 70, keywords: ['area'], label: /\bárea|area\b/i },
  { type: 'select', priority: 70, keywords: ['departamento'], label: /\bdepartamento\b/i },
  { type: 'select', priority: 70, keywords: ['turno'], label: /\bturno\b/i },
  { type: 'select', priority: 70, keywords: ['proceso'], label: /\bproceso\b/i },
  { type: 'select', priority: 65, keywords: ['producto'], label: /^producto$/i },
  { type: 'select', priority: 65, keywords: ['proveedor'], label: /\bproveedor\b/i },
  { type: 'select', priority: 65, keywords: ['cliente'], label: /\bcliente\b/i },
  { type: 'select', priority: 65, keywords: ['ubicacion'], label: /\bubicación|ubicacion\b/i },
  { type: 'select', priority: 65, keywords: ['zona'], label: /\bzona\b/i },
  { type: 'select', priority: 60, keywords: ['color'], label: /\bcolor\b/i },
  { type: 'select', priority: 60, keywords: ['modelo'], label: /\bmodelo\b/i },
  { type: 'select', priority: 60, keywords: ['marca'], label: /\bmarca\b/i },
  { type: 'select', priority: 60, keywords: ['responsable'], label: /^responsable$/i },
];

function normalize(str) {
  return str.toLowerCase().trim().replace(/[áäàâ]/g, 'a').replace(/[éëèê]/g, 'e').replace(/[íïìî]/g, 'i').replace(/[óöòô]/g, 'o').replace(/[úüùû]/g, 'u').replace(/ñ/g, 'n');
}

function detectTablePattern(headers) {
  const normal = headers.map(h => normalize(h));
  outer: for (const pattern of TABLE_PATTERNS) {
    const patternNorm = pattern.columns.map(c => normalize(c));
    let pi = 0;
    const overrides = {};
    for (let i = 0; i < normal.length && pi < patternNorm.length; i++) {
      if (normal[i] === patternNorm[pi] || normal[i].includes(patternNorm[pi]) || patternNorm[pi].includes(normal[i])) {
        overrides[i] = pattern.types[pi];
        pi++;
      }
    }
    if (pi === patternNorm.length) return overrides;
  }
  return null;
}

function isRuntimeMetadata(label) {
  const norm = normalize(label);
  for (const meta of RUNTIME_METADATA) {
    const metaNorm = normalize(meta);
    if (norm === metaNorm || norm.startsWith(metaNorm) || metaNorm.startsWith(norm)) return true;
    if (norm.includes(metaNorm)) return true;
  }
  return false;
}

function detectFieldTypeByRules(labelLower) {
  let bestMatch = null;
  let bestPriority = -1;
  for (const rule of TYPE_RULES) {
    if (rule.label.test(labelLower) || rule.keywords.some(kw => {
      const kwNorm = normalize(kw);
      const labelNorm = normalize(labelLower);
      return labelNorm === kwNorm || labelNorm.includes(kwNorm);
    })) {
      if (rule.priority > bestPriority) {
        bestPriority = rule.priority;
        bestMatch = rule.type;
      }
    }
  }
  return bestMatch;
}

function detectFieldType(label, sampleValues) {
  const labelLower = label.toLowerCase();

  const ruleMatch = detectFieldTypeByRules(labelLower);
  if (ruleMatch) return ruleMatch;

  if (sampleValues && sampleValues.length > 0) {
    const nonEmpty = sampleValues.filter(v => v != null && v !== '');
    if (nonEmpty.length > 0) {
      const allNumbers = nonEmpty.every(v => !isNaN(Number(v)) && String(v).trim() !== '');
      if (allNumbers) return 'number';
      const avgLength = nonEmpty.reduce((sum, v) => sum + v.length, 0) / nonEmpty.length;
      if (avgLength > 80) return 'textarea';
      const uniqueRatio = new Set(nonEmpty).size / nonEmpty.length;
      if (uniqueRatio < 0.5 && nonEmpty.length > 3) return 'select';
    }
  }

  return 'text';
}

function detectRequired(labelLower) {
  return /\b(obligatorio|requerido|necesario|imprescindible|requisito|\*)\b/.test(labelLower) ||
         /\b(imprescindible|indispensable)\b/.test(labelLower);
}

export function detectStructure(rawModel, modules) {
  const { fileName, title, rows, rawHeaders, textContent } = rawModel;
  const name = title || fileName.replace(/\.\w+$/, '');
  const nameLower = name.toLowerCase();
  const textLower = (textContent || '').toLowerCase();

  let suggestedModuleId = null;
  let suggestedModuleName = null;
  for (const entry of MODULE_KEYWORDS) {
    if (entry.keywords.some(kw => nameLower.includes(kw) || textLower.includes(kw))) {
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

  const tableOverrides = rawHeaders && rawHeaders.length > 0 ? detectTablePattern(rawHeaders) : null;

  if (rawHeaders && rawHeaders.length > 0) {
    rawHeaders.forEach((header, idx) => {
      const label = header.trim();
      if (!label) return;
      const labelNorm = normalize(label);

      if (isRuntimeMetadata(labelNorm)) return;
      if (seenLabels.has(labelNorm)) return;
      seenLabels.add(labelNorm);

      const sampleValues = rows
        .filter(r => r[idx] != null && String(r[idx]).trim() !== '')
        .map(r => String(r[idx]));

      let fieldType;
      if (tableOverrides && tableOverrides[idx] !== undefined) {
        fieldType = tableOverrides[idx];
      } else {
        fieldType = detectFieldType(label, sampleValues);
      }

      const required = detectRequired(label.toLowerCase());
      const options = {};
      if (fieldType === 'select' && sampleValues.length > 0) {
        const choices = [...new Set(sampleValues)].filter(Boolean).slice(0, 50);
        if (choices.length > 1) options.choices = choices;
      }

      fields.push({ label, fieldType, required, orderIndex: idx + 1, options });
    });
  }

  if (fields.length === 0) {
    const lines = textContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      lines.forEach(line => {
        const parts = line.split(/[:|;\t]/).map(s => s.trim()).filter(Boolean);
        parts.forEach(part => {
          const label = part;
          if (!label || label.length < 3) return;
          const labelNorm = normalize(label);
          if (isRuntimeMetadata(labelNorm) || seenLabels.has(labelNorm)) return;
          seenLabels.add(labelNorm);
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

  return { suggestedName: name, suggestedModuleId, suggestedModuleName, fields };
}
