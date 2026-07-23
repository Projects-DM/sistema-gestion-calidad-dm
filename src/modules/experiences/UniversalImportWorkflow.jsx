import { useState, useRef, useMemo } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Eye, Pencil, ExternalLink, ShieldAlert } from 'lucide-react';
import { parseDocument } from '../../services/import/index.js';
import { normalizeOperationalData } from '../../services/import/operationalDataExtractionLayer.js';
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
      const result = normalizeOperationalData({ parsedDocument: parsedDoc, contract });
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
              <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                    <Upload className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Arrastra tu Excel aquí o selecciona un archivo</p>
                    <p className="text-xs text-gray-500 mt-1">Se detectan encabezados de forma inteligente (sinónimos). Cada fila podrá revisarse antes de importar.</p>
                    {fileName && <p className="text-xs text-gray-700 mt-2">Archivo: <span className="font-semibold">{fileName}</span></p>}
                  </div>
                </div>
                <button type="button" onClick={handlePick} disabled={phase === 'parsing'}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-bold border border-gray-200 transition-all shadow-sm w-full md:w-auto disabled:opacity-50">
                  <FileSpreadsheet className="w-4 h-4 text-accent" />
                  {phase === 'parsing' ? 'Procesando...' : 'Seleccionar .xlsx'}
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

          {/* Preview phase */}
          {phase === 'preview' && (
            <>
              {/* Summary banner */}
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 sm:px-5 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800">Documento procesado correctamente</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-green-700">
                      <span><strong>{rows.length}</strong> filas detectadas</span>
                      <span><strong>{validCount}</strong> filas válidas</span>
                      {errorCount > 0 && <span className="text-amber-700"><strong>{errorCount}</strong> filas con observaciones</span>}
                      <span><strong>{canonicalFields.length}</strong> campos configurados</span>
                      <span><strong>{canonicalFields.length - missingHeaders.length}</strong> campos encontrados</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Header mapping */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-bold text-gray-900">Mapeo de encabezados</p>
                </div>
                <div className="p-4 sm:p-5 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Encontrados ({canonicalFields.length - missingHeaders.length})</p>
                      <div className="space-y-1">
                        {canonicalFields.filter(f => matchedHeaders[f]).map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            <span className="font-medium text-gray-800">{getFieldLabel(contract, f)}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-600 font-mono">{matchedHeaders[f]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Faltantes ({missingHeaders.length})</p>
                      <div className="space-y-1">
                        {missingHeaders.map(f => (
                          <div key={f} className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="font-medium text-gray-800">{getFieldLabel(contract, f)}</span>
                            <span className="text-gray-400">(se importará vacío)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">No reconocidos ({unknownHeaders.length})</p>
                      <div className="space-y-1">
                        {unknownHeaders.map(h => (
                          <div key={h} className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-mono text-gray-600">{h}</span>
                            <span className="text-gray-400">(se ignora)</span>
                          </div>
                        ))}
                        {!unknownHeaders.length && (
                          <p className="text-xs text-gray-500 italic">Todos los encabezados fueron reconocidos.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row preview with human validation */}
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