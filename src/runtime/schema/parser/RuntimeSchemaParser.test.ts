import { describe, it, expect } from "vitest";
import { RuntimeSchemaParser } from "./RuntimeSchemaParser";
import type { RuntimeFormSchemaInput, RuntimeFieldSchemaInput } from "../contracts/runtimeSchemaContracts";

describe("RuntimeSchemaParser", () => {
  const createParser = (options = {}) => new RuntimeSchemaParser(options);

  const minimalValidSchema: RuntimeFormSchemaInput = {
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
      },
      {
        id: "f-2",
        name: "field_two",
        label: "Field Two",
        required: false,
        orderIndex: 1,
        fieldType: "number",
        options: { min: 0, max: 100 },
      },
    ],
  };

  describe("TC-RSP-001 — Valid metadata produces valid schema", () => {
    it("should parse minimal valid schema into RuntimeFormModel", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      expect(result).toBeDefined();
      expect(result.formContract).toBeDefined();
      expect(result.normalizedFields).toBeDefined();
      expect(result.initialValues).toBeDefined();
      expect(result.validationErrors).toBeDefined();
    });

    it("should preserve form-level properties", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      expect(result.formContract.engineType).toBe("BaseChecklist");
      expect(result.formContract.code).toBe("TEST-001");
      expect(result.formContract.name).toBe("Test Form");
    });

    it("should produce normalized fields array", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      expect(Array.isArray(result.normalizedFields)).toBe(true);
      expect(result.normalizedFields.length).toBe(2);
    });

    it("should produce initial values for each field", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      expect(result.initialValues).toHaveProperty("f-1");
      expect(result.initialValues).toHaveProperty("f-2");
    });

    it("should produce empty validation errors by default", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      expect(result.validationErrors).toEqual({});
    });
  });

  describe("TC-RSP-002 — Required fields preserved", () => {
    it("should preserve required=true on fields", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      const requiredField = result.normalizedFields.find((f) => f.id === "f-1");
      expect(requiredField?.required).toBe(true);
    });

    it("should preserve required=false on fields", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      const optionalField = result.normalizedFields.find((f) => f.id === "f-2");
      expect(optionalField?.required).toBe(false);
    });

    it("should default required to false when not specified", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-3",
            name: "field_three",
            label: "Field Three",
            orderIndex: 0,
            fieldType: "text",
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].required).toBe(false);
    });
  });

  describe("TC-RSP-003 — Field types preserved", () => {
    it("should preserve text field type", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      const textField = result.normalizedFields.find((f) => f.id === "f-1");
      expect(textField?.fieldType).toBe("text");
    });

    it("should preserve number field type", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      const numberField = result.normalizedFields.find((f) => f.id === "f-2");
      expect(numberField?.fieldType).toBe("number");
    });

    it("should preserve select field type with options", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-select",
            name: "select_field",
            label: "Select",
            required: true,
            orderIndex: 0,
            fieldType: "select",
            options: { choices: ["a", "b", "c"] },
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      const selectField = result.normalizedFields[0];
      expect(selectField.fieldType).toBe("select");
      expect(selectField.options.choices).toEqual(["a", "b", "c"]);
    });

    it("should preserve boolean field type", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-bool",
            name: "bool_field",
            label: "Boolean",
            required: true,
            orderIndex: 0,
            fieldType: "boolean",
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].fieldType).toBe("boolean");
    });
  });

  describe("TC-RSP-004 — Defaults preserved", () => {
    it("should produce empty string default for text fields", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      expect(result.initialValues["f-1"]).toBe("");
    });

    it("should produce empty string default for number fields (per factory)", () => {
      const parser = createParser();
      const result = parser.parse(minimalValidSchema);

      expect(result.initialValues["f-2"]).toBe("");
    });

    it("should produce false default for boolean fields", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-bool",
            name: "bool_field",
            label: "Boolean",
            required: true,
            orderIndex: 0,
            fieldType: "boolean",
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.initialValues["f-bool"]).toBe(false);
    });

    it("should produce empty array default for table fields", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-table",
            name: "table_field",
            label: "Table",
            required: false,
            orderIndex: 0,
            fieldType: "table",
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.initialValues["f-table"]).toEqual([]);
    });
  });

  describe("TC-RSP-005 — Optional configuration does not break", () => {
    it("should handle optional workflowConfig", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        workflowConfig: {
          requiresApproval: true,
          requiresSignature: true,
          verifierRole: "admin",
          allowedRoles: ["admin", "quality"],
        },
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.formContract.workflowConfig.requiresApproval).toBe(true);
      expect(result.formContract.workflowConfig.requiresSignature).toBe(true);
      expect(result.formContract.workflowConfig.verifierRole).toBe("admin");
    });

    it("should handle optional security config", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        security: {
          requiresStorage: true,
          offlineReady: false,
        },
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.formContract.security.requiresStorage).toBe(true);
      expect(result.formContract.security.offlineReady).toBe(false);
    });

    it("should handle optional aiIntegration", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        aiIntegration: {
          compatibleIa: true,
          iaTags: ["tag1", "tag2"],
        },
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.formContract.aiIntegration.compatibleIa).toBe(true);
      expect(result.formContract.aiIntegration.iaTags).toEqual(["tag1", "tag2"]);
    });

    it("should handle optional groupByKey", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        groupByKey: "section",
      };
      const parser = createParser();
      const result = parser.parse(schema);

      // groupByKey is passed through normalized input but not directly on formContract
      expect(result.formContract).toBeDefined();
    });

    it("should handle field with hidden=true", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-hidden",
            name: "hidden_field",
            label: "Hidden",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            hidden: true,
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].hidden).toBe(true);
    });

    it("should handle field with readonly=true", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-readonly",
            name: "readonly_field",
            label: "Readonly",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            readonly: true,
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].readonly).toBe(true);
    });

    it("should handle alias is_hidden", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-alias",
            name: "alias_field",
            label: "Alias",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            is_hidden: true,
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].hidden).toBe(true);
    });

    it("should handle alias is_readonly", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-alias-ro",
            name: "alias_ro_field",
            label: "Alias RO",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            is_readonly: true,
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].readonly).toBe(true);
    });
  });

  describe("TC-RSP-006 — Invalid input handled", () => {
    it("should handle empty fields array", () => {
      const schema: RuntimeFormSchemaInput = {
        engineType: "BaseChecklist",
        code: "EMPTY",
        name: "Empty Form",
        fields: [],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields).toEqual([]);
      expect(result.initialValues).toEqual({});
    });

    it("should handle undefined fields", () => {
      const schema: RuntimeFormSchemaInput = {
        engineType: "BaseChecklist",
        code: "UNDEF",
        name: "Undef Fields",
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields).toEqual([]);
      expect(result.initialValues).toEqual({});
    });

    it("should handle fields with missing id (generates fallback)", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            name: "no_id_field",
            label: "No ID",
            orderIndex: 0,
            fieldType: "text",
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].id).toBeDefined();
      expect(result.normalizedFields[0].id).toMatch(/^f-\d+/);
    });

    it("should handle fields with missing name (falls back to id)", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-no-name",
            label: "No Name",
            orderIndex: 0,
            fieldType: "text",
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].name).toBe("f-no-name");
    });

    it("should handle fields with missing label (falls back to name)", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-no-label",
            name: "has_name",
            orderIndex: 0,
            fieldType: "text",
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].label).toBe("has_name");
    });

    it("should handle fields with missing fieldType (defaults to text)", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-no-type",
            name: "no_type",
            label: "No Type",
            orderIndex: 0,
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].fieldType).toBe("text");
    });

    it("should handle missing orderIndex (uses index)", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          { id: "f-a", name: "a", label: "A", fieldType: "text" },
          { id: "f-b", name: "b", label: "B", fieldType: "text" },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].orderIndex).toBe(0);
      expect(result.normalizedFields[1].orderIndex).toBe(1);
    });

    it("should handle null options (defaults to empty object)", () => {
      const schema: RuntimeFormSchemaInput = {
        ...minimalValidSchema,
        fields: [
          {
            id: "f-null-opts",
            name: "null_opts",
            label: "Null Opts",
            orderIndex: 0,
            fieldType: "text",
            options: null as any,
          },
        ],
      };
      const parser = createParser();
      const result = parser.parse(schema);

      expect(result.normalizedFields[0].options).toEqual({});
    });

    it("should handle strict mode option", () => {
      const parser = createParser({ strict: true });
      const result = parser.parse(minimalValidSchema);

      expect(result).toBeDefined();
      expect(result.normalizedFields.length).toBe(2);
    });
  });

  describe("TC-RSP-007 — Determinism", () => {
    it("should produce identical results for identical input across multiple calls", () => {
      const parser = createParser();
      const result1 = parser.parse(minimalValidSchema);
      const result2 = parser.parse(minimalValidSchema);
      const result3 = parser.parse(minimalValidSchema);

      expect(result1.formContract).toEqual(result2.formContract);
      expect(result2.formContract).toEqual(result3.formContract);
      expect(result1.normalizedFields).toEqual(result2.normalizedFields);
      expect(result2.normalizedFields).toEqual(result3.normalizedFields);
      expect(result1.initialValues).toEqual(result2.initialValues);
      expect(result2.initialValues).toEqual(result3.initialValues);
    });

    it("should produce identical field ordering for same input", () => {
      const parser = createParser();
      const result1 = parser.parse(minimalValidSchema);
      const result2 = parser.parse(minimalValidSchema);

      const ids1 = result1.normalizedFields.map((f) => f.id);
      const ids2 = result2.normalizedFields.map((f) => f.id);
      expect(ids1).toEqual(ids2);
    });

    it("should produce identical initial values for same input", () => {
      const parser = createParser();
      const result1 = parser.parse(minimalValidSchema);
      const result2 = parser.parse(minimalValidSchema);

      expect(result1.initialValues).toEqual(result2.initialValues);
    });
  });
});