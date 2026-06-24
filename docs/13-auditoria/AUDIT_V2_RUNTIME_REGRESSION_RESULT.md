# AUDIT_V2_RUNTIME_REGRESSION_RESULT

## 1) ¿En qué capa se rompe el flujo?
**Se rompe por la decisión de entrada en `src/pages/DynamicForm.jsx`**: el flujo fuerza a renderizar con runtime para los forms piloto `cloro-ph-agua` y `limpieza-diaria`. Al entrar por runtime, el render depende de `RuntimeHost/RuntimeBuilder/LayoutEngine/DynamicFieldRenderer` y del `ComponentRegistry` para soportar los `fieldType`. En ese punto, **los field types de checklist/mediciones no se renderizan**, quedando visibles únicamente componentes que sí están soportados (ej. evidencia/firma/upload).

Cadena implicada en el runtime:
- `DynamicForm.jsx` → (entra por) `FormRuntimeHost.tsx`
- `FormRuntimeHost.tsx` → `RuntimeBuilder.resolve(formId)`
- `FormRuntimeHost.tsx` → `FormRendererEngine`
- `FormRendererEngine` → `LayoutEngine`
- `LayoutEngine` resuelve `fieldDef` por `fieldId` desde `resolved.fields` o `formData.__fieldDefs`
- `DynamicFieldRenderer` renderiza por `ComponentRegistry.get(fieldDef.fieldType)`

Cuando no existe componente/compatibilidad para esos `fieldType`, `DynamicFieldRenderer` cae en fallback “Unsupported field type” o no renderiza los campos esperados.

---

## 2) ¿Cuál fue el primer Sprint que introdujo la regresión?
**SPRINT 45**.

Evidencia directa:
- En `src/pages/DynamicForm.jsx` aparece explícitamente el comentario **“Runtime Entry Consolidation Layer (SPRINT 45)”** y la lógica que fuerza runtime:
  - `runtimeNativeForms = ["cloro-ph-agua", "limpieza-diaria"]`
  - `forceRuntime = runtimeNativeForms.includes(formDef?.slug)`
  - si `runtimeEnabled || forceRuntime` ⇒ render `FormRuntimeHost`.

---

## 3) ¿Qué archivo exacto contiene la causa?
**`src/pages/DynamicForm.jsx`**

La causa está en la condición que fuerza la entrada por runtime para los forms piloto.

---

## 4) ¿Cuál es la causa técnica detallada?
### Causa técnica (desfase de compatibilidad runtime vs forms piloto)
1. `DynamicForm.jsx` carga el form con `dynamicService.getFormBySlug()`.
2. Luego carga `fields` con `dynamicService.getFormFields(form.id)`.
3. Finalmente decide la ruta de render:
   - Si el form está en `runtimeNativeForms` (o `runtimeEnabled`) ⇒ se renderiza **`FormRuntimeHost`** (runtime).
   - Si no ⇒ fallback legacy usando `BaseChecklist/BaseMediciones/BaseGeneric`.
4. Con SPRINT 45 se fuerza runtime **para `cloro-ph-agua` y `limpieza-diaria`**.
5. El runtime renderiza campos por `fieldDef.fieldType` usando:
   - `LayoutEngine` → `DynamicFieldRenderer`
   - `DynamicFieldRenderer` usa `ComponentRegistry.get(fieldDef.fieldType)`.
6. Si el `ComponentRegistry` no tiene componentes para los `fieldType` de checklist/mediciones o si el `fieldId`/`fieldType` no coincide con lo que runtime espera, entonces:
   - no se renderizan **Cumple/No Cumple** (boolean checklist)
   - no se renderizan **numéricos** (mediciones)
   - típicamente quedan solo campos “especiales” que sí encuentran componente/soporte.

---

## 5) ¿Cuál es la corrección mínima necesaria?
Corrección mínima conceptual (sin tocar código aquí):
- **Eliminar/condicionar el “forceRuntime” para esos slugs** hasta que runtime tenga compatibilidad completa (fieldType/ids) con el set de formularios piloto.

Equivalente mínimo:
- Render legacy para `cloro-ph-agua` y `limpieza-diaria` hasta que `ComponentRegistry` soporte todos los fieldTypes requeridos por esos forms bajo el runtime.

---

## 6) ¿La corrección afecta o no afecta la arquitectura Runtime construida entre Sprint 43–50?
**No afecta** la arquitectura runtime; solo modifica la **estrategia de activación/entrada (routing feature flag)** para esos forms mientras se completa la compatibilidad de render.

---

## 7) ¿Se mantiene la visión de escalabilidad, desacoplamiento de BD e integración futura con IA?
**Sí**. El desacoplamiento se conserva y el runtime sigue siendo el camino correcto para escalabilidad/IA. La corrección solo restablece el uso correcto del runtime cuando el mapping de fieldTypes/definitions esté completo.

---

## Verificación específica (pilotos)
### ¿Por qué ya no muestran checklist/mediciones?
Porque `DynamicForm.jsx` fuerza runtime para:
- `limpieza-diaria`
- `cloro-ph-agua`

y el runtime (via `DynamicFieldRenderer` + `ComponentRegistry`) no logra renderizar los `fieldType` correspondientes a:
- checklist boolean (Cumple/No Cumple)
- mediciones numéricas

### ¿DynamicForm está entrando por Runtime o por Legacy?
**Por Runtime**, debido a `runtimeNativeForms` + `forceRuntime`.

### ¿RuntimeBuilder entrega fields y layout correctamente?
`FormRuntimeHost.tsx` usa `builder.resolve(formId)` y solo renderiza si existen `resolved` y `layout`. Sin embargo, aunque exista, **la compatibilidad de `fieldDef.fieldType` con `ComponentRegistry` es el punto que determina si se renderizan o no los controles esperados**.

### ¿LayoutEngine encuentra fieldDef para cada fieldId?
`LayoutEngine.tsx` intenta:
- `fields?.find((f)=>f.id===fieldId)`
- o `formData.__fieldDefs[fieldId]`

Si no hay match (o no hay componente para el `fieldType`), los campos no aparecerán.

### ¿DynamicFieldRenderer encuentra componentes registrados?
`DynamicFieldRenderer.tsx` depende de `ComponentRegistry.get(fieldDef.fieldType)`; si falta componente, se retorna fallback de “Unsupported field type”.

---

## Conclusión
1. **Capa de ruptura:** `DynamicForm.jsx` (routing runtime) desencadena un render runtime no compatible para los forms piloto.
2. **Sprint inicial:** **SPRINT 45**.
3. **Archivo exacto:** `src/pages/DynamicForm.jsx`.
4. **Causa técnica:** activación forzada de runtime sin compatibilidad completa entre `fieldType` esperados por `ComponentRegistry` y los fieldTypes reales del runtime para esos forms.
5. **Corrección mínima:** no forzar runtime para `cloro-ph-agua`/`limpieza-diaria` hasta asegurar compatibilidad.
6. **Arquitectura 43–50:** no se rompe; solo se ajusta activación.
7. **Escalabilidad/IA:** se mantiene.

