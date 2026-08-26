import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  RotateCcw,
  Check,
  Palette,
  Ruler,
  Type,
  Sun,
  Moon,
  Zap,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ACCENT_PRESETS,
  PANEL_LABELS,
  THEME_MODES,
  useSettings,
  type PanelKey,
  type ThemeMode,
} from "@/lib/settings";
import { useT } from "@/lib/i18n";

const MODE_ICON: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  neon: Zap,
  custom: SlidersHorizontal,
};

type Props = {
  /** When set, renders as a compact icon button suitable for headers. */
  variant?: "icon" | "inline";
  /** Optional class for the trigger button. */
  className?: string;
};

export function SettingsDialog({ variant = "icon", className }: Props) {
  const t = useT();
  const { settings, setSettings, setPanelColor, reset, activeAccent, resolvedPanels } =
    useSettings();
  const [open, setOpen] = useState(false);
  const getValidHex = (hex: string) => (hex === "AccentColor" ? "#0D47A1" : hex);
  const [customHex, setCustomHex] = useState<string>(
    settings.customAccent ?? getValidHex(activeAccent.primary),
  );

  useEffect(() => {
    setCustomHex(settings.customAccent ?? getValidHex(activeAccent.primary));
  }, [settings.customAccent, activeAccent.primary]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            className={
              className ??
              "inline-flex items-center justify-center rounded-full bg-black/15 hover:bg-black/25 h-9 w-9 shrink-0"
            }
            title={t("settings.title")}
            aria-label={t("settings.title")}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        ) : (
          <Button variant="outline" className={className}>
            <SettingsIcon className="h-4 w-4 mr-2" />
            {t("settings.title")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            {t("settings.title")}
          </DialogTitle>
          <DialogDescription>{t("settings.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Language cluster */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("settings.language")}</Label>
              <LanguageSwitcher />
            </div>
            <p className="text-xs text-muted-foreground">{t("settings.languageHint")}</p>
          </section>

          <div className="h-px bg-border" />

          {/* Theme mode cluster */}
          <section className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t("settings.theme")}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {THEME_MODES.map((m) => {
                const Icon = MODE_ICON[m.id];
                const active = settings.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettings({ mode: m.id })}
                    className={`flex flex-col items-center gap-1 rounded-xl py-3 border text-xs font-semibold transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(`settings.theme.${m.id}`)}
                  </button>
                );
              })}
            </div>

            {settings.mode === "custom" && (
              <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
                <p className="text-xs text-muted-foreground">{t("settings.panelsHint")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PANEL_LABELS) as PanelKey[]).map((key) => {
                    const value = settings.panelColors[key] ?? resolvedPanels[key];
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 rounded-lg border border-border p-2"
                      >
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => setPanelColor(key, e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded"
                        />
                        <span className="text-[11px] leading-tight">
                          {t(`settings.panel.${key}`) || PANEL_LABELS[key]}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings({ panelColors: {} })}
                  className="h-8"
                >
                  {t("settings.clearCustom")}
                </Button>
              </div>
            )}
          </section>

          {settings.mode !== "custom" && (
            <>
              <div className="h-px bg-border" />

              {/* Accent color cluster */}
              <section className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  {t("settings.accent")}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCENT_PRESETS.map((p) => {
                    const active = settings.accentId === p.id && !settings.customAccent;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSettings({ accentId: p.id, customAccent: null })}
                        className={`relative rounded-xl h-16 border transition ${
                          active
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border hover:border-primary/40"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${p.primary}, ${p.violet} 60%, ${p.cyan})`,
                        }}
                        title={p.label}
                      >
                        {active && (
                          <Check className="h-5 w-5 absolute top-1 right-1 drop-shadow text-white" />
                        )}
                        <span className="absolute bottom-1 left-2 text-[10px] font-semibold drop-shadow text-white/90">
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      setSettings({ customAccent: e.target.value });
                    }}
                    className="h-10 w-14 p-1 rounded-lg cursor-pointer"
                  />
                  <Input
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value)}
                    onBlur={() => {
                      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(customHex)) {
                        setSettings({ customAccent: customHex });
                      }
                    }}
                    placeholder="#0D47A1"
                    className="h-10 flex-1 rounded-lg"
                  />
                  {settings.customAccent && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSettings({ customAccent: null });
                        setCustomHex(activeAccent.primary);
                      }}
                    >
                      {t("settings.clearCustom")}
                    </Button>
                  )}
                </div>
              </section>
            </>
          )}

          <div className="h-px bg-border" />

          {/* Button Style cluster */}
          <section className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" />
              {t("settings.buttonStyle")}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ buttonStyle: "solid" })}
                className={`flex items-center justify-center h-10 rounded-xl border text-xs font-semibold transition ${
                  settings.buttonStyle === "solid"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t("settings.buttonStyle.solid")}
              </button>
              <button
                type="button"
                onClick={() => setSettings({ buttonStyle: "text" })}
                className={`flex items-center justify-center h-10 rounded-xl border text-xs font-semibold transition ${
                  settings.buttonStyle === "text"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t("settings.buttonStyle.text")}
              </button>
            </div>
          </section>

          <div className="h-px bg-border" />

          {/* UI Scale cluster */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Type className="h-4 w-4" />
                {t("settings.scale")}
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(settings.scale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.85}
              max={1.25}
              step={0.05}
              value={settings.scale}
              onChange={(e) => setSettings({ scale: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>85%</span>
              <span>100%</span>
              <span>125%</span>
            </div>
          </section>

          {/* Radius cluster */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                {t("settings.radius")}
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.radius.toFixed(2)}rem
              </span>
            </div>
            <input
              type="range"
              min={0.25}
              max={1.5}
              step={0.125}
              value={settings.radius}
              onChange={(e) => setSettings({ radius: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t("settings.radiusSharp")}</span>
              <span>{t("settings.radiusRound")}</span>
            </div>
          </section>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setCustomHex(ACCENT_PRESETS[0].primary);
            }}
            className="rounded-xl"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("settings.reset")}
          </Button>
          <Button onClick={() => setOpen(false)} className="rounded-xl">
            {t("settings.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
