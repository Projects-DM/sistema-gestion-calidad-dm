# Arquitectura General - SGC Empresarial

## 1. Visión Global del Sistema
El Sistema de Gestión de Calidad (SGC) de DM Distribuciones es una aplicación web empresarial de tipo **Single Page Application (SPA)**, renderizada en el cliente (CSR), diseñada para digitalizar de manera dinámica todos los formatos operativos, de calidad y de mantenimiento de la compañía.

El paradigma arquitectónico principal es un modelo **EAV (Entity-Attribute-Value)** complementado por **Motores Dinámicos de Renderizado**. Esta decisión de diseño permite al sistema crecer escalarmente en número de formularios y áreas de negocio sin requerir modificaciones constantes en el esquema de base de datos relacional (SQL).

## 2. Stack Tecnológico (Frontend / Backend)
- **Frontend Core:** React 18 (Vite)
- **Estilos:** Tailwind CSS 3 (Implementando un sistema visual Premium / Glassmorphism)
- **Enrutamiento:** React Router DOM v6
- **Backend as a Service:** Supabase
  - **Auth:** Supabase Authentication (Manejo de sesiones, Tokens JWT).
  - **Base de Datos:** PostgreSQL (Gestión relacional y JSONB).
  - **Almacenamiento:** Supabase Storage (Evidencias, firmas y PDFs).
- **Seguridad:** Row Level Security (RLS) habilitado en el motor de DB.

## 3. Patrón Dinámico y Estructura EAV
La espina dorsal del SGC es el patrón EAV, que desacopla la definición del formulario de sus respuestas:

- **Entity (Entidad):** `sgc_form_responses`. Representa un "documento" diligenciado, con metadata general (quién lo llenó, estado de aprobación, fecha).
- **Attribute (Atributo):** `sgc_form_fields`. Representa las preguntas o campos del formulario (Ej: "¿Área limpia?", "Nivel de Cloro", "Firma").
- **Value (Valor):** `sgc_response_values`. Contiene el dato real asociado a un registro y a un campo. Para soportar tipos estrictos, se usan columnas separadas (`value_text`, `value_number`, `value_boolean`, `value_json`).

**Ventaja Arquitectónica:** 
No se requieren migraciones (DDL) para agregar un nuevo formulario o un nuevo campo. Basta con inyectar la configuración en las tablas maestras y el Frontend lo interpretará en tiempo real.

## 4. Orquestación y Flujo de Renderizado
1. **Configuración en Base de Datos:** Los módulos (`sgc_modules`) agrupan formularios (`sgc_forms`). Cada formulario define qué *motor* (`engine_type`) lo debe renderizar.
2. **Carga Reactiva:** Al navegar a una ruta dinámica (ej. `/operaciones/limpieza-diaria`), el orquestador (`DynamicForm.jsx`) descarga la definición del formulario y sus campos.
3. **Inyección de Motor:** Basado en el `engine_type` (ej. `BaseChecklist`), el orquestador delega el renderizado de los campos (Attributes) al componente especializado.
4. **Validación y Envío:** El orquestador recolecta los valores (Values), ejecuta validaciones transversales (ej. firmas obligatorias, evidencias condicionales) y envía el payload a `dynamicService.js`.

## 5. Separación por Módulos y "Legacy"
- **Módulos Dinámicos:** (Operaciones, Mantenimiento, Calidad, Medición). Todos utilizan la arquitectura EAV y renderizan a través del ecosistema `DynamicForm` y `DynamicRecordsView`.
- **Módulo Trazabilidad (Legacy):** El módulo de despachos y trazabilidad se construyó previamente de manera estática y fuertemente tipada. Por decisión arquitectónica, **NO se ha modificado** y coexiste pacíficamente en la misma SPA para no comprometer el core del negocio logístico.

## 6. Escalabilidad
La arquitectura está diseñada bajo los principios de OCP (Open/Closed Principle). Para agregar funcionalidades complejas futuras (ej. Planes de Mantenimiento Preventivo), el sistema no modificará el motor dinámico existente, sino que agregará "Tablas Satélites" y "Motores como Plugins" que se conectan al identificador único de la respuesta (`response_id`).
