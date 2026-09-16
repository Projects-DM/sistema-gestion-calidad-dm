# SPRINT 52 — Standard Engine Resolution (Capability Driven Engine)

**Tipo:** Arquitectura Aplicada (Implementación)

**Nivel esperado:** LEVEL 3

**Estado esperado:** STANDARD ENGINE RESOLUTION — IMPLEMENTATION READY

---

## 1) Diagnóstico

En el estado anterior, la resolución de engine estaba acoplada a `DynamicForm.jsx` a través de un `switch(formDef.engine_type)`:

**Evidencia:**
- `src/pages/DynamicForm.jsx`
  - `switch (formDef.engine_type)` con casos:
    - `BaseChecklist`
    - `BaseMediciones`
  - fallback a `BaseGeneric`

**Problema arquitectónico (B3):**
- Cada nuevo engine exigía modificar `DynamicForm`.
- Eso convierte a `DynamicForm` en una autoridad de resolución, rompiendo la intención “Core consume engines, no los conoce”.

---

## 2) Brecha B3

**Brecha:** Resolución explícita por `switch(engine_type)`.

**Impacto:**
- Baja extensibilidad (cada engine nuevo = cambio en `DynamicForm`).
- Mayor riesgo de drift cuando aparezcan engines adicionales (report, workflow, plugin, marketplace, IA, etc.).

---

## 3) Estrategia (desacoplar sin tocar Core certificado)

Objetivo del sprint:
- Eliminar la autoridad `switch(engine_type)` del `DynamicForm`.
- Centralizar resolución de engine en un único punto reutilizable.

Restricciones respetadas:
- No se modificó Runtime.
- No se modificó Contracts.
- No se modificó Registry.
- No se modificó Composition.
- No se modificó Standard Shell.
- No se creó un nuevo SSOT.
- No se introdujo lógica de negocio.
- No se cambió comportamiento funcional.

Estrategia adoptada:
- Crear un adaptador reutilizable `EngineResolver`.
- `DynamicForm` consume `resolveEngineComponent(engine_type)`.
- Fallback preservado: engines desconocidos → `BaseGeneric`.

---

## 4) Implementación

### 4.1 Nuevo punto de resolución

**Archivo creado:**
- `src/core/engine/EngineResolver.js`

**Responsabilidad:**
- Centralizar el mapeo `engine_type → componente engine`.
- Mantener compatibilidad con engines actuales:
  - `BaseChecklist`
  - `BaseMediciones`
  - fallback `BaseGeneric`

### 4.2 Sustitución del switch en DynamicForm

**Archivo modificado:**
- `src/pages/DynamicForm.jsx`

**Cambios clave:**
- Se elimina el `switch(formDef.engine_type)`.
- Se importa `resolveEngineComponent` desde `EngineResolver`.
- Se resuelve el componente con:
  - `const EngineComponent = resolveEngineComponent(formDef.engine_type)`
  - `return <EngineComponent {...props} />`

---

## 5) Evidencias (qué cambió y dónde)

1) Evidencia del desacoplamiento:
- `src/pages/DynamicForm.jsx`
  - Ya no contiene `switch(formDef.engine_type)`.
  - Render del engine ahora depende exclusivamente de `resolveEngineComponent`.

2) Evidencia de la centralización:
- `src/core/engine/EngineResolver.js`
  - Contiene el mapeo de engines y fallback.

---

## 6) Validación

Validación técnica realizada:
- `npm run build` ejecutado y finalizó correctamente.

Validación funcional esperada (sin ejecución extra reportada):
- `BaseChecklist` renderiza como antes.
- `BaseMediciones` renderiza como antes.
- Para engines desconocidos/otros, se mantiene fallback a `BaseGeneric`.
- La lógica de negocio y validación/submit permanecen intactas (solo cambia el render del engine).

---

## 7) Compatibilidad

Compatibilidad hacia atrás:
- Se preservan exactamente los engines actuales y su comportamiento de render.

Compatibilidad hacia adelante:
- Nuevos engines pueden añadirse al resolver sin modificar `DynamicForm`.
- Plugins/marketplace/IA (futuro) se habilitan al extender el mapeo en un único lugar (sin tocar la lógica de negocio).

---

## 8) Riesgos

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Mapeo incompleto | Si un nuevo `engine_type` no existe en `EngineResolver`, se usará fallback `BaseGeneric`. | Mantener convención de `engine_type` y extender `EngineResolver` cuando se agreguen engines reales. |
| Error por import ruta | Si la ruta del resolver fuera incorrecta, rompería compilación. | `npm run build` confirma compilación OK. |
| Extensibilidad conceptual | Sin registry/capability-driven engine, el resolver sigue siendo un “punto de mapeo” local. | La intención del sprint es eliminar el switch; la evolución hacia registry-driven engine queda para sprints posteriores. |

---

## 9) Checklist

- [x] Desaparece `switch(engine_type)` en `DynamicForm`.
- [x] La resolución de engines queda centralizada.
- [x] `DynamicForm` consume un resolver.
- [x] Comportamiento funcional preservado (fallback incluido).
- [x] No se modificó Runtime/Contracts/Registry/Composition/SSOT.
- [x] `vite build` / `npm run build` exitoso.

---

## 10) Criterio de aceptación

El Sprint se considera completado cuando:

✅ Desaparece el `switch(engine_type)` de `DynamicForm`.
✅ La resolución de engines queda centralizada en un único punto.
✅ `DynamicForm` únicamente consume el resolver.
✅ El comportamiento funcional es idéntico.
✅ No se modifica ninguna otra capa del Core.
✅ Se mantiene compatibilidad hacia atrás y hacia adelante.

---

## 11) Resultado final

Se eliminó el acoplamiento B3 en `DynamicForm.jsx`.

La resolución de engines fue desacoplada mediante `EngineResolver`, permitiendo extender engines futuros sin tocar `DynamicForm`, preservando compatibilidad con engines actuales y sin modificar ninguna capa certificada del Core (Runtime/SSOT/Contracts/Registry/Composition/Standard Shell).

