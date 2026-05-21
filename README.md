# 🛡️ Sistema de Gestión de Calidad (SGC) - DM Distribuciones

¡Bienvenido al **Sistema de Gestión de Calidad (SGC)** de **DM Distribuciones**! Esta es una plataforma web enterprise de nivel industrial diseñada para digitalizar, automatizar, verificar y auditar en tiempo real todos los procesos de calidad, trazabilidad logística, mantenimiento y gestión documental de una organización.

La plataforma destaca por su **arquitectura dinámica basada en datos (Data-Driven)** que permite a los administradores diseñar, activar y configurar nuevos formularios de inspección en minutos desde la interfaz gráfica, eliminando por completo la necesidad de alterar el código fuente o realizar complejas migraciones en la base de datos.

---

## 🚀 Tecnologías Clave

El sistema está construido sobre un stack moderno de alto rendimiento, optimizado para ser ágil, responsivo y sumamente interactivo:

*   **Core**: React 19 (SPA) + Vite 8
*   **Estilos**: Tailwind CSS 4 + PostCSS (Aesthetics Premium con micro-animaciones interactivas)
*   **Base de Datos y Backend (BaaS)**: Supabase (PostgreSQL 15 + Autenticación JWT + Row Level Security)
*   **Gestión Documental & Reportes**:
    *   `jspdf` y `jspdf-autotable` para la exportación de certificados de calidad y hojas de control en formato PDF.
    *   `xlsx` para la importación por lotes de registros históricos y despachos desde planillas Excel.
    *   `date-fns` para manipulación de fechas en auditorías.
    *   `lucide-react` para iconografía dinámica.

---

## 📋 Requisitos Previos

Antes de levantar el proyecto localmente, asegúrate de tener instalado lo siguiente en tu entorno de desarrollo:

*   **Node.js**: Versión `v18.0.0` o superior (Se recomienda **`v20.x` LTS** para máxima estabilidad).
*   **Gestor de paquetes**: `npm` (v9 o superior) que se incluye por defecto con Node.js.
*   **Cuenta de Supabase**: Para la creación de la base de datos PostgreSQL, autenticación y almacenamiento de evidencias (Bucket de Storage).

---

## 🔧 Inicialización e Instalación

Sigue estos sencillos pasos para levantar el entorno de desarrollo local en pocos minutos:

### 1. Clonar o Descargar el Proyecto
Asegúrate de estar en el directorio raíz del proyecto:
```bash
cd sistema-gestion-calidad-dm-v1
```

### 2. Instalar Dependencias
Instala los módulos de Node especificados en el `package.json`:
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crea un archivo llamado `.env` en la raíz de tu proyecto basándote en el archivo de ejemplo existente (`.env.example`):
```bash
cp .env.example .env
```
O simplemente crea un nuevo archivo `.env` y agrega tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-api-key-anonima
```

> [!IMPORTANT]
> Nunca expongas tu clave de servicio de Supabase (`service_role_key`) en este archivo frontend. Utiliza siempre la clave anónima (`anon_key`), la cual es segura de exponer gracias a las políticas de seguridad RLS en la base de datos.

### 4. Ejecutar Servidor de Desarrollo
Inicia el servidor local interactivo de Vite:
```bash
npm run dev
```
Una vez ejecutado, abre en tu navegador la URL provista por la consola (generalmente `http://localhost:5173`).

### 5. Compilar para Producción
Si necesitas validar que el bundle se compile correctamente o deseas realizar el despliegue a producción:
```bash
npm run build
```

---

## 🗂️ Estructura del Proyecto

El código fuente está organizado siguiendo las mejores prácticas de modularidad y escalabilidad para React:

```
sistema-gestion-calidad-dm/
├── docs/                 # Documentación técnica extendida (arquitectura, base de datos)
├── sql_*.sql             # Scripts unificados de migración y siembra de base de datos
├── src/
│   ├── assets/           # Imágenes y logos corporativos
│   ├── components/       # Componentes React reutilizables
│   │   └── engines/      # Motores de renderizado dinámico (Checklist, Mediciones, Genérico)
│   ├── config/           # Parámetros y configuraciones por defecto
│   ├── context/          # Contexto global (Autenticación, Sesión, Supabase Connection)
│   ├── hooks/            # Hooks personalizados reutilizables (useAuth)
│   ├── layouts/          # Envolturas del diseño visual de la plataforma (DashboardLayout)
│   ├── lib/              # Inicializadores de librerías externas (cliente Supabase)
│   ├── pages/            # Páginas/vistas principales correspondientes al Router
│   ├── services/         # Capa de API y peticiones a base de datos (Supabase queries)
│   └── utils/            # Generadores de PDF, procesadores de Excel y helpers de fechas
├── tailwind.config.js    # Configuración de diseño visual Tailwind
└── vite.config.js        # Configuración de bundling del compilador Vite
```

---

## 📖 Documentación Extendida

Para profundizar en los detalles técnicos de esta plataforma, consulta la documentación disponible en la carpeta `/docs`:

1.  **Guía de Base de Datos y Despliegue**: [docs/database_setup.md](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/docs/database_setup.md) — Explica la secuencia de ejecución de los scripts SQL, el modelo EAV relacional (con diagramas en Mermaid) y la configuración del Storage de Supabase.
2.  **Arquitectura General del Sistema**: [docs/arquitectura/01-arquitectura-general.md](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/docs/arquitectura/01-arquitectura-general.md) — Visión enterprise, niveles de madurez, mapa de dependencias y flujo de renderizado dinámico.
3.  **Motores de Renderizado Dinámico**: [docs/arquitectura/02-motores-dinamicos.md](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/docs/arquitectura/02-motores-dinamicos.md) — Especificación técnica de cómo funcionan `BaseChecklist` y `BaseMediciones`.
4.  **Modelo EAV Avanzado**: [docs/arquitectura/03-tablas-y-modelo-eav.md](file:///c:/Users/USUARIO/OneDrive/Desktop/proyectos/sistema-gestion-calidad-dm%20-v1/docs/arquitectura/03-tablas-y-modelo-eav.md) — Diccionario detallado de cada tabla dinámica de base de datos.
