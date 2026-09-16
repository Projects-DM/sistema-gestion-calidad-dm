# Sprint 224 — Input Binding Audit & Controlled State Validation

> Nivel 5 · Configuración de alertes · Auditoría de ligado de entrada · Validación de estado controlado

## Tipo
Auditoría de la capa de presentación · Validación de componentes controlados de React.

Sin correcciones. Unico fin: identificar con evidencia por qué `startDate`/`startTime`
(Sprint 223) no mantienen el valor. La corrección queda para el **Sprint 225**.

---

## 1. Resumen

Tras el Sprint 223 el modelo de programación quedó correcto, pero una anomalía quedó
localizada únicamente en los nuevos controles `Fecha inicial` (`startDate`) y
`Hora inicial` (`startTime`): se limpian al terminar de escribir. El resto del
formulario funciona; la arquitectura certificada sigue siendo válida.

## 2. Comportamiento observado

Escribir → último carácter → el input se vacía. Ocurre con `date` y con `time`.
No ocurre con el resto del formulario.

## 3. Alcance

Se audita: `AlertConfigurationForm.jsx` y `AlertConfigurationPanel.jsx` (reconstrucción
del estado). NO se toca: Alert Engine, Notification Engine, Evaluation Engine, Runtime,
Mapper, Validation, Metadata, Providers, Contratos, Persistencia.

## 4. Ciclo del input (AV1–AV7)

| # | Pregunta | Respuesta |
|---|---|---|
| AV1 | ¿el `onChange` recibe el valor correcto? | Recibe el **SyntheticEvent**, no `event.target.value` |
| AV2 | ¿el setter guarda ese valor? | Guarda el **objeto del evento**, no el string |
| AV3 | ¿el estado lo contiene justo después? | Sí, pero contiene el objeto del evento |
| AV4 | ¿en qué render desaparece? | En el primer render de vuelta controlado: `value` no es fecha/hora válida → se vacía |
| AV5 | ¿quién reconstruye el estado? | `AlertConfigurationPanel.onChange` (no borra la propiedad) |
| AV6 | ¿hay un `useEffect` que sobreescribe el formulario? | No (no existe `useEffect` en form ni panel) |
| AV7 | ¿hay limpieza automática de desconocidas? | No en el ciclo de edición (el mapper ignora/solo lectura) |

## 5. Causa raíz (con evidencia)

En `AlertConfigurationForm.jsx` se define el setter genérico (vía `useState` autonómico en
el formulario/panel) y los inputs inline:

```jsx
const set = (field) => (value) => onChange(field, value);

<input type="date" value={formState?.startDate ?? ''} onChange={set('startDate')} />
<input type="time" value={formState?.startTime ?? ''} onChange={set('startTime')} />
```

Para un `<input type="date">` / `type="time"`, React pasa el **objeto de evento** (no
`e.target.value`). Entonces `set('startDate')` recibe ese evento y el panel lo guarda:

`formState.startDate = Evento` → en el siguiente render `value={formState.startDate}`
deja de ser `YYYY-MM-DD` → el navegador vacía el campo.

> El resto del formulario funciona porque pasa por componentes envoltorio
> (`TextField`/`SelectField`/`Switch`/`OptionPick`) que sí aplican `e.target.value`.
> Los dos inputs `date`/`time` son la única excepción que envía el evento crudo.

Conclusión: es un problema del ** envoltura del valor / setter genérico** (pasa el
evento, NO `e.target.value`). No es del estado, ni de un `useEffect`, ni de un
normalizador, ni del mapper.

Corrección propuesta para Sprint 225 (NO se aplica aquí):

```jsx
onChange={(e) => set('startDate')(e.target.value)}
onChange={(e) => set('startTime')(e.target.value)}
```

## 6. Restricciones
Prohibido: nuevos estados, duplicar `formState`, alterar metadata, tocar motores,
cambiar contratos, nuevos mappers/validadores. Sprint 225 reutilizará lo existente.

## 7. Definition of Done (cumplido)
Flujo completo auditado · Ciclo React documentado · Setter auditado · Estado auditado ·
Hooks identificados · Render auditado · Normalización auditada · Mapper auditado
(solo lectura, `mapMetadataToFormState`/`mapFormStateToMetadata` intactas) ·
Causa raíz con evidencia (`event.target.value`) · Sin cambios funcionales · SSOT preservado.

## 8. Certificación IA1–IA12
Resultado: 12/12 PASS (flujo, date/time, setter, estado, hooks, render,
efectos, normalizadores, mapper, causa raíz, sin cambios, SSOT).

## 9. Resultado
- ¿Quién borra `startDate`/`startTime`? Nadie las borra del estado. El render las
  vacía porque `startDate` guarda un objeto de evento, no una fecha.
- ¿Setter, estado, render, normalizador o mapper? El problema está en el **setter que
  recibe el valor** (pasa el evento crudo en lugar de `e.target.value`). NO es estado,
  NI normalizador, NI mapper.

**READY FOR CORRECTION → Sprint 225**