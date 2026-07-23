import { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, TrendingUp, Shield, Users, Database, Calendar, Download, Upload, CheckCircle, AlertTriangle, Clock, Layers, Activity } from 'lucide-react';
import { OperationalAuditService } from '../../services/operationalAuditService.js';
import { OperationalExperienceRegistry } from '../../core/capabilities/experiences/OperationalExperienceRegistry.js';
import { createOperationalRecordsService } from '../../services/operationalRecordsService.js';
import { isSupabaseConfigured } from '../../lib/supabase';
import { format } from 'date-fns';

function getFieldLabel(contract, field) {
  return contract.ui?.fieldDisplay?.[field]?.label
    || contract.documentContract.synonyms?.[field]?.[0]
    || field;
}

function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

function isToday(dateStr) {
  return String(dateStr ?? '').startsWith(today());
}

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const prefix = today().slice(0, 7);
  return String(dateStr).startsWith(prefix);
}

function countBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const k = keyFn(item);
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export default function UniversalOperationalDashboard({ open, onClose, experienceKey }) {
  const [tab, setTab] = useState('operational');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const contract = OperationalExperienceRegistry.getExperienceContract(experienceKey);
  const dr = contract?.dashboardRules || {};
  const persistenceConfig = contract?.persistence || { tableName: experienceKey, prefix: experienceKey?.slice(0, 3).toUpperCase() };
  const service = useMemo(() => {
    if (!contract) return null;
    return createOperationalRecordsService(persistenceConfig.tableName, {
      prefix: persistenceConfig.prefix,
      fieldMapping: contract.ui?.fieldMapping,
    });
  }, [contract, persistenceConfig.tableName, persistenceConfig.prefix]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [recs, audit] = await Promise.all([
          service ? service.fetch().catch(() => []) : Promise.resolve([]),
          OperationalAuditService.getExperienceTimeline(experienceKey, { limit: 5000 }),
        ]);
        if (!cancelled) {
          setRecords(recs);
          setAuditEvents(audit);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Error al cargar dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open, experienceKey]);

  if (!open) return null;

  const canonicalFields = contract?.documentContract?.canonicalFields || [];
  const dateField = canonicalFields.find(f => contract?.documentContract?.fieldNormalizers?.[f]?.name === 'toYmd') || 'fecha';

  const totalRecords = records.length;
  const todayRecords = records.filter(r => isToday(r[dateField])).length;
  const monthRecords = records.filter(r => isThisMonth(r[dateField])).length;

  const importEvents = auditEvents.filter(e => e.event_type === 'import');
  const exportEvents = auditEvents.filter(e => e.event_type === 'export');
  const deleteEvents = auditEvents.filter(e => e.event_type === 'delete');
  const complianceEvents = auditEvents.filter(e => e.event_type === 'compliance');
  const createEvents = auditEvents.filter(e => e.event_type === 'create');
  const updateEvents = auditEvents.filter(e => e.event_type === 'update');

  const userActivity = countBy(
    auditEvents.filter(e => e.user_name && e.user_name !== 'Sistema'),
    e => e.user_name
  );

  const complianceBySeverity = countBy(complianceEvents, e => {
    return e.event_data?.warnings?.[0]?.severity || 'warning';
  });

  const tabs = [
    { id: 'operational', label: 'Operacional', icon: BarChart3 },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'audit', label: 'Auditoría', icon: Users },
  ];
  if (dr.groupBy?.length) {
    tabs.push({ id: 'business', label: 'Negocio', icon: TrendingUp });
  }

  const statCard = (label, value, icon, color) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-primary/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-5xl bg-white sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 h-[100dvh] sm:h-auto sm:max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="bg-primary px-4 sm:px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Dashboard — {contract?.metadata?.name || experienceKey}</h2>
              <p className="text-primary-100 text-xs">Métricas operacionales, compliance, auditoría e inteligencia de negocio.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Cargando inteligencia operacional...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Tab navigation */}
              <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
                {tabs.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${
                        tab === t.id ? 'text-primary border-b-2 border-primary bg-primary/[0.03]' : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              {tab === 'operational' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {statCard('Total registros', totalRecords, <Database className="w-5 h-5 text-blue-600" />, 'bg-blue-100')}
                    {statCard('Hoy', todayRecords, <Calendar className="w-5 h-5 text-green-600" />, 'bg-green-100')}
                    {statCard('Este mes', monthRecords, <Clock className="w-5 h-5 text-purple-600" />, 'bg-purple-100')}
                    {statCard('Importaciones', importEvents.length, <Upload className="w-5 h-5 text-cyan-600" />, 'bg-cyan-100')}
                    {statCard('Exportaciones', exportEvents.length, <Download className="w-5 h-5 text-amber-600" />, 'bg-amber-100')}
                    {statCard('Eliminados', deleteEvents.length, <AlertTriangle className="w-5 h-5 text-red-600" />, 'bg-red-100')}
                  </div>

                  {records.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-600" />
                        <p className="text-sm font-bold text-gray-900">Actividad reciente</p>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div className="space-y-2">
                          {auditEvents.slice(0, 10).map((ev, i) => (
                            <div key={ev.id || i} className="flex items-center gap-3 text-xs text-gray-700">
                              <span className="text-gray-400 font-mono w-16 shrink-0">
                                {ev.created_at ? String(ev.created_at).slice(11, 19) : ''}
                              </span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 uppercase shrink-0">
                                {ev.event_type}
                              </span>
                              <span className="truncate">{ev.user_name || 'Sistema'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'compliance' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {statCard('Alertas totales', complianceEvents.length, <Shield className="w-5 h-5 text-accent" />, 'bg-yellow-100')}
                    {statCard('Alertas altas', complianceBySeverity.filter(([s]) => s === 'high').reduce((a, [, c]) => a + c, 0), <AlertTriangle className="w-5 h-5 text-red-600" />, 'bg-red-100')}
                    {statCard('Alertas info', complianceBySeverity.filter(([s]) => s === 'info' || s === 'warning').reduce((a, [, c]) => a + c, 0), <CheckCircle className="w-5 h-5 text-amber-600" />, 'bg-amber-100')}
                  </div>

                  {complianceEvents.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm font-bold text-gray-900">Historial de compliance</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-[10px] font-bold text-gray-500 uppercase bg-gray-50/50">
                              <th className="p-3">Fecha</th>
                              <th className="p-3">Usuario</th>
                              <th className="p-3">Mensaje</th>
                              <th className="p-3">Severidad</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {complianceEvents.slice(0, 20).map((ev, i) => {
                              const w = ev.event_data?.warnings?.[0] || {};
                              return (
                                <tr key={ev.id || i} className="hover:bg-gray-50">
                                  <td className="p-3 text-xs font-mono text-gray-500">{ev.created_at ? String(ev.created_at).slice(0, 16) : ''}</td>
                                  <td className="p-3 text-xs">{ev.user_name}</td>
                                  <td className="p-3 text-xs text-gray-800">{w.message || ev.event_type}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      w.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {w.severity || 'info'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'audit' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {statCard('Eventos totales', auditEvents.length, <Layers className="w-5 h-5 text-gray-600" />, 'bg-gray-100')}
                    {statCard('Creados', createEvents.length, <Database className="w-5 h-5 text-green-600" />, 'bg-green-100')}
                    {statCard('Modificados', updateEvents.length, <Activity className="w-5 h-5 text-blue-600" />, 'bg-blue-100')}
                    {statCard('Importados', importEvents.reduce((a, e) => a + (e.event_data?.count || 1), 0), <Upload className="w-5 h-5 text-cyan-600" />, 'bg-cyan-100')}
                  </div>

                  {userActivity.length > 0 && (
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm font-bold text-gray-900">Usuarios más activos</p>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div className="space-y-2">
                          {userActivity.slice(0, 10).map(([user, count]) => (
                            <div key={user} className="flex items-center justify-between">
                              <span className="text-sm text-gray-800 font-medium">{user}</span>
                              <span className="text-sm text-gray-500 font-mono">{count} evento(s)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'business' && dr.groupBy?.length > 0 && (
                <div className="space-y-5">
                  {dr.groupBy.map(field => {
                    const groups = countBy(records, r => String(r[field] ?? '(vacío)').trim() || '(vacío)');
                    return (
                      <div key={field} className="rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                          <p className="text-sm font-bold text-gray-900">
                            Agrupado por: {getFieldLabel(contract, field)}
                          </p>
                        </div>
                        <div className="p-4 sm:p-5">
                          <div className="space-y-2">
                            {groups.slice(0, 15).map(([value, count]) => {
                              const max = groups[0]?.[1] || 1;
                              const pct = Math.round((count / max) * 100);
                              return (
                                <div key={value} className="flex items-center gap-3">
                                  <span className="text-sm text-gray-800 font-medium w-1/3 truncate" title={value}>{value}</span>
                                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary/20 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-sm text-gray-500 font-mono w-12 text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-500">
            {loading ? '' : `Última actualización: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`}
          </p>
          {!loading && (
            <button onClick={onClose}
              className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}