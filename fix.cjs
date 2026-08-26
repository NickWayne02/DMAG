const fs = require("fs");
let code = fs.readFileSync("src/lib/i18n.tsx", "utf8");

const deTranslations = {
  "admin.reports.searchDesc": "Nach Beschreibung suchen...",
  "admin.reports.sitePlaceholder": "Objekt",
  "admin.reports.allSites": "Alle Objekte",
  "admin.reports.periodPlaceholder": "Zeitraum",
  "admin.reports.allTime": "Gesamte Zeit",
  "admin.reports.today": "Heute",
  "admin.reports.week": "Letzte 7 Tage",

  "admin.users.search": "Benutzer suchen...",
  "admin.users.colStatus": "Status",
  "admin.users.colLastLogin": "Letzter Login",
  "admin.users.online": "Online",
  "admin.users.noData": "Keine Daten",
  "admin.users.moderation": "Moderation",

  "chat.notifications.disabled": "Benachrichtigungen deaktiviert",
  "chat.notifications.enabled": "Benachrichtigungen aktiviert",
  "chat.sidebar.main": "HAUPT",
  "chat.info.title": "Chat-Info",
  "chat.media.noMedia": "Keine angehängten Medien",
  "chat.media.title": "Angehängte Medien",
  "chat.menu.enableNotif": "Benachrichtigungen aktivieren",
  "chat.menu.disableNotif": "Benachrichtigungen deaktivieren",
  "chat.menu.clearHistory": "Verlauf löschen",
  "chat.info.name": "Name",
  "chat.info.type": "Chat-Typ",
  "chat.type.general": "Allgemeiner Kanal (für das gesamte Team)",
  "chat.type.direct": "Direktnachrichten (privat)",
  "chat.type.site": "Objekt-Chat",
  "chat.info.notifications": "Benachrichtigungen",
  "chat.info.notif.disabled": "Deaktiviert",
  "chat.info.notif.enabled": "Aktiviert",
  "chat.info.additional": "Zusätzlich",
  "chat.media.select": "Auswählen",
  "chat.media.cancel": "Abbrechen",
  "chat.media.delete": "Löschen",
  "chat.media.deleteConfirm":
    "{{count}} Fotos löschen? Dadurch werden auch die entsprechenden Nachrichten aus dem Chat entfernt.",
  "chat.sidebar.noUsers": "Keine Benutzer",
  "chat.sidebar.noActiveChats": "Keine aktiven Chats",
  "chat.sidebar.loading": "Wird geladen...",
  "chat.sidebar.sites": "OBJEKTE",
};

for (const [key, trans] of Object.entries(deTranslations)) {
  const regex = new RegExp('("' + key + '": \\{[^}]*?)(\\})', "s");
  code = code.replace(regex, (match, p1, p2) => {
    if (p1.includes("de:")) return match;
    return p1 + '    de: "' + trans + '",\n  }';
  });
}

fs.writeFileSync("src/lib/i18n.tsx", code);
console.log("Done replacing DE translations");
