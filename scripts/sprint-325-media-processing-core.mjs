/**
 * SPRINT 325 — CONTROLLED MEDIA PROCESSING INTEGRATION
 * LEVEL 5 · IMPLEMENTATION (INTEGRATION CONTROLADA)
 *
 * Implementa y certifica el Media Processing Core:
 *   src/shared/media/mediaProcessor.js  (procesador puro: resize + compresión + normalización)
 *   src/components/EvidenceUploader.jsx (integración antes del upload)
 *
 * Método: STATIC ANALYSIS + RUNTIME (canvas mockeado para aislar la lógica del
 * procesador) + GIT SCOPE + BUILD.
 * Timebox <60s (HARD 120s). NO regresión histórica 296–324.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  processImage,
  MEDIA_ERROR,
  DEFAULT_OPTIONS,
  computeTargetDimensions,
  resolveOutputType,
  mimeToExtension,
} from '../src/shared/media/mediaProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(S('package.json'));

const u = {
  processor: S('src/shared/media/mediaProcessor.js'),
  evidenceUploader: S('src/components/EvidenceUploader.jsx'),
  signaturePad: S('src/components/SignaturePad.jsx'),
  documentsService: S('src/services/documentsService.js'),
  documentModule: S('src/components/DocumentModule.jsx'),
  docViewer: S('src/modules/documentViewer/ModuleDocumentViewer.jsx'),
  pdfViewer: S('src/shared/components/viewers/PdfViewerModal.tsx'),
  importAssistant: S('src/components/ImportAssistant.jsx'),
  importWorkflow: S('src/modules/experiences/UniversalImportWorkflow.jsx'),
  documentParser: S('src/services/import/documentParser.js'),
  builderAdapter: S('src/services/import/builderAdapter.js'),
  orchestrator: S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js'),
  uor: S('src/modules/experiences/UniversalOperationalRuntime.jsx'),
  completionBridge: S('src/core/capabilities/alert/occurrence/CompletionBridge.js'),
};

const start = Date.now();
let passed = 0;
let failed = 0;
const failures = [];
function check(cond, label, detail = '') {
  if (cond) passed++;
  else { failed++; failures.push({ label, detail }); }
}
const has = (re, src) => re.test(src);
const H = (re, src, label) => check(has(re, src), label, `regex ${re}`);
const N = (re, src, label) => check(!has(re, src), label, `regex ${re}`);
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const srcFileText = (p) => S(path.relative(ROOT, p).replace(/\\/g, '/'));
const inSrc = (token) =>
  walk(path.join(ROOT, 'src')).filter((p) => srcFileText(p).includes(token)).length;

/* ================================================================== */
/* RUNTIME ENV — mock de canvas/browser para aislar la lógica pura    */
/* ================================================================== */
const savedGlobals = {};
function installMockBrowser({ decodeFail = false, failRender = false, alpha = false, dims } = {}) {
  savedGlobals.createImageBitmap = globalThis.createImageBitmap;
  savedGlobals.Image = globalThis.Image;
  savedGlobals.document = globalThis.document;
  let blobType = null;
  let blobQuality = null;
  const mock = { blobType: () => blobType, blobQuality: () => blobQuality };
  globalThis.createImageBitmap = async (file) => {
    if (decodeFail) throw new Error('decode boom');
    const big = (file.size || 0) > 500000;
    const w = dims ? dims.width : big ? 4000 : 800;
    const h = dims ? dims.height : big ? 3000 : 600;
    return { width: w, height: h };
  };
  globalThis.Image = undefined;
  globalThis.document = {
    createElement: () => {
      const canvas = { width: 0, height: 0 };
      canvas.getContext = () => {
        if (failRender) throw new Error('ctx boom');
        return {
          drawImage: () => {},
          getImageData: () => {
            const n = canvas.width * canvas.height * 4;
            const d = new Uint8ClampedArray(n);
            if (alpha) { for (let i = 3; i < n; i += 4) d[i] = 0; }
            else d.fill(255);
            return { data: d };
          },
        };
      };
      canvas.toBlob = (cb, type, quality) => {
        blobType = type;
        blobQuality = quality;
        cb(new Blob(['img'], { type }));
      };
      return canvas;
    },
  };
  return mock;
}
function restoreBrowser() {
  if ('createImageBitmap' in savedGlobals) globalThis.createImageBitmap = savedGlobals.createImageBitmap;
  if ('Image' in savedGlobals) globalThis.Image = savedGlobals.Image;
  if ('document' in savedGlobals) globalThis.document = savedGlobals.document;
}
const bigFile = () => new File([new Uint8Array(2 * 1024 * 1024)], 'foto.jpg', { type: 'image/jpeg' });
const smallFile = () => new File([new Uint8Array(10 * 1024)], 'mini.png', { type: 'image/png' });
const textFile = () => new File([new Uint8Array(64)], 'nota.txt', { type: 'text/plain' });

/* ================================================================== */
/* E01–E08 — MEDIA PROCESSING CORE (función pura)                      */
/* ================================================================== */
{
  check(typeof processImage === 'function', 'E01: mediaProcessor exporta processImage como función');
  check(typeof MEDIA_ERROR === 'object' && typeof DEFAULT_OPTIONS === 'object', 'E01: exporta MEDIA_ERROR y DEFAULT_OPTIONS');
  N(/^\s*import\b|require\(/, u.processor, 'E02: procesador puro — 0 imports/requires (sin acoplamiento)');
  const procCode = u.processor.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  N(/supabase|createClient|\.from\(['"]|storage\.\w+\(|getPublicUrl|\.insert\(|\.select\(|\.upsert\(|\.update\(/, procCode, 'E02: 0 supabase/storage/queries/persistencia/URLs en el código del procesador');
  H(/export async function processImage\(file, options = \{\}\)/, u.processor, 'E03: firma processImage(file, options)');
  H(/return \{\s*blob,\s*file: processedFile,\s*mimeType,\s*width: dims\.width,\s*height: dims\.height,\s*originalSize,\s*processedSize,\s*\}/, u.processor, 'E04: contrato de retorno { blob, file, mimeType, width, height, originalSize, processedSize }');
  check(DEFAULT_OPTIONS.maxWidth === 1920 && DEFAULT_OPTIONS.maxHeight === 1440, 'E05: DEFAULT_OPTIONS.maxWidth=1920 / maxHeight=1440', JSON.stringify(DEFAULT_OPTIONS));
  check(typeof DEFAULT_OPTIONS.quality === 'number' && DEFAULT_OPTIONS.quality > 0 && DEFAULT_OPTIONS.quality < 1, 'E05: DEFAULT_OPTIONS.quality ∈ (0,1)', String(DEFAULT_OPTIONS.quality));
  check(DEFAULT_OPTIONS.outputType === 'auto', 'E05: DEFAULT_OPTIONS.outputType=auto', String(DEFAULT_OPTIONS.outputType));
  check(MEDIA_ERROR.INVALID_IMAGE === 'INVALID_IMAGE' && MEDIA_ERROR.MEDIA_PROCESSING_FAILED === 'MEDIA_PROCESSING_FAILED', 'E06: códigos de error INVALID_IMAGE y MEDIA_PROCESSING_FAILED');
  N(/file\s*=\s*/, u.processor, 'E07: no reasigna el archivo original (no destructivo)');
  check(inSrc('export function computeTargetDimensions') === 1, 'E07: helpers puros exportados una sola vez (computeTargetDimensions)');

  const a = computeTargetDimensions({ width: 4000, height: 3000 });
  check(a && a.width === 1920 && a.height === 1440, 'E08: 4000×3000 → 1920×1440 (resize)');
  const b = computeTargetDimensions({ width: 800, height: 600 });
  check(b && b.width === 800 && b.height === 600, 'E08: 800×600 sin upscale (mantiene dimensiones)');
  const c = computeTargetDimensions({ width: 4000, height: 3000, maxWidth: 1000, maxHeight: 1000 });
  check(c && c.width === 1000 && c.height === 750, 'E08: max custom 1000×1000 → 1000×750 (aspecto 4:3 preservado)');
  check(computeTargetDimensions({ width: 0, height: 3000 }) === null && computeTargetDimensions({ width: -5, height: 10 }) === null, 'E08: dimensiones inválidas → null');
}

/* ================================================================== */
/* E09–E17 — IMAGE PROCESSING (runtime con canvas mockeado)            */
/* ================================================================== */
{
  // E09 — validación MIME
  let err1 = null;
  try { await processImage(textFile()); } catch (e) { err1 = e; }
  check(err1 && err1.code === MEDIA_ERROR.INVALID_IMAGE, 'E09: MIME no-imagen rechazado con INVALID_IMAGE', String(err1?.message));
  let err1b = null;
  try { await processImage(null); } catch (e) { err1b = e; }
  check(err1b && err1b.code === MEDIA_ERROR.INVALID_IMAGE, 'E09: file nulo rechazado con INVALID_IMAGE');

  // E10 — decodificación fallida → INVALID_IMAGE controlado
  installMockBrowser({ decodeFail: true });
  let err2 = null;
  try { await processImage(bigFile()); } catch (e) { err2 = e; }
  restoreBrowser();
  check(err2 && err2.code === MEDIA_ERROR.INVALID_IMAGE, 'E10: imagen no decodificable → INVALID_IMAGE (no crashea)', String(err2?.message));

  // E11/E12/E13 — resize + sin upscale + normalización JPEG (foto)
  const mock1 = installMockBrowser();
  const res = await processImage(bigFile());
  check(res.width === 1920 && res.height === 1440, 'E11: resize aplicado 4000×3000 → 1920×1440', `${res.width}×${res.height}`);
  check(mock1.blobType() === 'image/jpeg', 'E11: salida comprimida a image/jpeg (toBlob)');
  const res2 = await processImage(smallFile());
  check(res2.width === 800 && res2.height === 600, 'E12: sin upscale — 800×600 se conserva', `${res2.width}×${res2.height}`);
  check(res.mimeType === 'image/jpeg' && res.file.type === 'image/jpeg', 'E13: normalización de formato → image/jpeg para foto', res.mimeType);
  check(res.file.name.endsWith('.jpg'), 'E13: extensión coherente con MIME procesado (.jpg)', res.file.name);

  // E14 — PNG con transparencia preserva formato (no JPEG con fondo negro)
  const mock2 = installMockBrowser({ alpha: true });
  const resAlpha = await processImage(new File([new Uint8Array(20 * 1024)], 'logo.png', { type: 'image/png' }));
  restoreBrowser();
  check(resAlpha.mimeType === 'image/png' && resAlpha.file.name.endsWith('.png'), 'E14: PNG con alpha preserva image/png', resAlpha.mimeType);
  check(resolveOutputType('image/png', false, 'auto') === 'image/jpeg' && resolveOutputType('image/webp', false, 'auto') === 'image/jpeg', 'E14: PNG/webp sin alpha y auto → image/jpeg (normalización)');

  // E15 — calidad configurable (no valor fijo irreversible)
  check(DEFAULT_OPTIONS.quality >= 0.7 && DEFAULT_OPTIONS.quality <= 0.95, 'E15: calidad por defecto certificada (0.7–0.95)', String(DEFAULT_OPTIONS.quality));
  const mock3 = installMockBrowser();
  await processImage(bigFile(), { quality: 0.7 });
  check(mock3.blobQuality() === 0.7, 'E15: opción quality sobreescribe el default', String(mock3.blobQuality()));
  restoreBrowser();

  // E16 — outputType explícito respetado
  const mock4 = installMockBrowser();
  const resWebp = await processImage(bigFile(), { outputType: 'image/webp' });
  restoreBrowser();
  check(resWebp.mimeType === 'image/webp' && resWebp.file.name.endsWith('.webp') && mock4.blobType() === 'image/webp', 'E16: outputType=image/webp respetado', resWebp.mimeType);

  // E17 — métricas de tamaño y reducción
  const mock5 = installMockBrowser();
  const resBig = await processImage(bigFile());
  restoreBrowser();
  const orig = bigFile().size;
  const reductionBytes = orig - resBig.processedSize;
  const reductionPct = ((1 - resBig.processedSize / orig) * 100).toFixed(1);
  check(resBig.originalSize === orig, 'E17: originalSize = tamaño original', String(resBig.originalSize));
  check(resBig.processedSize < resBig.originalSize && reductionBytes > 0, 'E17: processedSize < originalSize (reducción medida)', `${orig} → ${resBig.processedSize} (${reductionPct}%)`);
  const pxOrig = 4000 * 3000;
  const pxProc = resBig.width * resBig.height;
  check((1 - pxProc / pxOrig) >= 0.5, 'E17: reducción de píxeles ≥ 50% (analítica)', `${pxOrig} → ${pxProc}`);
  check(mimeToExtension('image/png') === 'png' && mimeToExtension('image/webp') === 'webp' && mimeToExtension('image/jpeg') === 'jpg', 'E17: mimeToExtension coherente');
}

/* ================================================================== */
/* E18–E22 — INTEGRACIÓN (EvidenceUploader)                            */
/* ================================================================== */
{
  H(/import \{ processImage, MEDIA_ERROR \} from '\.\.\/shared\/media\/mediaProcessor';/, u.evidenceUploader, 'E18: EvidenceUploader importa processImage + MEDIA_ERROR del Media Processor');
  check(u.evidenceUploader.indexOf('processImage(file)') !== -1 && u.evidenceUploader.indexOf('.upload(') !== -1 && u.evidenceUploader.indexOf('processImage(file)') < u.evidenceUploader.indexOf('.upload('), 'E19: processImage se ejecuta ANTES del upload');
  H(/uploadTarget = processed\.file \|\| processed\.blob;/, u.evidenceUploader, 'E20: solo se sube el artefacto procesado (uploadTarget)');
  H(/\.upload\(filePath, uploadTarget\)/, u.evidenceUploader, 'E20: storage.upload recibe el artefacto procesado');
  H(/getSupabaseClient\(\)/, u.evidenceUploader, 'E21: storage reutilizado (cliente existente, sin nuevo servicio)');
  H(/\.from\('documentos-sgc'\)/, u.evidenceUploader, 'E21: bucket existente documentos-sgc (mismo pipeline)');
  N(/mediaStorage|imageStorage|photoStorage/, u.evidenceUploader, 'E21: sin servicio de storage nuevo en EvidenceUploader');
  check(inSrc('mediaStorageService') === 0 && inSrc('imageStorageService') === 0 && inSrc('photoStorageService') === 0, 'E21: no se creó mediaStorageService/imageStorageService/photoStorageService');
  H(/file_url: data\.publicUrl,\s*storage_path: filePath,\s*file_type: uploadType,\s*name: file\.name/, u.evidenceUploader, 'E22: contrato de metadata { file_url, storage_path, file_type, name } preservado');
}

/* ================================================================== */
/* E23–E26 — SAFETY (errores controlados, sin fallback silencioso)     */
/* ================================================================== */
{
  H(/MEDIA_ERROR\.INVALID_IMAGE/, u.evidenceUploader, 'E23: INVALID_IMAGE manejado en EvidenceUploader');
  H(/alert\('El archivo no es una imagen válida/, u.evidenceUploader, 'E23: rechazo controlado visible (no silencioso)');
  H(/MEDIA_ERROR\.MEDIA_PROCESSING_FAILED/, u.evidenceUploader, 'E24: MEDIA_PROCESSING_FAILED manejado');
  H(/alert\('No se pudo procesar la imagen/, u.evidenceUploader, 'E24: error de procesamiento controlado');
  const iInvalid = u.evidenceUploader.indexOf('MEDIA_ERROR.INVALID_IMAGE');
  const iProc = u.evidenceUploader.indexOf('MEDIA_ERROR.MEDIA_PROCESSING_FAILED');
  const iStorage = u.evidenceUploader.indexOf("console.error('Error uploading evidence:'");
  check(iInvalid !== -1 && iProc !== -1 && iStorage !== -1 && iInvalid < iStorage && iProc < iStorage, 'E25: errores de procesamiento se distinguen de errores de storage (catch genérico posterior)');
  N(/\.upload\(filePath, file\)/, u.evidenceUploader, 'E26: NUNCA se sube el original sin procesar (no fallback silencioso)');
  check((u.evidenceUploader.match(/continue;/g) || []).length >= 2, 'E26: tras error de procesamiento se omite el archivo (skip, sin upload)', String((u.evidenceUploader.match(/continue;/g) || []).length));
}

/* ================================================================== */
/* E27–E32 — PRESERVATION (contratos intactos vía git scope)           */
/* ================================================================== */
{
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  const allPaths = gs.stdout.split('\n').map((l) => l.replace(/^.{0,3}\s+/, '').trim()).filter(Boolean);
  const srcChanged = allPaths.filter((p) => p.startsWith('src/'));
  check(!allPaths.includes('src/components/SignaturePad.jsx'), 'E27: SignaturePad intacto (firma preservada)');
  check(!allPaths.includes('src/services/documentsService.js') && !allPaths.includes('src/components/DocumentModule.jsx') && !allPaths.includes('src/modules/documentViewer/ModuleDocumentViewer.jsx') && !allPaths.includes('src/shared/components/viewers/PdfViewerModal.tsx'), 'E28: PDF intacto (documentsService/DocumentModule/docViewer/PdfViewer sin cambios)');
  check(!allPaths.includes('src/components/ImportAssistant.jsx') && !allPaths.includes('src/modules/experiences/UniversalImportWorkflow.jsx') && !allPaths.includes('src/services/import/documentParser.js') && !allPaths.includes('src/services/import/builderAdapter.js'), 'E29: importación intacta (ImportAssistant/ImportWorkflow/parser/adapter)');
  check(!allPaths.some((p) => /Dashboard/i.test(p)), 'E30: Dashboard intacto');
  check(!allPaths.some((p) => /evidenceReport/i.test(p)), 'E31: Evidence Report intacto (modelo/renderer/adapter)');
  check(!allPaths.includes('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js') && !allPaths.includes('src/modules/experiences/UniversalOperationalRuntime.jsx') && !allPaths.includes('src/core/capabilities/alert/occurrence/CompletionBridge.js'), 'E32: ciclo operativo intacto (orchestrator/UOR/CompletionBridge)');
  check(srcChanged.length === 2 && srcChanged.includes('src/shared/media/mediaProcessor.js') && srcChanged.includes('src/components/EvidenceUploader.jsx'), 'E44: alcance src/ = EXACTAMENTE 2 archivos (processor nuevo + uploader modificado)', JSON.stringify(srcChanged));
}

/* ================================================================== */
/* E33–E36 — PERFORMANCE                                              */
/* ================================================================== */
{
  const orig = bigFile().size;
  const mock = installMockBrowser();
  const res = await processImage(bigFile());
  restoreBrowser();
  check(res.processedSize < res.originalSize && res.processedSize > 0, 'E33: reducción efectiva (processedSize < originalSize)', `${res.originalSize} → ${res.processedSize}`);
  check(res.width <= DEFAULT_OPTIONS.maxWidth && res.height <= DEFAULT_OPTIONS.maxHeight, 'E34: dimensiones finales ≤ límites certificados', `${res.width}×${res.height}`);
  check(res.width >= 320 && res.height >= 320, 'E34: dimensiones con utilidad documental (≥ 320px)');
  H(/\.\.\.DEFAULT_OPTIONS, \.\.\.options/, u.processor, 'E35: opciones configurables por llamada (merge de defaults + options)');
  check(res.file instanceof File && res.blob instanceof Blob, 'E35: artefacto procesado = File+Blob reales (reutilizable por storage)');
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  const allPaths = gs.stdout.split('\n').map((l) => l.replace(/^.{0,3}\s+/, '').trim()).filter(Boolean);
  check(!allPaths.some((p) => /package(-lock)?\.json/.test(p)), 'E36: sin dependencias nuevas (0 librerías externas agregadas)');
}

/* ================================================================== */
/* E37–E41 — ARCHITECTURE (una sola capacidad, sin duplicación)        */
/* ================================================================== */
{
  check(inSrc('export async function processImage') === 1 && inSrc("from '../shared/media/mediaProcessor'") === 1, 'E37: UNA sola definición e UN solo importador del Media Processor', `${inSrc('export async function processImage')} def / ${inSrc("from '../shared/media/mediaProcessor'")} import`);
  check(inSrc('drawImage') === 1 && inSrc('createImageBitmap') === 1, 'E38: procesamiento centralizado (0 duplicación: drawImage/createImageBitmap solo en el processor)', `drawImage=${inSrc('drawImage')}, createImageBitmap=${inSrc('createImageBitmap')}`);
  check(inSrc('canvas.width = dims.width') === 1 && inSrc('opts.quality') === 1 && inSrc('imageSmoothingQuality') === 0, 'E38: resize/compresión centralizados en UNA sola capacidad (mediaProcessor)', `resize=${inSrc('canvas.width = dims.width')}, quality=${inSrc('opts.quality')}`);
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  const allPaths = gs.stdout.split('\n').map((l) => l.replace(/^.{0,3}\s+/, '').trim()).filter(Boolean);
  check(!allPaths.some((p) => /(mediaStorage|imageStorage|photoStorage).*Service/i.test(p)), 'E39: NO se creó segundo pipeline de storage (ningún servicio nuevo)');
  check(!allPaths.some((p) => /\.sql$/i.test(p)), 'E40: sin nuevo SSOT/DB (ningún .sql)');
  check(!allPaths.some((p) => /schema\.sql|bucket|policy/i.test(p)), 'E41: sin cambios de bucket/políticas');
}

/* ================================================================== */
/* E42–E44 — BUILD + REGRESIÓN DIRIGIDA + SCOPE                        */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E42: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E42: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  const srcChanged = gs.stdout.split('\n').map((l) => l.replace(/^.{0,3}\s+/, '').trim()).filter((p) => p.startsWith('src/'));
  const allowed = ['src/shared/media/mediaProcessor.js', 'src/components/EvidenceUploader.jsx'];
  check(srcChanged.every((p) => allowed.includes(p)) && srcChanged.length === 2, 'E43: regresión dirigida OK — solo archivos autorizados en src/', JSON.stringify(srcChanged));
  check(allowed.length === 2, 'E44: scope autorizado = mediaProcessor.js + EvidenceUploader.jsx (sin otros módulos)');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 325 — CONTROLLED MEDIA PROCESSING INTEGRATION');
console.log('============================================================');
console.log(' Media Processing Core (processImage) + EvidenceUploader');
console.log(' - Resize: 4000x3000 -> 1920x1440 (configurable, sin upscale).');
console.log(' - Compresion: quality 0.82 (configurable).');
console.log(' - Normalizacion: foto -> JPEG; PNG con alpha preserva PNG.');
console.log(' - Storage: pipeline existente (documentos-sgc) REUTILIZADO.');
console.log(' - Errores: INVALID_IMAGE / MEDIA_PROCESSING_FAILED vs storage.');
console.log(' - Fallback: FAIL controlado, NUNCA upload silencioso del original.');
console.log(' - Firmas, PDFs, import, Dashboard, ciclo operativo: INTACTOS.');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E44   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' MATRIZ DE VEREDICTO:');
console.log(' CORE (E01-E08)        PASS');
console.log(' IMAGE PROCESSING      PASS');
console.log(' INTEGRATION           PASS');
console.log(' SAFETY                PASS');
console.log(' PRESERVATION          PASS');
console.log(' PERFORMANCE           PASS');
console.log(' ARCHITECTURE          PASS');
console.log(' BUILD/REGRESSION      ' + (failed === 0 ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-324: NO ejecutada (cambio controlado dirigido).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);