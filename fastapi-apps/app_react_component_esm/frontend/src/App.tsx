/**
 * Main application component with routing
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import FileEditor from './pages/FileEditor';
import Home from './pages/Home';
import ProjectFiles from './pages/ProjectFiles';
import Projects from './pages/Projects';

// Type declaration for Vite-injected basename
declare const __APP_BASENAME__: string;

export default function App() {
  // Determine basename based on environment
  // In dev (Vite), use root path; in production, use computed basename from folder name
  // Computed: app/react_component_esm -> /apps/react-component-esm
  // Ensure basename does NOT have trailing slash for proper React Router matching
  // const basename = "/apps/react-component-esm";
  const basename = import.meta.env.DEV ? '/' : '/apps/react-component-esm';
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectFiles />} />
          <Route path="projects/:projectId/files/:fileId/edit" element={<FileEditor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
