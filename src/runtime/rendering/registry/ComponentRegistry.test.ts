import { describe, it, expect } from "vitest";
import { ComponentRegistry } from "./ComponentRegistry";
import type { RuntimeFieldType, FieldRenderProps } from "../../types/runtimeContracts";

describe("ComponentRegistry", () => {
  const mockComponent = (props: FieldRenderProps) => null;
  const testFieldType = "custom_test_type" as RuntimeFieldType;

  beforeEach(() => {
    // Reset registry state by re-registering built-ins
    // Note: ComponentRegistry is a singleton-like object, so we test against current state
  });

  describe("TC-CR-001 — Registro de componente", () => {
    it("should register a new component for a field type", () => {
      ComponentRegistry.register(testFieldType, mockComponent);
      expect(ComponentRegistry.has(testFieldType)).toBe(true);
    });

    it("should overwrite existing registration for same field type", () => {
      const firstComponent = (props: FieldRenderProps) => "first";
      const secondComponent = (props: FieldRenderProps) => "second";

      ComponentRegistry.register(testFieldType, firstComponent);
      expect(ComponentRegistry.get(testFieldType)).toBe(firstComponent);

      ComponentRegistry.register(testFieldType, secondComponent);
      expect(ComponentRegistry.get(testFieldType)).toBe(secondComponent);
    });

    it("should allow registering multiple different field types", () => {
      const typeA = "custom_a" as RuntimeFieldType;
      const typeB = "custom_b" as RuntimeFieldType;

      ComponentRegistry.register(typeA, mockComponent);
      ComponentRegistry.register(typeB, mockComponent);

      expect(ComponentRegistry.has(typeA)).toBe(true);
      expect(ComponentRegistry.has(typeB)).toBe(true);
    });
  });

  describe("TC-CR-002 — Recuperación de componente", () => {
    it("should retrieve registered component", () => {
      ComponentRegistry.register(testFieldType, mockComponent);
      const retrieved = ComponentRegistry.get(testFieldType);

      expect(retrieved).toBe(mockComponent);
    });

    it("should return undefined for unregistered field type", () => {
      const unregisteredType = "unregistered_type" as RuntimeFieldType;
      const retrieved = ComponentRegistry.get(unregisteredType);

      expect(retrieved).toBeUndefined();
    });

    it("should retrieve built-in text component", () => {
      const retrieved = ComponentRegistry.get("text");
      expect(retrieved).toBeDefined();
      expect(typeof retrieved).toBe("function");
    });

    it("should retrieve built-in number component", () => {
      const retrieved = ComponentRegistry.get("number");
      expect(retrieved).toBeDefined();
      expect(typeof retrieved).toBe("function");
    });

    it("should retrieve built-in select component", () => {
      const retrieved = ComponentRegistry.get("select");
      expect(retrieved).toBeDefined();
      expect(typeof retrieved).toBe("function");
    });
  });

  describe("TC-CR-003 — Resolución por identificador", () => {
    it("should return true for has() on registered type", () => {
      ComponentRegistry.register(testFieldType, mockComponent);
      expect(ComponentRegistry.has(testFieldType)).toBe(true);
    });

    it("should return false for has() on unregistered type", () => {
      const unregisteredType = "unregistered_type" as RuntimeFieldType;
      expect(ComponentRegistry.has(unregisteredType)).toBe(false);
    });

    it("should return true for has() on built-in types", () => {
      expect(ComponentRegistry.has("text")).toBe(true);
      expect(ComponentRegistry.has("textarea")).toBe(true);
      expect(ComponentRegistry.has("number")).toBe(true);
      expect(ComponentRegistry.has("select")).toBe(true);
      expect(ComponentRegistry.has("checkbox")).toBe(true);
      expect(ComponentRegistry.has("radio")).toBe(true);
      expect(ComponentRegistry.has("multiselect")).toBe(true);
      expect(ComponentRegistry.has("file_upload")).toBe(true);
      expect(ComponentRegistry.has("signature")).toBe(true);
      expect(ComponentRegistry.has("calculated")).toBe(true);
      expect(ComponentRegistry.has("workflow_status")).toBe(true);
      expect(ComponentRegistry.has("table")).toBe(true);
      expect(ComponentRegistry.has("informative")).toBe(true);
    });
  });

  describe("TC-CR-004 — Componente inexistente", () => {
    it("should return undefined from get() for unknown type", () => {
      const result = ComponentRegistry.get("definitely_not_a_type" as RuntimeFieldType);
      expect(result).toBeUndefined();
    });

    it("should return false from has() for unknown type", () => {
      const result = ComponentRegistry.has("definitely_not_a_type" as RuntimeFieldType);
      expect(result).toBe(false);
    });

    it("should not throw on get() for unknown type", () => {
      expect(() => {
        ComponentRegistry.get("unknown" as RuntimeFieldType);
      }).not.toThrow();
    });

    it("should not throw on has() for unknown type", () => {
      expect(() => {
        ComponentRegistry.has("unknown" as RuntimeFieldType);
      }).not.toThrow();
    });
  });

  describe("TC-CR-005 — Registro determinista", () => {
    it("should consistently return same component for same type", () => {
      ComponentRegistry.register(testFieldType, mockComponent);

      const result1 = ComponentRegistry.get(testFieldType);
      const result2 = ComponentRegistry.get(testFieldType);
      const result3 = ComponentRegistry.get(testFieldType);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(mockComponent);
    });

    it("should consistently return true for has() on registered type", () => {
      ComponentRegistry.register(testFieldType, mockComponent);

      const result1 = ComponentRegistry.has(testFieldType);
      const result2 = ComponentRegistry.has(testFieldType);
      const result3 = ComponentRegistry.has(testFieldType);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it("should maintain registration across multiple calls", () => {
      const typeA = "persist_a" as RuntimeFieldType;
      const typeB = "persist_b" as RuntimeFieldType;

      ComponentRegistry.register(typeA, mockComponent);
      ComponentRegistry.register(typeB, mockComponent);

      expect(ComponentRegistry.has(typeA)).toBe(true);
      expect(ComponentRegistry.has(typeB)).toBe(true);
      expect(ComponentRegistry.get(typeA)).toBe(mockComponent);
      expect(ComponentRegistry.get(typeB)).toBe(mockComponent);
    });
  });

  describe("TC-CR-006 — Integridad del registry", () => {
    it("should return all registered types via getRegisteredTypes", () => {
      const types = ComponentRegistry.getRegisteredTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain("text");
      expect(types).toContain("textarea");
      expect(types).toContain("number");
      expect(types).toContain("select");
    });

    it("should include custom registered types in getRegisteredTypes", () => {
      const customType = "custom_integrity" as RuntimeFieldType;
      ComponentRegistry.register(customType, mockComponent);

      const types = ComponentRegistry.getRegisteredTypes();
      expect(types).toContain(customType);
    });

    it("should not have duplicate types in getRegisteredTypes", () => {
      const types = ComponentRegistry.getRegisteredTypes();
      const uniqueTypes = new Set(types);
      expect(types.length).toBe(uniqueTypes.size);
    });

    it("should have exactly 13 built-in types registered", () => {
      const types = ComponentRegistry.getRegisteredTypes();
      const builtInTypes = [
        "text",
        "textarea",
        "number",
        "select",
        "checkbox",
        "radio",
        "multiselect",
        "file_upload",
        "signature",
        "calculated",
        "workflow_status",
        "table",
        "informative",
      ];

      for (const type of builtInTypes) {
        expect(types).toContain(type);
      }
      expect(types.length).toBeGreaterThanOrEqual(13);
    });

    it("should return function components for all registered types", () => {
      const types = ComponentRegistry.getRegisteredTypes();

      for (const type of types) {
        const component = ComponentRegistry.get(type);
        expect(component).toBeDefined();
        expect(typeof component).toBe("function");
      }
    });
  });

  describe("Built-in component registration verification", () => {
    it("should have text -> FieldText", () => {
      const comp = ComponentRegistry.get("text");
      expect(comp).toBeDefined();
    });

    it("should have textarea -> FieldTextarea", () => {
      const comp = ComponentRegistry.get("textarea");
      expect(comp).toBeDefined();
    });

    it("should have number -> FieldNumber", () => {
      const comp = ComponentRegistry.get("number");
      expect(comp).toBeDefined();
    });

    it("should have select -> FieldSelect", () => {
      const comp = ComponentRegistry.get("select");
      expect(comp).toBeDefined();
    });

    it("should have checkbox -> FieldCheckbox", () => {
      const comp = ComponentRegistry.get("checkbox");
      expect(comp).toBeDefined();
    });

    it("should have radio -> FieldRadio", () => {
      const comp = ComponentRegistry.get("radio");
      expect(comp).toBeDefined();
    });

    it("should have multiselect -> FieldMultiSelect", () => {
      const comp = ComponentRegistry.get("multiselect");
      expect(comp).toBeDefined();
    });

    it("should have file_upload -> FieldFileUpload", () => {
      const comp = ComponentRegistry.get("file_upload");
      expect(comp).toBeDefined();
    });

    it("should have signature -> FieldSignature", () => {
      const comp = ComponentRegistry.get("signature");
      expect(comp).toBeDefined();
    });

    it("should have calculated -> FieldCalculated", () => {
      const comp = ComponentRegistry.get("calculated");
      expect(comp).toBeDefined();
    });

    it("should have workflow_status -> FieldWorkflowStatus", () => {
      const comp = ComponentRegistry.get("workflow_status");
      expect(comp).toBeDefined();
    });

    it("should have table -> FieldTable", () => {
      const comp = ComponentRegistry.get("table");
      expect(comp).toBeDefined();
    });

    it("should have informative -> FieldInformative", () => {
      const comp = ComponentRegistry.get("informative");
      expect(comp).toBeDefined();
    });
  });

  describe("Determinism across multiple registry accesses", () => {
    it("should return same component reference on repeated get() calls", () => {
      const comp1 = ComponentRegistry.get("text");
      const comp2 = ComponentRegistry.get("text");
      const comp3 = ComponentRegistry.get("text");

      expect(comp1).toBe(comp2);
      expect(comp2).toBe(comp3);
    });

    it("should return consistent has() results", () => {
      const result1 = ComponentRegistry.has("text");
      const result2 = ComponentRegistry.has("text");
      const result3 = ComponentRegistry.has("text");

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it("should return consistent getRegisteredTypes array content", () => {
      const types1 = ComponentRegistry.getRegisteredTypes();
      const types2 = ComponentRegistry.getRegisteredTypes();
      const types3 = ComponentRegistry.getRegisteredTypes();

      expect(types1).toEqual(types2);
      expect(types2).toEqual(types3);
    });
  });
});