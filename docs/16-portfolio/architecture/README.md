# SGC-DM — Arquitectura

## Propósito

Este directorio contiene la representación visual y la fuente editable de la arquitectura **actualmente implementada y demostrable** de SGC-DM.

El objetivo es explicar, de forma clara y profesional, cómo se relacionan:

- el usuario;
- la aplicación frontend;
- la capa de aplicación/runtime;
- autenticación y autorización;
- PostgreSQL mediante Supabase;
- almacenamiento de archivos;
- políticas RLS;
- flujo de despliegue a producción.

## Archivos

| Archivo | Propósito |
|---|---|
| `sgc-dm-architecture.png` | Diagrama visual para GitHub, README y portafolio |
| `sgc-dm-architecture.mmd` | Fuente editable/reproducible en Mermaid |
| `README.md` | Alcance, interpretación y criterios de representación |

## Arquitectura actual

### 1. Aplicación

SGC-DM utiliza:

- React 19
- Vite 8
- React Router 7
- Runtime Context y componentes dinámicos
- Módulos funcionales
- Formularios y configuración
- Servicios y adaptadores

La aplicación concentra la experiencia de usuario y la lógica de aplicación que coordina las operaciones con la infraestructura de datos.

### 2. Autenticación y autorización

La autenticación utiliza **Supabase Auth** para identidad y sesión.

La aplicación incorpora mecanismos de autorización mediante:

- roles;
- capabilities;
- guards de rutas;
- resolución de acceso.

A nivel de datos se representa **Row Level Security (RLS)** como mecanismo de control aplicado en PostgreSQL.

### 3. Persistencia

La persistencia principal utiliza **PostgreSQL mediante Supabase**.

El diagrama representa la base de datos de forma conceptual. No intenta reproducir todas las tablas, relaciones ni detalles internos del esquema.

### 4. Archivos

**Supabase Storage** gestiona archivos asociados a la operación del sistema, incluyendo evidencia, firmas y documentos.

El bucket representado es:

`documentos-sgc`

### 5. Flujo general

El flujo arquitectónico simplificado es:

```text
Usuario
  ↓
Frontend React
  ↓
Application / Runtime
  ↓
Servicios y adaptadores
  ├── Supabase Auth
  ├── PostgreSQL + RLS
  └── Supabase Storage
  ↓
Resultado
  ↓
Aplicación / Usuario
```

No se representan funciones individuales, llamadas específicas ni todas las operaciones de cada módulo.

## Despliegue actual

El flujo principal de producción es:

```text
GitHub Repository
      ↓
   operativo
      ↓
 GitHub Actions
      ↓
     Build
      ↓
 GitHub Pages
      ↓
  Producción
```

La rama `operativo` corresponde al flujo de producción actualmente utilizado por SGC-DM.

## Alcance

El diagrama representa únicamente componentes actualmente implementados o demostrables.

No se presentan como componentes actuales:

- backend independiente Node.js/Python;
- microservicios;
- API Gateway;
- Redis;
- Kubernetes;
- Supabase Realtime;
- IndexedDB;
- arquitectura offline-first;
- `EngineRegistry`;
- auditoría criptográficamente inmutable.

Esta delimitación evita representar como existentes componentes futuros, hipotéticos o no demostrables.

## Relación con la documentación del proyecto

Este entregable complementa:

- `docs/15-architecture/` — arquitectura formal y ADR;
- `docs/16-portfolio/screenshots/` — evidencia visual funcional;
- `docs/16-portfolio/README.md` — presentación de la evidencia de portafolio.

## Uso en el README principal

Desde `docs/16-portfolio/README.md` se puede integrar mediante:

```markdown
## Arquitectura

![Arquitectura SGC-DM](architecture/sgc-dm-architecture.png)

La representación muestra únicamente componentes actualmente
implementados o demostrables en el proyecto.
```

## Criterios cubiertos por F2-12

- [x] Componentes actuales de arquitectura identificados.
- [x] Frontend y responsabilidades principales.
- [x] Autenticación y sesión.
- [x] Roles/capabilities y control de acceso.
- [x] PostgreSQL mediante Supabase.
- [x] RLS.
- [x] Supabase Storage y bucket `documentos-sgc`.
- [x] Flujo general de datos.
- [x] Flujo actual de despliegue.
- [x] Diferenciación visual entre aplicación, servicios, datos y deployment.
- [x] Formato web-friendly para GitHub/portafolio.
- [x] Fuente editable mediante Mermaid.
- [x] Alcance limitado a arquitectura implementada/demostrable.
