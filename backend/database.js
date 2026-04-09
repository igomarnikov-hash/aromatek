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

  // 5S Checklist items (template)
  db.run(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // 5S Checklist sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS checklist_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conducted_by INTEGER,
      area TEXT NOT NULL DEFAULT 'Производственный цех',
      score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conducted_by) REFERENCES users(id)
    )
  `);

  // 5S Checklist responses
  db.run(`
    CREATE TABLE IF NOT EXISTS checklist_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'na' CHECK(status IN ('ok', 'issue', 'na')),
      comment TEXT,
      photo_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES checklist_sessions(id),
      FOREIGN KEY (item_id) REFERENCES checklist_items(id)
    )
  `);

  // ── PRODUCTION MODULES ──────────────────────────────────────────

  // Партии производства
  db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      tech_card_id INTEGER,
      quantity_planned INTEGER NOT NULL DEFAULT 1890,
      quantity_produced INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open'
        CHECK(status IN ('open','printing','diecut','threading','perfuming','packaging','completed','cancelled')),
      created_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tech_card_id) REFERENCES tech_cards(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Трафаретные сетки
  db.run(`
    CREATE TABLE IF NOT EXISTS screens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial_number TEXT UNIQUE NOT NULL,
      emulsion_type TEXT DEFAULT '',
      emulsion_applied_at DATETIME,
      exposure_time_seconds INTEGER DEFAULT 0,
      exposure_result TEXT DEFAULT 'pending'
        CHECK(exposure_result IN ('pending','success','defect')),
      print_cycles_used INTEGER DEFAULT 0,
      print_cycles_limit INTEGER DEFAULT 500,
      status TEXT DEFAULT 'ready'
        CHECK(status IN ('ready','in_use','washing','written_off')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Операции по партии (быстрое логирование этапов из карточки партии)
  db.run(`
    CREATE TABLE IF NOT EXISTS batch_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      stage TEXT NOT NULL CHECK(stage IN ('printing','diecut','threading','perfuming','packaging')),
      quantity_processed INTEGER DEFAULT 0,
      notes TEXT,
      operator_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // События засветки трафаретов
  db.run(`
    CREATE TABLE IF NOT EXISTS exposure_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      screen_id INTEGER NOT NULL,
      result TEXT NOT NULL CHECK(result IN ('success','defect')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (screen_id) REFERENCES screens(id)
    )
  `);

  // Заказы Litoscan
  db.run(`
    CREATE TABLE IF NOT EXISTS litoscan_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT,
      batch_id INTEGER,
      screen_id INTEGER,
      design_file TEXT,
      sent_at DATETIME,
      received_at DATETIME,
      status TEXT DEFAULT 'draft'
        CHECK(status IN ('draft','sent','received','cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (screen_id) REFERENCES screens(id)
    )
  `);

  // Партии краски
  db.run(`
    CREATE TABLE IF NOT EXISTS ink_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ink_batch_number TEXT UNIQUE NOT NULL,
      batch_id INTEGER,
      product_name TEXT NOT NULL,
      components TEXT NOT NULL DEFAULT '[]',
      total_planned_g REAL DEFAULT 0,
      total_actual_g REAL DEFAULT 0,
      calibration_result TEXT DEFAULT 'pending'
        CHECK(calibration_result IN ('pending','ok','needs_correction','defect')),
      color_reference_photo TEXT,
      color_result_photo TEXT,
      operator_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // Сеансы печати
  db.run(`
    CREATE TABLE IF NOT EXISTS print_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_number TEXT UNIQUE NOT NULL,
      batch_id INTEGER,
      screen_id INTEGER,
      ink_batch_id INTEGER,
      sheets_planned INTEGER DEFAULT 42,
      sheets_actual INTEGER DEFAULT 0,
      items_per_sheet INTEGER DEFAULT 45,
      quantity_total_planned INTEGER DEFAULT 1890,
      quantity_total_actual INTEGER DEFAULT 0,
      side1_start DATETIME,
      side1_end DATETIME,
      side2_start DATETIME,
      side2_end DATETIME,
      defect_count INTEGER DEFAULT 0,
      defect_smear INTEGER DEFAULT 0,
      defect_underfill INTEGER DEFAULT 0,
      defect_offset INTEGER DEFAULT 0,
      defect_screen INTEGER DEFAULT 0,
      defect_other INTEGER DEFAULT 0,
      defect_notes TEXT,
      drying_load_time DATETIME,
      drying_unload_time DATETIME,
      drying_temperature_c REAL DEFAULT 0,
      drying_result TEXT DEFAULT 'pending'
        CHECK(drying_result IN ('pending','ok','defect')),
      status TEXT DEFAULT 'planned'
        CHECK(status IN ('planned','side1','side2','drying','completed','cancelled')),
      operator_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (screen_id) REFERENCES screens(id),
      FOREIGN KEY (ink_batch_id) REFERENCES ink_batches(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // Вырубка
  db.run(`
    CREATE TABLE IF NOT EXISTS diecut_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_number TEXT UNIQUE NOT NULL,
      batch_id INTEGER,
      print_session_id INTEGER,
      equipment_model TEXT DEFAULT '',
      equipment_serial TEXT DEFAULT '',
      sheets_planned INTEGER DEFAULT 42,
      sheets_actual INTEGER DEFAULT 0,
      quantity_planned INTEGER DEFAULT 1890,
      quantity_actual INTEGER DEFAULT 0,
      defect_count INTEGER DEFAULT 0,
      defect_underpress INTEGER DEFAULT 0,
      defect_burr INTEGER DEFAULT 0,
      defect_deform INTEGER DEFAULT 0,
      defect_notes TEXT,
      storage_container TEXT DEFAULT '',
      storage_cell TEXT DEFAULT '',
      start_time DATETIME,
      end_time DATETIME,
      status TEXT DEFAULT 'planned'
        CHECK(status IN ('planned','in_progress','completed','cancelled')),
      operator_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (print_session_id) REFERENCES print_sessions(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // Пробивка и навеска нити
  db.run(`
    CREATE TABLE IF NOT EXISTS thread_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_number TEXT UNIQUE NOT NULL,
      batch_id INTEGER,
      diecut_session_id INTEGER,
      equipment_model TEXT DEFAULT '',
      thread_color TEXT DEFAULT 'white'
        CHECK(thread_color IN ('white','black')),
      quantity_planned INTEGER DEFAULT 1890,
      quantity_processed INTEGER DEFAULT 0,
      defect_count INTEGER DEFAULT 0,
      defect_thread_break INTEGER DEFAULT 0,
      defect_no_hole INTEGER DEFAULT 0,
      defect_notes TEXT,
      start_time DATETIME,
      end_time DATETIME,
      status TEXT DEFAULT 'planned'
        CHECK(status IN ('planned','in_progress','completed','cancelled')),
      operator_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (diecut_session_id) REFERENCES diecut_sessions(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // Формулы парфюмерных смесей
  db.run(`
    CREATE TABLE IF NOT EXISTS perfume_formulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      product_code TEXT DEFAULT '',
      version TEXT DEFAULT '1.0',
      is_reference INTEGER DEFAULT 0,
      components TEXT NOT NULL DEFAULT '[]',
      total_volume_per_unit_ml REAL DEFAULT 0,
      deviation_threshold_pct REAL DEFAULT 5.0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Партии парфюмерных смесей
  db.run(`
    CREATE TABLE IF NOT EXISTS perfume_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      perfume_number TEXT UNIQUE NOT NULL,
      batch_id INTEGER,
      formula_id INTEGER,
      quantity_planned INTEGER DEFAULT 0,
      actual_components TEXT DEFAULT '[]',
      has_deviation INTEGER DEFAULT 0,
      deviation_details TEXT DEFAULT '',
      homogenization_start DATETIME,
      homogenization_end DATETIME,
      homogenization_duration_h INTEGER DEFAULT 24,
      flip_log TEXT DEFAULT '[]',
      saturation_result TEXT DEFAULT 'pending'
        CHECK(saturation_result IN ('pending','ok','defect')),
      saturation_task_scheduled_for DATETIME,
      operator_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (formula_id) REFERENCES perfume_formulas(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // Упаковка
  db.run(`
    CREATE TABLE IF NOT EXISTS packaging_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_number TEXT UNIQUE NOT NULL,
      batch_id INTEGER,
      thread_op_id INTEGER,
      quantity_planned INTEGER DEFAULT 0,
      quantity_packed INTEGER DEFAULT 0,
      packaging_type TEXT DEFAULT 'bag'
        CHECK(packaging_type IN ('bag','blister','box')),
      pre_dry_required INTEGER DEFAULT 0,
      pre_dry_start DATETIME,
      pre_dry_end DATETIME,
      start_time DATETIME,
      end_time DATETIME,
      defect_count INTEGER DEFAULT 0,
      defect_notes TEXT,
      status TEXT DEFAULT 'planned'
        CHECK(status IN ('planned','drying','packaging','completed','cancelled')),
      operator_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (thread_op_id) REFERENCES thread_operations(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    )
  `);

  // История PDF-раскладок
  db.run(`
    CREATE TABLE IF NOT EXISTS pdf_layouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      layout_type TEXT DEFAULT 'print_sheet'
        CHECK(layout_type IN ('print_sheet','batch_label','quality_passport')),
      source_file TEXT DEFAULT '',
      element_width_mm REAL DEFAULT 0,
      element_height_mm REAL DEFAULT 0,
      copies_per_sheet INTEGER DEFAULT 45,
      sheet_width_mm REAL DEFAULT 500,
      sheet_height_mm REAL DEFAULT 700,
      dpi INTEGER DEFAULT 300,
      output_file TEXT DEFAULT '',
      generated_by INTEGER,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batches(id),
      FOREIGN KEY (generated_by) REFERENCES users(id)
    )
  `);

  // Индексы
  db.run(`CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_screens_status ON screens(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_print_sessions_batch ON print_sessions(batch_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_diecut_batch ON diecut_sessions(batch_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_perfume_batches_batch ON perfume_batches(batch_id)`);
}

async function seed5SItems(db) {
  const existing = db.exec('SELECT COUNT(*) as count FROM checklist_items');
  const count = existing.length > 0 ? existing[0].values[0][0] : 0;
  if (count > 0) return;

  const items = [
    // 1S — Сортировка
    { section: '1S', title: 'Лишние предметы удалены с рабочих мест', description: 'Все ненужные инструменты, материалы и оборудование убраны', sort: 1 },
    { section: '1S', title: 'Просроченные материалы отсутствуют', description: 'Проверить сроки годности сырья и расходников', sort: 2 },
    { section: '1S', title: 'Нерабочее оборудование помечено', description: 'Сломанное оборудование обозначено красными ярлыками', sort: 3 },
    { section: '1S', title: 'Документация актуальна и рассортирована', description: 'Старые инструкции и листы заданий убраны', sort: 4 },

    // 2S — Систематизация
    { section: '2S', title: 'Все предметы имеют своё место', description: 'Каждый инструмент и материал находится на обозначенном месте', sort: 1 },
    { section: '2S', title: 'Места хранения обозначены', description: 'Полки, ящики и стеллажи промаркированы', sort: 2 },
    { section: '2S', title: 'Проходы свободны', description: 'Пути прохода и эвакуационные маршруты не заблокированы', sort: 3 },
    { section: '2S', title: 'Материалы размещены по принципу «ближе — чаще»', description: 'Часто используемые предметы в зоне лёгкой досягаемости', sort: 4 },
    { section: '2S', title: 'Визуальные метки нанесены на пол', description: 'Разметка рабочих зон, проходов, мест для тары', sort: 5 },

    // 3S — Содержание в чистоте
    { section: '3S', title: 'Оборудование чистое', description: 'Станки и приборы протёрты, смазаны при необходимости', sort: 1 },
    { section: '3S', title: 'Рабочие поверхности чистые', description: 'Столы, верстаки, полки без грязи и мусора', sort: 2 },
    { section: '3S', title: 'Пол подметён и вымыт', description: 'Полы чистые, нет масляных пятен и россыпей', sort: 3 },
    { section: '3S', title: 'Отходы и мусор убраны', description: 'Мусорные баки не переполнены, отходы вывезены', sort: 4 },
    { section: '3S', title: 'Освещение исправно', description: 'Все светильники работают, лампы не мигают', sort: 5 },

    // 4S — Стандартизация
    { section: '4S', title: 'Инструкции на рабочих местах', description: 'Стандарты выполнения операций вывешены и читаемы', sort: 1 },
    { section: '4S', title: 'Расписание уборки соблюдается', description: 'График уборки выполняется и отмечается', sort: 2 },
    { section: '4S', title: 'Проверки проводятся регулярно', description: 'Чек-листы заполняются по графику', sort: 3 },
    { section: '4S', title: 'Нормы запасов соблюдены', description: 'Запасы материалов не превышают установленный максимум', sort: 4 },

    // 5S — Совершенствование
    { section: '5S', title: 'Сотрудники обучены стандартам 5S', description: 'Все работники знают правила и следуют им', sort: 1 },
    { section: '5S', title: 'Предыдущие замечания устранены', description: 'Нарушения из прошлых проверок исправлены', sort: 2 },
    { section: '5S', title: 'Поступают предложения по улучшению', description: 'Сотрудники активно предлагают улучшения', sort: 3 },
    { section: '5S', title: 'Стандарты актуализированы', description: 'Рабочие инструкции обновляются при изменениях', sort: 4 }
  ];

  items.forEach(item => {
    db.run(
      'INSERT INTO checklist_items (section, title, description, sort_order) VALUES (?, ?, ?, ?)',
      [item.section, item.title, item.description, item.sort]
    );
  });
}

async function seedDatabase(db) {
  // Check if data already exists
  const userCountResult = db.exec('SELECT COUNT(*) as count FROM users');
  const userCount = userCountResult.length > 0 ? userCountResult[0].values[0][0] : 0;

  // Always seed 5S items if missing
  await seed5SItems(db);

  if (userCount > 0) {
    return; // Production data already seeded
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
