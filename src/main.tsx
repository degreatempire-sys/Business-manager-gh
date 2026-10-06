import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle dev-server or environment WebSocket disconnects gracefully
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      (typeof event.reason.message === 'string' &&
        (event.reason.message.includes('WebSocket') ||
          event.reason.message.includes('failed to connect to websocket') ||
          event.reason.message.includes('WebSocket closed without opened')))
    ) {
      // Prevent benign dev-server WebSocket reconnection attempts from triggering unhandled rejection overlays
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

