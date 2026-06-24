# AUDIT_D1_PREPARE_TRACE_RESULT

## Fuentes (sin modificar código)

### RuntimeBuilder.resolve(formId)
- **Archivo exacto:** `src/runtime/builder/engine/RuntimeBuilder.ts`
- **Función exacta:** `resolve(formId: string)` (inline en `export const RuntimeBuilder`)

#### Fragmento real (20 líneas antes y 20 después)
```ts
export const RuntimeBuilder: RuntimeBuilder = {
  resolve(formId: string): RuntimeResolvedForm | undefined {
    const runtimeForm = FormRuntimeResolver.resolve(formId);
    if (!runtimeForm) return undefined;

    return {
      formId: runtimeForm.formId,
      formName: runtimeForm.formName,
      layoutId: runtimeForm.layoutId,
      fieldIds: runtimeForm.fieldIds,
      ruleIds: runtimeForm.ruleIds,
      fields: buildFields(runtimeForm.fieldIds),
      layout: LayoutResolver.resolve(runtimeForm.layoutId),
      rules: runtimeForm.ruleIds.map((ruleId) => getRuleRuntimeResolver().resolve(ruleId)).filter((r): r is import("../../rules/contracts/RuleContracts").FieldRule => r != null),
    };

  },

  has(formId: string): boolean {
    return FormRuntimeResolver.has(formId);
  },
};
```

#### Dónde insertaría logs D1 (exacto)
Insertar inmediatamente antes de `return { ... }`:
- tras `if (!runtimeForm) return undefined;`
- y justo antes de construir el objeto retornado (para capturar `runtimeForm.layoutId`, `runtimeForm.fieldIds`).

---

### FormRuntimeHost (componente)
- **Archivo exacto:** `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`
- **Componente exacto:** `FormRuntimeHost` (`export const FormRuntimeHost: React.FC<FormRuntimeHostProps> = (...) => { ... }`)

#### Fragmento real (20 líneas antes y 20 después)
```tsx
  const layout = resolved?.layout;


  // Propagate rule engine results downstream.



  if (!resolved || !layout) {
    return null;
  }

  console.debug("[RuntimeHost]", {
    formId,
    fields: resolved?.fields?.length ?? 0,
    rules: resolved?.rules?.length ?? 0,
    layout: resolved?.layout?.id,
  });
```

#### Dónde insertaría logs D1 (exacto)
- Para capturar `null/undefined`, en el mismo punto donde hoy se retorna:
  - justo antes de `if (!resolved || !layout) { return null; }`.

---

### FormRuntimeResolver.resolve(formId)
- **Archivo exacto:** `src/runtime/forms/runtime/FormRuntimeResolver.ts`
- **Función exacta:** `resolve(formId: string)` dentro de `export const FormRuntimeResolver: FormRuntimeResolver = { resolve(...) { ... } }`

#### Fragmento real (20 líneas antes y 20 después)
```ts
export const FormRuntimeResolver: FormRuntimeResolver = {
  resolve(formId: string): RuntimeFormModel | undefined {
    const form = FormRegistry.get(formId);
    if (!form) return undefined;
    return toRuntimeModel(form);
  },

  has(formId: string): boolean {
    return FormRegistry.has(formId);
  },
};
```

#### Dónde insertaría logs D1 (exacto)
- Justo después de `const form = FormRegistry.get(formId);`
- Antes de `if (!form) return undefined;`

---

### LayoutResolver.resolve(layoutId)
- **Archivo exacto:** `src/runtime/layout/runtime/LayoutRuntimeResolver.ts`
- **Función exacta:** `resolve(layoutId: LayoutId)` dentro de `export const LayoutResolver: LayoutRuntimeResolver = { ... }`

#### Fragmento real (20 líneas antes y 20 después)
```ts
export const LayoutResolver: LayoutRuntimeResolver = {
  resolve(layoutId: LayoutId): LayoutDefinition | undefined {
    return getLayoutRegistry().get(layoutId);
  },

  has(layoutId: LayoutId): boolean {
    return getLayoutRegistry().has(layoutId);
  },
};
```

#### Dónde insertaría logs D1 (exacto)
- Antes del `return getLayoutRegistry().get(layoutId);`:
  - capturar `layoutId` y el resultado del `.get(layoutId)`.

---

### FieldRegistry.get(fieldId)
- **Archivo exacto:** `src/runtime/fields/registry/FieldRegistry.ts`
- **Función exacta:** `get(fieldId: string)`

#### Fragmento real (20 líneas antes y 20 después)
```ts
export const FieldRegistry = {
  register(field: RegisterFieldInput): void {
    registry.set(field.id, field);
  },

  get(fieldId: string): RuntimeFieldDefinition | undefined {
    return registry.get(fieldId);
  },

  has(fieldId: string): boolean {
    return registry.has(fieldId);
  },

  getAll(): RuntimeFieldDefinition[] {
    return Array.from(registry.values());
  },
};
```

#### Dónde insertaría logs D1 (exacto)
- Justo antes del `return registry.get(fieldId);`:
  - calcular `const field = registry.get(fieldId)`
  - log `fieldId` y `found: !!field`
  - y luego retornar `field`.

---

## Conclusión de ubicación del primer punto de ruptura (código)
En base a la cadena solicitada (sin ejecutar):
- El primer punto donde puede aparecer `null` en el render-chain es:
  - `src/runtime/runtime-host/engine/FormRuntimeHost.tsx`
  - condición: `if (!resolved || !layout) { return null; }`

Esto cubre los casos `resolved === undefined` y `resolved.layout === undefined`.

