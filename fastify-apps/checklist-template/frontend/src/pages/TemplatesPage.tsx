import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTemplateStore } from "../stores/templateStore";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { buttonClasses } from "../components/ui/Button";
import { cn } from "../utils/cn";

export function TemplatesPage() {
  const { templates, loading, error, fetchTemplates } = useTemplateStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  if (loading) {
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

  if (error) {
    return (
      <PageShell>
        <EmptyState
          icon="⚠️"
          title="We hit a snag loading templates"
          description={error}
          actions={
            <button
              type="button"
              onClick={() => fetchTemplates()}
              className={buttonClasses({ variant: "secondary" })}
            >
              Retry
            </button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Template catalogue"
        title="Build reusable blueprints for every process"
        description="Organise your best practices into structured templates so teams can launch work with full context."
        actions={
          <Link
            to="/templates/new"
            className={buttonClasses({ variant: "primary", size: "md" })}
          >
            Create template
          </Link>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon="✨"
          title="No templates yet"
          description="Start by capturing a process you run often—steps, metadata, and required context. You can refine it later."
          actions={
            <Link
              to="/templates/new"
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              Design first template
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              to={`/templates/${template.templateId}`}
              className="group rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex h-full flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-600">
                      Template
                    </span>
                    <h3 className="mt-3 text-xl font-semibold text-neutral-900 transition group-hover:text-indigo-700">
                      {template.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    v{template.version}
                  </span>
                </div>
                <p className="text-sm text-neutral-600">
                  {template.description || "No description provided yet."}
                </p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    {template.category}
                  </span>
                  <span className="inline-flex items-center gap-2 text-neutral-600">
                    <span className="size-2 rounded-full bg-indigo-500" />
                    {template.steps?.length || 0} steps
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
