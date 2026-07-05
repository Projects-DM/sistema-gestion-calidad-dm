# SPRINT 44.2C — Cierre Oficial del Piloto del Motor Universal de Ordenamiento

## 1) Objetivo del Sprint
Cerrar oficialmente el piloto implementado durante el **Sprint 44.2B** del **Motor Universal de Ordenamiento**, validando su integración arquitectónica y funcional en el **Constructor Visual (FormBuilder)**, sin introducir nuevas funcionalidades, sin cambiar la arquitectura ni modificar código fuente.

## 2) Resumen ejecutivo
Durante el Sprint 44.2B se implementó un mecanismo de reordenamiento reutilizable desacoplado de dominio, con:
- **Núcleo puro** para calcular el nuevo orden en memoria.
- **Adapter** para traducir el nuevo orden calculado a la persistencia del sistema (`order_index`) y recargar desde `dynamicService.getFormFields()`.

En el Sprint 44.2C se realiza el cierre oficial del piloto con base en:
- Validación de flujo **Motor → Adapter → Persistencia → dynamicService → UI**.
- Estabilidad funcional del reordenamiento ante operaciones:
  - mover arriba
  - mover abajo
  - persistencia
  - recarga

## 3) Arquitectura final implementada

### Capas y responsabilidades (sin acoplamiento de dominio)
1. **UniversalOrderMotor** (núcleo)
   - Responsabilidad: operar sobre una secuencia en memoria e inmutabilidad.
   - API conceptual usada:
     - `moveUp(sequenceOrdered, targetId)`
     - `moveDown(sequenceOrdered, targetId)`
     - `toOrderedIds(sequenceOrdered)`

2. **FormBuilderOrderAdapter**
   - Responsabilidad: persistir el nuevo orden en `sgc_form_fields.order_index`.
   - Recarga con `dynamicService.getFormFields(formId)` para alinear la UI con la fuente oficial.

3. **FormBuilder**
   - Responsabilidad: UI (botones de reordenamiento) y refresco del estado local (solo seteo con recarga).

4. **dynamicService**
   - Responsabilidad: lectura ordenada de `sgc_form_fields` por `order_index`.

## 4) Componentes implementados

### 4.1 UniversalOrderMotor
**Archivo:** `src/order-motor/UniversalOrderMotor.js`

- Núcleo puro (sin React, sin Supabase, sin persistencia).
- Contrato basado en secuencia de objetos con propiedad `id`.

### 4.2 FormBuilderOrderAdapter
**Archivo:** `src/order-motor/adapters/FormBuilderOrderAdapter.js`

- Traduce `orderedIds` → `order_index`.
- Persistencia por actualización de múltiples filas en `sgc_form_fields`.
- Recarga alineando con `dynamicService.getFormFields(formId)`.

### 4.3 Integración con FormBuilder
**Archivo:** `src/components/FormBuilder.jsx`

- UI: botones “Subir” y “Bajar” por campo.
- Flujo: delega cálculo al motor y delega persistencia al adapter.
- Valida contrato del motor antes de convertir a `orderedIds`.

## 5) Flujo definitivo

**UI**
↓
**UniversalOrderMotor**
↓
**Adapter (FormBuilderOrderAdapter)**
↓
**Persistencia (sgc_form_fields.order_index)**
↓
**dynamicService (getFormFields por order_index)**
↓
**UI actualizada**

## 6) Archivos creados
- `src/order-motor/UniversalOrderMotor.js` (si aplica según el registro del sprint 44.2B)
- `src/order-motor/adapters/FormBuilderOrderAdapter.js` (si aplica según el registro del sprint 44.2B)

> Nota: si estos archivos ya existían en la rama de sprint 44.2B, se consideran “implementados” dentro del piloto.

## 7) Archivos modificados
- `src/components/FormBuilder.jsx`

## 8) Evidencia funcional

Operaciones validadas durante el piloto:
1) **Mover arriba**
- Cambia el orden visual.
- Persiste el reordenamiento en `sgc_form_fields.order_index`.
- Al recargar, el orden permanece por `dynamicService.getFormFields()`.

2) **Mover abajo**
- Se valida el flujo completo Motor → Adapter → Persistencia → Recarga.
- Cambia el orden visual.
- Persiste y se mantiene al recargar.

3) **Persistencia**
- El Adapter actualiza `sgc_form_fields.order_index` en base al orden recibido.

4) **Recarga**
- El Adapter recarga con `dynamicService.getFormFields(formId)` que ordena por `order_index`.

5) **Estabilidad**
- El piloto no introduce dependencias de dominio en el Motor.
- La UI se mantiene sincronizada con la fuente oficial (recarga tras persistencia).

**Evidencia documental existente en el repo:**
- `docs/14-sprint/SPRINT_44_2B_EVIDENCIA_FASE_1_MOTOR_UNIVERSAL_ORDENAMIENTO.md`

## 9) Validaciones arquitectónicas
Se confirma mediante la separación de responsabilidades:

- ✓ **Motor desacoplado**
  - Núcleo puro de reordenamiento.
- ✓ **Adapter responsable de persistencia**
  - Actualiza `sgc_form_fields.order_index` y recarga.
- ✓ **FormBuilder responsable únicamente de UI**
  - Botones + seteo del estado tras recarga.
- ✓ **dynamicService responsable únicamente de lectura**
  - `getFormFields(formId)` retorna por `order('order_index', { ascending: true })`.

## 10) Riesgos encontrados
- **Persistencia no atómica** (posible inconsistencia transitoria)
  - El Adapter usa actualizaciones en paralelo (`Promise.all`) sin transacción/batching atómico.
  - Impacto: bajo en el piloto por el tipo de operación y baja criticidad funcional, pero a documentar para expansión.

## 11) Riesgos aceptados
- Se acepta el riesgo de no atomicidad para el piloto, dado que:
  - El comportamiento final depende de la recarga.
  - La UI se alinea a la fuente oficial luego de persistir.

## 12) Mejoras futuras
- Persistencia atómica
  - Posibles transacciones o estrategias de batching con consistencia garantizada.
- Adapters para nuevos módulos
  - Extender el patrón: Motor universal + Adapter de persistencia por entidad.
- Soporte a reordenamiento masivo
  - Preparar contratos para drag & drop (sin cambiar el núcleo del motor).

## 13) Estado final del piloto
- ✓ Piloto completado
- ✓ Arquitectura validada
- ✓ Preparado para reutilización

Además, el **Motor Universal de Ordenamiento** queda oficialmente aprobado para comenzar su expansión a otros módulos del sistema.

## 14) Preparación para Sprint 45
El **Motor Universal de Ordenamiento** queda aprobado para reutilizarse en otros contextos (listas futuras como campos, módulos, listas, etc.) mediante nuevos **Adapters**, manteniendo la arquitectura estable:
- Núcleo puro (Motor)
- Persistencia encapsulada (Adapter)
- UI aislada (FormBuilder)
- Lectura ordenada por contratos del sistema (dynamicService)

