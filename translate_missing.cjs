const fs = require("fs");
const https = require("https");

const langs = ["ro", "bg", "uz", "tg"];

async function translate(text, targetLang) {
  return new Promise((resolve) => {
    https.get(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=" +
        targetLang +
        "&dt=t&q=" +
        encodeURIComponent(text),
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json[0].map((x) => x[0]).join(""));
          } catch {
            resolve(text);
          }
        });
      },
    );
  });
}

async function run() {
  console.log("Translating missing strings...");
  let i18n = fs.readFileSync("src/lib/i18n.tsx", "utf8");

  // A regex to find the dictionary entries
  // e.g. "key": { ru: "...", en: "...", ro: "..." }
  const blockRegex = /"([^"]+)":\s*{\s*([^}]+)\s*}/g;
  
  let match;
  let matches = [];
  while ((match = blockRegex.exec(i18n)) !== null) {
    matches.push({
      full: match[0],
      key: match[1],
      content: match[2],
      start: match.index,
      end: blockRegex.lastIndex
    });
  }

  console.log("Found " + matches.length + " entries.");

  for (let m of matches) {
    let content = m.content;
    
    // Parse key-value pairs
    let dict = {};
    const kvRegex = /([a-z]{2})\s*:\s*("(?:[^"\\]|\\.)*")/g;
    let kvMatch;
    while ((kvMatch = kvRegex.exec(content)) !== null) {
      dict[kvMatch[1]] = JSON.parse(kvMatch[2]);
    }

    if (!dict.ru || !dict.en) continue;

    let modified = false;
    for (const lang of langs) {
      // If the language is missing, or it equals English (and Russian is different from English), translate it
      if (!dict[lang] || (dict[lang] === dict.en && dict.ru !== dict.en)) {
        console.log(`Translating ${m.key} for ${lang}...`);
        const translated = await translate(dict.ru, lang);
        dict[lang] = translated;
        modified = true;
        // sleep slightly to avoid rate limit
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (modified) {
      // rebuild the content block
      const langsOrder = ["ru", "en", "de", "ro", "bg", "pl", "uk", "uz", "tg"];
      let newContent = langsOrder.filter(l => dict[l] !== undefined).map(l => `\n    ${l}: ${JSON.stringify(dict[l])}`).join(",") + "\n  ";
      
      const newFull = `"${m.key}": {${newContent}}`;
      i18n = i18n.replace(m.full, newFull);
    }
  }

  fs.writeFileSync("src/lib/i18n.tsx", i18n, "utf8");
  console.log("Done");
}

run();
