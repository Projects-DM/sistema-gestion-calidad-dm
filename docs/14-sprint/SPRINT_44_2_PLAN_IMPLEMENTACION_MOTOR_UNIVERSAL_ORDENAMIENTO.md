        # SPRINT 44.2 — Plan Oficial de Implementación (Motor Universal de Ordenamiento)

        > **Alcance:** Pilotaje exclusivo en **Constructor Visual (FormBuilder)**.  
        > **Entregable:** Plan documental para Sprint 44.2B (implementación).  
        > **Restricciones de este sprint (planificación):** no modificar archivos, no escribir código.

        ## 0) Fuente oficial del diseño
        - Documento Maestro aprobado (Sprint 44.1A):
        - `docs/14-sprint/SPRINT_44_1_MOTOR_UNIVERSAL_ORDENAMIENTO.md`

## 0) Fase 0 — Preparación del Entorno

### Objetivo
Verificar que el proyecto se encuentra exactamente en el estado esperado antes de comenzar la implementación.

### Checklist mínimo (criterios de entrada a Fase 1)
- Proyecto en Sprint 43.1 estable.
- Constructor Visual funcionando correctamente.
- Crear campos funciona.
- Eliminar campos funciona.
- Carga mediante `dynamicService.getFormFields()` funcionando.
- `order_index` continúa siendo el contrato oficial.
- Existe punto de rollback conocido.

### Criterio de salida
No puede comenzar la Fase 1 mientras este checklist no esté completamente aprobado.

---

## 1) Inventario de archivos participantes (durante 44.2B)



        > **Regla del plan:** Este inventario describe **dónde se tocará** en 44.2B. No se implementa aquí.

        ### 1.1 Piloto: Constructor Visual (FormBuilder)
        1) `src/components/FormBuilder.jsx`
        - **Motivo:** Es el componente que administra el estado `fields`, renderiza la lista y actualmente soporta creación/eliminación.
        - **Responsabilidad en la arquitectura:**
        - UI (presentación)
        - Estado de secuencia (lista en memoria) y conexión con acciones de mover (en el futuro dentro de este sprint).
        - **Tipo de modificación esperada (44.2B):**
        - Consumo del Motor Universal para calcular el nuevo orden al mover.
        - Conexión con un Adapter de persistencia del dominio para guardar el orden.
        - Actualización del estado de UI con la nueva secuencia resultante.
        - **Nivel de riesgo:** Alto
        - Porque impacta interacción del usuario y sincronización con persistencia.

        2) `src/services/dynamicService.js`
        - **Motivo:** Define el contrato actual de carga ordenada de campos.
        - **Responsabilidad en la arquitectura:**
        - Cargador del dominio (orden oficial via `order_index`).
        - **Tipo de modificación esperada (44.2B):**
        - **No debe modificarse según el Documento Maestro.**
        - En su lugar, el Adapter de persistencia para el piloto deberá reutilizar el mismo contrato de carga.
        - **Nivel de riesgo:** Medio
        - Riesgo por tentación de modificarlo; debe permanecer intacto.

        ### 1.2 Servicios/Adapters (nuevos o existentes)

        > El Documento Maestro no obliga a reusar un servicio actual para persistencia; sin embargo, por gobernanza, el adapter debe ser la capa autorizada.

        3) (A definir en implementación) Adapter de persistencia del dominio para campos
        - **Nombre conceptual:** `AdapterCamposOrdenables`
        - **Motivo:** Traduce `orderedIds` del motor al campo de orden oficial `order_index` de `sgc_form_fields`.
        - **Responsabilidad en la arquitectura:**
        - Persistencia: persistir nuevo orden
        - Recarga: alinear UI con el orden oficial
        - Errores: normalización local de fallos de persistencia
        - **Tipo de modificación esperada (44.2B):**
        - **Creación de archivo(s) de adapter** (aunque en el documento de sprint actual el plan no puede cambiar reglas de restricción de “crear” del sprint; si el sistema permite creación, el adapter debe ser creado. Si en la política del proyecto se prohíbe crear archivos en 44.2B, entonces se implementará como integración en un módulo existente definido por la arquitectura real).
        - **Nivel de riesgo:** Medio

        ### 1.3 Motor
        4) (A definir en implementación) Motor Universal de Ordenamiento (fase 1)
        - **Motivo:** Lógica pura de reordenamiento determinística.
        - **Responsabilidad en la arquitectura:**
        - Operar sobre secuencia ordenada + intención de movimiento.
        - Devolver nueva secuencia/orderedIds.
        - Delegar persistencia al adapter (por contrato).
        - **Tipo de modificación esperada (44.2B):**
        - Creación/aislamiento del motor en un módulo desacoplado (fase 1).
        - **Nivel de riesgo:** Alto

        ## 2) Estrategia por fases (44.2B)

        > **Política:** cada fase debe finalizar con criterios de salida verificados. No se inicia la siguiente fase con fallos pendientes.

        ### Fase 1 — Construcción aislada del Motor Universal
        - **Objetivo:** Crear la lógica mecánica del motor (desacoplada de dominio) con contrato determinístico.
        - **Dependencias:**
        - Contrato y invariantes del Documento Maestro.
        - **Criterios de entrada:**
        - Documento Maestro validado (44.1A).
        - **Criterios de salida:**
        - Motor expone un API conceptual para mover y devolver una nueva secuencia/orderedIds.
        - Cumple invariantes: determinismo, no conoce dominio, no toca persistencia/BD/estado.
        - **Riesgos principales:**
        - Representación de acciones de movimiento (up/down vs secuencia final).
        - Determinismo/imutabilidad (no mutar secuencia original).
        - **Estrategia de mitigación:**
        - Definir contractualmente el formato de entrada/salida y validar con casos de frontera (primer/último elemento).

        ### Fase 2 — Construcción del Adapter para el Constructor Visual
        - **Objetivo:** Implementar el Adapter para campos que:
        - Persiste `order_index` en `sgc_form_fields`
        - Recarga usando el mismo contrato existente para mantener “orden oficial”.
        - **Dependencias:**
        - Motor (Fase 1) y contrato de orden existente (`order_index`).
        - Evidencia: `dynamicService.getFormFields()` ya ordena por `order_index`.
        - **Criterios de entrada:**
        - Motor listo.
        - **Criterios de salida:**
        - Adapter recibe `orderedIds` del motor.
        - Traducir orderedIds → escritura sobre `order_index`.
        - Tras persistir, re-alinea estado (por recarga o reconciliación según arquitectura implementada).
        - **Riesgos:**
        - Errores de actualización parcial.
        - Condiciones de carrera al mover rápido.
        - **Mitigación:**
        - Definir estrategia de persistencia (batch/parallel controlado) dentro del adapter.
        - Manejo de estado de UI deshabilitando acciones durante persistencia si aplica.

        > **Ubicación definitiva del Adapter (decisión cerrada):**
        > `src/order-motor/adapters/AdapterCamposOrdenables.js`
        > 
        > **Justificación arquitectónica:**
        > - Mantiene el desacoplamiento: el Motor permanece en `src/order-motor/` como núcleo puro.
        > - Facilita reutilización: cualquier futuro dominio solo agrega un adapter en `src/order-motor/adapters/` sin tocar el motor.
        > - Facilita futuros adapters: estructura consistente por módulo/domínio.
        > - Evita mezclar responsabilidades: 
        >   - FormBuilder queda como UI (interacción)
        >   - dynamicService permanece como fuente oficial de lectura
        >   - el adapter es la única capa autorizada para traducir `orderedIds` → `order_index` y coordinar persistencia/recarga.


        ### Fase 3 — Integración con FormBuilder (UI pilot)
        - **Objetivo:** Conectar el motor en `FormBuilder.jsx` para habilitar movimiento arriba/abajo.
        - **Dependencias:**
        - Motor (Fase 1) y adapter (Fase 2).
        - **Criterios de entrada:**
        - Adapter funcional.
        - **Criterios de salida:**
        - El Constructor Visual permite mover campos arriba y abajo.
        - El orden mostrado coincide con el orden resultante.
        - Tras persistencia, el orden oficial (re-cargado) queda consistente.
        - No se rompe creación/eliminación de campos.
        - **Riesgos:** Alto
        - Sincronización entre estado local (optimista) y estado oficial (recarga).
        - Regresión en render/keys/lista.
        - **Mitigación:**
        - Validar el contrato: `dynamicService.getFormFields` continúa siendo fuente oficial.

        ### Fase 4 — Persistencia del nuevo orden
        - **Objetivo:** Validar que el adapter realmente persiste y mantiene orden oficial.
        - **Dependencias:**
        - Integración UI (Fase 3).
        - **Criterios de entrada:**
        - Mover en UI funcionando.
        - **Criterios de salida:**
        - `order_index` persiste según secuencia resultante.
        - Refresco de lista coincide con persistencia.
        - **Riesgos:**
        - Persistencia parcial.
        - Desalineación por latencia.
        - **Mitigación:**
        - Verificación determinística y reconciliación posterior.

        ### Fase 5 — Validación funcional (pilot)
        - **Objetivo:** Validar el “contrato de usuario” del pilot.
        - **Dependencias:** Fase 4 completada.
        - **Criterios de entrada:**
        - Movimientos y persistencia operan.
        - **Criterios de salida (funcional):**
        - Arriba/Abajo: comportamiento correcto.
        - Orden persistente: consistente tras recarga.
        - Creación/eliminación: sin regresiones.
        - **Riesgos:**
        - Casos límite: 1 elemento, 2 elementos, movimiento repetido.

        ### Fase 6 — Pruebas de regresión
        - **Objetivo:** Asegurar que el resto del Constructor Visual no sufrió regresiones.
        - **Dependencias:** Fase 5.
        - **Criterios de entrada:**
        - Pilot funcional aprobado.
        - **Criterios de salida (regresión):**
        - Creación: sigue calculando `order_index` compatible.
        - Eliminación: recarga consistente.
        - Render y formularios: sin errores.

        ## 3) Política Oficial de Implementación (gobernanza)

        1) **Implementación incremental**
        - Ninguna fase inicia sin salida aprobada de la anterior.

        2) **Un único módulo piloto**
        - Piloto: **Constructor Visual** (`FormBuilder`).

        3) **No integrar todavía con**
        - Repositorio Documental
        - Formularios Dinámicos
        - Runtime
        - Otros módulos

        4) **Integración progresiva**
        - Solo tras éxito en pilot, se habilitan otros módulos.

        5) **Arquitectura inmutable**
        - Respetar el Documento Maestro.
        - Si surge necesidad de cambio arquitectónico:
            - detener
            - documentar causa
            - actualizar Documento Maestro
            - obtener aprobación
            - continuar

        6) **Invariantes de arquitectura**
        - Motor sin dominio, sin BD, sin estado React.
        - Adapter solo traduce/persistir/recarga.
        - Mantener contrato de `order_index`.

        ## 4) Matriz de riesgos por fase

        ### Fase 1 — Motor
        - Riesgos técnicos: determinismo, mutación de secuencia, contrato incompleto de acciones.
        - Riesgos funcionales: mover no respeta fronteras.
        - Impacto: Alto
        - Probabilidad: Media
        - Mitigación: casos de prueba de frontera + definición formal de salida.

        ### Fase 2 — Adapter
        - Riesgos técnicos: persistencia parcial, mapeo orderedIds → order_index incorrecto.
        - Riesgos funcionales: desalineación al recargar.
        - Impacto: Alto
        - Probabilidad: Media
        - Mitigación: estrategia de actualización consistente + recarga.

        ### Fase 3 — Integración UI
        - Riesgos técnicos: keys/lista, actualización de estado, manejo de loading/saving.
        - Riesgos funcionales: regresión en render o en creación/eliminación.
        - Impacto: Alto
        - Probabilidad: Media
        - Mitigación: mantener flujo actual de creación/eliminación; aislar cambios al manejo de mover.

        ### Fase 4 — Persistencia
        - Riesgos técnicos: latencia, carrera de múltiples clicks.
        - Impacto: Medio-Alto
        - Probabilidad: Media
        - Mitigación: deshabilitar UI durante persistencia si aplica.

        ### Fase 5 — Validación
        - Riesgos funcionales: casos límite.
        - Impacto: Medio
        - Probabilidad: Media
        - Mitigación: checklist manual/semiautomático.

        ### Fase 6 — Regresión
        - Riesgos funcionales: roturas laterales.
        - Impacto: Medio
        - Probabilidad: Baja-Media
        - Mitigación: ejecutar flujos críticos (crear, borrar, cargar).

        ## 5) Estrategia de validación

        - Validaciones funcionales (Fase 5):
        - up/down correcto
        - persistencia de order_index
        - no regresión en CRUD (crear/borrar)

        - Validaciones de arquitectura (Fases 1-3):
        - Motor desacoplado de dominio/BD
        - Adapter único responsable de persistencia
        - UI consume y no calcula orden oficial

        - Validaciones de regresión (Fase 6):
        - recarga consistente
        - ausencia de errores runtime

        ## 6) Estrategia de rollback

        > No se proponen cambios en esta sección; se define criterio.

        ### Condiciones para abortar implementación
        - Motor no determinístico
        - Adapter que no preserva orden oficial tras recarga
        - Regresión en creación/eliminación

        ### Rollback por fase
        - **Fase 1:** revertir cambios solo del motor al commit anterior (si existe).
        - **Fase 2:** revertir adapter y dejar UI operando sin mover.
        - **Fase 3:** revertir integración en `FormBuilder.jsx` para regresar a comportamiento sin mover.
        - **Fase 4/5/6:** revertir al último estado donde se cumplieron criterios de salida.

        Archivos involucrados típicamente:
        - Motor (fase 1)
        - Adapter (fase 2)
        - `FormBuilder.jsx` (fase 3)

        ## 7) Criterios de aceptación del Sprint 44.2

        Mínimos obligatorios:
        1) El Constructor Visual permite mover campos arriba y abajo.
        2) El orden persiste correctamente mediante `order_index`.
        3) `dynamicService.getFormFields()` continúa siendo la fuente oficial.
        4) No se modifica el contrato de `order_index`.
        5) No se rompe flujo de creación y eliminación de campos.
        6) No se introducen regresiones en FormBuilder.
        7) El Motor Universal permanece desacoplado del dominio.
        8) El Adapter es el único responsable de la persistencia.
        9) La arquitectura del Sprint 43.1 permanece intacta.

        ## 8) Checklist previo a implementación (antes de escribir código)

        - Documento Maestro aprobado: ✅
        - Contrato del Motor validado: ✅
        - Contrato del Adapter validado: ✅
        - Riesgos identificados: ✅
        - Rollback definido: ✅
        - Archivos identificados: ✅
        - Dependencias revisadas: ✅
        - Estrategia de pruebas definida: ✅

        ## 9) Confirmación de preparación para iniciar Sprint 44.2B

        Con base en el Documento Maestro aprobado (44.1A), el diseño está preparado para implementar el piloto en `FormBuilder` sin alterar el resto del sistema, siempre respetando fases e invariantes.

        ---

        ## Entrega
        - Este documento es el **Plan Oficial** para iniciar Sprint 44.2B.

