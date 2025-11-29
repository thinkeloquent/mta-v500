import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTemplateStore } from "../stores/templateStore";
import { useChecklistStore } from "../stores/checklistStore";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { buttonClasses } from "../components/ui/Button";

interface Parameter {
  id: string;
  key: string;
  value: string;
}

export function GenerateChecklistPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTemplateId = searchParams.get("templateId");

  const { templates, loading: templatesLoading, fetchTemplates } =
    useTemplateStore();
  const { generateChecklist, loading: generating, error } =
    useChecklistStore();

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    preselectedTemplateId || "",
  );
  const [confirmedParameters, setConfirmedParameters] = useState<Parameter[]>([]);
  const [editingParameterId, setEditingParameterId] = useState<string | null>(null);
  const [currentParameter, setCurrentParameter] = useState({
    key: "",
    value: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (preselectedTemplateId) {
      setSelectedTemplateId(preselectedTemplateId);
    }
  }, [preselectedTemplateId]);

  useEffect(() => {
    if (!templatesLoading && templates.length === 0) {
      alert("No templates found. Please create a template first.");
      navigate("/templates/new");
    }
  }, [templatesLoading, templates.length, navigate]);

  const handleAddOrUpdateParameter = () => {
    const key = currentParameter.key.trim();
    const value = currentParameter.value.trim();

    if (!key) {
      alert("Parameter name is required");
      return;
    }

    if (editingParameterId) {
      // Update existing parameter
      setConfirmedParameters(
        confirmedParameters.map((param) =>
          param.id === editingParameterId
            ? { ...param, key, value }
            : param
        )
      );
      setEditingParameterId(null);
    } else {
      // Check for duplicate keys
      if (confirmedParameters.some((param) => param.key === key)) {
        alert("A parameter with this name already exists");
        return;
      }
      // Add new parameter
      setConfirmedParameters([
        ...confirmedParameters,
        { id: crypto.randomUUID(), key, value },
      ]);
    }

    // Reset current parameter
    setCurrentParameter({ key: "", value: "" });
  };

  const handleEditParameter = (id: string) => {
    const param = confirmedParameters.find((p) => p.id === id);
    if (param) {
      setCurrentParameter({ key: param.key, value: param.value });
      setEditingParameterId(id);
    }
  };

  const handleDeleteParameter = (id: string) => {
    setConfirmedParameters(confirmedParameters.filter((p) => p.id !== id));
  };

  const handleCancelEdit = () => {
    setEditingParameterId(null);
    setCurrentParameter({ key: "", value: "" });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedTemplateId) {
      alert("Please select a template");
      return;
    }

    const parameters = Object.fromEntries(
      confirmedParameters.map((param) => [param.key, param.value])
    );

    const checklist = await generateChecklist({
      templateId: selectedTemplateId,
      parameters,
    });

    if (checklist) {
      navigate(`/checklists/${checklist.checklistId}`);
    }
  };

  if (templatesLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm text-neutral-700 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-indigo-600" />
            </span>
            Loading templates…
          </div>
        </div>
      </PageShell>
    );
  }

  const selectedTemplate = templates.find(
    (template) => template.templateId === selectedTemplateId,
  );

  const isEditing = editingParameterId !== null;
  const showAddUpdateButton = currentParameter.key.trim() || currentParameter.value.trim();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Generator"
        title="Spin up a tailored checklist"
        description="Choose a template, enrich it with contextual parameters, and we'll produce a ready-to-run checklist in seconds."
        actions={
          selectedTemplate ? (
            <div className="rounded-full border border-neutral-200 bg-neutral-100 px-4 py-1 text-xs uppercase tracking-wide text-neutral-600">
              {selectedTemplate.steps?.length || 0} steps · v{selectedTemplate.version}
            </div>
          ) : null
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card
          title="Template selection"
          description="Pick the blueprint you want to instantiate."
        >
          <div className="space-y-4">
            <label className="text-sm font-medium text-neutral-900">
              Select template *
            </label>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              required
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a template…</option>
              {templates.map((template) => (
                <option key={template.id} value={template.templateId}>
                  {template.name} (v{template.version}) · {template.steps?.length || 0}{" "}
                  steps
                </option>
              ))}
            </select>
            {selectedTemplate ? (
              <p className="text-sm text-neutral-600">
                {selectedTemplate.description ||
                  "This template does not have a description yet."}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                Templates capture your playbooks. Select one to reveal its
                description and metrics.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="Parameterise the run"
          description="Parameters let you inject client names, deadlines, environments, and any tokens your steps reference."
        >
          <div className="space-y-6">
            <p className="text-sm text-neutral-600">
              Use &#123;&#123;ParameterName&#125;&#125; inside steps to pull in the
              value supplied here.
            </p>

            {/* Confirmed Parameters List */}
            {confirmedParameters.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-neutral-900">
                  Added Parameters ({confirmedParameters.length})
                </h4>
                {confirmedParameters.map((param) => (
                  <div
                    key={param.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        &#123;&#123;{param.key}&#125;&#125;
                      </p>
                      <p className="text-sm text-neutral-600">{param.value || "(empty)"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditParameter(param.id)}
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
                        onClick={() => handleDeleteParameter(param.id)}
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

            {/* Current Parameter Editor */}
            <div className="space-y-3 rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-neutral-900">
                  {isEditing ? "Edit Parameter" : "New Parameter"}
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
                    Parameter name *
                  </label>
                  <input
                    type="text"
                    value={currentParameter.key}
                    onChange={(e) =>
                      setCurrentParameter({ ...currentParameter, key: e.target.value })
                    }
                    placeholder="e.g., ClientName, Environment"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-700">
                    Value
                  </label>
                  <input
                    type="text"
                    value={currentParameter.value}
                    onChange={(e) =>
                      setCurrentParameter({ ...currentParameter, value: e.target.value })
                    }
                    placeholder="e.g., Acme Corp, Production"
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {showAddUpdateButton && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateParameter}
                    className={buttonClasses({
                      variant: isEditing ? "primary" : "success",
                      size: "md",
                    })}
                  >
                    {isEditing ? "Update" : "Add"}
                  </button>
                </div>
              )}
            </div>

            {confirmedParameters.length === 0 && !showAddUpdateButton && (
              <p className="text-sm italic text-neutral-500">
                No parameters yet—add one if the checklist should adapt to run-time context.
              </p>
            )}
          </div>
        </Card>

        {error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={generating || !selectedTemplateId}
            className={buttonClasses({
              variant: "success",
              size: "lg",
              className: "min-w-[200px] disabled:cursor-not-allowed",
            })}
          >
            {generating ? "Generating…" : "Generate checklist"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/checklists")}
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
