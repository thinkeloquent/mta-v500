import { Link } from "react-router-dom";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { buttonClasses } from "../components/ui/Button";
import { cn } from "../utils/cn";

const pillars = [
  {
    title: "Blueprint Templates",
    description:
      "Design reusable templates with step-by-step guidance, categorisation, and tagging so your teams never start from scratch.",
    icon: "🧭",
    href: "/templates",
    accent: "from-indigo-400/30 to-transparent",
  },
  {
    title: "Adaptive Checklists",
    description:
      "Generate tailored checklists in seconds, enriched with parameterised data that adapts to every situation and client.",
    icon: "⚙️",
    href: "/checklists/generate",
    accent: "from-emerald-400/30 to-transparent",
  },
];

const steps = [
  {
    title: "Model your process",
    description:
      "Map every requirement into a polished template. Define categories, metadata, and rich step descriptions.",
  },
  {
    title: "Personalise with parameters",
    description:
      "Capture contextual inputs once—like client, environment, or due dates—and reuse them across every generated checklist.",
  },
  {
    title: "Execute with confidence",
    description:
      "Share the generated checklist with your team, track completion in real time, and surface blockers early.",
  },
];

export function HomePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Checklist Ops Platform"
        title="Operate every workflow with clarity"
        description="Build living templates, spin up laser-focused checklists, and support teams with the context they need to execute flawlessly."
        actions={
          <>
            <Link
              to="/templates"
              className={buttonClasses({ variant: "primary", size: "lg" })}
            >
              Explore templates
            </Link>
            <Link
              to="/checklists/generate"
              className={buttonClasses({ variant: "ghost", size: "lg" })}
            >
              Generate checklist
            </Link>
          </>
        }
      />

      <section className="grid gap-6 lg:grid-cols-2">
        {pillars.map((pillar) => (
          <Link
            key={pillar.title}
            to={pillar.href}
            className="group rounded-lg border border-neutral-200 bg-white p-8 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
          >
            <div className="flex flex-col gap-4">
              <span className="text-4xl">{pillar.icon}</span>
              <h2 className="text-2xl font-semibold text-neutral-900">
                {pillar.title}
              </h2>
              <p className="text-base text-neutral-600">{pillar.description}</p>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
                Go deeper
                <span aria-hidden="true" className="translate-x-0 transition group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </section>

      <Card
        title="Getting started in three moves"
        description="Follow this path to bootstrap a templated workflow that scales with your organisation."
      >
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-6"
            >
              <span className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-indigo-100 text-xl font-semibold text-indigo-700">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold text-neutral-900">
                {step.title}
              </h3>
              <p className="mt-3 text-sm text-neutral-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </Card>
    </PageShell>
  );
}
