/**
 * Sprint 325 — Media Processing Core.
 * CAPTURE ONCE · PROCESS ONCE · STORE ONCE · REUSE EVERYWHERE.
 *
 * Capabilidad pura y reutilizable: recibe un File (imagen) y entrega un
 * artefacto procesado (resize + compresión + normalización de formato).
 * NO interactúa con Supabase, ni hace queries, ni persiste, ni genera URLs,
 * ni muta el archivo original. El procesado es explícito y no destructivo.
 */
export const MEDIA_ERROR = Object.freeze({
  INVALID_IMAGE: 'INVALID_IMAGE',
  MEDIA_PROCESSING_FAILED: 'MEDIA_PROCESSING_FAILED',
});

export const DEFAULT_OPTIONS = Object.freeze({
  maxWidth: 1920,
  maxHeight: 1440,
  quality: 0.82,
  outputType: 'auto', // 'auto' | 'image/jpeg' | 'image/png' | 'image/webp'
});

export function computeTargetDimensions({
  width,
  height,
  maxWidth = DEFAULT_OPTIONS.maxWidth,
  maxHeight = DEFAULT_OPTIONS.maxHeight,
}) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  let w = width;
  let h = height;
  if (w > maxWidth) {
    h = Math.round(h * (maxWidth / w));
    w = maxWidth;
  }
  if (h > maxHeight) {
    w = Math.round(w * (maxHeight / h));
    h = maxHeight;
  }
  return { width: w, height: h };
}

export function mimeToExtension(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function hasAlphaChannel(canvas) {
  try {
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { width } = canvas;
    let transparent = 0;
    for (let y = 2; y < canvas.height - 2; y += 3) {
      for (let x = 2; x < width - 2; x += 3) {
        if (data[(y * width + x) * 4 + 3] < 250) transparent++;
      }
    }
    return transparent > 0;
  } catch {
    return false;
  }
}

export function resolveOutputType(inputMime, hasAlpha, outputType = DEFAULT_OPTIONS.outputType) {
  if (outputType && outputType !== 'auto') return outputType;
  if (inputMime === 'image/png' && hasAlpha) return 'image/png';
  return 'image/jpeg';
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallback a <img> si createImageBitmap falla
    }
  }
  if (typeof Image === 'undefined') {
    throw new Error('image decode unavailable');
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image decode failed'));
    };
    img.src = url;
  });
}

export async function processImage(file, options = {}) {
  if (!file || typeof file.size !== 'number') {
    throw Object.assign(new Error('Archivo no válido'), { code: MEDIA_ERROR.INVALID_IMAGE });
  }
  const inputMime = (file.type || '').toLowerCase();
  if (!inputMime.startsWith('image/')) {
    throw Object.assign(new Error('No es una imagen'), { code: MEDIA_ERROR.INVALID_IMAGE });
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  let source;
  try {
    source = await decodeImage(file);
  } catch {
    throw Object.assign(new Error('No se pudo decodificar la imagen'), {
      code: MEDIA_ERROR.INVALID_IMAGE,
    });
  }

  const naturalWidth = source.naturalWidth || source.width;
  const naturalHeight = source.naturalHeight || source.height;
  const dims = computeTargetDimensions({
    width: naturalWidth,
    height: naturalHeight,
    maxWidth: opts.maxWidth,
    maxHeight: opts.maxHeight,
  });
  if (!dims) {
    throw Object.assign(new Error('Dimensiones de imagen no válidas'), {
      code: MEDIA_ERROR.INVALID_IMAGE,
    });
  }

  let canvas;
  try {
    canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, dims.width, dims.height);
  } catch {
    throw Object.assign(new Error('No se pudo renderizar la imagen'), {
      code: MEDIA_ERROR.MEDIA_PROCESSING_FAILED,
    });
  }

  const mimeType = resolveOutputType(inputMime, hasAlphaChannel(canvas), opts.outputType);

  let blob;
  try {
    blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob devolvió null'))),
        mimeType,
        opts.quality
      );
    });
  } catch {
    throw Object.assign(new Error('Fallo al comprimir la imagen'), {
      code: MEDIA_ERROR.MEDIA_PROCESSING_FAILED,
    });
  }

  const processedSize = blob.size;
  const baseName = (file.name || 'imagen').replace(/\.[^.]+$/, '');
  const processedFile = new File([blob], `${baseName}.${mimeToExtension(mimeType)}`, {
    type: mimeType,
  });

  return {
    blob,
    file: processedFile,
    mimeType,
    width: dims.width,
    height: dims.height,
    originalSize,
    processedSize,
  };
}

export default processImage;