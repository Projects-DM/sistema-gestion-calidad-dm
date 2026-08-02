import { Bell, ShieldAlert, Save, Loader2, RotateCcw } from 'lucide-react';
import {
  PERIODICITY_UNITS,
  EXPIRATION_POLICIES,
  RISK_MODELS,
  REPEAT_POLICIES,
  NOTIFICATION_CHANNELS,
} from '../../core/capabilities/alert/operational-configuration/AlertConfigurationMetadata.js';
import { ALERT_PRIORITY_LEVELS } from '../../core/capabilities/alert/operational-configuration/AlertPriorityPolicy.js';

/**
 * AlertConfigurationForm
 *
 * Sprint 201 — Editable form of the 9 Alert Configuration parameters.
 *
 * PURE PRESENTATION. The form:
 *   - only renders the editable draft (formState),
 *   - reports field-level errors (errors),
 *   - calls `onChange(field, value)` for every edit,
 *   - calls `onSubmit()` and `onReset()`.
 *
 * It NEVER imports the Runtime, the Engine or the Consumption Layer. It
 * edits METADATA ONLY. The Application Service orchestrates validation and
 * persistence. There is no computed data here: no severity, no risk level,
 * no due dates, no status.
 */

const selectClass =
  'w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-white';
const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm';
const toggleClass =
  'relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none';
const labelClass = 'block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide';

function FieldError({ errors }) {
  if (!errors || errors.length === 0) return null;
  return (
    <p className="mt-1 text-[11px] text-red-600 font-medium">
      {errors.join(' · ')}
    </p>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`${toggleClass} ${checked ? 'bg-primary' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, type = 'text', step }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        step={step}
        value={value}
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
          <option key={opt} value={opt}>
            {labels?.[opt] || opt}
          </option>
        ))}
      </select>
    </div>
  );
}

const PERIODICITY_LABELS = Object.freeze({
  hours: 'Horas',
  days: 'Días',
  weeks: 'Semanas',
  months: 'Meses',
  years: 'Años',
  once: 'Una sola vez',
});

const EXPIRATION_LABELS = Object.freeze({
  none: 'Sin vencimiento',
  recurring: 'Recurrente',
  fixed: 'Fecha fija',
});

const RISK_LABELS = Object.freeze({
  relative: 'Relativo (modelo de la plataforma)',
  absolute: 'Absoluto',
  percentage: 'Porcentaje',
});

const REPEAT_LABELS = Object.freeze({
  repeat: 'Repetir',
  once: 'Una vez',
});

const PRIORITY_LABELS = Object.freeze({
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
});

const NOTIFICATION_LABELS = Object.freeze({
  email: 'Email',
  'in-app': 'In-app',
  none: 'Sin canal',
});

export default function AlertConfigurationForm({
  formState,
  errors = {},
  onChange,
  onSubmit,
  onReset,
  saving = false,
  canReset = false,
}) {
  const set = (field) => (value) => onChange(field, value);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">Configuración de alertas (metadata)</p>
          <p className="text-xs text-amber-800 mt-1">
            Esta pantalla edita únicamente la metadata{' '}
            <code className="font-mono">alertConfiguration</code> del recurso. No calcula
            severidades, riesgos, vencimientos ni estados: el motor evalúa la metadata cuando
            corresponde.
          </p>
        </div>
      </div>

      {/* 1. Enabled + Priority */}
      <Section title="Activación y prioridad" icon={<Bell className="w-4 h-4" />}>
        <Switch
          checked={formState?.enabled === true}
          onChange={set('enabled')}
          label="Alertas habilitadas para este recurso"
        />
        <FieldError errors={errors.enabled} />

        <SelectField
          label="Prioridad"
          value={formState?.priority || 'medium'}
          onChange={set('priority')}
          options={ALERT_PRIORITY_LEVELS}
          labels={PRIORITY_LABELS}
        />
        <FieldError errors={errors.priority} />
      </Section>

      {/* 2. Periodicity */}
      <Section title="Periodicidad" icon={<Bell className="w-4 h-4" />}>
        <SelectField
          label="Modo de periodicidad"
          value={formState?.periodicityMode || 'none'}
          onChange={set('periodicityMode')}
          options={['none', 'once', 'recurring']}
          labels={{
            none: 'Sin repetición',
            once: 'Evento único',
            recurring: 'Recurrente',
          }}
        />
        <FieldError errors={errors.periodicityMode} />

        {formState?.periodicityMode === 'recurring' && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in">
            <TextField
              label="Cada (cantidad)"
              type="number"
              min="1"
              step="1"
              value={formState.periodicityAmount}
              onChange={set('periodicityAmount')}
            />
            <SelectField
              label="Unidad"
              value={formState.periodicityUnit}
              onChange={set('periodicityUnit')}
              options={PERIODICITY_UNITS.filter((u) => u !== 'once')}
              labels={PERIODICITY_LABELS}
            />
          </div>
        )}
        <FieldError errors={errors.periodicityAmount} />
        <FieldError errors={errors.periodicityUnit} />
      </Section>

      {/* 3. Expiration */}
      <Section title="Vencimiento" icon={<Bell className="w-4 h-4" />}>
        <SelectField
          label="Política de vencimiento"
          value={formState?.expiration || 'none'}
          onChange={set('expiration')}
          options={EXPIRATION_POLICIES}
          labels={EXPIRATION_LABELS}
        />
        <FieldError errors={errors.expiration} />
      </Section>

      {/* 4. Risk */}
      <Section title="Riesgo" icon={<ShieldAlert className="w-4 h-4" />}>
        <SelectField
          label="Modelo de riesgo"
          value={formState?.riskModel || 'relative'}
          onChange={set('riskModel')}
          options={RISK_MODELS}
          labels={RISK_LABELS}
        />
        <FieldError errors={errors.riskModel} />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Umbral yellow"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={formState?.riskYellow ?? 0.5}
            onChange={set('riskYellow')}
          />
          <TextField
            label="Umbral red"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={formState?.riskRed ?? 0.25}
            onChange={set('riskRed')}
          />
        </div>
        <FieldError errors={errors.riskYellow} />
        <FieldError errors={errors.riskRed} />
      </Section>

      {/* 5. Notification */}
      <Section title="Notificación" icon={<Bell className="w-4 h-4" />}>
        <Switch
          checked={formState?.notificationEnabled === true}
          onChange={set('notificationEnabled')}
          label="Notificar"
        />
        {formState?.notificationEnabled && (
          <div className="space-y-4 animate-in fade-in">
            <SelectField
              label="Canal"
              value={formState?.notificationChannel || 'email'}
              onChange={set('notificationChannel')}
              options={NOTIFICATION_CHANNELS}
              labels={NOTIFICATION_LABELS}
            />
            <TextField
              label="Destinatarios (separados por coma)"
              value={formState?.notificationRecipients || ''}
              onChange={set('notificationRecipients')}
              placeholder="calidad@empresa.com, operaciones@empresa.com"
            />
            <FieldError errors={errors.notificationChannel} />
            <FieldError errors={errors.notificationRecipients} />
          </div>
        )}
      </Section>

      {/* 6. Grace Period */}
      <Section title="Período de gracia" icon={<Bell className="w-4 h-4" />}>
        <Switch
          checked={formState?.gracePeriodEnabled === true}
          onChange={set('gracePeriodEnabled')}
          label="Activar período de gracia"
        />
        {formState?.gracePeriodEnabled && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in">
            <TextField
              label="Cantidad"
              type="number"
              min="1"
              step="1"
              value={formState?.gracePeriodAmount ?? 1}
              onChange={set('gracePeriodAmount')}
            />
            <SelectField
              label="Unidad"
              value={formState?.gracePeriodUnit || 'days'}
              onChange={set('gracePeriodUnit')}
              options={PERIODICITY_UNITS.filter((u) => u !== 'once')}
              labels={PERIODICITY_LABELS}
            />
          </div>
        )}
        <FieldError errors={errors.gracePeriodAmount} />
        <FieldError errors={errors.gracePeriodUnit} />
      </Section>

      {/* 7. Automatic Close + Repeat Policy */}
      <Section title="Cierre y re-emisión" icon={<Bell className="w-4 h-4" />}>
        <Switch
          checked={formState?.automaticClose === true}
          onChange={set('automaticClose')}
          label="Cierre automático al cumplirse el recurso"
        />
        <FieldError errors={errors.automaticClose} />

        <SelectField
          label="Política de repetición"
          value={formState?.repeatPolicy || 'repeat'}
          onChange={set('repeatPolicy')}
          options={REPEAT_POLICIES}
          labels={REPEAT_LABELS}
        />
        <FieldError errors={errors.repeatPolicy} />
        <FieldError errors={errors.policy} />
      </Section>

      {errors.form && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-bold text-red-700">No se puede guardar</p>
          <p className="text-xs text-red-600 mt-1">{errors.form.join(' · ')}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-gray-100">
        {canReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="px-4 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Restablecer
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-white font-bold hover:bg-primary-light rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}
