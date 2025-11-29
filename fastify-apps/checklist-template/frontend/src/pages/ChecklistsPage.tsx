import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useChecklistStore } from "../stores/checklistStore";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { buttonClasses } from "../components/ui/Button";
import { cn } from "../utils/cn";

export function ChecklistsPage() {
  const { checklists, loading, error, fetchChecklists } = useChecklistStore();

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm text-neutral-700 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            Loading checklists…
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
          title="Unable to load checklists"
          description={error}
          actions={
            <button
              type="button"
              onClick={() => fetchChecklists()}
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
        eyebrow="Live checklists"
        title="Monitor checklist execution across teams"
        description="Track every generated checklist, drill into their context, and follow their progress from creation to completion."
        actions={
          <Link
            to="/checklists/generate"
            className={buttonClasses({ variant: "success", size: "md" })}
          >
            Generate checklist
          </Link>
        }
      />

      {checklists.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No checklists yet"
          description="Spin up your first checklist from a template to kick off a workflow. Parameters keep it personalised for your use case."
          actions={
            <Link
              to="/checklists/generate"
              className={buttonClasses({ variant: "success", size: "md" })}
            >
              Generate from template
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {checklists.map((checklist) => {
            const parameterCount = checklist.metadata?.parameters
              ? Object.keys(checklist.metadata.parameters).length
              : 0;
            const generatedDate = new Date(
              checklist.generatedAt,
            ).toLocaleString();

            return (
              <Link
                key={checklist.checklistId}
                to={`/checklists/${checklist.checklistId}`}
                className="group flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex h-full flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                        Checklist
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-neutral-900 transition group-hover:text-emerald-700">
                        {checklist.checklistId}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
                        From template {checklist.templateRef}
                      </p>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                      {generatedDate}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
                      <div className="text-2xl font-semibold text-emerald-600">
                        {checklist.steps?.length ?? 0}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-neutral-500">
                        steps
                      </div>
                    </div>
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
                      <div className="text-2xl font-semibold text-emerald-600">
                        {parameterCount}
                      </div>
                      <div className="text-xs uppercase tracking-wider text-neutral-500">
                        parameters
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
