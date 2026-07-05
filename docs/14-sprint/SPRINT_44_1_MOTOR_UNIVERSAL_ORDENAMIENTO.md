# SPRINT 44.1 — Documento Maestro: Motor Universal de Ordenamiento (Arquitectura y Contrato)

> **Modo sprint:** Diseño arquitectónico (solo contrato/documentación).  
> **Restricciones:** No modifica archivos, no crea componentes, no implementa lógica.

## 1) Introducción

### 1.1 Objetivo del motor
Definir un **estándar reutilizable** para cualquier funcionalidad futura de ordenamiento (por ejemplo: listas con “subir/bajar”, orden por drag & drop, reordenamiento masivo), **sin acoplarse** al dominio documental.

El motor debe ser desacoplado y operar sobre **elementos ordenables** que aporten únicamente información mínima (IDs + orden persistido).

### 1.2 Evidencia base (Sprint 44.0)
Este diseño se basa estrictamente en evidencia encontrada en:
- **Repositorio Documental (orden real existente de categorías)**
  - `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx`
  - `src/services/documentRepositoriesService.js`
- **Constructor Visual (orden/posicionamiento por `order_index` en campos)**
  - `src/components/FormBuilder.jsx`
  - `src/services/dynamicService.js` (método `getFormFields`)


## 2) Arquitectura General

### 2.1 Capas obligatorias (separación estricta)
1) **UI (Presentación)**
   - Renderiza la lista y ofrece acciones (up/down, mover, etc.)
   - Mantiene estado local/temporal de UI si aplica (para feedback inmediato)
   - **No calcula el “orden oficial”**: solicita mover al motor y recibe el nuevo orden/resultado.

2) **Motor Universal de Ordenamiento (Lógica del motor)**
   - Es responsable de **transformar** el orden lógico (por ejemplo, reordenar por índice o swap con dirección)
   - Coordina el flujo conceptual:
     - toma el estado actual ordenado
     - aplica la acción de mover
     - produce `orderedIds` (o estructura equivalente)
   - **No conoce el dominio** (no sabe de categorías, campos, formularios, ni nombres de tablas).

3) **Persistencia (capa de persistencia / servicios)**
   - Persistir el orden oficial en storage/BD mediante un campo numérico de orden.
   - En evidencia actual existen dos nombres de campo (no deben ser conocidos por el motor):
     - categorías: `sort_order` (en `sgc_document_repository_categories`)
     - campos: `order_index` (en `sgc_form_fields`)

4) **Servicios / Adapters (API de dominio)**
   - Servicios específicos del módulo que implementan el contrato para:
     - cargar lista ordenada
     - persistir el orden oficial cuando el motor lo solicite


### 2.2 Diagrama conceptual de responsabilidades

**UI**
- Render de ítems
- Controla acciones del usuario
- Consume el resultado del motor (nuevo orden en memoria)

**Motor Universal**
- Recibe:
  - lista ordenada actual (o conjunto ordenable)
  - acción de mover (arriba/abajo/movimiento)
- Devuelve:
  - nueva secuencia lógica (orderedIds)
- Produce instrucción abstracta para persistir

**Persistencia / Servicios**
- Recibe orderedIds y/o secuencia
- Persiste orden en el campo numérico correspondiente
- Refresca la lista (re-carga) para alinear estado con BD


## 3) Flujo Completo del Ordenamiento (contrato)

### 3.1 Etapas y responsabilidades

1) **Usuario**
   - Acción: click “subir”, click “bajar”, o gesto equivalente

2) **UI (presentación)**
   - Traduce acción a una intención neutral para el motor (ej. “mover hacia arriba el ítem X”)
   - Obtiene del estado actual la lista ordenada actual

3) **Motor Universal de Ordenamiento**
   - Aplica la acción sobre la secuencia actual
   - Deriva el orden resultante en un formato estándar (ej. `orderedIds`)
   - Devuelve el resultado para:
     - refrescar visual (optimista o posterior)
     - disparar persistencia del orden oficial

4) **Persistencia (servicio del módulo)**
   - Persiste el orden oficial en BD mediante un adapter (campo numérico de orden)

5) **Recarga / Alineación**
   - O bien:
     - re-carga el listado ordenado desde BD
   - O bien:
     - confirma con persistencia y re-sincroniza estado

6) **Render**
   - UI renderiza según la lista ordenada final


### 3.2 Mapeo explícito con evidencia del Sprint 44.0

#### Repositorio Documental (categorías)
- **Inicio flujo**: `moveCategory` (UI)
  - construye `orderedCategoryIds`
- **Persistencia**: `documentRepositoriesService.reorderCategories(...)`
- **Refresco UI**: `setCategories(next.map((c, i) => ({ ...c, sort_order: i })))`

#### Constructor Visual (campos)
- **Carga de orden**: `dynamicService.getFormFields` ya devuelve `sgc_form_fields` ordenados por `order_index`.
- **Persistencia del “orden oficial”** (solo inserción en evidencia)
  - `FormBuilder.jsx` inserta con `order_index` calculado como `max + 1`

> En evidencia actual, **no existe** flujo de “mover” persistido para `fields` (solo existe contractualmente `order_index` como fuente de orden). El motor se diseñará para habilitar esa persistencia futura de manera uniforme.


## 4) Contrato del Motor Universal (sin nombres definitivos)

### 4.1 Responsabilidades (lo que el motor HACE)
- Operar sobre una **secuencia** de elementos ordenables en memoria.
- Aplicar una **intención de movimiento** (mover hacia arriba / hacia abajo / mover a una posición equivalente).
- Producir un **resultado de orden** en un formato estándar que pueda ser persistido por un servicio específico.

### 4.2 Responsabilidades (lo que el motor NO HACE)
- No conoce el dominio (categorías, campos, documentos, módulos).
- No usa nombres de tablas.
- No consulta BD.
- No calcula `order_index` o `sort_order` consultando el backend.
- No valida reglas de negocio del dominio (solo reglas mecánicas del reordenamiento, por ejemplo intercambio por índice).

### 4.3 Entradas conceptuales
- **Secuencia actual ordenada** (items en el orden actual)
- **Identificador del ítem objetivo** (id del item)
- **Acción de movimiento** (subir/bajar o equivalente)
- **Extractor de identificadores** (función conceptual para obtener `id` del item)
  - o convención de que los items ya incluyen `id`

### 4.4 Salidas conceptuales
- **Secuencia ordenada resultante**
- **Lista de IDs en el orden resultante** (ideal para persistencia)

### 4.5 Interacciones con persistencia (abstracto)
- El motor debe devolver una salida compatible con un persistidor del módulo:
  - “persistir el orden oficial con orderedIds”.


## 5) Interfaces conceptuales (sin implementación)

> Estas interfaces describen “qué se conectará” en la futura implementación.

### 5.1 Operaciones conceptuales
- `mover(arriba|abajo|aPosición, targetId, currentSequence)`
  - Entrada: secuencia actual + target
  - Salida: orden resultante (orderedIds)

### 5.2 Persistidor del módulo (adapter)
- `persistirOrden(orderedIds)`
  - El adapter traduce `orderedIds` a la actualización del campo numérico (ej. `sort_order` o `order_index`).

### 5.3 Cargador del módulo
- `cargarListaOrdenada()`
  - Debe entregar secuencia ya ordenada por el campo numérico.
  - Evidencia actual:
    - categorías: `getCategories(...).order('sort_order', ascending)`
    - campos: `getFormFields(...).order('order_index', ascending)`


## 6) Contrato del elemento ordenable

### 6.1 Definición mínima (modelo conceptual)
Cualquier entidad debe cumplir al menos:
- **ID estable** (único y consistente): `id`
- **El motor ordenará por la posición del item en la secuencia actual**
- **La persistencia del módulo** asociará ese orden a un campo numérico persistido (campo de orden específico del módulo)

### 6.2 Ejemplos de “campo de orden” (no definidos por el motor)
- Categorías: `sort_order`
- Campos: `order_index`

> El motor solo requiere IDs y secuencia. El mapeo a campo numérico se hace en el adapter de persistencia del módulo.


## 7) Componentes del Sistema

### 7.1 Motor
- Lógica pura de reordenamiento por secuencia
- Salida: orderedIds

### 7.2 Estado
- Estado de UI / estado de secuencia (array ordenado)
- Estado oficial: el orden provisto por persistencia (BD)

### 7.3 Servicios (adapters por módulo)
- Cargador: obtiene lista ordenada
- Persistidor: persiste secuencia ordenada

### 7.4 UI
- Implementa la interacción
- Consume resultados del motor


## 8) Mapa de dependencias (derivado de Sprint 44.0)

### 8.1 Repositorio Documental
- UI ordena categorías y persiste a través de servicio:
  - `DocumentRepositoriesAdmin.jsx`
    - lógica: reordenar array local + construir ordered ids
    - persistencia: `documentRepositoriesService.reorderCategories`
  - `documentRepositoriesService.js`
    - actualiza campo `sort_order` por índice

### 8.2 Constructor Visual (FormBuilder)
- Carga ordenada de campos (fuente oficial):
  - `dynamicService.getFormFields(formId)`
    - `.order('order_index', { ascending: true })`
- Inserción preserva contrato de orden:
  - `FormBuilder.jsx`
    - calcula `order_index = max+1`
- Render usa el orden del array `fields`:
  - `fields.map((field, index) => ...)`


## 9) Puntos de Integración

### 9.1 Constructor Visual (FormBuilder)
**Punto exacto de integración (según evidencia):**
- `src/components/FormBuilder.jsx`
  - Integrar el motor en la lógica que hoy administra `fields` y donde el UI ofrecerá acciones de mover.
- La persistencia futura debe escribir sobre:
  - `sgc_form_fields.order_index`
  - coherente con `dynamicService.getFormFields` que ya ordena por ese campo.

**Nota:** Hoy `FormBuilder.jsx` tiene icono de “agarre” visual pero no implementa reordenamiento. El motor se integra en el futuro donde se agreguen handlers de movimiento.

### 9.2 Repositorio Documental (DocumentRepositoriesAdmin)
**Punto de integración conceptual:**
- `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx`
  - El motor reemplazaría la lógica mecánica de reordenamiento local (`next` + orderedIds) y dejaría el persistidor al servicio existente.

> Esta integración futura debe mantener el “contrato oficial” de persistencia ya probado: `sort_order`.

### 9.3 Futuros módulos
Cualquier futura lista ordenable deberá:
- exponer su lista en estado como secuencia
- persistir orden en un campo numérico oficial
- cargar siempre ya ordenado
- usar el mismo motor para calcular orderedIds


## 10) Principios Arquitectónicos (obligatorios)

1) **UI no calcula el orden oficial**
   - UI solo muestra feedback y consume orden resultante.

2) **El orden oficial proviene de persistencia / carga ordenada**
   - Evidencia actual ya confirma:
     - campos se cargan con `.order('order_index')`
     - categorías se cargan con `.order('sort_order')`

3) **El motor no conoce el dominio**
   - No sabe si ordena categorías, campos, documentos, etc.

4) **El motor no conoce nombres de tablas ni columnas específicas**
   - El mapeo `orderedIds` → campo numérico ocurre en adapters de persistencia.

5) **El motor opera sobre elementos ordenables estándar**
   - Items con ID estable y secuencia actual.

6) **Extensibilidad para drag & drop / reordenamiento masivo**
   - El contrato de “acción de movimiento” debe soportar implementaciones futuras (drag drop genera una nueva secuencia/target positions).

---

## 10.1) Invariantes del Motor Universal

> Reglas que **nunca** podrán romperse en ningún módulo que adopte el Motor Universal.

1) **El motor no modifica directamente la base de datos**
   - Justificación: la persistencia se delega a un adapter del dominio.

2) **El motor nunca conoce tablas ni columnas**
   - Justificación: evita acoplamiento a esquemas (ej. `sgc_form_fields`, `sgc_document_repository_categories`).

3) **El motor nunca depende del dominio**
   - Justificación: el motor solo opera con elementos ordenables genéricos (IDs + secuencia).

4) **El motor nunca modifica directamente el estado de React**
   - Justificación: el motor produce resultados; el consumo/actualización de UI pertenece a la capa de presentación/estado.

5) **El motor siempre trabaja sobre una secuencia ordenada**
   - Justificación: el reordenamiento se define sobre una lista/orden actual.

6) **El motor siempre devuelve una nueva secuencia sin mutar la original**
   - Justificación: garantiza determinismo, testabilidad y evita efectos colaterales.

7) **El motor siempre delega la persistencia al Adapter**
   - Justificación: la persistencia debe respetar el contrato del módulo y los campos de orden del dominio.

8) **El orden oficial siempre proviene de la persistencia**
   - Justificación: la fuente de verdad es el almacenamiento (evidencia: `order('sort_order')` y `order('order_index')`).

9) **El motor debe ser completamente determinístico**
   - Misma entrada ⇒ misma salida.
   - No debe depender de tiempo, requests, estado global mutable ni side-effects.

10) **El motor no realiza carga de datos**
   - Justificación: carga/re-carga pertenece al adapter y/o servicios del módulo.

11) **El motor no gestiona errores de dominio**
   - Justificación: el adapter gestiona errores del módulo (red, validaciones del dominio, restricciones DB).

---

## 10.2) Contrato Oficial del Adapter

> El Adapter es la **única capa autorizada** para comunicar el Motor Universal con la persistencia del dominio.

### Responsabilidades
1) **Obtener listas ordenadas**
   - Debe cargar desde persistencia en el orden oficial del dominio.
   - Evidencia:
     - campos: `dynamicService.getFormFields()` usa `.order('order_index', { ascending: true })`
     - categorías: servicio del repositorio usa `order('sort_order', ...)`.

2) **Persistir el nuevo orden**
   - Recibe del motor el resultado (por ejemplo, `orderedIds` o secuencia equivalente).

3) **Traducir orderedIds al campo de orden correspondiente**
   - Debe mapear a su campo numérico del dominio (ej. `sort_order`, `order_index`).

4) **Recargar los datos después de persistir**
   - Debe alinear estado con BD (ya sea por recarga completa o reconciliación controlada).

5) **Gestionar errores propios del dominio**
   - Red, restricciones, errores de actualización parcial, inconsistencias de datos.
   - Debe propagar/normalizar errores al nivel de UI/estado que corresponda.

### Restricciones
- **El Motor Universal nunca interactúa directamente con la base de datos**.
- **El Adapter nunca contiene lógica de ordenamiento**.
  - El adapter solo traduce/persiste/recarga.
- **El adapter no altera el resultado lógico del motor**.
  - Solo lo convierte al formato de persistencia del dominio.

### Límites
- El adapter puede implementar políticas de persistencia específicas del módulo (batch, paralelismo, transacciones) **sin invadir la lógica del orden**.

---

## 10.3) Fuera del Alcance del Sprint 44.2

> Límites explícitos para proteger la arquitectura estable del Sprint 43.1.

Durante el Sprint 44.2 (implementación) se debe mantener explícitamente fuera del alcance:

1) **No modificar la arquitectura estable del Sprint 43.1**
   - No introducir cambios estructurales en runtime, módulos principales o patrón global.

2) **No alterar dynamicService.getFormFields()**
   - Se preserva el contrato: el orden oficial de `sgc_form_fields` proviene de `order_index` y la carga está definida por el servicio actual.

3) **No modificar el contrato de `order_index`**
   - Se respeta la semántica actual: campo numérico que representa el orden oficial.

4) **No modificar la estructura de `sgc_form_fields`**
   - Se evita acoplarse a cambios de esquema.

5) **No modificar el Runtime**
   - Se mantiene la arquitectura existente (bridge/eventing) sin cambios.

6) **No modificar Configuration.jsx fuera del Constructor Visual**
   - El alcance de integración se limita al área de constructor y listas ordenables.

7) **No introducir optimizaciones ajenas al ordenamiento**
   - No se incluye optimización general de performance.

8) **No implementar Drag & Drop en este Sprint**
   - La implementación de un contrato compatible con DnD es futura; no se implementa DnD en 44.2.

9) **No modificar módulos no relacionados**
   - Solo se adapta el consumo del motor en puntos evidenciados (Repositorio Documental y/o Constructor Visual) según el diseño.

---

## 10.4) Validación Arquitectónica Final

### Checklist de coherencia
- **Coherencia arquitectónica:** ✅ Separación UI / Motor / Persistencia / Adapter descrita en secciones 2 y 3.
- **Consistencia del contrato:** ✅ El motor opera sobre secuencias y entrega un orden resultante; la persistencia se delega al adapter.
- **Correcta separación de responsabilidades:** ✅ Motor (lógica mecánica), UI (interacción), Adapter (traducción + persistencia + recarga).
- **Ausencia de contradicciones:** ✅ El documento mantiene una fuente oficial de orden por persistencia (evidencia: `sort_order` y `order_index`).
- **Preparación para reutilización:** ✅ Contrato general de secuencia + IDs; no depende del dominio.
- **Compatibilidad con futuras implementaciones (DnD):** ✅ Extensibilidad prevista en el contrato de acción de movimiento.

### Observaciones finales
- El documento ya soporta el mapeo entre contratos observados:
  - categorías ⇢ `sort_order`
  - campos ⇢ `order_index`
- La implementación en 44.2 debe limitarse a consumo/conexión del motor en los puntos evidenciados, manteniendo invariantes y contrato del adapter.

---

## 10.5) Evaluación Final de Preparación (Sprint 44.2)

- **Nivel de madurez del diseño:** **Listo para Implementación (con estándar documental elevado)**.
- **Riesgos residuales:**
  - Riesgos ya identificados en el documento: condiciones de carrera, sincronización UI/persistencia, persistencia parcial y concurrencia.
  - Riesgo documental anterior (falta de encabezados formales) ahora mitigado mediante secciones explícitas.
- **Aprobación para iniciar Sprint 44.2:** ✅ Aprobado.

Requisitos de implementación para mantener la aprobación:
- Respetar invariantes del motor.
- No mover lógica al adapter (adapter solo traduce/persiste/recarga).
- Respetar el contrato existente de carga ordenada de `dynamicService.getFormFields()`.



## 11) Riesgos Arquitectónicos (no se resuelven, solo se documentan)

1) **Condiciones de carrera**
   - Reordenamientos sucesivos antes de que termine persistencia pueden causar estados divergentes.

2) **Sincronización entre UI y persistencia**
   - Si se hace feedback optimista, debe existir estrategia para reconciliar con BD.

3) **Persistencia parcial**
   - Si el adapter actualiza items en múltiples requests, fallos intermedios pueden dejar orden inconsistente.
   - (Evidencia actual en `reorderCategories` usa múltiples updates en paralelo con Promise.all.)

4) **Reordenamientos concurrentes**
   - Dos usuarios editando el mismo conjunto podrían pisarse.

5) **Compatibilidad con drag & drop**
   - La entrada del motor debe poder representar no solo “up/down”, sino “swap por posición” o secuencia final.

6) **Escalabilidad**
   - Reordenamientos masivos requieren que el contrato de persistencia sea eficiente.


## 12) Recomendaciones para el Sprint 44.2 (Únicamente)

1) **Definir adapters por módulo**
   - Repositorio Documental: adapter hacia `sgc_document_repository_categories.sort_order`.
   - Constructor Visual: adapter hacia `sgc_form_fields.order_index`.

2) **Mantener el contrato existente de carga ordenada**
   - No cambiar `getCategories(...).order('sort_order')`.
   - No cambiar `getFormFields(...).order('order_index')`.

3) **Integrar el motor sustituyendo lógica mecánica**
   - Reemplazar cálculo “next/orderedIds” en UI por llamada al motor.

4) **Persistencia atomizada (a futuro)**
   - Considerar estrategia de actualización coherente en el adapter para evitar persistencia parcial.

5) **Diseñar un contrato que acepte secuencia final**
   - Facilita drag & drop y reordenamiento masivo.


## 13) Restricciones del Sprint 44.1

- Prohibido modificar archivos.
- Prohibido crear componentes.
- Prohibido implementar lógica.
- Prohibido refactorizar.
- Prohibido proponer cambios no respaldados por evidencia.
- Prohibido escribir código definitivo.


## 14) Cierre

Este documento define el estándar oficial de arquitectura y contrato para el **Motor Universal de Ordenamiento** usando evidencia directa del comportamiento probado en:
- Repositorio Documental (persistencia `sort_order` + UI reordenable)
- Constructor Visual (fuente de orden `order_index` vía `dynamicService.getFormFields`)

La implementación del Sprint 44.2 deberá ajustarse estrictamente a este contrato.

