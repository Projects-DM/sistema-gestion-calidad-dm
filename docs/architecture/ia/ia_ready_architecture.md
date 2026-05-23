# ESTRATEGIA IA-READY - SGC EMPRESARIAL

**Documento:** Preparación del Sistema para Inteligencia Artificial Empresarial  
**Versión:** 1.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. VISIÓN DE IA EMPRESARIAL

### 1.1 Filosofía IA-READY

```
FILOSOFÍA: IA AUMENTATIVA, NO REEMPLAZO
├── La IA debe aumentar la capacidad del operario, no reemplazar su criterio
├── Los datos deben estar preparados para IA desde el origen
├── Las predicciones son sugerencias, no verdades absolutas
├── La trazabilidad debe preservarse incluso en decisiones asistidas por IA
└── El sistema debe poder operar sin IA, pero beneficiarse cuando esté disponible
```

### 1.2 Niveles de Madurez IA

| Nivel | Estado | Capacidad |
|-------|--------|-----------|
| **Nivel 0** — Datos estructurados | ✅ Actual | EAV con metadatos, auditoría, trazabilidad |
| **Nivel 1** — Datos semánticos | 📋 Planificado | Embeddings, taxonomías, etiquetado semántico |
| **Nivel 2** — Detección reactiva | 📋 Planificado | Anomalías, clasificación automática, scoring |
| **Nivel 3** — Predicción proactiva | 📋 Planificado | Fallos, desviaciones, mantenimiento predictivo |
| **Nivel 4** — Asistencia aumentada | 📋 Planificado | RAG, informes automáticos, OCR documental |
| **Nivel 5** — Automatización inteligente | 🗺️ Visión | Workflows autogestionados, decisiones asistidas |

---

## 2. ESTADO ACTUAL: DATOS LISTOS PARA IA

### 2.1 Fortalezas Actuales

El sistema ya cuenta con múltiples habilitadores para IA:

| Habilitador | Estado | Descripción |
|-------------|--------|-------------|
| **Datos estructurados** | ✅ | Formato EAV consistente con columnas tipadas |
| **Metadatos ricos** | ✅ | field_type, options, labels, timestamps |
| **Trazabilidad completa** | ✅ | sgc_audit_logs con acción, usuario, timestamp |
| **Relaciones explícitas** | ✅ | FK constraints entre todas las tablas |
| **Evidencias digitales** | ✅ | Imágenes y PDFs en Storage con metadatos |
| **Firmas digitales** | ✅ | PNG con trazabilidad de captura |
| **Historial completo** | ✅ | Respuestas inmutables con versiones de verificación |
| **Datos históricos** | ✅ | Desde la fecha de implementación del sistema |

### 2.2 Oportunidades de Mejora Inmediata

| Aspecto | Estado | Acción Necesaria |
|---------|--------|------------------|
| Normalización de texto | ⚠️ Parcial | Unificar encoding UTF-8, limpiar caracteres especiales |
| Metadatos EXIF | ❌ No preservados | Preservar EXIF en evidencias para contexto |
| Taxonomías estandarizadas | ⚠️ Parcial | Estandarizar nombres de campos, opciones, etiquetas |
| Datos planos exportables | ❌ No disponible | Crear vistas planas para exportación a modelos |
| Embeddings | ❌ No implementado | Columna vectorial + generación de embeddings |

---

## 3. PREPARACIÓN DE DATOS PARA IA

### 3.1 Taxonomías y Metadatos

#### 3.1.1 Estandarización de Taxonomías

Para que los modelos de IA puedan procesar los datos, las taxonomías deben ser consistentes:

```javascript
// Taxonomía estandarizada de field_type
const FIELD_TYPE_TAXONOMY = {
  'boolean': 'Campo binario (Cumple/No Cumple, Sí/No)',
  'number': 'Valor numérico con posibles unidades y rangos',
  'text': 'Texto corto de una línea',
  'textarea': 'Texto multilínea extendido',
  'select': 'Selección de una opción de una lista predefinida',
  'date': 'Fecha en formato ISO 8601',
  'time': 'Hora en formato HH:MM',
  'signature': 'Firma digital capturada como imagen PNG'
};

// Taxonomía de módulos estándar
const MODULE_TAXONOMY = {
  'operaciones': 'BPM, limpieza, plagas, inspecciones operativas',
  'medicion-control': 'Parámetros fisicoquímicos, temperatura, pH, cloro',
  'mantenimiento': 'Equipos, mantenimientos preventivos y correctivos',
  'calidad': 'PQRS, No Conformidades, CAPA, auditorías',
  'gestion-documental': 'Documentos, procedimientos, registros, versiones'
};
```

**Acción recomendada:**
- Estandarizar todos los nombres de campos existentes en BD
- Crear catálogo semántico de field_type con descripciones
- Unificar nomenclatura de opciones (choices, units, etc.)

#### 3.1.2 Enriquecimiento de Metadatos

```sql
-- Agregar metadatos semánticos a sgc_form_fields
ALTER TABLE sgc_form_fields
ADD COLUMN IF NOT EXISTS semantic_tag TEXT,        -- 'medicion', 'inspeccion', 'control'
ADD COLUMN IF NOT EXISTS data_category TEXT,       -- 'calidad', 'operaciones', 'seguridad'
ADD COLUMN IF NOT EXISTS sensitivity TEXT,         -- 'publico', 'interno', 'confidencial'
ADD COLUMN IF NOT EXISTS semantic_unit TEXT;       -- 'concentracion', 'temperatura', 'ph'
```

### 3.2 Normalización de Datos

#### 3.2.1 Pipeline de Normalización

```javascript
// Servicio de normalización de datos para IA
class DataNormalizer {
  normalizeResponse(response) {
    return {
      id: response.id,
      formName: response.sgc_forms?.name,
      moduleSlug: this.getModuleSlug(response),
      createdAt: response.created_at,
      status: response.status,
      computedStatus: this.computeStatus(response),
      operator: response.profiles?.nombre,
      operatorRole: response.profiles?.rol,
      values: this.normalizeValues(response.sgc_response_values),
      evidenceCount: response.sgc_evidences?.length || 0,
      hasCriticalIssues: this.hasCriticalIssues(response),
      criticalIssueCount: this.getCriticalIssueCount(response),
      verificationStatus: response.status,
      timeToVerify: this.calculateTimeToVerify(response)
    };
  }

  normalizeValues(values) {
    return (values || []).map(v => ({
      fieldName: v.sgc_form_fields?.name,
      fieldLabel: v.sgc_form_fields?.label,
      fieldType: v.sgc_form_fields?.field_type,
      value: v.value_text || v.value_number || v.value_boolean,
      unit: v.sgc_form_fields?.options?.unit,
      isOutOfRange: this.isOutOfRange(v),
      minRange: v.sgc_form_fields?.options?.min,
      maxRange: v.sgc_form_fields?.options?.max
    }));
  }

  computeStatus(response) {
    let hasAnyFalse = false;
    let hasAnyOutOfRange = false;
    (response.sgc_response_values || []).forEach(v => {
      if (v.value_boolean === false) hasAnyFalse = true;
      const min = v.sgc_form_fields?.options?.min;
      const max = v.sgc_form_fields?.options?.max;
      if (v.value_number !== null &&
          ((min !== undefined && v.value_number < min) ||
           (max !== undefined && v.value_number > max))) {
        hasAnyOutOfRange = true;
      }
    });
    if (hasAnyOutOfRange) return 'critico';
    if (hasAnyFalse) return 'advertencia';
    return 'cumple';
  }

  isOutOfRange(value) {
    if (value.value_boolean === false) return true;
    if (value.value_number !== null) {
      const min = value.sgc_form_fields?.options?.min;
      const max = value.sgc_form_fields?.options?.max;
      if ((min !== undefined && value.value_number < min) ||
          (max !== undefined && value.value_number > max)) return true;
    }
    return false;
  }

  calculateTimeToVerify(response) {
    if (!response.verified_at) return null;
    return (new Date(response.verified_at) - new Date(response.created_at)) / 3600000; // horas
  }
}
```

#### 3.2.2 Vista Plana para Exportación

```sql
-- Vista plana de datos para exportación a modelos de IA
CREATE VIEW v_ia_responses_flat AS
SELECT
  r.id as response_id,
  r.created_at,
  r.status,
  f.name as form_name,
  f.engine_type,
  m.slug as module_slug,
  m.name as module_name,
  p.nombre as operator_name,
  p.rol as operator_role,
  COUNT(DISTINCT rv.id) as total_values,
  COUNT(DISTINCT e.id) as total_evidences,
  -- Métricas computadas
  CASE WHEN EXISTS (
    SELECT 1 FROM sgc_response_values rv2
    JOIN sgc_form_fields ff ON rv2.field_id = ff.id
    WHERE rv2.response_id = r.id AND ff.field_type = 'boolean' AND rv2.value_boolean = false
  ) THEN 1 ELSE 0 END as has_non_compliance,
  CASE WHEN EXISTS (
    SELECT 1 FROM sgc_response_values rv2
    JOIN sgc_form_fields ff ON rv2.field_id = ff.id
    WHERE rv2.response_id = r.id AND ff.field_type = 'number'
    AND (
      (ff.options->>'min' IS NOT NULL AND rv2.value_number < (ff.options->>'min')::numeric)
      OR (ff.options->>'max' IS NOT NULL AND rv2.value_number > (ff.options->>'max')::numeric)
    )
  ) THEN 1 ELSE 0 END as has_out_of_range,
  -- Tiempo de verificación
  EXTRACT(EPOCH FROM (r.verified_at - r.created_at))/3600 as hours_to_verify,
  -- Ventana temporal
  EXTRACT(HOUR FROM r.created_at) as created_hour,
  EXTRACT(DOW FROM r.created_at) as created_day_of_week,
  TO_CHAR(r.created_at, 'YYYY-MM') as created_month
FROM sgc_form_responses r
JOIN sgc_forms f ON r.form_id = f.id
JOIN sgc_modules m ON f.module_id = m.id
JOIN profiles p ON r.created_by = p.id
LEFT JOIN sgc_response_values rv ON r.id = rv.response_id
LEFT JOIN sgc_evidences e ON r.id = e.response_id
GROUP BY r.id, f.name, f.engine_type, m.slug, m.name, p.nombre, p.rol;
```

### 3.3 Embeddings y Búsqueda Semántica

#### 3.3.1 Preparación Vectorial

```sql
-- Requiere extensión vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Agregar columna de embeddings a sgc_form_responses
ALTER TABLE sgc_form_responses
ADD COLUMN IF NOT EXISTS embedding vector(1536); -- OpenAI ada-002

-- Índice para búsqueda vectorial
CREATE INDEX IF NOT EXISTS idx_responses_embedding
ON sgc_form_responses
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

#### 3.3.2 Generación de Embeddings

```javascript
// Edge Function de Supabase para generar embeddings
async function generateResponseEmbedding(responseId) {
  // 1. Obtener datos de la respuesta
  const { data: response } = await supabase
    .from('v_ia_responses_flat')
    .select('*')
    .eq('response_id', responseId)
    .single();

  // 2. Construir texto semántico
  const semanticText = `
    Formulario: ${response.form_name}
    Módulo: ${response.module_name}
    Operador: ${response.operator_name}
    Estado: ${response.status}
    Fecha: ${response.created_at}
    Hallazgos: ${response.has_non_compliance ? 'Incumplimientos detectados' : 'Sin incumplimientos'}
    Mediciones fuera de rango: ${response.has_out_of_range ? 'Sí' : 'No'}
  `;

  // 3. Generar embedding (OpenAI API o similar)
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: semanticText
  });

  // 4. Almacenar embedding
  await supabase
    .from('sgc_form_responses')
    .update({ embedding: embedding.data[0].embedding })
    .eq('id', responseId);
}
```

#### 3.3.3 Búsqueda Semántica (RAG)

```javascript
// Función RPC en Supabase para búsqueda vectorial
const SEARCH_RESPONSES_SQL = `
CREATE OR REPLACE FUNCTION match_responses(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 5
) RETURNS TABLE(
  id UUID,
  form_name TEXT,
  module_slug TEXT,
  operator_name TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    f.name as form_name,
    m.slug as module_slug,
    p.nombre as operator_name,
    r.created_at,
    r.status,
    1 - (r.embedding <=> query_embedding) as similarity
  FROM sgc_form_responses r
  JOIN sgc_forms f ON r.form_id = f.id
  JOIN sgc_modules m ON f.module_id = m.id
  JOIN profiles p ON r.created_by = p.id
  WHERE r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;`;
```

---

## 4. CASOS DE USO DE IA

### 4.1 OCR Documental (Prioridad Alta)

**Propósito:** Digitalizar documentos físicos escaneados y extraer datos automáticamente.

```
FLUJO OCR:
1. Operario escanea documento (foto o PDF)
2. EvidenceUploader.jsx sube a Storage
3. Edge Function procesa con Tesseract.js / Google Vision API
4. Texto extraído → clasificación por campo
5. Auto-completar formulario con datos extraídos
6. Requiere validación humana antes de submit
```

**Campos extraíbles:**
- Fechas de documentos
- Números de lote
- Nombres de productos
- Valores numéricos de mediciones
- Códigos de barras / QR

**Preparación necesaria:**
- Evidencias en alta resolución (>300 DPI)
- Metadatos EXIF preservados
- Formato PDF con capa de texto (si aplica)

### 4.2 Detección de Anomalías (Prioridad Alta)

**Propósito:** Identificar patrones inusuales en los datos de forma automática.

```python
# Modelo de detección de anomalías (Isolation Forest)
from sklearn.ensemble import IsolationForest
import pandas as pd
import numpy as np

def train_anomaly_detector(responses_df):
    """
    Responde a: ¿Este registro es anómalo respecto al histórico?
    """
    features = pd.DataFrame({
        'hour': pd.to_datetime(responses_df['created_at']).dt.hour,
        'day_of_week': pd.to_datetime(responses_df['created_at']).dt.dayofweek,
        'has_non_compliance': responses_df['has_non_compliance'],
        'has_out_of_range': responses_df['has_out_of_range'],
        'total_values': responses_df['total_values'],
        'total_evidences': responses_df['total_evidences']
    })

    model = IsolationForest(
        contamination=0.05,  # 5% de los datos se consideran anómalos
        random_state=42,
        n_estimators=100
    )
    model.fit(features)

    # Scoring: -1 (anomalía), 1 (normal)
    responses_df['is_anomaly'] = model.predict(features)
    responses_df['anomaly_score'] = model.score_samples(features)

    return model, responses_df
```

**Casos de detección:**
- Operario con tasa de incumplimientos muy superior al promedio
- Mediciones que se desvían del patrón histórico
- Horarios de registro inusuales
- Volumen de evidencias atípico para el tipo de formulario

### 4.3 Clasificación Automática de Hallazgos (Prioridad Alta)

**Propósito:** Clasificar automáticamente los hallazgos reportados en observaciones.

```javascript
// Clasificación basada en reglas + ML
async function classifyFinding(observacionText, fieldValues) {
  // 1. Reglas determinísticas primero
  if (observacionText.toLowerCase().includes('fuga') ||
      observacionText.toLowerCase().includes('derrame')) {
    return { category: 'seguridad', severity: 'critica', confidence: 0.95 };
  }

  if (observacionText.toLowerCase().includes('limpieza') ||
      observacionText.toLowerCase().includes('sucio')) {
    return { category: 'higiene', severity: 'media', confidence: 0.90 };
  }

  // 2. Si no hay regla, usar clasificador ML
  const response = await fetch('/api/ml/classify-finding', {
    method: 'POST',
    body: JSON.stringify({
      text: observacionText,
      fieldValues: fieldValues,
      moduleType: currentModule
    })
  });

  return response.json();
}
```

**Taxonomía de clasificación:**
| Categoría | Subcategorías | Severidades típicas |
|-----------|--------------|-------------------|
| Higiene | Limpieza, desinfección, plagas | Baja, Media |
| Seguridad | Fugas, derrames, riesgos eléctricos | Crítica |
| Calidad | Contaminación, desviación de parámetros | Media, Crítica |
| Mantenimiento | Equipo dañado, calibración vencida | Media |
| Documental | Registro incompleto, firma faltante | Baja |

### 4.4 Análisis Predictivo de Fallos (Prioridad Media)

**Propósito:** Predecir probabilidad de fallo de equipos antes de que ocurra.

```python
# Modelo de predicción de fallos (Random Forest)
from sklearn.ensemble import RandomForestClassifier

def train_failure_predictor(maintenance_records):
    """
    Predice: Probabilidad de fallo en los próximos 30 días
    """
    X = pd.DataFrame({
        'dias_desde_ultimo_mantenimiento': maintenance_records['days_since_last_maintenance'],
        'total_mantenimientos_previos': maintenance_records['total_previous_maintenances'],
        'promedio_temperatura': maintenance_records['avg_temperature'],
        'promedio_vibracion': maintenance_records['avg_vibration'],
        'edad_equipo_meses': maintenance_records['equipment_age_months'],
        'frecuencia_mantenimiento': maintenance_records['maintenance_frequency'],
        'incumplimientos_previos': maintenance_records['previous_non_compliances']
    })

    y = maintenance_records['failure_in_30_days']

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        random_state=42
    )
    model.fit(X, y)

    # Feature importance para explicabilidad
    importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)

    return model, importance
```

**Indicadores predictivos:**
- Incremento en la temperatura del equipo
- Aumento en el número de No Cumples en checklists
- Mayor tiempo entre mantenimientos programados vs reales
- Desviaciones crecientes en mediciones de calibración

### 4.5 Sistema RAG para Consultas (Prioridad Media)

**Propósito:** Consultar el historial de registros usando lenguaje natural.

```
USUARIO: "¿Cuántos incumplimientos de limpieza hubo en mayo?"
                    │
                    ▼
┌──────────────────────────────────────────────┐
│               CHATBOT RAG                     │
│                                               │
│  1. Generar embedding de la pregunta          │
│  2. Búsqueda vectorial en sgc_form_responses  │
│  3. Recuperar top-5 registros relevantes      │
│  4. Enviar a GPT-4 con contexto               │
│  5. Generar respuesta en lenguaje natural     │
└──────────────────────────────────────────────┘
                    │
                    ▼
RESPUESTA: "En mayo se registraron 12 incumplimientos
de limpieza, principalmente en el área de recepción (8)
y almacenamiento (4)."
```

**Preguntas ejemplo:**
- "¿Cuál fue el promedio de cloro residual la última semana?"
- "¿Qué equipos tienen mantenimiento vencido?"
- "Muéstrame los registros críticos de temperatura de este mes"
- "¿Quién ha tenido más incumplimientos este trimestre?"

### 4.6 Generación Automática de Informes (Prioridad Media)

**Propósito:** Crear informes ejecutivos con narrativa generada por IA.

```javascript
async function generateExecutiveReport(moduleSlug, period) {
  // 1. Obtener estadísticas del período
  const stats = await getModuleStats(moduleSlug, period);

  // 2. Generar narrativa con IA
  const report = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'user',
      content: `
        Genera un informe ejecutivo profesional de Gestión de Calidad.
        Datos del período ${period} para el módulo ${stats.moduleName}:

        - Total de registros: ${stats.totalRecords}
        - Incumplimientos: ${stats.nonCompliances}
        - Hallazgos críticos: ${stats.criticalFindings}
        - Tasa de cumplimiento: ${stats.complianceRate}%
        - Tiempo promedio de verificación: ${stats.avgVerificationHours}h
        - Operario con mejor desempeño: ${stats.topPerformer}
        - Áreas con más hallazgos: ${stats.topAreas.join(', ')}

        El informe debe incluir:
        1. Resumen ejecutivo (2-3 oraciones)
        2. Análisis de tendencias
        3. Principales hallazgos
        4. Recomendaciones
        5. Conclusiones
      `
    }]
  });

  // 3. Generar PDF con gráficos y narrativa
  return generatePDFReport({
    narrative: report.choices[0].message.content,
    charts: stats.charts,
    period,
    moduleName: stats.moduleName
  });
}
```

---

## 5. ARQUITECTURA NECESARIA PARA IA

### 5.1 Componentes Necesarios

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA IA-READY                              │
│                                                                       │
│  CAPA DE DATOS                                                        │
│  ├── PostgreSQL + pgvector (embeddings)                              │
│  ├── Vistas planas para ML (v_ia_responses_flat)                     │
│  ├── Taxonomías estandarizadas                                       │
│  └── Data Lake (S3/Parquet) para entrenamiento                       │
│                                                                       │
│  CAPA DE SERICIOS (Supabase Edge Functions)                           │
│  ├── /api/ml/check-anomaly                                           │
│  ├── /api/ml/predict-failure                                         │
│  ├── /api/ml/classify-finding                                        │
│  ├── /api/ocr/extract                                                │
│  └── /api/rag/ask-question                                           │
│                                                                       │
│  CAPA DE IA (Servicios Externos / Self-hosted)                        │
│  ├── OpenAI / Local LLM (RAG + generación)                            │
│  ├── Tesseract.js / Google Vision (OCR)                              │
│  ├── Scikit-learn / TensorFlow (modelos)                              │
│  └── MLflow (registro de modelos)                                    │
│                                                                       │
│  CAPA DE FRONTEND                                                     │
│  ├── Chatbot integrado                                                │
│  ├── Dashboard de anomalías                                           │
│  ├── Indicadores predictivos                                          │
│  └── Reportes automáticos                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Evolución de Tablas para IA

| Tabla | Cambio Necesario | Justificación |
|-------|-----------------|---------------|
| sgc_form_responses | Agregar `embedding vector(1536)` | Búsqueda semántica |
| sgc_form_responses | Agregar `anomaly_score NUMERIC` | Scoring de anomalías |
| sgc_form_responses | Agregar `predicted_risk TEXT` | Riesgo predictivo |
| sgc_form_fields | Agregar `semantic_tag TEXT` | Taxonomía semántica |
| sgc_form_fields | Agregar `data_category TEXT` | Categorización |
| sgc_evidences | Preservar metadatos EXIF | Contexto para visión |
| — | Crear `sgc_ml_predictions` | Almacenar predicciones |
| — | Crear `sgc_performance_logs` | Métricas de rendimiento |

### 5.3 Pipeline de ML

```yaml
# .github/workflows/ml-pipeline.yml
name: ML Pipeline Diario

on:
  schedule:
    - cron: '0 3 * * *'  # Diario a las 3 AM

jobs:
  train-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Export data from Supabase
        run: python scripts/export_data.py --view v_ia_responses_flat --output ./data

      - name: Train anomaly detector
        run: python scripts/train_anomaly_detector.py --input ./data/responses.csv

      - name: Evaluate model
        run: python scripts/evaluate_model.py --model ./models/anomaly_detector.pkl

      - name: Deploy to Edge Functions
        if: success()
        run: python scripts/deploy_model.py --model ./models/anomaly_detector.pkl
```

---

## 6. REQUISITOS PARA CADA CAPACIDAD DE IA

### 6.1 OCR Documental

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Imágenes en alta resolución | ⚠️ Variable | Configurar compresión con resolución mínima 300 DPI |
| PDF con capa de texto | ❌ No | Asegurar PDFs digitales nativos |
| API de OCR | ❌ No | Implementar Edge Function con Tesseract.js |
| Validación humana | ✅ Sí | Flujo de revisión antes de auto-completar |

### 6.2 Detección de Anomalías

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Datos históricos suficientes (>1000 registros) | ✅ Sí | Datos disponibles desde implementación |
| Vista plana de datos | ❌ No | Crear v_ia_responses_flat |
| Feature engineering | ❌ No | Implementar DataNormalizer |
| Modelo entrenado | ❌ No | Pipeline de ML semanal |
| API de predicción | ❌ No | Edge Function /api/ml/check-anomaly |

### 6.3 Clasificación Automática

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Observaciones en texto | ✅ Sí | Campos de texto en formularios |
| Taxonomía de categorías | ⚠️ Parcial | Definir categorías estándar |
| Reglas determinísticas | ❌ No | Implementar clasificador híbrido (reglas + ML) |
| Feedback loop | ❌ No | Permitir corrección humana de clasificación |

### 6.4 Sistema RAG

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Embeddings en respuestas | ❌ No | Agregar columna vector + índice |
| API de OpenAI / LLM local | ❌ No | Configurar API key o LLM self-hosted |
| Función match_responses | ❌ No | Crear RPC en Supabase |
| Interfaz de chat | ❌ No | Componente de chat en frontend |

### 6.5 Predicción de Fallos

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Datos de mantenimiento | ❌ No | Requiere BaseMantenimiento implementado |
| Historial de fallos | ❌ No | Requiere tabla de fallos |
| Mediciones de equipos | ❌ No | Requiere sensores o registro manual |

---

## 7. HOJA DE RUTA IA

### 7.1 Fases de Implementación

```
FASE 1 — PREPARACIÓN (Q4 2026)
├── Estandarizar taxonomías y metadatos
├── Crear v_ia_responses_flat (vista plana)
├── Agregar columnas semánticas a sgc_form_fields
├── Implementar DataNormalizer
└── Preservar EXIF en evidencias

FASE 2 — DETECCIÓN (Q1 2027)
├── Agregar embedding vector(1536) a sgc_form_responses
├── Crear función match_responses (RPC)
├── Implementar detección de anomalías (Isolation Forest)
├── Clasificación automática de hallazgos
└── Dashboard de anomalías

FASE 3 — ASISTENCIA (Q2 2027)
├── Integrar OCR (Tesseract.js / Google Vision)
├── Implementar Chatbot RAG
├── Generación automática de informes
└── Asistente de auto-completado

FASE 4 — PREDICCIÓN (Q3-Q4 2027)
├── Modelo de predicción de fallos
├── Alertas predictivas proactivas
├── Optimización de frecuencias de mantenimiento
└── Scoring de operarios por cumplimiento
```

### 7.2 Inversión Estimada

| Capacidad | Esfuerzo Técnico | Dependencias | Costo Infraestructura |
|-----------|:----------------:|:------------:|:---------------------:|
| OCR | 3 semanas | Edge Function + API | $0-50/mes (Tesseract gratis) |
| Anomalías | 2 semanas | v_ia_responses_flat | $0 (scikit-learn local) |
| Clasificación | 1 semana | Taxonomías | $0 (reglas + ML simple) |
| RAG | 4 semanas | pgvector + API OpenAI | $20-100/mes (API OpenAI) |
| Predicción | 4 semanas | BaseMantenimiento | $0 (scikit-learn local) |
| Informes IA | 2 semanas | API OpenAI | $20-50/mes |

---

## 8. RIESGOS Y MITIGACIONES

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|:-----------:|------------|
| Datos insuficientes para entrenar modelos | Alto | Baja | Empezar con reglas determinísticas + ML simple |
| Sesgo en datos históricos | Medio | Media | Validar distribución de datos antes de entrenar |
| Costos de API OpenAI elevados | Medio | Media | Implementar caché de respuestas, modelos locales alternativos |
| Precisión baja en clasificación | Medio | Alta | Feedback loop con corrección humana |
| Privacidad de datos en LLM externo | Alto | Baja | No enviar datos sensibles, usar LLM self-hosted |
| Dependencia de servicios externos | Medio | Media | Tener fallback a reglas determinísticas |
| Falsos positivos en anomalías | Bajo | Alta | Threshold configurable, revisión humana siempre |

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Julio 2026