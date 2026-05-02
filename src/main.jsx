import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

window._workerBase = import.meta.env.BASE_URL;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
