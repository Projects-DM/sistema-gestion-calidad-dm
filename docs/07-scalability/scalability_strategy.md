# ESCALABILIDAD Y PERFORMANCE - SGC EMPRESARIAL

**Documento:** Análisis de Cuellos de Botella, Riesgos de Crecimiento y Estrategias de Optimización  
**Versión:** 1.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. VISIÓN GENERAL DE ESCALABILIDAD

### 1.1 Estados de Crecimiento

```
ESTADO ACTUAL (2026)
├── 1 empresa (DM Distribuciones)
├── ~1,000 registros en sgc_form_responses
├── ~5,000 registros en sgc_response_values
├── ~500 evidencias en Storage
├── Performance: ~500ms en consultas
└── Usuarios concurrentes: ~10-20

ESTADO 1 AÑO (2027)
├── 1-5 empresas
├── ~100,000 registros
├── ~500,000 response_values
├── ~50,000 evidencias (~50GB)
├── Performance: ~5-10s (SIN optimización) ⚠️
└── Usuarios concurrentes: ~50-100

ESTADO 3 AÑOS (2029) — SaaS
├── 50+ empresas
├── ~5,000,000 registros
├── ~25,000,000 response_values
├── ~2,500,000 evidencias (~2.5TB)
├── Performance: Timeout (SIN optimización) ❌
└── Usuarios concurrentes: ~500-1,000
```

### 1.2 Filosofía de Escalabilidad

```
ESCALAR POR COMPOSICIÓN, NO POR REEMPLAZO
├── El núcleo EAV escala horizontalmente
├── Los índices y vistas materializadas resuelven performance
├── El particionamiento y archivado mantienen la DB ágil
├── El caching reduce carga en consultas repetitivas
├── El aislamiento por tenant permite crecimiento multiempresa
└── La optimización es incremental, no por reescritura
```

---

## 2. CUELLOS DE BOTELLA IDENTIFICADOS

### 2.1 Base de Datos — Consulta de Historial (CRÍTICO)

**Problema:** `dynamicService.getModuleResponses(moduleId)` carga TODOS los registros sin paginación.

**Código actual:**
```javascript
async getModuleResponses(moduleId) {
  const { data, error } = await supabase
    .from('sgc_form_responses')
    .select(`
      id, status, created_at, created_by, verified_at, verification_comment,
      sgc_forms!inner ( id, name, module_id ),
      profiles:created_by ( nombre, rol ),
      verifier:verified_by ( nombre, rol ),
      sgc_response_values ( field_id, value_text, value_number, value_boolean,
        sgc_form_fields ( label, field_type, options ) ),
      sgc_evidences ( id, file_url, file_type )
    `)
    .eq('sgc_forms.module_id', moduleId)
    .order('created_at', { ascending: false });
  return data;
}
```

**Proyección de degradación:**

| Registros | JOINs involucrados | Tiempo estimado | Estado |
|-----------|-------------------|:---------------:|:------:|
| 1,000 | 5 (forms, profiles x2, values+fields, evidences) | ~500ms | ✅ Actual |
| 10,000 | 5 | ~3s | ⚠️ Con paginación |
| 100,000 | 5 | ~30s | 🔴 Sin índices |
| 1,000,000 | 5 | Timeout | ❌ Colapsa |

**Causa raíz:**
- Sin cláusula `.range(from, to)` → carga todo
- Sin índices compuestos en `(form_id, created_at DESC)`
- Los JOINs a `sgc_response_values` + `sgc_form_fields` son N+1 implícitos
- Sin límite en la respuesta del cliente Supabase

### 2.2 Base de Datos — Índices Faltantes

**Índices actuales vs necesarios:**

| Tabla | Índices Actuales | Índices Necesarios | Impacto |
|-------|-----------------|-------------------|---------|
| sgc_form_responses | PK (id), FK (form_id, created_by) | `(form_id, created_at DESC)`, `(status)`, `(created_at DESC)` | 🔴 Crítico |
| sgc_response_values | PK (id), FK (response_id, field_id) | `(response_id)`, `(field_id)` | 🟡 Medio |
| sgc_evidences | PK (id), FK (response_id) | `(response_id)` | 🟡 Medio |
| sgc_audit_logs | PK (id), FK (response_id, modified_by) | `(response_id, created_at DESC)`, `(created_at DESC)` | 🟡 Medio |
| sgc_forms | PK (id), UNIQUE (slug) | `(module_id, is_active)` | 🟢 Bajo |

### 2.3 Storage de Evidencias

**Problema:** Las imágenes se suben sin compresión en tamaño original.

**Impacto proyectado:**

| Período | Volumen | Costo Supabase Storage (~$0.02/GB) |
|---------|---------|-----------------------------------|
| 1 mes | ~9 GB (300 fotos × 30 días × 1MB) | ~$0.18 |
| 6 meses | ~54 GB | ~$1.08 |
| 1 año | ~108 GB | ~$2.16 |
| 3 años | ~324 GB | ~$6.48 |
| SaaS 50 empresas (1 año) | ~5.4 TB | ~$108 |

**Con compresión (reducción estimada 80%):**
| Período | Volumen | Costo |
|---------|---------|-------|
| 1 año (actual) | ~21.6 GB | ~$0.43 |
| SaaS 50 empresas (1 año) | ~1.08 TB | ~$21.60 |

### 2.4 Frontend — Bundle Size

**Problema:** Carga de todos los motores y dependencias en el bundle principal.

```
Bundle actual (estimado):
├── React + React DOM          ~130 KB
├── React Router DOM           ~50 KB
├── Supabase Client            ~30 KB
├── Motores (todos)            ~80 KB
├── Lucide Icons               ~150 KB
├── Tailwind CSS (compilado)   ~200 KB
├── jsPDF + autotable          ~150 KB
├── XLSX                       ~100 KB
└── Total estimado             ~890 KB (sin gzip)
```

**Sin code splitting:** Todos los motores y librerías se cargan en el bundle inicial, incluso si no se usan.

### 2.5 Sin Caché de Consultas

**Problema:** Cada navegación ejecuta consultas a Supabase sin caché intermedio.

```
Sin caché:
Dashboard → 3 consultas (módulos, stats, recientes)
Módulo → 2 consultas (módulo, formularios)
Formulario → 2 consultas (formulario, campos)
Historial → 1 consulta pesada (getModuleResponses)

Total por sesión típica: ~8 consultas a Supabase
Usuarios simultáneos (50): ~400 consultas/minuto
```

### 2.6 Sin Control de Concurrencia

**Problema:** Ediciones simultáneas provocan "Last Write Wins".

```
Escenario de conflicto:
1. Usuario A abre formulario en t=0
2. Usuario B abre mismo formulario en t=1
3. Usuario A guarda en t=10 → status = 'pendiente_revision'
4. Usuario B guarda en t=12 → Sobrescribe A
5. Datos de A perdidos sin notificación
```

### 2.7 Sin Transaccionalidad Real en Submit

**Problema:** El submit ejecuta 4 INSERTs secuenciales sin BEGIN/COMMIT.

```javascript
// Flujo actual (sin transacción):
await supabase.from('sgc_form_responses').insert(...)      // PASO 1
await supabase.from('sgc_response_values').insert(...)      // PASO 2
await supabase.from('sgc_evidences').insert(...)            // PASO 3
await supabase.from('sgc_audit_logs').insert(...)           // PASO 4
// Si falla paso 3: pasos 1 y 2 ya persistieron → datos huérfanos
```

---

## 3. ESTRATEGIAS DE OPTIMIZACIÓN

### 3.1 Paginación en getModuleResponses (PRIORIDAD #1)

**Solución:**
```javascript
async getModuleResponses(moduleId, page = 1, pageSize = 50) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('sgc_form_responses')
    .select(`
      id, status, created_at, created_by, verified_at, verification_comment,
      sgc_forms!inner ( id, name, module_id ),
      profiles:created_by ( nombre, rol ),
      verifier:verified_by ( nombre, rol ),
      sgc_response_values ( field_id, value_text, value_number, value_boolean,
        sgc_form_fields ( label, field_type, options ) ),
      sgc_evidences ( id, file_url, file_type )
    `, { count: 'exact' })
    .eq('sgc_forms.module_id', moduleId)
    .order('created_at', { ascending: false })
    .range(from, to);

  return {
    data,
    totalPages: Math.ceil(count / pageSize),
    currentPage: page,
    totalRecords: count
  };
}
```

**Beneficio:** Reducción de 100% de registros a solo 50 por página.

### 3.2 Índices Compuestos (PRIORIDAD #2)

```sql
-- EJECUTAR INMEDIATAMENTE
CREATE INDEX IF NOT EXISTS idx_responses_form_date
  ON sgc_form_responses(form_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_responses_status
  ON sgc_form_responses(status);

CREATE INDEX IF NOT EXISTS idx_responses_created_date
  ON sgc_form_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_values_response
  ON sgc_response_values(response_id);

CREATE INDEX IF NOT EXISTS idx_evidences_response
  ON sgc_evidences(response_id);

CREATE INDEX IF NOT EXISTS idx_audit_response_date
  ON sgc_audit_logs(response_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forms_module_active
  ON sgc_forms(module_id, is_active);
```

**Beneficio:** Las consultas con JOINs pasan de full table scans a index scans.

### 3.3 Compresión de Evidencias (PRIORIDAD #3)

```javascript
// Integrar en EvidenceUploader.jsx
import imageCompression from 'browser-image-compression';

async function compressImage(file) {
  const options = {
    maxSizeMB: 1,            // Reducción de 10MB → 1MB
    maxWidthOrHeight: 1920,  // Resolución suficiente para evidencia
    useWebWorker: true,      // No bloquea UI
    fileType: 'image/jpeg'   // JPEG con calidad optimizada
  };
  return await imageCompression(file, options);
}

// Generar thumbnail para preview
async function generateThumbnail(file) {
  const options = {
    maxSizeMB: 0.1,          // ~100KB para galería
    maxWidthOrHeight: 400,   // Preview rápido
    useWebWorker: true
  };
  return await imageCompression(file, options);
}
```

**Beneficio:** Reducción de 80-90% en tamaño de storage y 70% en tiempo de carga.

### 3.4 Lazy Loading de Motores (PRIORIDAD #4)

```javascript
// EngineRegistry con lazy loading
const ENGINE_REGISTRY = {
  'BaseChecklist': () => import('../components/engines/BaseChecklist'),
  'BaseMediciones': () => import('../components/engines/BaseMediciones'),
  'BaseGeneric': () => import('../components/engines/BaseGeneric'),
  'BaseCRUD': () => import('../components/engines/BaseCRUD'),
  'BaseAuditoria': () => import('../components/engines/BaseAuditoria')
};

// DynamicForm carga solo el motor necesario
const [EngineComponent, setEngineComponent] = useState(null);

useEffect(() => {
  async function loadEngine() {
    const loader = ENGINE_REGISTRY[formDef.engine_type] || ENGINE_REGISTRY['BaseGeneric'];
    const Module = await loader();
    setEngineComponent(() => Module.default);
  }
  if (formDef?.engine_type) loadEngine();
}, [formDef?.engine_type]);
```

**Beneficio:** El bundle inicial se reduce en ~80KB (solo se carga el motor necesario).

### 3.5 Code Splitting de Rutas

```javascript
// App.jsx — Lazy loading de páginas
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DynamicModule = lazy(() => import('./pages/DynamicModule'));
const DynamicForm = lazy(() => import('./pages/DynamicForm'));
const Configuration = lazy(() => import('./pages/Configuration'));

<Routes>
  <Route path="/" element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
  <Route path="/:moduleSlug" element={<Suspense fallback={<Loader />}><DynamicModule /></Suspense>} />
  <Route path="/modulo/:moduleSlug/:formSlug" element={<Suspense fallback={<Loader />}><DynamicForm /></Suspense>} />
</Routes>
```

**Beneficio:** Cada página se carga solo cuando se navega a ella.

### 3.6 Vistas Materializadas

```sql
-- Vista materializada para consultas de historial
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_module_responses AS
SELECT
  r.id, r.status, r.created_at, r.verified_at,
  f.id as form_id, f.name as form_name, f.module_id,
  p.id as user_id, p.nombre as user_name, p.rol as user_rol,
  COUNT(DISTINCT rv.id) as values_count,
  COUNT(DISTINCT e.id) as evidences_count,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM sgc_response_values rv2
      JOIN sgc_form_fields ff ON rv2.field_id = ff.id
      WHERE rv2.response_id = r.id
        AND ff.field_type = 'boolean' AND rv2.value_boolean = false
    ) THEN 'advertencia'
    ELSE 'cumple'
  END as computed_status
FROM sgc_form_responses r
JOIN sgc_forms f ON r.form_id = f.id
JOIN profiles p ON r.created_by = p.id
LEFT JOIN sgc_response_values rv ON r.id = rv.response_id
LEFT JOIN sgc_evidences e ON r.id = e.response_id
GROUP BY r.id, f.id, f.name, f.module_id, p.id, p.nombre, p.rol;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS ON mv_module_responses(id);
CREATE INDEX IF NOT EXISTS ON mv_module_responses(module_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ON mv_module_responses(status);

-- Refresh automático (cada hora)
SELECT cron.schedule('refresh-mv-module', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_module_responses');
```

**Beneficio:** Las consultas de historial pasan de 5 JOINs a 1 SELECT con índice.

### 3.7 Caché de Consultas Frecuentes

```javascript
// Caché simple en memoria para datos que cambian poco
class CacheService {
  constructor(ttlMs = 300000) { // 5 minutos por defecto
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  async get(key, fetcher) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return cached.data;
    }
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  invalidate(key) {
    this.cache.delete(key);
  }
}

// Uso en dynamicService
const moduleCache = new CacheService(3600000); // 1 hora para módulos

async getModules() {
  return moduleCache.get('modules:all', async () => {
    const { data } = await supabase.from('sgc_modules').select('*');
    return data;
  });
}
```

**Beneficio:** Las consultas a módulos y formularios (que raramente cambian) se reducen de N a 1.

### 3.8 Optimistic Locking para Concurrencia

```sql
ALTER TABLE sgc_form_responses
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_version
BEFORE UPDATE ON sgc_form_responses
FOR EACH ROW EXECUTE FUNCTION increment_version();
```

```javascript
async function updateResponse(id, data, expectedVersion) {
  const { data: result, error } = await supabase
    .from('sgc_form_responses')
    .update(data)
    .eq('id', id)
    .eq('version', expectedVersion)
    .select();

  if (!result || result.length === 0) {
    throw new Error('Conflicto de versión. El registro fue modificado por otro usuario.');
  }
  return result[0];
}
```

**Beneficio:** Previene pérdida de datos por ediciones simultáneas.

### 3.9 Particionamiento de Tablas

```sql
-- Preparar sgc_form_responses para particionamiento por fecha
CREATE TABLE sgc_form_responses_partitioned (
  LIKE sgc_form_responses INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Crear particiones trimestrales
CREATE TABLE sgc_form_responses_2026_q1 PARTITION OF sgc_form_responses_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE sgc_form_responses_2026_q2 PARTITION OF sgc_form_responses_partitioned
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- Automatizar creación de particiones (cron mensual)
CREATE OR REPLACE FUNCTION create_next_partition()
RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := date_trunc('quarter', CURRENT_DATE + interval '3 months');
  end_date := start_date + interval '3 months';
  partition_name := 'sgc_form_responses_' || to_char(start_date, 'YYYY_Q"Q"');
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF sgc_form_responses
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

**Beneficio:** Las consultas por rango de fecha solo escanean la partición relevante.

### 3.10 Archivado de Datos Históricos

```sql
-- Tabla de archivo (cold storage)
CREATE TABLE IF NOT EXISTS sgc_form_responses_archive (
  LIKE sgc_form_responses INCLUDING ALL
);

-- Mover registros > 2 años (ejecutar mensualmente)
CREATE OR REPLACE FUNCTION archive_old_responses()
RETURNS void AS $$
BEGIN
  INSERT INTO sgc_form_responses_archive
  SELECT * FROM sgc_form_responses
  WHERE created_at < NOW() - INTERVAL '2 years';

  DELETE FROM sgc_form_responses
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Vista unificada para consultas históricas
CREATE VIEW sgc_form_responses_all AS
SELECT *, false as is_archived FROM sgc_form_responses
UNION ALL
SELECT *, true as is_archived FROM sgc_form_responses_archive;
```

**Beneficio:** La tabla activa mantiene solo datos recientes → consultas más rápidas.

---

## 4. ROADMAP DE OPTIMIZACIÓN

### 4.1 Prioridades

| Prioridad | Optimización | Impacto | Esfuerzo | Dependencias |
|-----------|-------------|---------|----------|--------------|
| 🔴 P-0 | Paginación en getModuleResponses | Crítico | 1 día | Ninguna |
| 🔴 P-0 | Índices compuestos en DB | Crítico | 1 hora | Acceso a Supabase SQL Editor |
| 🔴 P-1 | Compresión de evidencias | Alto | 2 días | browser-image-compression |
| 🟡 P-2 | Lazy loading de motores | Medio | 1 día | EngineRegistry |
| 🟡 P-2 | Caché de consultas | Medio | 1 día | CacheService |
| 🟡 P-3 | Code splitting de rutas | Medio | 1 día | React.lazy |
| 🟢 P-4 | Vistas materializadas | Medio | 2 días | Diseño de MV |
| 🟢 P-4 | Optimistic locking | Medio | 1 día | Migración SQL |
| 🔵 P-5 | Particionamiento | Bajo | 3 días | Migración datos |
| 🔵 P-5 | Archivado | Bajo | 2 días | Proceso batch |

### 4.2 Fases de Implementación

```
FASE INMEDIATA (Semana 1-2)
├── Paginación en getModuleResponses (range + pageSize=50)
├── Índices compuestos en DB
├── Límite de tamaño de evidencias (10MB)
└── Monitoreo de queries lentas (Supabase Logs)

FASE CORTO PLAZO (Mes 1-2)
├── Compresión de imágenes (browser-image-compression)
├── Lazy loading de motores (EngineRegistry)
├── Caché de consultas (CacheService)
└── Code splitting de rutas (React.lazy + Suspense)

FASE MEDIANO PLAZO (Mes 3-4)
├── Vistas materializadas (mv_module_responses)
├── Optimistic locking (version column)
├── Validación MIME type en evidencias
└── Refinar RLS policies

FASE LARGO PLAZO (Q3-Q4 2026)
├── Particionamiento de sgc_form_responses
├── Archivado automático de datos históricos
├── Redis/Upstash para caché distribuido
└── CDN para assets estáticos y evidencias
```

---

## 5. MÉTRICAS DE PERFORMANCE

### 5.1 KPIs Actuales vs Objetivo

| Métrica | Actual | Objetivo Q2 2026 | Objetivo Q4 2026 | Herramienta |
|---------|:------:|:----------------:|:----------------:|-------------|
| Carga de historial (1K registros) | ~500ms | <200ms | <100ms | Supabase Logs |
| Carga de historial (100K registros) | Timeout | <2s | <500ms | Supabase Logs |
| Submit de formulario | ~500ms | <300ms | <200ms | Performance API |
| Subida de evidencia (10MB) | ~5s | <2s | <1s | Network tab |
| Bundle inicial (gzip) | ~300KB | <200KB | <150KB | Lighthouse |
| Time to Interactive | ~2s | <1.5s | <1s | Lighthouse |
| Consultas a Supabase por sesión | ~8 | <6 | <4 | Network tab |

### 5.2 Monitoreo Propuesto

```javascript
// Servicio de monitoreo de performance
class PerformanceMonitor {
  log(operation, startTime, metadata = {}) {
    const duration = Date.now() - startTime;
    console.log(`[PERF] ${operation}: ${duration}ms`, metadata);

    // Enviar a Supabase para analytics
    supabase.from('sgc_performance_logs').insert({
      operation,
      duration_ms: duration,
      metadata,
      user_id: getCurrentUser(),
      timestamp: new Date().toISOString()
    });
  }
}

// Uso en dynamicService
const perf = new PerformanceMonitor();

async getModuleResponses(moduleId) {
  const start = Date.now();
  const data = await this._executeQuery(moduleId);
  perf.log('getModuleResponses', start, { moduleId, recordsCount: data.length });
  return data;
}
```

---

## 6. RIESGOS DE ESCALABILIDAD

### 6.1 Riesgos Técnicos

| ID | Riesgo | Síntoma | Impacto | Ventana | Mitigación |
|----|--------|---------|---------|---------|------------|
| **ESC-01** | Crecimiento de sgc_response_values sin índices | Queries lentas, timeout | Alto | 6 meses | Índices compuestos en (response_id) |
| **ESC-02** | Storage de evidencias sin compresión | Costos elevados, carga lenta | Medio | 3 meses | Compresión en cliente |
| **ESC-03** | Bundle sin code splitting | TTI lento, mala experiencia mobile | Medio | Inmediato | Lazy loading + code splitting |
| **ESC-04** | Sin caché de consultas | Sobrecarga de Supabase, cuotas | Medio | 1 mes | CacheService en memoria |
| **ESC-05** | Sin paginación | Timeout, app inusable | Crítico | Inmediato | range() en queries |
| **ESC-06** | Sin control de concurrencia | Pérdida de datos, inconsistencia | Alto | 3 meses | Optimistic locking |
| **ESC-07** | Sin transaccionalidad real | Datos huérfanos | Medio | 6 meses | Edge Function transaccional |
| **ESC-08** | Crecimiento de sgc_audit_logs | Tabla masiva sin podar | Bajo | 12 meses | Archivado + particionamiento |
| **ESC-09** | Sin tenant_id en esquema | Migración costosa a multi-tenant | Alto | 12 meses | Agregar tenant_id ahora con default |
| **ESC-10** | Dependencia total de Supabase | Vendor lock-in, sin failover | Crítico | Continuo | Capa de abstracción planning |

### 6.2 Riesgos de Mantenimiento

| ID | Riesgo | Impacto | Mitigación |
|----|--------|---------|------------|
| **ESC-11** | Sin tests automatizados | Regresiones en cada cambio | Vitest + Playwright |
| **ESC-12** | Sin documentación de DB | Onboarding lento de desarrolladores | Documentación en /docs |
| **ESC-13** | Sin monitoreo de errores | Bugs no detectados en producción | Sentry |
| **ESC-14** | Sin backup automático | Pérdida total de datos | Backup diario Supabase |
| **ESC-15** | Sin logging de performance | Degradación no detectada | PerformanceMonitor |

---

## 7. ARQUITECTURA MULTI-TENANT (SAAS)

### 7.1 Preparación Necesaria

```
NIVEL 1: AISLAMIENTO LÓGICO (Ahora)
├── Agregar tenant_id a todas las tablas EAV
├── Default tenant_id = '00000000-0000-0000-0000-000000000001'
├── RLS policy: tenant_id = get_current_tenant()
└── Índices por tenant

NIVEL 2: GESTIÓN DE TENANTS (Q4 2026)
├── Tabla tenants (plan, límites, features)
├── Panel de administración de tenants
├── Límites por plan (max_users, max_storage, max_forms)
└── Facturación (Stripe)

NIVEL 3: AISLAMIENTO FÍSICO (Futuro)
├── Esquemas separados por tenant (PostgreSQL schemas)
├── O bases de datos separadas
└── Routing por subdominio
```

### 7.2 Consideraciones de Performance por Tenant

| Aspecto | Single-tenant | Multi-tenant (50) | Multi-tenant (500) |
|---------|:-------------:|:-----------------:|:------------------:|
| Registros por tenant | 18K/año | 18K/año | 18K/año |
| Total registros | 18K | 900K | 9M |
| Con índices | ✅ OK | ✅ OK | ⚠️ Particionar |
| Sin índices | ⚠️ Lento | ❌ Timeout | ❌ Colapsa |
| Storage evidencias | 10GB | 500GB | 5TB |
| Con compresión | 2GB | 100GB | 1TB |

---

## 8. RECOMENDACIONES FINALES

### 8.1 Acciones Inmediatas (Esta Semana)

1. **Ejecutar CREATE INDEX** en Supabase SQL Editor (7 índices)
2. **Implementar paginación** en `getModuleResponses` con `range(from, to)`
3. **Agregar límite de 10MB** en `EvidenceUploader.jsx`
4. **Revisar RLS policies** para restringir escritura no autorizada

### 8.2 Acciones a Corto Plazo (Este Mes)

5. **Integrar browser-image-compression** en `EvidenceUploader.jsx`
6. **Implementar CacheService** para módulos y formularios
7. **Configurar Sentry** para monitoreo de errores
8. **Agregar version column** para optimistic locking

### 8.3 Acciones a Mediano Plazo (Este Trimestre)

9. **Crear EngineRegistry** con lazy loading
10. **Implementar vistas materializadas** para reports
11. **Configurar backups automáticos** diarios
12. **Crear tabla de performance_logs** para monitoreo

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Julio 2026