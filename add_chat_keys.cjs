const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "src", "lib", "i18n.tsx");
let content = fs.readFileSync(targetPath, "utf8");

const keysToAdd = {
  "chat.notifications.disabled": { ru: "Уведомления отключены", en: "Notifications disabled" },
  "chat.notifications.enabled": { ru: "Уведомления включены", en: "Notifications enabled" },
  "chat.sidebar.main": { ru: "Основные", en: "Main" },
  "chat.info.title": { ru: "Информация о чате", en: "Chat info" },
  "chat.media.title": { ru: "Вложенные медиа", en: "Attached media" },
  "chat.menu.enableNotif": { ru: "Включить уведомления", en: "Enable notifications" },
  "chat.menu.disableNotif": { ru: "Отключить уведомления", en: "Disable notifications" },
  "chat.menu.clearHistory": { ru: "Очистить историю", en: "Clear history" },
  "chat.info.name": { ru: "Название", en: "Name" },
  "chat.info.type": { ru: "Тип чата", en: "Chat type" },
  "chat.type.general": {
    ru: "Общий канал (для всей команды)",
    en: "General channel (for whole team)",
  },
  "chat.type.direct": { ru: "Личные сообщения (приватный)", en: "Direct messages (private)" },
  "chat.type.site": { ru: "Чат объекта", en: "Site chat" },
  "chat.info.notifications": { ru: "Уведомления", en: "Notifications" },
  "chat.info.notif.disabled": { ru: "Отключены", en: "Disabled" },
  "chat.info.notif.enabled": { ru: "Включены", en: "Enabled" },
  "chat.info.additional": { ru: "Дополнительно", en: "Additional" },
  "chat.media.select": { ru: "Выбрать", en: "Select" },
  "chat.media.cancel": { ru: "Отмена", en: "Cancel" },
  "chat.media.delete": { ru: "Удалить", en: "Delete" },
  "chat.media.deleteConfirm": {
    ru: "Удалить {{count}} фото? Это удалит и соответствующие сообщения из чата.",
    en: "Delete {{count}} photos? This will also remove the corresponding messages from the chat.",
  },
  "chat.sidebar.noUsers": { ru: "Нет пользователей", en: "No users" },
  "chat.sidebar.noActiveChats": { ru: "Нет активных чатов", en: "No active chats" },
  "chat.sidebar.loading": { ru: "Загрузка...", en: "Loading..." },
  "chat.sidebar.sites": { ru: "Объекты", en: "Sites" },
};

let toInsert = "";
for (const [key, value] of Object.entries(keysToAdd)) {
  toInsert += `  "${key}": {\n    ru: "${value.ru}",\n    en: "${value.en}"\n  },\n`;
}

// Find chat.tabSite block and insert after it
const marker = `"chat.tabSite": {`;
const markerIndex = content.indexOf(marker);
if (markerIndex === -1) {
  console.log("Marker not found!");
  process.exit(1);
}

const endOfBlock = content.indexOf("},", markerIndex);
if (endOfBlock === -1) {
  console.log("End of block not found!");
  process.exit(1);
}

const insertPos = endOfBlock + 3; // after `},\n`
const newContent = content.slice(0, insertPos) + toInsert + content.slice(insertPos);

fs.writeFileSync(targetPath, newContent, "utf8");
console.log("Inserted keys into i18n.tsx");
