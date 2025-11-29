import { FileText, Code, Zap, TrendingUp } from "lucide-react";
import { PageShell } from "../components/ui/PageShell";
import { PageHeader } from "../components/ui/PageHeader";
import { KPICard } from "../components/ui/KPICard";
import { TemplateCard } from "../components/ui/TemplateCard";
import { IntegrationCard } from "../components/ui/IntegrationCard";
import { Button } from "../components/ui/Button";

export function ComponentsShowcasePage() {
  const handleMenuClick = () => {
    console.log("Menu clicked");
  };

  const handleConfigure = () => {
    console.log("Configure clicked");
  };

  const handleDelete = () => {
    console.log("Delete clicked");
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Components Library"
        title="UI Components Showcase"
        description="A comprehensive demonstration of all available UI components in the design system"
        actions={
          <>
            <Button variant="secondary">Documentation</Button>
            <Button variant="primary">Create New</Button>
          </>
        }
      />

      <section>
        <h2 className="text-2xl font-semibold text-slate-50 mb-6">
          KPI Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Active Templates"
            value={24}
            icon={<FileText className="w-5 h-5" />}
            color="blue"
            trend={15}
          />
          <KPICard
            title="Total Checklists"
            value="1,234"
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
            trend={23}
          />
          <KPICard
            title="API Requests"
            value="45.2K"
            icon={<Code className="w-5 h-5" />}
            color="purple"
            subtitle="This month"
          />
          <KPICard
            title="Success Rate"
            value="99.8%"
            icon={<Zap className="w-5 h-5" />}
            color="orange"
            trend={-2}
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-50 mb-6">
          Template Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TemplateCard
            id="tmpl-001"
            name="Employee Onboarding"
            category="HR"
            version="v2.1"
            steps={15}
            status="published"
            description="Complete employee onboarding checklist with document collection and verification steps"
            tags={["hr", "onboarding", "documents"]}
            usage={1250}
            rating={4.8}
            author="HR Templates Inc"
            type="marketplace"
            price={29}
            onMenuClick={handleMenuClick}
          />
          <TemplateCard
            id="tmpl-002"
            name="Project Launch Checklist"
            category="Project Management"
            version="v1.0"
            steps={12}
            status="published"
            description="Comprehensive project launch checklist for development teams"
            tags={["project", "launch", "development"]}
            usage={890}
            rating={4.6}
            author="You"
            type="custom"
            onMenuClick={handleMenuClick}
          />
          <TemplateCard
            id="tmpl-003"
            name="Security Audit Protocol"
            category="Security"
            version="v3.0"
            steps={20}
            status="draft"
            description="Security audit and compliance verification checklist"
            tags={["security", "audit", "compliance", "gdpr"]}
            author="You"
            type="custom"
            onMenuClick={handleMenuClick}
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-50 mb-6">
          Integration Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <IntegrationCard
            id="int-001"
            name="Production Dashboard"
            apiKey="ak_live_1234567890abcdef"
            domain="dashboard.myapp.com"
            status="active"
            lastUsed="2 hours ago"
            totalRequests={15420}
            templatesUsed={5}
            onConfigure={handleConfigure}
            onDelete={handleDelete}
          />
          <IntegrationCard
            id="int-002"
            name="Staging Environment"
            apiKey="ak_test_fedcba0987654321"
            domain="staging.myapp.com"
            status="active"
            lastUsed="1 day ago"
            totalRequests={8750}
            templatesUsed={3}
            onConfigure={handleConfigure}
            onDelete={handleDelete}
          />
          <IntegrationCard
            id="int-003"
            name="Development Portal"
            apiKey="ak_test_abcd1234efgh5678"
            domain="dev.testcompany.com"
            status="inactive"
            lastUsed="1 week ago"
            totalRequests={450}
            templatesUsed={1}
            onConfigure={handleConfigure}
            onDelete={handleDelete}
          />
        </div>
      </section>
    </PageShell>
  );
}
