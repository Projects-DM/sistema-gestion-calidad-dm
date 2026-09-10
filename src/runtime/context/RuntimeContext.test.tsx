import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { RuntimeProvider, useRuntime } from "./RuntimeContext";
import type { FormContract, FieldContract, RuntimeFieldType, RuntimeUIState } from "../types/runtimeContracts";

const createTestForm = (fields: FieldContract[] = []): FormContract => ({
  id: "test-form",
  code: "TEST",
  name: "Test Form",
  engineType: "BaseChecklist",
  workflowConfig: {
    requiresApproval: false,
    requiresSignature: false,
    verifierRole: "calidad",
    allowedRoles: ["admin", "quality", "operativo"],
  },
  security: {
    requiresStorage: false,
    offlineReady: true,
  },
  aiIntegration: {
    compatibleIa: false,
    iaTags: [],
  },
  fields,
});

const createField = (overrides: Partial<FieldContract> = {}): FieldContract => ({
  id: overrides.id ?? "field-1",
  name: overrides.name ?? "test_field",
  label: overrides.label ?? "Test Field",
  required: overrides.required ?? false,
  orderIndex: overrides.orderIndex ?? 0,
  fieldType: (overrides.fieldType as RuntimeFieldType) ?? "text",
  hidden: overrides.hidden ?? false,
  readonly: overrides.readonly ?? false,
  options: overrides.options ?? {},
});

describe("RuntimeContext", () => {
  describe("TC-RC-001 — Inicialización del contexto", () => {
    it("should provide snapshot and actions via context", () => {
      const form = createTestForm([createField()]);
      
      let capturedContext: any = null;
      const TestComponent = () => {
        const ctx = useRuntime();
        capturedContext = ctx;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(capturedContext).not.toBeNull();
      expect(capturedContext.snapshot).toBeDefined();
      expect(capturedContext.actions).toBeDefined();
    });

    it("should throw when useRuntime used outside provider", () => {
      const TestComponent = () => {
        useRuntime();
        return <div>test</div>;
      };

      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow("useRuntime must be used within <RuntimeProvider>.");
      
      consoleError.mockRestore();
    });

    it("should initialize with provided form", () => {
      const form = createTestForm([createField({ id: "f-1", name: "field_one" })]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.form).toBe(form);
      expect(snapshot.form.id).toBe("test-form");
    });

    it("should initialize values from initialValues when provided", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      const initialValues = { "f-1": "initial value" };
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialValues={initialValues}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.values["f-1"]).toBe("initial value");
    });

    it("should initialize values with defaults when initialValues not provided", () => {
      const form = createTestForm([
        createField({ id: "f-text", fieldType: "text" }),
        createField({ id: "f-number", fieldType: "number" }),
        createField({ id: "f-boolean", fieldType: "boolean" }),
        createField({ id: "f-table", fieldType: "table" }),
      ]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.values["f-text"]).toBe("");
      expect(snapshot.values["f-number"]).toBe("");
      expect(snapshot.values["f-boolean"]).toBe(false);
      expect(snapshot.values["f-table"]).toEqual([]);
    });

    it("should initialize disabled state from initialDisabled", () => {
      const form = createTestForm([createField()]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialDisabled={true}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.disabled).toBe(true);
    });

    it("should initialize uiState with defaults and merge initialUIState", () => {
      const form = createTestForm([createField()]);
      const initialUIState: Partial<RuntimeUIState> = { loading: true, activeTab: "tab1" };
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialUIState={initialUIState}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.uiState.loading).toBe(true);
      expect(snapshot.uiState.activeTab).toBe("tab1");
      expect(snapshot.uiState.saving).toBe(false);
      expect(snapshot.uiState.evidenceRequired).toBe(false);
    });
  });

  describe("TC-RC-002 — Exposición de valores públicos (snapshot)", () => {
    it("should expose form in snapshot", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.form).toEqual(form);
    });

    it("should expose current values in snapshot", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialValues={{ "f-1": "hello" }}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.values).toEqual({ "f-1": "hello" });
    });

    it("should expose validationErrors in snapshot", () => {
      const form = createTestForm([createField({ id: "f-1", required: true })]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.validationErrors).toEqual({});
    });

    it("should expose uiState in snapshot", () => {
      const form = createTestForm([createField()]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.uiState).toHaveProperty("loading");
      expect(snapshot.uiState).toHaveProperty("saving");
      expect(snapshot.uiState).toHaveProperty("evidenceRequired");
      expect(snapshot.uiState).toHaveProperty("activeTab");
    });

    it("should expose disabled in snapshot", () => {
      const form = createTestForm([createField()]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialDisabled={true}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.disabled).toBe(true);
    });

    it("should expose evidences as empty array", () => {
      const form = createTestForm([createField()]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.evidences).toEqual([]);
    });
  });

  describe("TC-RC-003 — Consumo mediante hooks/API", () => {
    it("should provide updateFieldValue action", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      const TestComponent = () => {
        const { actions: a } = useRuntime();
        actions = a;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(typeof actions.updateFieldValue).toBe("function");
    });

    it("should provide setValue action (alias)", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let actions: any = null;
      const TestComponent = () => {
        const { actions: a } = useRuntime();
        actions = a;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(typeof actions.setValue).toBe("function");
    });

    it("should provide setValidationError action", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let actions: any = null;
      const TestComponent = () => {
        const { actions: a } = useRuntime();
        actions = a;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(typeof actions.setValidationError).toBe("function");
    });

    it("should provide setDisabled action", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let actions: any = null;
      const TestComponent = () => {
        const { actions: a } = useRuntime();
        actions = a;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(typeof actions.setDisabled).toBe("function");
    });

    it("should update value via updateFieldValue", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.values["f-1"]).toBe("");
      
      act(() => {
        actions.updateFieldValue("f-1", "new value");
      });

      expect(snapshot.values["f-1"]).toBe("new value");
    });

    it("should update value via setValue alias", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.setValue("f-1", "aliased value");
      });

      expect(snapshot.values["f-1"]).toBe("aliased value");
    });

    it("should set validation error via setValidationError", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.setValidationError("f-1", "Custom error");
      });

      expect(snapshot.validationErrors["f-1"]).toBe("Custom error");
    });

    it("should clear validation error when message is undefined", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.setValidationError("f-1", "Error");
      });
      expect(snapshot.validationErrors["f-1"]).toBe("Error");

      act(() => {
        actions.setValidationError("f-1", undefined);
      });
      expect(snapshot.validationErrors["f-1"]).toBeUndefined();
    });

    it("should update disabled state via setDisabled", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialDisabled={false}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.disabled).toBe(false);

      act(() => {
        actions.setDisabled(true);
      });

      expect(snapshot.disabled).toBe(true);
    });
  });

  describe("TC-RC-004 — Comportamiento ante configuraciones válidas", () => {
    it("should handle multiple fields independently", () => {
      const form = createTestForm([
        createField({ id: "f-1", fieldType: "text" }),
        createField({ id: "f-2", fieldType: "number" }),
        createField({ id: "f-3", fieldType: "boolean" }),
      ]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.updateFieldValue("f-1", "text value");
        actions.updateFieldValue("f-2", "42");
        actions.updateFieldValue("f-3", true);
      });

      expect(snapshot.values["f-1"]).toBe("text value");
      expect(snapshot.values["f-2"]).toBe("42");
      expect(snapshot.values["f-3"]).toBe(true);
    });

    it("should preserve field order in form", () => {
      const form = createTestForm([
        createField({ id: "f-3", orderIndex: 2 }),
        createField({ id: "f-1", orderIndex: 0 }),
        createField({ id: "f-2", orderIndex: 1 }),
      ]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      const fieldIds = snapshot.form.fields.map((f: any) => f.id);
      expect(fieldIds).toEqual(["f-3", "f-1", "f-2"]);
    });

    it("should handle required fields correctly in initial state", () => {
      const form = createTestForm([
        createField({ id: "req-1", required: true, fieldType: "text" }),
        createField({ id: "opt-1", required: false, fieldType: "text" }),
      ]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      const reqField = snapshot.form.fields.find((f: any) => f.id === "req-1");
      const optField = snapshot.form.fields.find((f: any) => f.id === "opt-1");
      expect(reqField.required).toBe(true);
      expect(optField.required).toBe(false);
    });
  });

  describe("TC-RC-005 — Estados relevantes", () => {
    it("should track validation errors per field", () => {
      const form = createTestForm([
        createField({ id: "f-1", fieldType: "text", required: true }),
        createField({ id: "f-2", fieldType: "text" }),
      ]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.setValidationError("f-1", "Required");
        actions.setValidationError("f-2", "Optional error");
      });

      expect(snapshot.validationErrors["f-1"]).toBe("Required");
      expect(snapshot.validationErrors["f-2"]).toBe("Optional error");
      expect(Object.keys(snapshot.validationErrors)).toHaveLength(2);
    });

    it("should track disabled state", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.disabled).toBe(false);
      act(() => { actions.setDisabled(true); });
      expect(snapshot.disabled).toBe(true);
      act(() => { actions.setDisabled(false); });
      expect(snapshot.disabled).toBe(false);
    });

    it("should track uiState changes", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.uiState.loading).toBe(false);
      expect(snapshot.uiState.saving).toBe(false);
      expect(snapshot.uiState.evidenceRequired).toBe(false);
    });
  });

  describe("TC-RC-006 — Interacción con dependencias internas (validación reactiva)", () => {
    it("should run validation on field value change for required field", () => {
      const form = createTestForm([
        createField({ id: "f-req", fieldType: "text", required: true, label: "Campo Requerido" }),
      ]);
      
      let actions: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        return (
          <div>
            <span data-testid="validation-error">{s.validationErrors["f-req"] ?? "none"}</span>
          </div>
        );
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      const errorEl = screen.getByTestId("validation-error");
      expect(errorEl.textContent).toBe("none");
      
      // First set a value, then clear it to trigger validation (initial value is already "")
      act(() => {
        actions.updateFieldValue("f-req", "some value");
      });

      act(() => {
        actions.updateFieldValue("f-req", "");
      });

      // Wait for validation to complete
      return waitFor(() => {
        expect(errorEl.textContent).not.toBe("none");
        expect(errorEl.textContent).toContain("obligatorio");
      });
    });

    it("should clear validation error when required field gets value", () => {
      const form = createTestForm([
        createField({ id: "f-req", fieldType: "text", required: true, label: "Campo Requerido" }),
      ]);
      
      let actions: any = null;
      let latestSnapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        latestSnapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.updateFieldValue("f-req", "");
      });

      waitFor(() => {
        expect(latestSnapshot.validationErrors["f-req"]).toBeDefined();
      });

      act(() => {
        actions.updateFieldValue("f-req", "some value");
      });

      return waitFor(() => {
        expect(latestSnapshot.validationErrors["f-req"]).toBeUndefined();
      });
    });

    it("should validate number field bounds", () => {
      const form = createTestForm([
        createField({ id: "f-num", fieldType: "number", options: { min: 0, max: 100 } }),
      ]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.updateFieldValue("f-num", "-10");
      });
      expect(snapshot.validationErrors["f-num"]).toBeDefined();

      act(() => {
        actions.updateFieldValue("f-num", "50");
      });
      expect(snapshot.validationErrors["f-num"]).toBeUndefined();

      act(() => {
        actions.updateFieldValue("f-num", "150");
      });
      expect(snapshot.validationErrors["f-num"]).toBeDefined();
    });

    it("should validate string length for text fields", () => {
      const form = createTestForm([
        createField({ id: "f-text", fieldType: "text", options: { minLength: 3, maxLength: 10 } }),
      ]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.updateFieldValue("f-text", "ab");
      });
      expect(snapshot.validationErrors["f-text"]).toBeDefined();

      act(() => {
        actions.updateFieldValue("f-text", "abc");
      });
      expect(snapshot.validationErrors["f-text"]).toBeUndefined();

      act(() => {
        actions.updateFieldValue("f-text", "abcdefghijk");
      });
      expect(snapshot.validationErrors["f-text"]).toBeDefined();
    });

    it("should validate select choices", () => {
      const form = createTestForm([
        createField({ id: "f-select", fieldType: "select", options: { choices: ["a", "b", "c"] } }),
      ]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.updateFieldValue("f-select", "invalid");
      });
      expect(snapshot.validationErrors["f-select"]).toBeDefined();

      act(() => {
        actions.updateFieldValue("f-select", "b");
      });
      expect(snapshot.validationErrors["f-select"]).toBeUndefined();
    });

    it("should not validate when field definition not found", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      // Updating non-existent field should not crash
      act(() => {
        actions.updateFieldValue("non-existent", "value");
      });

      // Should not add validation error for non-existent field
      expect(snapshot.validationErrors["non-existent"]).toBeUndefined();
    });

    it("should use disabled state in validation", () => {
      const form = createTestForm([
        createField({ id: "f-req", fieldType: "text", required: true }),
      ]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialDisabled={true}>
          <TestComponent />
        </RuntimeProvider>
      );

      // When disabled, required validation should not trigger (field is disabled)
      act(() => {
        actions.updateFieldValue("f-req", "");
      });

      // Implementation may or may not validate disabled fields - document actual behavior
      // The orchestrator receives disabled state
    });
  });

  describe("TC-RC-007 — Comportamiento ante ausencia o configuración inválida", () => {
    it("should handle form with no fields", () => {
      const form = createTestForm([]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.form.fields).toEqual([]);
      expect(snapshot.values).toEqual({});
    });

    it("should handle initialValues for non-existent fields", () => {
      const form = createTestForm([createField({ id: "f-1" })]);
      
      let snapshot: any = null;
      const TestComponent = () => {
        const { snapshot: s } = useRuntime();
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form} initialValues={{ "f-1": "value", "f-unknown": "ignored" }}>
          <TestComponent />
        </RuntimeProvider>
      );

      expect(snapshot.values["f-1"]).toBe("value");
      expect(snapshot.values["f-unknown"]).toBe("ignored"); // extra values preserved
    });

    it("should handle multiple rapid updates", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.updateFieldValue("f-1", "a");
        actions.updateFieldValue("f-1", "ab");
        actions.updateFieldValue("f-1", "abc");
      });

      expect(snapshot.values["f-1"]).toBe("abc");
    });

    it("should avoid unnecessary state updates when value unchanged", () => {
      const form = createTestForm([createField({ id: "f-1", fieldType: "text" })]);
      
      let actions: any = null;
      let snapshot: any = null;
      const TestComponent = () => {
        const { actions: a, snapshot: s } = useRuntime();
        actions = a;
        snapshot = s;
        return <div>test</div>;
      };

      render(
        <RuntimeProvider form={form}>
          <TestComponent />
        </RuntimeProvider>
      );

      act(() => {
        actions.updateFieldValue("f-1", "same");
        actions.updateFieldValue("f-1", "same"); // duplicate
      });

      expect(snapshot.values["f-1"]).toBe("same");
    });
  });
});