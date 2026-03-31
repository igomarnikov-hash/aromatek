# Production Management System Backend

A complete production management backend for a car air freshener manufacturing company built with Express.js and SQLite.

## Quick Start

### Installation
```bash
npm install
```

### Running the Server
```bash
npm start
```

Server will start on `http://localhost:3001`

## Project Structure

```
backend/
├── package.json           # Project dependencies
├── server.js              # Main Express server
├── database.js            # SQLite initialization and seeding
├── routes/
│   ├── auth.js           # Authentication endpoints
│   ├── materials.js      # Material inventory management
│   ├── techcards.js      # Technological cards (production recipes)
│   ├── tasks.js          # Production tasks management
│   ├── dashboard.js      # Aggregated dashboard data
│   └── events.js         # Event logging system
└── README.md             # This file
```

## Database Schema

### Users
- `id` (Integer, Primary Key)
- `name` (Text)
- `role` (admin, technologist, production_manager, warehouse, operator)
- `avatar_color` (Text - hex color)
- `created_at` (DateTime)

### Materials
- `id` (Integer, Primary Key)
- `name` (Text)
- `category` (paper, plastic, oil, packaging, label)
- `unit` (шт, л, кг, м)
- `quantity` (Real)
- `min_quantity` (Real)
- `batch_number` (Text)
- `created_at`, `updated_at` (DateTime)

### Tech Cards
- `id` (Integer, Primary Key)
- `name` (Text)
- `description` (Text)
- `version` (Text)
- `is_active` (Boolean)
- `created_at`, `updated_at` (DateTime)

### Tech Card Items
- `id` (Integer, Primary Key)
- `tech_card_id` (Foreign Key)
- `material_id` (Foreign Key)
- `quantity_per_unit` (Real)

### Production Tasks
- `id` (Integer, Primary Key)
- `tech_card_id` (Foreign Key)
- `assigned_to` (Foreign Key to users)
- `quantity_planned` (Real)
- `quantity_produced` (Real)
- `quantity_defect` (Real)
- `defect_reason` (Text)
- `status` (planned, in_progress, quality_check, completed, cancelled)
- `priority` (low, medium, high)
- `start_time`, `end_time` (DateTime)
- `created_at` (DateTime)

### Events Log
- `id` (Integer, Primary Key)
- `user_id` (Foreign Key)
- `action` (Text)
- `details` (Text)
- `created_at` (DateTime)

## API Endpoints

### Authentication (`/api/auth`)
- `GET /api/users` - List all users for demo login
- `POST /api/auth/login` - Login with user_id

### Materials (`/api/materials`)
- `GET /api/materials` - List materials (with search & category filter)
- `GET /api/materials/:id` - Get single material
- `POST /api/materials` - Create material
- `PUT /api/materials/:id` - Update material
- `POST /api/materials/:id/receive` - Receive stock
- `POST /api/materials/:id/consume` - Consume stock
- `GET /api/materials/alerts` - Get materials below minimum quantity

### Tech Cards (`/api/techcards`)
- `GET /api/techcards` - List tech cards with items
- `GET /api/techcards/:id` - Get single tech card with items
- `POST /api/techcards` - Create tech card with items
- `PUT /api/techcards/:id` - Update tech card

### Production Tasks (`/api/tasks`)
- `GET /api/tasks` - List tasks (filter by status, assigned_to)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task (auto-checks material availability)
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/start` - Start task (set in_progress)
- `POST /api/tasks/:id/complete` - Complete task (auto-consume materials)
- `POST /api/tasks/:id/defect` - Report defect

### Dashboard (`/api/dashboard`)
- `GET /api/dashboard` - Get aggregated statistics:
  - Today's plan progress
  - Active tasks count
  - Defect rate
  - Critical materials (below minimum)
  - Recent events

### Events (`/api/events`)
- `GET /api/events` - Get recent events (paginated)

## Demo Data

### Users (5)
- Игорь (Admin)
- Марина (Technologist)
- Алексей (Production Manager)
- Сергей (Warehouse)
- Ольга (Operator)

### Materials (9)
- Oils: Лимон, Новый автомобиль, Ваниль, Лаванда
- Paper: Картонная основа, Абсорбирующий материал
- Plastic: Пластиковый корпус
- Packaging: Упаковочная коробка
- Labels: Этикетка

### Tech Cards (4)
- Ароматизатор подвесной Лимон
- Ароматизатор подвесной Новый автомобиль
- Ароматизатор на панель Лаванда
- Ароматизатор на вентиляцию Ваниль

### Production Tasks (6)
- Various tasks in different statuses (planned, in_progress, quality_check, completed)

### Event Log (12+)
- Realistic production workflow events

## Response Format

All responses follow a consistent JSON format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message in Russian"
}
```

## Features

1. **Demo Authentication** - Simple user selection, no password required
2. **Material Management** - Track inventory with categories and units
3. **Technological Cards** - Define production recipes with required materials
4. **Production Tasks** - Create and manage production tasks with status tracking
5. **Auto Material Consumption** - Materials are automatically consumed when tasks are completed
6. **Defect Tracking** - Register defects and track quality
7. **Event Logging** - All actions are logged for audit trail
8. **Dashboard Analytics** - Real-time production statistics
9. **Material Alerts** - Get notified when materials fall below minimum quantity
10. **Pagination** - Event list supports pagination

## Error Handling

All errors are returned with appropriate HTTP status codes:
- 400 - Bad Request (validation errors)
- 404 - Not Found
- 500 - Internal Server Error

## Dependencies

- `express` - Web framework
- `better-sqlite3` - SQLite database
- `cors` - Cross-Origin Resource Sharing
- `morgan` - HTTP request logger

## Notes

- All text content is in Russian to match production environment requirements
- Database is automatically initialized and seeded on first run
- Foreign keys are enabled for data integrity
- All timestamps are in ISO 8601 format
- Material consumption is automatic upon task completion based on tech card specifications
