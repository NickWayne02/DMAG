const fs = require('fs');

const keys = {
  "admin.moderation.chat": {
    ru: "Чат", en: "Chat", de: "Chat", ro: "Chat", bg: "Чат", pl: "Czat", uk: "Чат", uz: "Chat", tg: "Чат"
  },
  "admin.moderation.edit": {
    ru: "Редактировать", en: "Edit", de: "Bearbeiten", ro: "Editați", bg: "Редактиране", pl: "Edytuj", uk: "Редагувати", uz: "Tahrirlash", tg: "Таҳрир"
  },
  "admin.moderation.delete": {
    ru: "Удалить", en: "Delete", de: "Löschen", ro: "Șterge", bg: "Изтриване", pl: "Usuń", uk: "Видалити", uz: "O'chirish", tg: "Нест кардан"
  },
  "admin.moderation.unknown": {
    ru: "Неизвестный", en: "Unknown", de: "Unbekannt", ro: "Necunoscut", bg: "Неизвестен", pl: "Nieznany", uk: "Невідомий", uz: "Noma'lum", tg: "Номаълум"
  },
  "admin.moderation.cancel": {
    ru: "Отмена", en: "Cancel", de: "Abbrechen", ro: "Anulare", bg: "Отказ", pl: "Anuluj", uk: "Скасувати", uz: "Bekor qilish", tg: "Бекор кардан"
  },
  "admin.moderation.save": {
    ru: "Сохранить", en: "Save", de: "Speichern", ro: "Salvare", bg: "Запазване", pl: "Zapisz", uk: "Зберегти", uz: "Saqlash", tg: "Захира кардан"
  },
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

console.log('Done additional JS script');
