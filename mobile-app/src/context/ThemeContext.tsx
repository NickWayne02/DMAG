import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'neon'; // Force neon mode only for exact web matching
export type AccentId = 'dmag' | 'sunset' | 'emerald' | 'royal' | 'ruby' | 'graphite';

export type AccentPreset = {
  id: AccentId;
  label: string;
  primary: string;
  cyan: string;
  magenta: string;
  violet: string;
};

// Web app exact colors
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'dmag', label: 'DMAG Blue', primary: '#10b981', cyan: '#10b981', magenta: '#ec4899', violet: '#8b5cf6' },
  { id: 'sunset', label: 'Sunset', primary: '#f59e0b', cyan: '#f59e0b', magenta: '#ef4444', violet: '#8b5cf6' },
  { id: 'emerald', label: 'Emerald', primary: '#22c55e', cyan: '#22c55e', magenta: '#10b981', violet: '#064e3b' },
  { id: 'royal', label: 'Royal', primary: '#8b5cf6', cyan: '#8b5cf6', magenta: '#ec4899', violet: '#4c1d95' },
  { id: 'ruby', label: 'Ruby', primary: '#ef4444', cyan: '#ef4444', magenta: '#ec4899', violet: '#881337' },
  { id: 'graphite', label: 'Graphite', primary: '#a1a1aa', cyan: '#a1a1aa', magenta: '#52525b', violet: '#27272a' },
];

export type PanelColors = {
  background: string;
  surface: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  border: string;
  neonCyan: string;
  neonMagenta: string;
  neonViolet: string;
  neonLime: string;
  neonAmber: string;
  neonRed: string;
};

export const THEME_BASE_COLORS: Record<ThemeMode, PanelColors> = {
  neon: {
    background: '#000000',
    surface: '#000000',
    foreground: '#ffffff',
    card: '#0a0a0a',
    cardForeground: '#ffffff',
    primary: '#10b981',
    primaryForeground: '#000000',
    muted: '#111111',
    border: 'rgba(255, 255, 255, 0.1)',
    neonCyan: '#10b981',
    neonMagenta: '#ec4899',
    neonViolet: '#8b5cf6',
    neonLime: '#22c55e',
    neonAmber: '#f59e0b',
    neonRed: '#ef4444',
  },
};

export type Settings = {
  mode: ThemeMode;
  accentId: AccentId;
  radius: number;
  scale: number;
};

const DEFAULTS: Settings = {
  mode: 'neon',
  accentId: 'dmag',
  radius: 14,
  scale: 1,
};

const STORAGE_KEY = 'dmag.mobile.theme';

function generateColors(s: Settings): PanelColors {
  const base = THEME_BASE_COLORS.neon;
  const accent = ACCENT_PRESETS.find(a => a.id === s.accentId) || ACCENT_PRESETS[0];
  
  return {
    ...base,
    primary: accent.primary,
    neonCyan: accent.cyan,
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
          // Force mode to neon
          setSettings(prev => ({ ...prev, ...parsed, mode: 'neon' }));
        } catch (e) {}
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch, mode: 'neon' as ThemeMode };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const colors = useMemo(() => generateColors(settings), [settings]);
  const accent = useMemo(() => ACCENT_PRESETS.find(a => a.id === settings.accentId) || ACCENT_PRESETS[0], [settings]);

  if (!loaded) return null;

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
