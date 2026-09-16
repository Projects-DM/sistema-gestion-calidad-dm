# Sprint 43.0 – Dashboard Inteligente e Indicadores Operativos

## Objetivo

Evolucionar el Dashboard principal del Sistema de Gestión de Calidad hacia una arquitectura modular desacoplada, consumiendo datos reales desde Supabase y reemplazando la lógica embebida por una estructura reutilizable, mantenible y escalable.

El Sprint busca consolidar el Dashboard como un módulo independiente capaz de crecer sin afectar el resto de la aplicación.

---

# Arquitectura implementada

Se implementó una arquitectura en cinco capas siguiendo los principios de separación de responsabilidades utilizados en el Runtime del sistema.

```
Supabase
      │
      ▼
dashboardService
      │
      ▼
dashboardCalculations
      │
      ▼
useDashboardMetrics
      │
      ▼
Dashboard.jsx
```

Cada capa posee una responsabilidad única:

- **dashboardService**
  - Obtiene información desde Supabase.
  - Centraliza todas las consultas del Dashboard.

- **dashboardCalculations**
  - Contiene lógica pura de negocio.
  - Calcula todas las métricas sin depender de React.

- **useDashboardMetrics**
  - Administra loading, errores y estado.
  - Expone métricas y actividad reciente.

- **Dashboard.jsx**
  - Consume únicamente el hook.
  - No contiene lógica de negocio.

---

# KPIs implementados

Se reemplazaron los indicadores de prueba por métricas reales.

### Registros Hoy

Cantidad de registros creados durante el día actual.

---

### Total Registros

Cantidad histórica de registros almacenados.

---

### Incumplimientos

Cantidad de registros cuyo estado de validación es:

```
rechazado
```

Representa registros que requieren acciones correctivas.

---

### Alertas Activas

Cantidad de registros que contienen al menos un valor numérico fuera de los límites configurados (min / max).

---

### Actividad Reciente

Visualización de los últimos cinco registros creados en el sistema.

---

# Componentes creados

## DashboardMetricCard

Componente reutilizable para representar cualquier KPI.

Preparado para futuras métricas.

---

## DashboardRecentActivity

Componente desacoplado encargado de mostrar la actividad reciente del sistema.

---

# Responsive Design

Se rediseñó el comportamiento responsive del Dashboard.

## Mobile

- Grid 2 × 2
- Tarjetas compactas
- Menor padding
- Iconografía adaptativa

## Tablet

- Grid de 2 columnas

## Desktop

- Grid de 4 columnas

Con este cambio los indicadores dejan de ocupar toda la pantalla en dispositivos pequeños, permitiendo visualizar inmediatamente los módulos del sistema.

---

# Beneficios obtenidos

- Arquitectura completamente desacoplada.
- Eliminación de lógica de negocio dentro de la vista.
- Componentes reutilizables.
- KPIs alimentados con datos reales.
- Mejor organización del código.
- Mejor experiencia en dispositivos móviles.
- Mayor facilidad para mantenimiento futuro.

---

# Preparado para futuros Sprints

La arquitectura quedó preparada para incorporar nuevas métricas sin modificar la vista.

Ejemplos:

- Formularios vencidos.
- Registros pendientes por firma.
- Documentos próximos a vencer.
- Indicadores por proceso.
- Indicadores por responsable.
- Indicadores por sede.
- Tendencias históricas.
- Gráficos estadísticos.

Únicamente será necesario extender:

- dashboardService
- dashboardCalculations

sin modificar Dashboard.jsx.

---

# Archivos principales

```
src/modules/dashboard/
```

- services/dashboardService.js
- utils/dashboardCalculations.js
- hooks/useDashboardMetrics.js
- components/DashboardMetricCard.jsx
- components/DashboardRecentActivity.jsx

---

# Estado del Sprint

✅ Implementado

✅ Compilación exitosa

✅ Validado funcionalmente

✅ Responsive verificado

✅ Arquitectura preparada para crecimiento futuro