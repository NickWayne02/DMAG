import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(2000),
  sourceLang: z.string().min(2).max(8),
  targetLang: z.string().min(2).max(8),
});

const BatchSchema = z.object({
  items: z.array(z.string().min(1).max(500)).min(1).max(80),
  sourceLang: z.string().min(2).max(8),
  targetLang: z.string().min(2).max(8),
});

const LANG_NAMES: Record<string, string> = {
  ru: "Russian",
  en: "English",
  de: "German",
  ro: "Romanian",
  bg: "Bulgarian",
  pl: "Polish",
  uk: "Ukrainian",
  uz: "Uzbek",
  tg: "Tajik",
};

export async function translateMessage(data: { text: string; sourceLang: string; targetLang: string }) {
  const parsed = InputSchema.parse(data);

  if (parsed.sourceLang === parsed.targetLang) {
    return { translated: parsed.text, cached: true };
  }

  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${parsed.sourceLang}&tl=${parsed.targetLang}&dt=t&q=${encodeURIComponent(parsed.text)}`,
  );

  if (!res.ok) {
    return { translated: parsed.text, error: `gateway_${res.status}` as const };
  }
  const json = await res.json();
  const out = json[0].map((item: any) => item[0]).join("");
  return { translated: out };
}

export async function translateBatch(data: { items: string[]; sourceLang: string; targetLang: string }) {
  const parsed = BatchSchema.parse(data);

  if (parsed.sourceLang === parsed.targetLang) {
    return { translations: parsed.items };
  }
  const numbered = parsed.items.map((t, i) => `${i + 1}. ${t.replace(/\n/g, " ")}`).join("\n");

  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${parsed.sourceLang}&tl=${parsed.targetLang}&dt=t&q=${encodeURIComponent(numbered)}`,
  );

  if (!res.ok) {
    return { translations: parsed.items, error: `gateway_${res.status}` as const };
    }
    const json = await res.json();
    const raw = json[0].map((item: any) => item[0]).join("");
    const lines = raw
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter(Boolean);
    const map = new Map<number, string>();
    for (const line of lines) {
      const m = line.match(/^(\d+)[.)\]]\s*(.+)$/);
      if (m) map.set(Number(m[1]), m[2].trim());
    }
    const translations = parsed.items.map((orig, i) => map.get(i + 1) ?? orig);
    return { translations };
}
