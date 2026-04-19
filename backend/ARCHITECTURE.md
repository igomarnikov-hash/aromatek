# АромаПро - Архитектура бэкенда

## Обзор системы

АромаПро - это система управления производством воздухоароматизаторов, разработанная на Node.js/Express с использованием SQLite для хранения данных.

## Технологический стек

- **Runtime:** Node.js
- **Framework:** Express 4.18.2
- **Database:** SQLite3 (better-sqlite3)
- **Middleware:** CORS, Morgan (логирование)
- **Язык:** JavaScript (CommonJS)

## Архитектурные слои

```
┌─────────────────────────────────┐
│   Frontend (React/Vue на 5173)   │
└──────────────────┬──────────────┘
                   │ HTTP/JSON
                   ▼
┌─────────────────────────────────┐
│   Express Server (Port 3001)     │
│  ┌───────────────────────────────┤
│  │ Routes Layer (6 modules)       │
│  │  ├─ auth.js (логин)           │
│  │  ├─ materials.js (склад)      │
│  │  ├─ techcards.js (рецепты)    │
│  │  ├─ tasks.js (задачи)         │
│  │  ├─ dashboard.js (статистика) │
│  │  └─ events.js (события)       │
│  └───────────────────────────────┤
│  ┌───────────────────────────────┤
│  │ Database Layer (SQLite)        │
│  │  ├─ users                      │
│  │  ├─ materials                  │
│  │  ├─ tech_cards                 │
│  │  ├─ tech_card_items            │
│  │  ├─ production_tasks           │
│  │  └─ events                     │
│  └───────────────────────────────┤
└─────────────────────────────────┘
         │
         ▼
    production.db
```

## Компоненты

### 1. server.js
Главный файл приложения, инициализирует Express, настраивает middleware и подключает маршруты.

**Middleware:**
- CORS (для фронтенда на 5173)
- Morgan (HTTP логирование)
- Express JSON (парсинг JSON тела запроса)

### 2. database.js
Инициализирует SQLite БД и содержит функции для создания таблиц и заполнения демо-данными.

**Функции:**
- `initDatabase()` - Создает таблицы и инициализирует БД
- `seedDatabase()` - Заполняет БД тестовыми данными

### 3. routes/ (маршруты)

#### auth.js
Управление аутентификацией и список пользователей.

**Endpoints:**
- `GET /users` - Все пользователи
- `POST /auth/login` - Вход (user_id)

#### materials.js
CRUD операции для управления материалами на складе.

**Endpoints:**
- `GET /materials` - Список с фильтрацией
- `GET /materials/:id` - Деталь материала
- `POST /materials` - Создание
- `PUT /materials/:id` - Обновление
- `GET /materials/alerts` - Критически низкие остатки
- `POST /materials/:id/receive` - Приемка на склад
- `POST /materials/:id/consume` - Списание со склада

#### techcards.js
Управление технологическими картами (рецептами).

**Endpoints:**
- `GET /techcards` - Все тех. карты с материалами
- `GET /techcards/:id` - Деталь тех. карты
- `POST /techcards` - Создание
- `PUT /techcards/:id` - Обновление

**Особенности:**
- Автоматический JOIN с материалами
- Парсинг JSON массива steps

#### tasks.js
Управление производственными задачами.

**Endpoints:**
- `GET /tasks` - Список с фильтрацией
- `GET /tasks/:id` - Деталь задачи
- `POST /tasks` - Создание
- `PUT /tasks/:id` - Обновление
- `POST /tasks/:id/start` - Начало выполнения
- `POST /tasks/:id/complete` - Завершение (с авто-списанием материалов)
- `POST /tasks/:id/defect` - Регистрация брака

**Критическая логика:**
При завершении задачи происходит автоматическое списание материалов из склада на основе:
- Рецепта (tech_card_items)
- Количества произведенной продукции
- Стандартной нормы расхода на единицу

#### dashboard.js
Аналитика и статистика производства.

**Endpoints:**
- `GET /dashboard` - Панель с метриками

**Метрики:**
- Задачи и производство за сегодня
- Активные и ожидающие задачи
- Завершено задач сегодня
- Процент дефектов (качество)
- Критические материалы
- 5 материалов с наименьшим уровнем
- 10 последних событий
- Распределение задач по статусам

#### events.js
Логирование и просмотр всех событий в системе.

**Endpoints:**
- `GET /events` - Лента с пагинацией

**События логируются при:**
- Входе в систему
- Создании/обновлении материалов
- Запуске/завершении задач
- Регистрации брака

## Database Schema

### users
```
id INTEGER PRIMARY KEY
name TEXT NOT NULL
role TEXT (admin|technologist|production_manager|warehouse|operator)
avatar_color TEXT (hex color)
created_at DATETIME
```

### materials
```
id INTEGER PRIMARY KEY
name TEXT NOT NULL
category TEXT (paper|plastic|oil|packaging|label)
unit TEXT (шт|л|кг|м)
quantity REAL
min_quantity REAL (триггер для alerts)
batch_number TEXT
created_at DATETIME
updated_at DATETIME
```

### tech_cards
```
id INTEGER PRIMARY KEY
name TEXT NOT NULL
description TEXT
version TEXT
is_active INTEGER (1|0)
duration_minutes INTEGER
steps TEXT (JSON array)
created_at DATETIME
updated_at DATETIME
```

### tech_card_items
```
id INTEGER PRIMARY KEY
tech_card_id INTEGER FK
material_id INTEGER FK
quantity_per_unit REAL (норма на 1 единицу продукции)
```

### production_tasks
```
id INTEGER PRIMARY KEY
tech_card_id INTEGER FK
assigned_to INTEGER FK (user_id)
quantity_planned REAL
quantity_produced REAL
quantity_defect REAL
defect_reason TEXT
status TEXT (planned|in_progress|quality_check|completed|cancelled)
priority TEXT (low|medium|high)
due_date TEXT
start_time DATETIME
end_time DATETIME
created_at DATETIME
```

### events
```
id INTEGER PRIMARY KEY
user_id INTEGER FK
action TEXT
details TEXT
created_at DATETIME
```

## Потоки данных

### Создание производственной задачи
```
POST /api/tasks
  ↓
Проверка параметров
  ↓
INSERT в production_tasks
  ↓
Запись события в events
  ↓
Response с деталями задачи
```

### Завершение производственной задачи
```
POST /api/tasks/:id/complete
  ↓
Получение данных задачи
  ↓
UPDATE production_tasks (status, quantity_produced, end_time)
  ↓
Получение рецепта (tech_cards)
  ↓
Получение материалов из рецепта (tech_card_items)
  ↓
Для каждого материала:
  - Вычислить необходимое количество
  - UPDATE материала (уменьшить quantity)
  ↓
INSERT события в events
  ↓
Response с обновленной задачей
```

### Получение статистики
```
GET /api/dashboard
  ↓
Параллельное выполнение 8 SQL запросов:
  - Задачи за сегодня
  - Активные задачи
  - Ожидающие задачи
  - Завершено сегодня
  - Статистика дефектов
  - Критические материалы
  - Материалы с низким уровнем
  - События (JOIN с users)
  ↓
Агрегирование результатов
  ↓
Response с объединенными данными
```

## Обработка ошибок

Все маршруты обернуты в try-catch блоки:
- 200 OK - Успешно
- 201 Created - Ресурс создан
- 400 Bad Request - Ошибка валидации
- 404 Not Found - Ресурс не найден
- 500 Internal Server Error - Ошибка сервера

Глобальный error handler в server.js логирует ошибки и возвращает JSON.

## Performance Optimizations

1. **SQLite WAL Mode** - Лучшая параллелизация чтения/записи
2. **Foreign Keys** - Включены для целостности данных
3. **Индексы** (по умолчанию на PK)
4. **better-sqlite3** - Синхронный драйвер, блокирует только при записи

## Безопасность (базовая)

⚠️ **Текущая реализация для демонстрации\!**

Рекомендации для production:
- Добавить JWT аутентификацию
- Добавить авторизацию (проверка role)
- Валидация входных данных (joi/zod)
- Rate limiting
- HTTPS
- SQL injection защита (параметризованные запросы - уже используются)

## Масштабируемость

**Текущее решение подходит для:**
- Малых предприятий (до 100 сотрудников)
- Тестирования и демонстрации
- Прототипирования

**Для большего масштаба:**
- Миграция на PostgreSQL
- Добавить Redis для кэширования
- Микросервисная архитектура
- Message Queue (RabbitMQ, Kafka)
- Horizontal scaling с load balancer

## Деплоймент

```bash
# Локальная разработка
npm run dev

# Production
npm install --production
npm start

# Docker
docker build -t aromapro-backend .
docker run -p 3001:3001 aromapro-backend
```
