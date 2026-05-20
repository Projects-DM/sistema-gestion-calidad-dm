# MOTORES DINÁMICOS DE RENDERIZADO - SGC EMPRESARIAL

**Documento:** Especificación Técnica de Motores  
**Versión:** 1.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. INTRODUCCIÓN A LOS MOTORES DINÁMICOS

### 1.1 Concepto

Los **Motores Dinámicos de Renderizado** son componentes React especializados que interpretan la configuración almacenada en el modelo EAV y generan interfaces de usuario específicas para cada tipo de formulario. Cada motor está optimizado para un dominio de datos particular (checklists booleanos, mediciones numéricas, CRUD de tablas, auditorías, etc.).

### 1.2 Arquitectura Plugin

```
┌────────────────────────────────────────────────────────────────────┐
│                        DynamicForm.jsx                              │
│                     (Orquestador Principal)                         │
│                                                                     │
│  Recibe: formDef, fields, valores, callbacks                        │
│  Decide: ¿Qué motor cargar según engine_type?                       │
│                                                                     │
│  switch (formDef.engine_type) {                                     │
│    case 'BaseChecklist' → <BaseChecklist fields values onChange />  │
│    case 'BaseMediciones' → <BaseMediciones fields values onChange />│
│    case 'BaseCRUD'       → <BaseCRUD fields values onChange />      │
│    case 'BaseAuditoria'  → <BaseAuditoria fields values onChange /> │
│    default              → <BaseGeneric fields values onChange />    │
│  }                                                                  │
└────────────────────────────────────────────────────────────────────┘
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  BaseChecklist  │ │ BaseMediciones │ │   BaseCRUD     │ │  BaseAuditoria │
│  (Boolean)      │ │  (Numeric)     │ │  (Tablas)      │ │  (Inspección)  │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
         │                 │                 │                 │
         └─────────────────┴─────────────────┴─────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   BaseGeneric (Fallback)     │
                    │   (Cubre field_types varios) │
                    └─────────────────────────────┘
```

### 1.3 Contrato de Motor

Todos los motores comparten la misma interfaz de propiedades (props):

```javascript
// Contrato estándar de motor
MotorProps = {
  fields: Array<{
    id: UUID,
    name: string,
    label: string,
    field_type: 'boolean' | 'number' | 'text' | 'textarea' | 'select' | 'date' | 'time' | 'signature',
    options?: { min?: number, max?: number, unit?: string, choices?: string[] },
    required: boolean,
    order_index: number
  }>,
  values: Record<UUID, any>,    // Estado actual del formulario { fieldId: value }
  onChange: (fieldId: UUID, value: any) => void  // Callback de actualización
}
```

### 1.4 Principios de Diseño de Motores

| Principio | Descripción |
|-----------|-------------|
| **Responsabilidad única** | Cada motor se especializa en un tipo de interacción de datos |
| **Sin estado interno** | El estado lo gestiona DynamicForm, los motores solo renderizan |
| **Composición sobre herencia** | Los motores importan componentes compartidos (SignaturePad) |
| **Validación visual** | Feedback visual inmediato (colores, alertas) según los datos |
| **Responsive por defecto** | Todos los motores se adaptan a mobile, tablet y desktop |
| **Extensibilidad** | Nuevos motores se agregan sin modificar los existentes |

---

## 2. MOTOR: BaseChecklist

### 2.1 Identificación

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseChecklist` |
| **Archivo** | `src/components/engines/BaseChecklist.jsx` |
| **Versión** | 1.0 |
| **Dependencias** | `SignaturePad` (para firmas) |

### 2.2 Propósito

Formularios de verificación punto a punto donde cada ítem se evalúa como **Cumple/No Cumple** (booleano). Optimizado para inspecciones visuales rápidas en tablets.

### 2.3 Casos de Uso

| Módulo | Formulario | Descripción |
|--------|------------|-------------|
| Operaciones | Checklist de Limpieza y Desinfección | Verificación diaria de áreas |
| Operaciones | Inspección de BPM | Buenas Prácticas de Manufactura |
| Operaciones | Control de Plagas | Verificación de estaciones y registros |
| Calidad | Auditoría Interna | Checklist de requisitos normativos |
| Calidad | Verificación de Proveedores | Evaluación de cumplimiento |

### 2.4 Mapeo de field_types

| field_type | Renderizado | Comportamiento |
|------------|-------------|----------------|
| `boolean` | Radio buttons (Cumple/No Cumple) | Verde para true, rojo para false |
| `signature` | SignaturePad (Canvas HTML5) | Captura de firma digital |
| `text` | Textarea | Observaciones o notas adicionales |
| Cualquier otro | Textarea (fallback) | Entrada de texto genérica |

### 2.5 Estructura de Renderizado

```
┌──────────────────────────────────────────────────────────────┐
│  [Motor de Checklist Activado]                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  ✔ Área de Recepción limpia             ● Cumple  ○ No   │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  ✔ Estanterías organizadas              ○ Cumple  ● No   │ │ 🔴
│  ├──────────────────────────────────────────────────────────┤ │
│  │  ✔ Pasillos despejados                  ● Cumple  ○ No   │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │    Observaciones adicionales                              │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Se encontraron cajas en el pasillo principal...      │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │  ✔ Firma del Responsable                                 │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │                    [SignaturePad]                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.6 Características Técnicas

**Renderizado condicional por field_type:**
```javascript
const renderFieldInput = (field) => {
  if (field.field_type === 'boolean') {
    return (
      <div className="flex gap-4">
        <label>
          <input type="radio" name={field.id}
            checked={values[field.id] === true}
            onChange={() => onChange(field.id, true)} />
          <span>Cumple</span>
        </label>
        <label>
          <input type="radio" name={field.id}
            checked={values[field.id] === false}
            onChange={() => onChange(field.id, false)} />
          <span>No Cumple</span>
        </label>
      </div>
    );
  }
  // Signature y textarea...
};
```

**Resaltado visual de incumplimientos:**
```javascript
// Clase condicional en el contenedor del campo:
`border ${values[field.id] === false ? 'border-red-300 bg-red-50/50' : 'border-gray-100'}`
```

### 2.7 Ventajas

- ✅ **Interfaz táctil optimizada** — Radio buttons grandes, fáciles de tocar en tablet
- ✅ **Feedback visual inmediato** — Los "No Cumple" se resaltan en rojo automáticamente
- ✅ **Flujo rápido** — Ideal para operarios que completan múltiples checklists al día
- ✅ **Sin carga cognitiva** — Solo dos opciones por ítem, decisión binaria

### 2.8 Limitaciones

- ⚠️ **Solo booleanos y texto** — No soporta campos numéricos, selects, fechas
- ⚠️ **Sin grid** — Diseño lineal (1 columna), no aprovecha espacio horizontal
- ⚠️ **Sin validación de rango** — No aplica para datos cuantitativos

### 2.9 Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Fatiga del operario con muchos ítems | Medio | Agrupar por secciones, límite de 20 ítems por vista |
| Error de selección (tocar opción incorrecta) | Bajo | Confirmación antes de envío, revisión en historial |

### 2.10 Escalabilidad

- **Campos soportados**: Ilimitados (práctico: 5-30 por formulario)
- **Performance**: Constante O(n) — sin dependencia de volumen de datos
- **Recomendación futura**: Agrupar campos por secciones con acordeones

---

## 3. MOTOR: BaseMediciones

### 3.1 Identificación

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseMediciones` |
| **Archivo** | `src/components/engines/BaseMediciones.jsx` |
| **Versión** | 1.0 |
| **Dependencias** | `SignaturePad`, `lucide-react` (AlertTriangle, Info) |

### 3.2 Propósito

Registro de parámetros cuantitativos con validación en tiempo real de rangos de tolerancia. Ideal para controles fisicoquímicos, mediciones ambientales y calibraciones.

### 3.3 Casos de Uso

| Módulo | Formulario | Parámetros Típicos |
|--------|------------|-------------------|
| Medición y Control | Control de Cloro y pH | Cloro (0.3-2.0 ppm), pH (6.5-9.0) |
| Medición y Control | Temperatura de Cámaras | Temperatura (-18°C a -22°C o 2°C a 8°C) |
| Medición y Control | Peso de Productos | Peso con tolerancia ±5% |
| Mantenimiento | Calibración de Equipos | Precisión, exactitud, desviación |

### 3.4 Mapeo de field_types

| field_type | Renderizado | Validación |
|------------|-------------|------------|
| `number` | Input numérico con step=0.01 | Validación de rango (min/max) con feedback visual |
| `signature` | SignaturePad (full width) | Captura de firma digital |
| `text` | Textarea (full width) | Observaciones, acciones correctivas |
| `textarea` | Textarea (full width) | Notas extendidas |

### 3.5 Sistema de Validación de Rangos

```javascript
const getValidationState = (field, val) => {
  if (val === '' || val === null || isNaN(val)) return null;

  const min = field.options?.min;
  const max = field.options?.max;

  if (min !== undefined && val < min) return 'critical';
  if (max !== undefined && val > max) return 'critical';
  return 'ok';
};
```

**Estados visuales:**
| Estado | Borde del input | Background | Indicador |
|--------|----------------|------------|-----------|
| `null` (sin dato) | gray-300 | white | — |
| `ok` (en rango) | green-500 | white | ✅ |
| `critical` (fuera de rango) | red-500 | red-50 | 🚫 + mensaje de alerta |

### 3.6 Estructura de Renderizado

```
┌──────────────────────────────────────────────────────────────┐
│  [Motor de Mediciones Activado]                               │
│  ┌──────────────────────────┐ ┌──────────────────────────┐   │
│  │  Cloro Residual Libre    │ │  Nivel de pH            │   │
│  │  ┌──────────────────┐    │ │  ┌──────────────────┐   │   │
│  │  │ 1.2         ppm  │    │ │  │ 7.3        pH   │   │   │
│  │  └──────────────────┘    │ │  └──────🟢─────────┘   │   │
│  │  Rango: 0.3 - 2.0 ppm   │ │  Rango: 6.5 - 9.0 pH  │   │
│  └──────────────────────────┘ └──────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────┐ ┌──────────────────────────┐   │
│  │  Temperatura             │ │                          │   │
│  │  ┌──────────────────┐    │ │                          │   │
│  │  │ 5.2         °C   │    │ │                          │   │
│  │  └──────🔴──────────┘    │ │                          │   │
│  │  ⚠️ Valor crítico.       │ │                          │   │
│  │  Fuera de rango (2-8)    │ │                          │   │
│  └──────────────────────────┘ └──────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Acciones correctivas                                   │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │ Se ajustó la temperatura de la cámara...           ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Firma del Responsable                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │                    [SignaturePad]                   ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3.7 Características Técnicas

**Grid responsive de 2 columnas:**
```javascript
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {fields.map(field => (
    // Renderizado por field_type...
  ))}
</div>
```

**Unidades de medida dinámicas:**
```javascript
{field.options?.unit && (
  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
    {field.options.unit}
  </span>
)}
```

### 3.8 Ventajas

- ✅ **Validación en tiempo real** — Feedback inmediato al usuario sobre valores fuera de rango
- ✅ **Grid de 2 columnas** — Aprovecha espacio horizontal en desktop
- ✅ **Unidades dinámicas** — Configurables desde BD (ppm, pH, °C, kg, etc.)
- ✅ **Alertas críticas automáticas** — Sin necesidad de lógica adicional en el orquestador
- ✅ **Tipado numérico** — Input type="number" con step decimal

### 3.9 Limitaciones

- ⚠️ **Sin selects ni opciones** — No soporta dropdowns, solo números y texto
- ⚠️ **Sin gráficos** — Los valores históricos no se visualizan como tendencias
- ⚠️ **Sin validación cruzada** — No puede validar relaciones entre campos (ej: pH + temperatura)

### 3.10 Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Error de ingreso (decimal mal colocado) | Medio | step=0.01, validación de formato |
| Valores extremos no capturados | Medio | El rango min/max se configura en BD |
| Sin historial de tendencias | Alto (futuro) | BaseMediciones v2 con gráfico de tendencias |

### 3.11 Escalabilidad

- **Campos soportados**: Ilimitados (práctico: 4-20 por formulario)
- **Performance**: Constante O(n) — sin dependencia de volumen de datos
- **Recomendación futura**: Agregar visualización de tendencias con Chart.js

---

## 4. MOTOR: BaseGeneric

### 4.1 Identificación

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseGeneric` (fallback por defecto) |
| **Archivo** | `src/components/engines/BaseGeneric.jsx` |
| **Versión** | 1.0 |
| **Dependencias** | `SignaturePad` |

### 4.2 Propósito

Motor genérico de propósito general que soporta todos los field_types del sistema. Actúa como **fallback** cuando no hay un motor especializado para el engine_type solicitado.

### 4.3 Mapeo de field_types

| field_type | Renderizado | Componente HTML |
|------------|-------------|-----------------|
| `text` | Input single-line | `<input type="text">` |
| `number` | Input numérico | `<input type="number">` |
| `boolean` | Checkbox | `<input type="checkbox">` |
| `select` | Dropdown con opciones | `<select>` con `<option>` desde field.options.choices |
| `textarea` | Textarea multi-line | `<textarea>` |
| `date` | Date picker | `<input type="date">` |
| `time` | Time picker | `<input type="time">` |
| `signature` | Firma digital | `<SignaturePad>` |

### 4.4 Estructura de Renderizado

```
┌──────────────────────────────────────────────────────────────┐
│  Grid de 2 columnas                                           │
│                                                               │
│  ┌──────────────────────────┐ ┌──────────────────────────┐   │
│  │  Nombre del Campo        │ │  Fecha de Inspección     │   │
│  │  ┌────────────────────┐  │ │  ┌────────────────────┐  │   │
│  │  │                    │  │ │  │ 2026-05-18         │  │   │
│  │  └────────────────────┘  │ │  └────────────────────┘  │   │
│  └──────────────────────────┘ └──────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────┐ ┌──────────────────────────┐   │
│  │  Tipo de Inspección      │ │  Cumple Requisitos       │   │
│  │  ┌────────────────────┐  │ │  ☑️ Cumple / Sí          │   │
│  │  │ Rutinaria          ▼│  │ │                          │   │
│  │  └────────────────────┘  │ │                          │   │
│  └──────────────────────────┘ └──────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Observaciones                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │                                                     ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Firma del Responsable                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │                    [SignaturePad]                   ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 4.5 Ventajas

- ✅ **Soporte universal** — Cubre todos los field_types existentes
- ✅ **Grid de 2 columnas** — Layout profesional y aprovechamiento de espacio
- ✅ **Sin dependencias externas** — Solo SignaturePad y HTML nativo
- ✅ **Extensible** — Agregar un nuevo case en el switch es trivial

### 4.6 Limitaciones

- ⚠️ **Sin validación especializada** — No hay validación de rangos (como BaseMediciones)
- ⚠️ **Checklist plano** — No tiene el resaltado visual de BaseChecklist
- ⚠️ **Sin optimización táctil** — Los inputs nativos no están optimizados para tablet

### 4.7 Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Usado como default sin considerar el dominio | Medio | Elegir motor especializado cuando sea posible |
| Input type="number" acepta texto en algunos navegadores | Bajo | Validación adicional en submit |

---

## 5. MOTOR: BaseCRUD

### 5.1 Identificación

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseCRUD` |
| **Archivo** | `src/components/engines/BaseCRUD.jsx` |
| **Versión** | 1.0 |
| **Estado** | Implementado |

### 5.2 Propósito

Motor para gestión de datos tabulares donde se requiere crear, editar, listar y eliminar registros en una tabla dinámica. Útil para catálogos, inventarios y listas de datos maestros.

### 5.3 Casos de Uso

- Catálogo de equipos
- Lista de proveedores
- Inventario de insumos
- Registro de productos
- Tablas de parámetros de referencia

### 5.4 Características

- Tabla dinámica con columnas configurables desde BD
- Modal/Create para nuevo registro
- Edición inline o en modal
- Eliminación con confirmación
- Búsqueda y filtros
- Paginación

### 5.5 Dependencias

- `dynamicService.js` (operaciones CRUD estándar)
- EAV para metadatos, con tabla satélite opcional para datos complejos

---

## 6. MOTOR: BaseAuditoria

### 6.1 Identificación

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseAuditoria` |
| **Archivo** | `src/components/engines/BaseAuditoria.jsx` |
| **Versión** | 1.0 |
| **Estado** | Implementado |

### 6.2 Propósito

Motor especializado para la realización de auditorías internas y externas con checklist de requisitos normativos, hallazgos, clasificación de no conformidades y generación de informes.

### 6.3 Casos de Uso

- Auditorías internas de calidad
- Auditorías externas INVIMA
- Verificaciones de cumplimiento BPM/HACCP
- Evaluación de requisitos ISO 9001
- Inspecciones reglamentarias

### 6.4 Características Propuestas

- Checklist de requisitos normativos por módulo
- Clasificación de hallazgos (Mayor/Menor/Observación)
- Asignación de responsables de acción correctiva
- Plazos de cierre
- Generación automática de informe de auditoría
- Seguimiento de eficacia de acciones

---

## 7. MOTORES FUTUROS (PLANEADOS)

### 7.1 BaseMantenimiento

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseMantenimiento` |
| **Estado** | Planeado (Q3 2026) |

**Propósito:** Gestión de mantenimientos preventivos y correctivos de equipos e infraestructura.

**Características:**
- Selector de equipo con búsqueda (datos desde `sgc_equipos`)
- Tipo de mantenimiento (preventivo/correctivo/calibración)
- Checklist de actividades realizadas
- Registro de repuestos utilizados (`sgc_mantenimiento_repuestos`)
- Cálculo automático de próxima fecha de mantenimiento
- Firma de técnico y supervisor
- Evidencias fotográficas obligatorias
- Dashboard de equipos con alertas de vencimiento

**Tablas Satélite:**
```sql
sgc_equipos (id, codigo, nombre, ubicacion, frecuencia_mantenimiento,
             ultimo_mantenimiento, proximo_mantenimiento)
sgc_mantenimiento_repuestos (id, response_id, repuesto, cantidad, costo)
```

### 7.2 BaseCalidad

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseCalidad` |
| **Estado** | Planeado (Q3 2026) |

**Propósito:** Gestión de PQRS, No Conformidades, CAPA (Corrective and Preventive Actions) y mejora continua.

**Características:**
- Clasificación de hallazgo (PQR/NC/Observación/Recall)
- Severidad (Menor/Mayor/Crítica)
- Análisis de causa raíz (5 Whys, Ishikawa)
- Plan de acción correctiva (CAPA)
- Responsables y fechas de compromiso
- Seguimiento de eficacia
- Workflow de aprobación multi-nivel
- Dashboard de NC con indicadores

**Tablas Satélite:**
```sql
sgc_capa (id, response_id, causa_raiz, accion_correctiva,
          accion_preventiva, responsable, fecha_compromiso,
          fecha_cierre, eficacia_verificada)
```

### 7.3 BaseDocumental

| Atributo | Valor |
|----------|-------|
| **engine_type** | `BaseDocumental` |
| **Estado** | Planeado (Q3-Q4 2026) |

**Propósito:** Control de documentos y registros del SGC con versionamiento, aprobación y obsolescencia controlada.

**Características:**
- Metadatos de documento (código, versión, fecha de emisión)
- Control de cambios con historial
- Flujo de aprobación (elaborador → revisor → aprobador)
- Versionamiento automático
- Obsolescencia controlada con fecha de revisión
- Firma electrónica de aprobadores
- Matriz de documentos (lista maestra)
- Alertas de revisión próxima a vencer

**Tablas Satélite:**
```sql
sgc_documentos_control (id, codigo, titulo, version, fecha_emision,
                        fecha_revision, estado, aprobado_por, file_url)
```

---

## 8. MATRIZ DE COMPARACIÓN DE MOTORES

| Característica | BaseChecklist | BaseMediciones | BaseGeneric | BaseCRUD | BaseAuditoria |
|----------------|:---:|:---:|:---:|:---:|:---:|
| **field_types soportados** | boolean, signature, text | number, signature, text | Todos | Todos | Todos |
| **Validación de rangos** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Grid responsive** | ❌ (1 col) | ✅ (2 cols) | ✅ (2 cols) | ✅ (tabla) | ✅ (mixto) |
| **Resaltado de incumplimientos** | ✅ (rojo) | ✅ (rojo/verde) | ❌ | ❌ | ✅ |
| **SignaturePad** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Optimizado para tablet** | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| **Datos tabulares** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Workflow de aprobación** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Complejidad técnica** | Baja | Media | Baja | Media | Alta |
| **Reutilización** | Alta | Alta | Alta | Alta | Alta |

---

## 9. DEPENDENCIAS TRANSVERSALES

### 9.1 EvidenceUploader

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/components/EvidenceUploader.jsx` |
| **Versión** | 1.0 |
| **Dependencias** | `@supabase/supabase-js` (getSupabaseClient) |
| **Bucket** | `documentos-sgc` |

**Propósito:** Componente universal de carga de evidencias fotográficas y archivos adjuntos.

**Flujo de subida:**
```
Usuario → Selecciona imagen (cámara/galería) → Genera fileName único
→ Upload a Supabase Storage → Obtiene publicUrl → Almacena en sgc_evidences
```

**Métodos de captura:**
- **Subir Archivo**: Input file con accept="image/*,application/pdf"
- **Tomar Foto**: Input file con capture="environment" (cámara en mobile)

### 9.2 SignaturePad

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/components/SignaturePad.jsx` |
| **Versión** | 1.0 |

**Propósito:** Captura de firmas digitales mediante Canvas HTML5.

**Flujo:**
```
Usuario dibuja firma en Canvas → toDataURL('image/png') → Upload a Storage
→ URL pública → Se asocia al valor del campo signature en sgc_response_values
```

### 9.3 useAuth (Hook)

| Atributo | Valor |
|----------|-------|
| **Archivo** | `src/hooks/useAuth.js` |
| **Versión** | 1.0 |

**Propósito:** Proveer contexto de autenticación a toda la aplicación.

**Retorna:**
```javascript
{
  user: { id, email, user_metadata },
  rol: string,        // 'administrador' | 'calidad' | 'operativo'
  loading: boolean,
  signOut: () => void
}
```

---

## 10. PATRÓN DE EXTENSIÓN DE MOTORES

### 10.1 Proceso para Agregar un Nuevo Motor

```
PASO 1: Definir el dominio
├── ¿Qué tipo de datos maneja? (booleanos, números, texto, tablas)
├── ¿Qué validaciones especializadas requiere?
├── ¿Qué componentes transversales necesita?
└── ¿Qué tablas satélite requiere?

PASO 2: Crear el componente
├── Ubicación: src/components/engines/BaseNuevoMotor.jsx
├── Implementar contrato: { fields, values, onChange }
├── Implementar renderizado para cada field_type soportado
├── Importar componentes transversales (SignaturePad, etc.)
└── Estilos: Tailwind, responsive, estados visuales

PASO 3: Registrar en DynamicForm.jsx
├── Importar el componente
├── Agregar case en el switch(engine_type)
└── (Opcional) Registrar en EngineRegistry

PASO 4: Configurar en Base de Datos
├── INSERT en sgc_forms: engine_type = 'BaseNuevoMotor'
├── INSERT en sgc_form_fields: campos con field_types soportados
└── Verificar que roles_allowed sea correcto

PASO 5: Probar
├── Unit test del motor (Vitest)
├── Integration test del flujo completo (Playwright)
└── Verificar en mobile, tablet y desktop
```

### 10.2 Checklist de Calidad para Nuevos Motores

- [ ] Implementa el contrato estándar `{ fields, values, onChange }`
- [ ] Soporta al menos los field_types que declara
- [ ] Maneja correctamente estados vacíos, con datos y de error
- [ ] Es responsive (mobile, tablet, desktop)
- [ ] Integra SignaturePad cuando hay campos signature
- [ ] Proporciona feedback visual inmediato
- [ ] No maneja estado interno (lo gestiona DynamicForm)
- [ ] No tiene dependencias circulares
- [ ] Está documentado en /docs/arquitectura/02-motores-dinamicos.md

---

## 11. RIESGOS Y ESCALABILIDAD

### 11.1 Riesgos de Motores

| ID | Riesgo | Motor Afectado | Severidad | Mitigación |
|----|--------|----------------|-----------|------------|
| **MOT-01** | Motor incorrecto para el tipo de datos | Todos | Medio | Selección cuidadosa de engine_type en BD |
| **MOT-02** | Crecimiento excesivo de cases en DynamicForm | Orquestador | Medio | Implementar EngineRegistry con lazy loading |
| **MOT-03** | Duplicación de lógica entre motores | BaseChecklist/BaseGeneric | Medio | Extraer lógica común a hooks compartidos |
| **MOT-04** | Motor sin soporte para nuevo field_type | BaseChecklist/BaseMediciones | Bajo | Implementar fallback a BaseGeneric |
| **MOT-05** | Problemas de rendimiento con muchos campos | Todos | Bajo | Virtualización con react-window si >100 campos |

### 11.2 Escalabilidad

| Aspecto | Estado Actual | Límite Estimado | Mejora Recomendada |
|---------|---------------|-----------------|-------------------|
| Campos por formulario | Sin límite | 100 (práctico) | Agrupar por secciones |
| Motores activos | 3 implementados | Ilimitados | EngineRegistry con lazy loading |
| Componentes transversales | 2 compartidos | Ilimitados | Biblioteca de componentes SGC |

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Julio 2026