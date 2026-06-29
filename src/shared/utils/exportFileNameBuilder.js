export function buildExportFileName({ moduleId, moduleName, formatos, now = new Date() }) {
  const safe = (v) => {
    const s = (v ?? '').toString().trim();
    if (!s) return 'Reporte';
    return s
      .replace(/\s+/g, '_')
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 80);
  };

  const datePart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

  const base = safe(moduleName || moduleId || 'Reporte');
  return `${base}_${datePart}_${timePart}.${formatos || 'xlsx'}`;
}

