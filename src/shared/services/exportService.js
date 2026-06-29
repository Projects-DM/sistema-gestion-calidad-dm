import { exportDataNormalizer } from '../utils/exportDataNormalizer';
import { excelExporter } from '../utils/excelExporter';

export function exportService({ registros, formato, nombreArchivo, moduleMeta = {} }) {
  console.log("Entró exportService");
  console.log("registros.length", registros?.length);

  if (!formatosCompatibles(formato)) {
    throw new Error(`Formato no soportado: ${formato}`);
  }

  const normalized = exportDataNormalizer({ registros, moduleMeta });
  console.log("normalized", normalized);
  console.log("normalized.sheets", normalized?.sheets);

  if (formato === 'xlsx' || formato === 'xls' || formato === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    excelExporter({ normalized, fileName: nombreArchivo });
    return;
  }

  // PDF/CSV future
}

function formatosCompatibles(formato) {
  return (
    formato === 'xlsx' ||
    formato === 'xls' ||
    formato === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}


