import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { router } from './app/router';
import { ToastProvider } from './components/Toast';
import { CONFIG_ERROR } from './lib/supabase';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {CONFIG_ERROR ? (
      <div style={{ padding: 24, fontFamily: 'system-ui', color: '#10241A' }}>
        <h1 style={{ fontSize: 20 }}>RefillGo — configuration error</h1>
        <p>{CONFIG_ERROR}</p>
      </div>
    ) : (
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    )}
  </React.StrictMode>,
);
