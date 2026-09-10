import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { ComponentRegistry } from "./registry/ComponentRegistry";
import type { FieldDefinition, FieldRenderProps } from "./registry/ComponentRegistryBase";
import type { RuntimeFieldType } from "../../types/runtimeContracts";

describe("DynamicFieldRenderer", () => {
  const createFieldDef = (overrides: Partial<FieldDefinition> = {}): FieldDefinition => ({
    id: overrides.id ?? "field-1",
    name: overrides.name ?? "test_field",
    label: overrides.label ?? "Test Field",
    required: overrides.required ?? false,
    fieldType: (overrides.fieldType as RuntimeFieldType) ?? "text",
    options: overrides.options ?? {},
  });

  const createRenderProps = (overrides: Partial<FieldRenderProps> = {}): FieldRenderProps => ({
    fieldDef: overrides.fieldDef ?? createFieldDef(),
    value: overrides.value ?? "",
    onChange: overrides.onChange ?? vi.fn(),
    disabled: overrides.disabled ?? false,
    error: overrides.error,
  });

  afterEach(() => {
    cleanup();
  });

  describe("TC-DFR-001 — Resolución del tipo de campo", () => {
    it("should resolve text field type from registry", () => {
      const fieldDef = createFieldDef({ fieldType: "text", label: "Text Field" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("Text Field")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should resolve textarea field type from registry", () => {
      const fieldDef = createFieldDef({ fieldType: "textarea", label: "Textarea Field" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("Textarea Field")).toBeInTheDocument();
      expect(screen.getByRole("textbox", { multiline: true })).toBeInTheDocument();
    });

    it("should resolve number field type from registry", () => {
      const fieldDef = createFieldDef({ fieldType: "number", label: "Number Field" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("Number Field")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });

    it("should resolve select field type from registry", () => {
      const fieldDef = createFieldDef({ 
        fieldType: "select", 
        label: "Select Field",
        options: { choices: ["a", "b", "c"] }
      });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("Select Field")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should resolve checkbox field type from registry", () => {
      const fieldDef = createFieldDef({ fieldType: "checkbox", label: "Checkbox Field" });
      const props = createRenderProps({ fieldDef, value: false });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("Checkbox Field")).toBeInTheDocument();
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("should resolve multiselect field type from registry", () => {
      const fieldDef = createFieldDef({ 
        fieldType: "multiselect", 
        label: "Multiselect Field",
        options: { choices: ["a", "b", "c"] }
      });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("Multiselect Field")).toBeInTheDocument();
    });

    it("should resolve file_upload field type from registry", () => {
      const fieldDef = createFieldDef({ fieldType: "file_upload", label: "File Upload" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("File Upload")).toBeInTheDocument();
    });

    it("should resolve informative field type from registry", () => {
      const fieldDef = createFieldDef({ fieldType: "informative", label: "Info" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Info")).toBeInTheDocument();
    });

    it("should render fallback for radio (non-labellable)", () => {
      const fieldDef = createFieldDef({ fieldType: "radio", label: "Radio Field" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Radio Field")).toBeInTheDocument();
    });

    it("should render fallback for signature (non-labellable)", () => {
      const fieldDef = createFieldDef({ fieldType: "signature", label: "Signature" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Signature")).toBeInTheDocument();
    });

    it("should render fallback for calculated (non-labellable)", () => {
      const fieldDef = createFieldDef({ fieldType: "calculated", label: "Calculated" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Calculated")).toBeInTheDocument();
    });

    it("should render fallback for workflow_status (non-labellable)", () => {
      const fieldDef = createFieldDef({ fieldType: "workflow_status", label: "Workflow Status" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Workflow Status")).toBeInTheDocument();
    });

    it("should render fallback for table (non-labellable)", () => {
      const fieldDef = createFieldDef({ fieldType: "table", label: "Table" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Table")).toBeInTheDocument();
    });
  });

  describe("TC-DFR-002 — Interacción con ComponentRegistry", () => {
    it("should use ComponentRegistry.get to resolve component", () => {
      const spy = vi.spyOn(ComponentRegistry, "get");
      const fieldDef = createFieldDef({ fieldType: "text", label: "Test" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(spy).toHaveBeenCalledWith("text");
    });

    it("should use registered component for field type", () => {
      const customType = "custom-field-type" as RuntimeFieldType;
      const customComponent = vi.fn((props: FieldRenderProps) => <div data-testid="custom">Custom: {props.fieldDef.label}</div>);
      
      ComponentRegistry.register(customType, customComponent);

      const fieldDef = createFieldDef({ fieldType: customType, label: "Custom" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByTestId("custom")).toHaveTextContent("Custom: Custom");
      expect(customComponent).toHaveBeenCalled();
    });

    it("should return undefined for unregistered field type", () => {
      const unregisteredType = "unregistered-type" as RuntimeFieldType;
      const fieldDef = createFieldDef({ fieldType: unregisteredType, label: "Unregistered" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      // Should render fallback
      expect(screen.getByText("Unsupported field type: unregistered-type")).toBeInTheDocument();
    });
  });

  describe("TC-DFR-003 — Renderizado del componente correspondiente", () => {
    it("should render field label", () => {
      const fieldDef = createFieldDef({ label: "My Custom Label" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByLabelText("My Custom Label")).toBeInTheDocument();
    });

    it("should render field value", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, value: "test value" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByDisplayValue("test value")).toBeInTheDocument();
    });

    it("should render disabled state", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, disabled: true });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should render error message", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, error: "Validation error" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Validation error")).toBeInTheDocument();
    });

    it("should call onChange when value changes", () => {
      const onChange = vi.fn();
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, onChange });

      render(<DynamicFieldRenderer {...props} />);

      const input = screen.getByRole("textbox");
      act(() => {
        fireEvent.change(input, { target: { value: "new value" } });
      });

      expect(onChange).toHaveBeenCalledWith("field-1", "new value");
    });

    it("should call onChange with fieldId and new value", () => {
      const onChange = vi.fn();
      const fieldDef = createFieldDef({ id: "custom-id", fieldType: "text" });
      const props = createRenderProps({ fieldDef, onChange });

      render(<DynamicFieldRenderer {...props} />);

      const input = screen.getByRole("textbox");
      act(() => {
        fireEvent.change(input, { target: { value: "updated" } });
      });

      expect(onChange).toHaveBeenCalledWith("custom-id", "updated");
    });
  });

  describe("TC-DFR-004 — Transmisión de propiedades", () => {
    it("should pass fieldDef to component", () => {
      const fieldDef = createFieldDef({ 
        id: "test-id", 
        name: "test_name", 
        label: "Test Label",
        required: true,
        fieldType: "text",
        options: { placeholder: "Enter text" }
      });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "Enter text");
    });

    it("should pass value to component", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, value: "initial value" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByDisplayValue("initial value")).toBeInTheDocument();
    });

    it("should pass onChange to component", () => {
      const onChange = vi.fn();
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, onChange });

      render(<DynamicFieldRenderer {...props} />);

      const input = screen.getByRole("textbox");
      act(() => {
        fireEvent.change(input, { target: { value: "changed" } });
      });

      expect(onChange).toHaveBeenCalled();
    });

    it("should pass disabled to component", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, disabled: true });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("should pass error to component", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, error: "Error message" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Error message")).toBeInTheDocument();
    });

    it("should pass required to component", () => {
      const fieldDef = createFieldDef({ fieldType: "text", required: true });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("should pass options to component", () => {
      const fieldDef = createFieldDef({ 
        fieldType: "number", 
        options: { min: 0, max: 100 }
      });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
    });
  });

  describe("TC-DFR-005 — Campos requeridos/opcionales", () => {
    it("should handle required field", () => {
      const fieldDef = createFieldDef({ fieldType: "text", required: true });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("should handle optional field", () => {
      const fieldDef = createFieldDef({ fieldType: "text", required: false });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("textbox")).not.toBeRequired();
    });

    it("should handle field with hidden=true", () => {
      const fieldDef = createFieldDef({ fieldType: "text", hidden: true });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should handle field with readonly=true", () => {
      const fieldDef = createFieldDef({ fieldType: "text", readonly: true });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("TC-DFR-006 — Valores iniciales/defaults", () => {
    it("should render empty string for text field by default", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, value: "" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByDisplayValue("")).toBeInTheDocument();
    });

    it("should render empty string for number field by default", () => {
      const fieldDef = createFieldDef({ fieldType: "number" });
      const props = createRenderProps({ fieldDef, value: "" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByDisplayValue("")).toBeInTheDocument();
    });

    it("should render boolean field (falls back to unsupported)", () => {
      const fieldDef = createFieldDef({ fieldType: "boolean" });
      const props = createRenderProps({ fieldDef, value: false });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Unsupported field type: boolean")).toBeInTheDocument();
    });

    it("should render table field", () => {
      const fieldDef = createFieldDef({ fieldType: "table", label: "Table" });
      const props = createRenderProps({ fieldDef, value: [] });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Table")).toBeInTheDocument();
    });

    it("should use provided initial value", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      const props = createRenderProps({ fieldDef, value: "pre-filled" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByDisplayValue("pre-filled")).toBeInTheDocument();
    });
  });

  describe("TC-DFR-007 — Comportamiento de tipos soportados", () => {
    it("should render select with choices", () => {
      const fieldDef = createFieldDef({ 
        fieldType: "select", 
        options: { choices: ["Option A", "Option B"] }
      });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
    });

    it("should render checkbox with correct checked state", () => {
      const fieldDef = createFieldDef({ fieldType: "checkbox" });
      const props = createRenderProps({ fieldDef, value: true });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("should render textarea with correct value", () => {
      const fieldDef = createFieldDef({ fieldType: "textarea" });
      const props = createRenderProps({ fieldDef, value: "Multi\nline\ntext" });

      render(<DynamicFieldRenderer {...props} />);

      const textarea = screen.getByRole("textbox", { multiline: true });
      expect(textarea).toHaveValue("Multi\nline\ntext");
    });
  });

  describe("TC-DFR-008 — Manejo controlado de tipos/configuraciones inválidas", () => {
    it("should render fallback for unsupported field type", () => {
      const fieldDef = createFieldDef({ fieldType: "unsupported-type" as RuntimeFieldType, label: "Unsupported" });
      const props = createRenderProps({ fieldDef });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Unsupported field type: unsupported-type")).toBeInTheDocument();
      expect(screen.getByText("Unsupported")).toBeInTheDocument();
    });

    it("should show error in fallback when error provided", () => {
      const fieldDef = createFieldDef({ fieldType: "unsupported-type" as RuntimeFieldType, label: "Unsupported" });
      const props = createRenderProps({ fieldDef, error: "Custom error" });

      render(<DynamicFieldRenderer {...props} />);

      expect(screen.getByText("Custom error")).toBeInTheDocument();
    });

    it("should not throw for unregistered field type", () => {
      const fieldDef = createFieldDef({ fieldType: "unknown" as RuntimeFieldType });
      const props = createRenderProps({ fieldDef });

      expect(() => {
        render(<DynamicFieldRenderer {...props} />);
      }).not.toThrow();
    });

    it("should handle fieldDef with missing required properties", () => {
      const fieldDef = { 
        id: "minimal", 
        name: "minimal", 
        label: "Minimal", 
        required: false, 
        fieldType: "text" as RuntimeFieldType, 
        options: {} 
      };
      const props = createRenderProps({ fieldDef });

      expect(() => {
        render(<DynamicFieldRenderer {...props} />);
      }).not.toThrow();
    });
  });

  describe("TC-DFR-009 — Determinismo", () => {
    it("should render same component for same field type", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      
      const { unmount } = render(<DynamicFieldRenderer {...createRenderProps({ fieldDef })} />);
      unmount();
      
      const { unmount: unmount2 } = render(<DynamicFieldRenderer {...createRenderProps({ fieldDef })} />);
      unmount2();

      expect(ComponentRegistry.get("text")).toBeDefined();
    });

    it("should consistently resolve component from registry", () => {
      const fieldDef = createFieldDef({ fieldType: "text" });
      
      const { unmount, container } = render(<DynamicFieldRenderer {...createRenderProps({ fieldDef })} />);
      
      expect(container.querySelector("input")).toBeInTheDocument();
      unmount();
    });
  });
});