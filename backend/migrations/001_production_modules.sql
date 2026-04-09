-- ============================================================
-- MIGRATION 001: Production Modules for Air Freshener System
-- АромаТек — Полный цикл производства
-- ============================================================

-- 1. ПАРТИИ (Batch tracking — central hub)
CREATE TABLE IF NOT EXISTS production_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_number TEXT UNIQUE NOT NULL,     -- YYYYMMDD_AROMA_001
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
);

-- 2. ТРАФАРЕТНЫЕ СЕТКИ (Screen stencils)
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
);

-- 3. ЗАКАЗЫ LITOSCAN (Contractor orders)
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
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (screen_id) REFERENCES screens(id)
);

-- 4. ПАРТИИ КРАСКИ (Ink mixing batches)
CREATE TABLE IF NOT EXISTS ink_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ink_batch_number TEXT UNIQUE NOT NULL,
  batch_id INTEGER,
  product_name TEXT NOT NULL,
  components TEXT NOT NULL DEFAULT '[]',  -- JSON: [{name, planned_g, actual_g}]
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
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 5. СЕАНСЫ ПЕЧАТИ (Print sessions)
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
  -- Сторона 1
  side1_start DATETIME,
  side1_end DATETIME,
  -- Сторона 2
  side2_start DATETIME,
  side2_end DATETIME,
  -- Брак
  defect_count INTEGER DEFAULT 0,
  defect_smear INTEGER DEFAULT 0,       -- смаз
  defect_underfill INTEGER DEFAULT 0,   -- недолив
  defect_offset INTEGER DEFAULT 0,      -- смещение
  defect_screen INTEGER DEFAULT 0,      -- дефект сетки
  defect_other INTEGER DEFAULT 0,
  defect_notes TEXT,
  -- Сушка
  drying_load_time DATETIME,
  drying_unload_time DATETIME,
  drying_temperature_c REAL DEFAULT 0,
  drying_result TEXT DEFAULT 'pending'
    CHECK(drying_result IN ('pending','ok','defect')),
  -- Статус
  status TEXT DEFAULT 'planned'
    CHECK(status IN ('planned','side1','side2','drying','completed','cancelled')),
  operator_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (screen_id) REFERENCES screens(id),
  FOREIGN KEY (ink_batch_id) REFERENCES ink_batches(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 6. ВЫРУБКА (Die cutting sessions)
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
  -- Брак
  defect_count INTEGER DEFAULT 0,
  defect_underpress INTEGER DEFAULT 0,  -- недопресс
  defect_burr INTEGER DEFAULT 0,        -- заусенцы
  defect_deform INTEGER DEFAULT 0,      -- деформация
  defect_notes TEXT,
  -- Хранение
  storage_container TEXT DEFAULT '',
  storage_cell TEXT DEFAULT '',
  -- Время
  start_time DATETIME,
  end_time DATETIME,
  status TEXT DEFAULT 'planned'
    CHECK(status IN ('planned','in_progress','completed','cancelled')),
  operator_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (print_session_id) REFERENCES print_sessions(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 7. ПРОБИВКА ОТВЕРСТИЙ И НАВЕСКА НИТИ
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
  defect_thread_break INTEGER DEFAULT 0,  -- разрыв нити
  defect_no_hole INTEGER DEFAULT 0,       -- непробитое отверстие
  defect_notes TEXT,
  start_time DATETIME,
  end_time DATETIME,
  status TEXT DEFAULT 'planned'
    CHECK(status IN ('planned','in_progress','completed','cancelled')),
  operator_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (diecut_session_id) REFERENCES diecut_sessions(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 8. ФОРМУЛЫ ПАРФЮМЕРНЫХ СМЕСЕЙ
CREATE TABLE IF NOT EXISTS perfume_formulas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  product_code TEXT DEFAULT '',
  version TEXT DEFAULT '1.0',
  is_reference INTEGER DEFAULT 0,   -- 1 = только просмотр, редактирует admin
  components TEXT NOT NULL DEFAULT '[]',  -- JSON: [{name, cas, supplier, ratio_pct, g_per_unit}]
  total_volume_per_unit_ml REAL DEFAULT 0,
  deviation_threshold_pct REAL DEFAULT 5.0,
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 9. ПАРТИИ ПАРФЮМЕРНЫХ СМЕСЕЙ
CREATE TABLE IF NOT EXISTS perfume_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  perfume_number TEXT UNIQUE NOT NULL,
  batch_id INTEGER,
  formula_id INTEGER,
  quantity_planned INTEGER DEFAULT 0,
  -- Сырьё
  actual_components TEXT DEFAULT '[]',  -- JSON: фактические замеры
  has_deviation INTEGER DEFAULT 0,      -- 1 = превышен порог отклонения
  deviation_details TEXT DEFAULT '',
  -- Гомогенизация
  homogenization_start DATETIME,
  homogenization_end DATETIME,
  homogenization_duration_h INTEGER DEFAULT 24,
  flip_log TEXT DEFAULT '[]',           -- JSON: [{time, done_by}]
  -- Результат
  saturation_result TEXT DEFAULT 'pending'
    CHECK(saturation_result IN ('pending','ok','defect')),
  -- Авто-задание на парфюмирование
  saturation_task_created_at DATETIME,
  saturation_task_scheduled_for DATETIME,
  operator_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (formula_id) REFERENCES perfume_formulas(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 10. УПАКОВКА
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
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (thread_op_id) REFERENCES thread_operations(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- 11. ИСТОРИЯ ГЕНЕРАЦИИ PDF (Layout history)
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
  FOREIGN KEY (batch_id) REFERENCES production_batches(id),
  FOREIGN KEY (generated_by) REFERENCES users(id)
);

-- ИНДЕКСЫ для производительности
CREATE INDEX IF NOT EXISTS idx_batches_status ON production_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created ON production_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_screens_status ON screens(status);
CREATE INDEX IF NOT EXISTS idx_print_sessions_batch ON print_sessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_diecut_batch ON diecut_sessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_perfume_batches_batch ON perfume_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_packaging_batch ON packaging_sessions(batch_id);
