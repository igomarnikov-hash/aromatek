# АромаПро Backend - Список файлов проекта

## Основные файлы приложения

### Точка входа
- **server.js** (29 строк)
  - Инициализация Express приложения
  - Настройка middleware (CORS, morgan, JSON parser)
  - Подключение всех маршрутов
  - Глобальный error handler
  - Запуск сервера на порту 3001

### База данных
- **database.js** (157 строк)
  - Инициализация SQLite3 с better-sqlite3
  - Включение WAL режима и Foreign Keys
  - Создание 6 таблиц (users, materials, tech_cards, etc)
  - Функция seedDatabase() с демо-данными
  - 5 пользователей с разными ролями
  - 9 материалов на складе
  - 4 технологические карты
  - 6 производственных задач
  - 8 событий в системе

### Конфигурация
- **package.json** (21 строка)
  - name: production-management-backend
  - version: 1.0.0
  - Зависимости:
    - express ^4.18.2
    - better-sqlite3 ^9.0.0
    - cors ^2.8.5
    - morgan ^1.10.0
  - Scripts: start, dev

- **.gitignore**
  - node_modules/
  - *.db, *.db-shm, *.db-wal
  - .env, .DS_Store
  - logs/, *.log

## API Routes (6 основных модулей)

### 1. Аутентификация (routes/auth.js) - 27 строк
**Endpoints:**
- `GET /api/users` - Список всех пользователей
- `POST /api/auth/login` - Вход в систему (user_id)

**Функции:**
- Возврат основной информации пользователя
- Логирование входа в события

---

### 2. Материалы (routes/materials.js) - 92 строки
**Endpoints:**
- `GET /api/materials` - Список всех материалов с фильтрацией
  - Параметры: search, category
- `GET /api/materials/:id` - Деталь материала
- `POST /api/materials` - Создание нового материала
- `PUT /api/materials/:id` - Обновление материала
- `GET /api/materials/alerts` - Материалы с критически низким уровнем
- `POST /api/materials/:id/receive` - Приемка материала на склад
- `POST /api/materials/:id/consume` - Списание материала со склада

**Функции:**
- CRUD операции для материалов
- Фильтрация по названию и категории
- Контроль минимальных уровней
- Отслеживание партий (batch_number)

---

### 3. Технологические карты (routes/techcards.js) - 72 строки
**Endpoints:**
- `GET /api/techcards` - Все тех. карты с материалами
- `GET /api/techcards/:id` - Деталь карты с полным рецептом
- `POST /api/techcards` - Создание новой карты
- `PUT /api/techcards/:id` - Обновление карты

**Функции:**
- Управление рецептами ароматизаторов
- Связь с материалами через tech_card_items
- Парсинг JSON массива steps (процесс производства)
- JOIN с таблицей материалов для получения полной информации
- Версионирование (version field)

---

### 4. Производственные задачи (routes/tasks.js) - 115 строк
**Endpoints:**
- `GET /api/tasks` - Список задач с фильтрацией
  - Параметры: status, assigned_to
- `GET /api/tasks/:id` - Деталь задачи с именем исполнителя
- `POST /api/tasks` - Создание новой задачи
- `PUT /api/tasks/:id` - Обновление задачи
- `POST /api/tasks/:id/start` - Начало выполнения (status→in_progress)
- `POST /api/tasks/:id/complete` - Завершение задачи (★ ключевой функционал)
- `POST /api/tasks/:id/defect` - Регистрация брака

**★ КРИТИЧЕСКАЯ ЛОГИКА (завершение задачи):**
1. Получает рецепт (tech_card)
2. Получает все материалы из рецепта (tech_card_items)
3. Для каждого материала вычисляет: quantity_per_unit * quantity_produced
4. Автоматически списывает материалы со склада
5. Обновляет статус задачи на completed
6. Записывает событие в систему

---

### 5. Аналитика (routes/dashboard.js) - 42 строки
**Endpoints:**
- `GET /api/dashboard` - Полная панель управления

**Метрики:**
- today.plan - Плановое производство за сегодня
- today.produced - Фактическое производство сегодня
- today.tasks - Количество задач за сегодня
- active_tasks - Задачи в процессе
- pending_tasks - Ожидающие задачи
- completed_today - Завершено сегодня
- defect_rate - Процент дефектов (%качество)
- critical_materials - Количество материалов ниже минимума
- materials - 5 материалов с наименьшим уровнем
- recent_events - 10 последних событий (с JOIN пользователей)
- tasks_by_status - Распределение задач по статусам

---

### 6. События (routes/events.js) - 24 строки
**Endpoints:**
- `GET /api/events` - Лента событий с пагинацией
  - Параметры: page, limit (по умолчанию 20)

**Функции:**
- Просмотр истории всех действий
- JOIN с таблицей пользователей
- Пагинация для больших наборов данных
- Сортировка по времени создания (DESC)

---

## Документация (5 файлов)

### SETUP.md
- Инструкция по установке зависимостей
- Команды запуска (dev и production)
- Полная структура проекта
- Описание всех endpoints
- Schema базы данных
- Описание ролей и демо-данных

### API_EXAMPLES.md
- 20+ примеров использования API (curl)
- Примеры для каждого endpoint
- Примеры фильтрации и параметров
- Примеры создания/обновления ресурсов
- Примеры статусов и приоритетов
- Полный справочник категорий и ролей

### ARCHITECTURE.md
- Обзор технологического стека
- Диаграмма архитектуры (ASCII art)
- Подробное описание всех компонентов
- Database schema с типами и constraints
- Потоки данных (flow diagrams)
- Performance optimizations
- Рекомендации по безопасности
- Рекомендации по масштабируемости

### PROJECT_SUMMARY.txt
- Краткий обзор проекта
- Список возможностей
- Быстрый старт
- Описание ролей
- Контакты демо-пользователей
- Примеры ароматизаторов

### QUICKSTART.txt
- 5 шагов установки и запуска
- Примеры проверки работоспособности
- Список демо-пользователей
- Решение распространенных проблем
- Полезные ссылки

### FILES_MANIFEST.md (этот файл)
- Полный список всех файлов
- Описание каждого файла
- Количество строк кода

---

## Database Schema

### users (5 полей)
```
id              INTEGER PRIMARY KEY
name            TEXT NOT NULL
role            TEXT (admin|technologist|production_manager|warehouse|operator)
avatar_color    TEXT (hex color code)
created_at      DATETIME
```

### materials (8 полей)
```
id              INTEGER PRIMARY KEY
name            TEXT NOT NULL
category        TEXT (paper|plastic|oil|packaging|label)
unit            TEXT (шт|л|кг|м)
quantity        REAL
min_quantity    REAL (для alert если quantity <= min_quantity)
batch_number    TEXT (отслеживание партий)
created_at      DATETIME
updated_at      DATETIME
```

### tech_cards (7 полей)
```
id              INTEGER PRIMARY KEY
name            TEXT NOT NULL
description     TEXT
version         TEXT (e.g. "2.1")
is_active       INTEGER (1 or 0)
duration_minutes INTEGER (время производства)
steps           TEXT (JSON array строк процесса)
created_at      DATETIME
updated_at      DATETIME
```

### tech_card_items (4 поля) - связь материалов и рецептов
```
id              INTEGER PRIMARY KEY
tech_card_id    INTEGER FK → tech_cards.id (CASCADE delete)
material_id     INTEGER FK → materials.id
quantity_per_unit REAL (норма расхода на 1 единицу продукции)
```

### production_tasks (12 полей)
```
id              INTEGER PRIMARY KEY
tech_card_id    INTEGER FK → tech_cards.id
assigned_to     INTEGER FK → users.id (исполнитель)
quantity_planned REAL (плановое количество)
quantity_produced REAL (фактически произведено)
quantity_defect REAL (выявлено дефектных)
defect_reason   TEXT (причина брака)
status          TEXT (planned|in_progress|quality_check|completed|cancelled)
priority        TEXT (low|medium|high)
due_date        TEXT (YYYY-MM-DD)
start_time      DATETIME (когда начали)
end_time        DATETIME (когда завершили)
created_at      DATETIME
```

### events (5 полей) - логирование
```
id              INTEGER PRIMARY KEY
user_id         INTEGER FK → users.id
action          TEXT (описание действия)
details         TEXT (дополнительная информация)
created_at      DATETIME
```

---

## Демо-данные

### Пользователи (5 шт)
1. Александр Петров (admin) - #2563eb
2. Мария Сидорова (technologist) - #7c3aed
3. Иван Иванов (production_manager) - #0891b2
4. Елена Федорова (warehouse) - #d97706
5. Николай Сергеев (operator) - #16a34a

### Материалы (9 шт)
- 4 вида масел (лимон, новый авто, ваниль, лаванда)
- 2 вида бумажных материалов
- 1 пластиковый материал
- 1 упаковка
- 1 этикетка

### Технологические карты (4 шт)
- Ароматизатор подвесной Лимон (v2.1, 45 мин)
- Ароматизатор подвесной Новый автомобиль (v1.8, 45 мин)
- Ароматизатор на панель Лаванда (v1.5, 60 мин)
- Ароматизатор на вентиляцию Ваниль (v2.0, 30 мин)

### Производственные задачи (6 шт)
- 2 "in_progress" - текущие задачи
- 3 "planned" - плановые задачи
- 1 "completed" - завершенная задача (Ваниль)
- 1 "quality_check" - на проверке качества

### События (8 шт)
- История всех действий в системе
- Разные типы: запуск, завершение, брак, получение материалов

---

## Статистика проекта

**Итого строк кода:** 558 строк
- server.js: 29 строк
- database.js: 157 строк
- auth.js: 27 строк
- materials.js: 92 строк
- tasks.js: 115 строк
- techcards.js: 72 строк
- dashboard.js: 42 строк
- events.js: 24 строк

**Документация:**
- SETUP.md: ~150 строк
- API_EXAMPLES.md: ~300 строк
- ARCHITECTURE.md: ~400 строк
- PROJECT_SUMMARY.txt: ~200 строк
- QUICKSTART.txt: ~100 строк

**Файлы конфигурации:**
- package.json: 21 строка
- .gitignore: 7 строк

**Всего с документацией: >1200 строк**

---

## Путь к проекту

```
/Users/admin/Documents/Claude/Projects/SaaS/production-system/backend/
```

Проверить структуру:
```bash
cd /Users/admin/Documents/Claude/Projects/SaaS/production-system/backend
find . -type f -name "*.js" -o -name "*.json" -o -name "*.md" | grep -v node_modules | sort
```

---

## Готово к использованию

Все файлы созданы и готовы к:
✅ Установке (npm install)
✅ Запуску (npm run dev)
✅ Тестированию (curl примеры)
✅ Разработке (хорошо структурированный код)
✅ Документированию (полная документация на русском)
