import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTemplateStore } from "../stores/templateStore";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { buttonClasses } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { JsonViewer } from "../components/ui/JsonViewer";
import { cn } from "../utils/cn";

export function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { selectedTemplate, loading, error, fetchTemplate } = useTemplateStore();
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (templateId) {
      fetchTemplate(templateId);
    }
  }, [templateId, fetchTemplate]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm text-neutral-700 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-indigo-600" />
            </span>
            Loading template…
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <EmptyState
          icon="⚠️"
          title="Unable to load template"
          description={error}
          actions={
            <Link
              to="/templates"
              className={buttonClasses({ variant: "secondary" })}
            >
              Back to templates
            </Link>
          }
        />
      </PageShell>
    );
  }

  if (!selectedTemplate) {
    return (
      <PageShell>
        <EmptyState
          icon="🕵️"
          title="Template not found"
          description="The template you are looking for might have been archived or removed."
          actions={
            <Link
              to="/templates"
              className={buttonClasses({ variant: "secondary" })}
            >
              View templates
            </Link>
          }
        />
      </PageShell>
    );
  }

  const createdAt = new Date(selectedTemplate.createdAt).toLocaleString();
  const updatedAt = new Date(selectedTemplate.updatedAt).toLocaleString();

  return (
    <PageShell>
      <Link
        to="/templates"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-700"
      >
        <span aria-hidden>←</span> Back to templates
      </Link>

      <PageHeader
        eyebrow="Template overview"
        title={selectedTemplate.name}
        description={
          selectedTemplate.description ||
          "This template has no description yet. Add one to share context with your team."
        }
        actions={
          <>
            <Link
              to={`/checklists/generate?templateId=${selectedTemplate.templateId}`}
              className={buttonClasses({ variant: "success", size: "md" })}
            >
              Generate checklist
            </Link>
            <button
              type="button"
              onClick={() => navigate(`/templates/${templateId}/edit`)}
              className={buttonClasses({ variant: "secondary", size: "md" })}
            >
              Edit template
            </button>
          </>
        }
      />

      <Tabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          {
            id: "details",
            label: "Details",
            content: (
              <>
                <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Template metadata"
          description="Key details about this template and its lifecycle."
          className="lg:col-span-2"
        >
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Template ID
              </dt>
              <dd className="mt-1 font-mono text-sm text-neutral-900">
                {selectedTemplate.templateId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Category
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">
                {selectedTemplate.category}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Created
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">{createdAt}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Last updated
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">{updatedAt}</dd>
            </div>
          </dl>
        </Card>
        <Card
          title="Stats"
          description="At-a-glance metrics"
          className="flex flex-col justify-center"
        >
          <div className="flex items-center gap-6">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
              <div className="text-3xl font-semibold text-indigo-600">
                {selectedTemplate.steps?.length || 0}
              </div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                steps
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
              <div className="text-3xl font-semibold text-indigo-600">
                v{selectedTemplate.version}
              </div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                version
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Workflow steps"
        description="Every step included in this checklist template."
      >
        <ol className="space-y-4">
          {selectedTemplate.steps?.map((step, index) => (
            <li
              key={step.id || `${step.stepId}-${step.order}-${index}`}
              className="rounded-lg border border-neutral-200 bg-white p-6 transition hover:border-indigo-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-indigo-100 text-lg font-semibold text-indigo-700">
                  {step.order}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {step.title}
                    </h3>
                    {step.required ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                        <span className="size-2 rounded-full bg-red-500" />
                        Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-600">
                        Optional
                      </span>
                    )}
                  </div>
                  {step.description ? (
                    <p className="text-sm text-neutral-600">{step.description}</p>
                  ) : null}
                  {step.tags && step.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {step.tags.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs uppercase tracking-wide text-neutral-600 transition hover:border-indigo-300 hover:text-indigo-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
              </>
            ),
          },
          {
            id: "json",
            label: "JSON",
            content: (
              <JsonViewer
                data={selectedTemplate}
                filename={`template-${selectedTemplate.templateId}`}
              />
            ),
          },
        ]}
      />
    </PageShell>
  );
}
