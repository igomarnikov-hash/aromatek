const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Порядок статусов партии — нельзя перепрыгивать
  const STATUS_ORDER = ['open', 'printing', 'diecut', 'threading', 'perfuming', 'packaging', 'completed'];

  function getStatusIndex(status) {
    return STATUS_ORDER.indexOf(status);
  }

  function isValidTransition(from, to) {
    if (to === 'cancelled') return true; // отмена доступна из любого статуса
    const fromIdx = getStatusIndex(from);
    const toIdx = getStatusIndex(to);
    if (fromIdx === -1 || toIdx === -1) return false;
    return toIdx === fromIdx + 1; // только на один шаг вперёд
  }

  // Helper function to generate batch number
  function generateBatchNumber(productName, date) {
    const productCode = productName.substring(0, 3).toUpperCase();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM batches
      WHERE batch_number LIKE ?
    `).get(dateStr + '%');
    const count = (countResult?.count || 0) + 1;
    const paddedCount = String(count).padStart(3, '0');
    return `${dateStr}_${productCode}_${paddedCount}`;
  }

  // GET all batches with filters
  router.get('/batches', (req, res) => {
    try {
      const { status, search } = req.query;
      let query = `
        SELECT
          b.id,
          b.batch_number,
          b.product_name,
          b.tech_card_id,
          b.quantity_planned,
          b.quantity_produced,
          b.status,
          b.notes,
          b.created_by,
          b.created_at,
          b.updated_at,
          tc.name as tech_card_name,
          u.name as created_by_name
        FROM batches b
        LEFT JOIN tech_cards tc ON b.tech_card_id = tc.id
        LEFT JOIN users u ON b.created_by = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND b.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (b.batch_number LIKE ? OR b.product_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      query += ' ORDER BY b.created_at DESC';

      const batches = db.prepare(query).all(...params);

      res.json({
        success: true,
        data: batches
      });
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении партий'
      });
    }
  });

  // GET single batch with related sessions counts
  router.get('/batches/:id', (req, res) => {
    try {
      const { id } = req.params;

      const batch = db.prepare(`
        SELECT
          b.id,
          b.batch_number,
          b.product_name,
          b.tech_card_id,
          b.quantity_planned,
          b.quantity_produced,
          b.status,
          b.notes,
          b.created_by,
          b.created_at,
          b.updated_at,
          tc.name as tech_card_name,
          u.name as created_by_name
        FROM batches b
        LEFT JOIN tech_cards tc ON b.tech_card_id = tc.id
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.id = ?
      `).get(id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия не найдена'
        });
      }

      res.json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении партии'
      });
    }
  });

  // POST create new batch
  router.post('/batches', (req, res) => {
    try {
      const { productName, techCardId, quantityPlanned, plannedQuantity, notes, createdBy, userId } = req.body;
      const creator = createdBy || userId;
      const qty = quantityPlanned || plannedQuantity;

      if (!productName || !qty || qty <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Имя продукта и положительное количество обязательны'
        });
      }

      if (!creator) {
        return res.status(400).json({
          success: false,
          error: 'Не указан пользователь'
        });
      }

      if (techCardId) {
        const techCard = db.prepare('SELECT * FROM tech_cards WHERE id = ?').get(techCardId);
        if (!techCard) {
          return res.status(404).json({
            success: false,
            error: 'Технологическая карта не найдена'
          });
        }
      }

      const batchNumber = generateBatchNumber(productName, new Date());

      const result = db.prepare(`
        INSERT INTO batches
        (batch_number, product_name, tech_card_id, quantity_planned, status, notes, created_by)
        VALUES (?, ?, ?, ?, 'open', ?, ?)
      `).run(batchNumber, productName, techCardId || null, qty, notes || null, creator);

      const batchId = result.lastInsertRowid;

      db.prepare(`
        INSERT INTO events_log (user_id, action, details)
        VALUES (?, ?, ?)
      `).run(creator, 'Партия создана', `${batchNumber} - ${productName} - Количество: ${qty} шт.`);

      const batch = db.prepare(`
        SELECT
          b.id, b.batch_number, b.product_name, b.tech_card_id,
          b.quantity_planned, b.quantity_produced, b.status, b.notes,
          b.created_by, b.created_at, b.updated_at,
          tc.name as tech_card_name, u.name as created_by_name
        FROM batches b
        LEFT JOIN tech_cards tc ON b.tech_card_id = tc.id
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.id = ?
      `).get(batchId);

      res.status(201).json({ success: true, data: batch });
    } catch (error) {
      console.error('Error creating batch:', error);
      res.status(500).json({ success: false, error: 'Ошибка при создании партии' });
    }
  });

  // PUT update batch — с проверкой последовательности статусов
  router.put('/batches/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, quantityProduced, forceStatus, userRole } = req.body;

      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({ success: false, error: 'Партия не найдена' });
      }

      // Валидация последовательности статусов (только не-администраторы)
      if (status !== undefined && status !== batch.status) {
        const isAdmin = userRole === 'admin' || forceStatus === true;
        if (!isAdmin && !isValidTransition(batch.status, status)) {
          const currentIdx = getStatusIndex(batch.status);
          const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1
            ? STATUS_ORDER[currentIdx + 1]
            : null;
          return res.status(400).json({
            success: false,
            error: `Нельзя перейти из "${batch.status}" в "${status}". Следующий статус: "${nextStatus || 'нет'}"`
          });
        }
      }

      const updateFields = [];
      const updateValues = [];

      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }
      if (quantityProduced !== undefined) {
        updateFields.push('quantity_produced = ?');
        updateValues.push(quantityProduced);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        db.prepare(`UPDATE batches SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      }

      const updated = db.prepare(`
        SELECT
          b.id, b.batch_number, b.product_name, b.tech_card_id,
          b.quantity_planned, b.quantity_produced, b.status, b.notes,
          b.created_by, b.created_at, b.updated_at,
          tc.name as tech_card_name, u.name as created_by_name
        FROM batches b
        LEFT JOIN tech_cards tc ON b.tech_card_id = tc.id
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.id = ?
      `).get(id);

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating batch:', error);
      res.status(500).json({ success: false, error: 'Ошибка при обновлении партии' });
    }
  });

  // GET operations for a batch
  router.get('/batches/:id/operations', (req, res) => {
    try {
      const { id } = req.params;
      const ops = db.prepare(`
        SELECT o.id, o.batch_id, o.stage, o.quantity_processed, o.notes,
               o.op_status, o.started_at, o.completed_at, o.time_locked,
               o.created_at, u.name as operator_name
        FROM batch_operations o
        LEFT JOIN users u ON o.operator_id = u.id
        WHERE o.batch_id = ?
        ORDER BY o.created_at ASC
      `).all(id);
      res.json({ success: true, data: ops });
    } catch (error) {
      console.error('Error fetching batch operations:', error);
      res.status(500).json({ success: false, error: 'Ошибка при получении операций' });
    }
  });

  // POST create operation for a batch
  router.post('/batches/:id/operations', (req, res) => {
    try {
      const { id } = req.params;
      const { stage, quantityProcessed, notes, userId } = req.body;

      if (!stage) {
        return res.status(400).json({ success: false, error: 'Укажите этап' });
      }

      // Создаём операцию со статусом pending
      const result = db.prepare(`
        INSERT INTO batch_operations (batch_id, stage, quantity_processed, notes, operator_id, op_status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(id, stage, Number(quantityProcessed) || 0, notes || null, userId || null);

      db.prepare(`
        INSERT INTO events_log (user_id, action, details) VALUES (?, ?, ?)
      `).run(userId || null, 'Операция создана', `Партия #${id}, этап: ${stage}`);

      const op = db.prepare(`
        SELECT o.*, u.name as operator_name FROM batch_operations o
        LEFT JOIN users u ON o.operator_id = u.id
        WHERE o.id = ?
      `).get(result.lastInsertRowid);
      res.status(201).json({ success: true, data: op });
    } catch (error) {
      console.error('Error creating batch operation:', error);
      res.status(500).json({ success: false, error: 'Ошибка при создании операции' });
    }
  });

  // PATCH start an operation (фиксируем время начала)
  router.patch('/batches/:id/operations/:opId/start', (req, res) => {
    try {
      const { id, opId } = req.params;
      const { userId } = req.body;

      const op = db.prepare('SELECT * FROM batch_operations WHERE id = ? AND batch_id = ?').get(opId, id);
      if (!op) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }
      if (op.started_at) {
        return res.status(400).json({ success: false, error: 'Операция уже запущена' });
      }

      // Проверяем: нет ли другой активной операции в этой партии
      const activeOp = db.prepare(`
        SELECT id, stage FROM batch_operations
        WHERE batch_id = ? AND id != ? AND op_status = 'in_progress'
        LIMIT 1
      `).get(id, opId);
      if (activeOp) {
        return res.status(400).json({
          success: false,
          error: `Нельзя запустить операцию — в этой партии уже выполняется операция (этап: ${activeOp.stage}). Завершите её перед запуском новой.`
        });
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE batch_operations SET started_at = ?, op_status = 'in_progress' WHERE id = ?
      `).run(now, opId);

      db.prepare(`INSERT INTO events_log (user_id, action, details) VALUES (?, ?, ?)`)
        .run(userId || null, 'Операция запущена', `Партия #${id}, операция #${opId}, этап: ${op.stage}`);

      const updated = db.prepare(`
        SELECT o.*, u.name as operator_name FROM batch_operations o
        LEFT JOIN users u ON o.operator_id = u.id WHERE o.id = ?
      `).get(opId);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error starting operation:', error);
      res.status(500).json({ success: false, error: 'Ошибка при запуске операции' });
    }
  });

  // PATCH complete an operation (фиксируем время завершения + блокируем)
  router.patch('/batches/:id/operations/:opId/complete', (req, res) => {
    try {
      const { id, opId } = req.params;
      const { userId, quantityProcessed, notes } = req.body;

      const op = db.prepare('SELECT * FROM batch_operations WHERE id = ? AND batch_id = ?').get(opId, id);
      if (!op) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }
      if (op.completed_at) {
        return res.status(400).json({ success: false, error: 'Операция уже завершена' });
      }
      if (!op.started_at) {
        return res.status(400).json({ success: false, error: 'Сначала нажмите "Старт"' });
      }

      const now = new Date().toISOString();

      const updateFields = ['completed_at = ?', 'op_status = ?', 'time_locked = 1'];
      const updateValues = [now, 'completed'];

      if (quantityProcessed !== undefined) {
        updateFields.push('quantity_processed = ?');
        updateValues.push(Number(quantityProcessed));
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }
      updateValues.push(opId);

      db.prepare(`UPDATE batch_operations SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

      // При завершении упаковки — обновляем quantity_produced
      if (op.stage === 'packaging') {
        db.prepare(`
          UPDATE batches SET
            quantity_produced = (
              SELECT COALESCE(SUM(quantity_processed), 0)
              FROM batch_operations WHERE batch_id = ? AND stage = 'packaging' AND op_status = 'completed'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(id, id);
      }

      db.prepare(`INSERT INTO events_log (user_id, action, details) VALUES (?, ?, ?)`)
        .run(userId || null, 'Операция завершена', `Партия #${id}, операция #${opId}, этап: ${op.stage}`);

      const updated = db.prepare(`
        SELECT o.*, u.name as operator_name FROM batch_operations o
        LEFT JOIN users u ON o.operator_id = u.id WHERE o.id = ?
      `).get(opId);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error completing operation:', error);
      res.status(500).json({ success: false, error: 'Ошибка при завершении операции' });
    }
  });

  // PATCH update operation times (только администратор)
  router.patch('/batches/:id/operations/:opId/time', (req, res) => {
    try {
      const { id, opId } = req.params;
      const { userId, userRole, startedAt, completedAt } = req.body;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Только администратор может изменять время операций' });
      }

      const op = db.prepare('SELECT * FROM batch_operations WHERE id = ? AND batch_id = ?').get(opId, id);
      if (!op) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }

      const updateFields = [];
      const updateValues = [];

      if (startedAt !== undefined) {
        updateFields.push('started_at = ?');
        updateValues.push(startedAt);
      }
      if (completedAt !== undefined) {
        updateFields.push('completed_at = ?');
        updateValues.push(completedAt);
      }

      if (updateFields.length > 0) {
        updateValues.push(opId);
        db.prepare(`UPDATE batch_operations SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      }

      db.prepare(`INSERT INTO events_log (user_id, action, details) VALUES (?, ?, ?)`)
        .run(userId || null, 'Время операции изменено администратором', `Операция #${opId}`);

      const updated = db.prepare(`
        SELECT o.*, u.name as operator_name FROM batch_operations o
        LEFT JOIN users u ON o.operator_id = u.id WHERE o.id = ?
      `).get(opId);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating operation time:', error);
      res.status(500).json({ success: false, error: 'Ошибка при изменении времени' });
    }
  });

  // PUT update operation quantity/notes
  router.put('/batches/:id/operations/:opId', (req, res) => {
    try {
      const { id, opId } = req.params;
      const { quantityProcessed, notes, userId, userRole } = req.body;

      const op = db.prepare('SELECT * FROM batch_operations WHERE id = ? AND batch_id = ?').get(opId, id);
      if (!op) {
        return res.status(404).json({ success: false, error: 'Операция не найдена' });
      }

      // Завершённые операции могут редактировать только администраторы
      if (op.time_locked && userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Завершённая операция доступна только администратору' });
      }

      const updateFields = [];
      const updateValues = [];

      if (quantityProcessed !== undefined) {
        updateFields.push('quantity_processed = ?');
        updateValues.push(Number(quantityProcessed));
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes);
      }

      if (updateFields.length > 0) {
        updateValues.push(opId);
        db.prepare(`UPDATE batch_operations SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      }

      const updated = db.prepare(`
        SELECT o.*, u.name as operator_name FROM batch_operations o
        LEFT JOIN users u ON o.operator_id = u.id WHERE o.id = ?
      `).get(opId);
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating operation:', error);
      res.status(500).json({ success: false, error: 'Ошибка при обновлении операции' });
    }
  });

  return router;
};
