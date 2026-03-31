const express = require('express');
const XLSX = require('xlsx');

module.exports = function(db) {
  const router = express.Router();

  const STATUS_LABELS = {
    planned: 'Запланирована',
    in_progress: 'В работе',
    completed: 'Завершена',
    quality_check: 'Контроль качества'
  };

  const PRIORITY_LABELS = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
  };

  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
    } catch {
      return isoString;
    }
  }

  function setColumnWidths(ws, widths) {
    ws['!cols'] = widths.map(w => ({ wch: w }));
  }

  function styleHeader(ws, range) {
    // Apply bold header style using sheet range
    ws['!autofilter'] = { ref: range };
  }

  // GET /api/export/tasks — экспорт производственных заданий
  router.get('/export/tasks', (req, res) => {
    try {
      const tasks = db.prepare(`
        SELECT
          pt.id,
          tc.name as tech_card_name,
          u.name as assigned_to_name,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        ORDER BY pt.created_at DESC
      `).all();

      const data = tasks.map(t => ({
        '№': t.id,
        'Техкарта': t.tech_card_name,
        'Исполнитель': t.assigned_to_name,
        'Запланировано': t.quantity_planned,
        'Произведено': t.quantity_produced || 0,
        'Брак': t.quantity_defect || 0,
        'Выполнение, %': t.quantity_planned > 0
          ? Math.round(((t.quantity_produced || 0) / t.quantity_planned) * 100)
          : 0,
        'Причина брака': t.defect_reason || '',
        'Статус': STATUS_LABELS[t.status] || t.status,
        'Приоритет': PRIORITY_LABELS[t.priority] || t.priority,
        'Начало': formatDate(t.start_time),
        'Завершение': formatDate(t.end_time),
        'Создана': formatDate(t.created_at)
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      setColumnWidths(ws, [5, 30, 20, 14, 14, 8, 14, 25, 18, 12, 20, 20, 20]);
      styleHeader(ws, `A1:M${data.length + 1}`);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Задания');

      // Сводный лист
      const completed = tasks.filter(t => t.status === 'completed');
      const totalPlanned = tasks.reduce((s, t) => s + (t.quantity_planned || 0), 0);
      const totalProduced = tasks.reduce((s, t) => s + (t.quantity_produced || 0), 0);
      const totalDefect = tasks.reduce((s, t) => s + (t.quantity_defect || 0), 0);

      const summaryData = [
        { 'Показатель': 'Всего заданий', 'Значение': tasks.length },
        { 'Показатель': 'Завершено', 'Значение': completed.length },
        { 'Показатель': 'В работе', 'Значение': tasks.filter(t => t.status === 'in_progress').length },
        { 'Показатель': 'Запланировано', 'Значение': tasks.filter(t => t.status === 'planned').length },
        { 'Показатель': 'Контроль качества', 'Значение': tasks.filter(t => t.status === 'quality_check').length },
        { 'Показатель': '', 'Значение': '' },
        { 'Показатель': 'Всего запланировано (шт)', 'Значение': totalPlanned },
        { 'Показатель': 'Всего произведено (шт)', 'Значение': totalProduced },
        { 'Показатель': 'Всего брак (шт)', 'Значение': totalDefect },
        { 'Показатель': 'Общий % выполнения', 'Значение': totalPlanned > 0 ? `${Math.round((totalProduced / totalPlanned) * 100)}%` : '0%' },
        { 'Показатель': '% брака', 'Значение': totalProduced > 0 ? `${((totalDefect / totalProduced) * 100).toFixed(1)}%` : '0%' },
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `zadaniya_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (error) {
      console.error('Export tasks error:', error);
      res.status(500).json({ success: false, error: 'Ошибка при экспорте заданий' });
    }
  });

  // GET /api/export/materials — экспорт материалов
  router.get('/export/materials', (req, res) => {
    try {
      const materials = db.prepare(`
        SELECT id, name, quantity, unit, min_quantity, category, updated_at
        FROM materials
        ORDER BY category, name
      `).all();

      const data = materials.map(m => ({
        '№': m.id,
        'Наименование': m.name,
        'Категория': m.category || '',
        'Количество': m.quantity,
        'Единица': m.unit,
        'Мин. остаток': m.min_quantity,
        'Статус': m.quantity <= 0
          ? 'Нет в наличии'
          : m.quantity <= m.min_quantity
            ? 'Мало'
            : 'В норме',
        'Обновлено': formatDate(m.updated_at)
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      setColumnWidths(ws, [5, 35, 20, 12, 10, 14, 14, 20]);
      styleHeader(ws, `A1:H${data.length + 1}`);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Материалы');

      // Лист с дефицитом
      const deficit = materials.filter(m => m.quantity <= m.min_quantity);
      if (deficit.length > 0) {
        const deficitData = deficit.map(m => ({
          'Наименование': m.name,
          'Категория': m.category || '',
          'Остаток': m.quantity,
          'Мин. остаток': m.min_quantity,
          'Единица': m.unit,
          'Нехватка': Math.max(0, m.min_quantity - m.quantity)
        }));
        const wsDeficit = XLSX.utils.json_to_sheet(deficitData);
        wsDeficit['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsDeficit, 'Дефицит');
      }

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `materialy_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (error) {
      console.error('Export materials error:', error);
      res.status(500).json({ success: false, error: 'Ошибка при экспорте материалов' });
    }
  });

  // GET /api/export/techcards — экспорт техкарт
  router.get('/export/techcards', (req, res) => {
    try {
      const techCards = db.prepare(`
        SELECT id, name, description, version, is_active, created_at
        FROM tech_cards
        ORDER BY name
      `).all();

      const items = db.prepare(`
        SELECT
          tci.tech_card_id,
          m.name as material_name,
          m.unit,
          tci.quantity_per_unit
        FROM tech_card_items tci
        JOIN materials m ON tci.material_id = m.id
      `).all();

      // Группируем items по tech_card_id
      const itemsMap = {};
      items.forEach(item => {
        if (!itemsMap[item.tech_card_id]) itemsMap[item.tech_card_id] = [];
        itemsMap[item.tech_card_id].push(item);
      });

      // Основной лист: техкарты
      const cardsData = techCards.map(tc => ({
        '№': tc.id,
        'Название': tc.name,
        'Описание': tc.description || '',
        'Версия': tc.version || '1.0',
        'Статус': tc.is_active ? 'Активна' : 'Неактивна',
        'Кол-во материалов': (itemsMap[tc.id] || []).length,
        'Создана': formatDate(tc.created_at)
      }));

      const wsCards = XLSX.utils.json_to_sheet(cardsData);
      wsCards['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];
      styleHeader(wsCards, `A1:G${cardsData.length + 1}`);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsCards, 'Техкарты');

      // Лист: состав (все материалы всех техкарт)
      const compositionData = [];
      techCards.forEach(tc => {
        const cardItems = itemsMap[tc.id] || [];
        cardItems.forEach(item => {
          compositionData.push({
            'Техкарта': tc.name,
            'Материал': item.material_name,
            'Количество на ед.': item.quantity_per_unit,
            'Единица': item.unit
          });
        });
      });

      if (compositionData.length > 0) {
        const wsComp = XLSX.utils.json_to_sheet(compositionData);
        wsComp['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 18 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsComp, 'Состав');
      }

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `tekhkarty_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (error) {
      console.error('Export techcards error:', error);
      res.status(500).json({ success: false, error: 'Ошибка при экспорте техкарт' });
    }
  });

  // GET /api/export/report — сводный отчёт по производству
  router.get('/export/report', (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;

      let dateFilter = '';
      const params = [];
      if (dateFrom) {
        dateFilter += ' AND pt.created_at >= ?';
        params.push(dateFrom);
      }
      if (dateTo) {
        dateFilter += ' AND pt.created_at <= ?';
        params.push(dateTo + 'T23:59:59');
      }

      const tasks = db.prepare(`
        SELECT
          pt.id, tc.name as tech_card_name,
          u.name as assigned_to_name,
          pt.quantity_planned, pt.quantity_produced, pt.quantity_defect,
          pt.status, pt.start_time, pt.end_time, pt.created_at
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE 1=1 ${dateFilter}
        ORDER BY pt.created_at DESC
      `).all(...params);

      const materials = db.prepare('SELECT * FROM materials ORDER BY category, name').all();

      const wb = XLSX.utils.book_new();
      const now = new Date().toLocaleString('ru-RU');

      // === Лист 1: Сводка ===
      const totalPlanned = tasks.reduce((s, t) => s + (t.quantity_planned || 0), 0);
      const totalProduced = tasks.reduce((s, t) => s + (t.quantity_produced || 0), 0);
      const totalDefect = tasks.reduce((s, t) => s + (t.quantity_defect || 0), 0);
      const deficitMaterials = materials.filter(m => m.quantity <= m.min_quantity);

      const summaryData = [
        { 'Показатель': 'Дата формирования отчёта', 'Значение': now },
        { 'Показатель': '', 'Значение': '' },
        { 'Показатель': '=== ПРОИЗВОДСТВО ===', 'Значение': '' },
        { 'Показатель': 'Всего заданий', 'Значение': tasks.length },
        { 'Показатель': 'Завершено', 'Значение': tasks.filter(t => t.status === 'completed').length },
        { 'Показатель': 'В работе', 'Значение': tasks.filter(t => t.status === 'in_progress').length },
        { 'Показатель': 'Запланировано', 'Значение': tasks.filter(t => t.status === 'planned').length },
        { 'Показатель': 'Запланировано единиц', 'Значение': totalPlanned },
        { 'Показатель': 'Произведено единиц', 'Значение': totalProduced },
        { 'Показатель': 'Брак единиц', 'Значение': totalDefect },
        { 'Показатель': '% выполнения плана', 'Значение': totalPlanned > 0 ? `${Math.round((totalProduced / totalPlanned) * 100)}%` : '0%' },
        { 'Показатель': '% брака', 'Значение': totalProduced > 0 ? `${((totalDefect / totalProduced) * 100).toFixed(1)}%` : '0%' },
        { 'Показатель': '', 'Значение': '' },
        { 'Показатель': '=== СКЛАД ===', 'Значение': '' },
        { 'Показатель': 'Всего позиций материалов', 'Значение': materials.length },
        { 'Показатель': 'Позиций с дефицитом', 'Значение': deficitMaterials.length },
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Сводка');

      // === Лист 2: Задания ===
      const tasksData = tasks.map(t => ({
        '№': t.id,
        'Техкарта': t.tech_card_name,
        'Исполнитель': t.assigned_to_name,
        'Запланировано': t.quantity_planned,
        'Произведено': t.quantity_produced || 0,
        'Брак': t.quantity_defect || 0,
        '% выполнения': t.quantity_planned > 0
          ? `${Math.round(((t.quantity_produced || 0) / t.quantity_planned) * 100)}%`
          : '0%',
        'Статус': STATUS_LABELS[t.status] || t.status,
        'Дата': formatDate(t.created_at)
      }));

      const wsTasks = XLSX.utils.json_to_sheet(tasksData);
      wsTasks['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsTasks, 'Задания');

      // === Лист 3: Материалы ===
      const materialsData = materials.map(m => ({
        'Наименование': m.name,
        'Категория': m.category || '',
        'Остаток': m.quantity,
        'Ед.': m.unit,
        'Мин. остаток': m.min_quantity,
        'Статус': m.quantity <= 0 ? 'Нет в наличии' : m.quantity <= m.min_quantity ? '⚠ Мало' : 'В норме'
      }));

      const wsMaterials = XLSX.utils.json_to_sheet(materialsData);
      wsMaterials['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 10 }, { wch: 6 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsMaterials, 'Материалы');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `otchet_aromapro_${new Date().toISOString().slice(0, 10)}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.send(buf);
    } catch (error) {
      console.error('Export report error:', error);
      res.status(500).json({ success: false, error: 'Ошибка при формировании отчёта' });
    }
  });

  return router;
};
