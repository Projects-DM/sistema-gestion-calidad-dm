function sanitizeBaseName(name) {
  const raw = (name ?? '').toString().trim();
  if (!raw) return 'Hoja';

  // Remove invalid characters for Excel sheet names
  // Excel invalid: : \ / ? * [ ]
  return raw.replace(/[\/:*?\[\]]/g, '');
}

function trimToMaxLen(name, maxLen) {
  const s = (name ?? '').toString();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function buildExcelSheetName(originalName, { existingNames, maxLen = 31 } = {}) {
  const existing = Array.isArray(existingNames) ? existingNames : [];

  const base = trimToMaxLen(sanitizeBaseName(originalName), maxLen);
  if (!base) {
    return buildExcelSheetName('Hoja', { existingNames: existing, maxLen });
  }

  if (!existing.includes(base)) {
    return base;
  }

  // Create a unique name by appending _2, _3 ... while respecting maxLen.
  // Example: "NombreTruncado" => "NombreTruncado_2"
  for (let i = 2; i < 10_000; i += 1) {
    const suffix = `_${i}`;
    const allowedBaseLen = maxLen - suffix.length;
    const truncatedBase = trimToMaxLen(base, allowedBaseLen);
    const candidate = `${truncatedBase}${suffix}`;

    if (!existing.includes(candidate)) {
      return candidate;
    }
  }

  // Fallback (should never happen)
  return trimToMaxLen(`${base}_${Date.now()}`, maxLen);
}

