const fs = require("fs");
const https = require("https");

const texts = {
  "modal.privacy.p1":
    "Настоящая Политика конфиденциальности описывает, как DMAG собирает, использует и защищает вашу личную информацию при использовании нашей платформы.",
  "modal.privacy.h1": "1. Сбор данных",
  "modal.privacy.p2":
    "Мы собираем данные о вашем местоположении (GPS) исключительно в рабочее время для построения маршрутов и оптимизации логистики. Данные геопозиции не собираются во время перерывов на обед и после завершения смены.",
  "modal.privacy.h2": "2. Использование фотоотчётов",
  "modal.privacy.p3":
    "Фотографии, загруженные через систему фотоотчётов, привязываются к конкретным объектам и используются только в рамках рабочих процессов и контроля качества.",
  "modal.privacy.h3": "3. Безопасность",
  "modal.privacy.p4":
    "Мы применяем современные стандарты шифрования для защиты вашей учётной записи и персональных данных.",
  "modal.terms.p1":
    "Используя корпоративный портал DMAG, вы соглашаетесь с внутренними правилами компании и настоящими условиями.",
  "modal.terms.li1": "Сотрудник обязан своевременно отмечать начало и конец смены.",
  "modal.terms.li2":
    "Отчёты по объектам должны загружаться непосредственно с места выполнения работ.",
  "modal.terms.li3": "Запрещается передача учётных данных третьим лицам.",
  "modal.terms.p2":
    "Нарушение данных условий может привести к дисциплинарным взысканиям в соответствии с корпоративной политикой.",
  "modal.support.title": "Нужна помощь?",
  "modal.support.desc":
    "Свяжитесь с диспетчерской или вашим куратором для решения технических проблем.",
  "modal.support.hotline": "Горячая линия (24/7)",
};

const langs = ["en", "de", "ro", "bg", "pl", "uk", "uz", "tg"];

async function translate(text, targetLang) {
  return new Promise((resolve) => {
    https.get(
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=" +
        targetLang +
        "&dt=t&q=" +
        encodeURIComponent(text),
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json[0].map((x) => x[0]).join(""));
          } catch {
            resolve(text);
          }
        });
      },
    );
  });
}

async function run() {
  console.log("Translating...");
  const results = {};
  for (const [key, text] of Object.entries(texts)) {
    results[key] = { ru: text };
    for (const lang of langs) {
      results[key][lang] = await translate(text, lang);
    }
    console.log("Translated " + key);
  }

  let i18n = fs.readFileSync("src/lib/i18n.tsx", "utf8");
  let newEntries = "";
  for (const [key, trans] of Object.entries(results)) {
    newEntries +=
      '  "' +
      key +
      '": { ' +
      Object.entries(trans)
        .map(([k, v]) => k + ": " + JSON.stringify(v))
        .join(", ") +
      " },\n";
  }

  i18n = i18n.replace("};\n\ntype Ctx", newEntries + "};\n\ntype Ctx");
  fs.writeFileSync("src/lib/i18n.tsx", i18n, "utf8");
  console.log("Done");
}

run();
