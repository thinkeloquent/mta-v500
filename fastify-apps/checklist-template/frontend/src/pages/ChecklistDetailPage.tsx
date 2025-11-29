import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useChecklistStore } from "../stores/checklistStore";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { buttonClasses } from "../components/ui/Button";
import { Tabs } from "../components/ui/Tabs";
import { JsonViewer } from "../components/ui/JsonViewer";
import { cn } from "../utils/cn";

export function ChecklistDetailPage() {
  const { checklistId } = useParams<{ checklistId: string }>();
  const { selectedChecklist, loading, error, fetchChecklist } =
    useChecklistStore();
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (checklistId) {
      fetchChecklist(checklistId);
    }
  }, [checklistId, fetchChecklist]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm text-neutral-700 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            Loading checklist…
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
          title="Unable to load checklist"
          description={error}
          actions={
            <Link
              to="/checklists"
              className={buttonClasses({ variant: "secondary" })}
            >
              Back to checklists
            </Link>
          }
        />
      </PageShell>
    );
  }

  if (!selectedChecklist) {
    return (
      <PageShell>
        <EmptyState
          icon="🕵️"
          title="Checklist not found"
          description="It might have expired or been removed. Try regenerating from the source template."
          actions={
            <Link
              to="/checklists"
              className={buttonClasses({ variant: "secondary" })}
            >
              View checklists
            </Link>
          }
        />
      </PageShell>
    );
  }

  const generatedAt = new Date(selectedChecklist.generatedAt).toLocaleString();
  const createdAt = new Date(selectedChecklist.createdAt).toLocaleString();
  const parameterEntries = Object.entries(
    selectedChecklist.metadata.parameters ?? {},
  );

  return (
    <PageShell>
      <Link
        to="/checklists"
        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
      >
        <span aria-hidden>←</span> Back to checklists
      </Link>

      <PageHeader
        eyebrow="Checklist execution"
        title={selectedChecklist.checklistId}
        description={`Generated from template ${selectedChecklist.templateRef}. Monitor the assigned steps and parameters that tailor this run.`}
        actions={
          <Link
            to={`/templates/${selectedChecklist.templateRef}`}
            className={buttonClasses({ variant: "secondary", size: "md" })}
          >
            View source template
          </Link>
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
          title="Checklist metadata"
          description="Core identifiers, lifecycle information, and snapshot stats."
          className="lg:col-span-2"
        >
          <dl className="grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Checklist ID
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-neutral-900">
                {selectedChecklist.checklistId}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Template version
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">
                v{selectedChecklist.metadata.templateVersion}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Generated at
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">{generatedAt}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Created at
              </dt>
              <dd className="mt-1 text-sm text-neutral-900">{createdAt}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Snapshot" description="Quick metrics for this run">
          <div className="flex items-center gap-6">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
              <div className="text-3xl font-semibold text-emerald-600">
                {selectedChecklist.steps.length}
              </div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                steps
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
              <div className="text-3xl font-semibold text-emerald-600">
                {parameterEntries.length}
              </div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                parameters
              </div>
            </div>
          </div>
        </Card>
      </div>

      {parameterEntries.length > 0 ? (
        <Card
          title="Parameters in play"
          description="Contextual values injected into this checklist run."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {parameterEntries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {key}
                </div>
                <div className="mt-1 font-mono text-sm text-neutral-900">
                  {String(value)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card
        title="Execution steps"
        description="Review every step exactly as the checklist was generated."
      >
        <ol className="space-y-4">
          {selectedChecklist.steps?.map((step, index) => (
            <li
              key={step.id || `${step.checklistId}-${step.order}-${index}`}
              className="rounded-lg border border-neutral-200 bg-white p-6 transition hover:border-emerald-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-100 text-lg font-semibold text-emerald-700">
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
                          className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs uppercase tracking-wide text-neutral-600 transition hover:border-emerald-300 hover:text-emerald-700"
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
                data={selectedChecklist}
                filename={`checklist-${selectedChecklist.checklistId}`}
              />
            ),
          },
          {
            id: "integrations",
            label: "Integrations",
            content: (
              <div className="space-y-6">
                <Card
                  title="API Integration Examples"
                  description="Fetch this checklist programmatically from your applications"
                >
                  <div className="space-y-6">
                    {/* Node.js / JavaScript */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          Node.js / JavaScript
                        </h3>
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          fetch API
                        </span>
                      </div>
                      <div className="overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <pre className="text-xs leading-relaxed text-neutral-900">
{`// Using native fetch API
const checklistId = '${selectedChecklist.checklistId}';
const apiUrl = 'http://localhost:3000/api/v1';

async function fetchChecklist() {
  try {
    const response = await fetch(\`\${apiUrl}/checklists/\${checklistId}\`);

    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    console.log('Checklist:', data.data);

    // Access checklist steps
    data.data.steps.forEach((step, index) => {
      console.log(\`Step \${index + 1}: \${step.title}\`);
    });

    return data.data;
  } catch (error) {
    console.error('Failed to fetch checklist:', error);
    throw error;
  }
}

// Execute
fetchChecklist();`}
                        </pre>
                      </div>
                    </div>

                    {/* Python */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          Python
                        </h3>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          requests
                        </span>
                      </div>
                      <div className="overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <pre className="text-xs leading-relaxed text-neutral-900">
{`import requests
import json

# Configuration
checklist_id = '${selectedChecklist.checklistId}'
api_url = 'http://localhost:3000/api/v1'

def fetch_checklist():
    """Fetch checklist from API"""
    try:
        url = f'{api_url}/checklists/{checklist_id}'
        response = requests.get(url)

        # Raise exception for bad status codes
        response.raise_for_status()

        data = response.json()
        checklist = data['data']

        print(f"Checklist ID: {checklist['checklistId']}")
        print(f"Template: {checklist['templateRef']}")
        print(f"Total steps: {len(checklist['steps'])}")

        # Process steps
        for step in checklist['steps']:
            required = "Required" if step['required'] else "Optional"
            print(f"  [{step['order']}] {step['title']} ({required})")

        return checklist

    except requests.exceptions.RequestException as e:
        print(f"Error fetching checklist: {e}")
        raise

# Execute
if __name__ == '__main__':
    checklist = fetch_checklist()`}
                        </pre>
                      </div>
                    </div>

                    {/* cURL */}
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          cURL
                        </h3>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
                          Command line
                        </span>
                      </div>
                      <div className="overflow-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                        <pre className="text-xs leading-relaxed text-neutral-900">
{`# Fetch checklist
curl -X GET http://localhost:3000/api/v1/checklists/${selectedChecklist.checklistId}

# Fetch and pretty-print with jq
curl -s http://localhost:3000/api/v1/checklists/${selectedChecklist.checklistId} | jq '.'

# Save to file
curl -s http://localhost:3000/api/v1/checklists/${selectedChecklist.checklistId} \\
  -o checklist-${selectedChecklist.checklistId}.json`}
                        </pre>
                      </div>
                    </div>

                    {/* API Endpoint Info */}
                    <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
                      <h4 className="mb-2 text-sm font-semibold text-indigo-900">
                        API Endpoint
                      </h4>
                      <div className="space-y-2 text-xs text-indigo-800">
                        <div>
                          <span className="font-semibold">Method:</span> GET
                        </div>
                        <div>
                          <span className="font-semibold">URL:</span>{" "}
                          <code className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono">
                            http://localhost:3000/api/v1/checklists/{selectedChecklist.checklistId}
                          </code>
                        </div>
                        <div>
                          <span className="font-semibold">Response:</span> JSON object with{" "}
                          <code className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono">
                            success
                          </code>{" "}
                          and{" "}
                          <code className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono">
                            data
                          </code>{" "}
                          fields
                        </div>
                        <div className="mt-3 pt-3 border-t border-indigo-200">
                          <span className="font-semibold">Authentication:</span> None required for local development
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
