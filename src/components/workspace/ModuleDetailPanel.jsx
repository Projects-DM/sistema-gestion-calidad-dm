import { useMemo } from 'react';
import { ArrowLeft, Edit2, Trash2, Layers, ClipboardList, FileText, ListChecks, History, BarChart3, Settings, Users, Package, Shield, Truck, Wrench, Heart, GraduationCap, Building2 } from 'lucide-react';
import { CapabilityPackageRegistry } from '../../core/capabilities/CapabilityPackageRegistry.js';

const STATE_LABELS = {
  draft: 'Borrador',
  configurable: 'Configurable',
  operational: 'Operacional',
  deprecated: 'Deprecado',
  archived: 'Archivado',
};

const STATE_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  configurable: 'bg-blue-100 text-blue-700',
  operational: 'bg-green-100 text-green-700',
  deprecated: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
};

const ICON_MAP = { Layers, ClipboardList, FileText, ListChecks, History, BarChart3, Settings, Users, Package, Shield, Truck, Wrench, Heart, GraduationCap, Building2 };

function resolveIcon(name) {
  return ICON_MAP[name] || ListChecks;
}

const CAP_COLORS = {
  forms: { bg: 'bg-blue-50', text: 'text-blue-700' },
  records: { bg: 'bg-green-50', text: 'text-green-700' },
  repository: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

function getModuleField(module, keys) {
  for (const k of keys) {
    if (module && module[k] !== undefined && module[k] !== null) return module[k];
  }
  return undefined;
}

export default function ModuleDetailPanel({ module, onBack, formsCount, onEdit, onDelete }) {
  const name = useMemo(() => getModuleField(module, ['name', 'title']), [module]);
  const slug = useMemo(() => getModuleField(module, ['slug']), [module]);
  const description = useMemo(() => getModuleField(module, ['description']), [module]);
  const icon = useMemo(() => getModuleField(module, ['icon']) || 'Layers', [module]);
  const color = useMemo(() => getModuleField(module, ['color']) || '#3B82F6', [module]);
  const state = useMemo(() => getModuleField(module, ['state']) || 'draft', [module]);
  const createdAt = useMemo(() => getModuleField(module, ['created_at']), [module]);
  const visible = useMemo(() => getModuleField(module, ['visible']), [module]);
  const category = useMemo(() => getModuleField(module, ['category']), [module]);
  const grupo = useMemo(() => getModuleField(module, ['grupo']), [module]);

  const capabilities = useMemo(() => {
    const rawCaps = getModuleField(module, ['capabilities']);
    if (!Array.isArray(rawCaps) || rawCaps.length === 0) return [];
    return rawCaps.map((cap) => {
      const pkgKey = String(cap.packageId || '').replace('pkg:standard:', '');
      const descriptor = CapabilityPackageRegistry.getPackage(pkgKey);
      return {
        packageKey: pkgKey,
        displayName: descriptor?.displayName || pkgKey,
        icon: descriptor?.icon || 'ListChecks',
        state: cap.state || 'active',
      };
    });
  }, [module]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          title="Volver a módulos"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">Detalle del módulo</h3>
          <p className="text-sm text-gray-500">Información completa y configuración del módulo.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: color + '20' }}>
              {(() => { const DetailIcon = resolveIcon(icon); return <DetailIcon className="w-5 h-5" />; })()}
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{name || '—'}</div>
              <div className="text-sm text-gray-500">{slug || '—'}</div>
            </div>
          </div>

          {description && (
            <p className="text-sm text-gray-600 mb-4">{description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${STATE_COLORS[state] || STATE_COLORS.draft}`}>
                {STATE_LABELS[state] || state}
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Formularios</div>
              <div className="text-lg font-bold text-gray-900">{formsCount ?? 0}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visible</div>
              <div className="text-sm font-medium text-gray-900 mt-1">{visible === false ? 'No' : 'Sí'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha creación</div>
              <div className="text-sm font-medium text-gray-900 mt-1">{createdAt ? String(createdAt).slice(0, 10) : '—'}</div>
            </div>
          </div>

          {(category || grupo) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {category && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{category}</span>}
              {grupo && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{grupo}</span>}
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Capacidades activas</div>
              <div className="flex flex-wrap gap-2">
                {capabilities.length > 0 ? capabilities.map((cap) => {
                  const CapIcon = resolveIcon(cap.icon);
                  const colors = CAP_COLORS[cap.packageKey] || CAP_COLORS.forms;
                  return (
                    <span key={cap.packageKey} className={`flex items-center gap-1.5 px-3 py-1.5 ${colors.bg} ${colors.text} rounded-lg text-xs font-medium`}>
                      <CapIcon className="w-3.5 h-3.5" />
                      {cap.displayName}
                    </span>
                  );
                }) : (
                  <span className="text-xs text-gray-400">Sin capacidades asignadas</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold hover:bg-primary/15 transition-colors"
                onClick={() => { if (typeof onEdit === 'function') onEdit(); }}
              >
                <Edit2 className="w-4 h-4" />
                Editar módulo
              </button>
              <button
                type="button"
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors"
                onClick={() => { if (typeof onDelete === 'function') onDelete(); }}
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
