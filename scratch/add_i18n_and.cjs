const fs = require('fs');

const keys = {
  "admin.moderation.and": {
    ru: "и", en: "and", de: "und", ro: "și", bg: "и", pl: "i", uk: "та", uz: "va", tg: "ва"
  }
};

let ts_code = fs.readFileSync('src/lib/i18n.tsx', 'utf8');
let ts_addition = "";

for (const [k, v] of Object.entries(keys)) {
  ts_addition += `  "${k}": {\n`;
  for (const [lang, val] of Object.entries(v)) {
    ts_addition += `    ${lang}: "${val}",\n`;
  }
  ts_addition += `  },\n`;
}

ts_code = ts_code.replace('"admin.tab.moderation": {', ts_addition + '  "admin.tab.moderation": {');
fs.writeFileSync('src/lib/i18n.tsx', ts_code, 'utf8');

let json_data = JSON.parse(fs.readFileSync('mobile_app_flutter/assets/i18n.json', 'utf8'));
for (const [k, v] of Object.entries(keys)) {
  json_data[k] = v;
}
fs.writeFileSync('mobile_app_flutter/assets/i18n.json', JSON.stringify(json_data, null, 2), 'utf8');

console.log('Done');
