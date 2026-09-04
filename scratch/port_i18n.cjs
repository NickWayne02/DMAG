const fs = require('fs');
const tsx = fs.readFileSync('src/lib/i18n.tsx', 'utf-8');

// The file has: const DICT: Dict = { ... };
// We will extract the object between { and the closing };
const startIndex = tsx.indexOf('const DICT: Dict = {');
if (startIndex === -1) {
  console.error('DICT not found');
  process.exit(1);
}

// Find the matching closing bracket for DICT
let braceCount = 0;
let endIndex = -1;
const objectStart = tsx.indexOf('{', startIndex);

for (let i = objectStart; i < tsx.length; i++) {
  if (tsx[i] === '{') braceCount++;
  else if (tsx[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      endIndex = i + 1;
      break;
    }
  }
}

if (endIndex === -1) {
  console.error('Could not parse DICT object');
  process.exit(1);
}

const objStr = tsx.substring(objectStart, endIndex);

// We evaluate the object string to parse it into a real JS object
const reactDict = eval('(' + objStr + ')');

const flutterJsonPath = 'mobile_app_flutter/assets/i18n.json';
const flutterJson = JSON.parse(fs.readFileSync(flutterJsonPath, 'utf-8'));

let updated = 0;
let added = 0;

for (const [key, value] of Object.entries(reactDict)) {
  if (!flutterJson[key]) {
    flutterJson[key] = value;
    added++;
  } else {
    for (const [lang, text] of Object.entries(value)) {
      if (flutterJson[key][lang] !== text) {
        flutterJson[key][lang] = text;
        updated++;
      }
    }
  }
}

fs.writeFileSync(flutterJsonPath, JSON.stringify(flutterJson, null, 2), 'utf-8');
console.log('Added ' + added + ' new keys, updated ' + updated + ' language strings.');
