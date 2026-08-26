const fs = require("fs");
let code = fs.readFileSync("src/lib/i18n.tsx", "utf8");
code = code.replace(
  /"chat\.media\.deleteConfirm": \{[\s\S]*?\},\s*"chat\.sidebar\.noUsers":/m,
  `"chat.media.deleteConfirm": {
    ru: "Удалить {{count}} фото? Это удалит и соответствующие сообщения из чата.",
    en: "Delete {{count}} photos? This will also remove the corresponding messages from the chat.",
    de: "{{count}} Fotos löschen? Dadurch werden auch die entsprechenden Nachrichten aus dem Chat entfernt."
  },
  "chat.sidebar.noUsers":`,
);
fs.writeFileSync("src/lib/i18n.tsx", code);
