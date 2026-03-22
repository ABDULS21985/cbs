import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeProviderState>({ theme: 'dark', setTheme: () => null });

export function ThemeProvider({ children, defaultTheme = 'dark', storageKey = 'cbs-theme' }: { children: ReactNode; defaultTheme?: Theme; storageKey?: string }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      root.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: (t: Theme) => { localStorage.setItem(storageKey, t); setTheme(t); } }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
