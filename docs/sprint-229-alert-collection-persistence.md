# Sprint 229 — Alert Collection Persistence & Metadata Evolution

> Nivel 5 · Colección de alertas · Implementación de persistencia · Evolución de metadata

## Tipo
Presentation → Application → Persistence Integration

**Impacto:** evolución controlada de la persistencia de AlertConfiguration. No modifica
Alert Engine, Notification Engine, Runtime, Evaluation Engine, Providers ni arquitectura
operacional certificada.

---

## 1. Resumen

Los Sprint 227–228 certificaron la administración visual de múltiples alertas y
localizaron la causa raíz: la colección existía **solo en memoria** dentro del
`AlertConfigurationPanel`. El Sprint 229 extiende el flujo de persistencia para que una
**colección completa** de alertas se almacene y se reconstruya, reutilizando íntegramente
la infraestructura certificada.

No se modifica el Alert Engine ni se introducen motores, servicios o contratos paralelos.

## 2. Modelo de persistencia → colección

```
Recurso ── alertConfiguration ──► alertConfigurations[]
Cada elemento: AlertConfiguration (contrato certificado, sin V2)
```

- **Grabación:** `configs[] → mapFormStateToMetadata() → collection[] → { alertConfigurations: [...] }`
- **Lectura/reconstrucción:** `alertConfigurations[] → Resolver → mapMetadataToFormState() → configs[] → Panel`

## 3. Cambios implementados (aditivos, sin romper)

| Archivo | Cambio |
|--------|--------|
| `AlertConfigurationMapper.js` | +`mapCollectionToFormStates`, +`mapFormStatesToCollection` (reusanos por-item) |
| `AlertConfigurationResolver.js` | `extractResourceAlertMetadata` compatible con array (expone el primario); +`extractResourceAlertCollection`, +`resolveResourceAlertCollection` |
| `AlertConfigurationApplicationService.js` | +`loadCollection(resource)`, +`saveCollection({resource, formStates})` |
| `AlertConfigurationPanel.jsx` | carga `loadCollection` y persiste `saveCollection` (reconstruye toda la colección) |

El **Mapper** por-item (`mapMetadataToFormState`/`mapFormStateToMetadata`), el **Value
Object** `AlertConfiguration` y la **Validación** se reutilizan tal cual. No se crean
`AlertConfigurationV2` ni `AlertMetadataV2`.

## 4. Compatibilidad (retrocompatible)

- Recurso con `alertConfiguration` (único) → Resolver produce una colección de **1**.
- Recurso con `alertConfigurations` → reconstruye toda la colección.
- `resolveResourceAlertConfiguration` (lectura simple) sigue funcionando: desenvuelve el
  **primario** cuando existe el envelope de colección → los consumidores operacionales del
  Alert Engine no se rompen y no requieren migración obligatoria.

## 5. Responsabilidades
- **Panel:** colección, selección, creación, duplicación, eliminación. Nunca evalúa.
- **Form:** edita una sola alerta. Nunca administra colecciones.
- **Application Service:** persiste la colección completa. Nunca calcula estados.
- **Alert Engine:** evalúa la metadata persistida. No conoce la UI.
- **Módulo Operacional:** consume resultados; no administra ni persiste.

## 6. Compatibilidad / alcance excluido
Fuera de este sprint: estados visuales, próxima ejecución, vencida, badge de severidad,
Bell del Dashboard, panel de notificaciones, dashboard consolidado (Sprint 230+).

## 7. Certificación PC1–PC16 → **16/16 PASS**

Reúso: Panel, Form, Application Service, Mapper, Resolver, Metadata, Runtime, Alert
Engine, Notification Engine; sin engines/providers/repositories/contratos nuevos; la
configuración permanece en el módulo Configuración; el módulo operacional sigue siendo
consumidor de estados; SSOT (9 campos canónicos, motores, runtime) intacto.

## 8. Continuidad
Con esto queda **persistida** la colección. Sprint 230+: estados visuales operacionales
(Activa · Próxima · Hoy · Vencida · Deshabilitada), Bell del Dashboard y dashboard
consolidado, consumiendo únicamente el estado del Alert Engine.