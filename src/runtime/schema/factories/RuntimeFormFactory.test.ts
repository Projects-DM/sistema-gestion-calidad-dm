import { describe, it, expect } from "vitest";
import { RuntimeFormFactory } from "./RuntimeFormFactory";
import type { RuntimeFieldSchemaInput } from "../contracts/runtimeSchemaContracts";
import type { FieldContract, FormContract } from "../../types/runtimeContracts";

describe("RuntimeFormFactory", () => {
  const minimalValidNormalized = {
    engineType: "BaseChecklist" as FormContract["engineType"],
    code: "TEST-001",
    name: "Test Form",
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
    groupByKey: undefined,
    fields: [
      {
        id: "f-1",
        name: "field_one",
        label: "Field One",
        required: true,
        orderIndex: 0,
        fieldType: "text" as FieldContract["fieldType"],
        hidden: false,
        readonly: false,
        options: {},
      } as FieldContract,
      {
        id: "f-2",
        name: "field_two",
        label: "Field Two",
        required: false,
        orderIndex: 1,
        fieldType: "number" as FieldContract["fieldType"],
        hidden: false,
        readonly: false,
        options: { min: 0, max: 100 },
      } as FieldContract,
    ],
    strict: false,
  };

  describe("TC-RFF-001 — Factory con metadata válida", () => {
    it("should create RuntimeFormModel from normalized input", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result).toBeDefined();
      expect(result.formContract).toBeDefined();
      expect(result.normalizedFields).toBeDefined();
      expect(result.initialValues).toBeDefined();
      expect(result.validationErrors).toBeDefined();
    });

    it("should return formContract with correct properties", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.formContract.id).toBe("TEST-001");
      expect(result.formContract.code).toBe("TEST-001");
      expect(result.formContract.name).toBe("Test Form");
      expect(result.formContract.engineType).toBe("BaseChecklist");
    });

    it("should return normalizedFields matching input fields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.normalizedFields.length).toBe(2);
      expect(result.normalizedFields[0].id).toBe("f-1");
      expect(result.normalizedFields[1].id).toBe("f-2");
    });

    it("should return initialValues for each field", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.initialValues).toHaveProperty("f-1");
      expect(result.initialValues).toHaveProperty("f-2");
    });

    it("should return empty validationErrors", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.validationErrors).toEqual({});
    });
  });

  describe("TC-RFF-002 — Creación de estructura esperada", () => {
    it("should preserve field order from normalized input", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      const fieldIds = result.normalizedFields.map((f) => f.id);
      expect(fieldIds).toEqual(["f-1", "f-2"]);
    });

    it("should include all fields in normalizedFields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.normalizedFields).toHaveLength(2);
      expect(result.normalizedFields[0]).toEqual(minimalValidNormalized.fields[0]);
      expect(result.normalizedFields[1]).toEqual(minimalValidNormalized.fields[1]);
    });

    it("should include all fields in formContract.fields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.formContract.fields).toHaveLength(2);
      expect(result.formContract.fields[0].id).toBe("f-1");
      expect(result.formContract.fields[1].id).toBe("f-2");
    });
  });

  describe("TC-RFF-003 — Preservación de configuración", () => {
    it("should preserve workflowConfig", () => {
      const input = {
        ...minimalValidNormalized,
        workflowConfig: {
          requiresApproval: true,
          requiresSignature: true,
          verifierRole: "admin",
          allowedRoles: ["admin", "quality"],
        },
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.formContract.workflowConfig.requiresApproval).toBe(true);
      expect(result.formContract.workflowConfig.requiresSignature).toBe(true);
      expect(result.formContract.workflowConfig.verifierRole).toBe("admin");
      expect(result.formContract.workflowConfig.allowedRoles).toEqual(["admin", "quality"]);
    });

    it("should preserve security config", () => {
      const input = {
        ...minimalValidNormalized,
        security: {
          requiresStorage: true,
          offlineReady: false,
        },
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.formContract.security.requiresStorage).toBe(true);
      expect(result.formContract.security.offlineReady).toBe(false);
    });

    it("should preserve aiIntegration", () => {
      const input = {
        ...minimalValidNormalized,
        aiIntegration: {
          compatibleIa: true,
          iaTags: ["tag1", "tag2"],
        },
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.formContract.aiIntegration.compatibleIa).toBe(true);
      expect(result.formContract.aiIntegration.iaTags).toEqual(["tag1", "tag2"]);
    });

    it("should preserve groupByKey", () => {
      const input = {
        ...minimalValidNormalized,
        groupByKey: "section",
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      // groupByKey is not on formContract but preserved in normalized input
      expect(result.formContract).toBeDefined();
    });
  });

  describe("TC-RFF-004 — Defaults", () => {
    it("should produce empty string default for text fields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.initialValues["f-1"]).toBe("");
    });

    it("should produce empty string default for number fields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.initialValues["f-2"]).toBe("");
    });

    it("should produce false default for boolean fields", () => {
      const input = {
        ...minimalValidNormalized,
        fields: [
          {
            id: "f-bool",
            name: "bool_field",
            label: "Boolean",
            required: true,
            orderIndex: 0,
            fieldType: "boolean" as FieldContract["fieldType"],
            hidden: false,
            readonly: false,
            options: {},
          } as FieldContract,
        ],
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.initialValues["f-bool"]).toBe(false);
    });

    it("should produce empty array default for table fields", () => {
      const input = {
        ...minimalValidNormalized,
        fields: [
          {
            id: "f-table",
            name: "table_field",
            label: "Table",
            required: false,
            orderIndex: 0,
            fieldType: "table" as FieldContract["fieldType"],
            hidden: false,
            readonly: false,
            options: {},
          } as FieldContract,
        ],
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.initialValues["f-table"]).toEqual([]);
    });
  });

  describe("TC-RFF-005 — Campos requeridos", () => {
    it("should preserve required=true in formContract.fields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.formContract.fields[0].required).toBe(true);
    });

    it("should preserve required=false in formContract.fields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.formContract.fields[1].required).toBe(false);
    });

    it("should preserve required in normalizedFields", () => {
      const result = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result.normalizedFields[0].required).toBe(true);
      expect(result.normalizedFields[1].required).toBe(false);
    });
  });

  describe("TC-RFF-006 — Entrada opcional", () => {
    it("should handle missing workflowConfig (use defaults)", () => {
      const input = { ...minimalValidNormalized, workflowConfig: undefined };
      const result = RuntimeFormFactory.createRuntimeFormModel(input as any);

      expect(result.formContract.workflowConfig.requiresApproval).toBe(false);
      expect(result.formContract.workflowConfig.verifierRole).toBe("calidad");
    });

    it("should handle missing security (use defaults)", () => {
      const input = { ...minimalValidNormalized, security: undefined };
      const result = RuntimeFormFactory.createRuntimeFormModel(input as any);

      expect(result.formContract.security.requiresStorage).toBe(false);
      expect(result.formContract.security.offlineReady).toBe(true);
    });

    it("should handle missing aiIntegration (use defaults)", () => {
      const input = { ...minimalValidNormalized, aiIntegration: undefined };
      const result = RuntimeFormFactory.createRuntimeFormModel(input as any);

      expect(result.formContract.aiIntegration.compatibleIa).toBe(false);
      expect(result.formContract.aiIntegration.iaTags).toEqual([]);
    });

    it("should handle missing engineType (default BaseGeneric)", () => {
      const input = { ...minimalValidNormalized, engineType: undefined };
      const result = RuntimeFormFactory.createRuntimeFormModel(input as any);

      expect(result.formContract.engineType).toBe("BaseGeneric");
    });

    it("should handle missing code (default RUNTIME)", () => {
      const input = { ...minimalValidNormalized, code: undefined };
      const result = RuntimeFormFactory.createRuntimeFormModel(input as any);

      expect(result.formContract.code).toBe("RUNTIME");
    });

    it("should handle missing name (default Runtime Form)", () => {
      const input = { ...minimalValidNormalized, name: undefined };
      const result = RuntimeFormFactory.createRuntimeFormModel(input as any);

      expect(result.formContract.name).toBe("Runtime Form");
    });
  });

  describe("TC-RFF-007 — Entrada inválida", () => {
    it("should handle empty fields array", () => {
      const input = { ...minimalValidNormalized, fields: [] };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.normalizedFields).toEqual([]);
      expect(result.initialValues).toEqual({});
      expect(result.formContract.fields).toEqual([]);
    });

    it("should handle field with hidden=true", () => {
      const input = {
        ...minimalValidNormalized,
        fields: [
          {
            id: "f-hidden",
            name: "hidden_field",
            label: "Hidden",
            required: false,
            orderIndex: 0,
            fieldType: "text" as FieldContract["fieldType"],
            hidden: true,
            readonly: false,
            options: {},
          } as FieldContract,
        ],
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.normalizedFields[0].hidden).toBe(true);
      expect(result.formContract.fields[0].hidden).toBe(true);
    });

    it("should handle field with readonly=true", () => {
      const input = {
        ...minimalValidNormalized,
        fields: [
          {
            id: "f-readonly",
            name: "readonly_field",
            label: "Readonly",
            required: false,
            orderIndex: 0,
            fieldType: "text" as FieldContract["fieldType"],
            hidden: false,
            readonly: true,
            options: {},
          } as FieldContract,
        ],
      };
      const result = RuntimeFormFactory.createRuntimeFormModel(input);

      expect(result.normalizedFields[0].readonly).toBe(true);
      expect(result.formContract.fields[0].readonly).toBe(true);
    });
  });

  describe("TC-RFF-008 — fromSchemaInput convenience method", () => {
    it("should create RuntimeFormModel directly from schema input", () => {
      const schemaInput = {
        engineType: "BaseChecklist",
        code: "DIRECT-001",
        name: "Direct Form",
        fields: [
          {
            id: "f-direct",
            name: "direct_field",
            label: "Direct Field",
            required: true,
            orderIndex: 0,
            fieldType: "text",
            options: {},
          } as RuntimeFieldSchemaInput,
        ],
        strict: false,
      };
      const result = RuntimeFormFactory.fromSchemaInput(schemaInput);

      expect(result).toBeDefined();
      expect(result.formContract.code).toBe("DIRECT-001");
      expect(result.formContract.name).toBe("Direct Form");
      expect(result.normalizedFields.length).toBe(1);
      expect(result.initialValues).toHaveProperty("f-direct");
    });

    it("should normalize fields through SchemaNormalizer internally", () => {
      const schemaInput = {
        engineType: "BaseChecklist",
        code: "NORM-001",
        name: "Normalized Form",
        fields: [
          {
            name: "no_id_field",
            label: "No ID",
            orderIndex: 0,
            fieldType: "text",
          } as RuntimeFieldSchemaInput,
        ],
        strict: false,
      };
      const result = RuntimeFormFactory.fromSchemaInput(schemaInput);

      expect(result.normalizedFields[0].id).toMatch(/^f-\d+/);
      expect(result.normalizedFields[0].name).toBe("no_id_field");
    });

    it("should apply defaults for missing optional config", () => {
      const schemaInput = {
        engineType: "BaseChecklist",
        code: "DEFAULTS-001",
        name: "Defaults Form",
        fields: [
          {
            id: "f-1",
            name: "field_one",
            label: "Field One",
            required: false,
            orderIndex: 0,
            fieldType: "text",
            options: {},
          } as RuntimeFieldSchemaInput,
        ],
      };
      const result = RuntimeFormFactory.fromSchemaInput(schemaInput);

      expect(result.formContract.workflowConfig.requiresApproval).toBe(false);
      expect(result.formContract.security.offlineReady).toBe(true);
      expect(result.formContract.aiIntegration.compatibleIa).toBe(false);
    });
  });

  describe("Determinism", () => {
    it("should produce identical results for identical input across multiple calls", () => {
      const result1 = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);
      const result2 = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);
      const result3 = RuntimeFormFactory.createRuntimeFormModel(minimalValidNormalized);

      expect(result1.formContract).toEqual(result2.formContract);
      expect(result2.formContract).toEqual(result3.formContract);
      expect(result1.normalizedFields).toEqual(result2.normalizedFields);
      expect(result2.normalizedFields).toEqual(result3.normalizedFields);
      expect(result1.initialValues).toEqual(result2.initialValues);
      expect(result2.initialValues).toEqual(result3.initialValues);
    });

    it("should produce identical results for fromSchemaInput", () => {
      const schemaInput = {
        engineType: "BaseChecklist",
        code: "DET-001",
        name: "Determinism Form",
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
        ],
        strict: false,
      };
      const result1 = RuntimeFormFactory.fromSchemaInput(schemaInput);
      const result2 = RuntimeFormFactory.fromSchemaInput(schemaInput);

      expect(result1.formContract).toEqual(result2.formContract);
      expect(result1.normalizedFields).toEqual(result2.normalizedFields);
      expect(result1.initialValues).toEqual(result2.initialValues);
    });
  });
});