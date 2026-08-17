import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'neon';
export type AccentId = 'dmag' | 'sunset' | 'emerald' | 'royal' | 'ruby' | 'graphite';

export type AccentPreset = {
  id: AccentId;
  label: string;
  primary: string;
  cyan: string;
  magenta: string;
  violet: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'dmag', label: 'DMAG Blue', primary: '#0D47A1', cyan: '#42A5F5', magenta: '#1565C0', violet: '#0a2351' },
  { id: 'sunset', label: 'Sunset', primary: '#F97316', cyan: '#fbbf24', magenta: '#ef4444', violet: '#9a3412' },
  { id: 'emerald', label: 'Emerald', primary: '#10B981', cyan: '#34d399', magenta: '#14b8a6', violet: '#064e3b' },
  { id: 'royal', label: 'Royal', primary: '#7C3AED', cyan: '#22d3ee', magenta: '#e879f9', violet: '#4c1d95' },
  { id: 'ruby', label: 'Ruby', primary: '#E11D48', cyan: '#fb7185', magenta: '#f43f5e', violet: '#881337' },
  { id: 'graphite', label: 'Graphite', primary: '#334155', cyan: '#94a3b8', magenta: '#64748b', violet: '#1e293b' },
];

export type PanelColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  border: string;
};

export const THEME_BASE_COLORS: Record<ThemeMode, PanelColors> = {
  light: {
    background: '#f8fafc',
    foreground: '#0f172a',
    card: '#ffffff',
    cardForeground: '#0f172a',
    primary: '#0D47A1',
    primaryForeground: '#ffffff',
    muted: '#f1f5f9',
    border: '#e2e8f0',
  },
  dark: {
    background: '#09090b',
    foreground: '#fafafa',
    card: '#18181b',
    cardForeground: '#fafafa',
    primary: '#3b82f6',
    primaryForeground: '#ffffff',
    muted: '#27272a',
    border: '#3f3f46',
  },
  neon: {
    background: '#000000',
    foreground: '#ffffff',
    card: '#0a0a0a',
    cardForeground: '#ffffff',
    primary: '#10b981',
    primaryForeground: '#000000',
    muted: '#111111',
    border: '#222222',
  },
};

export type Settings = {
  mode: ThemeMode;
  accentId: AccentId;
  radius: number;
  scale: number;
};

const DEFAULTS: Settings = {
  mode: 'dark',
  accentId: 'dmag',
  radius: 14,
  scale: 1,
};

const STORAGE_KEY = 'dmag.mobile.theme';

// Helper to mix colors rudimentarily for RN. Web uses color-mix.
// Here we just return the base colors or a generic mix for dark mode.
function generateColors(s: Settings): PanelColors {
  const base = THEME_BASE_COLORS[s.mode];
  const accent = ACCENT_PRESETS.find(a => a.id === s.accentId) || ACCENT_PRESETS[0];
  
  return {
    ...base,
    primary: accent.primary,
    // In dark/neon mode, cards can have a slight tint of the primary color, but for RN it's easier to keep them neutral
    // and use opacity. We'll return the base for now.
  };
}

type ThemeContextType = {
  settings: Settings;
  colors: PanelColors;
  accent: AccentPreset;
  updateSettings: (patch: Partial<Settings>) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const colors = useMemo(() => generateColors(settings), [settings]);
  const accent = useMemo(() => ACCENT_PRESETS.find(a => a.id === settings.accentId) || ACCENT_PRESETS[0], [settings]);

  if (!loaded) return null; // or a splash screen

  return (
    <ThemeContext.Provider value={{ settings, colors, accent, updateSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
