import { useState, useRef, useMemo } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Eye, Pencil, ExternalLink, ShieldAlert, FileText } from 'lucide-react';
import { parseDocument, analyzeDocumentStructure } from '../../services/import/index.js';
import { normalizeOperationalData, buildOperationalDocumentModel, buildOperationalRecords } from '../../services/import/operationalDataExtractionLayer.js';
import { evaluateRecord } from '../../core/capabilities/experiences/rules/UniversalOperationalRulesEngine.js';

function getFieldLabel(contract, field) {
  return contract.ui?.fieldDisplay?.[field]?.label
    || contract.documentContract.synonyms?.[field]?.[0]
    || field;
}

function detectInputType(contract, field) {
  const normalizer = contract.documentContract.fieldNormalizers?.[field];
  if (normalizer?.name === 'toYmd') return 'date';
  if (normalizer?.name === 'toHm') return 'time';
  if (normalizer?.name === 'toNumber') return 'number';
  return 'text';
}

function getTableFields(contract) {
  return contract.ui?.tableFields || contract.documentContract.canonicalFields || [];
}

function computeUnknownHeaders(rawHeaders, matchedHeaders) {
  const matchedRawHeaders = new Set(Object.values(matchedHeaders).filter(Boolean));
  return (rawHeaders || []).filter(h => h && !matchedRawHeaders.has(h));
}

function computeRowErrors(row, errorExpectations, canonicalFields) {
  const errs = [];
  for (const f of canonicalFields) {
    if (errorExpectations.required?.[f] && !String(row[f] ?? '').trim()) {
      errs.push(`${getFieldLabel(errorExpectations, f)} está vacío`);
    }
  }
  return errs;
}

export default function UniversalImportWorkflow({ open, onClose, onImported, contract }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | parsing | preview | complete
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [matchedHeaders, setMatchedHeaders] = useState({});
  const [missingHeaders, setMissingHeaders] = useState([]);
  const [unknownHeaders, setUnknownHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [structureAnalysis, setStructureAnalysis] = useState(null);
  const [parsedDoc, setParsedDoc] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);
  const [completenessScore, setCompletenessScore] = useState(0);
  const [builtRecords, setBuiltRecords] = useState([]);

  const canonicalFields = contract?.documentContract?.canonicalFields || [];
  const tableFields = getTableFields(contract);
  const displayFields = tableFields.length ? tableFields : canonicalFields;

  const rows = parsedRows;
  const validCount = rows.filter(r => r._included && !r._errors?.length).length;
  const errorCount = rows.filter(r => r._errors?.length).length;

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file) => {
    setError('');
    setPhase('parsing');
    setFileName(file?.name || '');
    try {
      const parsedDoc = await parseDocument(file);
      if (!parsedDoc?.rawRows?.length) throw new Error('El archivo no contiene filas con datos.');
      const analysis = analyzeDocumentStructure({
        rawRows: parsedDoc.rawRows,
        rawHeaders: parsedDoc.rawHeaders,
        textContent: parsedDoc.textContent,
        fileType: parsedDoc.fileType,
      });
      setStructureAnalysis(analysis);
      setParsedDoc(parsedDoc);
      const docModel = buildOperationalDocumentModel({ parsedDocument: parsedDoc, structureAnalysis: analysis });
      const recResult = buildOperationalRecords({ operationalDocumentModel: docModel, contract, recordBuilderHints: contract?.recordBuilderHints });
      setBuiltRecords(recResult.records || []);
      const segments = analysis?.documentSegments;
      const result = normalizeOperationalData({ parsedDocument: parsedDoc, contract, structureAnalysis: analysis, operationalSection: segments?.operationalSection });
      if (!result?.rows?.length) throw new Error('No se pudieron extraer registros del archivo.');
      const unknown = computeUnknownHeaders(parsedDoc.rawHeaders, result.matchedHeaders);
      const rows = result.rows.map((r, i) => {
        const { allErrors, complianceIssues } = evaluateRecord(r, contract);
        return {
          ...r,
          _rowIndex: i,
          _included: allErrors.length === 0,
          _errors: allErrors,
          _compliance: complianceIssues,
        };
      });
      setMatchedHeaders(result.matchedHeaders);
      setMissingHeaders(result.missingHeaders);
      setUnknownHeaders(unknown);
      setParsedRows(rows);
      setActiveSheet(parsedDoc.activeSheet || null);
      setCompletenessScore(result.completenessScore ?? 0);
      setPhase('preview');
    } catch (e) {
      setError(e?.message || 'Error al procesar el archivo.');
      setPhase('idle');
    }
  };

  const handleImport = async () => {
    const included = rows.filter(r => r._included);
    if (!included.length) return;
    setPhase('complete');
    onImported?.(included.map(({ _rowIndex, _included, _errors, ...record }) => record));
  };

  const reset = () => {
    setPhase('idle');
    setError('');
    setFileName('');
    setMatchedHeaders({});
    setMissingHeaders([]);
    setUnknownHeaders([]);
    setParsedRows([]);
    setStructureAnalysis(null);
    setParsedDoc(null);
    setActiveSheet(null);
    setCompletenessScore(0);
    setBuiltRecords([]);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const toggleRow = (rowIndex) => {
    setParsedRows(prev => prev.map(r =>
      r._rowIndex === rowIndex ? { ...r, _included: !r._included } : r
    ));
  };

  const updateCell = (rowIndex, field, value) => {
    setParsedRows(prev => prev.map(r =>
      r._rowIndex === rowIndex ? { ...r, [field]: value } : r
    ));
  };

  const canImport = useMemo(() => phase === 'preview' && rows.some(r => r._included), [phase, rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full sm:max-w-5xl bg-white sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 h-[100dvh] sm:h-auto sm:max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="bg-primary px-4 sm:px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Importar {contract?.metadata?.name || 'Registros'}</h2>
              <p className="text-primary-100 text-xs">Carga un archivo .xlsx con vista previa, validación humana y corrección.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Upload zone (visible in idle/parsing) */}
          {phase !== 'preview' && (
            <div
              className={[
                'rounded-2xl border-2 border-dashed p-4 sm:p-6 transition-all',
                isDragging ? 'border-accent bg-yellow-50' : 'border-gray-200 bg-gray-50',
              ].join(' ')}
              onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
              onDragOver={e => e.preventDefault()}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            >
               <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <Upload className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Arrastra tu Excel aquí o selecciona un archivo</p>
                    <p className="text-xs text-gray-500 mt-1">Se detectan encabezados de forma inteligente (sinónimos). Cada fila podrá revisarse antes de importar. Formatos soportados: Excel (.xlsx, .xls), CSV y PDF.</p>
                    {fileName && <p className="text-xs text-gray-700 mt-2">Archivo: <span className="font-semibold">{fileName}</span></p>}
                  </div>
                </div>
                <button type="button" onClick={handlePick} disabled={phase === 'parsing'}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-bold border border-gray-200 transition-all shadow-sm w-full md:w-auto disabled:opacity-50">
                  <FileSpreadsheet className="w-4 h-4 text-accent" />
                  {phase === 'parsing' ? 'Procesando...' : 'Seleccionar archivo'}
                </button>
              </div>
            </div>
          )}

          {phase === 'parsing' && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Analizando documento con inteligencia documental...</p>
              </div>
            </div>
          )}

          {error && phase !== 'preview' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">No se puede importar</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Preview phase — 5-block document rendering */}
          {phase === 'preview' && (
            <>
              {/* Block 1: Document Info */}
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/[0.02] px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    {parsedDoc?.fileType === 'pdf' ? (
                      <FileText className="w-4.5 h-4.5 text-primary" />
                    ) : (
                      <FileSpreadsheet className="w-4.5 h-4.5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">Bloque 1 — Información del documento</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-600">
                      <span>Tipo: <strong className="text-gray-800">{parsedDoc?.fileType?.toUpperCase() || '—'}</strong></span>
                      {activeSheet && <span>Hoja activa: <strong className="text-gray-800">{activeSheet}</strong></span>}
                      {parsedDoc?.sheetNames?.length > 1 && <span>Hojas: <strong className="text-gray-800">{parsedDoc.sheetNames.length}</strong></span>}
                      <span>Filas encontradas: <strong className="text-gray-800">{rows.length}</strong></span>
                      {structureAnalysis?.signals?.avgColumns > 0 && <span>Columnas: <strong className="text-gray-800">{structureAnalysis.signals.avgColumns}</strong></span>}
                      <span>Documento: <strong className="text-gray-800">{fileName}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 1.5: Document Analysis Summary */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4.5 h-4.5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-emerald-800">DOCUMENTO ANALIZADO</p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Metadata encontrada</p>
                        {structureAnalysis?.metadataBlock?.fields && Object.keys(structureAnalysis.metadataBlock.fields).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {Object.entries(structureAnalysis.metadataBlock.fields).map(([k, v]) => (
                              <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100/70 text-emerald-600 rounded text-[10px] font-medium border border-emerald-200/50">
                                {k}: <strong>{v}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-500 italic mt-1">No se encontró metadata</p>
                        )}
                      </div>
                      <div className="border-t border-emerald-200/50 pt-2">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                          Tabla encontrada
                          {structureAnalysis?.tableBlock?.headers?.length > 0 && (
                            <span className="ml-2 font-normal normal-case">Headers: {structureAnalysis.tableBlock.headers.length}</span>
                          )}
                        </p>
                        {structureAnalysis?.tableBlock?.headers?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {structureAnalysis.tableBlock.headers.map((h, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 bg-emerald-100/70 text-emerald-600 rounded text-[10px] font-medium border border-emerald-200/50">
                                {h}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-500 italic mt-1">No se detectó tabla</p>
                        )}
                      </div>
                      <div className="border-t border-emerald-200/50 pt-2">
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                          Registros encontrados: <span className="normal-case font-bold text-emerald-800">{structureAnalysis?.documentSummary?.tableRowsFound ?? rows.length}</span>
                        </p>
                      </div>
                      {structureAnalysis?.documentSummary && (
                        <div className="border-t border-emerald-200/50 pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-emerald-600">
                          <span>Metadata: {structureAnalysis.documentSummary.metadataFieldsFound} campos</span>
                          <span>Headers tabla: {structureAnalysis.documentSummary.tableHeadersFound}</span>
                          <span>Filas tabla: {structureAnalysis.documentSummary.tableRowsFound}</span>
                          <span>Total filas doc: {structureAnalysis.documentSummary.totalRows}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 1.75: Operational Section Detected */}
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4.5 h-4.5 text-cyan-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-cyan-800">SECCIÓN OPERACIONAL DETECTADA</p>
                    {(() => {
                      const segs = structureAnalysis?.documentSegments;
                      const op = segs?.operationalSection;
                      const ignored = segs?.ignoredSections || [];
                      return (
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Metadata operacional</p>
                            {op?.metadata && Object.keys(op.metadata).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {Object.entries(op.metadata).map(([k, v]) => (
                                  <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100/70 text-cyan-600 rounded text-[10px] font-medium border border-cyan-200/50">
                                    {k}: <strong>{v}</strong>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-cyan-500 italic mt-1">No se encontró metadata operacional</p>
                            )}
                          </div>
                          <div className="border-t border-cyan-200/50 pt-2">
                            <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Headers detectados</p>
                            {op?.headers?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {op.headers.map((h, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 bg-cyan-100/70 text-cyan-600 rounded text-[10px] font-medium border border-cyan-200/50">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-cyan-500 italic mt-1">No se detectaron headers</p>
                            )}
                          </div>
                          <div className="border-t border-cyan-200/50 pt-2 flex items-center gap-2">
                            <span className="text-xs font-bold text-cyan-700 uppercase">Registros encontrados</span>
                            <span className="inline-flex items-center px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold">
                              {op?.rows?.length || 0}
                            </span>
                          </div>
                          {ignored.length > 0 && (
                            <div className="border-t border-cyan-200/50 pt-2">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Secciones ignoradas ({ignored.length})</p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {ignored.map((sec, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100/70 text-gray-500 rounded text-[10px] font-medium border border-gray-200/50">
                                    <X className="w-3 h-3" /> {sec.reason}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Block 2: Metadata Found */}
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-indigo-700">{structureAnalysis?.documentType === 'SEMI_STRUCTURED' ? 'M' : 'H'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-indigo-800">Bloque 2 — Metadata encontrada</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-indigo-700">
                      <span>Tipo documento: <strong>{structureAnalysis?.documentType === 'SEMI_STRUCTURED' ? 'Semi-estructurado' : 'Tabular'}</strong></span>
                      <span>Confianza: <strong>{Math.round((structureAnalysis?.confidence ?? 0) * 100)}%</strong></span>
                      {structureAnalysis?.sections?.length > 0 && <span>Tablas detectadas: <strong>{structureAnalysis.sections.length}</strong></span>}
                      {structureAnalysis?.signals?.dataDensity > 0 && <span>Densidad: <strong>{Math.round(structureAnalysis.signals.dataDensity * 100)}%</strong></span>}
                    </div>
                    {structureAnalysis?.metadata?.discoveredLabels && Object.keys(structureAnalysis.metadata.discoveredLabels).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(structureAnalysis.metadata.discoveredLabels).map(([k, v]) => (
                          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100/70 text-indigo-600 rounded text-[10px] font-medium border border-indigo-200/50">
                            {k}: <strong>{v}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                    {(!structureAnalysis?.metadata?.discoveredLabels || Object.keys(structureAnalysis.metadata.discoveredLabels).length === 0) && (
                      <p className="text-xs text-indigo-500 italic mt-2">No se encontraron metadatos adicionales fuera de la tabla.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Block 3: Raw Table Preview (primeras 10 filas del documento original) */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-bold text-gray-900">Bloque 3 — Tabla detectada</p>
                  <span className="text-xs text-gray-500">Vista previa del documento original.</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="max-h-[40dvh] overflow-y-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider sticky top-0 z-10">
                          {(parsedDoc?.rawHeaders || []).map((h, i) => (
                            <th key={i} className={`p-2 sm:p-3 ${matchedHeaders[Object.keys(matchedHeaders).find(k => matchedHeaders[k] === h)] ? 'text-green-700' : 'text-gray-500'}`}>
                              {h || `Columna ${i + 1}`}
                              {matchedHeaders[Object.keys(matchedHeaders).find(k => matchedHeaders[k] === h)] && (
                                <span className="ml-1 text-[8px] text-green-500">●</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(parsedDoc?.rawRows || []).slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 text-xs text-gray-700">
                            {(parsedDoc?.rawHeaders || []).map((_, ci) => (
                              <td key={ci} className="p-2 sm:p-3 max-w-[200px] truncate">{row[ci] !== undefined ? String(row[ci]) : ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(parsedDoc?.rawRows?.length || 0) > 10 && (
                      <p className="px-4 sm:px-5 py-2 text-[10px] text-gray-400 italic border-t border-gray-100">
                        Mostrando 10 de {parsedDoc.rawRows.length} filas.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Block 4: Operational Mapping */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-bold text-gray-900">Bloque 4 — Mapeo operacional</p>
                  <span className="text-xs text-gray-500">Cómo cada columna del documento se asigna al contrato.</span>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {canonicalFields.filter(f => matchedHeaders[f]).map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="font-mono text-gray-500 font-medium">{matchedHeaders[f]}</span>
                        <span className="text-gray-300">→</span>
                        <span className="font-semibold text-gray-800">{getFieldLabel(contract, f)}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">({f})</span>
                      </div>
                    ))}
                    {missingHeaders.map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="text-gray-400 italic">—</span>
                        <span className="text-gray-300">→</span>
                        <span className="font-semibold text-gray-800">{getFieldLabel(contract, f)}</span>
                        <span className="text-[10px] text-amber-500 ml-auto">no encontrado</span>
                      </div>
                    ))}
                  </div>
                  {unknownHeaders.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Columnas no reconocidas ({unknownHeaders.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {unknownHeaders.map(h => (
                          <span key={h} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-mono">
                            {h}
                            <span className="text-gray-400">(se ignora)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Block 5: Results */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4.5 h-4.5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">Bloque 5 — Resultado final</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-600">
                      <span>Campos encontrados: <strong className="text-green-700">{canonicalFields.length - missingHeaders.length}</strong></span>
                      <span>Campos faltantes: <strong className="text-amber-600">{missingHeaders.length}</strong></span>
                      <span>Campos desconocidos: <strong className="text-amber-500">{unknownHeaders.length}</strong></span>
                      <span>
                        Score: <strong>{Math.round(completenessScore * 100)}%</strong>
                        <span className="inline-block w-20 h-2 ml-1.5 rounded-full bg-gray-200 align-middle overflow-hidden">
                          <span className={`block h-full rounded-full transition-all ${
                            completenessScore >= 0.8 ? 'bg-green-500' : completenessScore >= 0.5 ? 'bg-accent' : 'bg-red-400'
                          }`} style={{ width: `${Math.round(completenessScore * 100)}%` }} />
                        </span>
                      </span>
                      <span>Registros válidos: <strong className="text-green-700">{validCount}</strong></span>
                      <span>Registros inválidos: <strong className="text-red-500">{errorCount}</strong></span>
                    </div>
                    {missingHeaders.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {missingHeaders.map(f => (
                          <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                            No se encontró: {getFieldLabel(contract, f)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Block 6: Built Operational Records */}
              <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4.5 h-4.5 text-violet-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-violet-800">REGISTROS OPERACIONALES CONSTRUIDOS</p>
                    <p className="text-xs text-violet-600 mt-1">
                      {builtRecords.length} registro(s) construido(s) con herencia de metadata y resolución de tipos.
                    </p>
                    {builtRecords.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-[40dvh] overflow-y-auto">
                        {builtRecords.slice(0, 25).map((rec, idx) => {
                          const displayFields = canonicalFields.filter(f => String(rec[f] ?? '').trim() !== '');
                          return (
                            <div key={idx} className="rounded-xl border border-violet-200/70 bg-white px-3 py-2.5 text-xs">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-violet-800">Registro #{idx + 1}</span>
                                <span className={[
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                                  rec._completeness >= 80 ? 'bg-green-100 text-green-700' : rec._completeness >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
                                ].join(' ')}>
                                  {rec._completeness}%
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-1">
                                {displayFields.map(f => (
                                  <div key={f} className="flex items-center gap-1">
                                    <span className="font-medium text-gray-500">{getFieldLabel(contract, f)}:</span>
                                    <span className="text-gray-800 truncate">{String(rec[f] ?? '')}</span>
                                  </div>
                                ))}
                              </div>
                              {rec._missingFields?.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {rec._missingFields.map(f => (
                                    <span key={f} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[9px] font-medium border border-red-100">
                                      {getFieldLabel(contract, f)} <span className="text-red-300">(faltante)</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {builtRecords.length === 0 && (
                      <p className="text-xs text-violet-500 italic mt-2">No se pudieron construir registros a partir del documento.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Human Validation: normalized records table */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-bold text-gray-900">Validación humana</p>
                    <span className="text-xs text-gray-500">Revisa, edita y selecciona las filas a importar.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setParsedRows(prev => prev.map(r => ({ ...r, _included: true })))}
                      className="px-2.5 py-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                      Seleccionar todas
                    </button>
                    <button onClick={() => setParsedRows(prev => prev.map(r => ({ ...r, _included: false })))}
                      className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                      Deseleccionar todas
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="max-h-[50dvh] overflow-y-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-white border-b border-gray-200 text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
                          <th className="p-2 sm:p-3 w-10">
                            <input type="checkbox" checked={rows.every(r => r._included)}
                              onChange={() => {
                                const all = rows.every(r => r._included);
                                setParsedRows(prev => prev.map(r => ({ ...r, _included: !all })));
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary" />
                          </th>
                          <th className="p-2 sm:p-3 w-16">#</th>
                          <th className="p-2 sm:p-3 w-20 text-center">Validación</th>
                          {displayFields.map(f => (
                            <th key={f} className="p-2 sm:p-3">{getFieldLabel(contract, f)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((row, idx) => (
                          <tr key={row._rowIndex} className={[
                            'hover:bg-primary/[0.02] transition-colors',
                            !row._included ? 'opacity-50 bg-gray-50' : '',
                            row._errors?.length ? 'bg-amber-50/50' : '',
                          ].filter(Boolean).join(' ')}>
                            <td className="p-2 sm:p-3">
                              <input type="checkbox" checked={row._included} onChange={() => toggleRow(row._rowIndex)}
                                className="w-4 h-4 rounded border-gray-300 text-primary" />
                            </td>
                            <td className="p-2 sm:p-3 text-xs text-gray-500 font-mono">{idx + 1}</td>
                            <td className="p-2 sm:p-3 text-center">
                              {row._errors?.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-500" title={row._errors.map(e => e.message).join('; ')}>
                                  <AlertTriangle className="w-4 h-4" />
                                </span>
                              ) : row._compliance?.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-accent" title={row._compliance.map(c => c.message).join('; ')}>
                                  <ShieldAlert className="w-4 h-4" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-green-500">
                                  <CheckCircle2 className="w-4 h-4" />
                                </span>
                              )}
                            </td>
                            {displayFields.map(f => {
                              const type = detectInputType(contract, f);
                              const val = row[f] ?? '';
                              return (
                                <td key={f} className="p-1 sm:p-2">
                                  {type === 'date' ? (
                                    <input type="date" value={typeof val === 'string' ? val.slice(0, 10) : ''}
                                      onChange={e => updateCell(row._rowIndex, f, e.target.value)}
                                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                      disabled={!row._included} />
                                  ) : type === 'time' ? (
                                    <input type="time" value={val}
                                      onChange={e => updateCell(row._rowIndex, f, e.target.value)}
                                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                      disabled={!row._included} />
                                  ) : type === 'number' ? (
                                    <input type="number" step="any" value={val}
                                      onChange={e => updateCell(row._rowIndex, f, e.target.value)}
                                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                      disabled={!row._included} />
                                  ) : (
                                    <input type="text" value={val}
                                      onChange={e => updateCell(row._rowIndex, f, e.target.value)}
                                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                      disabled={!row._included} />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Compliance warnings */}
              {rows.some(r => r._compliance?.length > 0) && (
                <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 sm:px-5 py-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-yellow-800">Alertas de compliance</p>
                      <div className="mt-2 space-y-1">
                        {rows.filter(r => r._compliance?.length > 0).map(row => (
                          <div key={row._rowIndex} className="text-xs text-yellow-700">
                            <span className="font-semibold">Fila #{row._rowIndex + 1}:</span>
                            {row._compliance.map((c, ci) => (
                              <span key={ci} className="ml-1">{c.message}{ci < row._compliance.length - 1 ? ';' : ''}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Human validation notice */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 sm:px-5 py-3">
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-blue-800">Validación humana completada</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {validCount} fila(s) listas para importar. Puedes editar los valores directamente en la tabla y desmarcar filas que no desees incluir.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-gray-500">
            {phase === 'preview'
              ? `${validCount} registro(s) listos para importar de ${rows.length} detectados.`
              : 'Los campos se mapearán automáticamente al contrato de la experiencia.'}
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button type="button" onClick={handleClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors w-full sm:w-auto">
              {phase === 'preview' ? 'Cancelar' : 'Cerrar'}
            </button>
            {phase === 'preview' && (
              <button type="button" onClick={handleImport} disabled={!canImport}
                className={[
                  'flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-lg w-full sm:w-auto',
                  canImport ? 'bg-primary hover:bg-primary-light text-white shadow-primary/20' : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none',
                ].join(' ')}>
                <CheckCircle2 className="w-4 h-4" />
                Importar ({validCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}