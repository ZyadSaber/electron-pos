import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { createBrowserWorkerAPI } from './browserWorkerApi';
import './index.css';

if (!window.workerAPI) window.workerAPI = createBrowserWorkerAPI();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
