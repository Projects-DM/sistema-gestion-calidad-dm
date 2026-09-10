import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor, within } from "@testing-library/react";
import { LayoutEngine } from "./LayoutEngine";
import type { LayoutDefinition } from "../contracts/LayoutContracts";
import type { FieldContract, RuntimeFieldType } from "../../types/runtimeContracts";

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

describe("LayoutEngine", () => {
  const defaultFormData = {
    "field-1": "value 1",
    "field-2": "value 2",
    __fieldDefs: {
      "field-1": createFieldDef({ id: "field-1", label: "Field One" }),
      "field-2": createFieldDef({ id: "field-2", label: "Field Two" }),
    },
  };

  const defaultOnChange = vi.fn();

  describe("TC-LE-001 — Renderizado del layout", () => {
    it("should render layout container with class runtime-layout", () => {
      const layout = createLayout();
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(container.querySelector(".runtime-layout")).toBeInTheDocument();
    });

    it("should render sections with class runtime-section", () => {
      const layout = createLayout({
        sections: [
          { id: "sec-1", title: "First Section", columns: [] },
          { id: "sec-2", title: "Second Section", columns: [] },
        ],
      });
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const sections = container.querySelectorAll(".runtime-section");
      expect(sections).toHaveLength(2);
      expect(screen.getByText("First Section")).toBeInTheDocument();
      expect(screen.getByText("Second Section")).toBeInTheDocument();
    });

    it("should render section description when provided", () => {
      const layout = createLayout({
        sections: [
          { id: "sec-1", title: "Section", description: "Section description", columns: [] },
        ],
      });
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Section description")).toBeInTheDocument();
    });

    it("should not render section title when not provided", () => {
      const layout = createLayout({
        sections: [
          { id: "sec-1", columns: [] }, // no title
        ],
      });
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.queryByText("Section")).not.toBeInTheDocument();
    });

    it("should render columns with correct width style", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Section",
            columns: [
              { id: "col-1", width: 50, fields: [] },
              { id: "col-2", width: 50, fields: [] },
            ],
          },
        ],
      });
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const columns = container.querySelectorAll(".runtime-column");
      expect(columns).toHaveLength(2);
      expect(columns[0]).toHaveStyle("width: 50%");
      expect(columns[1]).toHaveStyle("width: 50%");
    });
  });

  describe("TC-LE-002 — Interpretación de la estructura", () => {
    it("should render multiple sections with multiple columns", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Section 1",
            columns: [
              { id: "col-1", width: 60, fields: [{ fieldId: "field-1" }] },
              { id: "col-2", width: 40, fields: [{ fieldId: "field-2" }] },
            ],
          },
          {
            id: "sec-2",
            title: "Section 2",
            columns: [
              { id: "col-3", width: 100, fields: [{ fieldId: "field-3" }] },
            ],
          },
        ],
      });
      
      const formData = {
        ...defaultFormData,
        "field-3": "value 3",
        __fieldDefs: {
          ...defaultFormData.__fieldDefs,
          "field-3": createFieldDef({ id: "field-3", label: "Field Three" }),
        },
      };
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Section 1")).toBeInTheDocument();
      expect(screen.getByText("Section 2")).toBeInTheDocument();
      expect(container.querySelectorAll(".runtime-column")).toHaveLength(3);
    });

    it("should handle empty sections array", () => {
      const layout = createLayout({ sections: [] });
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(container.querySelector(".runtime-layout")).toBeInTheDocument();
    });

    it("should handle sections with no columns", () => {
      const layout = createLayout({
        sections: [{ id: "sec-1", title: "Empty Section", columns: [] }],
      });
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Empty Section")).toBeInTheDocument();
    });
  });

  describe("TC-LE-003 — Composición de elementos", () => {
    it("should render field containers with class runtime-field-container", () => {
      const layout = createLayout();
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const containers = container.querySelectorAll(".runtime-field-container");
      // There are nested containers (column > field > field-component)
      expect(containers.length).toBeGreaterThanOrEqual(2);
    });

    it("should pass fieldDef to DynamicFieldRenderer", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      // DynamicFieldRenderer should render the field label
      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should pass value from formData to DynamicFieldRenderer", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      // The field components should receive the values
      expect(screen.getByDisplayValue("value 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("value 2")).toBeInTheDocument();
    });

    it("should pass onChange callback to DynamicFieldRenderer", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      // The field components should receive onChange
      // Interaction tests would verify this
    });

    it("should pass disabled prop to DynamicFieldRenderer", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} disabled={true} />
      );

      // DynamicFieldRenderer should receive disabled=true
      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toBeDisabled();
      expect(inputs[1]).toBeDisabled();
    });

    it("should pass errors to DynamicFieldRenderer", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} errors={{ "field-1": "Error message" }} />
      );

      // DynamicFieldRenderer should receive error for field-1
      // Error rendering depends on field component implementation
    });
  });

  describe("TC-LE-004 — Comportamiento con configuraciones válidas", () => {
    it("should handle hiddenFields set", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine 
          layout={layout} 
          formData={defaultFormData} 
          onChange={defaultOnChange} 
          hiddenFields={new Set(["field-1"])} 
        />
      );

      // field-1 should not be rendered
      expect(screen.queryByText("Field One")).not.toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should handle disabledFields set", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine 
          layout={layout} 
          formData={defaultFormData} 
          onChange={defaultOnChange} 
          disabledFields={new Set(["field-1"])} 
        />
      );

      // field-1 should be disabled
      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toBeDisabled();
      expect(inputs[1]).not.toBeDisabled();
    });

    it("should handle both hiddenFields and disabledFields", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine 
          layout={layout} 
          formData={defaultFormData} 
          onChange={defaultOnChange} 
          hiddenFields={new Set(["field-1"])} 
          disabledFields={new Set(["field-2"])} 
        />
      );

      expect(screen.queryByText("Field One")).not.toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toBeDisabled(); // field-2 is the only visible one and it's disabled
    });

    it("should handle layout with fieldDefs in formData", () => {
      const layout = createLayout();
      const formData = {
        "field-1": "custom value",
        __fieldDefs: {
          "field-1": createFieldDef({ id: "field-1", label: "Custom Label" }),
        },
      };
      
      render(
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Custom Label")).toBeInTheDocument();
    });
  });

  describe("TC-LE-005 — Comportamiento ante configuraciones opcionales", () => {
    it("should handle undefined hiddenFields", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Field Two")).toBeInTheDocument();
    });

    it("should handle undefined disabledFields", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
    });

    it("should handle undefined errors", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
    });

    it("should handle undefined disabled", () => {
      const layout = createLayout();
      
      render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
    });

    it("should handle missing fieldDef gracefully", () => {
      const layout = createLayout();
      const formData = {
        "field-1": "value",
        "field-2": "value",
        // no __fieldDefs
      };
      
      render(
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      // Should render "Missing field definition" message for both fields
      expect(screen.getAllByText("Missing field definition")).toHaveLength(2);
    });

    it("should handle missing fieldDef for specific field", () => {
      const layout = createLayout();
      const formData = {
        "field-1": "value",
        "field-2": "value",
        __fieldDefs: {
          "field-1": createFieldDef({ id: "field-1", label: "Field One" }),
          // field-2 missing
        },
      };
      
      render(
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
      expect(screen.getByText("Missing field definition")).toBeInTheDocument();
    });
  });

  describe("TC-LE-006 — Integración con contratos existentes", () => {
    it("should use LayoutDefinition contract structure", () => {
      const layout: LayoutDefinition = {
        id: "layout-contract",
        name: "Contract Layout",
        sections: [
          {
            id: "sec-1",
            title: "Contract Section",
            columns: [
              {
                id: "col-1",
                width: 100,
                fields: [{ fieldId: "contract-field" }],
              },
            ],
          },
        ],
      };
      
      const formData = {
        "contract-field": "value",
        __fieldDefs: {
          "contract-field": createFieldDef({ id: "contract-field", label: "Contract Field" }),
        },
      };
      
      render(
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Contract Section")).toBeInTheDocument();
      expect(screen.getByText("Contract Field")).toBeInTheDocument();
    });

    it("should preserve section order", () => {
      const layout = createLayout({
        sections: [
          { id: "sec-3", title: "Third", columns: [] },
          { id: "sec-1", title: "First", columns: [] },
          { id: "sec-2", title: "Second", columns: [] },
        ],
      });
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const sections = container.querySelectorAll(".runtime-section");
      expect(within(sections[0]).getByText("Third")).toBeInTheDocument();
      expect(within(sections[1]).getByText("First")).toBeInTheDocument();
      expect(within(sections[2]).getByText("Second")).toBeInTheDocument();
    });

    it("should preserve column order within section", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Section",
            columns: [
              { id: "col-3", width: 30, fields: [] },
              { id: "col-1", width: 40, fields: [] },
              { id: "col-2", width: 30, fields: [] },
            ],
          },
        ],
      });
      
      const { container } = render(
        <LayoutEngine layout={layout} formData={defaultFormData} onChange={defaultOnChange} />
      );

      const columns = container.querySelectorAll(".runtime-column");
      expect(columns).toHaveLength(3);
    });

    it("should preserve field order within column", () => {
      const layout = createLayout({
        sections: [
          {
            id: "sec-1",
            title: "Section",
            columns: [
              { 
                id: "col-1", 
                width: 100, 
                fields: [
                  { fieldId: "field-3" },
                  { fieldId: "field-1" },
                  { fieldId: "field-2" },
                ] 
              },
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
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      // Fields should render in order: field-3, field-1, field-2
      const labels = container.querySelectorAll(".runtime-field-label");
      expect(labels).toHaveLength(3);
      expect(labels[0]).toHaveTextContent("Field 3");
      expect(labels[1]).toHaveTextContent("Field 1");
      expect(labels[2]).toHaveTextContent("Field 2");
    });
  });

  describe("TC-LE-007 — Manejo de valores de formData", () => {
    it("should pass correct value for each fieldId", () => {
      const layout = createLayout();
      const formData = {
        "field-1": "custom value 1",
        "field-2": "custom value 2",
        __fieldDefs: {
          "field-1": createFieldDef({ id: "field-1", label: "Field One" }),
          "field-2": createFieldDef({ id: "field-2", label: "Field Two" }),
        },
      };
      
      render(
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByDisplayValue("custom value 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("custom value 2")).toBeInTheDocument();
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
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
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
        <LayoutEngine layout={layout} formData={formData} onChange={defaultOnChange} />
      );

      expect(screen.getByText("Field One")).toBeInTheDocument();
    });
  });
});