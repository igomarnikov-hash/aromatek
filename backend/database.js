const { DatabaseSync } = require('node:sqlite')
const path = require('path')

const db = new DatabaseSync(path.join(__dirname, 'production.db'))

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','technologist','production_manager','warehouse','operator')),
      avatar_color TEXT DEFAULT '#2563eb',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('paper','plastic','oil','packaging','label')),
      unit TEXT NOT NULL CHECK(unit IN ('шт','л','кг','м')),
      quantity REAL NOT NULL DEFAULT 0,
      min_quantity REAL NOT NULL DEFAULT 0,
      batch_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tech_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT DEFAULT '1.0',
      is_active INTEGER DEFAULT 1,
      duration_minutes INTEGER DEFAULT 60,
      steps TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tech_card_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tech_card_id INTEGER NOT NULL REFERENCES tech_cards(id) ON DELETE CASCADE,
      material_id INTEGER NOT NULL REFERENCES materials(id),
      quantity_per_unit REAL NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS production_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tech_card_id INTEGER REFERENCES tech_cards(id),
      assigned_to INTEGER REFERENCES users(id),
      quantity_planned REAL NOT NULL DEFAULT 0,
      quantity_produced REAL NOT NULL DEFAULT 0,
      quantity_defect REAL NOT NULL DEFAULT 0,
      defect_reason TEXT,
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in_progress','quality_check','completed','cancelled')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
      due_date TEXT,
      start_time DATETIME,
      end_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('critical','warning','info')),
      category TEXT NOT NULL CHECK(category IN ('stock','task','batch','system')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get()
  if (userCount.cnt === 0) {
    seedDatabase()
  }
}

function seedDatabase() {
  const insertUser = db.prepare('INSERT INTO users (name, role, avatar_color) VALUES (?, ?, ?)')
  const users = [
    ['Александр Петров', 'admin', '#2563eb'],
    ['Мария Сидорова', 'technologist', '#7c3aed'],
    ['Иван Иванов', 'production_manager', '#0891b2'],
    ['Елена Федорова', 'warehouse', '#d97706'],
    ['Николай Сергеев', 'operator', '#16a34a'],
  ]
  users.forEach(u => insertUser.run(...u))

  const insertMat = db.prepare('INSERT INTO materials (name, category, unit, quantity, min_quantity, batch_number) VALUES (?, ?, ?, ?, ?, ?)')
  const materials = [
    ['Масло лимон', 'oil', 'л', 45.5, 10, 'OIL-2024-001'],
    ['Масло новый автомобиль', 'oil', 'л', 8.2, 10, 'OIL-2024-002'],
    ['Масло ваниль', 'oil', 'л', 32.0, 10, 'OIL-2024-003'],
    ['Масло лаванда', 'oil', 'л', 5.5, 10, 'OIL-2024-004'],
    ['Картонная основа', 'paper', 'шт', 2500, 500, 'PAP-2024-001'],
    ['Абсорбирующий материал', 'paper', 'кг', 18.5, 20, 'PAP-2024-002'],
    ['Пластиковый корпус', 'plastic', 'шт', 850, 200, 'PLA-2024-001'],
    ['Упаковочная коробка', 'packaging', 'шт', 3200, 1000, 'PKG-2024-001'],
    ['Этикетка', 'label', 'шт', 4100, 500, 'LBL-2024-001'],
  ]
  materials.forEach(m => insertMat.run(...m))

  const insertCard = db.prepare('INSERT INTO tech_cards (name, description, version, duration_minutes, steps) VALUES (?, ?, ?, ?, ?)')
  const cards = [
    ['Ароматизатор подвесной Лимон', 'Подвесной ароматизатор с лимонным ароматом для автомобиля', '2.1', 45, JSON.stringify(['Подготовить картонную основу', 'Нанести масло лимон (2мл)', 'Просушить 10 мин', 'Упаковать в корпус', 'Наклеить этикетку', 'Упаковать в коробку'])],
    ['Ароматизатор подвесной Новый автомобиль', 'Классический аромат нового автомобиля', '1.8', 45, JSON.stringify(['Подготовить картонную основу', 'Нанести масло новый автомобиль (2мл)', 'Просушить 10 мин', 'Упаковать в корпус', 'Наклеить этикетку', 'Упаковать в коробку'])],
    ['Ароматизатор на панель Лаванда', 'Ароматизатор на панель с ароматом лаванды', '1.5', 60, JSON.stringify(['Подготовить пластиковый корпус', 'Залить масло лаванда (5мл)', 'Установить фитиль', 'Закрыть крышку', 'Наклеить этикетку', 'Упаковать в коробку'])],
    ['Ароматизатор на вентиляцию Ваниль', 'Клипса на вентиляцию с ароматом ванили', '2.0', 30, JSON.stringify(['Подготовить основу из абсорбента', 'Нанести масло ваниль (1.5мл)', 'Просушить 5 мин', 'Вставить в клипсу', 'Наклеить этикетку', 'Упаковать'])],
  ]
  const cardIds = []
  cards.forEach(c => {
    const r = insertCard.run(...c)
    cardIds.push(r.lastInsertRowid)
  })

  const insertItem = db.prepare('INSERT INTO tech_card_items (tech_card_id, material_id, quantity_per_unit) VALUES (?, ?, ?)')
  // Card 1 (Лимон): картон(5), масло лимон(1), корпус(7), коробка(8), этикетка(9)
  [[cardIds[0],5,1],[cardIds[0],1,0.002],[cardIds[0],7,1],[cardIds[0],8,1],[cardIds[0],9,1]].forEach(i => insertItem.run(...i))
  // Card 2 (Новый авто): картон(5), масло авто(2), корпус(7), коробка(8), этикетка(9)
  [[cardIds[1],5,1],[cardIds[1],2,0.002],[cardIds[1],7,1],[cardIds[1],8,1],[cardIds[1],9,1]].forEach(i => insertItem.run(...i))
  // Card 3 (Лаванда): корпус(7), масло лаванда(4), коробка(8), этикетка(9)
  [[cardIds[2],7,1],[cardIds[2],4,0.005],[cardIds[2],8,1],[cardIds[2],9,1]].forEach(i => insertItem.run(...i))
  // Card 4 (Ваниль): абсорбент(6), масло ваниль(3), коробка(8), этикетка(9)
  [[cardIds[3],6,0.01],[cardIds[3],3,0.0015],[cardIds[3],8,1],[cardIds[3],9,1]].forEach(i => insertItem.run(...i))

  const insertTask = db.prepare('INSERT INTO production_tasks (tech_card_id, assigned_to, quantity_planned, quantity_produced, status, priority, due_date, start_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const today = new Date().toISOString().split('T')[0]
  const tasks = [
    [cardIds[0], 5, 500, 340, 'in_progress', 'high', today, new Date(Date.now()-3600000).toISOString()],
    [cardIds[1], 5, 300, 0, 'planned', 'medium', today, null],
    [cardIds[2], 3, 200, 0, 'planned', 'low', today, null],
    [cardIds[3], 5, 400, 400, 'completed', 'high', today, new Date(Date.now()-86400000).toISOString()],
    [cardIds[0], 3, 250, 0, 'planned', 'medium', today, null],
    [cardIds[1], 5, 150, 50, 'quality_check', 'high', today, new Date(Date.now()-7200000).toISOString()],
  ]
  tasks.forEach(t => insertTask.run(...t))

  const insertEvent = db.prepare('INSERT INTO events (user_id, action, details) VALUES (?, ?, ?)')
  const events = [
    [5, 'Задача запущена', 'Начато производство: Ароматизатор подвесной Лимон, 500 шт.'],
    [4, 'Материал получен', 'Масло лимон: +20л, партия OIL-2024-001'],
    [3, 'Задача создана', 'Новая задача: Ароматизатор Лаванда, 200 шт.'],
    [1, 'Настройки обновлены', 'Обновлены параметры производства'],
    [5, 'Задача завершена', 'Завершено: Ароматизатор на вентиляцию Ваниль, 400 шт.'],
    [2, 'Тех. карта обновлена', 'Обновлена версия 2.1: Ароматизатор Лимон'],
    [4, 'Критический уровень', 'Масло новый автомобиль ниже минимального уровня!'],
    [5, 'Задача на контроле', 'Партия Новый автомобиль отправлена на проверку качества'],
  ]
  events.forEach(e => insertEvent.run(...e))

  console.log('База данных инициализирована с демо-данными')
}

module.exports = { db, initDatabase }
