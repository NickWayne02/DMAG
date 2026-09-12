const fs = require('fs');
const path = require('path');

const newTranslations = {
  "theme.dmag": {
    "ru": "DMAG", "en": "DMAG", "de": "DMAG", "ro": "DMAG", "bg": "DMAG", "pl": "DMAG", "uk": "DMAG", "uz": "DMAG", "tg": "DMAG"
  },
  "theme.sunset": {
    "ru": "Закат", "en": "Sunset", "de": "Sonnenuntergang", "ro": "Apus", "bg": "Залез", "pl": "Zachód słońca", "uk": "Захід сонця", "uz": "Quyosh botishi", "tg": "Ғуруби офтоб"
  },
  "theme.emerald": {
    "ru": "Изумруд", "en": "Emerald", "de": "Smaragd", "ro": "Smarald", "bg": "Изумруд", "pl": "Szmaragd", "uk": "Смарагд", "uz": "Zumrad", "tg": "Зумуррад"
  },
  "theme.royal": {
    "ru": "Королевский", "en": "Royal", "de": "Königlich", "ro": "Regal", "bg": "Кралски", "pl": "Królewski", "uk": "Королівський", "uz": "Qirollik", "tg": "Шоҳона"
  },
  "theme.ruby": {
    "ru": "Рубин", "en": "Ruby", "de": "Rubin", "ro": "Rubin", "bg": "Рубин", "pl": "Rubin", "uk": "Рубін", "uz": "Yoqut", "tg": "Ёқут"
  },
  "theme.graphite": {
    "ru": "Графит", "en": "Graphite", "de": "Graphit", "ro": "Grafit", "bg": "Графит", "pl": "Grafit", "uk": "Графіт", "uz": "Grafit", "tg": "Графит"
  }
};

const files = [
  'mobile_app_flutter/assets/i18n.json',
  'src/assets/i18n.json'
];

for (const file of files) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    Object.assign(data, newTranslations);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
