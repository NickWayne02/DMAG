const fs = require('fs');

// Load React Dict
const reactDict = require('./extracted_dict.json');

// Load Flutter Dict
const flutterI18nPath = './mobile_app_flutter/assets/i18n.json';
const flutterDict = JSON.parse(fs.readFileSync(flutterI18nPath, 'utf-8'));

let added = 0;
let merged = 0;

for (const key in reactDict) {
  if (!flutterDict[key]) {
    flutterDict[key] = reactDict[key];
    added++;
  } else {
    // Merge missing languages for existing keys
    const rEntry = reactDict[key];
    const fEntry = flutterDict[key];
    for (const lang in rEntry) {
      if (!fEntry[lang]) {
        fEntry[lang] = rEntry[lang];
        merged++;
      }
    }
  }
}

if (!flutterDict['settings.save'] && flutterDict['calendar.save']) {
    flutterDict['settings.save'] = flutterDict['calendar.save'];
    console.log('Added settings.save from calendar.save');
}

fs.writeFileSync(flutterI18nPath, JSON.stringify(flutterDict, null, 2));

console.log(`Added ${added} missing keys to Flutter.`);
console.log(`Merged ${merged} missing language translations to existing keys in Flutter.`);
