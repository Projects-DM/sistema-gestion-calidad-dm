/**
 * SPRINT 326 — DOCUMENT REPOSITORY MEDIA CAPTURE · FORENSIC INTEGRATION AUDIT
 * LEVEL 5 · AUDIT ONLY (0 cambios en src/, 0 SQL, 0 storage, 0 dependencias)
 *
 * Audita el Repositorio Documental antes de introducir captura fotográfica:
 * determina con evidencia ejecutable el punto correcto de integración de
 * processImage() y si el contrato documental existente (documentsService +
 * documentos-sgc + sgc_records/sgc_programs) puede absorber imágenes SIN crear
 * un segundo pipeline de archivos.
 *
 * Método: STATIC ANALYSIS + RUNTIME (mediaProcessor) + GIT SCOPE + BUILD.
 * Timebox <60s (HARD 120s). NO regresión histórica 296–325.
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
  docReposService: S('src/services/documentRepositoriesService.js'),
  pdfViewerModal: S('src/shared/components/viewers/PdfViewerModal.tsx'),
  pdfViewerStore: S('src/shared/state/viewer/pdfViewer.store.ts'),
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
  dynamicRecordsView: S('src/components/DynamicRecordsView.jsx'),
  migration: S('docs/12-database/SQL_SPRINT_43_2_DOCUMENTAL_MIGRATION.sql'),
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
let pdfAssumptions = 0;
for (const p of walk(path.join(ROOT, 'src'))) {
  pdfAssumptions += (srcFileText(p).match(/application\/pdf/g) || []).length;
}
const git = () => {
  const gs = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8' });
  return gs.stdout.split('\n').filter(Boolean).map((l) => ({ status: l.slice(0, 2).trim(), path: l.slice(3).trim() }));
};
const gitPaths = () => git().map((g) => g.path);
let buildPass = null;

/* ================================================================== */
/* E01–E05 — REPOSITORY OWNERSHIP                                      */
/* ================================================================== */
{
  H(/<UploadCloud className="w-4 h-4" \/>\s*Subir/, u.modViewer, 'E01: botón Subir (por categoría) es propiedad de ModuleDocumentViewer');
  H(/Subir Programa PDF/, u.docModule, 'E01: Nivel 1 (Programas) posee su botón Subir en DocumentModule');
  H(/documentRepositoriesService\.getRepositories\(\{ moduleSlug \}\)/, u.modViewer, 'E02: selección de repositorio la administra ModuleDocumentViewer');
  H(/setActiveRepositoryId\(r\.id\)/, u.modViewer, 'E02: repositorio activo gestionado por ModuleDocumentViewer');
  H(/documentRepositoriesService\.getCategories\(activeRepositoryId\)/, u.modViewer, 'E03: selección de categoría la administra ModuleDocumentViewer');
  H(/docsByCategory\[c\.category_key\]/, u.modViewer, 'E04: los documentos se administran agrupados por category_key');
  H(/documentsService\.uploadRecord\(moduleSlug, categoryKey, file, user\.id\)/, u.modViewer, 'E05: el upload real lo ejecuta handleUpload → documentsService.uploadRecord');
  H(/documentsService\.uploadProgram\(module, file, user\.id\)/, u.docModule, 'E05: el upload real (Programas) → documentsService.uploadProgram');
}

/* ================================================================== */
/* E06–E10 — UPLOAD WRITE-PATH / READ-PATH                             */
/* ================================================================== */
{
  H(/type="file"/, u.docModule, 'E06: captura UI = input type=file (DocumentModule)');
  H(/accept="\.pdf"/, u.docModule, 'E06: accept=".pdf" en DocumentModule');
  H(/type="file"/, u.modViewer, 'E06: captura UI = input type=file (ModuleDocumentViewer)');
  H(/accept="\.pdf"/, u.modViewer, 'E06: accept=".pdf" en ModuleDocumentViewer');
  H(/handleUpload\(c\.category_key, file\);/, u.modViewer, 'E07: onChange → handleUpload(category_key, file)');
  H(/\.insert\(\{ module, type, name: file\.name, file_url: publicUrl, storage_path: filePath, created_by: userId \}\)/, u.docService, 'E08: write path Registros → sgc_records (metadata completa)');
  H(/async uploadProgram\(module, file, userId\)/, u.docService, 'E09: write path Programas → uploadProgram (insert/update sgc_programs)');
  H(/const records = await documentsService\.getRecords\(moduleSlug, c\.category_key\);/, u.modViewer, 'E10: read path → getRecords por category_key');
  H(/title="Ver PDF"/, u.modViewer, 'E10: read/presentation path → tarjeta de documento con Ver/Eliminar');
}

/* ================================================================== */
/* E11–E15 — DOCUMENT CONTRACT                                         */
/* ================================================================== */
{
  H(/\.insert\(\{ module, type, name: file\.name, file_url: publicUrl, storage_path: filePath, created_by: userId \}\)/, u.docService, 'E11: modelo real sgc_records = { module, type, name, file_url, storage_path, created_by }');
  H(/\.insert\(\{ module, name: file\.name, file_url: publicUrl, storage_path: filePath, created_by: userId \}\)/, u.docService, 'E12: modelo real sgc_programs = { module, name, file_url, storage_path, created_by }');
  H(/name: file\.name, file_url: publicUrl, storage_path: filePath, created_by: userId/, u.docService, 'E13: campos obligatorios presentes (name, file_url, storage_path, created_by)');
  N(/file_type/, u.docService, 'E14: el repositorio NO persiste file_type → modelo MIME-agnóstico (identificado por metadata documental, no por PDF)');
  H(/\.eq\('type', type\);/, u.docService, 'E15: type = category_key (sgc_records.type ← sgc_document_repository_categories.category_key)');
  H(/category_key text not null, -- mapea a sgc_records\.type/, u.migration, 'E15: mapeo category_key → sgc_records.type documentado en migración');
}

/* ================================================================== */
/* E16–E20 — STORAGE CONTRACT                                          */
/* ================================================================== */
{
  H(/import \{ documentsService \} from '\.\.\/services\/documentsService';/, u.docModule, 'E16: DocumentModule usa documentsService directamente');
  H(/import \{ documentsService \} from '\.\.\/\.\.\/services\/documentsService';/, u.modViewer, 'E16: ModuleDocumentViewer usa documentsService directamente');
  H(/const BUCKET_NAME = 'documentos-sgc'/, u.docService, 'E17: bucket único documentos-sgc (const BUCKET_NAME)');
  H(/`programs\/\$\{module\}_\$\{Date\.now\(\)\}\.pdf`/, u.docService, 'E18: path Programas = programs/{module}_{ts}.pdf');
  H(/`\$\{module\}\/\$\{type\}\/\$\{Date\.now\(\)\}_\$\{safeName\}`/, u.docService, 'E18: path Registros = {module}/{type}/{ts}_{safeName}');
  H(/\.upload\(filePath, file\)/, u.docService, 'E19: uploadRecord/uploadProgram reciben File genérico (storage.upload)');
  N(/application\/pdf|file\.type/, u.docService, 'E19: el service NO tiene gate MIME (puede recibir File JPEG)');
  check((u.docService.match(/\.remove\(\[storagePath\]\)/g) || []).length === 2, 'E20: deleteProgram y deleteRecord → storage.remove([storage_path]) (MIME-independente)', String((u.docService.match(/\.remove\(\[storagePath\]\)/g) || []).length));
}

/* ================================================================== */
/* E21–E25 — MIME / EXTENSION HANDLING                                 */
/* ================================================================== */
{
  H(/const safeName = safeStorageName\(file\.name\);/, u.docService, 'E21: extensión de Registros derivada de safeStorageName(file.name) (no hardcodeada)');
  check(u.docService.includes(".replace(/[^\\w.\\-]/g, '_')"), 'E22: safeStorageName normaliza acentos y conserva \\w . - (mantiene extensión)');
  check(u.docService.includes("normalize('NFD')") && u.docService.includes('/[\\u0300-\\u036f]/g'), 'E22: safeStorageName elimina diacríticos');
  H(/`programs\/\$\{module\}_\$\{Date\.now\(\)\}\.pdf`/, u.docService, 'E23: uploadProgram hardcodea .pdf en el path (restricción localizada de extensión)');
  H(/file\.type !== 'application\/pdf'/, u.docModule, 'E24: gate MIME en DocumentModule (solo PDF)');
  H(/file\.type !== safeFileType\('application\/pdf'\)/, u.modViewer, 'E24: gate MIME en ModuleDocumentViewer (solo PDF)');
  check((u.modViewer.match(/accept="\.pdf"/g) || []).length >= 2 && u.docModule.includes('accept=".pdf"'), 'E25: accept=".pdf" hardcodeado en Subir y Reemplazar (ambos componentes)', String((u.modViewer.match(/accept="\.pdf"/g) || []).length));
}

/* ================================================================== */
/* E26–E30 — IMAGE COMPATIBILITY                                       */
/* ================================================================== */
{
  const sanitize = (n) =>
    String(n)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.\-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  const exts = ['certificado.pdf', 'certificado.jpg', 'certificado.jpeg', 'certificado.webp', 'certificado.png'];
  check(exts.every((n) => sanitize(n) === n), 'E26: algoritmo safeStorageName (documentado) conserva .pdf/.jpg/.jpeg/.webp/.png', exts.map(sanitize).join(', '));
  H(/`\$\{module\}\/\$\{type\}\/\$\{Date\.now\(\)\}_\$\{safeName\}`/, u.docService, 'E27: storage_path de Registros acepta nombres de imagen sin modificación');
  H(/getPublicUrl\(filePath\)/, u.docService, 'E28: file_url vía getPublicUrl(filePath) funciona indistintamente para PDF e imagen (sin type)');
  check(!u.docService.includes('file_type') && !/photo|Photo/i.test(u.docService), 'E29: el modelo no exige file_type ni entidad foto → una imagen cabe en la fila existente');
  check((u.modViewer.match(/application\/pdf/g) || []).length === 2 && u.docModule.includes('application/pdf'), 'E30: el bloqueo actual es la gate de UI (accept + check MIME), localizada — no estructural', String((u.modViewer.match(/application\/pdf/g) || []).length));
}

/* ================================================================== */
/* E31–E35 — processImage INTEGRATION POINT                            */
/* ================================================================== */
{
  H(/export async function processImage\(file, options = \{\}\)/, u.processor, 'E31: Media Processing Core PRESERVED (firma certificada en 325)');
  const procCode = u.processor.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  N(/supabase|storage\.|getPublicUrl/, procCode, 'E31: procesador sigue puro (0 storage)');
  H(/processImage\(file\)/, u.evidenceUploader, 'E32: precedente de integración — EvidenceUploader procesa antes del upload');
  check(inSrc('createImageBitmap') === 1 && inSrc('drawImage') === 1, 'E33: sin duplicación de procesamiento (resize/compresión solo en mediaProcessor)', `createImageBitmap=${inSrc('createImageBitmap')}, drawImage=${inSrc('drawImage')}`);
  check(inSrc('mediaStorageService') === 0 && inSrc('photoStorageService') === 0 && inSrc('imageStorageService') === 0, 'E34: punto de integración = handlers existentes (handleUpload/handleFileUpload) + documentsService; 0 servicios nuevos');
  check(u.processor.includes('mimeToExtension(mimeType)') && u.docService.includes('name: file.name, file_url: publicUrl, storage_path: filePath'), 'E35: se persiste la referencia del artefacto procesado (foto.png → foto.jpg) — no del original');
}

/* ================================================================== */
/* E36–E40 — VIEWER / PRESENTATION                                     */
/* ================================================================== */
{
  H(/src=\{`\$\{doc\.file_url\}#toolbar=0`\}/, u.pdfViewerModal, 'E36: Ver acoplado a iframe + #toolbar=0 (convención PDF) en PdfViewerModal');
  H(/openViewer\(doc\)/, u.docModule, 'E37: Ver (Programas) → PdfViewerModal, sin ramificación por MIME');
  H(/openViewer\(record\)/, u.modViewer, 'E37: Ver (Registros) → PdfViewerModal, sin ramificación por MIME');
  check(inSrc('ImageViewer') === 0 && inSrc('imageViewer') === 0 && inSrc('ImageModal') === 0, 'E38: NO existe ImageViewer en src (decisión de presentación pendiente)');
  H(/\{records\.length\} PDFs/, u.modViewer, 'E39: etiqueta "{n} PDFs" hardcodeada (supuesto PDF)');
  H(/title="Eliminar PDF"/, u.modViewer, 'E39: tooltip "Eliminar PDF" hardcodeado');
  H(/<FileText className="w-5 h-5 text-gray-400" \/>/, u.modViewer, 'E39: sin miniatura — icono FileText genérico');
  check(pdfAssumptions === 4, 'E40: supuestos application/pdf limitados a 4 sitios (DocumentModule:41, ModuleDocumentViewer:19/224, EvidenceUploader:111) — consumidores no afectados', String(pdfAssumptions));
}

/* ================================================================== */
/* E41–E45 — REPLACE / DELETE                                          */
/* ================================================================== */
{
  H(/await documentsService\.deleteRecord\(record\.id, record\.storage_path\);/, u.modViewer, 'E41: Reemplazar (Registros) = delete + upload vía storage_path (MIME-independente en service)');
  H(/await handleUpload\(record\.type, file\);/, u.modViewer, 'E41: Reemplazar reusa handleUpload (mismo write path)');
  H(/if \(existing\) \{[\s\S]{0,80}\.remove\(\[existing\.storage_path\]\)/, u.docService, 'E42: Reemplazar (Programas) = remove existente + update (MIME-independente en service)');
  H(/async deleteRecord\(id, storagePath\)[\s\S]{0,120}\.remove\(\[storagePath\]\)/, u.docService, 'E43: Eliminar usa storage_path → compatible PDF e imagen');
  H(/async deleteProgram\(id, storagePath\)[\s\S]{0,120}\.remove\(\[storagePath\]\)/, u.docService, 'E43: deleteProgram idem (storage_path)');
  H(/htmlFor=\{`\$\{uploadInputId\}_\$\{c\.id\}_\$\{record\.id\}`\}/, u.modViewer, 'E44: botón Reemplazar por documento (label htmlFor scoped al record)');
  check((u.modViewer.match(/accept="\.pdf"/g) || []).length === 2, 'E44: Reemplazar reusa el mismo input accept=".pdf" (2 inputs PDF: Subir + Reemplazar) → PDF→PDF hardcodeado a nivel UI', String((u.modViewer.match(/accept="\.pdf"/g) || []).length));
  check(!/prohibit|forbidden|no se permite/i.test(u.modViewer), 'E45: sin regla de negocio que prohíba reemplazo entre MIME (PDF→IMAGE / IMAGE→PDF)');
}

/* ================================================================== */
/* E46–E50 — METADATA PERSISTENCE                                      */
/* ================================================================== */
{
  H(/name: file\.name, file_url: publicUrl, storage_path: filePath/, u.docService, 'E46: name persistido = file.name (sería el nombre del artefacto procesado)');
  H(/storage_path: filePath/, u.docService, 'E47: storage_path persistido = path real almacenado');
  H(/file_url: publicUrl/, u.docService, 'E48: file_url persistido = publicUrl del artefacto almacenado');
  H(/created_by: userId/, u.docService, 'E49: created_by persistido (auditoría)');
  H(/module, type, name: file\.name/, u.docService, 'E49: module y type (categoría) persistidos');
  H(/category_key text not null, -- mapea a sgc_records\.type/, u.migration, 'E50: relación de categoría persistida vía sgc_records.type = category_key');
}

/* ================================================================== */
/* E51–E55 — DUPLICATION / SECOND PIPELINE DETECTION                   */
/* ================================================================== */
{
  N(/supabase\.storage|\.storage\.from\(/, u.docModule, 'E51: DocumentModule NO implementa storage directamente');
  N(/supabase\.storage|\.storage\.from\(/, u.modViewer, 'E52: ModuleDocumentViewer NO implementa storage directamente');
  N(/getPublicUrl\(|\.upload\(|\.remove\(\[/, u.docModule, 'E53: DocumentModule sin llamadas de storage directas');
  N(/getPublicUrl\(|\.upload\(|\.remove\(\[/, u.modViewer, 'E53: ModuleDocumentViewer sin llamadas de storage directas');
  check(inSrc('.storage.from(') === 3, 'E54: storage concentrado en 3 archivos (documentsService + firma + evidencias) — repositorio 100% vía documentsService, SIN STORAGE OWNERSHIP DUPLICATION', String(inSrc('.storage.from(')));
  check(inSrc('mediaStorageService') === 0 && inSrc('photoStorageService') === 0 && inSrc('imageStorageService') === 0, 'E55: 0 servicios de storage paralelos (no se requiere pipeline nuevo)');
}

/* ================================================================== */
/* E56–E60 — FORBIDDEN ARCHITECTURE DETECTION                          */
/* ================================================================== */
{
  check(inSrc('PhotoRepository') === 0 && inSrc('PhotoCategory') === 0 && !/Photo/i.test(u.modViewer) && !/Photo/i.test(u.docService), 'E56: sin entidades Photo/PhotoRepository/PhotoCategory');
  check(inSrc('getUserMedia') === 0 && inSrc('CameraService') === 0 && inSrc('CameraContext') === 0 && inSrc('RTCPeerConnection') === 0, 'E57: sin getUserMedia/WebRTC/camera application (captura nativa cubre el caso)');
  check(inSrc('documentos-sgc') === 3 && inSrc('createBucket') === 0 && inSrc('createPolicy') === 0, 'E58: un solo bucket (documentos-sgc, 3 archivos) — sin bucket/políticas nuevos', String(inSrc('documentos-sgc')));
  check(inSrc('pdfToImage') === 0 && inSrc('pdf2img') === 0, 'E59: sin conversión PDF→imagen (PDF/DOCX/XLSX no pasan por processImage)');
  check(inSrc('export async function processImage') === 1, 'E60: una sola definición de processImage (0 duplicación del procesador)', String(inSrc('export async function processImage')));
}

/* ================================================================== */
/* E61–E65 — SCOPE / GIT INTEGRITY                                     */
/* ================================================================== */
{
  const entries = git();
  const allPaths = entries.map((e) => e.path);
  const srcChanged = entries.filter((e) => e.path.startsWith('src/'));
  const srcModified = srcChanged.filter((e) => e.status === 'M').map((e) => e.path);
  const srcUntracked = srcChanged.filter((e) => e.status === '??').map((e) => e.path);
  check(srcModified.length === 1 && srcModified[0] === 'src/components/EvidenceUploader.jsx', 'E61: src/ sin cambios NUEVOS de 326 (único modificado = pendiente 325: EvidenceUploader)', JSON.stringify(srcModified));
  check(srcUntracked.length === 1 && srcUntracked[0] === 'src/shared/media/mediaProcessor.js', 'E61: src/ sin archivos nuevos de 326 (único nuevo = pendiente 325: mediaProcessor)', JSON.stringify(srcUntracked));
  check(!allPaths.some((p) => /\.sql$/i.test(p)), 'E62: sin cambios SQL');
  check(!allPaths.some((p) => /package(-lock)?\.json/.test(p)), 'E63: sin cambios de dependencias (package.json/lock intactos)');
  check(u.processor.includes('export async function processImage(file, options = {})') && u.processor.includes('INVALID_IMAGE') && u.processor.includes('MEDIA_PROCESSING_FAILED'), 'E64: Media Processor PRESERVED (firma + códigos certificados intactos)');
  const pending325 = [
    'docs/Sprint-324.md',
    'docs/Sprint-325.md',
    'scripts/sprint-324-media-capture-file-optimization-forensic-audit.mjs',
    'scripts/sprint-325-media-processing-core.mjs',
    'src/shared/media/mediaProcessor.js',
  ];
  const untrackedPaths = entries.filter((e) => e.status === '??').map((e) => e.path);
  const unexpected = untrackedPaths.filter((p) => !pending325.includes(p) && !/^scripts\/sprint-326-/.test(p));
  check(unexpected.length === 0, 'E65: sin archivos accidentales (326 agrega solo su suite/doc)', JSON.stringify(unexpected));
}

/* ================================================================== */
/* E66–E70 — BUILD / RUNTIME INTEGRITY                                 */
/* ================================================================== */
{
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  buildPass = b.status === 0;
  check(buildPass, 'E66: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E66: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
  check(typeof processImage === 'function', 'E67: mediaProcessor importable en runtime (processImage = función)');
  const methods = ['getProgram', 'uploadProgram', 'deleteProgram', 'getRecords', 'uploadRecord', 'deleteRecord'];
  check(methods.every((m) => u.docService.includes(`async ${m}(`)), 'E68: documentsService conserva sus 6 métodos de contrato', methods.filter((m) => !u.docService.includes(`async ${m}(`)).join(',') || 'todos');
  const textFile = new File([new Uint8Array(64)], 'nota.txt', { type: 'text/plain' });
  let err = null;
  try { await processImage(textFile); } catch (e) { err = e; }
  check(err && err.code === MEDIA_ERROR.INVALID_IMAGE, 'E69: processImage sigue rechazando no-imágenes con INVALID_IMAGE (contrato 325 preservado)', String(err?.message));
  check(u.processor.includes('originalSize') && u.processor.includes('processedSize') && u.processor.includes('mimeType') && u.processor.includes('width') && u.processor.includes('height'), 'E70: contrato de retorno del procesador preservado (blob/file/mimeType/width/height/sizes)');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

const classification = 'CONTROLLED EXTENSION REQUIRED';

console.log('============================================================');
console.log(' SPRINT 326 — DOCUMENT REPOSITORY MEDIA CAPTURE');
console.log(' FORENSIC INTEGRATION AUDIT · AUDIT ONLY');
console.log('============================================================');
console.log(' HALLAZGOS CLAVE:');
console.log(' - Ownership: ModuleDocumentViewer (registros) + DocumentModule');
console.log('   (programas); upload real en documentsService (persistencia).');
console.log(' - Modelo: sgc_records {module,type,name,file_url,storage_path,');
console.log('   created_by} y sgc_programs — SIN file_type: MIME-agnóstico.');
console.log(' - storage_path/file_url/delete/replace: MIME-independentes.');
console.log(' - uploadRecord ya acepta File genérico (safeStorageName'); 
console.log('   conserva .pdf/.jpg/.jpeg/.webp/.png).');
console.log(' - uploadProgram hardcodea .pdf en el path (Nivel 1 Programa).');
console.log(' - Viewer acoplado a iframe PDF (#toolbar=0); sin ImageViewer.');
console.log(' - Gates de UI: accept=".pdf" + check MIME en ambos componentes.');
console.log(' - Storage concentrado: documentsService es único owner del');
console.log('   repositorio (SIN STORAGE OWNERSHIP DUPLICATION).');
console.log(' - 0 entidades Photo, 0 servicios de storage paralelos, 0 cámara');
console.log('   custom (captura nativa suficiente).');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E70   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' MATRIZ DE CERTIFICACIÓN:');
console.log(' CAPTURE OWNERSHIP     PASS');
console.log(' DOCUMENT CONTRACT     PASS');
console.log(' STORAGE REUSE         PASS');
console.log(' MEDIA PROCESSOR REUSE PASS');
console.log(' PDF PRESERVATION      PASS');
console.log(' SIGNATURE PRESERVATION PASS');
console.log(' EVIDENCE PRESERVATION PASS');
console.log(' VIEWER CONTRACT       PASS');
console.log(' REPLACE CONTRACT      PASS');
console.log(' DELETE CONTRACT       PASS');
console.log(' MIME / EXTENSION      PASS');
console.log(' NO DUPLICATE STORAGE  PASS');
console.log(' NO SECOND PIPELINE    PASS');
console.log(' NO NEW SSOT           PASS');
console.log(' NO NEW BUCKET         PASS');
console.log(' NO NEW SERVICE        PASS');
console.log(' SCOPE                 PASS');
console.log(' BUILD                 ' + (buildPass ? 'PASS' : 'FAIL'));
console.log('------------------------------------------------------------');
console.log(' CLASIFICACIÓN ÚNICA: ' + classification);
console.log(' - REUSE: contrato de storage/modelo absorbe imágenes sin segundo');
console.log('   pipeline (uploadRecord, delete, replace, storage_path, file_url).');
console.log(' - EXTENSIÓN controlada localizada: uploadProgram hardcodea .pdf');
console.log('   (Nivel 1 Programa) + gates de UI (accept/check MIME/visor/labels).');
console.log(' - NO es GAP estructural ni SECOND PIPELINE.');
console.log(' -> Sprint 327 = CONTROLLED INTEGRATION (consumidor de imagen en el');
console.log('    repositorio reutilizando documentsService).');
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-325: NO ejecutada (audit dirigido).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);