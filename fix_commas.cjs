const fs = require("fs");
let code = fs.readFileSync("src/lib/i18n.tsx", "utf8");

// The script added `    de: "...",` to lines right after the previous line that didn't have a comma.
// We can just find any missing commas before `    de:`
code = code.replace(/"\s*de:/g, '",\n    de:');

fs.writeFileSync("src/lib/i18n.tsx", code);
