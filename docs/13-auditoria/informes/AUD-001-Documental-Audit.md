# AUD-001 — AUDITORÍA DE ESTRUCTURA Y CLASIFICACIÓN DOCUMENTAL
**Proyecto:** SGC-DM
**Tipo:** Auditoría documental
**Modo:** READ-ONLY / SOLO LECTURA
**Objetivo:** Diseñar el mapa de reorganización documental antes de realizar cualquier movimiento de archivos.

---

# 1. OBJETIVO

Realizar una **auditoría exhaustiva de la documentación Markdown existente dentro de `docs/`**, con el propósito de determinar:

* qué documentación existe;
* dónde se encuentra actualmente;
* cuál es su función real;
* qué documentación es vigente;
* qué documentación es histórica;
* qué documentos están fuera de su categoría natural;
* qué documentos pueden permanecer donde están;
* qué documentos deberían migrarse;
* qué documentos presentan posibles duplicidades;
* qué documentos requieren revisión humana;
* cuál debería ser la estructura documental objetivo.

### Resultado principal

Generar un **MAPA DE MIGRACIÓN DOCUMENTAL**, pero **NO ejecutar la migración**.

---

# 2. RESTRICCIÓN ABSOLUTA

Esta auditoría es exclusivamente de **lectura y análisis documental**.

## NO modificar ningún archivo.

Está estrictamente prohibido:

* mover archivos;
* renombrar archivos;
* eliminar archivos;
* crear carpetas;
* modificar contenido Markdown;
* corregir ortografía;
* corregir enlaces;
* actualizar documentación;
* consolidar documentos;
* fusionar documentos;
* modificar código;
* modificar configuración;
* modificar dependencias;
* ejecutar refactorizaciones;
* ejecutar migraciones;
* ejecutar scripts destructivos;
* realizar cambios en Git;
* hacer commits;
* hacer pushes;
* modificar ramas;
* modificar workflows.

### Regla crítica

> **NO realizar ningún cambio físico en el repositorio.**

El resultado de esta operación debe ser únicamente un **informe de auditoría y propuesta de reorganización**.

---

# 3. ALCANCE

Analizar exclusivamente:

```text
docs/**/*.md
```

Incluyendo:

* Markdown ubicado directamente en `docs/`;
* Markdown dentro de cualquier subdirectorio;
* documentación histórica;
* documentación técnica;
* documentación de arquitectura;
* documentación de implementación;
* documentación de auditorías;
* documentación de sprints;
* documentación de procesos;
* documentación de contexto;
* documentación relacionada con IA;
* documentos aparentemente duplicados;
* documentos cuyo propósito no sea evidente.

No asumir que la estructura actual es correcta.

No asumir que el nombre de la carpeta representa el contenido real.

---

# 4. ESTRUCTURA ACTUAL CONOCIDA

La estructura actual reportada del proyecto incluye:

```text
docs/
├── .ai/
├── 00-governance/
├── 01-core-runtime/
├── 02-contracts/
├── 03-validation/
├── 04-infrastructure/
├── 05-implementation/
├── 06-analytics-ai/
├── 07-scalability/
├── 08-registry/
├── 09-business-assets/
├── 10-ai-context/
├── 11-architecture/
├── 12-database/
├── 13-auditoria/
├── 14-sprint/
├── 15-architecture/
└── 16-implementation/
```

También existen documentos Markdown directamente en:

```text
docs/
```

Se han identificado documentos con nombres o conceptos relacionados con:

* architecture
* development
* overview
* document index
* futuro
* oversight
* story
* sprint story
* project
* structured free
* product story

Además existe un volumen importante de documentación histórica de sprints.

---

# 5. PRINCIPIO DE CLASIFICACIÓN

No clasificar archivos únicamente por:

* nombre;
* número de carpeta;
* fecha;
* ubicación actual;
* prefijo;
* nombre del sprint.

La clasificación debe realizarse principalmente mediante **lectura semántica del contenido**.

Para cada documento determinar:

```text
Propósito
Categoría
Subcategoría
Estado
Carácter histórico/vigente
Relaciones
Destino potencial
Confianza
```

---

# 6. CATEGORÍAS DOCUMENTALES OBJETIVO

Utilizar como referencia inicial:

```text
00-governance
01-core-runtime
02-contracts
03-validation
04-infrastructure
05-implementation
06-analytics-ai
07-scalability
08-registry
09-business-assets
10-ai-context
11-architecture
12-database
13-auditoria
14-sprint
99-history
```

### IMPORTANTE

Estas categorías son una **taxonomía de referencia**, no una orden automática de movimiento.

Si el análisis demuestra que un documento encaja mejor en otra categoría, indicarlo.

Si una categoría actual debe conservarse por razones históricas, indicarlo.

Si una nueva subcategoría resulta necesaria, proponerla.

---

# 7. CLASIFICACIÓN REQUERIDA

Cada documento debe clasificarse utilizando como mínimo:

| Campo               | Descripción                               |
| ------------------- | ----------------------------------------- |
| Ruta actual         | Ubicación actual                          |
| Nombre              | Nombre del archivo                        |
| Tipo                | Tipo de documento                         |
| Propósito           | Para qué existe                           |
| Categoría actual    | Carpeta donde está                        |
| Categoría propuesta | Destino conceptual                        |
| Vigencia            | Vigente / Histórico / Mixto / Desconocido |
| Relación            | Documentos relacionados                   |
| Duplicidad          | Sí / No / Posible                         |
| Acción propuesta    | Mantener / Mover / Revisar                |
| Confianza           | Alta / Media / Baja                       |
| Justificación       | Motivo de la clasificación                |

---

# 8. CLASIFICACIÓN DE VIGENCIA

Utilizar exactamente estas categorías:

### VIGENTE

Documento que describe el estado actual del proyecto.

### HISTÓRICO

Documento que representa una etapa anterior del proyecto y debe conservarse como evidencia.

### MIXTO

Documento que contiene información histórica y vigente.

### DESCONOCIDO

No existe evidencia suficiente para determinarlo.

Los documentos `DESCONOCIDO` no deben clasificarse automáticamente como históricos ni vigentes.

---

# 9. CLASIFICACIÓN DE ACCIÓN

Utilizar:

### MANTENER

El documento ya está correctamente ubicado.

### MOVER

El documento tiene un destino claramente identificable.

### REVISAR

Existe ambigüedad suficiente para requerir decisión humana.

### DUPLICIDAD POSIBLE

Existe otro documento con contenido o propósito aparentemente equivalente.

### HISTÓRICO

Debe preservarse como documentación histórica.

---

# 10. AUDITORÍA ESPECIAL DE LA RAÍZ DE docs/

Analizar todos los `.md` directamente ubicados en:

```text
docs/
```

Determinar individualmente si:

* deben permanecer en raíz;
* deben trasladarse a una categoría;
* son índices;
* son documentos de proyecto;
* son documentación histórica;
* son documentos de arquitectura;
* son documentos de desarrollo;
* son documentos de gobierno;
* requieren revisión.

La raíz no debe considerarse automáticamente correcta.

---

# 11. AUDITORÍA ESPECIAL DE 14-sprint

Realizar una revisión exhaustiva de:

```text
docs/14-sprint/
```

Determinar:

* cantidad de sprints;
* rango de sprints;
* nomenclatura utilizada;
* estructura interna;
* consistencia;
* documentos auxiliares;
* relación entre documentos;
* posibles duplicados;
* sprints históricos;
* sprints que puedan corresponder a documentación vigente;
* posibles agrupaciones naturales.

No modificar absolutamente nada.

Proponer una estructura interna futura.

Ejemplo de propuesta posible:

```text
14-sprint/
├── current/
├── active/
└── history/
```

o:

```text
14-sprint/
├── sprint-001-100/
├── sprint-101-200/
├── sprint-201-300/
└── sprint-301-400/
```

No imponer ninguna de estas estructuras sin evidencia.

---

# 12. AUDITORÍA ESPECIAL DE 15-architecture

Analizar:

```text
docs/15-architecture/
```

Determinar para cada documento si corresponde realmente a:

```text
11-architecture/
```

o si:

* pertenece a una etapa histórica;
* corresponde a implementación;
* corresponde a contratos;
* corresponde a runtime;
* es transversal;
* debe permanecer separado;
* requiere revisión.

No mover documentos.

---

# 13. AUDITORÍA ESPECIAL DE 16-implementation

Analizar:

```text
docs/16-implementation/
```

Determinar si cada documento corresponde realmente a:

```text
05-implementation/
```

o si:

* es histórico;
* pertenece a arquitectura;
* pertenece a auditoría;
* pertenece a desarrollo/sprints;
* pertenece a otra categoría;
* requiere revisión.

No realizar cambios.

---

# 14. AUDITORÍA DE DUPLICADOS

Buscar:

### Duplicados exactos

Documentos cuyo contenido sea esencialmente idéntico.

### Duplicados semánticos

Documentos diferentes que describen el mismo concepto.

### Versiones

Documentos que parecen representar diferentes versiones del mismo documento.

### Documentos relacionados

Documentos diferentes pero complementarios.

---

## RESTRICCIÓN

No eliminar ningún posible duplicado.

No fusionar documentos.

No sobrescribir documentos.

Solo reportarlos.

---

# 15. AUDITORÍA DE REFERENCIAS

Identificar referencias internas entre documentos Markdown.

Ejemplos:

```text
../archivo.md
./carpeta/archivo.md
[Documento](../architecture/archivo.md)
```

Determinar:

* qué documentos hacen referencia a otros;
* qué documentos son centrales;
* qué movimientos podrían romper referencias;
* qué documentos dependen de otros.

### NO corregir enlaces.

Solo reportar el impacto potencial.

---

# 16. ANÁLISIS DE DEPENDENCIAS DOCUMENTALES

Identificar relaciones del tipo:

```text
Documento A
     ↓
Documento B
     ↓
Documento C
```

Especialmente:

* índices;
* documentos principales;
* documentos de arquitectura;
* especificaciones;
* auditorías;
* sprints;
* documentos históricos.

Esto permitirá determinar el orden correcto de una futura migración.

---

# 17. PROPUESTA DE ESTRUCTURA FUTURA

Después de analizar toda la documentación, proponer una estructura final.

La propuesta debe diferenciar:

```text
DOCUMENTACIÓN VIGENTE
        ↓
DOCUMENTACIÓN HISTÓRICA
        ↓
DOCUMENTACIÓN DE AUDITORÍA
        ↓
DOCUMENTACIÓN DE SPRINT
        ↓
DOCUMENTACIÓN TÉCNICA
```

No mover nada todavía.

---

# 18. MAPA DE MIGRACIÓN

Este es el entregable principal.

Generar una tabla:

| # | Archivo actual | Categoría actual | Destino propuesto | Acción | Vigencia | Confianza | Motivo |
| - | -------------- | ---------------- | ----------------- | ------ | -------- | --------- | ------ |

Ejemplo:

```text
001
docs/15-architecture/system-overview.md
→ docs/11-architecture/system-overview.md
→ MOVER
→ VIGENTE
→ ALTA
→ El contenido corresponde a arquitectura vigente.
```

Otro ejemplo:

```text
002
docs/Sprint-382.md
→ docs/14-sprint/history/Sprint-382.md
→ MOVER
→ HISTÓRICO
→ ALTA
→ Documento de evolución histórica del proyecto.
```

Y:

```text
003
docs/project.md
→ docs/?
→ REVISAR
→ DESCONOCIDO
→ BAJA
→ El documento contiene información transversal.
```

---

# 19. MATRIZ DE AMBIGÜEDAD

Todos los documentos con confianza:

```text
MEDIA
BAJA
```

deben aparecer en una sección independiente:

```text
DOCUMENTOS QUE REQUIEREN DECISIÓN HUMANA
```

Para cada uno explicar:

1. qué contiene;
2. cuáles son los posibles destinos;
3. por qué existe ambigüedad;
4. qué otros documentos están relacionados;
5. qué decisión se necesita.

---

# 20. MÉTRICAS DE LA AUDITORÍA

Presentar al final:

```text
Total Markdown:
Total carpetas documentales:
Markdown en raíz:
Documentos por categoría:
Documentos históricos:
Documentos vigentes:
Documentos mixtos:
Documentos con posible duplicidad:
Documentos con referencias internas:
Documentos con destino claro:
Documentos que requieren revisión:
```

También presentar:

```text
% clasificación alta confianza
% clasificación media
% clasificación baja
```

---

# 21. ESTRUCTURA ACTUAL VS ESTRUCTURA PROPUESTA

Presentar ambas.

## Actual

```text
docs/
├── ...
```

## Propuesta

```text
docs/
├── ...
```

Explicar brevemente cada diferencia.

---

# 22. CRITERIOS DE ÉXITO

La auditoría será considerada correcta si:

* se revisaron todos los Markdown;
* no se modificó ningún archivo;
* no se eliminó documentación;
* no se movió ningún archivo;
* se identificaron documentos fuera de categoría;
* se identificó documentación histórica;
* se identificaron posibles duplicados;
* se identificaron referencias internas;
* se produjo un mapa completo de migración;
* los casos ambiguos quedaron separados;
* existe una estructura documental objetivo clara.

---

# 23. COMANDOS PERMITIDOS

Únicamente comandos de lectura/análisis.

Ejemplos permitidos:

```bash
find
ls
tree
cat
head
tail
grep
rg
git status
git ls-files
git log
git diff
```

Los comandos deben utilizarse únicamente para inspección.

---

# 24. COMANDOS / ACCIONES PROHIBIDOS

No utilizar:

```bash
mv
rm
rmdir
git mv
git rm
git commit
git push
```

Tampoco utilizar scripts que modifiquen archivos.

---

# 25. FORMATO DEL INFORME FINAL

El informe final debe tener exactamente estas secciones:

```text
# AUD-001 — Informe de Auditoría Documental

## 1. Resumen ejecutivo

## 2. Inventario documental

## 3. Estructura actual

## 4. Clasificación por categoría

## 5. Documentos en raíz

## 6. Auditoría de 14-sprint

## 7. Auditoría de 15-architecture

## 8. Auditoría de 16-implementation

## 9. Documentos históricos

## 10. Documentos vigentes

## 11. Posibles duplicados

## 12. Referencias internas

## 13. Documentos ambiguos

## 14. Estructura propuesta

## 15. Mapa completo de migración

## 16. Riesgos de migración

## 17. Métricas

## 18. Validación de solo lectura

## 19. Recomendación para la siguiente fase
```

---

# 26. RESULTADO ESPERADO

La ejecución de esta auditoría debe terminar **SIN MODIFICAR EL REPOSITORIO**.

El resultado debe permitir posteriormente realizar una segunda fase independiente:

```text
AUD-001
Auditoría
     ↓
Mapa de migración
     ↓
Revisión humana
     ↓
APROBACIÓN
     ↓
AUD-002
Migración documental
     ↓
Validación
```

No ejecutar `AUD-002` durante esta tarea.

---

# 27. PRINCIPIO FINAL

> **Primero entender. Después clasificar. Después proponer. Finalmente migrar.**

La documentación histórica del proyecto constituye evidencia y no debe sacrificarse para conseguir una estructura más limpia.

**Preservación y trazabilidad tienen prioridad sobre simplificación.**