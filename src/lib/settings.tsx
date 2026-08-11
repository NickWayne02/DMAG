import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";

export type AccentPreset = {
  id: string;
  label: string;
  primary: string; // hex, used for --primary + shadcn primary
  cyan: string; // neon accent 1
  magenta: string; // neon accent 2
  violet: string; // neon accent 3
};

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "system",
    label: "Системный (OS)",
    primary: "AccentColor",
    cyan: "AccentColor",
    magenta: "AccentColor",
    violet: "AccentColor",
  },
  {
    id: "dmag",
    label: "DMAG Blue",
    primary: "#0D47A1",
    cyan: "#42A5F5",
    magenta: "#1565C0",
    violet: "#0a2351",
  },
  {
    id: "sunset",
    label: "Sunset",
    primary: "#F97316",
    cyan: "#fbbf24",
    magenta: "#ef4444",
    violet: "#9a3412",
  },
  {
    id: "emerald",
    label: "Emerald",
    primary: "#10B981",
    cyan: "#34d399",
    magenta: "#14b8a6",
    violet: "#064e3b",
  },
  {
    id: "royal",
    label: "Royal",
    primary: "#7C3AED",
    cyan: "#22d3ee",
    magenta: "#e879f9",
    violet: "#4c1d95",
  },
  {
    id: "ruby",
    label: "Ruby",
    primary: "#E11D48",
    cyan: "#fb7185",
    magenta: "#f43f5e",
    violet: "#881337",
  },
  {
    id: "graphite",
    label: "Graphite",
    primary: "#334155",
    cyan: "#94a3b8",
    magenta: "#64748b",
    violet: "#1e293b",
  },
];

export type ThemeMode = "light" | "dark" | "neon" | "custom";

export const THEME_MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "neon", label: "Neon" },
  { id: "custom", label: "Custom" },
];

/** Panels whose colors the user can customize when mode = "custom". */
export type PanelKey =
  | "background"
  | "foreground"
  | "card"
  | "cardForeground"
  | "primary"
  | "primaryForeground"
  | "muted"
  | "border";

export type PanelColors = Partial<Record<PanelKey, string>>;

export const PANEL_LABELS: Record<PanelKey, string> = {
  background: "Фон страницы",
  foreground: "Основной текст",
  card: "Панели / карточки",
  cardForeground: "Текст на карточках",
  primary: "Основной акцент",
  primaryForeground: "Текст на акценте",
  muted: "Второстепенные панели",
  border: "Границы",
};

/** Baseline panel colors per theme mode, used as defaults for the color pickers. */
export const THEME_BASE_COLORS: Record<Exclude<ThemeMode, "custom">, Required<PanelColors>> = {
  light: {
    background: "#f8fafc",
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    primary: "#0D47A1",
    primaryForeground: "#ffffff",
    muted: "#f1f5f9",
    border: "#e2e8f0",
  },
  dark: {
    background: "#09090b",
    foreground: "#fafafa",
    card: "#18181b",
    cardForeground: "#fafafa",
    primary: "#3b82f6",
    primaryForeground: "#ffffff",
    muted: "#27272a",
    border: "#3f3f46",
  },
  neon: {
    background: "#000000",
    foreground: "#ffffff",
    card: "#000000",
    cardForeground: "#ffffff",
    primary: "#10b981",
    primaryForeground: "#000000",
    muted: "#111111",
    border: "#222222",
  },
};

export type Settings = {
  mode: ThemeMode;
  accentId: string;
  customAccent: string | null; // hex if user picked custom accent color
  panelColors: PanelColors; // per-panel overrides (used when mode === "custom")
  scale: number; // 0.85 – 1.25
  radius: number; // 0.25 – 1.5 (rem)
  density: "compact" | "cozy" | "spacious";
  buttonStyle: "solid" | "text"; // "solid" (bg color), "text" (text color on neutral bg)
};

const DEFAULTS: Settings = {
  mode: "light",
  accentId: "dmag",
  customAccent: null,
  panelColors: {},
  scale: 1,
  radius: 0.875,
  density: "cozy",
  buttonStyle: "solid",
};

const STORAGE_KEY = "dmag.settings.v2";

type Ctx = {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  setPanelColor: (key: PanelKey, value: string | null) => void;
  reset: () => void;
  activeAccent: AccentPreset;
  /** Resolved base colors for the current mode (custom uses light as fallback). */
  resolvedPanels: Required<PanelColors>;
};

const SettingsCtx = createContext<Ctx | null>(null);

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(m)) return null;
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function densityPad(d: Settings["density"]) {
  return d === "compact" ? "0.75rem" : d === "spacious" ? "1.5rem" : "1.125rem";
}

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

function resolveBase(mode: ThemeMode): Required<PanelColors> {
  if (mode === "custom") return THEME_BASE_COLORS.light;
  return THEME_BASE_COLORS[mode];
}

function applySettings(s: Settings, accent: AccentPreset, animate: boolean = false) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  const updateFn = () => {
    // Prevent "disco" effect by disabling transitions inside the new DOM state
    root.classList.add("theme-transitioning");

    // Theme mode → toggle .dark class so shadcn dark variants activate for dark/neon.
    root.classList.toggle("dark", s.mode === "dark" || s.mode === "neon");
    root.dataset.themeMode = s.mode;

    // Global scale — everything measured in rem scales together.
    root.style.setProperty("--ui-scale", String(s.scale));
    root.style.fontSize = `${16 * s.scale}px`;

    // Corner radius (drives shadcn --radius and derived tokens).
    root.style.setProperty("--radius", `${s.radius}rem`);

    // Card / container padding via density.
    root.style.setProperty("--ui-density-pad", densityPad(s.density));

    // Panel colors — merge base for the mode with user overrides (custom mode uses full overrides).
    const base = resolveBase(s.mode);
    const panels: Required<PanelColors> =
      s.mode === "custom" ? { ...base, ...s.panelColors } : { ...base };

    // If user picked a custom accent hex, override primary regardless of mode.
    if (s.customAccent) panels.primary = s.customAccent;
    else if (s.mode !== "custom") panels.primary = accent.primary;

    // Dynamically tint neutral backgrounds using the primary color for a cohesive theme canvas
    const isAccentColor = panels.primary === "AccentColor";
    const mixBg =
      s.mode === "custom" || isAccentColor
        ? panels.background
        : `color-mix(in oklab, ${panels.background} 96%, ${panels.primary})`;
    const mixCard =
      s.mode === "custom" || isAccentColor
        ? panels.card
        : `color-mix(in oklab, ${panels.card} 95%, ${panels.primary})`;
    const mixMuted =
      s.mode === "custom" || isAccentColor
        ? panels.muted
        : `color-mix(in oklab, ${panels.muted} 90%, ${panels.primary})`;
    const mixBorder =
      s.mode === "custom" || isAccentColor
        ? panels.border
        : `color-mix(in oklab, ${panels.border} 80%, ${panels.primary})`;

    // Push panel colors as raw hex (shadcn tokens accept any color function/value).
    root.style.setProperty("--background", mixBg);
    root.style.setProperty("--foreground", panels.foreground);
    root.style.setProperty("--card", mixCard);
    root.style.setProperty("--card-foreground", panels.cardForeground);
    root.style.setProperty("--popover", mixCard);
    root.style.setProperty("--popover-foreground", panels.cardForeground);
    root.style.setProperty("--primary", panels.primary);
    root.style.setProperty("--primary-foreground", panels.primaryForeground);
    root.style.setProperty("--secondary", mixMuted);
    root.style.setProperty("--secondary-foreground", panels.cardForeground);
    root.style.setProperty("--muted", mixMuted);
    root.style.setProperty("--accent", mixMuted);
    root.style.setProperty("--accent-foreground", panels.cardForeground);
    root.style.setProperty("--border", mixBorder);
    root.style.setProperty("--input", mixBorder);
    root.style.setProperty("--ring", panels.primary);
    root.style.setProperty("--sidebar", panels.primary);
    root.style.setProperty("--sidebar-foreground", panels.primaryForeground);
    root.style.setProperty("--sidebar-primary", panels.card);
    root.style.setProperty("--sidebar-primary-foreground", panels.primary);
    root.style.setProperty("--sidebar-accent", "rgba(255, 255, 255, 0.15)");
    root.style.setProperty("--sidebar-accent-foreground", "#ffffff");
    root.style.setProperty("--sidebar-border", "rgba(255, 255, 255, 0.1)");
    root.style.setProperty("--sidebar-ring", panels.primary);

    const rgb = hexToRgb(panels.primary);
    if (rgb) root.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    // Bridge neon-* tokens to the active theme so the employee dashboard (which is
    // authored against --neon-*) recolors along with Light / Dark / Neon / Custom.
    root.style.setProperty("--neon-bg", panels.background);
    root.style.setProperty("--neon-surface", panels.card);
    root.style.setProperty("--neon-surface-2", panels.muted);
    root.style.setProperty("--neon-text", panels.foreground);
    root.style.setProperty(
      "--neon-text-dim",
      `color-mix(in oklab, ${panels.foreground} 60%, ${panels.card})`,
    );
    root.style.setProperty(
      "--neon-border",
      isAccentColor ? panels.border : `color-mix(in oklab, ${panels.primary} 30%, ${panels.border})`,
    );
    root.style.setProperty(
      "--neon-grid-line",
      isAccentColor ? "transparent" : `color-mix(in oklab, ${panels.primary} 12%, transparent)`,
    );

    // Neon accent trio — driven by the selected accent (or custom accent hex).
    root.style.setProperty("--neon-cyan", s.customAccent ?? accent.cyan);
    root.style.setProperty("--neon-magenta", accent.magenta);
    root.style.setProperty("--neon-violet", accent.violet);
    root.style.setProperty(
      "--neon-gradient",
      `linear-gradient(135deg, ${accent.violet} 0%, ${panels.primary} 55%, ${s.customAccent ?? accent.cyan} 100%)`,
    );

    // Keep neon glow overrides to none so they stay flat
    root.style.setProperty("--neon-glow-cyan", "none");
    root.style.setProperty("--neon-glow-violet", "none");
    // Header gradient — uses accent trio for unique header per theme.
    root.style.setProperty(
      "--header-gradient",
      `linear-gradient(160deg, ${accent.violet} 0%, ${panels.primary} 55%, ${s.customAccent ?? accent.cyan} 100%)`,
    );

    // Removed page background radial glows to completely eliminate "подсветка"
    root.style.setProperty("--page-bg-glow-1", "none");
    root.style.setProperty("--page-bg-glow-2", "none");

    // Removed heavy header box-shadow glow
    root.style.setProperty("--header-shadow", "none");
  };

  if (animate && (document as any).startViewTransition) {
    const t = (document as any).startViewTransition(updateFn);
    t.ready.then(() => {
      root.classList.remove("theme-transitioning");
    });
  } else {
    updateFn();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-transitioning");
      });
    });
  }
}

const BROADCAST_CHANNEL = "dmag.settings.v2";
let suppressWrite = false;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setState] = useState<Settings>(() => loadSettings());
  const prevTheme = useRef({ mode: settings.mode, accentId: settings.accentId });

  const activeAccent = useMemo(() => {
    return ACCENT_PRESETS.find((p) => p.id === settings.accentId) ?? ACCENT_PRESETS[0];
  }, [settings.accentId]);

  // Apply CSS + persist + broadcast to sibling tabs / windows / iframes.
  // useLayoutEffect prevents FOUC by updating CSS variables synchronously before paint
  useLayoutEffect(() => {
    const modeChanged = prevTheme.current.mode !== settings.mode;
    const accentChanged = prevTheme.current.accentId !== settings.accentId;
    const shouldAnimate = modeChanged || accentChanged;
    prevTheme.current = { mode: settings.mode, accentId: settings.accentId };

    applySettings(settings, activeAccent, shouldAnimate);
    if (suppressWrite) {
      suppressWrite = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bc.postMessage(settings);
      bc.close();
    } catch {
      /* ignore */
    }
  }, [settings, activeAccent]);

  // Subscribe to updates from other tabs / windows so theme stays in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyIncoming = (incoming: Partial<Settings> | null) => {
      if (!incoming) return;
      suppressWrite = true;
      setState((prev) => ({ ...prev, ...incoming }));
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        applyIncoming(JSON.parse(e.newValue) as Partial<Settings>);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bc.onmessage = (e) => applyIncoming(e.data as Partial<Settings>);
    } catch {
      /* ignore */
    }

    // If the tab was hidden while settings changed, resync on focus.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const fresh = loadSettings();
        applyIncoming(fresh);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      bc?.close();
    };
  }, []);

  const resolvedPanels = useMemo<Required<PanelColors>>(() => {
    const base = resolveBase(settings.mode);
    return { ...base, ...settings.panelColors };
  }, [settings.mode, settings.panelColors]);

  const ctx: Ctx = {
    settings,
    setSettings: (patch) => setState((s) => ({ ...s, ...patch })),
    setPanelColor: (key, value) =>
      setState((s) => {
        const next = { ...s.panelColors };
        if (value == null) delete next[key];
        else next[key] = value;
        return { ...s, panelColors: next };
      }),
    reset: () => setState(DEFAULTS),
    activeAccent,
    resolvedPanels,
  };
  return <SettingsCtx.Provider value={ctx}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
