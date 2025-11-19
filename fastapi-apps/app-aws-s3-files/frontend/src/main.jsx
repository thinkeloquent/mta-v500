import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';

// Determine basename based on environment
// In dev (Vite), use root path; in production (served by FastAPI), use /apps/aws-s3-files
const basename = import.meta.env.DEV ? '/' : '/apps/aws-s3-files';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
