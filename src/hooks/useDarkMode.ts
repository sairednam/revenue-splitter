import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('theme', 'dark'); } catch { /* ignore */ }
    } else {
      root.removeAttribute('data-theme');
      try { localStorage.setItem('theme', 'light'); } catch { /* ignore */ }
    }
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}
