# AUDIT_FIX_06_RUNTIME_BOOTSTRAP_ROOT_CAUSE

## Limitación de evidencia (importante)
En esta sesión, la herramienta `search_files` falla sistemáticamente por ausencia de `ripgrep` (error: *Could not find ripgrep binary*). Por lo tanto, **no puedo ejecutar búsquedas globales** para confirmar con certeza:
- si existe `setRuntimeBuilder(RuntimeBuilder)`
- si existe `FormRegistry.register(...)`
- si existe `FieldRegistry.register(...)`
- si existe `getLayoutRegistry().register(...)`

Aun así, con lectura directa ya realizada para `RuntimeBuilderProvider` y para el bootstrap de persistence, sí puedo afirmar:
- `RuntimeBuilderProvider` tiene fallback no-op por ausencia de inyección.
- el bootstrap actualmente inicializa persistence providers, pero no inicializa registries de runtime (según lo leído).

---

## 1) ¿Existe llamada real a `setRuntimeBuilder(RuntimeBuilder)`?
**NOT CONFIRMABLE con evidencia global**.
- Lo único confirmado por evidencia directa previa: `RuntimeBuilderProvider` define `setRuntimeBuilder(...)`, pero `FormRuntimeHost` solo usa `getRuntimeBuilder()`.

---

## 2) ¿Existe llamada real a `FormRegistry.register(...)`?
**NOT CONFIRMABLE** (no puedo buscar globalmente por falta de `ripgrep`).

---

## 3) ¿Existe llamada real a `FieldRegistry.register(...)`?
**NOT CONFIRMABLE** (no puedo buscar globalmente por falta de `ripgrep`).

---

## 4) ¿Existe llamada real a `getLayoutRegistry().register(...)`?
**NOT CONFIRMABLE** (no puedo buscar globalmente por falta de `ripgrep`).

---

## 5) Si todos son NOT FOUND: archivo exacto donde debería ocurrir el bootstrap runtime
Aunque no puedo validar NOT FOUND con búsquedas globales, el archivo que efectivamente se inicializa desde la cadena de ejecución observada es:

- **ARCHIVO:** `src/runtime/persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap.ts`
- **FUNCIÓN:** `initialize()`
- **LÍNEA APROXIMADA:** ~`public async initialize(): Promise<RuntimePersistenceProviderCompositionRoot> {`

**Motivo (solo evidencia lectura):**
- `RuntimeActivationLayer.initialize()` hace `import("../persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap")` y llama `bootstrap.initialize()`.
- El bootstrap leído registra providers de persistence y setea active provider.
- No se observó en el bootstrap leído ninguna llamada a `FormRegistry.register`, `FieldRegistry.register` o `LayoutRegistry.register`.

---

### Salida requerida por ti (FOUND/NOT FOUND)
No puedo producirla de forma verificable sin búsqueda global.

