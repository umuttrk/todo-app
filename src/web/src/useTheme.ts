import { useEffect, useState } from 'react';

// docs/specs/002-uygulama-kabugu.md — Dark Mode: sistem tercihine
// varsayılan olarak uyar, manuel override localStorage'da saklanır.
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(pref: ThemePreference): 'light' | 'dark' {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);

  useEffect(() => {
    const resolved = resolve(preference);
    document.documentElement.dataset.theme = resolved;
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.dataset.theme = resolve('system');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference]);

  function toggle() {
    const next = resolve(preference) === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
  }

  return { resolved: resolve(preference), toggle };
}
