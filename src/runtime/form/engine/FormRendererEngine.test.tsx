import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import { FormRendererEngine } from "./FormRendererEngine";
import type { LayoutDefinition } from "../../layout/contracts/LayoutContracts";
import type { FieldContract, RuntimeFieldType } from "../../types/runtimeContracts";

describe("FormRendererEngine", () => {
  const createFieldDef = (overrides: Partial<FieldContract> = {}): FieldContract => ({
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

  const createLayout = (overrides: Partial<LayoutDefinition> = {}): LayoutDefinition => ({
    id: overrides.id ?? "layout-1",
    name: overrides.name ?? "Test Layout",
    sections: overrides.sections ?? [
      {
        id: "section-1",
        title: "Section 1",
        description: "Description 1",
        columns: [
          {
            id: "col-1",
            width: 100,
            fields: [
              { fieldId: "field-1" },
              { fieldId: "field-2" },
            ],
          },
        ],
      },
    ],
  });

  const defaultFormData = {
    "field-1": "value 1",
    "field-2": "value 2",
    __fieldDefs: {
      "field-1": createFieldDef({ id: "field-1", label: "Field One" }),
      "field-2": createFieldDef({ id: "field-2", label: "Field Two" }),
    },
  };

  const defaultOnChange = vi.fn();

  afterEach(() => {
    cleanup();
  });

  describe("TC-FRE-001 — Composición del formulario dinámico", () => {
    it("should render form layout", () => {
      const layout = createLayout();
      
      const { container } = render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(container.querySelector(".runtime-layout")).toBeInTheDocument();
    });

    it("should render sections", () => {
      const layout = createLayout({
        sections: [
          { id: "sec-1", title: "First Section", columns: [] },
          { id: "sec-2", title: "Second Section", columns: [] },
        ],
      });
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("First Section")).toBeInTheDocument();
      expect(screen.getByText("Second Section")).toBeInTheDocument();
    });

    it("should render field labels", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should render field values", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByDisplayValue("value 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("value 2")).toBeInTheDocument();
    });
  });

  describe("TC-FRE-002 — Integración de schema/context/layout/field rendering", () => {
    it("should integrate LayoutEngine with DynamicFieldRenderer", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Integrated Section",
            columns: [
              { id: "col-1", width: 50, fields: [{ fieldId: "field-1" }] },
              { id: "col-2", width: 50, fields: [{ fieldId: "field-2" }] },
            ],
          },
        ],
      });
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Integrated Section")).toBeInTheDocument();
      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should pass formData to LayoutEngine", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByDisplayValue("value 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("value 2")).toBeInTheDocument();
    });

    it("should pass onChange to LayoutEngine", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const input = screen.getByDisplayValue("value 1");
      act(() => {
        fireEvent.change(input, { target: { value: "updated" } });
      });

      expect(defaultOnChange).toHaveBeenCalledWith("field-1", "updated");
    });

    it("should pass disabled to LayoutEngine", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} disabled={true} />
      );

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toBeDisabled();
      expect(inputs[1]).toBeDisabled();
    });

    it("should pass errors to LayoutEngine", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine 
          layout={layout} 
          formData={defaultFormData} 
          onChange={defaultOnChange} 
          errors={{ "field-1": "Error message" }} 
        />
      );
    });

    it("should pass hiddenFields to LayoutEngine", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine 
          layout={layout} 
          formData={defaultFormData} 
          onChange={defaultOnChange} 
          hiddenFields={new Set(["field-1"])} 
        />
      );

      expect(screen.queryByText("Field One")).not.toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should pass disabledFields to LayoutEngine", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine 
          layout={layout} 
          formData={defaultFormData} 
          onChange={defaultOnChange} 
          disabledFields={new Set(["field-1"])} 
        />
      );

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toBeDisabled();
      expect(inputs[1]).not.toBeDisabled();
    });
  });

  describe("TC-FRE-003 — Renderizado de campos", () => {
    it("should render all fields in layout", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should handle fields with different types", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Mixed Types",
            columns: [
              { id: "col-1", width: 100, fields: [
                { fieldId: "text-field" },
                { fieldId: "number-field" },
                { fieldId: "select-field" },
              ]},
            ],
          },
        ],
      });
      
      const formData = {
        "text-field": "text value",
        "number-field": "42",
        "select-field": "option-a",
        __fieldDefs: {
          "text-field": createFieldDef({ id: "text-field", label: "Text Field", fieldType: "text" }),
          "number-field": createFieldDef({ id: "number-field", label: "Number Field", fieldType: "number" }),
          "select-field": createFieldDef({ id: "select-field", label: "Select Field", fieldType: "select", options: { choices: ["a", "b"] }}),
        },
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Text Field")).toBeInTheDocument();
      expect(screen.getByText("Number Field")).toBeInTheDocument();
      expect(screen.getByText("Select Field")).toBeInTheDocument();
    });
  });

  describe("TC-FRE-004 — Interacción entre las capas del Runtime", () => {
    it("should propagate onChange through LayoutEngine to DynamicFieldRenderer", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const input = screen.getByDisplayValue("value 1");
      act(() => {
        fireEvent.change(input, { target: { value: "new value" } });
      });

      expect(defaultOnChange).toHaveBeenCalledWith("field-1", "new value");
    });

    it("should handle multiple field changes", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const input1 = screen.getByDisplayValue("value 1");
      const input2 = screen.getByDisplayValue("value 2");

      act(() => {
        fireEvent.change(input1, { target: { value: "updated 1" } });
      });
      act(() => {
        fireEvent.change(input2, { target: { value: "updated 2" } });
      });

      expect(defaultOnChange).toHaveBeenCalledWith("field-1", "updated 1");
      expect(defaultOnChange).toHaveBeenCalledWith("field-2", "updated 2");
    });

    it("should preserve field order in layout", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Section",
            columns: [
              { id: "col-1", width: 100, fields: [
                { fieldId: "field-3" },
                { fieldId: "field-1" },
                { fieldId: "field-2" },
              ]},
            ],
          },
        ],
      });
      
      const formData = {
        "field-1": "v1", "field-2": "v2", "field-3": "v3",
        __fieldDefs: {
          "field-1": createFieldDef({ id: "field-1", label: "Field 1" }),
          "field-2": createFieldDef({ id: "field-2", label: "Field 2" }),
          "field-3": createFieldDef({ id: "field-3", label: "Field 3" }),
        },
      };
      
      const { container } = render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      const labels = container.querySelectorAll(".runtime-field-label");
      expect(labels).toHaveLength(3);
      expect(labels[0]).toHaveTextContent("Field 3");
      expect(labels[1]).toHaveTextContent("Field 1");
      expect(labels[2]).toHaveTextContent("Field 2");
    });
  });

  describe("TC-FRE-005 — Flujo de datos", () => {
    it("should pass formData values to fields", () => {
      const layout = createLayout();
      const formData = {
        "field-1": "custom 1",
        "field-2": "custom 2",
        __fieldDefs: {
          "field-1": createFieldDef({ id: "field-1", label: "Field One" }),
          "field-2": createFieldDef({ id: "field-2", label: "Field Two" }),
        },
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByDisplayValue("custom 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("custom 2")).toBeInTheDocument();
    });

    it("should handle undefined values in formData", () => {
      const layout = createLayout();
      const formData = {
        "field-1": undefined,
        "field-2": "value",
        __fieldDefs: {
          "field-1": createFieldDef({ id: "field-1", label: "Field One" }),
          "field-2": createFieldDef({ id: "field-2", label: "Field Two" }),
        },
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should handle null values in formData", () => {
      const layout = createLayout();
      const formData = {
        "field-1": null,
        "field-2": "value",
        __fieldDefs: {
          "field-1": createFieldDef({ id: "field-1", label: "Field One" }),
          "field-2": createFieldDef({ id: "field-2", label: "Field Two" }),
        },
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
    });
  });

  describe("TC-FRE-006 — Comportamiento con metadata válida", () => {
    it("should render with valid LayoutDefinition", () => {
      const layout: LayoutDefinition = {
        id: "valid-layout",
        name: "Valid Layout",
        sections: [
          {
            id: "sec-1",
            title: "Valid Section",
            columns: [
              {
                id: "col-1",
                width: 100,
                fields: [{ fieldId: "valid-field" }],
              },
            ],
          },
        ],
      };
      
      const formData = {
        "valid-field": "value",
        __fieldDefs: {
          "valid-field": createFieldDef({ id: "valid-field", label: "Valid Field" }),
        },
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Valid Section")).toBeInTheDocument();
      expect(screen.getByText("Valid Field")).toBeInTheDocument();
    });

    it("should handle empty sections array", () => {
      const layout = createLayout({ sections: [] });
      
      const { container } = render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(container.querySelector(".runtime-layout")).toBeInTheDocument();
    });

    it("should handle sections with no columns", () => {
      const layout = createLayout({
        sections: [{ id: "sec-1", title: "Empty Section", columns: [] }],
      });
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Empty Section")).toBeInTheDocument();
    });

    it("should handle missing fieldDef gracefully", () => {
      const layout = createLayout();
      const formData = {
        "field-1": "value",
        "field-2": "value",
        // no __fieldDefs
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getAllByText("Missing field definition")).toHaveLength(2);
    });
  });

  describe("TC-FRE-007 — Integración del contrato Runtime Schema", () => {
    it("should use FieldContract structure for fieldDefs", () => {
      const layout = createLayout();
      
      render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should preserve required field property", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Section",
            columns: [
              { id: "col-1", width: 100, fields: [
                { fieldId: "req-field" },
                { fieldId: "opt-field" },
              ]},
            ],
          },
        ],
      });
      
      const formData = {
        "req-field": "",
        "opt-field": "",
        __fieldDefs: {
          "req-field": createFieldDef({ id: "req-field", label: "Required", required: true }),
          "opt-field": createFieldDef({ id: "opt-field", label: "Optional", required: false }),
        },
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      // Label includes required indicator (*)
      const requiredInput = screen.getByLabelText(/Required/);
      const optionalInput = screen.getByLabelText("Optional");
      expect(requiredInput).toBeRequired();
      expect(optionalInput).not.toBeRequired();
    });

    it("should preserve fieldType in rendering", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Types",
            columns: [
              { id: "col-1", width: 100, fields: [
                { fieldId: "text-field" },
                { fieldId: "number-field" },
                { fieldId: "select-field" },
              ]},
            ],
          },
        ],
      });
      
      const formData = {
        "text-field": "text",
        "number-field": "42",
        "select-field": "a",
        __fieldDefs: {
          "text-field": createFieldDef({ id: "text-field", label: "Text", fieldType: "text" }),
          "number-field": createFieldDef({ id: "number-field", label: "Number", fieldType: "number" }),
          "select-field": createFieldDef({ id: "select-field", label: "Select", fieldType: "select", options: { choices: ["a", "b"] }}),
        },
      };
      
      render(
        <FormRendererEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument(); // text
      expect(screen.getByRole("spinbutton")).toBeInTheDocument(); // number
      expect(screen.getByRole("combobox")).toBeInTheDocument(); // select
    });
  });

  describe("TC-FRE-008 — Determinismo", () => {
    it("should render same output for same inputs", () => {
      const layout = createLayout();
      
      const { container } = render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(container.querySelector(".runtime-layout")).toBeInTheDocument();
    });

    it("should produce consistent field order", () => {
      const layout = createLayout();
      
      const { container: container1 } = render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );
      
      const labels1 = container1.querySelectorAll(".runtime-field-label");
      const texts1 = Array.from(labels1).map(l => l.textContent);
      
      const { container: container2 } = render(
        <FormRendererEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );
      
      const labels2 = container2.querySelectorAll(".runtime-field-label");
      const texts2 = Array.from(labels2).map(l => l.textContent);
      
      expect(texts1).toEqual(texts2);
    });
  });
});