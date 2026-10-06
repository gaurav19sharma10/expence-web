import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuthInstance } from '../services/firebase';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsContextType {
  themeMode: 'light' | 'dark' | 'system';
  darkIntensity: number;
  appLockEnabled: boolean;
  appLockPin: string | null;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setDarkIntensity: (value: number) => void;
  toggleAppLock: (enabled: boolean, pin?: string) => void;
  verifyPin: (pin: string) => boolean;
}

const SettingsContext = createContext<any>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('themeMode') as 'light' | 'dark' | 'system') || 'system';
  });

  const [darkIntensity, setDarkIntensityState] = useState<number>(() => {
    return Number(localStorage.getItem('darkIntensity')) || 0.5;
  });

  const [appLockEnabled, setAppLockEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('appLockEnabled') === 'true';
  });

  const [appLockPin, setAppLockPinState] = useState<string | null>(() => {
    return localStorage.getItem('appLockPin') || null;
  });

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
    document.documentElement.classList.toggle('dark', themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('darkIntensity', String(darkIntensity));
    document.documentElement.style.setProperty('--dark-intensity', String(darkIntensity));
  }, [darkIntensity]);

  useEffect(() => {
    localStorage.setItem('appLockEnabled', String(appLockEnabled));
  }, [appLockEnabled]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
  };

  const setDarkIntensity = (value: number) => {
    setDarkIntensityState(Math.max(0, Math.min(1, value)));
  };

  const toggleAppLock = (enabled: boolean, pin?: string) => {
    if (enabled && !pin) {
      throw new Error('PIN required to enable app lock');
    }
    setAppLockEnabledState(enabled);
    if (pin) {
      setAppLockPinState(pin);
      localStorage.setItem('appLockPin', pin);
    } else {
      setAppLockPinState(null);
      localStorage.removeItem('appLockPin');
    }
  };

  const verifyPin = (pin: string): boolean => {
    return appLockPin === pin;
  };

  return (
    <SettingsContext.Provider
      value={{
        themeMode,
        darkIntensity,
        appLockEnabled,
        appLockPin,
        setThemeMode,
        setDarkIntensity,
        toggleAppLock,
        verifyPin,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}