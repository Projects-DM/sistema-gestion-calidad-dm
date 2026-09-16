# Sprint 132.6 — Universal Operational Runtime Action Visibility & Responsive UX Certification (SSOT)

**Architecture Status**: LEVEL 3 — CERTIFIED
**Type**: Runtime UX Hardening & Responsive Behavior Certification
**Branch**: operativo-v1
**Dependencies**: Todos los Sprint certificados del Runtime Universal

---

## Resumen Ejecutivo

Se eliminó el comportamiento **hover-only** de las acciones operacionales (Editar, Eliminar) en el Runtime Universal. Las acciones ahora son **siempre visibles**, independientemente del dispositivo, sin depender de `mouseover`, `group-hover` ni `opacity`.

**Cambio**: 1 archivo modificado, 2 ediciones, 0 componentes nuevos, 0 hacks.

---

## Problema Resuelto

### Antes (hover-only):

```jsx
<tr className="... group">
  ...
  <td>
    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
      <button>Editar</button>
      <button>Eliminar</button>
    </div>
  </td>
</tr>
```

**Problemas**:
- ❌ En desktop: requiere mouse + hover para ver acciones
- ❌ En mobile: **no existe hover** → acciones **invisibles permanentemente**
- ❌ El usuario no sabe que el registro es editable
- ❌ Mala experiencia de usuario en dispositivos táctiles
- ❌ Dependencia del CSS `group` que no tiene sentido sin hover

### Después (siempre visibles):

```jsx
<tr className="...">
  ...
  <td>
    <div className="flex flex-wrap gap-1.5 justify-end">
      <button>
        <Edit2 /> <span className="hidden sm:inline">Editar</span>
      </button>
      <button>
        <Trash2 /> <span className="hidden sm:inline">Eliminar</span>
      </button>
    </div>
  </td>
</tr>
```

**Beneficios**:
- ✅ Desktop: acciones visibles sin hover
- ✅ Mobile: acciones visibles sin dependencia táctil
- ✅ El usuario siempre sabe que el registro tiene acciones
- ✅ Responsive: icono en mobile, icono+texto en desktop
- ✅ Flex-wrap: soporta N acciones sin romper layout

---

## Cambios Realizados

### Archivo: `src/modules/experiences/UniversalOperationalRuntime.jsx`

#### Cambio 1 — Línea 810: Eliminar clase `group` del `<tr>`

```jsx
// ANTES
<tr className={`hover:bg-primary/[0.02] transition-colors group ${isIncomplete(record) ? 'bg-amber-50/30' : ''}`}>

// DESPUÉS
<tr className={`hover:bg-primary/[0.02] transition-colors ${isIncomplete(record) ? 'bg-amber-50/30' : ''}`}>
```

La clase `group` solo existía para el selector `group-hover:opacity-100`. Al eliminar la dependencia del hover, `group` ya no tiene función.

#### Cambio 2 — Líneas 861-878: Acciones siempre visibles + responsive

```jsx
// ANTES — hover-only, invisible en mobile
<td className="p-4 pr-6 text-right whitespace-nowrap">
  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <RoleGate allowedRoles={['administrador', 'calidad', 'operativo']}>
      <button onClick={() => handleEdit(record)}
        className="p-1.5 text-gray-400 hover:text-primary bg-white border border-gray-200 rounded-lg shadow-sm" title="Editar">
        <Edit2 className="w-4 h-4" />
      </button>
    </RoleGate>
    <RoleGate allowedRoles={['administrador', 'calidad', 'operativo']}>
      <button onClick={() => handleDelete(record.id)}
        className="p-1.5 text-gray-400 hover:text-red-600 bg-white border border-gray-200 rounded-lg shadow-sm" title="Eliminar">
        <Trash2 className="w-4 h-4" />
      </button>
    </RoleGate>
  </div>
</td>

// DESPUÉS — siempre visible, responsive, touch-friendly
<td className="p-4 pr-6 text-right">
  <div className="flex flex-wrap gap-1.5 justify-end">
    <RoleGate allowedRoles={['administrador', 'calidad', 'operativo']}>
      <button onClick={() => handleEdit(record)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-primary bg-gray-50 hover:bg-primary/5 border border-gray-200 rounded-lg transition-colors" title="Editar">
        <Edit2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Editar</span>
      </button>
    </RoleGate>
    <RoleGate allowedRoles={['administrador', 'calidad', 'operativo']}>
      <button onClick={() => handleDelete(record.id)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors" title="Eliminar">
        <Trash2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Eliminar</span>
      </button>
    </RoleGate>
  </div>
</td>
```

---

## Clases eliminadas vs. agregadas

| Clase | Estado | Motivo |
|-------|--------|--------|
| `group` (en `<tr>`) | ❌ Eliminada | Solo servía para `group-hover` |
| `opacity-0` | ❌ Eliminada | Ocultaba acciones |
| `group-hover:opacity-100` | ❌ Eliminada | Dependencia de hover |
| `transition-opacity` | ❌ Eliminada | Transición innecesaria sin opacity |
| `whitespace-nowrap` | ❌ Eliminada | `flex-wrap` lo reemplaza |
| `shadow-sm` | ❌ Eliminada | Exceso de sombra para botones pequeños |
| `flex-wrap` | ✅ Agregada | Soporte responsive para N acciones |
| `gap-1.5` | ✅ Agregada | Espaciado responsive |
| `hidden sm:inline` | ✅ Agregada | Texto visible solo en desktop |
| `px-2.5 py-1.5` | ✅ Agregada | Touch target más grande |
| `text-xs font-medium` | ✅ Agregada | Tipografía legible |

---

## Comportamiento Responsive

### Desktop (≥640px):

```
┌─────────────────────────────────────────────────────────────┐
│ Cliente    Producto          Cantidad  Estado    Acciones   │
│ CLIENTE X  PECHUGA 120 X 10  24        Pendiente [Editar] [Eliminar] │
└─────────────────────────────────────────────────────────────┘
```

- Botones con icono + texto
- Flex row, gap 1.5

### Mobile (<640px):

```
┌──────────────────────────────────────┐
│ Cliente    Producto         Acciones │
│ CLIENTE X  PECHUGA 120 X 10  [✎]    │
│                              [🗑]    │
└──────────────────────────────────────┘
```

- Botones solo con icono
- Flex-wrap apila verticalmente si es necesario
- Touch targets de 28px+ (comfortable para dedos)

### Futuras acciones:

```
[✎ Editar] [🗑 Eliminar] [📋 Historial] [✓ Aprobar] [📤 Exportar]
```

`flex-wrap` permite que las acciones fluyan a la siguiente línea en pantallas estrechas sin romper el layout.

---

## Archivos Modificados

| Archivo | Cambios | Líneas |
|---------|---------|--------|
| `src/modules/experiences/UniversalOperationalRuntime.jsx` | Eliminar `group` del `<tr>`, reemplazar acciones hover-only por siempre visibles + responsive | 2 |

**Total: 1 archivo, 2 ediciones, 0 archivos nuevos.**

---

## Archivos NO Modificados (Confirmado)

| Archivo | Estado |
|---------|--------|
| `OperationalExperienceRegistry.js` | ✅ Sin cambios |
| `OperationalEventBus.js` | ✅ Sin cambios |
| `OperationalExperienceLifecycleOrchestrator.js` | ✅ Sin cambios |
| `BusinessRulesProcessor.js` | ✅ Sin cambios |
| `operationalRecordsService.js` | ✅ Sin cambios |
| `UniversalImportWorkflow.jsx` | ✅ Sin cambios |
| `despachosService.js` | ✅ Sin cambios |
| Persistence Layer | ✅ Sin cambios |
| Runtime Contracts | ✅ Sin cambios |
| Metadata Factory | ✅ Sin cambios |

---

## Compatibilidad futura

El nuevo patrón soporta cualquier número de acciones operacionales sin modificar el layout:

```jsx
<div className="flex flex-wrap gap-1.5 justify-end">
  <button>Editar</button>
  <button>Eliminar</button>
  <button>Duplicar</button>
  <button>Historial</button>
  <button>Aprobar</button>
  <button>Exportar</button>
  <button>Firmar</button>
  <button>Ver detalle</button>
  <button>Asignar</button>
</div>
```

`flex-wrap` + `gap-1.5` + `justify-end` maneja cualquier cantidad de botones en cualquier tamaño de pantalla.

---

## Certificación

**Architecture Status**: LEVEL 3 — UNIVERSAL OPERATIONAL RUNTIME ACTION VISIBILITY & RESPONSIVE UX CERTIFIED (SSOT)

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| **Acciones siempre visibles** | ✅ | `opacity-0` y `group-hover:opacity-100` eliminados |
| **Sin dependencia de hover** | ✅ | Clase `group` eliminada del `<tr>` |
| **Responsive layout** | ✅ | `flex flex-wrap gap-1.5` con `hidden sm:inline` para labels |
| **Touch-friendly** | ✅ | `px-2.5 py-1.5` (touch target ≥ 28px) |
| **Sin componentes nuevos** | ✅ | 0 componentes creados |
| **Sin lógica específica** | ✅ | Cambio puramente visual, metadata-driven intacto |
| **Sin hacks** | ✅ | Solo Tailwind utility classes estándar |
| **Futuras acciones** | ✅ | `flex-wrap` soporta N botones sin cambios |
| **Runtime intacto** | ✅ | Lógica operacional sin modificar |
