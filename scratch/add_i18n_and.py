import json

keys = {
  "admin.moderation.and": {
    "ru": "и", "en": "and", "de": "und", "ro": "și", "bg": "и", "pl": "i", "uk": "та", "uz": "va", "tg": "ва"
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
