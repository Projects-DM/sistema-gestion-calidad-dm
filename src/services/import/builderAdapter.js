export function adaptDetectedStructure(detectedStructure, selectedModuleId, selectedModuleName) {
  const fields = detectedStructure.fields.map((f, idx) => {
    const slugName = f.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const allowedTypes = ['text', 'textarea', 'number', 'boolean', 'select', 'signature'];

    // Boolean with compliance options stays as boolean — the unified Checklist workflow
    let fieldType = f.fieldType;
    if (!allowedTypes.includes(fieldType)) {
      fieldType = 'text';
    }

    return {
      name: slugName || `campo_${idx + 1}`,
      label: f.label,
      field_type: fieldType,
      required: f.required,
      options: f.options || {},
      order_index: idx + 1,
    };
  });

  return {
    name: detectedStructure.suggestedName,
    moduleId: selectedModuleId || detectedStructure.suggestedModuleId,
    moduleName: selectedModuleName || detectedStructure.suggestedModuleName,
    fields,
  };
}
