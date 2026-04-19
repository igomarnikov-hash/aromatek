# АромаПро - Backend Setup

## Установка и запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск сервера

**Режим разработки (с автоперезагрузкой):**
```bash
npm run dev
```

**Режим production:**
```bash
npm start
```

Сервер запустится на `http://localhost:3001`

## Структура проекта

```
backend/
├── server.js              # Главный файл приложения
├── database.js            # Инициализация БД и seed данные
├── package.json           # Зависимости
├── production.db          # SQLite база данных (создается автоматически)
└── routes/
    ├── auth.js           # Аутентификация пользователей
    ├── materials.js      # Управление материалами
    ├── techcards.js      # Технологические карты
    ├── tasks.js          # Производственные задачи
    ├── dashboard.js      # Аналитика и статистика
    └── events.js         # Логирование событий
```

## API Endpoints

### Пользователи
- `GET /api/users` - Список всех пользователей
- `POST /api/auth/login` - Вход в систему (user_id)

### Материалы
- `GET /api/materials` - Список материалов
- `GET /api/materials/:id` - Деталь материала
- `POST /api/materials` - Создать материал
- `PUT /api/materials/:id` - Обновить материал
- `GET /api/materials/alerts` - Критически низкие остатки
- `POST /api/materials/:id/receive` - Получение материала на склад
- `POST /api/materials/:id/consume` - Списание материала

### Технологические карты
- `GET /api/techcards` - Список всех тех. карт
- `GET /api/techcards/:id` - Деталь тех. карты с материалами
- `POST /api/techcards` - Создать новую тех. карту
- `PUT /api/techcards/:id` - Обновить тех. карту

### Производственные задачи
- `GET /api/tasks` - Список задач (фильтры: status, assigned_to)
- `GET /api/tasks/:id` - Деталь задачи
- `POST /api/tasks` - Создать новую задачу
- `PUT /api/tasks/:id` - Обновить задачу
- `POST /api/tasks/:id/start` - Начать выполнение задачи
- `POST /api/tasks/:id/complete` - Завершить задачу (авто-списание материалов)
- `POST /api/tasks/:id/defect` - Зафиксировать брак

### Панель управления
- `GET /api/dashboard` - Статистика: активные задачи, производство сегодня, дефекты, критические материалы

### События
- `GET /api/events` - Лента событий (с пагинацией)

## Database Schema

**users** - Пользователи системы (id, name, role, avatar_color)
**materials** - Материалы на складе (id, name, category, unit, quantity, min_quantity, batch_number)
**tech_cards** - Технологические карты (id, name, description, version, steps, duration_minutes)
**tech_card_items** - Связь материалов и тех. карт (tech_card_id, material_id, quantity_per_unit)
**production_tasks** - Производственные задачи (id, tech_card_id, assigned_to, quantity_planned, quantity_produced, quantity_defect, status, priority)
**events** - Логирование действий в системе (id, user_id, action, details, created_at)

## Роли пользователей

- **admin** - Администратор (полный доступ)
- **technologist** - Технолог (создание и редактирование тех. карт)
- **production_manager** - Менеджер производства (управление задачами)
- **warehouse** - Кладовщик (управление материалами)
- **operator** - Оператор (выполнение задач)

## Особенности

✅ SQLite с WAL режимом для лучшей параллелизации
✅ Автоматическое списание материалов при завершении задачи
✅ Отслеживание всех действий в системе (events)
✅ Демонстрационные данные для тестирования
✅ CORS настроен для фронтенда на localhost:5173
✅ Логирование всех HTTP запросов (morgan)
