# Workforce & Shift Management Platform (Web + Flutter Mobile + Supabase)

Комплексная мультибрендовая (White-Label) платформа для учёта рабочего времени, GPS-контроля объектов, фотоотчётов, корпоративного чата и управления персоналом. Включает веб-портал (React / TanStack Start) и нативные мобильные приложения (Flutter для Android и iOS).

---

## Основные возможности

### Для сотрудников и бригадиров
- **Учёт смен и перерывов в реальном времени:** старт/пауза (обед)/завершение смены с таймером, фоновым уведомлением на Android и защитой от потери состояния.
- **GPS-привязка и автоопределение города:** фиксация координат начала и окончания смены, обратное геокодирование (OpenStreetMap Nominatim), выбор строительного объекта из базы или работа по GPS.
- **Фотоотчёты с редактором изображений:** загрузка фото с камеры или галереи, встроенный графический редактор (аннотации, стрелки, текст, кадрирование), статусы важности (`Инфо`, `Важно`, `Срочно`).
- **Корпоративный чат (Realtime):** общий, бригадирский и объектные чаты, прикрепление фото, ответы на сообщения directly из push-уведомлений, индикация онлайн-статуса.
- **Календарь и история смен:** просмотр отработанных часов по дням и месяцам.

### Для администраторов и супер-админов (Admin Console)
- **Мониторинг персонала:** живой дашборд активных смен, статусов (`На смене`, `На паузе`, `Завершена`, `Офлайн`) и онлайн-присутствия (Supabase Presence).
- **Редактируемый табель и календарь:** ручное добавление, редактирование и удаление смен любому сотруднику, экспорт отчётов в **Excel (XLSX)** и **PDF**.
- **Управление объектами (площадками):** создание объектов с мультиязычными названиями, адресом и быстрым заполнением координат по GPS.
- **Мультибрендинг и мульти-фирмы (White-Label):** фильтрация персонала, объектов и смен по фирмам/брендам, загрузка кастомного логотипа и названия приложения из админ-панели, динамическая смена иконки приложения на Android.
- **Управление пользователями и модерация:** подтверждение новых регистраций, назначение ролей (`employee`, `brigadier`, `admin`, `super_admin`), сброс паролей и логинов, контроль активных сессий.
- **Мультиязычность (9 языков) и кастомизация темы:** `RU`, `EN`, `DE`, `RO`, `BG`, `PL`, `UK`, `UZ`, `TG`; светлая, тёмная, неоновая и кастомная цветовые темы.

---

## Технологический стек

| Слой | Технологии |
| :--- | :--- |
| **Web / Admin Portal** | React 19, TypeScript, TanStack Start / Router, Tailwind CSS v4, Radix UI, Lucide Icons, JSPDF, SheetJS (XLSX) |
| **Mobile App (Native)** | Flutter 3 (Dart), Provider, Geolocator, Flutter Local Notifications, Firebase Messaging, Dynamic Icon Plus |
| **Hybrid Wrapper (опц.)** | Capacitor 8 (Android / iOS) |
| **Backend & Database** | Supabase (PostgreSQL, Row Level Security, Realtime Channels & Presence, Auth, Storage) |
| **Serverless Push & Admin** | Supabase Edge Functions (Deno 2) + Firebase Cloud Messaging (FCM HTTP v1 API) |
| **CI/CD** | GitHub Actions (автосборка APK и IPA) |

---

## Структура проекта

```text
├── .github/workflows/       # Пайплайны GitHub Actions для автосборки Android (APK) и iOS (IPA)
├── mobile_app_flutter/      # Нативное мобильное приложение на Flutter (Android / iOS / Web)
│   ├── lib/config/          # Единый конфиг бренда и окружения (app_brand_config.dart)
│   ├── lib/providers/       # Стейт-менеджмент (смены, настройки, локализация, тема, админ-стейт)
│   ├── lib/screens/         # Экраны сотрудника, чата и Admin Console
│   └── lib/services/        # Авторизация, геолокация, хранилище, локальные и push-уведомления
├── public/                  # Статика веб-приложения и Service Worker (firebase-messaging-sw.js)
├── src/                     # Исходный код веб-портала (React 19 + TanStack Start)
│   ├── components/          # UI-компоненты, админ-панель, календарь, фотоотчёты, чат
│   ├── integrations/        # Клиентский и серверный SDK Supabase
│   └── routes/              # Маршруты и серверные API-хэндлеры (/api/users/*)
├── supabase/                # Конфигурация БД и серверных функций
│   ├── functions/           # Deno Edge Functions (push-уведомления, смена ролей, сброс паролей)
│   ├── migrations/          # SQL-миграции схемы БД, триггеров и политик RLS
│   └── init.sql             # Базовый SQL-скрипт инициализации
└── .env.example             # Шаблон переменных окружения
```

---

## Быстрый старт и развёртывание с нуля

### 1. Подготовка проекта Supabase
1. Создайте новый проект на [supabase.com](https://supabase.com).
2. Примените SQL-миграции из папки `supabase/migrations/` через Supabase CLI или SQL Editor:
   ```bash
   npx supabase link --project-ref <ВАШ_PROJECT_ID>
   npx supabase db push
   ```
3. В разделе **Storage** убедитесь, что созданы публичные бакеты:
   - `photo_reports` (для фотоотчётов и вложений чата)
   - `avatars` (для аватаров сотрудников и логотипов брендов)

### 2. Настройка переменных окружения (Web)
Скопируйте `.env.example` в `.env` и заполните ключи вашего проекта Supabase и Firebase:
```bash
cp .env.example .env
```
- `SUPABASE_URL` / `VITE_SUPABASE_URL` — URL вашего проекта Supabase.
- `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` — публичный `anon` ключ.
- `SUPABASE_SERVICE_ROLE_KEY` — серверный `service_role` ключ (используется серверными роутами `/api/users/*` для создания/удаления пользователей).
- `VITE_FIREBASE_*` — параметры веб-приложения из консоли Firebase.

### 3. Развёртывание Supabase Edge Functions и Push-уведомлений (FCM)
1. В консоли Firebase (**Project Settings → Service accounts**) сгенерируйте приватный JSON-ключ сервисного аккаунта.
2. Сохраните JSON-ключ в секреты Supabase:
   ```bash
   npx supabase secrets set FIREBASE_SERVICE_ACCOUNT='<содержимое_service_account.json_в_одну_строку>'
   ```
3. Задеплойте Edge-функции:
   ```bash
   npx supabase functions deploy send-chat-push
   npx supabase functions deploy send-photo-report-push
   npx supabase functions deploy send-approval-push
   npx supabase functions deploy change-user-role
   npx supabase functions deploy admin-reset-credentials
   ```

### 4. Запуск и сборка Web-приложения
Установите зависимости и запустите dev-сервер:
```bash
npm ci
npm run dev
```
Веб-портал будет доступен на `http://localhost:5174`.

Сборка для продакшена:
```bash
npm run build
```

### 5. Настройка и сборка мобильного приложения (Flutter)
Все параметры подключения и брендинга во Flutter вынесены в [`mobile_app_flutter/lib/config/app_brand_config.dart`](mobile_app_flutter/lib/config/app_brand_config.dart) и поддерживают переопределение на этапе сборки через `--dart-define`:

| Параметр `--dart-define` | Описание |
| :--- | :--- |
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_ANON_KEY` | Публичный `anon` ключ Supabase |
| `APP_BRAND` | Идентификатор сборки (`dmag` — основная версия с мультибрендингом, `er` — изолированный клон) |
| `SUPPORT_PHONE` | Телефон службы поддержки в разделе «Помощь» |
| `AUTH_EMAIL_DOMAIN` | Технический домен для входа по логину без email |

Пример сборки релизного APK:
```bash
cd mobile_app_flutter
flutter pub get

# Основная сборка
flutter build apk --release \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key

# Сборка изолированного клона с отдельным Application ID
flutter build apk --release --dart-define=APP_BRAND=er
```

Для работы пуш-уведомлений на Android замените `mobile_app_flutter/android/app/google-services.json` на файл из вашего проекта Firebase.

---

## Роли пользователей в системе

- **`employee` (Сотрудник):** отметка смен и обедов по GPS, отправка фотоотчётов, участие в чатах, просмотр своего календаря.
- **`brigadier` (Бригадир):** все возможности сотрудника + доступ к бригадирскому каналу чата.
- **`admin` (Администратор):** доступ в Admin Console (мониторинг смен, редактирование календаря, управление объектами, отчётами и сотрудниками своей фирмы).
- **`super_admin` (Супер-админ):** полный доступ ко всем фирмам, управлению брендингом, ролями пользователей, модерации аккаунтов и удалению сообщений.

