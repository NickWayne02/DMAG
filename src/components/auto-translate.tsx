import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { translateBatch } from "@/lib/translate.functions";
import { useLanguage, type LangCode } from "@/lib/i18n";

const HAS_CYRILLIC = /[\u0400-\u04FF]/;
const CACHE_PREFIX = "dmag.autotr.";

function loadCache(lang: LangCode): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + lang);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveCache(lang: LangCode, cache: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

/**
 * Wraps a subtree and auto-translates any Russian (Cyrillic) text nodes
 * to the currently selected UI language. Preserves originals so switching
 * language back to Russian restores the source. Runtime-only, safe to nest
 * — inner sections that already use the static i18n dictionary keep working.
 */
export function AutoTranslate({ children }: { children: ReactNode }) {
  const { lang, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const originalsRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const knownRef = useRef<Set<Text>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = useServerFn(translateBatch);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let cancelled = false;
    const cache: Record<string, string> = loadCache(lang);

    function shouldSkip(node: Node | null): boolean {
      let cur: Node | null = node;
      while (cur && cur !== root) {
        if (cur.nodeType === 1) {
          const el = cur as Element;
          const tag = el.tagName;
          if (
            tag === "SCRIPT" ||
            tag === "STYLE" ||
            tag === "TEXTAREA" ||
            tag === "INPUT" ||
            tag === "NOSCRIPT" ||
            el.hasAttribute("data-no-translate")
          ) {
            return true;
          }
        }
        cur = cur.parentNode;
      }
      return false;
    }

    function collect(root: Node): Text[] {
      const out: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = n as Text;
        if (shouldSkip(t.parentNode)) continue;
        const original = originalsRef.current.get(t) ?? t.nodeValue ?? "";
        if (!original.trim()) continue;
        if (!HAS_CYRILLIC.test(original)) continue;
        if (!originalsRef.current.has(t)) {
          originalsRef.current.set(t, original);
        }
        knownRef.current.add(t);
        out.push(t);
      }
      return out;
    }

    function applyTranslation(t: Text, translated: string) {
      if (t.nodeValue !== translated) t.nodeValue = translated;
    }

    function restoreOriginals() {
      knownRef.current.forEach((t) => {
        const orig = originalsRef.current.get(t);
        if (orig != null && t.nodeValue !== orig) t.nodeValue = orig;
      });
    }

    async function processNodes(nodes: Text[], isInitialPass: boolean = false) {
      if (lang === "ru") {
        if (isInitialPass) {
          setIsTranslating(true);
          await new Promise((r) => setTimeout(r, 400));
        }
        // Restore originals when switching back to source language.
        nodes.forEach((t) => {
          const orig = originalsRef.current.get(t);
          if (orig != null) t.nodeValue = orig;
        });
        if (isInitialPass && !cancelled) setIsTranslating(false);
        return;
      }
      const missing = new Set<string>();
      for (const t of nodes) {
        const orig = originalsRef.current.get(t);
        if (!orig) continue;
        const cached = cache[orig];
        if (cached) applyTranslation(t, cached);
        else missing.add(orig);
      }
      if (isInitialPass) setIsTranslating(true);
      const start = Date.now();
      const allMissing = Array.from(missing);
      
      try {
        if (allMissing.length > 0) {
          // Process in chunks of 80 to respect API limits
          for (let i = 0; i < allMissing.length; i += 80) {
            if (cancelled) return;
            const items = allMissing.slice(i, i + 80);
            const res = await translate({
              data: { items, sourceLang: "ru", targetLang: lang },
            });
            if (cancelled) return;
            res.translations.forEach((tx, j) => {
              const src = items[j];
              if (src && tx) cache[src] = tx;
            });
          }
          saveCache(lang, cache);
          if (cancelled) return;
        }

        for (const t of nodes) {
          const orig = originalsRef.current.get(t);
          if (!orig) continue;
          const tx = cache[orig];
          if (tx) applyTranslation(t, tx);
        }
        
        // Artificial delay for beautiful visual transition
        if (isInitialPass) {
          const elapsed = Date.now() - start;
          if (elapsed < 400) {
            await new Promise((r) => setTimeout(r, 400 - elapsed));
          }
        }
      } catch {
        /* keep originals on failure */
      } finally {
        if (isInitialPass && !cancelled) setIsTranslating(false);
      }
    }

    // Initial pass — restore originals first so we re-translate from source.
    restoreOriginals();
    const initial = collect(root);
    void processNodes(initial, true);

    // Watch for DOM changes and translate newly added nodes.
    let scheduled: number | null = null;
    const pending = new Set<Node>();

    function flush() {
      scheduled = null;
      const nodes: Text[] = [];
      pending.forEach((root) => {
        for (const t of collect(root)) nodes.push(t);
      });
      pending.clear();
      if (nodes.length) void processNodes(nodes, false);
    }

    function schedule(node: Node) {
      pending.add(node);
      if (scheduled == null) {
        scheduled = window.setTimeout(flush, 120);
      }
    }

    const observer = new MutationObserver((mutations) => {
      if (cancelled) return;
      const currentCache = loadCache(lang);
      
      for (const m of mutations) {
        if (m.type === "characterData" && m.target.nodeType === 3) {
          const t = m.target as Text;
          if (shouldSkip(t.parentNode)) continue;
          if (t.nodeValue === "\u200B") continue;

          const orig = originalsRef.current.get(t);
          if (orig && t.nodeValue === (currentCache[orig] ?? orig)) continue;

          if (t.nodeValue != null && t.nodeValue.trim() && HAS_CYRILLIC.test(t.nodeValue)) {
            originalsRef.current.set(t, t.nodeValue);
            if (lang !== "ru") {
              const cached = currentCache[t.nodeValue];
              if (cached) {
                t.nodeValue = cached;
              } else {
                t.nodeValue = "\u200B";
                schedule(t);
              }
            }
          }
        } else if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
            let textNode: Node | null;
            while ((textNode = walker.nextNode())) {
              const t = textNode as Text;
              if (shouldSkip(t.parentNode)) continue;
              const val = t.nodeValue ?? "";
              if (!val.trim() || !HAS_CYRILLIC.test(val)) continue;
              
              if (!originalsRef.current.has(t)) {
                originalsRef.current.set(t, val);
              }
              if (lang !== "ru") {
                const cached = currentCache[val];
                if (cached) {
                  t.nodeValue = cached;
                } else {
                  t.nodeValue = "\u200B";
                  schedule(t);
                }
              }
            }
          });
        }
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      cancelled = true;
      if (scheduled != null) window.clearTimeout(scheduled);
      observer.disconnect();
    };
  }, [lang, translate]);

  return (
    <>
      <div ref={containerRef} style={{ display: "contents" }}>
        {children}
      </div>
      {isTranslating && (
        <div className="fixed inset-0 z-999999 bg-black/40 backdrop-blur-md flex items-center justify-center pointer-events-auto">
          <div className="bg-background border border-border shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-4 transition-all duration-300">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground tracking-tight">
              {t("translating") === "translating" ? "Перевод интерфейса..." : t("translating")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
