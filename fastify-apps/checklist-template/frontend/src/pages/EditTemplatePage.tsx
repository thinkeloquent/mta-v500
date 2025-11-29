import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTemplateStore } from "../stores/templateStore";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { buttonClasses } from "../components/ui/Button";
import { DependencyInput } from "../components/ui/DependencyInput";
import type { Step } from "../types/api.types";

interface StepInput extends Omit<Step, 'id' | 'createdAt' | 'updatedAt' | 'templateId'> {
  tempId: string;
}

interface StepState extends StepInput {
  isConfirmed: boolean;
  isDirty: boolean;
}

export function EditTemplatePage() {
  const navigate = useNavigate();
  const { templateId: templateIdParam } = useParams<{ templateId: string }>();
  const { updateTemplate, fetchTemplate, fetchTemplates, selectedTemplate, templates, loading, error } = useTemplateStore();

  const [isLoading, setIsLoading] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [confirmedSteps, setConfirmedSteps] = useState<StepState[]>([]);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // Current step being edited/created
  const [currentStep, setCurrentStep] = useState<StepState>({
    tempId: crypto.randomUUID(),
    stepId: "",
    order: 1,
    title: "",
    description: null,
    required: true,
    tags: [],
    dependencies: [],
    isConfirmed: false,
    isDirty: false,
  });

  const [tagInput, setTagInput] = useState("");
  const [dependencyInput, setDependencyInput] = useState({
    templateId: "",
    stepId: "",
    status: "required" as "options" | "required" | "trigger" | "blocking",
  });

  // Fetch templates for dependency dropdown
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Fetch template on mount
  useEffect(() => {
    const loadTemplate = async () => {
      if (templateIdParam) {
        setIsLoading(true);
        await fetchTemplate(templateIdParam);
        setIsLoading(false);
      }
    };
    loadTemplate();
  }, [templateIdParam, fetchTemplate]);

  // Pre-populate form when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate) {
      setTemplateId(selectedTemplate.templateId);
      setName(selectedTemplate.name);
      setDescription(selectedTemplate.description || "");
      setCategory(selectedTemplate.category);

      // Convert steps to StepState format
      if (selectedTemplate.steps) {
        const stepsWithState: StepState[] = selectedTemplate.steps.map((step, index) => ({
          tempId: crypto.randomUUID(),
          stepId: step.stepId,
          order: step.order || index + 1,
          title: step.title,
          description: step.description,
          required: step.required,
          tags: step.tags || [],
          dependencies: step.dependencies || [],
          isConfirmed: true,
          isDirty: false,
        }));
        setConfirmedSteps(stepsWithState);
        setCurrentStep({
          tempId: crypto.randomUUID(),
          stepId: "",
          order: stepsWithState.length + 1,
          title: "",
          description: null,
          required: true,
          tags: [],
          dependencies: [],
          isConfirmed: false,
          isDirty: false,
        });
      }
    }
  }, [selectedTemplate]);

  const handleCurrentStepChange = (field: keyof StepInput, value: any) => {
    setCurrentStep((prev) => ({ ...prev, [field]: value, isDirty: true }));
  };

  const handleAddOrUpdateStep = () => {
    if (!currentStep.stepId.trim() || !currentStep.title.trim()) {
      alert("Step ID and Title are required");
      return;
    }

    if (editingStepId) {
      // Update existing step
      setConfirmedSteps(
        confirmedSteps.map((step) =>
          step.tempId === editingStepId
            ? { ...currentStep, isConfirmed: true, isDirty: false }
            : step
        )
      );
      setEditingStepId(null);
    } else {
      // Add new step
      setConfirmedSteps([
        ...confirmedSteps,
        { ...currentStep, isConfirmed: true, isDirty: false },
      ]);
    }

    // Reset to new empty step
    setCurrentStep({
      tempId: crypto.randomUUID(),
      stepId: "",
      order: confirmedSteps.length + 2,
      title: "",
      description: null,
      required: true,
      tags: [],
      dependencies: [],
      isConfirmed: false,
      isDirty: false,
    });
    setTagInput("");
    setDependencyInput({ templateId: "", stepId: "", status: "required" });
  };

  const handleEditStep = (stepId: string) => {
    const stepToEdit = confirmedSteps.find((step) => step.tempId === stepId);
    if (stepToEdit) {
      setCurrentStep({ ...stepToEdit, isDirty: false });
      setEditingStepId(stepId);
      setTagInput("");
    }
  };

  const handleDeleteStep = (stepId: string) => {
    const filtered = confirmedSteps.filter((step) => step.tempId !== stepId);
    const reordered = filtered.map((step, index) => ({
      ...step,
      order: index + 1,
    }));
    setConfirmedSteps(reordered);

    // Update current step order if needed
    if (!editingStepId) {
      setCurrentStep((prev) => ({ ...prev, order: reordered.length + 1 }));
    }
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
    setCurrentStep({
      tempId: crypto.randomUUID(),
      stepId: "",
      order: confirmedSteps.length + 1,
      title: "",
      description: null,
      required: true,
      tags: [],
      dependencies: [],
      isConfirmed: false,
      isDirty: false,
    });
    setTagInput("");
    setDependencyInput({ templateId: "", stepId: "", status: "required" });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;

    if (!currentStep.tags.includes(tag)) {
      handleCurrentStepChange("tags", [...currentStep.tags, tag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleCurrentStepChange(
      "tags",
      currentStep.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleAddDependency = () => {
    const templateId = dependencyInput.templateId.trim();
    const stepId = dependencyInput.stepId.trim();
    const status = dependencyInput.status;

    if (!templateId || !stepId) {
      alert("Template ID and Step ID are required for dependency");
      return;
    }

    const dependency = `${templateId}.${stepId}[${status}]`;

    if (currentStep.dependencies.includes(dependency)) {
      alert("This dependency already exists");
      return;
    }

    handleCurrentStepChange("dependencies", [...currentStep.dependencies, dependency]);
    setDependencyInput({ templateId: "", stepId: "", status: "required" });
  };

  const handleRemoveDependency = (dependencyToRemove: string) => {
    handleCurrentStepChange(
      "dependencies",
      currentStep.dependencies.filter((dep) => dep !== dependencyToRemove)
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!templateId.trim() || !name.trim() || !category.trim()) {
      alert("Please fill in all required template fields");
      return;
    }

    if (confirmedSteps.length === 0) {
      alert("Please add at least one step");
      return;
    }

    const stepsData = confirmedSteps.map(({ tempId, isConfirmed, isDirty, ...step }) => step);

    const template = await updateTemplate(templateIdParam!, {
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim(),
      steps: stepsData,
    });

    if (template) {
      navigate(`/templates/${template.templateId}`);
    }
  };

  const isEditing = editingStepId !== null;
  const showAddUpdateButton = currentStep.stepId.trim() || currentStep.title.trim() || currentStep.isDirty;

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block size-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-sm text-neutral-500">Loading template...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Templates"
        title="Edit template"
        description="Define a reusable checklist blueprint with steps, metadata, and parameters."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card
          title="Template information"
          description="Basic details that identify and describe this template."
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-900">
                Template ID *
              </label>
              <input
                type="text"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                required
                disabled
                placeholder="e.g., client-onboarding-v1"
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Unique identifier for this template (lowercase, hyphens allowed)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-900">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Client Onboarding"
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-900">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-900">
                Category *
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                placeholder="e.g., Onboarding, Deployment, Security"
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </Card>

        <Card
          title="Steps"
          description="Define the individual tasks that make up this template. Add each step one at a time."
        >
          <div className="space-y-6">
            {/* Confirmed Steps List */}
            {confirmedSteps.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-900">
                  Added Steps ({confirmedSteps.length})
                </h4>
                {confirmedSteps.map((step, index) => (
                  <div
                    key={step.tempId}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex size-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-neutral-900">{step.title}</p>
                          <p className="text-xs text-neutral-500">
                            ID: {step.stepId}
                            {step.required && (
                              <span className="ml-2 text-indigo-600">• Required</span>
                            )}
                            {step.tags?.length > 0 && (
                              <span className="ml-2">
                                • Tags: {step.tags.join(", ")}
                              </span>
                            )}
                            {step.dependencies?.length > 0 && (
                              <span className="ml-2">
                                • Dependencies: {step.dependencies.length}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditStep(step.tempId)}
                        className={buttonClasses({
                          variant: "ghost",
                          size: "sm",
                          className: "border border-neutral-200",
                        })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(step.tempId)}
                        className={buttonClasses({
                          variant: "danger",
                          size: "sm",
                        })}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Step Editor */}
            <div className="space-y-3 rounded-lg border-2 border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900">
                  {isEditing ? `Editing Step ${editingStepId ? confirmedSteps.findIndex(s => s.tempId === editingStepId) + 1 : ''}` : `New Step (${confirmedSteps.length + 1})`}
                </h4>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={buttonClasses({
                      variant: "ghost",
                      size: "sm",
                    })}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Step ID *
                  </label>
                  <input
                    type="text"
                    value={currentStep.stepId}
                    onChange={(e) =>
                      handleCurrentStepChange("stepId", e.target.value)
                    }
                    placeholder="e.g., verify-email"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={currentStep.title}
                    onChange={(e) =>
                      handleCurrentStepChange("title", e.target.value)
                    }
                    placeholder="e.g., Verify email address"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">
                  Description
                </label>
                <textarea
                  value={currentStep.description || ""}
                  onChange={(e) =>
                    handleCurrentStepChange(
                      "description",
                      e.target.value || null
                    )
                  }
                  placeholder="Additional details about this step..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={currentStep.required}
                    onChange={(e) =>
                      handleCurrentStepChange("required", e.target.checked)
                    }
                    className="size-4 rounded border-neutral-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-neutral-700">Required step</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Tags</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag..."
                    className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className={buttonClasses({
                      variant: "ghost",
                      size: "sm",
                      className: "border border-neutral-200",
                    })}
                  >
                    Add
                  </button>
                </div>
                {currentStep.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentStep.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs text-indigo-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-indigo-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <DependencyInput
                templates={templates}
                dependencies={currentStep.dependencies}
                onAddDependency={handleAddDependency}
                onRemoveDependency={handleRemoveDependency}
                dependencyInput={dependencyInput}
                onDependencyInputChange={setDependencyInput}
              />

              {showAddUpdateButton && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateStep}
                    className={buttonClasses({
                      variant: isEditing ? "primary" : "success",
                      size: "md",
                    })}
                  >
                    {isEditing ? "Update step" : "Add step"}
                  </button>
                </div>
              )}
            </div>

            {confirmedSteps.length === 0 && !showAddUpdateButton && (
              <p className="text-sm italic text-neutral-500">
                No steps added yet. Fill in the fields above and click "Add step" to begin building your template.
              </p>
            )}
          </div>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={loading || confirmedSteps.length === 0}
            className={buttonClasses({
              variant: "success",
              size: "lg",
              className: "min-w-[200px] disabled:cursor-not-allowed disabled:opacity-50",
            })}
          >
            {loading ? "Updating..." : "Update template"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/templates/${templateIdParam}`)}
            className={buttonClasses({
              variant: "ghost",
              size: "lg",
            })}
          >
            Cancel
          </button>
        </div>
      </form>
    </PageShell>
  );
}
