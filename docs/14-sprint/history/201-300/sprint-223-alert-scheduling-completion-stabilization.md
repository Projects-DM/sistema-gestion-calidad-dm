# Sprint 223 — Alert Scheduling Completion & Interaction Stabilization

> Nivel 5 · Configuración de alertas · Modelo de programación completo · Estabilización de interacción

## Resumen ejecutivo

Sprint **estrictamente de capa de presentación** sobre el formulario de configuración
de alertas de SGC-DM. Completa el modelo de programación añadiendo la referencia
**`startDate` + `startTime`** (fecha y hora iniciales desde la que se evalúa la frecuencia)
y estabiliza dos interacciones que antes producían estados inconsistentes:

1. La opción **«Personalizado»** vuelve a ser una selección controlada y persistente
   (antes «volvía sola» a un esquema predefinido).
2. La **Repetición «No»** limpia por completo los controles de intervalo (antes podían
   quedar sin limpiar al cambiar de esquema).

No se toca ninguna capa certificada: metadata, `AlertConfiguration`, motores de
evaluación/activación, runtime, contratos ni persistencia permanecen intactos.

---

## Objetivos

- Añadir la referencia de inicio de la programación (`startDate`, `startTime`) como
  bloque anterior a la frecuencia (Modelo de programación completo).
- Hacer que cada esquema de repetición esté basado en esa fecha inicial.
- Convertir la selección de esquema en **estado de UI local** (`schemeKey`) desacoplado
  de los campos de periodicidad derivados → «Personalizado» ya no hace snap-back.
- Asegurar que **«No» en Repetición** borre/condiciona el bloque de intervalos.
- Garantizar renderizado progresivo / condicional coherente.
- Preservar el SSOT: los 9 campos canónicos (`enabled, periodicity, expiration, risk,
  priority, notification, gracePeriod, automaticClose, repeatPolicy`) continúan igual.

## Alcance

| Ámbito | Archivo | Acción |
|--------|---------|--------|
| Presentación | `src/modules/experiences/AlertConfigurationForm.jsx` | Refactor de interacción |
| — | `src/modules/experiences/AlertConfigurationPanel.jsx` | Sin cambios en este sprint |
| Certificación | `C:\tmp\test\sprint-223-alert-scheduling-completion-certification.mjs` | AS1–AS14 |
| Documento | `docs/sprint-223-alert-scheduling-completion-stabilization.md` | Este |

### Fuera de alcance (prohibido)

- Nuevos motores/servicios/repositorios (`AlertEngineV2`, `SchedulerEngine`, etc.).
- Cambios en `AlertConfiguration`, `AlertConfigurationMetadata`, Mapper, Validation.
- Cambios en Runtime, contratos, persistencia ni capas certificadas.

## Cambios implementados

### 1. Bloque «Inicio de programación» (paso 2)
```jsx
<Section title="Inicio de programación" step={2}>
  <p className="text-xs text-gray-500">Punto de referencia desde el que inicia la evaluación.</p>
  {/* Fecha inicial */}
  <input type="date"  value={formState?.startDate ?? ''} onChange={set('startDate')} />
  {/* Hora inicial */}
  <input type="time"  value={formState?.startTime ?? ''} onChange={set('startTime')} />
</Section>
```
Se añaden como campos de presentación adicionales. **Son ignorados por
`AlertConfigurationMapper`/`AlertConfigurationValidation`** (las claves desconocidas no
forman parte del contrato canónico de 9 claves), por lo que la metadata persistida NO
cambia. Es un modelo seguro de presentación pura.

### 2. Esquema de repetición como estado de UI controlado
```jsx
const [schemeKey, setSchemeKey] = useState(() => deriveScheme(formState));
const applyScheme = (k) => { setSchemeKey(k); /* rellena los campos derivados */ };
...
<OptionPick label="Frecuencia" value={schemeKey} options={SCHEME_OPTIONS} onSelect={applyScheme} />
{schemeKey === 'personalizado' && ( <card /* cantidad + unidad */ /> )}
```
La selección queda guardada en `schemeKey` y los campos de periodicidad se derivan de
ese esquema. Al elegir de nuevo, ya NO se deselecciona.

### 3. Repetición Sí/No funcional
```jsx
const [repeatChoice, setRepeatChoice] = useState(...);
const handleRepeat = (k) => { setRepeatChoice(k); ... };
<YesNo label="¿Desea repetir la alerta?" value={repeatChoice} onSelect={handleRepeat} />
{repeatChoice === 'si' && ( <card periodicityAmount + periodicityUnit /> )}
```
Elegir **No** (&harr; `set('repeatPolicy')('once')` …) limpiar el bloque de intervalos.

### 4. Renderizado condicional (progresivo)
- `schemeKey === 'personalizado' &&` → campo de frecuencia personalizada.
- `repeatChoice === 'si' &&` → intervalo de repetición.
- `formState?.notificationEnabled &&` → opciones de notificación (canal).

---

## Certificación (AS1–AS14)

Señal o conducta verificada:
- **AS1/AS2** — `Fecha inicial` + `Hora inicial` presentes y enlazadas (`startDate`,`startTime`).
- **AS3** — el bloque «Inicio de programación» se renderiza ANTES del bloque de frecuencia.
- **AS4** — `schemeKey` es estado controlado; intervalos solo con `'personalizado'`.
- **AS5/AS6** — `repeatChoice` controlado; intervalos (Sí) y borrado (No); condiciones
  `schemeKey === 'personalizado' &&`, `repeatChoice === 'si' &&`, `notificationEnabled &&`.
- **AS7** — bindings controlados (`value=`, `checked=`, `onChange`/`onSelect`).
- **AS8** — reutiliza `SelectField`/`PERIODICITY_UNITS`; no nuevos schedulers.
- **AS9/AS10/AS11/AS14** — SSOT: 9 claves canónicas, Alert Engine, runtime y metadata
  intactos (verificación `git status` + lectura de contratos).
- **AS12** — `npm run build` PASS.
- **AS13** — regresión completa (202R2, 206R, 221, 222, 213–220).

Resultado: **14/14 PASS**.

---

## Diseño / decisiones

- `AlertConfigurationMapper` ignora claves desconocidas del formulario → añadir
  `name`/`description`/`startDate`/`startTime` no rompe el contrato de 9 claves.
- El estado de esquema se desacopló de los campos derivados para que «Personalidad»
  no vuelva a los presets al re-render.
- Repetición «No» condiciona el bloque de intervalos → imposible dejar valores
  inconsistentes visibles.

## Riesgos / pendientes
- Ninguno bloqueante. Se recomienda revisión humana del flujo de edición de alertas
  existente (migrar datos con la nueva fecha de inicio aún no definida).