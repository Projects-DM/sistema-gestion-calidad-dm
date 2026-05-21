# ARQUITECTURA DE ANALÍTICA E INTELIGENCIA OPERACIONAL (ANALYTICS)
## Sistema de Gestión de Calidad (SGC-DM) — Enterprise Spec

Este documento técnico establece la **Especificación de Arquitectura de la Capa de Analítica (ANALYTICS)** para la plataforma enterprise **SGC-DM**. Define el marco conceptual, el esquema relacional, los flujos orientados a eventos, las canalizaciones de datos (data pipelines) y el diseño de la capa de inteligencia artificial (IA), consolidando el tercer gran pilar del sistema.

---

## 1. ARQUITECTURA GENERAL Y FILOSOFÍA DE DESACOPLAMIENTO

Para garantizar la estabilidad operacional a escala empresarial, el sistema SGC-DM implementa un **desacoplamiento estricto de tres capas**:

1.  **CORE (Configuración y Metadatos):** Define la estructura de módulos, formularios, flujos de trabajo y taxonomías semánticas. Es de actualización lenta (OLTP).
2.  **RUNTIME (Operación Real y Transacciones):** Captura el registro diario de planta en un modelo dinámico tipo Entity-Attribute-Value (EAV). Es de escritura intensiva y requiere baja latencia (OLTP).
3.  **ANALYTICS (Métricas, Alertas e IA):** Consume datos consolidados, precalcula indicadores clave de rendimiento (KPIs), procesa series temporales y ejecuta modelos predictivos. Es de lectura intensiva y procesamiento diferido (OLAP).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARQUITECTURA CAPAS SGC-DM                       │
│                                                                        │
│  ┌───────────────────────┐          ┌───────────────────────────────┐  │
│  │         CORE          │          │            RUNTIME            │  │
│  │ (Metadatos / FormDefs)│          │ (Registros EAV / Evidencias)  │  │
│  └───────────┬───────────┘          └───────────────┬───────────────┘  │
│              │                                      │                  │
│              │ Define Estructuras                   │ Escribe Transacciones
│              ▼                                      ▼                  │
│     [ sgc_form_fields ]                     [ sgc_response_values ]    │
│              │                                      │                  │
│              │                                      │                  │
│              └───────────────┬──────────────────────┘                  │
│                              │                                         │
│                              │ ETL Incremental / Eventos (Pub-Sub)     │
│                              ▼                                         │
│                     ┌──────────────────┐                               │
│                     │    ANALYTICS     │                               │
│                     │ (OLAP / Cache)   │                               │
│                     └────────┬─────────┘                               │
│                              │                                         │
│         ┌────────────────────┼────────────────────┐                    │
│         ▼                    ▼                    ▼                    │
│  [ Metrics Layer ]   [ Alerts Layer ]      [ AI Layer ]                │
│   (KPIs & Scores)     (SLA & Umbrales)    (Anomalías & Vision)         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Principio de No Contaminación Operacional
La capa de **ANALYTICS** tiene prohibido almacenar formularios estructurados, flujos de aprobación o respuestas de operadores en crudo. Su almacenamiento físico se diseña como una capa agnóstica de **lectura optimizada**, alimentada de manera asíncrona. Esto evita que consultas complejas de dashboards (ej. regresiones de temperatura de los últimos 6 meses) interfieran con las escrituras en caliente de los operarios en planta, previniendo cuellos de botella y bloqueos transaccionales (*locks*).

---

## 2. LAS CINCO CAPAS DE ANALÍTICA (THE ANALYTICS LAYERS)

La capa de analítica se organiza en cinco subcapas funcionales con responsabilidades altamente diferenciadas a nivel de backend y procesamiento de datos.

### 2.1 Metrics Layer (Capa de Métricas)
*   **Responsabilidad:** Consolidar métricas de desempeño cuantitativas e indicadores normativos.
*   **Frecuencia:** Computado por lotes (Batch) cada hora o al cierre de turnos operacionales.
*   **KPIs Clave:** 
    *   Tasa de conformidad sanitaria por área (%).
    *   SLA de revisión de firmas (tiempo promedio entre registro de operador y verificación de calidad).
    *   Eficacia de cierre de planes de acción correctiva (CAPA).

### 2.2 Alerts Layer (Capa de Alertas)
*   **Responsabilidad:** Identificación inmediata de rupturas de rango crítico de medición y violaciones de SLAs operacionales.
*   **Frecuencia:** Tiempo real (Near Real-Time) impulsado por eventos de base de datos.
*   **Comportamiento:** Dispara notificaciones push, SMS o correos electrónicos si, por ejemplo, el cloro libre disminuye a `< 0.3 ppm` en dos mediciones seguidas.

### 2.3 AI Layer (Capa de Inteligencia Artificial)
*   **Responsabilidad:** Procesar la taxonomía semántica (`ia_tags`) y alimentar los modelos predictivos y clasificadores automáticos.
*   **Frecuencia:** Mixta. En tiempo real para clasificación de visión (Vision AI) y de forma asíncrona diaria para modelos predictivos de mantenimiento.
*   **Modelos:** Detección de anomalías en series de tiempo térmicas, procesamiento de lenguaje natural (NLP) en comentarios de rechazo y verificación de evidencias visuales.

### 2.4 Trends Layer (Capa de Tendencias Históricas)
*   **Responsabilidad:** Almacenar de forma compacta y agregada el comportamiento de las variables sanitarias y operativas a lo largo de amplios marcos temporales (meses/años).
*   **Frecuencia:** Procesamiento diario (a las 00:00 UTC).
*   **Estructura:** Agrupaciones multidimensionales optimizadas para consultas de tendencias e informes regulatorios a largo plazo (ej. auditorías semestrales de INVIMA).

### 2.5 Dashboard Layer (Capa de Visualización y Caché)
*   **Responsabilidad:** Servir conjuntos de datos planos, desnormalizados y altamente indexados a las interfaces de React para una velocidad de carga de pantalla `< 100ms`.
*   **Frecuencia:** Regeneración incremental programada o gatillada por invalidez de caché.
*   **UX Alignment:** Soporte de filtrado rápido por áreas, turnos operacionales y límites normativos.

---

## 3. SQL ANALYTICS SCHEMAS (REGISTRO ANALÍTICO DE BASE DE DATOS)

A continuación se detalla la propuesta física de DDL para la extensión del esquema de base de datos de Supabase dedicada a la capa de **ANALYTICS**. Estas tablas coexisten con el esquema EAV actual pero operan de forma aislada.

```sql
-- Habilitar extensión para agregaciones de series temporales si es necesario
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 3.1 sgc_compliance_scores
*   **Propósito:** Almacenar el índice de cumplimiento normativo calculado por módulo, formulario y operario de manera periódica. Evita calcular promedios históricos sobre la estructura EAV en cada consulta del dashboard.
*   **DDL:**
```sql
CREATE TABLE public.sgc_compliance_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.sgc_modules(id) ON DELETE CASCADE,
    form_id UUID REFERENCES public.sgc_forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    score_date DATE NOT NULL,
    total_records INTEGER DEFAULT 0,
    compliant_records INTEGER DEFAULT 0,
    non_compliant_records INTEGER DEFAULT 0,
    compliance_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_records = 0 THEN 0.00
             ELSE ROUND((compliant_records::numeric / total_records::numeric) * 100, 2)
        END
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices optimizados para filtros de Dashboard
CREATE UNIQUE INDEX idx_compliance_score_composite ON sgc_compliance_scores(module_id, form_id, user_id, score_date);
CREATE INDEX idx_compliance_date ON sgc_compliance_scores(score_date DESC);
```

### 3.2 sgc_metrics
*   **Propósito:** Registrar variables métricas de performance operativa, como tiempos de ciclo de firmas y tasas de rechazo.
*   **DDL:**
```sql
CREATE TABLE public.sgc_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT NOT NULL,          -- 'sla_verification_seconds', 'corrective_action_ratio', etc.
    metric_value NUMERIC(12,4) NOT NULL,
    dimension_module_id UUID REFERENCES public.sgc_modules(id) ON DELETE CASCADE,
    dimension_area TEXT,                -- 'Recepcion', 'Almacenamiento', etc.
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_metrics_name_period ON sgc_metrics(metric_name, period_start DESC);
```

### 3.3 sgc_alerts
*   **Propósito:** Bitácora histórica y de control de alarmas disparadas por desviaciones de calidad críticas. Almacena las alertas para visualización rápida en el panel de control del supervisor de aseguramiento de calidad.
*   **DDL:**
```sql
CREATE TABLE public.sgc_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    field_id UUID REFERENCES public.sgc_form_fields(id) ON DELETE CASCADE,
    alert_level TEXT NOT NULL,          -- 'warning', 'critical'
    alert_type TEXT NOT NULL,           -- 'chemical_deviation', 'cold_chain_rupture', 'incomplete_sig'
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_alerts_unresolved ON sgc_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_alerts_type ON sgc_alerts(alert_type);
```

### 3.4 sgc_trends
*   **Propósito:** Repositorio para el análisis de series de tiempo de parámetros sanitarios analíticos (`ph`, `cloro`, `temperatura`). Desnormaliza los valores de la EAV en una serie temporal continua y plana.
*   **DDL:**
```sql
CREATE TABLE public.sgc_trends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    field_id UUID REFERENCES public.sgc_form_fields(id) ON DELETE CASCADE,
    ia_tag TEXT NOT NULL,               -- '#temperatura', '#ph', etc.
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    value_numeric NUMERIC(10,3) NOT NULL,
    location_id TEXT,                   -- Ej: 'Camara_1' (obtenido de options del form)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_trends_field_date ON sgc_trends(field_id, recorded_at DESC);
CREATE INDEX idx_trends_tag_date ON sgc_trends(ia_tag, recorded_at DESC);
```

### 3.5 sgc_ai_analysis
*   **Propósito:** Persistencia de inferencias de IA, puntuaciones de anomalía y clasificaciones de visión artificial en evidencias cargadas.
*   **DDL:**
```sql
CREATE TABLE public.sgc_ai_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.sgc_form_responses(id) ON DELETE CASCADE,
    anomaly_score NUMERIC(5,4),         -- 0.0000 a 1.0000 (probabilidad de anomalía)
    anomaly_detected BOOLEAN DEFAULT false,
    vision_verification_status TEXT,    -- 'passed', 'failed', 'undetermined'
    vision_score NUMERIC(5,4),          -- Precisión del clasificador de imagen
    sentiment_observations NUMERIC(3,2),-- Sentimiento detectado en texto (-1 a +1)
    predictive_alert_text TEXT,         -- Recomendaciones de mantenimiento
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_ai_anomaly ON sgc_ai_analysis(anomaly_detected) WHERE anomaly_detected = true;
CREATE INDEX idx_ai_response ON sgc_ai_analysis(response_id);
```

### 3.6 sgc_dashboard_cache
*   **Propósito:** Almacenamiento clave-valor de alta velocidad para serializaciones complejas de dashboards listos para enviar al cliente.
*   **DDL:**
```sql
CREATE TABLE public.sgc_dashboard_cache (
    cache_key TEXT PRIMARY KEY,         -- 'dashboard:sanitary:monthly:v1'
    serialized_data JSONB NOT NULL,
    invalid_after TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_cache_expiry ON sgc_dashboard_cache(invalid_after);
```

---

## 4. EVENT-DRIVEN ARCHITECTURE (ARQUITECTURA DIRIGIDA POR EVENTOS)

El desacoplamiento en tiempo real se logra mediante un patrón de **Arquitectura Orientada a Eventos (EDA)**. En lugar de procesar analíticas síncronamente durante la inserción de registros operacionales, la base de datos publica eventos inmediatos que son orquestados asíncronamente.

```
 [ OPERARIO ]
      │
      ▼ (Guarda Formulario)
┌──────────────────────────────────────┐
│  INSERT sgc_form_responses           │
│  INSERT sgc_response_values          │  (Runtime Transaction)
└──────────────────┬───────────────────┘
                   │
                   ▼ (PostgreSQL Trigger)
┌──────────────────────────────────────┐
│  pg_notify('runtime_events')         │  (Gatilla Supabase Webhook)
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│   SUPABASE EDGE FUNCTION (Pub-Sub)   │
└──────────────────┬───────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼ (Async Task)      ▼ (Async Task)
  [ Pipelines ETL ]     [ AI Inference Engine ]
  Calcula tendencias,   Valida Foto (Vision),
  KPIs y SLAs.          Puntúa Anomalías.
```

### 4.1 Ciclo de Eventos Operacionales
1.  **Registro Completado:** El evento `record.created` se dispara al insertar un registro en `sgc_form_responses`.
2.  **Hydration Event:** El motor de eventos compila el ID del registro y genera un JSON con el mapa desnormalizado de respuestas.
3.  **Routing de Eventos:** El evento se enruta hacia las colas de tareas específicas del pipeline analítico:
    *   **Queue 1:** Evaluador de Umbrales Sanitarios (`Alerts Pipeline`).
    *   **Queue 2:** Actualizador de Cumplimiento Diario (`Metrics Pipeline`).
    *   **Queue 3:** Inferencia de Machine Learning (`AI Pipeline`).

---

## 5. IA ARCHITECTURE & OPERATIONAL INTELLIGENCE

La compatibilidad con Inteligencia Artificial (IA) integrada en el esquema dinámico de campos permite automatizar tareas complejas de auditoría y predicción de fallas operativas.

```
========================================================================================
                                PIPELINE DE INTELIGENCIA ARTIFICIAL
========================================================================================

    [ Muestras Sanitarias ] ──────► [ Anomaly Detection ] ─────► Graba Anomaly Score
     (pH, Cloro, Temperatura)        (Isolation Forest)           en sgc_ai_analysis
                                                                         │
                                                                         ▼
                                                                  ¿Es anomalía?
                                                                 ├── Sí ──► Dispara Alerta
                                                                 └── No ──► Guarda en sgc_trends

    [ Evidencia Fotográfica ] ────► [ Vision AI Model ] ───────► Clasifica Limpieza (0.98)
     (Supabase Storage URL)          (ResNet / ViT)               ├── Aprobado ──► Auto-Check RLS
                                                                  └── Rechazado ─► Dispara Alerta CAPA

    [ Bitácora Operador ] ────────► [ NLP Analysis ] ──────────► Sentiment Analysis Score
     (Comentarios Textarea)          (BERT / LLM API)             Detección de fricción operacional
========================================================================================
```

### 5.1 Pipelines de Modelos IA

#### A. Detección de Anomalías en Tiempo Real (Anomaly Detection)
*   **Inputs:** Valores numéricos correlacionados bajo etiquetas `#temperatura`, `#ph`, y `#cloro_ppm`.
*   **Algoritmo:** Modelos no supervisados como **Isolation Forest** o **Autoencoders** de redes neuronales, entrenados con el histórico acumulado de la tabla `sgc_trends`.
*   **Outputs:** Puntuación de anomalía en `sgc_ai_analysis.anomaly_score`. Si la puntuación supera un umbral de desviación (ej. `> 0.85`), la IA marca `anomaly_detected = true` y gatilla una alerta de cadena de frío en `sgc_alerts`.

#### B. Inspección Visual de Evidencias (Vision AI Validation)
*   **Inputs:** URL de evidencias fotográficas capturadas con etiquetas `#evidencia_foto`.
*   **Algoritmo:** Redes neuronales convolucionales (CNN) o clasificadores tipo Vision Transformers (ViT) entrenados con imágenes categorizadas de áreas "Limpias", "Desorganizadas" o "Sucia/Presencia de Plagas".
*   **Outputs:** Registro del porcentaje de fiabilidad en `sgc_ai_analysis.vision_score`. Si la precisión de la evidencia es menor a la requerida por metadatos (ej. `< 0.90`), el sistema marca el estado de la foto como defectuoso y genera automáticamente una no conformidad en el módulo de calidad.

#### C. Procesamiento de Texto en Bitácoras (NLP & Sentiment Analysis)
*   **Inputs:** Descripciones extensas de operadores recopiladas en campos `textarea` con etiquetas semánticas.
*   **Algoritmo:** Modelos BERT o APIs LLM optimizadas.
*   **Outputs:** Clasificación de nivel de alerta según la severidad expresada en el texto (ej. "Se detectan roedores en la zona" clasifica como alerta de inocuidad crítica instantánea).

---

## 6. DATA PIPELINES & INTEGRATION (PROCESAMIENTO DE DATOS)

Extraer analíticas complejas directamente de una estructura de base de datos EAV mediante `JOIN`s continuos es prohibitivo a nivel de recursos de cómputo y causa degradación severa de base de datos. Para solucionar esto, el sistema implementa una estrategia de **ETL Incremental Asíncrono**.

```
               DATOS EAV CRUDOS (RUNTIME)
          [ sgc_form_responses ] ── 1:N ──► [ sgc_response_values ]
                                                    │
                                                    │  Select incremental (modificados)
                                                    ▼
                                            [ Pipeline ETL ]
                                                    │
                                  ┌─────────────────┴─────────────────┐
                                  ▼                                   ▼
                            ¿Es analítico?                      ¿Es transaccional?
                          (pH, cloro, temp)                    (firmas, text, check)
                                  │                                   │
                                  ▼                                   ▼
                         [ Desnormalización ]                [ Consolidación KPIs ]
                         Inserta serie plana                 Calcula cumplimiento
                         en sgc_trends.                      y escribe en sgc_metrics.
```

### 6.1 Estrategia de ETL Incremental (Agnóstico de JOINs EAV)
Para evitar el impacto en el rendimiento:
1.  **Lectura por Lote Modificado:** El cargador de datos analíticos lee exclusivamente los registros cuyas marcas de tiempo (`updated_at`) sean mayores al último ciclo exitoso de sincronización.
2.  **Desnormalización del EAV a Columnas Temporales:** El pipeline extrae los valores asociados a `field_id` específicos de la respuesta y los mapea a un registro único y plano en `sgc_trends`.
3.  **Procesamiento en Lotes Programados (Cron Trigger):** A través de Supabase pg_cron o tareas en background programadas, se ejecutan resúmenes agregados que precalculan las métricas en `sgc_compliance_scores` y `sgc_metrics`.

---

## 7. ARQUITECTURA DE DASHBOARDS (VISUALIZACIÓN DE CONTROL)

Los datos consolidados en la capa de analítica alimentan de manera directa seis visualizaciones operacionales e institucionales en el frontend de React.

### 7.1 Dashboard Sanitario e Inocuidad
*   **Métricas Clave:** Índice de conformidad microbiológica del agua, promedios móviles de pH y Cloro Libre, control de temperatura histórico de cámaras de conservación y alertas de inocuidad sin resolver.
*   **Componentes Visuales:** Gráficos de dispersión térmica, curvas de control microbiológico con líneas de límites críticos superior e inferior, mapas de calor (*heatmap*) de zonas de riesgo sanitario.
*   **Origen de Datos:** `sgc_trends` y `sgc_alerts`.

### 7.2 Dashboard Operativo y de Productividad
*   **Métricas Clave:** Registros creados por operario, tiempo medio de ejecución de checklist, tasa de formularios incompletos u omitidos por planta, SLA de auditoría interna de calidad.
*   **Componentes Visuales:** Gráficos de barras apiladas de desempeño de turnos, medidores de velocidad operativa.
*   **Origen de Datos:** `sgc_metrics` y `sgc_compliance_scores`.

### 7.3 Dashboard de Mantenimiento y Calibración
*   **Métricas Clave:** Estado operativo de equipos, MTBF (Tiempo medio entre fallos), MTTR (Tiempo medio de reparación), calendarios de mantenimiento preventivo y calibración de instrumentos analíticos vencidos o próximos a expirar.
*   **Componentes Visuales:** Cronograma de mantenimientos (Gantt), KPI semáforo de calibración de equipos críticos.
*   **Origen de Datos:** `sgc_metrics` combinado con datos maestros de la futura tabla `sgc_equipos`.

### 7.4 Dashboard de Trazabilidad y Recall
*   **Métricas Clave:** Mapeo de lotes de materias primas frente a despachos terminados, volumen despachado por cliente, tiempos de tránsito logístico de despachos y estado de simulacros de recall.
*   **Componentes Visuales:** Diagrama de red/grafo de origen y destino de lotes, timeline interactivo de ruta de despacho.
*   **Origen de Datos:** Tabla legacy `despachos` y eventos integrados en `sgc_trends`.

---

## 8. RENDIMIENTO, CACHÉ Y ESCALABILIDAD

Para garantizar que el sistema de analítica sea escalable a millones de registros operacionales y soporte entornos multi-tenant (SaaS), se implementan las siguientes estrategias de optimización física:

### 8.1 Vistas Materializadas Concurrentes
Para el cálculo de métricas históricas complejas del sistema, se utilizan **Vistas Materializadas** en Supabase, las cuales se refrescan concurrentemente sin bloquear la lectura de datos:

```sql
CREATE MATERIALIZED VIEW public.mv_analytics_monthly_compliance AS
SELECT 
    module_id,
    form_id,
    date_trunc('month', score_date) as score_month,
    AVG(compliance_percentage) as average_compliance,
    SUM(total_records) as total_samples
FROM public.sgc_compliance_scores
GROUP BY module_id, form_id, date_trunc('month', score_date);

-- Índice único obligatorio para refresco concurrente
CREATE UNIQUE INDEX ON public.mv_analytics_monthly_compliance (module_id, form_id, score_month);

-- Script de refresco (Ejecutado asíncronamente vía pg_cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_analytics_monthly_compliance;
```

### 8.2 Estrategia de Caché de Dashboards (Dashboard Cache Layer)
*   **Lectura Inmediata:** La aplicación de React lee directamente de la tabla `sgc_dashboard_cache` buscando por el identificador de clave-valor `cache_key`.
*   **Invalidación Controlada:** Si un nuevo registro de desviación crítica se inserta en `sgc_alerts`, un trigger invalida la caché del dashboard sanitario (`DELETE FROM sgc_dashboard_cache WHERE cache_key = '...'`), forzando al pipeline asíncrono a recalcular los datos planos y refrescar el widget.

---

## 9. SEGURIDAD Y GOBERNANZA DE DATOS (SEGURIDAD EN ANALYTICS)

Los datos de analítica representan información comercialmente sensible y estratégicamente confidencial de DM Distribuciones. Por ende, la seguridad sigue directrices normativas muy estrictas.

### 9.1 Seguridad por Fila de Datos (RLS) en Analytics
Cada tabla de analítica implementa políticas RLS basadas en el rol de seguridad asignado en la tabla `profiles`.

```sql
-- Habilitar RLS en tablas de analítica
ALTER TABLE public.sgc_compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgc_metrics ENABLE ROW LEVEL SECURITY;

-- Política: Operarios no pueden leer métricas generales
CREATE POLICY "Lectura analíticas restringida" ON public.sgc_compliance_scores
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        (EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.rol IN ('administrador', 'calidad')
        ))
    );

-- Política: Operarios solo pueden ver alertas asignadas a su propia planta/ID
CREATE POLICY "Lectura alertas propias" ON public.sgc_alerts
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        (
            (EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() AND profiles.rol IN ('administrador', 'calidad')
            ))
            OR
            (EXISTS (
                SELECT 1 FROM public.sgc_form_responses r
                WHERE r.id = sgc_alerts.response_id AND r.created_by = auth.uid()
            ))
        )
    );
```

### 9.2 Privacidad de Datos y Auditoría Analítica
1.  **Bitácora de Acceso a Dashboards:** Cualquier consulta o exportación de datos a gran escala a formato Excel o PDF gatilla un registro de auditoría en la tabla `sgc_audit_logs` clasificando la acción como `analytics_query`.
2.  **Enmascaramiento de Datos:** Datos personales de operarios en mediciones críticas se anonimizan o enmascaran en vistas agregadas de analítica general para cumplir con políticas de privacidad de datos (Ley de Protección de Datos Personales).

---

## 10. ROADMAP DE IMPLEMENTACIÓN DE LA CAPA ANALYTICS

Para integrar esta robusta capa de analítica sin interferir con la operación normal del SGC-DM, se diseña el siguiente roadmap secuencial de despliegue y desarrollo:

```
[ FASE 1: Esquemas ] ──► [ FASE 2: Pipelines ] ──► [ FASE 3: Dashboards ] ──► [ FASE 4: Modelos IA ]
  Desplegar tablas           Implementar triggers          Desarrollar vistas            Entrenar y conectar
  sgc_metrics, alerts,       PostgreSQL y edge             React consumiendo los         modelos de visión
  trends y compliance.       functions para ETL asíncrono.  datos planos de caché.       y anomaly detection.
```

Este esquema de arquitectura de analítica establece las directrices de desarrollo definitivas para elevar el **Sistema de Gestión de Calidad (SGC-DM)** a una plataforma de inteligencia operativa inteligente, escalable e IA-ready.

---
**Diseño de Arquitectura por:** Arquitectura e Ingeniería de Datos SGC-DM  
**Estatus:** **VIGENTE - ARQUITECTURA DE ANALÍTICA OFICIAL**
