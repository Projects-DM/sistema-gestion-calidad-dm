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
  'codigo', 'código', 'cod.',
  'folio',
  'version', 'versión',
  'nº', 'no.', 'numero de', 'número de', 'nro',
  'registro',
];

const DOCUMENT_METADATA = [
  'pagina', 'página', 'pag.',
  'vigencia',
  'manual',
  'procedimiento',
  'nombre del formato', 'nombre formato',
  'encabezado', 'encabezados',
  'tipo de documento',
  'area responsable',
  'proceso responsable',
  'documento',
];

const BUSINESS_ROLES = [
  'cargo', 'cargo responsable',
  'responsable',
  'elaboro', 'elaboró',
  'preparo', 'preparó',
  'aprobo', 'aprobó',
  'recibio', 'recibió',
  'reviso', 'revisó',
  'revision', 'revisión',
  'autorizo', 'autorizó',
];

const CHECKLIST_PAIRS = [
  { left: /^c$/i, right: /^nc$/i, outputLabel: 'Cumple / No Cumple' },
  { left: /^si$/i, right: /^no$/i, outputLabel: 'Sí / No' },
  { left: /^sí$/i, right: /^no$/i, outputLabel: 'Sí / No' },
  { left: /^cumple$/i, right: /^(no cumple|nocumple|no_cumple)$/i, outputLabel: 'Cumple / No Cumple' },
  { left: /^conforme$/i, right: /^(no conforme|no_conforme)$/i, outputLabel: 'Conforme / No Conforme' },
];

const TYPE_RULES = [
  // -- BOOLEAN / CHECKLIST --
  { type: 'boolean', priority: 95, keywords: ['c', 'nc'], label: /^[cn]c$/i },
  { type: 'boolean', priority: 90, keywords: ['si', 'no', 'sí'], label: /^(sí|si|no)\s*(\/|\||-)\s*(no|sí|si)$/i },
  { type: 'boolean', priority: 90, keywords: ['cumple', 'no cumple', 'no_cumple', 'nocumple'], label: /^(cumple|no cumple|no_cumple)\s*(\/|\||-)\s*(no cumple|cumple)$/i },
  { type: 'boolean', priority: 90, keywords: ['conforme', 'no conforme', 'no_conforme'], label: /^(conforme|no conforme)\s*(\/|\||-)\s*(no conforme|conforme)$/i },
  { type: 'boolean', priority: 85, keywords: ['aprobado', 'rechazado'], label: /^aprobado\s*(\/|\||-)\s*rechazado$/i },
  { type: 'boolean', priority: 85, keywords: ['verdadero', 'falso'], label: /^verdadero\s*(\/|\||-)\s*falso$/i },
  { type: 'boolean', priority: 80, keywords: ['autorizado', 'no autorizado', 'no_autorizado'], label: /^autorizado\s*(\/|\||-)\s*(no autorizado|no_autorizado)$/i },
  { type: 'boolean', priority: 75, keywords: ['aplica', 'no aplica', 'no_aplica'], label: /^aplica\s*(\/|\||-)\s*(no aplica|no_aplica)$/i },
  { type: 'boolean', priority: 70, keywords: ['cu'], label: /^cu$/i },
  { type: 'boolean', priority: 70, keywords: ['nc'], label: /^nc$/i },

  // -- SIGNATURE (only Verifica + Firma) --
  { type: 'signature', priority: 90, keywords: ['firma', 'firmar', 'firma digital'], label: /\b(firma|firmar|rúbrica|rubrica)\b/i },
  { type: 'signature', priority: 85, keywords: ['verifica', 'verificacion'], label: /\b(verifica|verificación)\b/i },

  // -- NUMBER --
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
  { type: 'number', priority: 80, keywords: ['medida', 'medicion', 'medición'], label: /\b(medida|medición|medicion)\b/i },
  { type: 'number', priority: 80, keywords: ['dimension'], label: /\bdimensión|dimension\b/i },
  { type: 'number', priority: 80, keywords: ['tolerancia'], label: /\btolerancia\b/i },
  { type: 'number', priority: 80, keywords: ['limite'], label: /\blímite|limite\b/i },
  { type: 'number', priority: 80, keywords: ['rango'], label: /\brango\b/i },
  { type: 'number', priority: 75, keywords: ['resultado'], label: /\bresultado\b/i },
  { type: 'number', priority: 75, keywords: ['valor'], label: /^valor$/i },
  { type: 'number', priority: 70, keywords: ['importe', 'monto', 'precio', 'costo'], label: /\b(importe|monto|precio|costo)\b/i },

  // -- TEXTAREA --
  { type: 'textarea', priority: 85, keywords: ['accion correctiva', 'acción correctiva'], label: /\b(accion correctiva|acción correctiva)\b/i },
  { type: 'textarea', priority: 85, keywords: ['hallazgos', 'hallazgo'], label: /\bhallazgos?\b/i },
  { type: 'textarea', priority: 85, keywords: ['recomendaciones', 'recomendacion'], label: /\brecomendacion(es)?\b/i },
  { type: 'textarea', priority: 80, keywords: ['observaciones', 'observacion'], label: /\b(observaciones|observacion)\b/i },
  { type: 'textarea', priority: 80, keywords: ['comentarios', 'comentario'], label: /\b(comentarios|comentario)\b/i },
  { type: 'textarea', priority: 80, keywords: ['descripcion'], label: /\bdescripción|descripcion\b/i },
  { type: 'textarea', priority: 75, keywords: ['detalle'], label: /\bdetalle\b/i },
  { type: 'textarea', priority: 75, keywords: ['nota', 'notas'], label: /^notas?\b/i },
  { type: 'textarea', priority: 70, keywords: ['texto largo', 'texto_largo'], label: /\b(texto largo|texto_largo)\b/i },

  // -- SELECT --
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
];

const OPERATIONAL_VERBS = /\b(limpiar|lavar|enjuagar|secar|desinfectar|ordenar|organizar|llenar|vaciar|encender|apagar|abrir|cerrar|pesar|calibrar|ajustar|configurar|registrar|marcar|sellar|cortar|mezclar|batir|hornear|cocinar|enfriar|calentar|hervir|descongelar|congelar|filtrar|separar|tamizar|empaquetar|etiquetar|rotular|transportar|almacenar|seleccionar)\b/i;

function normalize(str) {
  return str.toLowerCase().trim().replace(/[áäàâ]/g, 'a').replace(/[éëèê]/g, 'e').replace(/[íïìî]/g, 'i').replace(/[óöòô]/g, 'o').replace(/[úüùû]/g, 'u').replace(/ñ/g, 'n');
}

function isDocumentMetadata(label) {
  if (label.length <= 1) return false;
  const norm = normalize(label);
  for (const meta of DOCUMENT_METADATA) {
    if (norm === meta || norm.startsWith(meta) || meta.startsWith(norm)) return true;
    if (norm.includes(meta)) return true;
  }
  if (/^(fo|pr|po|it|in|mc|an|pl|re|di|pe|ca|rg|fr|doc)[-\s]?\d+$/i.test(norm)) return true;
  if (/^[a-z]{2,4}-[a-z]{2,4}-\d+$/i.test(norm)) return true;
  return false;
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

function isBusinessRole(label) {
  const norm = normalize(label);
  return BUSINESS_ROLES.some(role => {
    const roleNorm = normalize(role);
    return norm === roleNorm || norm.includes(roleNorm) || roleNorm.includes(norm);
  });
}

function isStandaloneNumber(label) {
  return /^\d{2,4}$/.test(label.trim());
}

function buildColumnDefs(rawHeaders) {
  const defs = [];
  let skipNext = false;
  for (let i = 0; i < rawHeaders.length; i++) {
    if (skipNext) { skipNext = false; continue; }
    const curr = rawHeaders[i].trim();
    if (!curr) continue;
    const currNorm = normalize(curr);
    const next = i + 1 < rawHeaders.length ? rawHeaders[i + 1].trim() : '';
    const nextNorm = normalize(next);

    let merged = false;
    for (const pair of CHECKLIST_PAIRS) {
      if (pair.left.test(currNorm) && pair.right.test(nextNorm)) {
        defs.push({ label: pair.outputLabel, sourceIndices: [i, i + 1], forceType: 'boolean', isChecklist: true });
        skipNext = true;
        merged = true;
        break;
      }
    }
    if (!merged) {
      defs.push({ label: curr, sourceIndices: [i], forceType: null, isChecklist: false });
    }
  }
  return defs;
}

function detectInspectionBlocks(columnDefs) {
  const MIN_BLOCK = 5;
  const MAX_LABEL_LEN = 35;
  const MEASUREMENT_UNITS = /\b(°c|°f|kg|g|mg|ml|l|m|cm|mm|ppm|ph|%|unidad|unidades|metros|litros|grados)\b/i;

  let i = 0;
  while (i < columnDefs.length) {
    if (columnDefs[i].forceType || columnDefs[i].label.length < 3 || columnDefs[i].label.length > MAX_LABEL_LEN) {
      i++;
      continue;
    }

    let j = i;
    while (j < columnDefs.length) {
      const lbl = columnDefs[j].label;
      if (columnDefs[j].forceType) break;
      if (lbl.length < 3 || lbl.length > MAX_LABEL_LEN) break;
      if (OPERATIONAL_VERBS.test(lbl)) break;
      if (MEASUREMENT_UNITS.test(lbl)) break;
      j++;
    }

    if (j - i >= MIN_BLOCK) {
      for (let k = i; k < j; k++) {
        columnDefs[k].forceType = 'boolean';
        columnDefs[k].isChecklist = true;
      }
    }
    i = j + 1;
  }
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

function getSampleValues(sourceIndices, rows) {
  const values = [];
  for (const idx of sourceIndices) {
    rows.forEach(r => {
      if (r[idx] != null && String(r[idx]).trim() !== '') {
        values.push(String(r[idx]));
      }
    });
  }
  return values;
}

function cleanFormName(name) {
  let cleaned = name;
  if (/^(fo|pr|in|rg|fr|doc|po|it|mc|an|pl|re|di|pe|ca)[-\s]?\d+/i.test(cleaned)) return '';
  cleaned = cleaned.replace(/^(pagina|página)\s+\d+\s+(de|del|of)\s+\d+/i, '').trim();
  cleaned = cleaned.replace(/^(versión|version)\s+\d+/i, '').trim();
  cleaned = cleaned.replace(/^código\s+fo/i, '').trim();
  cleaned = cleaned.replace(/^codigo\s+fo/i, '').trim();
  return cleaned || name;
}

export function detectStructure(rawModel, modules) {
  const { fileName, title, rows, rawHeaders, textContent } = rawModel;
  let name = title || fileName.replace(/\.\w+$/, '');
  name = cleanFormName(name) || fileName.replace(/\.\w+$/, '');
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

  let fields = [];
  const seenLabels = new Set();

  if (rawHeaders && rawHeaders.length > 0) {
    const columnDefs = buildColumnDefs(rawHeaders);
    detectInspectionBlocks(columnDefs);

    for (const colDef of columnDefs) {
      const label = colDef.label;
      const labelNorm = normalize(label);

      if (label.length <= 1) continue;
      if (isStandaloneNumber(labelNorm)) continue;
      if (isDocumentMetadata(labelNorm)) continue;
      if (isRuntimeMetadata(labelNorm)) continue;
      if (isBusinessRole(labelNorm)) continue;
      if (seenLabels.has(labelNorm)) continue;
      seenLabels.add(labelNorm);

      const sampleValues = getSampleValues(colDef.sourceIndices, rows);
      const fieldType = colDef.forceType || detectFieldType(label, sampleValues);

      const options = {};
      if (fieldType === 'select' && sampleValues.length > 0) {
        const choices = [...new Set(sampleValues)].filter(Boolean).slice(0, 50);
        if (choices.length > 1) options.choices = choices;
      }

      fields.push({ label, fieldType, required: true, orderIndex: 0, options });
    }
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
          if (isStandaloneNumber(labelNorm)) return;
          if (isDocumentMetadata(labelNorm)) return;
          if (isRuntimeMetadata(labelNorm)) return;
          if (isBusinessRole(labelNorm)) return;
          if (seenLabels.has(labelNorm)) return;
          seenLabels.add(labelNorm);
          const fieldType = detectFieldType(label, []);
          fields.push({ label, fieldType, required: true, orderIndex: fields.length + 1, options: {} });
        });
      });
    }
  }

  let maxConsecBool = 0;
  let currConsecBool = 0;
  let lastBoolIdx = -1;
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].fieldType === 'boolean') {
      currConsecBool++;
      maxConsecBool = Math.max(maxConsecBool, currConsecBool);
      lastBoolIdx = i;
    } else {
      currConsecBool = 0;
    }
  }

  if (maxConsecBool >= 3 && lastBoolIdx >= 0 && !seenLabels.has(normalize('observaciones'))) {
    fields.splice(lastBoolIdx + 1, 0, { label: 'Observaciones', fieldType: 'textarea', required: false, orderIndex: 0, options: {} });
  }

  const hasSignature = fields.some(f => f.fieldType === 'signature');
  fields = fields.filter(f => f.fieldType !== 'signature');
  if (hasSignature) {
    fields.push({ label: 'Verifica', fieldType: 'signature', required: true, orderIndex: 0, options: {} });
  }

  for (const field of fields) {
    field.required = field.fieldType !== 'textarea';
  }

  fields.forEach((f, i) => { f.orderIndex = i + 1; });

  if (fields.length === 0) {
    fields.push({ label: 'Campo 1', fieldType: 'text', required: true, orderIndex: 1, options: {} });
  }

  return { suggestedName: name, suggestedModuleId, suggestedModuleName, fields };
}
