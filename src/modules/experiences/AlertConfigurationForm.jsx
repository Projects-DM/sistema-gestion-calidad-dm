import { useState } from 'react';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import {
  PERIODICITY_UNITS,
  NOTIFICATION_CHANNELS,
} from '../../core/capabilities/alert/operational-configuration/AlertConfigurationMetadata.js';

/**
 * AlertConfigurationForm — Sprint 222 UX refactoring · Sprint 223 stabilization.
 *
 * PURE PRESENTATION. Guided "intent-based" form organized in SEVEN functional
 * steps (Información · Inicio · Programación · Repetición · Prioridad ·
 * Notificación · Finalización).
 *
 * Sprint 223 corrections (interaction only, no model changes):
 *   - New mandatory-ish START reference: `startDate` + `startTime` (Block 2).
 *   - "Personalizado" is now selected via LOCAL UI state (decoupled from the
 *     derived periodicity fields), so it no longer snaps back to a preset.
 *   - Repeat "No" now fully clears the interval controls (local choice state),
 *     so there are no inconsistent states.
 *   - Conditional rendering only reveals dependent controls when enough info
 *     is present.
 *
 * Blocks expose the internal Alert Engine parameters are NOT shown
 * (riskModel / riskYellow / riskRed remain in metadata only).
 *
 * `name`, `description`, `startDate`, `startTime` are presentational identifiers
 * ignored by the certified Mapper/Validation (extra keys never break the
 * canonical 9-field contract).
 *
 * The form only renders the editable draft, reports errors, calls
 * `onChange(field, value)` per edit and `onSubmit()`/`onReset()`. It never
 * imports Runtime/Engine and never computes severity, risk, due dates or status.
 */

const selectClass =
  'w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white';
const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white';
const toggleClass = 'relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none';
const labelClass = 'block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide';

const UNIT_LABELS = Object.freeze({
  hours: 'Horas', days: 'Días', weeks: 'Semanas', months: 'Meses', years: 'Años', once: 'Una vez',
});
const CHANNEL_LABELS = Object.freeze({
  email: 'Email', 'in-app': 'Sistema (in-app)', none: 'Sin canal',
});
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const PRIORITY_LABELS = Object.freeze({ low: 'Baja', medium: 'Media', high: 'Alta' });

const SCHEME_OPTIONS = [
  { key: 'vencimiento', label: 'Al vencimiento', desc: 'Cuando el recurso esté por vencer' },
  { key: 'fecha-especifica', label: 'Fecha específica', desc: 'En una fecha determinada' },
  { key: 'diario', label: 'Todos los días', desc: 'Repetir cada día desde el inicio' },
  { key: 'semanal', label: 'Cada semana', desc: 'Repetir semanalmente desde el inicio' },
  { key: 'mensual', label: 'Cada mes', desc: 'Repetir mensualmente desde el inicio' },
  { key: 'personalizado', label: 'Personalizado', desc: 'Definir cantidad y unidad' },
];

function FieldError({ errors }) {
  if (!errors || errors.length === 0) return null;
  return <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.join(' · ')}</p>;
}

function Section({ title, step, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0">
          {step}
        </span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label, desc }) {
  return (
    <div>
      <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
        <span>
          <span className="block text-sm text-gray-800 font-medium">{label}</span>
          {desc && <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`${toggleClass} ${checked ? 'bg-primary' : 'bg-gray-300'}`}
        >
          <span className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </label>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, labels }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {options.map((opt) => (
          <option key={opt} value={opt}>{labels?.[opt] || opt}</option>
        ))}
      </select>
    </div>
  );
}

function OptionPick({ label, value, options, onSelect }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-1.5">
        {options.map((o) => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onSelect(o.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-sm text-left transition-colors ${
                selected ? 'border-primary bg-primary/5 text-gray-900' : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span aria-hidden="true" className={`w-4 h-4 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${selected ? 'border-primary' : 'border-gray-300'}`}>
                {selected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </span>
              <span>
                <span className="block font-medium">{o.label}</span>
                {o.desc && <span className="block text-xs text-gray-400">{o.desc}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YesNo({ label, value, onSelect }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'no', label: 'No' },
          { key: 'si', label: 'Sí' },
        ].map((o) => {
          const selected = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onSelect(o.key)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                selected ? 'border-primary bg-primary/5 text-gray-900' : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <span aria-hidden="true" className={`w-3 h-3 rounded-full border-2 ${selected ? 'border-primary' : 'border-gray-300'}`} />
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AlertConfigurationForm({ formState, errors = {}, onChange, onSubmit, onReset, saving = false, canReset = false }) {
  const set = (field) => (value) => onChange(field, value);

  // Sprint 223 — Local UI state (decoupled from the derived periodicity fields)
  // so "Personalizado" and "Repetir = No" behave as true controlled selections.
  const [schemeKey, setSchemeKey] = useState(() => deriveScheme(formState));
  const [repeatChoice, setRepeatChoice] = useState(() =>
    formState?.repeatPolicy === 'repeat' || formState?.periodicityMode === 'recurring' ? 'si' : 'no',
  );

  const amount = formState?.periodicityAmount ?? 1;
  const unit = formState?.periodicityUnit || 'days';

  const applyScheme = (key) => {
    setSchemeKey(key);
    if (key === 'vencimiento') {
      set('periodicityMode')('none'); set('expiration')('recurring'); set('repeatPolicy')('once'); setRepeatChoice('no');
    } else if (key === 'fecha-especifica') {
      set('periodicityMode')('none'); set('expiration')('fixed'); set('repeatPolicy')('once'); setRepeatChoice('no');
    } else if (key === 'personalizado') {
      set('periodicityMode')('recurring'); set('expiration')('none'); set('repeatPolicy')('repeat'); setRepeatChoice('si');
    } else {
      const presets = { diario: 'days', semanal: 'weeks', mensual: 'months' };
      set('periodicityMode')('recurring');
      set('periodicityAmount')(1);
      set('periodicityUnit')(presets[key] || 'days');
      set('expiration')('none');
      set('repeatPolicy')('repeat');
      setRepeatChoice('si');
    }
  };

  const handleRepeat = (k) => {
    setRepeatChoice(k);
    if (k === 'no') {
      set('repeatPolicy')('once');
      set('periodicityMode')('none');
    } else {
      set('repeatPolicy')('repeat');
      if (formState?.periodicityMode !== 'recurring') {
        set('periodicityMode')('recurring'); set('periodicityAmount')(1); set('periodicityUnit')('days');
      }
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-5">
      {/* Step 0 — Información */}
      <Section title="Información" step={1}>
        <div className="space-y-4">
          <TextField label="Nombre de la alerta" value={formState?.name} onChange={set('name')} placeholder="Ej. Recordatorio semanal" />
          <FieldError errors={errors.name} />
          <TextField label="Descripción" value={formState?.description} onChange={set('description')} placeholder="Qué vigila esta alerta" />
          <FieldError errors={errors.description} />
        </div>
      </Section>

      {/* Step 1 — Inicio de programación (Sprint 223) */}
      <Section title="Inicio de programación" step={2}>
        <p className="text-xs text-gray-500">Punto de referencia desde el que inicia la evaluación.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Fecha inicial</label>
            <input type="date" value={formState?.startDate ?? ''} onChange={(e) => set('startDate')(e.target.value)} className={inputClass} />
            <FieldError errors={errors.startDate} />
          </div>
          <div>
            <label className={labelClass}>Hora inicial</label>
            <input type="time" value={formState?.startTime ?? ''} onChange={(e) => set('startTime')(e.target.value)} className={inputClass} />
            <FieldError errors={errors.startTime} />
          </div>
        </div>
      </Section>

      {/* Step 2 — Programación / Frecuencia */}
      <Section title="¿Cómo desea ejecutar la alerta?" step={3}>
        <OptionPick label="Frecuencia" value={schemeKey} options={SCHEME_OPTIONS} onSelect={applyScheme} />
        {schemeKey === 'personalizado' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in pt-1">
            <TextField label="Cada (cantidad)" type="number" value={amount} onChange={set('periodicityAmount')} />
            <SelectField label="Unidad" value={unit} onChange={set('periodicityUnit')} options={PERIODICITY_UNITS.filter((u) => u !== 'once')} labels={UNIT_LABELS} />
          </div>
        )}
      </Section>

      {/* Step 3 — Repetición */}
      <Section title="Repetición" step={4}>
        <YesNo label="¿Desea repetir la alerta?" value={repeatChoice} onSelect={handleRepeat} />
        {repeatChoice === 'si' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in border-t border-gray-100 pt-3">
            <TextField label="Cada (cantidad)" type="number" value={amount} onChange={set('periodicityAmount')} />
            <SelectField label="Unidad" value={unit} onChange={set('periodicityUnit')} options={PERIODICITY_UNITS.filter((u) => u !== 'once')} labels={UNIT_LABELS} />
          </div>
        )}
      </Section>

      {/* Step 4 — Prioridad */}
      <Section title="Prioridad" step={5}>
        <SelectField label="Prioridad" value={formState?.priority || 'medium'} onChange={set('priority')} options={PRIORITY_OPTIONS} labels={PRIORITY_LABELS} />
        <FieldError errors={errors.priority} />
      </Section>

      {/* Step 5 — Notificación */}
      <Section title="Notificación" step={6}>
        <Switch checked={formState?.notificationEnabled === true} onChange={set('notificationEnabled')} label="Notificar" desc="Recibir un aviso cuando la alerta se dispare" />
        {formState?.notificationEnabled && (
          <div className="space-y-4 animate-in fade-in border-t border-gray-100 pt-3">
            <SelectField label="Canal" value={formState?.notificationChannel || 'email'} onChange={set('notificationChannel')} options={NOTIFICATION_CHANNELS} labels={CHANNEL_LABELS} />
            <FieldError errors={errors.notificationChannel} />
            <TextField label="Destinatarios (separados por coma)" value={formState?.notificationRecipients || ''} onChange={set('notificationRecipients')} placeholder="calidad@empresa.com" />
            <FieldError errors={errors.notificationRecipients} />
          </div>
        )}
      </Section>

      {/* Step 6 — Finalización */}
      <Section title="Finalización" step={7}>
        <div className="space-y-4">
          <Switch checked={formState?.automaticClose !== false} onChange={set('automaticClose')} label="Cerrar automáticamente al cumplirse" />
          <Switch checked={formState?.enabled === true} onChange={set('enabled')} label="Alerta activa" />
        </div>
      </Section>

      {errors.form && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-bold text-red-700">No se puede guardar</p>
          <p className="text-xs text-red-600 mt-1">{errors.form.join(' · ')}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-gray-100">
        {canReset && (
          <button type="button" onClick={onReset} disabled={saving} className="px-4 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Restablecer
          </button>
        )}
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}

function deriveScheme(f) {
  if (f?.periodicityMode === 'recurring') {
    const a = Number(f.periodicityAmount) || 1;
    const u = f.periodicityUnit;
    if (a === 1) {
      if (u === 'days') return 'diario';
      if (u === 'weeks') return 'semanal';
      if (u === 'months') return 'mensual';
    }
    return 'personalizado';
  }
  if (f?.expiration === 'recurring') return 'vencimiento';
  if (f?.expiration === 'fixed') return 'fecha-especifica';
  return 'none';
}