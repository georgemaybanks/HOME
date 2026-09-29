import React from 'react';
import ReactDOM from 'react-dom/client';
import { HomeAssistantProvider } from './context/HomeAssistantContext';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HomeAssistantProvider>
      <App />
    </HomeAssistantProvider>
  </React.StrictMode>,
);
