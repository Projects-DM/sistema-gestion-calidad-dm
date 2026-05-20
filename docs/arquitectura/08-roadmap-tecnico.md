# ROADMAP TÉCNICO - SGC EMPRESARIAL

**Documento:** Plan Estratégico de Desarrollo Arquitectónico  
**Versión:** 2.0  
**Clasificación:** Documentación Técnica Estratégica  
**Sistema:** Sistema de Gestión de Calidad (SGC) DM Distribuciones

---

## 1. VISIÓN DEL ROADMAP

### 1.1 Filosofía del Roadmap

```
FILOSOFÍA: CONSOLIDAR ANTES DE EXTENDER
├── Fase A: Estabilizar y optimizar lo existente
├── Fase B: Extender con motores especializados
├── Fase C: Profundizar calidad y documentación
├── Fase D: Preparar para IA y escalar a SaaS
└── Fase E: Internacionalizar y crear ecosistema
```

### 1.2 Línea de Tiempo General

```
2026                             2027                             2028
├──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
Q2     Q3     Q4     Q1     Q2     Q3     Q4     Q1     Q2     Q3     Q4
│      │      │      │      │      │      │      │      │      │      │
FASE A  FASE B        FASE C        FASE D               FASE E
│      │      │      │      │      │      │      │      │      │      │
Consoli-│Manten│Calidad│  IA   │  IA   │  IA   │SaaS   │SaaS   │Global │Global
dación  │imien │Docu-  │Prepa- │Detec- │Asis-  │Multi- │API    │Inter- │Ecos-
│      │to    │mental │ración │ción   │tencia │tenant │Pública │nacion │istema
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

### 1.3 Estructura de Cada Fase

Cada fase se documenta con la siguiente estructura:

```
## FASE X: [Nombre]
**Duración:** [Período]
**Prioridad:** [Alta/Media/Baja]
**Dependencias:** [Qué debe estar listo antes]

### Objetivos
### Componentes a Crear/Modificar
### Riesgos
### Impacto
### Complejidad
### Compatibilidad
### Requisitos Previos
### Entregables
### Criterios de Éxito
```

---

## 2. FASE A: CONSOLIDACIÓN Y OPTIMIZACIÓN (Q2-Q3 2026)

**Duración:** Mayo — Agosto 2026 (4 meses)  
**Prioridad:** 🔴 CRÍTICA  
**Dependencias:** Ninguna (es la base)

### 2.1 Objetivos

```
OBJETIVOS DE LA FASE A
├── Estabilizar arquitectura existente
├── Optimizar performance crítica (paginación, índices)
├── Implementar testing automatizado
├── Completar documentación técnica
├── Monitoreo y backups
└── Preparar base para motores futuros
```

### 2.2 Sprint 1-2: Performance y Seguridad (Mayo-Junio)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Paginación en getModuleResponses | dynamicService.js | 1 día | Ninguna | 🔴 Timeout con >100K registros |
| Índices compuestos en DB | Base de Datos | 1 hora | Acceso SQL Editor | 🟡 Bajo |
| Compresión de imágenes | EvidenceUploader | 2 días | browser-image-compression | 🟡 Storage costos |
| Límite de tamaño de evidencias | EvidenceUploader | 1 día | Ninguna | 🟡 Storage flooding |
| Validación MIME type | EvidenceUploader | 1 día | magic-bytes library | 🟡 Seguridad |

**Script SQL a ejecutar:**
```sql
-- Ejecutar inmediatamente en Supabase SQL Editor
CREATE INDEX IF NOT EXISTS idx_responses_form_date ON sgc_form_responses(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_status ON sgc_form_responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_date ON sgc_form_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_values_response ON sgc_response_values(response_id);
CREATE INDEX IF NOT EXISTS idx_evidences_response ON sgc_evidences(response_id);
CREATE INDEX IF NOT EXISTS idx_audit_response_date ON sgc_audit_logs(response_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_module_active ON sgc_forms(module_id, is_active);
```

### 2.3 Sprint 3-4: Testing y Documentación (Julio-Agosto)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Configurar Vitest | Proyecto | 1 día | Ninguna | 🟡 Regresiones sin tests |
| Tests para dynamicService | dynamicService.js | 3 días | Vitest configurado | 🟡 Crítico sin cobertura |
| Tests para motores | Motores | 2 días | Vitest configurado | 🟡 Medio |
| Configurar Playwright E2E | Proyecto | 2 días | Ninguna | 🟡 Flujos no validados |
| Configurar Sentry | Proyecto | 1 día | Cuenta Sentry | 🟡 Bugs no detectados |
| Backups automáticos | Supabase | 1 día | Configuración proyecto | 🔴 Pérdida de datos |
| Documentación técnica | /docs | 3 días | Código estable | 🟡 Onboarding lento |

### 2.4 Riesgos de la Fase A

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|:-----------:|------------|
| Los índices afectan write performance | Bajo | Media | Monitorear después de creación |
| browser-image-compression incompatible con algunos formatos | Medio | Baja | Validar formatos soportados |
| Tests flaky en Playwright | Medio | Media | Timeouts adecuados, retry logic |
| Sentry quota excedida | Bajo | Baja | Configurar rate limiting |

### 2.5 Entregables

- [x] Sistema con paginación funcional
- [x] 7 índices compuestos creados en DB
- [x] Imágenes comprimidas al subir (reducción 80%)
- [x] Límite de 10MB en evidencias
- [x] Cobertura de tests >70% en dynamicService
- [x] Suite E2E para flujo completo (crear + verificar)
- [x] Sentry integrado y reportando
- [x] Backups diarios configurados
- [x] Documentación técnica completa en /docs

### 2.6 Criterios de Éxito

| Métrica | Actual | Objetivo Fase A |
|---------|:------:|:---------------:|
| Carga de historial (1K registros) | ~500ms | <200ms |
| Carga de historial (100K registros) | Timeout | <2s |
| Submit de formulario | ~500ms | <300ms |
| Subida de evidencia (10MB) | ~5s | <2s |
| Cobertura de tests | 0% | >70% |
| Bundle inicial (gzip) | ~300KB | <250KB |

---

## 3. FASE B: MOTORES ESPECIALIZADOS Y MANTENIMIENTO (Q3-Q4 2026)

**Duración:** Septiembre — Diciembre 2026 (4 meses)  
**Prioridad:** 🟡 ALTA  
**Dependencias:** Fase A completada (índices, paginación, tests)

### 3.1 Objetivos

```
OBJETIVOS DE LA FASE B
├── Implementar BaseMantenimiento con tablas satélite
├── Implementar EngineRegistry con lazy loading
├── Sistema de alertas de vencimiento
├── Dashboard de equipos
├── Caché de consultas frecuentes
└── Code splitting de rutas
```

### 3.2 Sprint 5-6: EngineRegistry y Caché (Septiembre-Octubre)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| EngineRegistry formal | DynamicForm.jsx | 2 días | Fase A completa | 🟡 Medio |
| Lazy loading de motores | DynamicForm.jsx | 1 día | EngineRegistry | 🟢 Bajo |
| CacheService para consultas | dynamicService.js | 1 día | Ninguna | 🟡 Datos obsoletos en caché |
| Code splitting de rutas | App.jsx | 1 día | Ninguna | 🟢 Bajo |
| Optimistic locking (version column) | DB + Service | 2 días | Migración SQL | 🟡 Concurrencia |

### 3.3 Sprint 7-8: BaseMantenimiento (Noviembre-Diciembre)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Crear sgc_equipos | Base de Datos | 1 día | Ninguna | 🟡 Bajo |
| Crear sgc_mantenimiento_repuestos | Base de Datos | 1 día | Ninguna | 🟡 Bajo |
| Implementar BaseMantenimiento.jsx | Motor | 5 días | EngineRegistry | 🟡 Complejidad media |
| Selector de equipos con búsqueda | Componente | 2 días | sgc_equipos existe | 🟢 Bajo |
| Cálculo de próxima fecha | Servicio | 1 día | Ninguna | 🟢 Bajo |
| Dashboard de equipos | Página | 3 días | BaseMantenimiento | 🟡 Medio |
| Alertas de mantenimiento vencido | Sistema | 2 días | Dashboard | 🟡 Medio |

### 3.4 Tablas Satélite a Crear

```sql
-- Ejecutar antes de implementar BaseMantenimiento
CREATE TABLE IF NOT EXISTS sgc_equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    ubicacion TEXT,
    frecuencia_mantenimiento INTEGER,
    ultimo_mantenimiento DATE,
    proximo_mantenimiento DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sgc_mantenimiento_repuestos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES sgc_form_responses(id) ON DELETE CASCADE,
    repuesto TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    costo NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Riesgos de la Fase B

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|:-----------:|------------|
| BaseMantenimiento duplica lógica existente | Medio | Media | Revisar reutilización de EvidenceUploader, SignaturePad |
| EngineRegistry rompe carga actual | Alto | Baja | Pruebas E2E antes del deploy |
| Caché devuelve datos obsoletos | Medio | Media | TTL adecuado, invalidación en escritura |
| Optimistic locking causa errores en usuarios simultáneos | Bajo | Alta | Mensaje claro de conflicto |

### 3.6 Entregables

- [x] EngineRegistry con lazy loading operativo
- [x] CacheService reduciendo consultas en 60%
- [x] Code splitting implementado (bundle -30%)
- [x] Optimistic locking en sgc_form_responses
- [x] Tabla sgc_equipos con datos semilla
- [x] Motor BaseMantenimiento funcional
- [x] Dashboard de equipos con alertas
- [x] Cálculo automático de próxima fecha de mantenimiento

---

## 4. FASE C: CALIDAD Y GESTIÓN DOCUMENTAL (Q1-Q2 2027)

**Duración:** Enero — Junio 2027 (6 meses)  
**Prioridad:** 🟡 ALTA  
**Dependencias:** Fase B completada (EngineRegistry, BaseMantenimiento)

### 4.1 Objetivos

```
OBJETIVOS DE LA FASE C
├── Implementar BaseCalidad con CAPA completo
├── Implementar BaseDocumental con control de versiones
├── Workflow de aprobación multi-nivel
├── Vistas materializadas para reports
├── Mejora de RLS policies por rol
└── Refinamiento de reglas de negocio
```

### 4.2 Sprint 9-11: BaseCalidad (Enero-Marzo)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Crear sgc_capa | Base de Datos | 1 día | Ninguna | 🟢 Bajo |
| Implementar BaseCalidad.jsx | Motor | 5 días | EngineRegistry | 🟡 Complejidad media-alta |
| Análisis de causa raíz (5 Whys) | Componente UI | 2 días | BaseCalidad | 🟡 Medio |
| Workflow de aprobación | Servicio | 3 días | BaseCalidad | 🟡 Complejidad alta |
| Dashboard de CAPA | Página | 3 días | BaseCalidad | 🟡 Medio |
| Seguimiento de eficacia | Componente | 2 días | BaseCalidad | 🟡 Medio |
| Alertas de vencimiento CAPA | Sistema | 1 día | BaseCalidad | 🟢 Bajo |

### 4.3 Sprint 12-14: BaseDocumental (Abril-Junio)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Crear sgc_documentos_control | Base de Datos | 1 día | Ninguna | 🟢 Bajo |
| Implementar BaseDocumental.jsx | Motor | 5 días | EngineRegistry | 🟡 Complejidad alta |
| Control de versiones | Servicio | 3 días | BaseDocumental | 🟡 Complejidad alta |
| Flujo de aprobación (elaborador→revisor→aprobador) | Workflow | 4 días | BaseDocumental | 🟡 Complejidad alta |
| Matriz de documentos | Página | 2 días | BaseDocumental | 🟡 Medio |
| Alertas de revisión | Sistema | 1 día | BaseDocumental | 🟢 Bajo |
| Vistas materializadas (mv_module_responses) | Base de Datos | 2 días | Ninguna | 🟡 Performance |

### 4.4 Tablas Satélite a Crear

```sql
CREATE TABLE IF NOT EXISTS sgc_capa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES sgc_form_responses(id) ON DELETE CASCADE,
    clasificacion TEXT NOT NULL,
    severidad TEXT NOT NULL,
    causa_raiz TEXT,
    accion_correctiva TEXT,
    accion_preventiva TEXT,
    responsable UUID REFERENCES profiles(id),
    fecha_compromiso DATE,
    fecha_cierre DATE,
    eficacia_verificada BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sgc_documentos_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    fecha_emision DATE NOT NULL,
    fecha_revision DATE,
    estado TEXT NOT NULL DEFAULT 'vigente',
    aprobado_por UUID REFERENCES profiles(id),
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Riesgos de la Fase C

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|:-----------:|------------|
| Workflow de aprobación complejo de implementar | Alto | Media | Empezar con workflow lineal simple |
| Control de versiones documental requiere diseño cuidadoso | Alto | Media | Investigar patrones existentes |
| Vistas materializadas con datos desactualizados | Medio | Baja | Refresh programado cada hora |
| BaseCalidad se superpone con lógica de DynamicRecordsView | Medio | Media | Reutilizar componentes existentes |

### 4.6 Entregables

- [x] Tabla sgc_capa con DDL completo
- [x] Motor BaseCalidad funcional con CAPA
- [x] Workflow de aprobación multi-nivel
- [x] Dashboard de CAPA con indicadores
- [x] Tabla sgc_documentos_control
- [x] Motor BaseDocumental con versionamiento
- [x] Matriz de documentos operativa
- [x] Vistas materializadas para reports rápidos

---

## 5. FASE D: IA Y PREPARACIÓN SAAS (Q3 2027 - Q1 2028)

**Duración:** Julio 2027 — Marzo 2028 (9 meses)  
**Prioridad:** 🟡 ALTA  
**Dependencias:** Fases A, B, C completadas

### 5.1 Objetivos

```
OBJETIVOS DE LA FASE D
├── Preparación de datos para IA (taxonomías, embeddings)
├── Detección de anomalías (Isolation Forest)
├── Clasificación automática de hallazgos
├── OCR documental básico
├── Arquitectura multi-tenant (tenant_id)
├── Tabla tenants y gestión de planes
└── RLS policies por tenant
```

### 5.2 Sprint 15-17: Preparación IA (Julio-Septiembre 2027)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Estandarizar taxonomías | Base de Datos | 2 días | Fase C completa | 🟡 Medio |
| Crear v_ia_responses_flat | Base de Datos | 1 día | Ninguna | 🟢 Bajo |
| DataNormalizer | Servicio | 2 días | Ninguna | 🟢 Bajo |
| Columna embedding + pgvector | Base de Datos | 1 día | Extensión vector | 🟡 Medio |
| Edge Function para embeddings | Supabase | 3 días | API OpenAI key | 🟡 Costo API |
| Función match_responses (RPC) | Base de Datos | 1 día | pgvector | 🟢 Bajo |

### 5.3 Sprint 18-20: Detección y Clasificación (Octubre-Diciembre 2027)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Modelo Isolation Forest | Python/ML | 3 días | v_ia_responses_flat | 🟡 Precisión baja |
| API /api/ml/check-anomaly | Edge Function | 2 días | Modelo entrenado | 🟡 Falsos positivos |
| Dashboard de anomalías | Frontend | 3 días | API anomaly | 🟡 Medio |
| Clasificador híbrido (reglas + ML) | Servicio | 3 días | Taxonomías | 🟡 Medio |
| Feedback loop para corrección | Frontend | 2 días | Clasificador | 🟢 Bajo |

### 5.4 Sprint 21-23: Multi-Tenant (Enero-Marzo 2028)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Crear tabla tenants | Base de Datos | 1 día | Ninguna | 🔴 Migración datos existentes |
| Agregar tenant_id a tablas EAV | Base de Datos | 2 días | Tabla tenants | 🔴 Costoso si hay datos |
| Actualizar RLS policies | Base de Datos | 2 días | tenant_id agregado | 🔴 Seguridad |
| Panel de administración de tenants | Frontend | 5 días | Tabla tenants | 🟡 Complejidad media |
| Límites por plan | Servicio | 3 días | Panel tenants | 🟡 Medio |
| Migración de datos existentes | Base de Datos | 2 días | tenant_id agregado | 🔴 Crítico |

### 5.5 Riesgos de la Fase D

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|:-----------:|------------|
| Migración a multi-tenant costosa si no se planifica | Crítico | Media | Agregar tenant_id con default desde ahora |
| Modelos de IA con baja precisión | Medio | Alta | Empezar con reglas determinísticas + ML progresivo |
| Costos de API OpenAI impredecibles | Medio | Media | Caché de respuestas, modelos open-source alternativos |
| pgvector no disponible en Supabase plan actual | Alto | Baja | Verificar disponibilidad, alternativa: embeddings en servicio externo |
| Datos insuficientes para entrenamiento | Alto | Baja | Usar datos desde implementación del sistema |

### 5.6 Entregables

- [x] Taxonomías estandarizadas en toda la BD
- [x] Vista plana v_ia_responses_flat creada
- [x] DataNormalizer implementado
- [x] Columna embedding + pgvector operativo
- [x] API de detección de anomalías funcional
- [x] Dashboard de anomalías con alertas
- [x] Clasificador automático de hallazgos
- [x] Tabla tenants + tenant_id en tablas EAV
- [x] RLS policies por tenant
- [x] Panel de administración multi-tenant

---

## 6. FASE E: SAAS, INTERNACIONALIZACIÓN Y ECOSISTEMA (Q2-Q4 2028)

**Duración:** Abril — Diciembre 2028 (9 meses)  
**Prioridad:** 🟢 MEDIA  
**Dependencias:** Fase D completada (multi-tenant, IA básica)

### 6.1 Objetivos

```
OBJETIVOS DE LA FASE E
├── Sistema RAG completo para consultas
├── Generación automática de informes con IA
├── API pública REST
├── Internacionalización (i18n)
├── Marketplace de plugins
├── Integraciones ERP/IoT
└── Certificación INVIMA/ISO 9001
```

### 6.2 Sprint 24-26: IA Avanzada (Abril-Junio 2028)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Chatbot RAG con búsqueda semántica | Frontend + API | 4 semanas | Embeddings + API OpenAI | 🟡 Complejidad alta |
| Generación automática de informes | Servicio | 3 semanas | API OpenAI | 🟡 Costo API |
| OCR documental (Tesseract.js) | Edge Function | 3 semanas | Almacenamiento imágenes | 🟡 Precisión OCR |
| Auto-completado predictivo | Frontend | 2 semanas | Modelos ML | 🟡 UX |

### 6.3 Sprint 27-29: API Pública y SaaS (Julio-Septiembre 2028)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| Diseñar API REST | Documentación | 2 semanas | Multi-tenant operativo | 🟡 Diseño |
| Autenticación con API keys | Backend | 2 semanas | API REST | 🔴 Seguridad |
| Documentación Swagger/OpenAPI | Documentación | 1 semana | API REST | 🟢 Bajo |
| SDK de JavaScript | Paquete NPM | 3 semanas | API REST | 🟡 Medio |
| Webhooks para integraciones | Backend | 2 semanas | API REST | 🟡 Medio |
| Facturación con Stripe | Backend | 3 semanas | Multi-tenant | 🟡 Complejidad |

### 6.4 Sprint 30-32: Internacionalización y Ecosistema (Octubre-Diciembre 2028)

| Tarea | Componente | Esfuerzo | Dependencia | Riesgo |
|-------|-----------|:--------:|:-----------:|:------:|
| i18n con react-i18next | Frontend | 3 semanas | Ninguna | 🟡 Esfuerzo |
| Traducción inglés/portugués | Contenido | 2 semanas | i18n implementado | 🟢 Bajo |
| Integración ERP (Odoo/SAP) | API | 4 semanas | API pública | 🟡 Complejidad alta |
| Integración IoT (sensores) | API | 4 semanas | API pública | 🟡 Complejidad alta |
| Marketplace de plugins | Frontend + API | 6 semanas | API pública | 🟡 Complejidad alta |
| Certificación INVIMA | Documentación | 4 semanas | Sistema completo | 🔴 Crítico |
| Certificación ISO 9001 | Documentación | 4 semanas | Sistema completo | 🔴 Crítico |

### 6.5 Riesgos de la Fase E

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|:-----------:|------------|
| Certificación INVIMA/ISO requiere auditoría externa | Crítico | Media | Preparar documentación con anticipación |
| API pública expone datos sensibles | Crítico | Baja | Rate limiting, auth keys, scopes |
| Traducciones incorrectas en i18n | Medio | Media | Revisión por hablantes nativos |
| Integración ERP compleja y costosa | Alto | Media | Priorizar integraciones más demandadas |
| Marketplace requiere moderación | Medio | Alta | Políticas claras de publicación |

### 6.6 Entregables

- [x] Chatbot RAG operativo con búsqueda semántica
- [x] Informes ejecutivos generados por IA
- [x] OCR funcional para digitalización de documentos
- [x] API REST pública documentada
- [x] SDK de JavaScript publicado en NPM
- [x] Webhooks para integraciones
- [x] Facturación con Stripe operativa
- [x] Internacionalización (ES, EN, PT)
- [x] Integración con ERP (Odoo/SAP)
- [x] Marketplace de plugins
- [x] Certificación INVIMA obtenida
- [x] Certificación ISO 9001 obtenida

---

## 7. MAPA DE DEPENDENCIAS ENTRE FASES

```
FASE A (Consolidación)
├── Necesario para: FASE B, C, D, E
└── Depende de: Nada (base)

FASE B (Motores Mantenimiento)
├── Necesario para: FASE C (comparten patrones)
└── Depende de: FASE A (índices, paginación, tests)

FASE C (Calidad + Documental)
├── Necesario para: FASE D (datos enriquecidos para IA)
└── Depende de: FASE A + B (EngineRegistry)

FASE D (IA + Multi-tenant)
├── Necesario para: FASE E (SaaS)
└── Depende de: FASE A + B + C (sistema maduro)

FASE E (SaaS + Internacional)
├── Necesario para: — (fase final)
└── Depende de: FASE A + B + C + D (todo completo)
```

---

## 8. MATRIZ DE IMPACTO Y ESFUERZO

| Fase | Impacto | Esfuerzo | Complejidad | Riesgo | Prioridad |
|:----:|:-------:|:--------:|:-----------:|:-----:|:---------:|
| **A** | 🔴 Crítico | Bajo (1 mes) | Baja | Medio | 🔴 P-0 |
| **B** | 🟡 Alto | Medio (2 meses) | Media | Medio | 🟡 P-1 |
| **C** | 🟡 Alto | Alto (3 meses) | Alta | Medio | 🟡 P-2 |
| **D** | 🟡 Alto | Alto (4 meses) | Alta | Alto | 🟡 P-3 |
| **E** | 🟢 Medio | Muy Alto (6 meses) | Muy Alta | Alto | 🟢 P-4 |

---

## 9. MÉTRICAS DE PROGRESO

### 9.1 KPIs por Fase

| KPI | Fase A | Fase B | Fase C | Fase D | Fase E |
|-----|:------:|:------:|:------:|:------:|:------:|
| Performance historial | <200ms | <150ms | <100ms | <80ms | <50ms |
| Cobertura de tests | >70% | >80% | >85% | >90% | >95% |
| Motores operativos | 3 | 4 | 6 | 6 | 7 |
| Tablas satélite | 0 | 2 | 4 | 4 | 5 |
| Capacidades IA | 0 | 0 | 0 | 3 | 6 |
| Tenants soportados | 1 | 1 | 1 | 10 | 100 |
| Usuarios concurrentes | 50 | 100 | 200 | 500 | 5,000 |
| Uptime | 95% | 97% | 99% | 99.5% | 99.9% |

### 9.2 Hitos Clave

```
✅ FASE A COMPLETA: Sistema estable, optimizado, documentado y testeado
   └── Decisión: ¿Continuar a Fase B o priorizar otras necesidades?

✅ FASE B COMPLETA: Mantenimiento operativo con motor especializado
   └── Decisión: ¿Suficiente para operación o avanzar a Calidad?

✅ FASE C COMPLETA: Calidad y documental integrados al sistema
   └── Decisión: ¿Preparar IA o escalar a SaaS primero?

✅ FASE D COMPLETA: IA básica operativa + arquitectura multi-tenant
   └── Decisión: ¿Lanzar SaaS o continuar con IA avanzada?

✅ FASE E COMPLETA: Plataforma global, certificada, con ecosistema
   └── Nueva etapa: Evolución continua
```

---

## 10. PLAN DE CONTINGENCIA

### 10.1 Escenarios de Desviación

| Escenario | Síntoma | Acción Correctiva |
|-----------|---------|-------------------|
| Fase A se extiende >6 meses | Performance no mejora, bugs constantes | Priorizar solo índices + paginación, diferir testing |
| Fase B demasiado compleja | BaseMantenimiento >3 meses | Lanzar versión reducida sin dashboard de equipos |
| Fase C bloquea por workflow | Aprobación multi-nivel muy compleja | Implementar workflow lineal simple primero |
| Fase D sin datos para ML | <500 registros históricos | Usar solo reglas determinísticas, diferir ML |
| Fase E sin presupuesto IA | Costos API muy altos | Usar modelos open-source self-hosted |
| Multi-tenant bloquea por deuda técnica | Migración de datos muy costosa | Mantener single-tenant, preparar solo esquema |

### 10.2 Priorización Alternativa

Si el negocio requiere priorizar diferente:

```
ESCENARIO: Prioridad SaaS antes que IA
├── Mover multi-tenant (Fase D) antes de IA
├── Reducir alcance de IA a solo clasificación básica
└── Diferir RAG, OCR, predicción a Fase E+

ESCENARIO: Prioridad certificación antes que escalar
├── Mover BaseAuditoria y BaseDocumental (Fase C) antes
├── Preparar documentación INVIMA/ISO en paralelo
└── Diferir multi-tenant hasta después de certificación
```

---

## 11. RECOMENDACIONES FINALES

### 11.1 Orden de Implementación Recomendado

1. **FASE A** — Completar al 100% antes de avanzar. Es la base de todo.
2. **FASE B** — BaseMantenimiento da valor inmediato a operaciones.
3. **FASE C** — Calidad y Documental completan el core del SGC.
4. **FASE D** — IA y multi-tenant preparan el sistema para escalar.
5. **FASE E** — SaaS, internacionalización y ecosistema global.

### 11.2 Decisiones Críticas por Tomar

| Decisión | Debe Tomarse Antes | Impacto |
|----------|:------------------:|---------|
| ¿Usar browser-image-compression o backend para compresión? | Fase A | Define arquitectura de evidencias |
| ¿EngineRegistry con lazy loading inmediato? | Fase B | Impacta rendimiento y bundle |
| ¿pgvector en Supabase o servicio externo? | Fase D | Define estrategia de embeddings |
| ¿OpenAI o LLM self-hosted? | Fase D | Define costos y privacidad |
| ¿Migrar datos legacy de trazabilidad a EAV? | Fase C | Unifica arquitectura |

### 11.3 No Hacer (Anti-roadmap)

```
NO HACER EN ESTE ROADMAP:
❌ NO reescribir dynamicService.js desde cero
❌ NO migrar trazabilidad legacy a EAV (por ahora)
❌ NO cambiar el stack tecnológico (React/Supabase)
❌ NO implementar modo offline (PWA) antes de Fase D
❌ NO crear app nativa móvil (React Native) antes de Fase E
❌ NO implementar blockchain para trazabilidad (overkill)
```

---

**Documento mantenido por:** Arquitectura de Software  
**Última actualización:** Mayo 2026  
**Próxima revisión:** Agosto 2026