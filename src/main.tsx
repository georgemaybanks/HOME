import React from 'react';
import ReactDOM from 'react-dom/client';
import { HassConnect } from '@hakit/core';
import { HomeAssistantProvider } from './context/HomeAssistantContext';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HassConnect hassUrl={import.meta.env.VITE_HA_URL} hassToken={import.meta.env.VITE_HA_TOKEN}>
      <HomeAssistantProvider>
        <App />
      </HomeAssistantProvider>
    </HassConnect>
  </React.StrictMode>,
);
