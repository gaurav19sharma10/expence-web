import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { HouseholdProvider } from './contexts/HouseholdContext';
import { SettingsProvider } from './contexts/SettingsContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <HouseholdProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </HouseholdProvider>
    </AuthProvider>
  </React.StrictMode>
);