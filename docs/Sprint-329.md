# Sprint 329 — Field Order Control Placement · Controlled UI Refinement

**Rama:** release/stable-sprint79
**Modo:** LEVEL 5 · CONTROLLED UI REFINEMENT
**Precedente:** Sprint 328 — Explicit Field Ordering (CERTIFIED)
**Dependencias:** Sprint 328 · UniversalOrderMotor · contrato `order_index`
**Suite:** `scripts/sprint-329-field-order-control-placement-controlled-ui-refinement.mjs`
**Resultado:** **CERTIFIED** 55/55 checks (E01–E80 + casos A–J + regresión 328 §12) · 3.2s · exit=0 · timebox OK
**Regresión histórica 296–328:** NO ejecutada (refinamiento de presentación dirigido).
**Cambios src/ (1 autorizado):** `src/components/FormBuilder.jsx` — únicamente estructura JSX.
**Clasificación:** **CONTROLLED PRESENTATION REFINEMENT**

---

## 1. Objetivo

> El control **"Orden dentro del formulario"** ya no se intercala entre los controles del tipo de
> campo: pasa a ser la **última configuración** del panel, después de *Este campo es obligatorio*
> y antes de las acciones *Cancelar / Guardar*. La corrección es exclusivamente de **ubicación
> visual**; la funcionalidad de orden (Sprint 328) queda intacta.

**Antes:** `Etiqueta → Tipo → Orden → Unidad → Obligatorio` (interferencia conceptual).
**Ahora:** `Etiqueta → Tipo → [config específica] → Obligatorio → Orden → Cancelar/Guardar`.

## 2. Principio rector

**ONE FIELD CONFIGURATION · ONE ORDER CONTROL · LAST POSITION**

```
CONFIGURACIÓN SEMÁNTICA   →  Etiqueta · Tipo · Opciones específicas · Unidad · Requerido
CONFIGURACIÓN ESTRUCTURAL →  Orden dentro del formulario (1 - N)
ACCIONES                  →  Cancelar / Guardar
```

## 3. Implementación (JSX estructural en `src/components/FormBuilder.jsx`)

En **ambos** paneles (*Editando Campo* y *Configuración del Nuevo Campo*):

- Se **extrajo** el bloque `Orden dentro del formulario` de la grilla de identidad
  (entre `Tipo de Dato` y la configuración específica).
- Se **reubicó** al final del panel, tras el checkbox *Este campo es obligatorio*,
  envuelto en una zona `POSICIÓN` con separador estructural (`pt-3 border-t border-gray-200`),
  seguido por las acciones `Cancelar / Guardar Campo`.
- La posición del control es **fija** (fuera de todo condicional `{field_type === ...}`):
  cambiar dinámicamente el tipo de campo **no** mueve el control de orden.

**Sin** hacks: 0 `position: absolute`, 0 `order` de Flexbox, 0 duplicación, 0 renderizado
condicional duplicado, 0 modificación del motor de orden.

## 4. Resultado visual objetivo (caso Número)

```
Etiqueta / Pregunta *      [________________]
Tipo de Dato *             [Número        ▼]
Unidad de Medida (Opcional)[Ej. °C, ppm, kg]
☑ Este campo es obligatorio
Orden dentro del formulario (1 - 88) [88]
Cancelar                    Guardar Campo
```

## 5. Preservación del Sprint 328 (verificada)

| Capacidad 328 | Estado |
|---------------|--------|
| Crear `1..N+1` | ✔ |
| Editar `1..N` | ✔ |
| Flechas ↑/↓ → `moveFieldToOrder(order ∓ 1)` | ✔ |
| Persistencia `order` → `FormBuilderOrderAdapter` → `order_index` | ✔ |
| Runtime `order_index` → `getFormFields()` → render | ✔ |
| Identidad, `field.id`, `field.order` | ✔ |

## 6. Casos obligatorios A–J

A Número · B Checklist · C Select · D Texto · E Textarea · F Boolean · G Signature ·
H cambio dinámico de tipo (posición fija) · I persistencia (Orden=15 → order_index=15) ·
J reordenamiento (motor intacto). **55/55 PASS.**

Regresión dirigida (Sprint 328 §12): crear en posición 2 → `Campo1:1 · Nuevo:2 · Campo2:3 · Campo3:4` ✔ ·
mover Campo4 → posición 1 ✔ · flechas intactas ✔.

## 7. No se modificó

`UniversalOrderMotor.js` · `FormBuilderOrderAdapter.js` · `dynamicService.js` · `DynamicForm.jsx` ·
`src/runtime/**` · Supabase · SQL · storage · Media Processor · `documentsService` · EvidenceUploader ·
SignaturePad · Dashboard.

Verificación por **fingerprint SHA-256** de los archivos protegidos en la suite.

## 8. Invariantes

Orden = metadata explícita ✔ · order 1..N ✔ · order_index persistencia ✔ · identidad ✔ · flechas ✔ ·
orden explícito ✔ · configuración específica ✔ · **orden visual siempre último** ✔ · orden debajo de
obligatorio ✔ · Cancelar/Guardar después de Orden ✔ · todos los tipos ✔ · runtime intacto ✔ · DB intacta ✔ ·
adapter intacto ✔ · motor intacto ✔ · nuevo modelo/servicio/tabla: NO.

## 9. Veredicto

```
FIELD CONFIGURATION        PRESERVED
IDENTITY                   PRESERVED
TYPE CONFIGURATION         PRESERVED
REQUIRED                   PRESERVED
EXPLICIT ORDER             PRESERVED
ORDER POSITION             LAST
ORDER SEMANTICS            PRESERVED
PERSISTENCE                PRESERVED
RUNTIME                    PRESERVED
ORDER MOTOR                PRESERVED
UI STRUCTURE               REFINED
ARCHITECTURE               PRESERVED
SSOT                       PRESERVED
DATABASE                   UNCHANGED
SCOPE                      CONTROLLED
BUILD                      PASS
STATUS: CERTIFIED (55/55 · 3.2s)
```