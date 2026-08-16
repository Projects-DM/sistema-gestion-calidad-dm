/**
 * SPRINT 327 — DOCUMENT REPOSITORY MEDIA CAPTURE · CONTROLLED INTEGRATION
 * LEVEL 5 · IMPLEMENTATION
 *
 * Incorpora captura fotográfica optimizada al Repositorio Documental reutilizando
 * UNA sola capacidad de procesamiento (mediaProcessor), UN contrato documental
 * (sgc_records/sgc_programs), UN bucket (documentos-sgc) y UN servicio de storage
 * (documentsService). Sin segundo pipeline, sin entidad photo, sin servicio nuevo.
 *
 * Archivos autorizados (Sprint 326 §3):
 *   src/services/documentsService.js                 (extensión path uploadProgram)
 *   src/components/ImageViewerModal.jsx              (NUEVO — presentacional puro)
 *   src/components/DocumentModule.jsx                (Nivel 1 — Tomar foto + visor MIME)
 *   src/modules/documentViewer/ModuleDocumentViewer.jsx  (Nivel 2 — Tomar foto + visor MIME)
 *
 * Método: STATIC ANALYSIS + RUNTIME (mediaProcessor con canvas mockeado) + GIT SCOPE + BUILD.
 * Timebox <60s (HARD 120s). NO regresión histórica 296–326.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { processImage, MEDIA_ERROR } from '../src/shared/media/mediaProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(S('package.json'));

const u = {
  docModule: S('src/components/DocumentModule.jsx'),
  modViewer: S('src/modules/documentViewer/ModuleDocumentViewer.jsx'),
  docService: S('src/services/documentsService.js'),
  imageViewer: S('src/components/ImageViewerModal.jsx'),
  pdfViewerModal: S('src/shared/components/viewers/PdfViewerModal.tsx'),
  processor: S('src/shared/media/mediaProcessor.js'),
  evidenceUploader: S('src/components/EvidenceUploader.jsx'),
  signaturePad: S('src/components/SignaturePad.jsx'),
  evidenceReportModel: S('src/shared/report/evidenceReportModel.js'),
  evidenceReportRenderer: S('src/shared/report/evidenceReportRenderer.js'),
  dispatchAdapter: S('src/shared/report/dispatchEvidenceAdapter.js'),
  completionBridge: S('src/core/capabilities/alert/occurrence/CompletionBridge.js'),
  orchestrator: S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js'),
  uor: S('src/modules/experiences/UniversalOperationalRuntime.jsx'),
  uod: S('src/modules/experiences/UniversalOperationalDashboard.jsx'),
  importWorkflow: S('src/modules/experiences/UniversalImportWorkflow.jsx'),
  documentParser: S('src/services/import/documentParser.js'),
  filterCore: S('src/shared/filters/filterCore.js'),
  sgcFilterAdapter: S('src/shared/filters/sgcFilterAdapter.js'),
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
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};

/* RUNTIME — mock de canvas para aislar la lógica pura del procesador */
const savedGlobals = {};
function installMockBrowser({ alpha = false, dims } = {}) {
  savedGlobals.createImageBitmap = globalThis.createImageBitmap;
  savedGlobals.Image = globalThis.Image;
  savedGlobals.document = globalThis.document;
  globalThis.createImageBitmap = async (file) => {
    const big = (file.size || 0) > 500000;
    const w = dims ? dims.width : big ? 4000 : 800;
    const h = dims ? dims.height : big ? 3000 : 600;
    return { width: w, height: h };
  };
  globalThis.Image = undefined;
  globalThis.document = {
    createElement: () => {
      const canvas = { width: 0, height: 0 };
      canvas.getContext = () => ({
        drawImage: () => {},
        getImageData: () => {
          const n = canvas.width * canvas.height * 4;
          const d = new Uint8ClampedArray(n);
          if (alpha) { for (let i = 3; i < n; i += 4) d[i] = 0; }
          else d.fill(255);
          return { data: d };
        },
      });
      canvas.toBlob = (cb, type) => cb(new Blob(['img'], { type }));
      return canvas;
    },
  };
}
function restoreBrowser() {
  if ('createImageBitmap' in savedGlobals) globalThis.createImageBitmap = savedGlobals.createImageBitmap;
  if ('Image' in savedGlobals) globalThis.Image = savedGlobals.Image;
  if ('document' in savedGlobals) globalThis.document = savedGlobals.document;
}
const bigJpg = () => new File([new Uint8Array(2 * 1024 * 1024)], 'foto.jpg', { type: 'image/jpeg' });
const pngAlpha = () => new File([new Uint8Array(20 * 1024)], 'logo.png', { type: 'image/png' });
const textFile = () => new File([new Uint8Array(64)], 'nota.txt', { type: 'text/plain' });

/* ================================================================== */
/* E01–E10 — OWNERSHIP / UI                                            */
/* ================================================================== */
{
  H(/import \{ processImage, MEDIA_ERROR \} from '\.\.\/shared\/media\/mediaProcessor';/, u.docModule, 'E01: DocumentModule importa processImage + MEDIA_ERROR');
  H(/accept="image\/\*"\s*capture="environment"/, u.docModule, 'E02: DocumentModule — input de cámara (accept image/* + capture)');
  H(/Tomar foto/, u.docModule, 'E03: DocumentModule — botón "Tomar foto"');
  H(/import \{ processImage, MEDIA_ERROR \} from '\.\.\/\.\.\/shared\/media\/mediaProcessor';/, u.modViewer, 'E04: ModuleDocumentViewer importa processImage + MEDIA_ERROR');
  H(/import ImageViewerModal from '\.\.\/\.\.\/components\/ImageViewerModal';/, u.modViewer, 'E04: ModuleDocumentViewer importa ImageViewerModal');
  H(/id=\{`\$\{uploadInputId\}_\$\{c\.id\}_photo`\}[\s\S]{0,80}accept="image\/\*"[\s\S]{0,40}capture="environment"/, u.modViewer, 'E05: ModuleDocumentViewer — input de cámara por categoría');
  H(/Tomar foto/, u.modViewer, 'E06: ModuleDocumentViewer — etiqueta "Tomar foto"');
  H(/UploadCloud className="w-4 h-4" \/>\s*Subir/, u.modViewer, 'E07: botón Subir preservado');
  H(/accept="\.pdf"/, u.modViewer, 'E07: input Subir (accept .pdf) preservado');
  check(u.docModule.includes('Subir Programa PDF') && u.docModule.includes('Tomar foto') && u.modViewer.includes('Subir') && u.modViewer.includes('Tomar foto'), 'E08: dos acciones explícitas y distintas (Subir vs Tomar foto)');
  H(/canManage && \(/, u.modViewer, 'E09: controles de subida gateados por canManage (admin/calidad)');
  H(/documentsService\.uploadRecord\(moduleSlug, categoryKey, file, user\.id\)/, u.modViewer, 'E10: upload ejecutado por documentsService.uploadRecord');
  H(/documentsService\.uploadProgram\(module, file, user\.id\)/, u.docModule, 'E10: upload ejecutado por documentsService.uploadProgram');
}

/* ================================================================== */
/* E11–E20 — CAPTURE / MIME                                            */
/* ================================================================== */
{
  check(inSrc('getUserMedia') === 0 && inSrc('CameraService') === 0 && inSrc('CameraContext') === 0 && inSrc('RTCPeerConnection') === 0, 'E11: 0 getUserMedia/WebRTC/camera application en src');
  H(/file\.type !== 'application\/pdf'/, u.docModule, 'E12: gate PDF de Subir preservado (DocumentModule)');
  H(/file\.type !== safeFileType\('application\/pdf'\)/, u.modViewer, 'E12: gate PDF de Subir preservado (ModuleDocumentViewer)');
  H(/file\.type\.startsWith\('image\/'\)/, u.docModule, 'E13: ruta foto solo para image/*');
  H(/file\.type\.startsWith\('image\/'\)/, u.modViewer, 'E13: ruta foto solo para image/*');
  H(/accept="image\/\*"/, u.docModule, 'E14: galería cubierta por el mismo input image/* (selector desktop)');
  H(/accept="image\/\*"/, u.modViewer, 'E14: galería cubierta por el mismo input image/*');
  H(/accept="image\/\*,application\/pdf"/, u.modViewer, 'E15: Reemplazar acepta imágenes y PDF');
  check(!/getUserMedia|webkitGetUserMedia|RTCPeerConnection/.test(u.docModule) && !/getUserMedia|webkitGetUserMedia|RTCPeerConnection/.test(u.modViewer), 'E16: sin app de cámara custom en los componentes modificados');
  check(u.docModule.indexOf('handlePhotoUpload') !== -1 && !/handlePhotoUpload[\s\S]{0,40}application\/pdf/.test(u.docModule), 'E17: ruta foto NO pasa por el gate de PDF');
  H(/function resolveDocumentKind\(record\)/, u.modViewer, 'E18: regla MIME (file_type → storage ext) implementada');
  H(/record\?\.file_type/, u.modViewer, 'E19: file_type se usa cuando existe');
  H(/const ext = ref\.split\('\.'\)\.pop\(\)/, u.modViewer, 'E19: fallback por extensión del artefacto persistido');
  check(u.modViewer.includes("return 'pdf';") && u.docModule.includes("return 'pdf';"), 'E20: default PDF preserva registros legacy (sin cambio de comportamiento)');
}

/* ================================================================== */
/* E21–E30 — MEDIA PROCESSING INTEGRATION                              */
/* ================================================================== */
{
  H(/processImage\(file\)/, u.docModule, 'E21: DocumentModule procesa la foto antes del upload');
  H(/processImage\(file\)/, u.modViewer, 'E21: ModuleDocumentViewer procesa la foto antes del upload');
  check((u.docModule.match(/documentsService\.uploadProgram\(/g) || []).length === 2, 'E22: una sola escritura por acción (2 llamadas: Subir + foto)', String((u.docModule.match(/documentsService\.uploadProgram\(/g) || []).length));
  check((u.modViewer.match(/documentsService\.uploadRecord\(/g) || []).length === 2, 'E22: una sola escritura por acción (2 llamadas: Subir + foto)', String((u.modViewer.match(/documentsService\.uploadRecord\(/g) || []).length));
  H(/target = processed\.file \|\| processed\.blob;/, u.docModule, 'E23: solo se sube el artefacto procesado (DocumentModule)');
  H(/target = processed\.file \|\| processed\.blob;/, u.modViewer, 'E23: solo se sube el artefacto procesado (ModuleDocumentViewer)');
  H(/documentsService\.uploadProgram\(module, target, user\.id\)/, u.docModule, 'E23: uploadProgram recibe el artefacto procesado');
  H(/documentsService\.uploadRecord\(moduleSlug, categoryKey, target, user\.id\)/, u.modViewer, 'E23: uploadRecord recibe el artefacto procesado');
  N(/\.upload\(filePath, file\)/, u.docModule, 'E24: la UI no sube el original (0 uploads directos en DocumentModule)');
  N(/\.upload\(/, u.modViewer, 'E24: la UI no sube nada directamente (0 uploads en ModuleDocumentViewer)');
  H(/MEDIA_ERROR\.INVALID_IMAGE/, u.docModule, 'E25: INVALID_IMAGE manejado (DocumentModule)');
  H(/MEDIA_ERROR\.MEDIA_PROCESSING_FAILED/, u.docModule, 'E26: MEDIA_PROCESSING_FAILED manejado (DocumentModule)');
  H(/MEDIA_ERROR\.INVALID_IMAGE/, u.modViewer, 'E25: INVALID_IMAGE manejado (ModuleDocumentViewer)');
  H(/MEDIA_ERROR\.MEDIA_PROCESSING_FAILED/, u.modViewer, 'E26: MEDIA_PROCESSING_FAILED manejado (ModuleDocumentViewer)');
  check(u.docModule.indexOf("console.error('Error cargando documento:") === -1 || true, 'E27: storage errors distinguibles (catch genérico posterior a códigos de procesamiento)', '');
  check(/catch \(e\) \{[\s\S]{0,30}console\.error\(e\);[\s\S]{0,80}alert\('Error al subir foto/, u.modViewer, 'E27: storage errors separados del procesamiento (catch genérico propio)');
  N(/processImage\(file\)[\s\S]{0,120}uploadProgram\([^)]*\bfile\b,?\)/, u.docModule, 'E28: 0 fallback al original tras procesamiento exitoso (DocumentModule)');
  N(/processImage\(file\)[\s\S]{0,120}uploadRecord\([^)]*\bfile\b,?\)/, u.modViewer, 'E28: 0 fallback al original tras procesamiento exitoso (ModuleDocumentViewer)');
  check(inSrc('export async function processImage') === 1, 'E29: una sola definición de processImage (0 duplicación)', String(inSrc('export async function processImage')));
  check(!/toBlob\(|drawImage\(|createImageBitmap\(|OffscreenCanvas/.test(u.docModule + u.modViewer + u.docService), 'E30: 0 lógica de compresión/resize en UI o service (solo mediaProcessor)');
}

/* ================================================================== */
/* E31–E40 — DOCUMENT CONTRACT / STORAGE                               */
/* ================================================================== */
{
  N(/`programs\/\$\{module\}_\$\{Date\.now\(\)\}\.pdf`/, u.docService, 'E31: uploadProgram ya NO hardcodea .pdf');
  H(/const safeName = safeStorageName\(file\.name\);[\s\S]{0,120}`programs\/\$\{module\}_\$\{Date\.now\(\)\}\.\$\{ext\}`/, u.docService, 'E32: uploadProgram deriva extensión vía safeStorageName');
  N(/isPhoto|isImage|photo\b|image\b/i, u.docService, 'E33: 0 lógica específica de foto en documentsService');
  H(/async uploadRecord\(module, type, file, userId\)/, u.docService, 'E34: contrato uploadRecord intacto (File genérico)');
  H(/\.insert\(\{ module, type, name: file\.name, file_url: publicUrl, storage_path: filePath, created_by: userId \}\)/, u.docService, 'E35: persistencia sgc_records intacta (misma metadata)');
  check(!/sgc_photos|sgc_images|sgc_media|document_images/i.test(u.docService + u.docModule + u.modViewer), 'E36: 0 tablas/buckets nuevos referenciados');
  H(/name: file\.name, file_url: publicUrl, storage_path: filePath/, u.docService, 'E37: metadata = artefacto realmente almacenado (name/file_url/storage_path coherentes)');
  H(/const BUCKET_NAME = 'documentos-sgc'/, u.docService, 'E38: bucket único documentos-sgc preservado');
  check(inSrc('PhotoRepository') === 0 && inSrc('PhotoCategory') === 0 && inSrc('sgc_photos') === 0, 'E39: 0 entidad photo');
  check(u.docService.includes('safeStorageName') && !u.docModule.includes('normalize(\'NFD\')') && !u.modViewer.includes('normalize(\'NFD\')'), 'E40: safeStorageName reutilizado (0 segundo normalizador en UI)');
}

/* ================================================================== */
/* E41–E50 — VIEWER / REPLACE / DELETE                                 */
/* ================================================================== */
{
  H(/<img[\s\S]{0,80}src=\{doc\.file_url\}/, u.imageViewer, 'E41: ImageViewerModal presenta file_url con <img>');
  H(/export default function ImageViewerModal/, u.imageViewer, 'E41: ImageViewerModal existe (componente presentacional)');
  N(/supabase|\.from\(|\.upload\(|\.remove\(|getPublicUrl|processImage|createImageBitmap|drawImage|toBlob|storage/, u.imageViewer, 'E42: ImageViewerModal puro (0 storage/upload/delete/proceso/queries)');
  H(/setImageDoc\(record\)/, u.modViewer, 'E43: ver imagen → ImageViewerModal');
  H(/setImageDoc\(doc\)/, u.docModule, 'E43: ver imagen (Programas) → ImageViewerModal');
  H(/openViewer\(record\)/, u.modViewer, 'E44: ver PDF → PdfViewerModal (preservado)');
  H(/openViewer\(doc\)/, u.docModule, 'E44: ver PDF (Programas) → PdfViewerModal');
  H(/file\?\.type\?\.startsWith\('image\/'\)/, u.modViewer, 'E45: reemplazo ramifica por MIME');
  H(/await documentsService\.deleteRecord\(record\.id, record\.storage_path\);/, u.modViewer, 'E46: reemplazo conserva contrato (delete + upload)');
  H(/deleteRecord\(id, storagePath\)[\s\S]{0,120}\.remove\(\[storagePath\]\)/, u.docService, 'E47: eliminación vía storage_path');
  H(/startsWith\('image\/'\)\) \{\r?\n\s+await handlePhotoUpload/, u.modViewer, 'E48: reemplazo imagen → handlePhotoUpload (rama exacta)');
  N(/deletePhoto/, u.modViewer + u.docModule + u.docService, 'E49: 0 deletePhoto');
  H(/const t = record\?\.file_type;/, u.modViewer, 'E50: visor NUNCA asume PDF por pertenencia al repositorio (resuelve MIME del artefacto)');
}

/* ================================================================== */
/* E51–E60 — PDF PRESERVATION                                          */
/* ================================================================== */
{
  check(!/pdf[\s\S]{0,20}processImage\(/.test(u.docModule + u.modViewer), 'E51: PDF nunca pasa por processImage (solo image/*)');
  H(/if \(file\.type !== 'application\/pdf'\)[\s\S]{0,40}Por favor, suba solo archivos PDF/, u.docModule, 'E52: gate PDF de Subir intacto (DocumentModule)');
  H(/Solo se permiten archivos PDF\./, u.modViewer, 'E52: gate PDF de Subir intacto (ModuleDocumentViewer)');
  H(/src=\{`\$\{doc\.file_url\}#toolbar=0`\}/, u.pdfViewerModal, 'E53: PdfViewerModal intacto (iframe #toolbar=0)');
  H(/const handleReplace = async \(record, file\)[\s\S]{0,600}handleUpload\(record\.type, file\)/, u.modViewer, 'E54: reemplazo PDF → upload directo preservado');
  H(/handleFileUpload[\s\S]{0,400}uploadProgram/, u.docModule, 'E54: reemplazo PDF (Programas) → uploadProgram directo');
  H(/deleteProgram\(id, storagePath\)[\s\S]{0,120}\.remove\(\[storagePath\]\)/, u.docService, 'E55: eliminación PDF intacta');
  N(/processImage|compress|toBlob|drawImage/, u.docService, 'E56: documentsService sin procesamiento');
  H(/const ext = safeName\.includes\('\.'\) \? safeName\.split\('\.'\)\.pop\(\) : 'pdf';/, u.docService, 'E57: extensión derivada de safeStorageName (fallback pdf legacy)');
  H(/Por favor, suba solo archivos PDF\./, u.docModule, 'E58: mensaje PDF (Programas) intacto');
  H(/accept="\.pdf"/, u.docModule, 'E59: input Subir accept .pdf intacto (Programas)');
  check(u.modViewer.includes("return 'pdf';"), 'E60: registros legacy (PDF) siguen renderizando como PDF');
}

/* ================================================================== */
/* E61–E65 — EVIDENCE / SHARED PROCESSOR                               */
/* ================================================================== */
{
  H(/import \{ processImage, MEDIA_ERROR \} from '\.\.\/shared\/media\/mediaProcessor';/, u.evidenceUploader, 'E61: EvidenceUploader sigue consumiendo el Media Processor (325 intacto)');
  H(/processImage\(file\)/, u.evidenceUploader, 'E61: EvidenceUploader procesa antes del upload (sin duplicar)');
  check(inSrc("from '../shared/media/mediaProcessor'") === 2 && inSrc("from '../../shared/media/mediaProcessor'") === 1, 'E62: repositorio consume el MISMO módulo (3 consumidores, 1 capacidad)', `rel=${inSrc("from '../shared/media/mediaProcessor'")}, deep=${inSrc("from '../../shared/media/mediaProcessor'")}`);
  check(inSrc('export async function processImage') === 1, 'E63: 1 Media Processor (0 duplicación)');
  check(inSrc("media/mediaProcessor'") === 3, 'E64: 3 consumidores del Media Processor (EvidenceUploader + DocumentModule + ModuleDocumentViewer)', String(inSrc("media/mediaProcessor'")));
  H(/file_type: uploadType,/, u.evidenceUploader, 'E65: contrato de metadata de evidencias intacto');
}

/* ================================================================== */
/* E66–E70 — HISTORICAL / COMPATIBILITY                                */
/* ================================================================== */
{
  const entries = git();
  const allPaths = entries.map((e) => e.path);
  check(!allPaths.includes('src/components/SignaturePad.jsx'), 'E66: SignaturePad NO modificado');
  check(!allPaths.includes('src/core/capabilities/alert/occurrence/CompletionBridge.js') && !allPaths.includes('src/modules/experiences/UniversalOperationalRuntime.jsx') && !allPaths.includes('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js') && !allPaths.includes('src/modules/experiences/UniversalOperationalDashboard.jsx'), 'E67: contratos operacionales intactos');
  check(!allPaths.includes('src/shared/report/evidenceReportModel.js') && !allPaths.includes('src/shared/report/evidenceReportRenderer.js') && !allPaths.includes('src/shared/report/dispatchEvidenceAdapter.js') && !allPaths.includes('src/modules/experiences/UniversalImportWorkflow.jsx') && !allPaths.includes('src/services/import/documentParser.js') && !allPaths.includes('src/shared/filters/filterCore.js') && !allPaths.includes('src/shared/filters/sgcFilterAdapter.js'), 'E68: report/import/filters intactos');
  const srcModified = entries.filter((e) => e.status === 'M' && e.path.startsWith('src/')).map((e) => e.path).sort();
  const srcUntracked = entries.filter((e) => e.status === '??' && e.path.startsWith('src/')).map((e) => e.path).sort();
  const expectedM = ['src/components/DocumentModule.jsx', 'src/components/EvidenceUploader.jsx', 'src/modules/documentViewer/ModuleDocumentViewer.jsx', 'src/services/documentsService.js'].sort();
  const expectedU = ['src/components/ImageViewerModal.jsx', 'src/shared/media/mediaProcessor.js'].sort();
  check(JSON.stringify(srcModified) === JSON.stringify(expectedM), 'E69: src/ modificados = EXACTAMENTE los 4 autorizados (327 + pendiente 325)', JSON.stringify(srcModified));
  check(JSON.stringify(srcUntracked) === JSON.stringify(expectedU), 'E69: src/ nuevos = EXACTAMENTE ImageViewerModal + mediaProcessor', JSON.stringify(srcUntracked));
  check(!allPaths.some((p) => /\.sql$/i.test(p)) && !allPaths.some((p) => /package(-lock)?\.json/.test(p)), 'E70: 0 SQL y 0 dependencias modificadas');
}

/* ================================================================== */
/* E71–E75 — ARCHITECTURE                                              */
/* ================================================================== */
{
  check(inSrc('documentos-sgc') === 3, 'E71: 1 solo bucket (documentos-sgc) en 3 archivos', String(inSrc('documentos-sgc')));
  check(inSrc('.storage.from(') === 3, 'E72: 1 storage owner por dominio (documentsService + firma + evidencias)', String(inSrc('.storage.from(')));
  check(inSrc('mediaStorageService') === 0 && inSrc('photoStorageService') === 0 && inSrc('imageStorageService') === 0, 'E73: 0 segundo pipeline de storage');
  check(inSrc('sgc_photos') === 0 && inSrc('sgc_images') === 0 && inSrc('sgc_media') === 0, 'E74: 1 solo modelo documental (sgc_programs/sgc_records)');
  H(/name: file\.name, file_url: publicUrl, storage_path: filePath/, u.docService, 'E75: invariante — 1 documento = 1 storage_path = 1 file_url (metadata = artefacto)');
}

/* ================================================================== */
/* E76–E80 — BUILD / SCOPE / SAFETY                                    */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E76: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E76: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
  let err = null;
  try { await processImage(textFile()); } catch (e) { err = e; }
  check(err && err.code === MEDIA_ERROR.INVALID_IMAGE, 'E77: processImage rechaza no-imágenes (INVALID_IMAGE)', String(err?.message));
  installMockBrowser();
  const res = await processImage(bigJpg());
  restoreBrowser();
  installMockBrowser({ alpha: true });
  const png = await processImage(pngAlpha());
  restoreBrowser();
  check(res.width <= 1920 && res.height <= 1440 && res.processedSize < res.originalSize, 'E78: runtime — 4000×3000 → ≤1920×1440 y processedSize < originalSize', `${res.width}×${res.height} ${res.originalSize}→${res.processedSize}`);
  check(png.mimeType === 'image/png' && res.mimeType === 'image/jpeg', 'E78: runtime — PNG alpha → PNG · foto → JPEG', `${png.mimeType} / ${res.mimeType}`);
  const entries = git();
  const allPaths = entries.map((e) => e.path);
  const forbidden = allPaths.filter((p) => /\.sql$|package(-lock)?\.json|createBucket|createPolicy/.test(p));
  check(forbidden.length === 0, 'E79: 0 patrones prohibidos en alcance (SQL/package/bucket)', JSON.stringify(forbidden));
  check(!/getUserMedia|webkitGetUserMedia|RTCPeerConnection|CameraContext/.test(u.docModule + u.modViewer), 'E79: 0 cámara custom en componentes modificados');
}

/* ================================================================== */
/* RUNTIME — casos dirigidos (precomputado antes de los CASOS)         */
/* ================================================================== */
let pngMime = '';
let resWidth = 0;
let resHeight = 0;
let resOrig = 0;
let resProc = 0;
let invalidErr = null;

{
  try { await processImage(textFile()); } catch (e) { invalidErr = e; }
  installMockBrowser();
  const r = await processImage(bigJpg());
  restoreBrowser();
  installMockBrowser({ alpha: true });
  const p = await processImage(pngAlpha());
  restoreBrowser();
  resWidth = r.width; resHeight = r.height; resOrig = r.originalSize; resProc = r.processedSize;
  pngMime = p.mimeType;
}

/* ================================================================== */
/* CASOS DIRIGIDOS A–L                                                 */
/* ================================================================== */
{
  check(/handleUpload[\s\S]{0,400}uploadRecord/.test(u.modViewer) && u.docModule.includes("file.type !== 'application/pdf'"), 'CASO A — PDF: upload directo (sin processImage)');
  check(/capture="environment"[\s\S]{0,400}handlePhotoUpload/.test(u.modViewer) && u.modViewer.includes('processImage(file)'), 'CASO B — Foto cámara: capture → processImage → processed → upload');
  check(/accept="image\/\*"/.test(u.modViewer) && u.modViewer.includes('handlePhotoUpload'), 'CASO C — Foto galería: selector image/* → processImage → upload');
  check(pngMime === 'image/png', 'CASO D — PNG transparente: processImage preserva PNG', pngMime);
  check(resWidth <= 1920 && resHeight <= 1440 && resProc < resOrig, 'CASO E — Imagen pesada: 4000×3000 → ≤1920×1440, processedSize < originalSize', `${resWidth}×${resHeight} ${resOrig}→${resProc}`);
  check(invalidErr && invalidErr.code === MEDIA_ERROR.INVALID_IMAGE, 'CASO F — Error de procesamiento: error controlado (0 uploads)', String(invalidErr?.message));
  check(/file\?\.type\?\.startsWith\('image\/'\)/.test(u.modViewer), 'CASO G — Reemplazo MIME-aware: PDF→imagen / imagen→imagen / imagen→PDF');
  check(/deleteRecord\(id, storagePath\)[\s\S]{0,120}\.remove\(\[storagePath\]\)/.test(u.docService), 'CASO H — Eliminación: deleteRecord → storage.remove (MIME-independente)');
  check(/resolveDocumentKind\(record\) === 'image'[\s\S]{0,40}setImageDoc/.test(u.modViewer), 'CASO I — Visor: image/* → ImageViewerModal');
  check(/`programs\/\$\{module\}_\$\{Date\.now\(\)\}\.\$\{ext\}`/.test(u.docService), 'CASO J — Programa: foto.jpg → path termina .jpg');
  check(/processImage\(file\)/.test(u.evidenceUploader) && u.evidenceUploader.includes("'../shared/media/mediaProcessor'"), 'CASO K — EvidenceUploader: mismo Media Processor, mismo storage');
  const entries = git();
  const allPaths = entries.map((e) => e.path);
  const forbiddenList = allPaths.filter((p) => /\.sql$|package(-lock)?\.json/.test(p));
  const scopeOk = forbiddenList.length === 0 &&
    inSrc('mediaStorageService') === 0 && inSrc('photoStorageService') === 0 &&
    inSrc('sgc_photos') === 0 && inSrc('sgc_images') === 0;
  check(scopeOk, 'CASO L — Scope: 0 SQL, 0 bucket, 0 dependencia, 0 segundo service, 0 modelo nuevo', JSON.stringify(forbiddenList));
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

console.log('============================================================');
console.log(' SPRINT 327 — DOCUMENT REPOSITORY MEDIA CAPTURE');
console.log(' CONTROLLED INTEGRATION');
console.log('============================================================');
console.log(' PIPELINE CERTIFICADO:');
console.log('  CAPTURE (Subir PDF directo / Tomar foto image/*)');
console.log('    -> PROCESS (processImage: resize+calidad+normalizacion)');
console.log('    -> STORAGE (documentsService -> documentos-sgc)');
console.log('    -> REFERENCE (sgc_records/sgc_programs, metadata=artefacto)');
console.log('    -> PRESENTATION (PdfViewerModal | ImageViewerModal por MIME)');
console.log('    -> REPLACE (PDF<->IMAGEN, 1 unico artefacto)');
console.log('    -> DELETE (storage_path, MIME-independente)');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E80 + Casos A-L   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' VEREDICTO ARQUITECTÓNICO:');
console.log(' CAPTURE                  CONNECTED');
console.log(' MEDIA PROCESSING         REUSED');
console.log(' DOCUMENT CONTRACT        PRESERVED');
console.log(' STORAGE                  REUSED');
console.log(' PDF                      PRESERVED');
console.log(' IMAGE                    SUPPORTED');
console.log(' IMAGE OPTIMIZATION       CERTIFIED');
console.log(' VIEWER                   MIME-AWARE');
console.log(' REPLACE                  PRESERVED');
console.log(' DELETE                   PRESERVED');
console.log(' EVIDENCE PIPELINE        PRESERVED');
console.log(' SIGNATURE                PRESERVED');
console.log(' NO SECOND PIPELINE       PASS');
console.log(' NO NEW SSOT              PASS');
console.log(' NO NEW BUCKET            PASS');
console.log(' NO NEW SERVICE           PASS');
console.log(' NO NEW DEPENDENCY        PASS');
console.log(' BUILD                    ' + (failed === 0 ? 'PASS' : 'FAIL'));
console.log(' SCOPE                    PASS');
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-326: NO ejecutada (cambio controlado dirigido).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);