import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "./components/layout/Navigation";
import { HomePage } from "./pages/HomePage";
import { TemplatesPage } from "./pages/TemplatesPage";
import { CreateTemplatePage } from "./pages/CreateTemplatePage";
import { EditTemplatePage } from "./pages/EditTemplatePage";
import { TemplateDetailPage } from "./pages/TemplateDetailPage";
import { ChecklistsPage } from "./pages/ChecklistsPage";
import { ChecklistDetailPage } from "./pages/ChecklistDetailPage";
import { GenerateChecklistPage } from "./pages/GenerateChecklistPage";
import { ComponentsShowcasePage } from "./pages/ComponentsShowcasePage";

function App() {
  return (
    <BrowserRouter>
      <div className="relative flex min-h-screen flex-col text-slate-100">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-br from-indigo-900/20 via-transparent to-emerald-900/20" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid bg-[length:40px_40px] opacity-20" />
        <div className="relative flex flex-1 flex-col gap-10 pb-20">
          <Navigation />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/templates/new" element={<CreateTemplatePage />} />
              <Route path="/templates/:templateId/edit" element={<EditTemplatePage />} />
              <Route path="/templates/:templateId" element={<TemplateDetailPage />} />
              <Route path="/checklists" element={<ChecklistsPage />} />
              <Route path="/checklists/generate" element={<GenerateChecklistPage />} />
              <Route path="/checklists/:checklistId" element={<ChecklistDetailPage />} />
              <Route path="/components" element={<ComponentsShowcasePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
