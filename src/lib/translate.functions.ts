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

export const translateMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.sourceLang === data.targetLang) {
      return { translated: data.text, cached: true };
    }

    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${data.sourceLang}&tl=${data.targetLang}&dt=t&q=${encodeURIComponent(data.text)}`);

    if (!res.ok) {
      return { translated: data.text, error: `gateway_${res.status}` as const };
    }
    const json = await res.json();
    const out = json[0].map((item: any) => item[0]).join("");
    return { translated: out };
  });

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BatchSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.sourceLang === data.targetLang) {
      return { translations: data.items };
    }
    const numbered = data.items.map((t, i) => `${i + 1}. ${t.replace(/\n/g, " ")}`).join("\n");

    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${data.sourceLang}&tl=${data.targetLang}&dt=t&q=${encodeURIComponent(numbered)}`);

    if (!res.ok) {
      return { translations: data.items, error: `gateway_${res.status}` as const };
    }
    const json = await res.json();
    const raw = json[0].map((item: any) => item[0]).join("");
    const lines = raw.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    const map = new Map<number, string>();
    for (const line of lines) {
      const m = line.match(/^(\d+)[.)\]]\s*(.+)$/);
      if (m) map.set(Number(m[1]), m[2].trim());
    }
    const translations = data.items.map((orig, i) => map.get(i + 1) ?? orig);
    return { translations };
  });
