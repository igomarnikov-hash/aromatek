# АромаПро - Примеры использования API

## 1. Вход в систему

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Александр Петров",
    "role": "admin",
    "avatar_color": "#2563eb"
  }
}
```

## 2. Получить все пользователей

```bash
curl http://localhost:3001/api/users
```

## 3. Получить все материалы

```bash
curl http://localhost:3001/api/materials
```

## 4. Получить материалы с критически низким уровнем

```bash
curl http://localhost:3001/api/materials/alerts
```

## 5. Получить материал по ID

```bash
curl http://localhost:3001/api/materials/1
```

## 6. Создать новый материал

```bash
curl -X POST http://localhost:3001/api/materials \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новое масло",
    "category": "oil",
    "unit": "л",
    "quantity": 50,
    "min_quantity": 10,
    "batch_number": "OIL-2024-005"
  }'
```

## 7. Получить материал на складе

```bash
curl -X POST http://localhost:3001/api/materials/1/receive \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 25,
    "batch_number": "OIL-2024-006"
  }'
```

## 8. Списать материал

```bash
curl -X POST http://localhost:3001/api/materials/1/consume \
  -H "Content-Type: application/json" \
  -d '{"quantity": 5}'
```

## 9. Получить все технологические карты

```bash
curl http://localhost:3001/api/techcards
```

## 10. Получить тех. карту с материалами

```bash
curl http://localhost:3001/api/techcards/1
```

## 11. Создать новую технологическую карту

```bash
curl -X POST http://localhost:3001/api/techcards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новый ароматизатор",
    "description": "Описание продукта",
    "version": "1.0",
    "duration_minutes": 45,
    "steps": [
      "Подготовить основу",
      "Нанести аромат",
      "Упаковать"
    ],
    "items": [
      {"material_id": 5, "quantity_per_unit": 1},
      {"material_id": 1, "quantity_per_unit": 0.002}
    ]
  }'
```

## 12. Получить все производственные задачи

```bash
curl http://localhost:3001/api/tasks
```

## 13. Получить задачи по статусу

```bash
curl "http://localhost:3001/api/tasks?status=in_progress"
```

## 14. Получить задачи, назначенные на пользователя

```bash
curl "http://localhost:3001/api/tasks?assigned_to=5"
```

## 15. Создать новую производственную задачу

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "tech_card_id": 1,
    "assigned_to": 5,
    "quantity_planned": 500,
    "priority": "high",
    "due_date": "2026-04-15"
  }'
```

## 16. Начать выполнение задачи

```bash
curl -X POST http://localhost:3001/api/tasks/1/start \
  -H "Content-Type: application/json"
```

## 17. Завершить задачу

```bash
curl -X POST http://localhost:3001/api/tasks/1/complete \
  -H "Content-Type: application/json" \
  -d '{"quantity_produced": 480}'
```

При завершении задачи материалы автоматически списываются на основе количества произведенной продукции и рецепта (tech_card).

## 18. Зафиксировать брак

```bash
curl -X POST http://localhost:3001/api/tasks/1/defect \
  -H "Content-Type: application/json" \
  -d '{
    "quantity_defect": 20,
    "defect_reason": "Неправильное нанесение аромата"
  }'
```

## 19. Получить статистику панели управления

```bash
curl http://localhost:3001/api/dashboard
```

**Ответ включает:**
- Задачи и производство за сегодня
- Активные и ожидающие задачи
- Завершено задач сегодня
- Процент дефектов
- Количество критических материалов
- Список материалов с низким уровнем
- Недавние события

## 20. Получить ленту событий

```bash
curl "http://localhost:3001/api/events?page=1&limit=20"
```

## Примеры фильтрации

**Поиск материалов по названию:**
```bash
curl "http://localhost:3001/api/materials?search=масло"
```

**Фильтрация по категории:**
```bash
curl "http://localhost:3001/api/materials?category=oil"
```

**Комбинированная фильтрация:**
```bash
curl "http://localhost:3001/api/materials?search=лимон&category=oil"
```

## Статусы задач

- `planned` - Плановая
- `in_progress` - В процессе
- `quality_check` - Проверка качества
- `completed` - Завершена
- `cancelled` - Отменена

## Приоритеты

- `low` - Низкий
- `medium` - Средний
- `high` - Высокий

## Категории материалов

- `paper` - Бумажные
- `plastic` - Пластиковые
- `oil` - Масла
- `packaging` - Упаковка
- `label` - Этикетки

## Роли пользователей

- `admin` - Администратор
- `technologist` - Технолог
- `production_manager` - Менеджер производства
- `warehouse` - Кладовщик
- `operator` - Оператор
