import { describe, it, expect } from "vitest";
import { SchemaNormalizer } from "./SchemaNormalizer";
import type { RuntimeFieldSchemaInput, NormalizedFormInput } from "../contracts/runtimeSchemaContracts";

describe("SchemaNormalizer", () => {
  const minimalValidInput = {
    engineType: "BaseChecklist",
    code: "TEST-001",
    name: "Test Form",
    fields: [
      {
        id: "f-1",
        name: "field_one",
        label: "Field One",
        required: true,
        orderIndex: 0,
        fieldType: "text",
        options: {},
      } as RuntimeFieldSchemaInput,
      {
        id: "f-2",
        name: "field_two",
        label: "Field Two",
        required: false,
        orderIndex: 1,
        fieldType: "number",
        options: { min: 0, max: 100 },
      } as RuntimeFieldSchemaInput,
    ],
    strict: false,
  };

  describe("TC-SN-001 — Normalización de schema válido", () => {
    it("should normalize valid input into NormalizedFormInput", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result).toBeDefined();
      expect(result.fields).toBeDefined();
      expect(Array.isArray(result.fields)).toBe(true);
      expect(result.engineType).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.workflowConfig).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.aiIntegration).toBeDefined();
    });

    it("should return fields array with FieldContract shape", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.fields.length).toBe(2);
      expect(result.fields[0]).toHaveProperty("id");
      expect(result.fields[0]).toHaveProperty("name");
      expect(result.fields[0]).toHaveProperty("label");
      expect(result.fields[0]).toHaveProperty("required");
      expect(result.fields[0]).toHaveProperty("orderIndex");
      expect(result.fields[0]).toHaveProperty("fieldType");
      expect(result.fields[0]).toHaveProperty("hidden");
      expect(result.fields[0]).toHaveProperty("readonly");
      expect(result.fields[0]).toHaveProperty("options");
    });

    it("should return form-level properties at top level (flattened, no id)", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result).toHaveProperty("code");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("engineType");
      expect(result).toHaveProperty("workflowConfig");
      expect(result).toHaveProperty("security");
      expect(result).toHaveProperty("aiIntegration");
      expect(result).toHaveProperty("fields");
      // id is NOT returned by SchemaNormalizer (internal to formContract)
    });
  });

  describe("TC-SN-002 — Preservación de campos requeridos", () => {
    it("should preserve required=true", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.fields[0].required).toBe(true);
    });

    it("should preserve required=false", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.fields[1].required).toBe(false);
    });

    it("should default required to false when not specified", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-3",
            name: "field_three",
            label: "Field Three",
            orderIndex: 0,
            fieldType: "text",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].required).toBe(false);
    });
  });

  describe("TC-SN-003 — Preservación de tipos", () => {
    it("should preserve text field type", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.fields[0].fieldType).toBe("text");
    });

    it("should preserve number field type", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.fields[1].fieldType).toBe("number");
    });

    it("should preserve select field type with choices", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-select",
            name: "select_field",
            label: "Select",
            required: true,
            orderIndex: 0,
            fieldType: "select",
            options: { choices: ["a", "b", "c"] },
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].fieldType).toBe("select");
      expect(result.fields[0].options.choices).toEqual(["a", "b", "c"]);
    });

    it("should preserve boolean field type", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-bool",
            name: "bool_field",
            label: "Boolean",
            required: true,
            orderIndex: 0,
            fieldType: "boolean",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].fieldType).toBe("boolean");
    });

    it("should preserve table field type", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-table",
            name: "table_field",
            label: "Table",
            required: false,
            orderIndex: 0,
            fieldType: "table",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].fieldType).toBe("table");
    });
  });

  describe("TC-SN-004 — Preservación de defaults", () => {
    it("should produce fields with text fieldType (factory uses for empty string default)", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.fields[0].fieldType).toBe("text");
    });

    it("should produce fields with number fieldType (factory uses for empty string default)", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.fields[1].fieldType).toBe("number");
    });

    it("should produce fields with boolean fieldType (factory uses for false default)", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-bool",
            name: "bool_field",
            label: "Boolean",
            required: true,
            orderIndex: 0,
            fieldType: "boolean",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].fieldType).toBe("boolean");
    });
  });

  describe("TC-SN-005 — Configuración opcional", () => {
    it("should handle optional workflowConfig", () => {
      const input = {
        ...minimalValidInput,
        workflowConfig: {
          requiresApproval: true,
          requiresSignature: true,
          verifierRole: "admin",
          allowedRoles: ["admin", "quality"],
        },
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.workflowConfig.requiresApproval).toBe(true);
      expect(result.workflowConfig.requiresSignature).toBe(true);
      expect(result.workflowConfig.verifierRole).toBe("admin");
      expect(result.workflowConfig.allowedRoles).toEqual(["admin", "quality"]);
    });

    it("should default workflowConfig when not provided", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.workflowConfig.requiresApproval).toBe(false);
      expect(result.workflowConfig.requiresSignature).toBe(false);
      expect(result.workflowConfig.verifierRole).toBe("calidad");
      expect(result.workflowConfig.allowedRoles).toEqual(["admin", "quality", "operativo"]);
    });

    it("should handle optional security config", () => {
      const input = {
        ...minimalValidInput,
        security: {
          requiresStorage: true,
          offlineReady: false,
        },
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.security.requiresStorage).toBe(true);
      expect(result.security.offlineReady).toBe(false);
    });

    it("should default security when not provided", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.security.requiresStorage).toBe(false);
      expect(result.security.offlineReady).toBe(true);
    });

    it("should handle optional aiIntegration", () => {
      const input = {
        ...minimalValidInput,
        aiIntegration: {
          compatibleIa: true,
          iaTags: ["tag1", "tag2"],
        },
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.aiIntegration.compatibleIa).toBe(true);
      expect(result.aiIntegration.iaTags).toEqual(["tag1", "tag2"]);
    });

    it("should default aiIntegration when not provided", () => {
      const result = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result.aiIntegration.compatibleIa).toBe(false);
      expect(result.aiIntegration.iaTags).toEqual([]);
    });

    it("should handle optional groupByKey", () => {
      const input = {
        ...minimalValidInput,
        groupByKey: "section",
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.groupByKey).toBe("section");
    });

    it("should handle hidden field alias", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-hidden",
            name: "hidden_field",
            label: "Hidden",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            hidden: true,
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].hidden).toBe(true);
    });

    it("should handle readonly field alias", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-readonly",
            name: "readonly_field",
            label: "Readonly",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            readonly: true,
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].readonly).toBe(true);
    });

    it("should handle is_hidden alias", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-alias",
            name: "alias_field",
            label: "Alias",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            is_hidden: true,
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].hidden).toBe(true);
    });

    it("should handle is_readonly alias", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-alias-ro",
            name: "alias_ro_field",
            label: "Alias RO",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            is_readonly: true,
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].readonly).toBe(true);
    });
  });

  describe("TC-SN-006 — Entrada inválida", () => {
    it("should handle empty fields array", () => {
      const input = {
        ...minimalValidInput,
        fields: [],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields).toEqual([]);
    });

    it("should handle missing fields (undefined)", () => {
      const input = {
        engineType: "BaseChecklist",
        code: "NOFIELDS",
        name: "No Fields",
        strict: false,
        fields: undefined as any,
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields).toEqual([]);
    });

    it("should generate fallback id when missing", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            name: "no_id_field",
            label: "No ID",
            orderIndex: 0,
            fieldType: "text",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].id).toMatch(/^f-\d+/);
    });

    it("should fallback name to id when missing", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-no-name",
            label: "No Name",
            orderIndex: 0,
            fieldType: "text",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].name).toBe("f-no-name");
    });

    it("should fallback label to name when missing", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-no-label",
            name: "has_name",
            orderIndex: 0,
            fieldType: "text",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].label).toBe("has_name");
    });

    it("should default fieldType to text when missing", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-no-type",
            name: "no_type",
            label: "No Type",
            orderIndex: 0,
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].fieldType).toBe("text");
    });

    it("should use index as orderIndex when missing", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          { id: "f-a", name: "a", label: "A", fieldType: "text" } as RuntimeFieldSchemaInput,
          { id: "f-b", name: "b", label: "B", fieldType: "text" } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].orderIndex).toBe(0);
      expect(result.fields[1].orderIndex).toBe(1);
    });

    it("should default options to empty object when null", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-null-opts",
            name: "null_opts",
            label: "Null Opts",
            orderIndex: 0,
            fieldType: "text",
            options: null as any,
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].options).toEqual({});
    });

    it("should default options to empty object when undefined", () => {
      const input = {
        ...minimalValidInput,
        fields: [
          {
            id: "f-undef-opts",
            name: "undef_opts",
            label: "Undef Opts",
            orderIndex: 0,
            fieldType: "text",
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.fields[0].options).toEqual({});
    });

    it("should handle strict mode", () => {
      const input = {
        ...minimalValidInput,
        strict: true,
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.strict).toBe(true);
    });

    it("does not expose form id (internal to formContract)", () => {
      const input = {
        ...minimalValidInput,
        code: "MY-FORM-CODE",
      };
      const result = SchemaNormalizer.normalizeForm(input);

      // SchemaNormalizer does not return id - it's internal to formContract
      // RuntimeFormFactory.createRuntimeFormModel will include it in formContract.id
      expect(result).not.toHaveProperty("id");
    });

    it("should default form code to RUNTIME when missing", () => {
      const input = {
        ...minimalValidInput,
        code: undefined as any,
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.code).toBe("RUNTIME");
    });

    it("should default engineType to BaseGeneric when missing", () => {
      const input = {
        ...minimalValidInput,
        engineType: undefined as any,
      };
      const result = SchemaNormalizer.normalizeForm(input);

      expect(result.engineType).toBe("BaseGeneric");
    });
  });

  describe("TC-SN-007 — Determinismo", () => {
    it("should produce identical results for identical input across multiple calls", () => {
      const result1 = SchemaNormalizer.normalizeForm(minimalValidInput);
      const result2 = SchemaNormalizer.normalizeForm(minimalValidInput);
      const result3 = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result1.fields).toEqual(result2.fields);
      expect(result2.fields).toEqual(result3.fields);
      expect(result1.code).toBe(result2.code);
      expect(result2.code).toBe(result3.code);
      expect(result1.engineType).toBe(result2.engineType);
      expect(result2.engineType).toBe(result3.engineType);
    });

    it("should produce identical field ordering for same input", () => {
      const result1 = SchemaNormalizer.normalizeForm(minimalValidInput);
      const result2 = SchemaNormalizer.normalizeForm(minimalValidInput);

      const ids1 = result1.fields.map((f) => f.id);
      const ids2 = result2.fields.map((f) => f.id);
      expect(ids1).toEqual(ids2);
    });

    it("should produce identical top-level properties for same input", () => {
      const result1 = SchemaNormalizer.normalizeForm(minimalValidInput);
      const result2 = SchemaNormalizer.normalizeForm(minimalValidInput);

      expect(result1.code).toBe(result2.code);
      expect(result1.name).toBe(result2.name);
      expect(result1.engineType).toBe(result2.engineType);
      expect(result1.workflowConfig).toEqual(result2.workflowConfig);
      expect(result1.security).toEqual(result2.security);
      expect(result1.aiIntegration).toEqual(result2.aiIntegration);
    });
  });
});