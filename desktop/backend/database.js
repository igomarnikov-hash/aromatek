const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'production.db');

let dbInstance = null;
let sqlJs = null;

async function initializeDatabase(db) {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'technologist', 'production_manager', 'warehouse', 'operator')),
      avatar_color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Materials table
  db.run(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('paper', 'plastic', 'oil', 'packaging', 'label')),
      unit TEXT NOT NULL CHECK(unit IN ('шт', 'л', 'кг', 'м')),
      quantity REAL NOT NULL DEFAULT 0,
      min_quantity REAL NOT NULL DEFAULT 10,
      batch_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tech cards table
  db.run(`
    CREATE TABLE IF NOT EXISTS tech_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tech card items table
  db.run(`
    CREATE TABLE IF NOT EXISTS tech_card_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tech_card_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity_per_unit REAL NOT NULL,
      FOREIGN KEY (tech_card_id) REFERENCES tech_cards(id),
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `);

  // Production tasks table
  db.run(`
    CREATE TABLE IF NOT EXISTS production_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tech_card_id INTEGER NOT NULL,
      assigned_to INTEGER NOT NULL,
      quantity_planned REAL NOT NULL,
      quantity_produced REAL NOT NULL DEFAULT 0,
      quantity_defect REAL NOT NULL DEFAULT 0,
      defect_reason TEXT,
      status TEXT NOT NULL CHECK(status IN ('planned', 'in_progress', 'quality_check', 'completed', 'cancelled')) DEFAULT 'planned',
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      start_time DATETIME,
      end_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tech_card_id) REFERENCES tech_cards(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // Events log table
  db.run(`
    CREATE TABLE IF NOT EXISTS events_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

async function seedDatabase(db) {
  // Check if data already exists
  const userCountResult = db.exec('SELECT COUNT(*) as count FROM users');
  const userCount = userCountResult.length > 0 ? userCountResult[0].values[0][0] : 0;
  if (userCount > 0) {
    return; // Data already seeded
  }

  // Insert users
  const users = [
    { name: 'Игорь', role: 'admin', color: '#FF6B6B' },
    { name: 'Марина', role: 'technologist', color: '#4ECDC4' },
    { name: 'Алексей', role: 'production_manager', color: '#45B7D1' },
    { name: 'Сергей', role: 'warehouse', color: '#FFA07A' },
    { name: 'Ольга', role: 'operator', color: '#98D8C8' }
  ];

  const userIds = {};
  users.forEach(user => {
    db.run(
      'INSERT INTO users (name, role, avatar_color) VALUES (?, ?, ?)',
      [user.name, user.role, user.color]
    );
    // Get the last inserted ID
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    userIds[user.role] = id;
  });

  // Insert materials
  const materials = [
    { name: 'Масло Лимон', category: 'oil', unit: 'л', quantity: 45, min: 10, batch: 'OIL-001' },
    { name: 'Масло Новый автомобиль', category: 'oil', unit: 'л', quantity: 38, min: 10, batch: 'OIL-002' },
    { name: 'Масло Ваниль', category: 'oil', unit: 'л', quantity: 52, min: 10, batch: 'OIL-003' },
    { name: 'Масло Лаванда', category: 'oil', unit: 'л', quantity: 28, min: 10, batch: 'OIL-004' },
    { name: 'Картонная основа', category: 'paper', unit: 'шт', quantity: 500, min: 100, batch: 'PAPER-001' },
    { name: 'Пластиковый корпус', category: 'plastic', unit: 'шт', quantity: 450, min: 100, batch: 'PLAST-001' },
    { name: 'Упаковочная коробка', category: 'packaging', unit: 'шт', quantity: 280, min: 50, batch: 'PKG-001' },
    { name: 'Этикетка', category: 'label', unit: 'шт', quantity: 950, min: 200, batch: 'LABEL-001' },
    { name: 'Абсорбирующий материал', category: 'paper', unit: 'кг', quantity: 18, min: 5, batch: 'ABS-001' }
  ];

  const materialIds = {};
  materials.forEach((mat, idx) => {
    db.run(
      'INSERT INTO materials (name, category, unit, quantity, min_quantity, batch_number) VALUES (?, ?, ?, ?, ?, ?)',
      [mat.name, mat.category, mat.unit, mat.quantity, mat.min, mat.batch]
    );
    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    materialIds[idx] = id;
  });

  // Insert tech cards
  const techCards = [
    {
      name: 'Ароматизатор подвесной Лимон',
      description: 'Подвесной ароматизатор с запахом лимона для автомобиля',
      version: '1.0',
      items: [
        { material: 0, qty: 0.5 },
        { material: 4, qty: 1 },
        { material: 7, qty: 2 }
      ]
    },
    {
      name: 'Ароматизатор подвесной Новый автомобиль',
      description: 'Подвесной ароматизатор с запахом нового автомобиля',
      version: '1.1',
      items: [
        { material: 1, qty: 0.5 },
        { material: 4, qty: 1 },
        { material: 7, qty: 2 }
      ]
    },
    {
      name: 'Ароматизатор на панель Лаванда',
      description: 'Ароматизатор на панель приборов с запахом лаванды',
      version: '2.0',
      items: [
        { material: 3, qty: 0.4 },
        { material: 5, qty: 1 },
        { material: 8, qty: 0.2 },
        { material: 7, qty: 1 }
      ]
    },
    {
      name: 'Ароматизатор на вентиляцию Ваниль',
      description: 'Ароматизатор на вентиляцию салона с запахом ванили',
      version: '1.5',
      items: [
        { material: 2, qty: 0.3 },
        { material: 5, qty: 1 },
        { material: 8, qty: 0.15 }
      ]
    }
  ];

  const techCardIds = [];
  techCards.forEach(card => {
    db.run(
      'INSERT INTO tech_cards (name, description, version, is_active) VALUES (?, ?, ?, 1)',
      [card.name, card.description, card.version]
    );
    const result = db.exec('SELECT last_insert_rowid() as id');
    const techCardId = result[0].values[0][0];
    techCardIds.push(techCardId);

    card.items.forEach(item => {
      db.run(
        'INSERT INTO tech_card_items (tech_card_id, material_id, quantity_per_unit) VALUES (?, ?, ?)',
        [techCardId, materialIds[item.material], item.qty]
      );
    });
  });

  // Insert production tasks
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const tasks = [
    {
      tech_card: 0,
      assigned_to: userIds.operator,
      planned: 100,
      produced: 95,
      defect: 2,
      reason: 'Неправильное наклеивание этикетки',
      status: 'completed',
      priority: 'high',
      start: twoDaysAgo.toISOString(),
      end: yesterday.toISOString()
    },
    {
      tech_card: 1,
      assigned_to: userIds.operator,
      planned: 150,
      produced: 0,
      defect: 0,
      reason: null,
      status: 'in_progress',
      priority: 'high',
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      end: null
    },
    {
      tech_card: 2,
      assigned_to: userIds.operator,
      planned: 80,
      produced: 0,
      defect: 0,
      reason: null,
      status: 'planned',
      priority: 'medium',
      start: null,
      end: null
    },
    {
      tech_card: 3,
      assigned_to: userIds.operator,
      planned: 120,
      produced: 115,
      defect: 3,
      reason: 'Деформация корпуса',
      status: 'quality_check',
      priority: 'medium',
      start: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      end: null
    },
    {
      tech_card: 0,
      assigned_to: userIds.operator,
      planned: 200,
      produced: 0,
      defect: 0,
      reason: null,
      status: 'planned',
      priority: 'low',
      start: null,
      end: null
    },
    {
      tech_card: 2,
      assigned_to: userIds.operator,
      planned: 90,
      produced: 88,
      defect: 1,
      reason: 'Недостаточное количество масла',
      status: 'completed',
      priority: 'high',
      start: twoDaysAgo.toISOString(),
      end: yesterday.toISOString()
    }
  ];

  tasks.forEach(task => {
    db.run(
      `INSERT INTO production_tasks
       (tech_card_id, assigned_to, quantity_planned, quantity_produced, quantity_defect, defect_reason, status, priority, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.tech_card + 1,
        task.assigned_to,
        task.planned,
        task.produced,
        task.defect,
        task.reason,
        task.status,
        task.priority,
        task.start,
        task.end
      ]
    );
  });

  // Insert events log
  const events = [
    {
      user: userIds.warehouse,
      action: 'Материал получен',
      details: 'Масло Лимон (10л) - Партия OIL-001',
      time: twoDaysAgo.toISOString()
    },
    {
      user: userIds.operator,
      action: 'Задача начата',
      details: 'Ароматизатор подвесной Лимон - Количество: 100',
      time: twoDaysAgo.toISOString()
    },
    {
      user: userIds.production_manager,
      action: 'Задача создана',
      details: 'Ароматизатор подвесной Новый автомобиль - Количество: 150',
      time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      user: userIds.operator,
      action: 'Задача завершена',
      details: 'Ароматизатор подвесной Лимон - Произведено: 95, Брак: 2',
      time: yesterday.toISOString()
    },
    {
      user: userIds.technologist,
      action: 'Технологическая карта обновлена',
      details: 'Ароматизатор на панель Лаванда - Версия 2.0',
      time: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      user: userIds.warehouse,
      action: 'Материал отпущен',
      details: 'Пластиковый корпус (50шт)',
      time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      user: userIds.operator,
      action: 'Дефект зафиксирован',
      details: 'Деформация корпуса - Количество: 3',
      time: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      user: userIds.production_manager,
      action: 'Задача создана',
      details: 'Ароматизатор на панель Лаванда - Количество: 80',
      time: now.toISOString()
    },
    {
      user: userIds.warehouse,
      action: 'Материал получен',
      details: 'Этикетка (500шт) - Партия LABEL-002',
      time: new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    },
    {
      user: userIds.admin,
      action: 'Отчет просмотрен',
      details: 'Ежедневный отчет о производстве',
      time: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
    },
    {
      user: userIds.operator,
      action: 'Задача начата',
      details: 'Ароматизатор подвесной Новый автомобиль - Количество: 150',
      time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      user: userIds.production_manager,
      action: 'Приоритет изменен',
      details: 'Ароматизатор на панель Лаванда - Новый приоритет: Средний',
      time: new Date(now.getTime() - 90 * 60 * 1000).toISOString()
    }
  ];

  events.forEach(event => {
    db.run(
      'INSERT INTO events_log (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
      [event.user, event.action, event.details, event.time]
    );
  });
}

function createDbWrapper(sqlJsDb) {
  return {
    prepare: (sql) => {
      return {
        get: (...params) => {
          const result = sqlJsDb.exec(sql, params);
          if (result.length === 0 || result[0].values.length === 0) {
            return undefined;
          }
          const columns = result[0].columns;
          const row = result[0].values[0];
          const obj = {};
          columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        },
        all: (...params) => {
          const result = sqlJsDb.exec(sql, params);
          if (result.length === 0 || result[0].values.length === 0) {
            return [];
          }
          const columns = result[0].columns;
          return result[0].values.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        },
        run: (...params) => {
          sqlJsDb.run(sql, params);
          const lastInsertResult = sqlJsDb.exec('SELECT last_insert_rowid() as id');
          const lastInsertRowid = lastInsertResult[0].values[0][0];
          const changesResult = sqlJsDb.exec('SELECT changes() as changes');
          const changes = changesResult[0].values[0][0];
          return { changes, lastInsertRowid };
        }
      };
    },
    exec: (sql, params) => {
      return sqlJsDb.exec(sql, params);
    },
    run: (sql, params) => {
      sqlJsDb.run(sql, params);
    },
    export: () => {
      return sqlJsDb.export();
    },
    close: () => {
      sqlJsDb.close();
    }
  };
}

function saveDatabase(db) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

async function initDatabase() {
  // Initialize sql.js
  sqlJs = await initSqlJs();

  let sqlJsDb;

  // Try to load existing database
  if (fs.existsSync(dbPath)) {
    try {
      const buffer = fs.readFileSync(dbPath);
      sqlJsDb = new sqlJs.Database(buffer);
    } catch (err) {
      console.error('Error loading database from file, creating new one:', err);
      sqlJsDb = new sqlJs.Database();
    }
  } else {
    sqlJsDb = new sqlJs.Database();
  }

  // Create wrapper
  dbInstance = createDbWrapper(sqlJsDb);

  // Initialize schema and seed
  await initializeDatabase(dbInstance);
  await seedDatabase(dbInstance);

  // Save to file
  saveDatabase(dbInstance);

  // Auto-save wrapper
  const originalExec = dbInstance.exec;
  const originalRun = dbInstance.run;
  const originalPrepare = dbInstance.prepare;

  dbInstance.exec = function(sql, params) {
    const result = originalExec.call(this, sql, params);
    saveDatabase(this);
    return result;
  };

  dbInstance.run = function(sql, params) {
    originalRun.call(this, sql, params);
    saveDatabase(this);
  };

  const prepareFunc = originalPrepare.bind(dbInstance);
  dbInstance.prepare = function(sql) {
    const stmt = prepareFunc(sql);
    const originalGet = stmt.get;
    const originalAll = stmt.all;
    const originalRun = stmt.run;

    stmt.run = function(...params) {
      const result = originalRun.call(this, ...params);
      saveDatabase(dbInstance);
      return result;
    };

    return stmt;
  };

  return dbInstance;
}

module.exports = {
  init: initDatabase
};
