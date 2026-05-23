# ESTÁNDAR DE ESQUEMA DE CAMPOS Y CONTRATOS UNIVERSALES
## Sistema de Gestión de Calidad (SGC-DM) — Enterprise Metadata-Driven Platform

Este documento representa el **Contrato Técnico Central** y el estándar arquitectónico oficial que gobierna los componentes dinámicos, las validaciones en tiempo de ejecución, el almacenamiento y la integración con Inteligencia Artificial del **Sistema de Gestión de Calidad (SGC-DM)**.

Establece la frontera contractual entre la definición de datos en base de datos (**CORE**) y la interpretación e interactividad visual en la interfaz (**RUNTIME**), asegurando que cualquier motor dinámico (`BaseChecklist`, `BaseMediciones`, etc.) pueda deserializar y operar sobre campos dinámicos sin requerir redespliegues o cambios en el código de la aplicación.

---

## 1. FILOSOFÍA DE LA ARQUITECTURA METADATA-DRIVEN

La plataforma SGC-DM evoluciona de la digitalización estática de formularios a una **arquitectura basada en metadatos**. Bajo este paradigma:
1. **La Base de Datos define el Qué y el Cómo:** El tipo de datos, límites, flujos y alertas se parametrizan en formato JSONB dentro de la columna `sgc_form_fields.options`.
2. **Los Motores Interpretativos definen la Visualización:** Los motores React (`engines`) interpretan este contrato de forma agnóstica para renderizar la UI ideal (táctil para checklists, de precisión para mediciones, etc.).
3. **El Modelo EAV (Entity-Attribute-Value) independiza el Esquema:** Permite escalar la plataforma a cientos de formularios dinámicos manteniendo un esquema SQL estático, reduciendo el mantenimiento de base de datos a cero.

```
                  [ CORE DB METADATA ]
              sgc_form_fields.options (JSONB)
                            │
                            ▼
              [ CONTRATO DE CAMPO UNIVERSAL ]
                (Definido en docs/field_schema.md)
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
  [ BaseChecklist ]  [ BaseMediciones ]  [ BaseGeneric ]
     (Radio UI)       (Numeric Input)      (Standard)
         │                  │                  │
         └──────────────────┼──────────────────┘
                            ▼
                  [ RUNTIME EVALUATION ]
            Validaciones, Visibilidad e IA Tags
                            │
                            ▼
                [ RUNTIME DB VALUES ]
            sgc_response_values (Typed columns)
```

---

## 2. REGISTRO UNIVERSAL DE TIPOS DE CAMPOS (FIELD REGISTRY)

El sistema de gestión admite **19 tipos de campos oficiales** clasificados en 4 categorías conceptuales. Cada uno cuenta con un contrato estricto de opciones, comportamiento de renderizado y tipo de columna asignada en el almacenamiento físico EAV.

### 2.1 Categoría Primitivos

#### A. `text` (Texto Corto)
*   **Propósito:** Captura de datos alfanuméricos cortos (nombres, ubicaciones, observaciones cortas).
*   **UX Component:** `<input type="text">` estándar con Tailwind.
*   **DB Column:** `value_text` (TEXT)
*   **JSON Options Contract:**
    ```json
    {
      "placeholder": "Ingrese el código de cabina...",
      "maxLength": 100,
      "minLength": 3
    }
    ```
*   **IA Readiness:** Análisis sintáctico y extracción de entidades nominales.

#### B. `textarea` (Texto Extendido / Observaciones)
*   **Propósito:** Registro de descripciones extensas, bitácoras de eventos o acciones correctivas.
*   **UX Component:** `<textarea>` responsivo con redimensionamiento vertical libre.
*   **DB Column:** `value_text` (TEXT)
*   **JSON Options Contract:**
    ```json
    {
      "placeholder": "Describa detalladamente el evento...",
      "rows": 4,
      "maxLength": 1000
    }
    ```
*   **IA Readiness:** Análisis de sentimiento, procesamiento del lenguaje natural (NLP) para resúmenes de no conformidades.

#### C. `number` (Entero)
*   **Propósito:** Cantidades discretas no decimales (número de operarios, conteo de bolsas, unidades rechazadas).
*   **UX Component:** `<input type="number" step="1">`.
*   **DB Column:** `value_number` (NUMERIC)
*   **JSON Options Contract:**
    ```json
    {
      "min": 0,
      "max": 1000,
      "placeholder": "Ej: 15"
    }
    ```
*   **IA Readiness:** Detección de anomalías cuantitativas y estadísticas descriptivas de volumen.

#### D. `decimal` (Flotante Genérico)
*   **Propósito:** Mediciones analíticas no sanitarias (pesos netos, porcentajes, dimensiones).
*   **UX Component:** `<input type="number" step="0.01">` con formato monomendida.
*   **DB Column:** `value_number` (NUMERIC)
*   **JSON Options Contract:**
    ```json
    {
      "min": 0.0,
      "max": 100.0,
      "decimal_precision": 2,
      "unit": "kg"
    }
    ```
*   **IA Readiness:** Análisis predictivo de tendencias y regresiones de control.

---

### 2.2 Categoría Mediciones Sanitarias (Críticas)

#### A. `temperature` (Temperatura)
*   **Propósito:** Monitoreo térmico de áreas frías, calientes o productos (Cadena de Frío, BPM).
*   **UX Component:** `<input type="number" step="0.1">` con colores dinámicos e icono de termómetro.
*   **DB Column:** `value_number` (NUMERIC)
*   **JSON Options Contract:**
    ```json
    {
      "unit": "°C",
      "min": -25.0,
      "max": 8.0,
      "critical_threshold": { "min": -22.0, "max": 4.0 },
      "warning_threshold": { "min": -20.0, "max": 2.0 }
    }
    ```
*   **Runtime Behavior:** Alerta crítica visual de color rojo inmediato si excede el rango y aviso amarillo si está en advertencia.
*   **IA Readiness:** **Alta prioridad.** Algoritmos de regresión de series temporales para alertar sobre posible ruptura de la cadena de frío antes de que ocurra (mantenimiento predictivo).

#### B. `ph` (Potencial de Hidrógeno)
*   **Propósito:** Medición de acidez/alcalinidad del agua de lavado o de procesos sanitarios.
*   **UX Component:** `<input type="number" step="0.05">` con validación de color en escala ácida/alcalina.
*   **DB Column:** `value_number` (NUMERIC)
*   **JSON Options Contract:**
    ```json
    {
      "unit": "pH",
      "min": 0.0,
      "max": 14.0,
      "critical_threshold": { "min": 6.5, "max": 8.5 }
    }
    ```
*   **IA Readiness:** Clasificación del agua y detección de no conformidades sanitarias inmediatas.

#### C. `cloro` (Cloro Residual Libre)
*   **Propósito:** Monitoreo químico de la concentración de cloro en el agua potable o de sanitización.
*   **UX Component:** `<input type="number" step="0.1">` con medidor visual de ppm.
*   **DB Column:** `value_number` (NUMERIC)
*   **JSON Options Contract:**
    ```json
    {
      "unit": "ppm",
      "min": 0.0,
      "max": 5.0,
      "critical_threshold": { "min": 0.3, "max": 2.0 }
    }
    ```
*   **IA Readiness:** Correlación entre pH y Cloro para optimización de dosificación microbiológica mediante IA generativa/analítica.

---

### 2.3 Categoría Temporales y Selectores

#### A. `date` (Fecha)
*   **Propósito:** Captura de fechas específicas (vencimiento de lotes, fecha de calibración).
*   **UX Component:** Input selector de fecha nativo de navegador con formateo `YYYY-MM-DD`.
*   **DB Column:** `value_text` (TEXT)
*   **JSON Options Contract:**
    ```json
    {
      "minDate": "today",
      "maxDate": "2028-12-31"
    }
    ```

#### B. `time` (Hora)
*   **Propósito:** Registro de hitos horarios exactos (hora de despacho, hora de medición).
*   **UX Component:** Input de selección horaria formato `HH:mm` (24h).
*   **DB Column:** `value_text` (TEXT)

#### C. `datetime` (Fecha y Hora)
*   **Propósito:** Marca de tiempo unificada e inmutable.
*   **UX Component:** Selector nativo datetime-local.
*   **DB Column:** `value_text` (TEXT)

#### D. `select` (Selección Única)
*   **Propósito:** Elección estructurada entre opciones predefinidas en base de datos.
*   **UX Component:** Dropdown `<select>` interactivo con buscador incorporado si supera 7 opciones.
*   **DB Column:** `value_text` (TEXT)
*   **JSON Options Contract:**
    ```json
    {
      "choices": ["Línea A", "Línea B", "Línea C", "Bodega Principal"]
    }
    ```

#### E. `multiselect` (Selección Múltiple)
*   **Propósito:** Selección de múltiples tags o características aplicables a un registro.
*   **UX Component:** Grid de checkboxes o multi-badge select dinámico.
*   **DB Column:** `value_json` (JSONB)
*   **JSON Options Contract:**
    ```json
    {
      "choices": ["Guantes", "Tapabocas", "Bata", "Cofia"]
    }
    ```

#### F. `checkbox` (Booleano / Interruptor)
*   **Propósito:** Verificación unitaria de estado (Sí/No, Activado/Desactivado).
*   **UX Component:** Switch/Checkbox visual interactivo.
*   **DB Column:** `value_boolean` (BOOLEAN)

#### G. `radio` (Opciones Exclusivas)
*   **Propósito:** Elección rápida entre un número pequeño de opciones (ej. turnos, estados).
*   **UX Component:** Grupo de radio buttons alineados horizontalmente.
*   **DB Column:** `value_text` (TEXT)
*   **JSON Options Contract:**
    ```json
    {
      "choices": ["Mañana", "Tarde", "Noche"]
    }
    ```

---

### 2.4 Categoría Avanzados y Especiales

#### A. `signature` (Firma Digital)
*   **Propósito:** Captura de firma manuscrita para validez jurídica y de trazabilidad (BPM, INVIMA).
*   **UX Component:** Lienzo interactivo HTML5 Canvas (`SignaturePad`) con botones de borrar, guardar y trazo responsivo.
*   **DB Column:** `value_text` (TEXT - almacena la URL de Supabase Storage)
*   **JSON Options Contract:**
    ```json
    {
      "required_role": "calidad",
      "storage_bucket": "documentos-sgc",
      "storage_path": "firmas/"
    }
    ```
*   **Runtime Behavior:** Serializa el trazo a Base64, lo sube al Bucket de Supabase Storage y registra la URL generada en el valor del campo.
*   **IA Readiness:** (Futuro) Verificación automática biométrica de firmas para evitar fraude documental.

#### B. `file_upload` (Carga de Evidencia)
*   **Propósito:** Soporte físico e irrefutable de hallazgos mediante fotos o documentos adjuntos.
*   **UX Component:** Zona de arrastrar y soltar archivos (`EvidenceUploader`) con integración directa a la cámara en dispositivos móviles (`capture="environment"`).
*   **DB Column:** `value_text` (O `value_json` si es múltiple - almacena URLs de storage)
*   **JSON Options Contract:**
    ```json
    {
      "accept": ["image/*", "application/pdf"],
      "maxSizeMB": 5.0,
      "multiple": false
    }
    ```
*   **IA Readiness:** **Crítica.** Escaneo OCR de documentos cargados y análisis de visión artificial en imágenes para verificar automáticamente si las áreas están realmente limpias o si hay objetos extraños.

#### C. `table` (Lote / Datos Tabulares Repetidos)
*   **Propósito:** Registro detallado de sub-items o filas repetitivas dentro de una sola respuesta (ej. toma de muestras individuales en un lote, registro de asistentes).
*   **UX Component:** Tabla de ingreso dinámico con botones para "Agregar Fila" y "Eliminar Fila".
*   **DB Column:** `value_json` (JSONB)
*   **JSON Options Contract:**
    ```json
    {
      "columns": [
        { "name": "muestra_no", "label": "Muestra", "type": "number" },
        { "name": "peso_g", "label": "Peso (g)", "type": "decimal" },
        { "name": "aprobado", "label": "¿Aprobado?", "type": "checkbox" }
      ]
    }
    ```

#### D. `calculated` (Campo Auto-Calculado)
*   **Propósito:** Campos que derivan su valor matemáticamente de otros campos del formulario para mitigar errores humanos.
*   **UX Component:** Input deshabilitado (sombreado) con animación de recarga.
*   **DB Column:** `value_number` o `value_text` según el resultado.
*   **JSON Options Contract:**
    ```json
    {
      "formula": "({peso_bruto} - {peso_tara})",
      "precision": 2
    }
    ```
*   **Runtime Behavior:** Escucha cambios en los campos del formulario, evalúa dinámicamente la expresión matemática en JS y actualiza el valor del estado central en tiempo real.

#### E. `workflow_status` (Estado del Flujo de Trabajo)
*   **Propósito:** Control de ciclo de vida del registro dentro de un proceso de aprobación.
*   **UX Component:** Badge visual coloreado con desplegable interactivo para roles autorizados.
*   **DB Column:** `value_text` (TEXT)
*   **JSON Options Contract:**
    ```json
    {
      "initial": "pendiente_revision",
      "states": {
        "pendiente_revision": { "label": "Pendiente", "color": "amber" },
        "aprobado": { "label": "Aprobado", "color": "green" },
        "rechazado": { "label": "Rechazado", "color": "red" }
      }
    }
    ```

---

## 3. ESQUEMA DE VALIDACIÓN EXTENSIBLE

Las validaciones definen los límites de los datos operacionales. Para garantizar la modularidad, **las reglas viven como metadatos en la base de datos** y se evalúan tanto en el Frontend (interacción) como en el Backend (integridad SQL).

```
   VALIDACIÓN DE CAMPO EN TIEMPO DE EJECUCIÓN (RUNTIME)
  
  [ Entrada Operador ] ──► [ Frontend Form Engine ]
                                  │
                       Evalúa options JSONB:
                       ├── Required?  ──► Borde rojo / Bloqueo Submit
                       ├── Min / Max? ──► Alerta crítica en caliente
                       └── Regex?     ──► Filtro de caracteres
                                  │
                                  ▼ (Pasa)
                           [ Supabase API ]
                                  │
                       PostgreSQL Check Constraints
                       & RLS Policies (Evita inyecciones)
                                  │
                                  ▼
                         [ Registro Exitoso ]
```

| Regla de Validación | Tipo de Datos | Estructura JSON en `options` | Comportamiento del Engine |
| :--- | :--- | :--- | :--- |
| **`required`** | Todos | `{"required": true}` | Evita el envío del formulario si el valor es nulo o vacío. Añade asterisco rojo `*` al label. |
| **`min`** | Numéricos | `{"min": 18.0}` | Límite inferior permitido. Muestra alerta de "Valor fuera de rango". |
| **`max`** | Numéricos | `{"max": 100.0}` | Límite superior permitido. Muestra alerta de "Valor fuera de rango". |
| **`regex`** | Alfanuméricos | `{"regex": "^[A-Z]{3}-[0-9]{3}$"}` | Expresión regular para validar formatos estrictos (ej. placas `AAA-123`). |
| **`range`** | Numéricos / Fechas | `{"range": {"from": 0.3, "to": 2.0}}` | Define un intervalo cerrado estricto. |
| **`decimal_precision`** | Decimales | `{"precision": 3}` | Fuerza el formateo decimal (ej. `0.300`). Redondea de forma automática en el submit. |
| **`conditional`** | Todos | `{"validate_if": {"field": "status", "is": "activo"}}` | Ejecuta la validación del campo solo si se cumple la condición. |
| **`unique`** | Alfanuméricos | `{"unique_in_day": true}` | Valida mediante query asíncrona que el valor no se repita el mismo día (evita duplicados). |
| **`critical_threshold`** | Mediciones | `{"critical_threshold": {"max": 4.0}}` | Dispara acciones automáticas de nivel crítico (correos, creación de registros CAPA). |
| **`warning_threshold`** | Mediciones | `{"warning_threshold": {"max": 2.0}}` | Muestra alertas visuales de advertencia en color amarillo/ámbar sin bloquear el flujo. |

---

## 4. CONTRATO DE DEPENDENCIAS Y LÓGICA DINÁMICA

La interactividad avanzada del formulario se logra mediante **reglas condicionales de comportamiento**. Estas reglas permiten crear formularios dinámicos autogestionados de acuerdo a las respuestas previas del operador.

### 4.1 Contrato del Gestor de Dependencias (`ConditionalFieldManager`)

Las reglas condicionales se configuran en `sgc_form_fields.options` mediante la clave `"dependencies"` que sigue este estándar JSON:

```json
{
  "dependencies": [
    {
      "action": "mostrar_campo_si" | "ocultar_si" | "bloquear_si" | "depende_de" | "calcular_desde",
      "conditions": [
        {
          "target_field_name": "area_recepcion",
          "operator": "equals" | "not_equals" | "greater_than" | "less_than" | "contains",
          "value": false
        }
      ]
    }
  ]
}
```

### 4.2 Casos de Operación Dinámica

#### A. Mostrar Campo Si (`mostrar_campo_si`)
*   **Caso de Uso:** Si el operario selecciona "No Cumple" en una verificación, se le debe forzar a ingresar la acción correctiva e imágenes de evidencia.
*   **Ejemplo JSON en campo `accion_correctiva`:**
    ```json
    {
      "dependencies": [
        {
          "action": "mostrar_campo_si",
          "conditions": [
            {
              "target_field_name": "limpieza_pisos",
              "operator": "equals",
              "value": false
            }
          ]
        }
      ]
    }
    ```

#### B. Bloquear Si (`bloquear_si`)
*   **Caso de Uso:** Deshabilitar la firma del supervisor si el operario aún no ha firmado el registro.
*   **Ejemplo JSON en campo `firma_supervisor`:**
    ```json
    {
      "dependencies": [
        {
          "action": "bloquear_si",
          "conditions": [
            {
              "target_field_name": "firma_operario",
              "operator": "equals",
              "value": null
            }
          ]
        }
      ]
    }
    ```

#### C. Calcular Desde (`calcular_desde`)
*   **Caso de Uso:** Calcular automáticamente el pH promedio o alertar si la desviación es muy alta.
*   **Ejemplo JSON en campo `promedio_ph`:**
    ```json
    {
      "action": "calcular_desde",
      "formula": "average",
      "fields": ["ph_muestra_1", "ph_muestra_2", "ph_muestra_3"]
    }
    ```

---

## 5. MATRIZ DE COMPATIBILIDAD DE MOTORES (ENGINE COMPATIBILITY)

Para evitar desbordamiento y malfuncionamiento a nivel de runtime, los motores de la aplicación (`engines`) tienen restricciones estrictas sobre qué tipos de campos pueden procesar correctamente.

| Tipo de Campo | BaseChecklist | BaseMediciones | BaseGeneric | BaseWorkflow (Futuro) | BaseTrazabilidad (Futuro) | BaseMantenimiento (Futuro) | BaseCapacitaciones (Futuro) | BaseDocumental (Futuro) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`text`** | ✅ *(Fallback)* | ✅ *(Observación)*| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`textarea`** | ✅ *(Observación)*| ✅ *(Acción)* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`number`** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **`decimal`** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **`temperature`**| ❌ | ✅ *(Crítico)* | ✅ | ❌ | ❌ | ✅ *(Cámaras)* | ❌ | ❌ |
| **`ph`** | ❌ | ✅ *(Crítico)* | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`cloro`** | ❌ | ✅ *(Crítico)* | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`date`** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`time`** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **`datetime`** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`select`** | ❌ | ❌ | ✅ | ✅ | ✅ *(Lotes/Equipos)*| ✅ *(Equipos)* | ✅ *(Temas)* | ✅ *(Vigencia)* |
| **`multiselect`**| ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ *(Asistentes)* | ❌ |
| **`checkbox`** | ✅ *(Cumplimiento)*| ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **`radio`** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **`signature`** | ✅ *(Operador)* | ✅ *(Supervisor)* | ✅ | ✅ | ❌ | ✅ *(Técnico)* | ✅ *(Asistente)*| ✅ *(Aprobador)*|
| **`file_upload`**| ✅ *(Evidencia)* | ✅ *(Evidencia)* | ✅ | ✅ | ✅ | ✅ *(Repuestos)* | ❌ | ✅ *(PDF Master)*|
| **`table`** | ❌ | ❌ | ✅ *(EAV)* | ✅ | ✅ *(Despacho)* | ✅ *(Repuestos)* | ✅ *(Personal)* | ❌ |
| **`calculated`** | ❌ | ✅ *(Promedios)* | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **`workflow_status`**| ❌ | ❌ | ✅ | ✅ *(Estados)* | ✅ | ✅ | ❌ | ✅ *(Lifecycle)*|

---

## 6. MAPEO RELACIONAL Y ARQUITECTURA SQL

La robustez de la base de datos se mantiene dividiendo de manera estricta el **CORE** (Configuración/Metadata) del **RUNTIME** (Operación/Transacciones), permitiendo la escalabilidad masiva y optimización de consultas.

### 6.1 Diagrama Entidad-Relación Físico (EAV)

```
========================================================================================
                                      [ NÚCLEO CORE ]
========================================================================================

  ┌────────────────────────┐             ┌────────────────────────┐
  │      sgc_modules       │             │       sgc_forms        │
  ├────────────────────────┤             ├────────────────────────┤
  │ PK  id           UUID  │─── 1:N ────►│ PK  id           UUID  │
  │     name         TEXT  │             │ FK  module_id    UUID  │
  │     slug         TEXT  │             │     name         TEXT  │
  │     icon         TEXT  │             │     slug         TEXT  │
  │     description  TEXT  │             │     engine_type  TEXT  │
  │     is_active    BOOL  │             │     roles_allowed TEXT[]│
  └────────────────────────┘             └───────────┬────────────┘
                                                     │
                                                    1:N
                                                     │
                                                     ▼
                                         ┌────────────────────────┐
                                         │    sgc_form_fields     │
                                         ├────────────────────────┤
                                         │ PK  id           UUID  │
                                         │ FK  form_id      UUID  │
                                         │     name         TEXT  │
                                         │     label        TEXT  │
                                         │     field_type   TEXT  │
                                         │     options      JSONB │
                                         │     required     BOOL  │
                                         │     order_index  INT   │
                                         └────────────────────────┘

========================================================================================
                                    [ NÚCLEO RUNTIME ]
========================================================================================

  ┌────────────────────────┐             ┌────────────────────────┐
  │   sgc_form_responses   │             │  sgc_response_values   │
  ├────────────────────────┤             ├────────────────────────┤
  │ PK  id           UUID  │─── 1:N ────►│ PK  id           UUID  │
  │ FK  form_id      UUID  │             │ FK  response_id  UUID  │
  │ FK  created_by   UUID  │─── 1:N ────►│ FK  field_id     UUID  │
  │     status       TEXT  │             │     value_text   TEXT  │
  │ FK  verified_by  UUID  │             │     value_number NUMERIC│
  │     verified_at  TIMESTAMPTZ         │     value_boolean BOOL  │
  │     comment      TEXT  │             │     value_json   JSONB │
  └──────────┬─────────────┘             └────────────────────────┘
             │
            1:N
             │
             ├───────────────────────────┐
             ▼                           ▼
  ┌────────────────────────┐   ┌────────────────────────┐
  │     sgc_evidences      │   │     sgc_audit_logs     │
  ├────────────────────────┤   ├────────────────────────┤
  │ PK  id           UUID  │   │ PK  id           UUID  │
  │ FK  response_id  UUID  │   │ FK  response_id  UUID  │
  │     file_url     TEXT  │   │     action_type  TEXT  │
  │     storage_path TEXT  │   │ FK  modified_by  UUID  │
  │     file_type    TEXT  │   │     old_data     JSONB │
  │     created_at   TIMESTAMPTZ     │     new_data     JSONB │
  └────────────────────────┘   └────────────────────────┘
```

### 6.2 Separación del Core y Runtime en el Ciclo de Vida del Dato

*   **CORE (Modificación Lenta / Catálogos):** Contiene la definición estructural del formulario. Los cambios en el CORE solo los realizan administradores a través del "Form Builder" o mediante scripts de siembra controlados.
*   **RUNTIME (Modificación Rápida / Transaccional):** Registra las actividades diarias de las plantas. Crece a un ritmo de miles de registros al mes. Las políticas de retención, archivado y compresión se aplican exclusivamente en las tablas RUNTIME.

---

## 7. COMPATIBILIDAD CON INTELIGENCIA ARTIFICIAL (IA READY)

El diseño de este esquema de campos está concebido de forma nativa para interactuar con motores de **Machine Learning e IA Generativa**, permitiendo análisis predictivos avanzados sobre la calidad operacional de DM Distribuciones.

### 7.1 Taxonomía de IA (`ia_tags`) en el Esquema de Campos

Cada campo en `sgc_form_fields` puede contener etiquetas semánticas universales dentro de su metadata (`options.ia_tags: string[]`). Estas etiquetas permiten que el motor de IA orqueste y entienda el significado físico del campo sin importar cómo lo haya nombrado el usuario.

| IA Tag Oficial | Propósito | Ejemplo de Aplicación | Algoritmo de IA Asociado |
| :--- | :--- | :--- | :--- |
| **`#temperatura`** | Monitoreo térmico | Temperatura de refrigeradores | **Anomaly Detection:** Detección automática de desviaciones fuera de la tendencia histórica de la máquina. |
| **`#ph`** | Calidad fisicoquímica | pH de agua de lavado | **Predictive Alerts:** Alerta predictiva sobre degradación microbiológica del agua. |
| **`#cloro_ppm`** | Control sanitario | Concentración de desinfectante | **Compliance Scoring:** Evaluación automática del nivel de cumplimiento microbiológico diario. |
| **`#evidencia_foto`**| Imagen adjunta | Foto de limpieza de estanterías | **Vision AI:** Clasificación de imágenes para verificar limpieza real y ausencia de contaminación visual. |
| **`#firma_auditoria`**| Firma digital | Firma de operador/supervisor | **Fraud Detection:** Autenticación biométrica gráfica contra patrones históricos de firma. |
| **`#lote_trazabilidad`**| Identificación | Lotes de despacho o recepción | **Graph Analysis:** Mapeo de la cadena de suministro en grafos para procesos de *recall* inmediato en menos de 5 segundos. |

---

## 8. REGLAS DE ALMACENAMIENTO (STORAGE) Y EXPORTACIÓN

### 8.1 Políticas de Almacenamiento Físico (Supabase Storage)

Los archivos físicos (firmas y evidencias) se cargan en el bucket público de Supabase `documentos-sgc`. El almacenamiento está estructurado de acuerdo al siguiente patrón modular de rutas:

```
📁 documentos-sgc/
  ├── 📁 {slug-del-modulo}/
  │     ├── 📁 {slug-del-formulario}/
  │     │     ├── 📁 evidencias/
  │     │     │     └── 📄 {response_id}_{field_id}_{timestamp}.png
  │     │     └── 📁 firmas/
  │     │           └── 📄 {response_id}_{field_id}_{timestamp}.png
```

*   **Seguridad RLS en Storage:** Se deniega el borrado (`DELETE`) u modificación (`UPDATE`) de objetos de evidencias cargados a cualquier rol una vez que la respuesta ha sido guardada en base de datos.
*   **Optimización de Carga:** El componente `EvidenceUploader` comprime las imágenes a formato WebP del lado del cliente antes de subirlas al bucket, reduciendo el consumo de ancho de banda y almacenamiento en un 75%.

### 8.2 Reglas de Exportación de Datos

El estándar de metadatos asegura una interoperabilidad total de exportación sin desarrollar scripts manuales por cada formulario nuevo:

1.  **Exportación a Excel (Planillas de Calidad):**
    *   Los campos con tipo `calculated` y `number` se exportan con formato numérico nativo de Excel.
    *   Las firmas (`signature`) se renderizan como texto indicando `[Firmado Digitalmente por: ID]`.
    *   Las evidencias fotográficas se incrustan como hipervínculos a la URL del Storage de Supabase.
2.  **Exportación a PDF Oficial (Reporte Legal INVIMA):**
    *   Se utiliza un orquestador dinámico basado en `jsPDF` y `AutoTable` que lee el `order_index` de `sgc_form_fields` para maquetar el reporte con exactitud estructural.
    *   Las firmas digitales se descargan de Supabase Storage en tiempo de generación e incrustan como imágenes reales en el pie del PDF.
    *   Los badges de `workflow_status` se dibujan con colores vectoriales aprobados.

---

## 9. DETECCIÓN DE INCONSISTENCIAS Y RECOMENDACIONES DE NORMALIZACIÓN
*(Resultado de la Auditoría Técnica sobre el Código Fuente Actual)*

Al auditar la lógica actual del frontend (`src/components/engines`) y el esquema SQL existente, se han detectado las siguientes discrepancias contractuales que requieren atención inmediata a nivel de arquitectura:

### 9.1 Overlaps y Lógica Duplicada en Engines
*   **El Problema:** El motor `BaseChecklist` maneja exclusivamente campos `boolean` como radio buttons "Cumple/No Cumple" y campos `signature`, pero ante cualquier otro campo recurre a una etiqueta `<textarea>` genérica. Por otro lado, `BaseMediciones` repite la lógica de inyección de `SignaturePad` y `<textarea>` pero introduce la lógica de rangos.
*   **La Inconsistencia:** Si un checklist requiere un selector (`select`) para ingresar el turno de trabajo, el motor fallará o renderizará un `<textarea>`, rompiendo la UX. La firma digital y el campo de observaciones de texto están duplicados estructuralmente a lo largo de los 3 motores (`BaseChecklist`, `BaseMediciones`, `BaseGeneric`).
*   **Recomendación de Normalización:** Se aconseja unificar el renderizado de campos individuales en un componente central llamado `DynamicFieldRenderer`. Cada motor de orquestación (`BaseChecklist`, `BaseMediciones`) solo debe definir la **disposición espacial (layout)** de la pantalla (ej. listado táctil con fondo rojo en checklist, grid de 2 columnas en mediciones), delegando la visualización del input individual al componente unificado.

### 9.2 Acoplamiento de la Validación Numérica en el Frontend
*   **El Problema:** La lógica para determinar si una medición de pH o cloro libre es crítica se encuentra quemada dentro del componente `BaseMediciones.jsx` (evaluando `state = 'critical'` con base en `field.options?.min` y `max`). La base de datos guarda pasivamente el valor numérico en `value_number` sin validar los límites.
*   **La Inconsistencia:** Un usuario con acceso API a Supabase puede guardar un pH de `-5.0` o `99.0` y el backend lo guardará exitosamente. Además, el estado final del registro (`status`) en `sgc_form_responses` se queda en `pendiente_revision` en lugar de autoevaluarse como `alerta` o `no_conforme` a nivel de servidor.
*   **Recomendación de Normalización:**
    1.  Implementar un trigger en PostgreSQL (`tg_validate_eav_limits`) que, al insertar en `sgc_response_values`, compare el valor numérico contra las opciones paramétricas `min` y `max` de su correspondiente `field_id`.
    2.  Hacer que el propio servidor Supabase clasifique el estado de alerta del registro en base de datos.

### 9.3 Inconsistencia en la Definición de Booleanos entre BaseChecklist y BaseGeneric
*   **El Problema:** En `BaseChecklist.jsx`, un campo `boolean` se renderiza como botones de selección excluyentes (Radio Buttons) con los textos "Cumple" y "No Cumple", mapeando el valor a `true` y `false`. En cambio, en `BaseGeneric.jsx`, un campo `boolean` se renderiza como una única casilla de verificación (`checkbox`) etiquetada como "Cumple / Sí", retornando `true` o `false`.
*   **La Inconsistencia:** Esta diferencia de comportamiento visual confunde al operador. Para auditorías normativas de calidad, es imperativo que el operador confirme activamente una opción binaria en lugar de dejar un checkbox desmarcado (que podría interpretarse como una omisión).
*   **Recomendación de Normalización:** Estandarizar que todos los campos booleanos operacionales se rendericen bajo un control de selección excluyente bidireccional (Radio Buttons o Switch con confirmación visual) para forzar una decisión explícita.

---

## 10. ROADMAP DE IMPLEMENTACIÓN DEL ESQUEMA

Para transicionar con éxito de la arquitectura digitalizada actual a la plataforma Enterprise basada en `docs/field_schema.md`, se propone el siguiente flujo evolutivo estructurado:

```
[ FASE 1: Contrato ] ──► [ FASE 2: Normalización ] ──► [ FASE 3: Enforzamiento ] ──► [ FASE 4: IA Ready ]
  Establecer este            Extraer renderers a           Crear Check Constraints y         Habilitar ia_tags
  diccionario como           DynamicFieldRenderer.         Triggers en Supabase para        para análisis de
  la verdad técnica.        Unificar CSS en Tailwind.       blindar validez de datos.        tendencias de cold-chain.
```

Este manual de contratos garantiza un desarrollo predecible, seguro y de clase mundial para el **Sistema de Gestión de Calidad (SGC-DM)**. Cualquier adición de campo o nuevo formulario debe validar su alineación estructural con este estándar.

---
**Documento redactado y validado por:** Arquitectura Técnica de Software SGC-DM  
**Última Modificación:** Mayo 2026  
**Estatus:** **VIGENTE - CONTRATO CENTRAL**
