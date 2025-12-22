import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global Error Handler for Production Debugging
window.onerror = function (message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100vw';
  errorDiv.style.height = '100vh';
  errorDiv.style.background = 'rgba(255,0,0,0.9)';
  errorDiv.style.color = 'white';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.padding = '20px';
  errorDiv.style.overflow = 'auto';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerHTML = `
        <h1>Application Error</h1>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre>${error?.stack || 'No stack trace'}</pre>
    `;
  document.body.appendChild(errorDiv);
};

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e: any) {
  console.error("Critical render error", e);
  window.onerror(e?.message || 'Unknown error', 'main.tsx', 0, 0, e);
}
