import { useMemo } from "react";
import { SearchableSelect } from "./SearchableSelect";
import type { SearchableOption } from "./SearchableSelect";
import { buttonClasses } from "./Button";
import type { Template } from "../../types/api.types";

interface DependencyInputProps {
  templates: Template[];
  dependencies: string[];
  onAddDependency: (dependency: string) => void;
  onRemoveDependency: (dependency: string) => void;
  dependencyInput: {
    templateId: string;
    stepId: string;
    status: "options" | "required" | "trigger" | "blocking";
  };
  onDependencyInputChange: (input: {
    templateId: string;
    stepId: string;
    status: "options" | "required" | "trigger" | "blocking";
  }) => void;
}

export function DependencyInput({
  templates,
  dependencies,
  onAddDependency,
  onRemoveDependency,
  dependencyInput,
  onDependencyInputChange,
}: DependencyInputProps) {
  // Convert templates to SearchableOptions
  const templateOptions = useMemo<SearchableOption[]>(
    () =>
      templates.map((template) => ({
        value: template.templateId,
        label: template.name,
        subLabel: template.templateId,
      })),
    [templates]
  );

  // Get steps from selected template
  const selectedTemplate = templates.find(
    (t) => t.templateId === dependencyInput.templateId
  );
  const stepOptions = useMemo<SearchableOption[]>(
    () =>
      selectedTemplate?.steps?.map((step) => ({
        value: step.stepId,
        label: step.title,
        subLabel: step.stepId,
      })) || [],
    [selectedTemplate]
  );

  const handleAddClick = () => {
    const templateId = dependencyInput.templateId.trim();
    const stepId = dependencyInput.stepId.trim();
    const status = dependencyInput.status;

    if (!templateId || !stepId) {
      alert("Template ID and Step ID are required for dependency");
      return;
    }

    const dependency = `${templateId}.${stepId}[${status}]`;

    if (dependencies.includes(dependency)) {
      alert("This dependency already exists");
      return;
    }

    onAddDependency(dependency);
  };

  return (
    <div>
      <label className="text-xs font-medium text-neutral-700">
        Dependencies
      </label>
      <p className="mt-1 text-xs text-neutral-500">
        Specify steps from other templates that this step depends on
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <SearchableSelect
          value={dependencyInput.templateId}
          onChange={(value) =>
            onDependencyInputChange({
              ...dependencyInput,
              templateId: value,
              stepId: "", // Reset step when template changes
            })
          }
          options={templateOptions}
          placeholder="Select template..."
        />
        <SearchableSelect
          value={dependencyInput.stepId}
          onChange={(value) =>
            onDependencyInputChange({
              ...dependencyInput,
              stepId: value,
            })
          }
          options={stepOptions}
          placeholder="Select step..."
          disabled={!dependencyInput.templateId}
        />
        <select
          value={dependencyInput.status}
          onChange={(e) =>
            onDependencyInputChange({
              ...dependencyInput,
              status: e.target.value as "options" | "required" | "trigger" | "blocking",
            })
          }
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="required">Required</option>
          <option value="options">Options</option>
          <option value="trigger">Trigger</option>
          <option value="blocking">Blocking</option>
        </select>
        <button
          type="button"
          onClick={handleAddClick}
          className={buttonClasses({
            variant: "ghost",
            size: "sm",
            className: "border border-neutral-200",
          })}
        >
          Add
        </button>
      </div>
      {dependencies.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {dependencies.map((dependency) => (
            <span
              key={dependency}
              className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700"
            >
              {dependency}
              <button
                type="button"
                onClick={() => onRemoveDependency(dependency)}
                className="hover:text-purple-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
