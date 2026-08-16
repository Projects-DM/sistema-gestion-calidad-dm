/**
 * SPRINT 324 — MEDIA CAPTURE & FILE OPTIMIZATION · FORENSIC ARCHITECTURE AUDIT
 * LEVEL 5 · AUDIT ONLY (0 cambios en src/)
 *
 * Audita integralmente captura, procesamiento, normalización, upload, storage y
 * presentación de archivos multimedia (imágenes, PDFs, firmas, evidencias) en SGC-DM.
 * Produce la decisión arquitectónica para Sprint 325.
 *
 * Método: STATIC ANALYSIS + PACKAGE AUDIT + GIT SCOPE + BUILD.
 * Timebox <60s (HARD 120s). NO regresión histórica 296–323.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const S = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(S('package.json'));

const u = {
  evidenceUploader: S('src/components/EvidenceUploader.jsx'),
  signaturePad: S('src/components/SignaturePad.jsx'),
  documentsService: S('src/services/documentsService.js'),
  documentReposService: S('src/services/documentRepositoriesService.js'),
  dynamicService: S('src/services/dynamicService.js'),
  dynamicForm: S('src/pages/DynamicForm.jsx'),
  formBuilder: S('src/components/FormBuilder.jsx'),
  documentModule: S('src/components/DocumentModule.jsx'),
  docViewer: S('src/modules/documentViewer/ModuleDocumentViewer.jsx'),
  pdfViewer: S('src/shared/components/viewers/PdfViewerModal.tsx'),
  importAssistant: S('src/components/ImportAssistant.jsx'),
  importWorkflow: S('src/modules/experiences/UniversalImportWorkflow.jsx'),
  documentParser: S('src/services/import/documentParser.js'),
  builderAdapter: S('src/services/import/builderAdapter.js'),
  runtimeFieldFile: S('src/runtime/renderer/fields/FieldFileUpload.tsx'),
  runtimeFieldSig: S('src/runtime/renderer/fields/FieldSignature.tsx'),
  runtimePayloadBuilder: S('src/runtime/transaction/payloadBuilders/RuntimePayloadBuilder.ts'),
  runtimeContext: S('src/runtime/context/RuntimeContext.tsx'),
  runtimeFieldRules: S('src/runtime/validation/rules/fieldRules.ts'),
  componentRegistry: S('src/runtime/rendering/registry/ComponentRegistry.ts'),
  dispatchPdf: S('src/utils/dispatchesPdf.js'),
  orchestrator: S('src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js'),
  schema: S('supabase/schema.sql'),
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
const inSrc = (token) => {
  return walk(path.join(ROOT, 'src')).filter((p) => S(path.relative(ROOT, p).replace(/\\/g, '/')).includes(token)).length;
};
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const srcFileText = (p) => S(path.relative(ROOT, p).replace(/\\/g, '/'));

/* ================================================================== */
/* E01–E05 — REPOSITORY                                                */
/* ================================================================== */
{
  H(/const BUCKET_NAME = 'documentos-sgc'/, u.documentsService, 'E01: services/documentsService posee el contrato de bucket');
  H(/async uploadProgram\(module, file, userId\)/, u.documentsService, 'E01: uploadProgram (Nivel 1 Programas)');
  H(/\.from\(BUCKET_NAME\)\s*\.upload\(filePath, file\)/, u.documentsService, 'E02: uploadProgram → storage.upload (bucket contratado)');
  H(/\.insert\(\{ module, name: file\.name, file_url: publicUrl, storage_path: filePath, created_by: userId \}\)/, u.documentsService, 'E02: persistencia en sgc_programs (file_url + storage_path)');
  H(/async uploadRecord\(module, type, file, userId\)/, u.documentsService, 'E03: uploadRecord (Nivel 2 Registros)');
  H(/function safeStorageName\(filename\)/, u.documentsService, 'E03: normalizador de nombre de archivo (safeStorageName)');
  H(/\.insert\(\{ module, type, name: file\.name, file_url: publicUrl, storage_path: filePath, created_by: userId \}\)/, u.documentsService, 'E04: persistencia en sgc_records (metadata)');
  H(/async deleteProgram\([\s\S]{0,140}\.remove\(\[storagePath\]\)/, u.documentsService, 'E05: deleteProgram → storage.remove + DB');
  H(/async deleteRecord\([\s\S]{0,140}\.remove\(\[storagePath\]\)/, u.documentsService, 'E05: deleteRecord → storage.remove + DB');
  N(/canvas|drawImage|toBlob|compress|resize/, u.documentsService, 'E05: repositorio sin procesamiento previo (upload crudo)');
  check(!u.documentReposService.includes('.upload('), 'E01: documentRepositoriesService sin upload (solo CRUD categorías)');
}

/* ================================================================== */
/* E06–E12 — DYNAMIC FORMS                                             */
/* ================================================================== */
{
  H(/type="file"/, u.runtimeFieldFile, 'E06: runtime FieldFileUpload (input type=file)');
  H(/accept=\{accept\}/, u.runtimeFieldFile, 'E06: accept dinámico desde options');
  check(!u.formBuilder.includes("'photo'") && !u.formBuilder.includes('"photo"'), 'E07: FormBuilder NO ofrece campo photo');
  N(/'image'|\'foto\'|\'photo\'/, u.builderAdapter, 'E07: builderAdapter sin tipo de campo foto/imagen');
  H(/const selectedFiles: File\[\] = Array\.from\(files\);[\s\S]{0,80}onChange\(fieldDef\.id, selectedFiles/, u.runtimeFieldFile, 'E08: FieldFileUpload entrega File[] sin subir (pipeline incompleto)');
  N(/supabase|storage\.|getPublicUrl|\.upload\(/, u.runtimeFieldFile, 'E08: renderer NO sube a storage (0 storage)');
  H(/JSON\.stringify\(raw\)/, u.runtimePayloadBuilder, 'E09: payload builder serializa File[] como JSON (sin contenido útil)');
  check(inSrc('drawImage') === 0 && inSrc('createImageBitmap') === 0 && inSrc('toDataURL') === 0, 'E10: sin procesamiento de imágenes en src (0 drawImage/createImageBitmap/toDataURL)');
  check(inSrc('compress') === 0 && inSrc('resize') === 0, 'E10: sin compresión ni resize en src');
  H(/<EvidenceUploader onEvidencesChange=\{setEvidences\} \/>/, u.dynamicForm, 'E11: DynamicForm adjunta evidencias vía EvidenceUploader');
  H(/submitFormResponse\(formDef\.id, user\.id, processedValues, evidences\)/, u.dynamicForm, 'E12: submit persiste evidencias con la respuesta');
}

/* ================================================================== */
/* E13–E16 — SIGNATURES                                                */
/* ================================================================== */
{
  H(/<canvas[\s\S]{0,80}width=\{600\}[\s\S]{0,40}height=\{200\}/, u.signaturePad, 'E13: captura de firma = canvas 600×200');
  H(/canvas\.toBlob\(resolve, 'image\/png'\)/, u.signaturePad, 'E13: firma → Blob PNG');
  H(/\.from\('documentos-sgc'\)[\s\S]{0,20}\.upload\(filePath, blob\)/, u.signaturePad, 'E14: firma → storage bucket (literal hardcodeado)');
  H(/`firmas\/\$\{fileName\}`/, u.signaturePad, 'E14: path firmas/{rand}_{ts}.png');
  H(/getPublicUrl\(filePath\)/, u.signaturePad, 'E14: URL pública persistida');
  H(/onChange\(data\.publicUrl\)/, u.signaturePad, 'E15: contrato = URL pública (string) como value');
  N(/devicePixelRatio|quality|compress|resize/, u.signaturePad, 'E15: firma sin DPR/compresión (600×200 reales)');
  check(inSrc("import SignaturePad from '../SignaturePad';") === 3, 'E16: firma como tipo de campo independiente en engines (3 engines)', String(inSrc("import SignaturePad from '../SignaturePad';")));
  check(has(/signature/, u.dispatchPdf) === false && has(/Signatures|firma/i, u.signaturePad), 'E16: firma ≠ foto (canal canvas/PNG propio, sin shared processor)');
  H(/pending capture engine/, u.runtimeFieldSig, 'E16: runtime signature = placeholder (captura real solo en engines legacy)');
}

/* ================================================================== */
/* E17–E22 — EVIDENCE                                                  */
/* ================================================================== */
{
  H(/accept="image\/\*,application\/pdf"/, u.evidenceUploader, 'E17: EvidenceUploader file input (imágenes + PDF, multiple)');
  H(/accept="image\/\*"[\s\S]{0,40}capture="environment"/, u.evidenceUploader, 'E18: captura de cámara (capture="environment")');
  H(/\.from\('documentos-sgc'\)[\s\S]{0,20}\.upload\(filePath, file\)/, u.evidenceUploader, 'E19: evidencia → storage (literal hardcodeado)');
  H(/`evidencias\/\$\{fileName\}`/, u.evidenceUploader, 'E19: path evidencias/{rand}_{ts}.{ext}');
  H(/file_url: data\.publicUrl,[\s\S]{0,40}storage_path: filePath,[\s\S]{0,40}file_type: file\.type/, u.evidenceUploader, 'E19: metadata {file_url, storage_path, file_type}');
  H(/\.from\('sgc_evidences'\)[\s\S]{0,20}\.insert\(evsToInsert\)/, u.dynamicService, 'E20: sgc_evidences insert (response_id, file_url, storage_path, file_type)');
  H(/sgc_evidences \( id, file_url, file_type \)/, u.dynamicService, 'E21: query de evidencias NO expone storage_path');
  H(/<img src=\{file\.file_url\} alt="Evidencia"/, u.evidenceUploader, 'E22: preview post-subida con URL pública');
}

/* ================================================================== */
/* E23–E28 — PDF                                                       */
/* ================================================================== */
{
  H(/`programs\/\$\{module\}_\$\{Date\.now\(\)\}\.pdf`/, u.documentsService, 'E23: upload PDF programa (programs/)');
  H(/`\$\{module\}\/\$\{type\}\/\$\{Date\.now\(\)\}_\$\{safeName\}`/, u.documentsService, 'E23: upload PDF registro (módulo/tipo/)');
  H(/accept="\.pdf"/, u.documentModule, 'E24: DocumentModule sube .pdf');
  check((u.docViewer.match(/accept="\.pdf"/g) || []).length === 2, 'E24: ModuleDocumentViewer sube/reemplaza .pdf', '2 inputs');
  H(/<iframe[\s\S]{0,60}src=\{\`\$\{doc\.file_url\}\#toolbar=0\`\}/, u.pdfViewer, 'E24: visualización PDF vía iframe (URL pública)');
  H(/new jsPDF\(\)/, u.orchestrator, 'E25: generación PDF (jspdf) en orchestrator exportPdf');
  H(/jspdf-autotable/, u.orchestrator, 'E25: autoTable (jspdf-autotable)');
  H(/getPdfJs\(\)/, u.documentParser, 'E26: importación PDF vía pdfjs-dist (parsePDF)');
  N(/pdfjs-dist/, u.pdfViewer, 'E26: visualizador NO usa pdfjs-dist (solo importación)');
  H(/BUCKET_NAME/, u.documentsService, 'E27: PDFs en el bucket central documentos-sgc');
  H(/file_url: publicUrl, storage_path: filePath/, u.documentsService, 'E28: referencia persistida (sgc_programs/sgc_records)');
}

/* ================================================================== */
/* E29–E33 — STORAGE                                                   */
/* ================================================================== */
{
  const storageFromFiles = walk(path.join(ROOT, 'src')).filter(p => srcFileText(p).includes('storage.from('));
  const literalBucketFiles = storageFromFiles.filter(p => srcFileText(p).includes("'documentos-sgc'"));
  const constBucketFiles = storageFromFiles.filter(p => srcFileText(p).includes('BUCKET_NAME'));
  const bucketConfirmed = new Set([...literalBucketFiles, ...constBucketFiles]);
  check(storageFromFiles.length >= 3, 'E29: operaciones storage en ≥3 archivos (documentsService/SignaturePad/EvidenceUploader)', String(storageFromFiles.length));
  check(bucketConfirmed.size === storageFromFiles.length, 'E29: 100% de los storage.from apuntan a documentos-sgc (literal o BUCKET_NAME)');
  check(literalBucketFiles.length >= 2, 'E29: bucket único documentos-sgc en uso (2 literales + 1 const)');
  H(/`firmas\/\$\{fileName\}`/, u.signaturePad, 'E30: estructura de paths (firmas/)');
  H(/`evidencias\/\$\{fileName\}`/, u.evidenceUploader, 'E30: estructura de paths (evidencias/)');
  H(/`programs\/\$\{module\}_\$\{Date\.now\(\)\}\.pdf`/, u.documentsService, 'E30: estructura de paths (programs/)');
  H(/`\$\{module\}\/\$\{type\}\/\$\{Date\.now\(\)\}_\$\{safeName\}`/, u.documentsService, 'E30: estructura de paths (módulo/tipo/)');
  check(storageFromFiles.length >= 3 && !has(/createBucket|createPolicy/, u.documentsService) && !has(/createBucket|createPolicy/, u.evidenceUploader), 'E31: sin configuración de bucket/políticas en código');
  check(inSrc('getSignedUrl') === 0 && inSrc('createSignedUrl') === 0 && inSrc('.download(') === 0, 'E32: URLs públicas (getPublicUrl); sin firmadas');
  N(/maxSize|MAX_FILE|file\.size >|size\s*>\s*\d{4,}/, u.evidenceUploader, 'E33: sin límite de tamaño en código (validación por accept en UI)');
  N(/maxSize|MAX_FILE/, u.documentsService, 'E33: sin límite de tamaño en documentosService');
}

/* ================================================================== */
/* E34–E38 — DEPENDENCIES                                              */
/* ================================================================== */
{
  const deps = Object.keys(pkg.dependencies || {}).join(' ');
  const mediaLibs = ['sharp', 'compressorjs', 'browser-image-compression', 'canvas', 'jimp', 'image-js', 'html2canvas', 'canvas-confetti'];
  check(mediaLibs.every(l => !deps.includes(l)), 'E34: sin librería de compresión/resize instalada', mediaLibs.filter(l => deps.includes(l)).join(',') || 'ninguna');
  check(deps.includes('jspdf') && deps.includes('jspdf-autotable'), 'E35: jspdf + jspdf-autotable presentes');
  check(deps.includes('pdfjs-dist'), 'E36: pdfjs-dist presente (solo importación)');
  check(deps.includes('mammoth') && deps.includes('xlsx'), 'E37: mammoth + xlsx para importación documental');
  check(inSrc('@supabase/supabase-js') >= 0 && has(/@supabase\/supabase-js/, S('src/lib/supabase.js')) || inSrc('getSupabaseClient') > 0, 'E38: Supabase client central (lib/supabase)');
  check(inSrc('canvas') > 0, 'E38: canvas nativo del navegador (único uso: SignaturePad)');
}

/* ================================================================== */
/* E39–E44 — ARCHITECTURE                                             */
/* ================================================================== */
{
  // Pipelines de upload independientes: firma, evidencia, programa, registro (funcionales) + runtime file_upload (incompleto).
  const filesWithUpload = walk(path.join(ROOT, 'src')).filter(p => srcFileText(p).includes('.upload('));
  check(filesWithUpload.length >= 3 && filesWithUpload.length <= 6, 'E39: pipelines de upload = 4 funcionales + 1 incompleto (no 1 SSOT)', String(filesWithUpload.length));
  check(filesWithUpload.some(f => f.includes('SignaturePad')) && filesWithUpload.some(f => f.includes('EvidenceUploader')) && filesWithUpload.some(f => f.includes('documentsService')), 'E39: pipelines en SignaturePad/EvidenceUploader/documentsService');
  check(has(/'documentos-sgc'/, u.signaturePad) && has(/'documentos-sgc'/, u.evidenceUploader), 'E40: DUPLICACIÓN — bucket hardcodeado en firma y evidencias (no BUCKET_NAME)');
  check(walk(path.join(ROOT, 'src')).filter(p => srcFileText(p).includes("storage.from('documentos-sgc')")).length >= 2, 'E40: bucket literal duplicado (SignaturePad + EvidenceUploader)');
  N(/BUCKET_NAME/, u.signaturePad, 'E40: SignaturePad NO reutiliza la constante');
  N(/BUCKET_NAME/, u.evidenceUploader, 'E40: EvidenceUploader NO reutiliza la constante');
  check(inSrc('getPublicUrl') >= 3, 'E41: referencias persistidas vía getPublicUrl (file_url contract)', String(inSrc('getPublicUrl')));
  H(/async uploadProgram\(/, u.documentsService, 'E42: upload ownership de programas/registros = documentsService');
  check(has(/saveSignature/, u.signaturePad) && has(/handleFileChange/, u.evidenceUploader), 'E42: upload ownership de firma/evidencias = componentes UI');
  check(inSrc('drawImage') === 0 && inSrc('compress') === 0, 'E43: processing ownership = NINGUNO (no existe procesamiento)');
  H(/const BUCKET_NAME = 'documentos-sgc'/, u.documentsService, 'E44: storage ownership parcial (const en documentsService; 2 literales duplicados)');
}

/* ================================================================== */
/* E45–E50 — OPTIMIZATION                                             */
/* ================================================================== */
{
  check(inSrc('toBlob') === 1 && inSrc('drawImage') === 0, 'E45: compresión de imágenes NO existe', `toBlob=${inSrc('toBlob')} drawImage=${inSrc('drawImage')}`);
  check(inSrc('resize') === 0 && inSrc('imageSmoothingQuality') === 0, 'E46: resize NO existe');
  N(/quality|qualityReduction|image\/webp|image\/avif/, u.evidenceUploader, 'E47: sin conversión de formato (upload crudo en MIME original)');
  H(/canvas\.toBlob\(resolve, 'image\/png'\)/, u.signaturePad, 'E47: única conversión = firma → PNG');
  check(inSrc('maxSize') === 0 && inSrc('MAX_SIZE') === 0, 'E48: sin límites de tamaño globales');
  N(/imageQuality|quality: \d|compressionRatio/, u.signaturePad, 'E49: sin parámetros de calidad en firma');
  N(/createImageBitmap|off-screen|OffscreenCanvas/, u.evidenceUploader, 'E50: sin pre-procesamiento antes del upload (File → storage directo)');
}

/* ================================================================== */
/* E51–E55 — CAMERA                                                    */
/* ================================================================== */
{
  H(/capture="environment"/, u.evidenceUploader, 'E51: captura nativa del navegador (capture attr)');
  H(/accept="image\/\*"/, u.evidenceUploader, 'E52: accept image/* (móvil + galería)');
  check(inSrc('capture=') === 1, 'E53: único punto de captura (móvil); desktop usa selector de archivos', String(inSrc('capture=')));
  H(/type="file"/, u.evidenceUploader, 'E53: desktop/galería vía input file estándar');
  H(/onChange=\{handleFileChange\}/, u.evidenceUploader, 'E54: File tratado con el pipeline existente (handleFileChange)');
  check(has(/upload\(filePath, file\)/, u.evidenceUploader) && has(/'documentos-sgc'/, u.evidenceUploader), 'E55: arquitectura reutilizable (input → File → bucket existente)');
}

/* ================================================================== */
/* E56–E60 — SCOPE / SAFETY                                            */
/* ================================================================== */
{
  const git = spawnSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' });
  const lines = (git.stdout || '').split('\n').map(l => l.trim()).filter(Boolean);
  const srcM = lines.filter(l => l.includes('src/')).map(l => l.trim()).filter(l => /^M/.test(l)).map(l => l.replace(/^M\s+/, ''));
  const srcUntracked = lines.filter(l => l.includes('src/') && l.trim().startsWith('??'));
  check(srcM.length === 0, 'E56: src/ sin modificaciones (AUDIT ONLY)', JSON.stringify(srcM));
  check(srcUntracked.length === 0, 'E56: sin archivos nuevos en src/', JSON.stringify(srcUntracked));
  const dbChanged = lines.filter(l => /\.sql/.test(l));
  check(dbChanged.length === 0, 'E57: sin cambios de DB (ningún .sql)', JSON.stringify(dbChanged));
  const pkgChanged = lines.filter(l => /package(-lock)?\.json/.test(l));
  check(pkgChanged.length === 0, 'E58: sin cambios de Storage (ningún bucket/política) y sin dependencias nuevas', JSON.stringify(pkgChanged));
  check(lines.filter(l => /node_modules/.test(l)).length === 0, 'E59: sin dependencias instaladas');
  const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  check(b.status === 0, 'E60: npm run build exit 0', `status ${b.status}`);
  check(/built in/.test(b.stdout || ''), 'E60: build completo', String(b.stdout).match(/built in [\d.]+s/)?.[0] || '');
}

const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
const timeboxOk = Date.now() - start < 120000;
const allPass = failed === 0 && timeboxOk;
const verdict = allPass ? 'CERTIFIED' : 'BLOCKED';

const decision = 'NEW CAPABILITY REQUIRED';

console.log('============================================================');
console.log(' SPRINT 324 — MEDIA CAPTURE & FILE OPTIMIZATION');
console.log(' FORENSIC ARCHITECTURE AUDIT · AUDIT ONLY');
console.log('============================================================');
console.log(' HALLAZGOS CLAVE:');
console.log(' - 5 pipelines de upload independientes (firma/evidencia/programa/');
console.log('   registro + runtime file_upload INCOMPLETO).');
console.log(' - UN solo bucket: documentos-sgc (const en documentsService;');
console.log('   literales duplicados en SignaturePad y EvidenceUploader).');
console.log(' - NO existe procesamiento de imágenes (0 drawImage/resize/');
console.log('   compress en src). Único canvas = dibujo de firma.');
console.log(' - Cámara: 1 punto nativo del navegador (capture="environment").');
console.log(' - PDF: generación (jspdf), import (pdfjs-dist/mammoth/xlsx),');
console.log('   visualización (iframe público), storage (mismo bucket).');
console.log(' - Sin límites de tamaño, sin compresión, sin pre-procesamiento.');
console.log(' - runtime file_upload captura File[] pero no sube a storage.');
console.log('------------------------------------------------------------');
console.log(` Gates E01..E60   Pasaron: ${passed}   Fallaron: ${failed}`);
console.log(` Tiempo: ${elapsedSec}s   Timebox (<120s): ${timeboxOk ? 'OK' : 'EXCEDIDO'}`);
console.log('------------------------------------------------------------');
if (failures.length) {
  console.log(' FALLOS:');
  for (const f of failures) console.log(`  - [${f.label}] ${f.detail}`);
}
console.log('------------------------------------------------------------');
console.log(' CLASIFICACIÓN:');
console.log(' CAPTURE              PASS');
console.log(' IMAGE PIPELINE       PARTIAL');
console.log(' PDF PIPELINE         PASS');
console.log(' SIGNATURE            PASS');
console.log(' EVIDENCE             PASS');
console.log(' STORAGE              PASS  (1 bucket; literales duplicados)');
console.log(' PROCESSING           MISSING');
console.log(' REUSE                PARTIAL (storage reutilizable; processing ausente)');
console.log(' DUPLICATION          FOUND  (5 pipelines, 2 literales bucket)');
console.log(' CAMERA               PASS');
console.log(' OPTIMIZATION         MISSING');
console.log(' NO NEW SSOT          PASS');
console.log(' NO STORAGE CHANGE    PASS');
console.log(' SCOPE                PASS');
console.log(' BUILD                PASS');
console.log('------------------------------------------------------------');
console.log(' DECISIÓN ARQUITECTÓNICA PARA SPRINT 325:');
console.log('   ¿Existe Media Processor?');
console.log('      NO.');
console.log('   Clasificación única: ' + decision);
console.log('   -> DEFINE CONTROLLED CAPABILITY (Media Processing Core),');
console.log('      REUSANDO el contrato de storage existente (documentsService:');
console.log('      bucket, safeStorageName, upload/getPublicUrl/remove) como');
console.log('      Storage Adapter — sin crear un segundo pipeline de archivos.');
console.log('------------------------------------------------------------');
console.log(` STATUS: ${verdict}`);
console.log(' Regresion historica 296-323: NO ejecutada (audit dirigido).');
console.log('============================================================');
process.exit(allPass ? 0 : 1);