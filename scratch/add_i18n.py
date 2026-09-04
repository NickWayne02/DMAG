import json

keys = {
  "admin.moderation.title": {
    "ru": "Модерация",
    "en": "Moderation",
    "de": "Moderation",
    "ro": "Moderare",
    "bg": "Модерация",
    "pl": "Moderacja",
    "uk": "Модерація",
    "uz": "Moderatsiya",
    "tg": "Модератсия"
  },
  "admin.moderation.desc": {
    "ru": "Управление сообщениями в Общем и Личных чатах",
    "en": "Manage messages in General and Direct chats",
    "de": "Nachrichten in allgemeinen und direkten Chats verwalten",
    "ro": "Gestionați mesajele în chaturile generale și directe",
    "bg": "Управление на съобщения в Общи и Лични чатове",
    "pl": "Zarządzaj wiadomościami w ogólnych i prywatnych czatach",
    "uk": "Керування повідомленнями у Загальному та Особистих чатах",
    "uz": "Umumiy va shaxsiy chatlarda xabarlarni boshqarish",
    "tg": "Идоракунии паёмҳо дар чатҳои умумӣ ва шахсӣ"
  },
  "admin.moderation.general": {
    "ru": "Общий чат",
    "en": "General chat",
    "de": "Allgemeiner Chat",
    "ro": "Chat general",
    "bg": "Общ чат",
    "pl": "Czat ogólny",
    "uk": "Загальний чат",
    "uz": "Umumiy chat",
    "tg": "Чати умумӣ"
  },
  "admin.moderation.direct": {
    "ru": "Личные чаты",
    "en": "Direct chats",
    "de": "Direkte Chats",
    "ro": "Chaturi directe",
    "bg": "Лични чатове",
    "pl": "Czaty prywatne",
    "uk": "Особисті чати",
    "uz": "Shaxsiy chatlar",
    "tg": "Чатҳои шахсӣ"
  },
  "admin.moderation.no_direct_chats": {
    "ru": "Нет активных личных чатов",
    "en": "No active direct chats",
    "de": "Keine aktiven direkten Chats",
    "ro": "Nu există chaturi directe active",
    "bg": "Няма активни лични чатове",
    "pl": "Brak aktywnych czatów prywatnych",
    "uk": "Немає активних особистих чатів",
    "uz": "Faol shaxsiy chatlar yo'q",
    "tg": "Чатҳои шахсии фаъол нест"
  },
  "admin.moderation.no_messages": {
    "ru": "Нет сообщений в этой категории",
    "en": "No messages in this category",
    "de": "Keine Nachrichten in dieser Kategorie",
    "ro": "Nu există mesaje în această categorie",
    "bg": "Няма съобщения в тази категория",
    "pl": "Brak wiadomości w tej kategorii",
    "uk": "Немає повідомлень у цій категорії",
    "uz": "Ushbu turkumda xabarlar yo'q",
    "tg": "Дар ин категория паёмҳо нест"
  },
  "admin.moderation.back": {
    "ru": "Вернуться назад",
    "en": "Go back",
    "de": "Zurückgehen",
    "ro": "Întoarce-te",
    "bg": "Върни се",
    "pl": "Wróć",
    "uk": "Повернутися назад",
    "uz": "Orqaga qaytish",
    "tg": "Бозгашт"
  }
}

# Add to i18n.tsx
with open('src/lib/i18n.tsx', 'r', encoding='utf-8') as f:
    ts_code = f.read()

# build the typescript string
ts_addition = ""
for k, v in keys.items():
    ts_addition += f'  "{k}": {{\n'
    for lang, val in v.items():
        ts_addition += f'    {lang}: "{val}",\n'
    ts_addition += '  },\n'

ts_code = ts_code.replace('"admin.tab.moderation": {', ts_addition + '  "admin.tab.moderation": {')
with open('src/lib/i18n.tsx', 'w', encoding='utf-8') as f:
    f.write(ts_code)

# Add to i18n.json
with open('mobile_app_flutter/assets/i18n.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)

json_data.update(keys)

with open('mobile_app_flutter/assets/i18n.json', 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)

print("Done")
