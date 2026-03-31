const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all production tasks with filters
  router.get('/tasks', (req, res) => {
    try {
      const { status, assignedTo } = req.query;
      let query = `
        SELECT
          pt.id,
          pt.tech_card_id,
          pt.assigned_to,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at,
          tc.name as tech_card_name,
          u.name as assigned_to_name
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND pt.status = ?';
        params.push(status);
      }

      if (assignedTo) {
        query += ' AND pt.assigned_to = ?';
        params.push(assignedTo);
      }

      query += ' ORDER BY pt.priority DESC, pt.created_at DESC';

      const tasks = db.prepare(query).all(...params);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении задач'
      });
    }
  });

  // GET single task
  router.get('/tasks/:id', (req, res) => {
    try {
      const { id } = req.params;
      const task = db.prepare(`
        SELECT
          pt.id,
          pt.tech_card_id,
          pt.assigned_to,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at,
          tc.name as tech_card_name,
          u.name as assigned_to_name
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Задача не найдена'
        });
      }

      // Get tech card items for reference
      const techCardItems = db.prepare(`
        SELECT
          tci.id,
          tci.material_id,
          tci.quantity_per_unit,
          m.name as material_name,
          m.quantity as material_quantity,
          m.unit
        FROM tech_card_items tci
        JOIN materials m ON tci.material_id = m.id
        WHERE tci.tech_card_id = ?
      `).all(task.tech_card_id);

      res.json({
        success: true,
        data: {
          ...task,
          techCardItems: techCardItems
        }
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении задачи'
      });
    }
  });

  // POST create new task
  router.post('/tasks', (req, res) => {
    try {
      const { techCardId, assignedTo, quantityPlanned, priority, userId } = req.body;

      if (!techCardId || !assignedTo || !quantityPlanned || quantityPlanned <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Все поля обязательны, количество должно быть положительным'
        });
      }

      // Check if tech card exists
      const techCard = db.prepare('SELECT * FROM tech_cards WHERE id = ?').get(techCardId);
      if (!techCard) {
        return res.status(404).json({
          success: false,
          error: 'Технологическая карта не найдена'
        });
      }

      // Check material availability
      const techCardItems = db.prepare(`
        SELECT tci.material_id, tci.quantity_per_unit, m.quantity as material_quantity
        FROM tech_card_items tci
        JOIN materials m ON tci.material_id = m.id
        WHERE tci.tech_card_id = ?
      `).all(techCardId);

      const insufficientMaterials = [];
      techCardItems.forEach(item => {
        const neededQuantity = item.quantity_per_unit * quantityPlanned;
        if (item.material_quantity < neededQuantity) {
          insufficientMaterials.push({
            materialId: item.material_id,
            needed: neededQuantity,
            available: item.material_quantity
          });
        }
      });

      if (insufficientMaterials.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Недостаточно материалов для выполнения задачи',
          insufficientMaterials: insufficientMaterials
        });
      }

      // Create task
      const result = db.prepare(`
        INSERT INTO production_tasks
        (tech_card_id, assigned_to, quantity_planned, status, priority)
        VALUES (?, ?, ?, 'planned', ?)
      `).run(techCardId, assignedTo, quantityPlanned, priority || 'medium');

      const taskId = result.lastInsertRowid;

      // Log event
      if (userId) {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
        const assignedUser = db.prepare('SELECT name FROM users WHERE id = ?').get(assignedTo);
        db.prepare(`
          INSERT INTO events_log (user_id, action, details)
          VALUES (?, ?, ?)
        `).run(userId, 'Задача создана', `${techCard.name} - Количество: ${quantityPlanned} шт. (Назначена: ${assignedUser.name})`);
      }

      // Fetch created task
      const task = db.prepare(`
        SELECT
          pt.id,
          pt.tech_card_id,
          pt.assigned_to,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at,
          tc.name as tech_card_name,
          u.name as assigned_to_name
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(taskId);

      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании задачи'
      });
    }
  });

  // PUT update task
  router.put('/tasks/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { quantityProduced, quantityDefect, defectReason, priority } = req.body;

      const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Задача не найдена'
        });
      }

      db.prepare(`
        UPDATE production_tasks
        SET quantity_produced = ?, quantity_defect = ?, defect_reason = ?, priority = ?
        WHERE id = ?
      `).run(
        quantityProduced !== undefined ? quantityProduced : task.quantity_produced,
        quantityDefect !== undefined ? quantityDefect : task.quantity_defect,
        defectReason || task.defect_reason,
        priority || task.priority,
        id
      );

      const updated = db.prepare(`
        SELECT
          pt.id,
          pt.tech_card_id,
          pt.assigned_to,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at,
          tc.name as tech_card_name,
          u.name as assigned_to_name
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении задачи'
      });
    }
  });

  // POST start task
  router.post('/tasks/:id/start', (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Задача не найдена'
        });
      }

      if (task.status !== 'planned') {
        return res.status(400).json({
          success: false,
          error: `Не может быть начата задача со статусом "${task.status}"`
        });
      }

      const startTime = new Date().toISOString();

      db.prepare(`
        UPDATE production_tasks
        SET status = 'in_progress', start_time = ?
        WHERE id = ?
      `).run(startTime, id);

      // Log event
      if (userId) {
        const techCard = db.prepare('SELECT name FROM tech_cards WHERE id = ?').get(task.tech_card_id);
        db.prepare(`
          INSERT INTO events_log (user_id, action, details)
          VALUES (?, ?, ?)
        `).run(userId, 'Задача начата', `${techCard.name} - Количество: ${task.quantity_planned}`);
      }

      const updated = db.prepare(`
        SELECT
          pt.id,
          pt.tech_card_id,
          pt.assigned_to,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at,
          tc.name as tech_card_name,
          u.name as assigned_to_name
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error starting task:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при запуске задачи'
      });
    }
  });

  // POST complete task
  router.post('/tasks/:id/complete', (req, res) => {
    try {
      const { id } = req.params;
      const { quantityProduced, userId } = req.body;

      const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Задача не найдена'
        });
      }

      if (task.status !== 'in_progress' && task.status !== 'quality_check') {
        return res.status(400).json({
          success: false,
          error: `Не может быть завершена задача со статусом "${task.status}"`
        });
      }

      const endTime = new Date().toISOString();
      const finalQuantity = quantityProduced || task.quantity_produced;

      // Start transaction-like operation
      db.prepare(`
        UPDATE production_tasks
        SET status = 'completed', end_time = ?, quantity_produced = ?
        WHERE id = ?
      `).run(endTime, finalQuantity, id);

      // Auto-consume materials based on tech card
      const techCardItems = db.prepare(`
        SELECT tci.material_id, tci.quantity_per_unit
        FROM tech_card_items tci
        WHERE tci.tech_card_id = ?
      `).all(task.tech_card_id);

      techCardItems.forEach(item => {
        const consumeQuantity = item.quantity_per_unit * finalQuantity;
        db.prepare(`
          UPDATE materials
          SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(consumeQuantity, item.material_id);
      });

      // Log event
      if (userId) {
        const techCard = db.prepare('SELECT name FROM tech_cards WHERE id = ?').get(task.tech_card_id);
        db.prepare(`
          INSERT INTO events_log (user_id, action, details)
          VALUES (?, ?, ?)
        `).run(userId, 'Задача завершена', `${techCard.name} - Произведено: ${finalQuantity}, Брак: ${task.quantity_defect}`);
      }

      const updated = db.prepare(`
        SELECT
          pt.id,
          pt.tech_card_id,
          pt.assigned_to,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at,
          tc.name as tech_card_name,
          u.name as assigned_to_name
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при завершении задачи'
      });
    }
  });

  // POST report defect
  router.post('/tasks/:id/defect', (req, res) => {
    try {
      const { id } = req.params;
      const { quantityDefect, reason, userId } = req.body;

      if (!quantityDefect || quantityDefect <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Количество брака должно быть положительным числом'
        });
      }

      const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Задача не найдена'
        });
      }

      const newDefectQuantity = task.quantity_defect + quantityDefect;

      if (newDefectQuantity > task.quantity_planned) {
        return res.status(400).json({
          success: false,
          error: `Количество брака не может превышать запланированное количество (${task.quantity_planned})`
        });
      }

      db.prepare(`
        UPDATE production_tasks
        SET quantity_defect = ?, defect_reason = ?, status = 'quality_check'
        WHERE id = ?
      `).run(newDefectQuantity, reason || null, id);

      // Log event
      if (userId) {
        const techCard = db.prepare('SELECT name FROM tech_cards WHERE id = ?').get(task.tech_card_id);
        db.prepare(`
          INSERT INTO events_log (user_id, action, details)
          VALUES (?, ?, ?)
        `).run(userId, 'Дефект зафиксирован', `${techCard.name} - Брак: ${quantityDefect} шт. (${reason || 'без причины'})`);
      }

      const updated = db.prepare(`
        SELECT
          pt.id,
          pt.tech_card_id,
          pt.assigned_to,
          pt.quantity_planned,
          pt.quantity_produced,
          pt.quantity_defect,
          pt.defect_reason,
          pt.status,
          pt.priority,
          pt.start_time,
          pt.end_time,
          pt.created_at,
          tc.name as tech_card_name,
          u.name as assigned_to_name
        FROM production_tasks pt
        JOIN tech_cards tc ON pt.tech_card_id = tc.id
        JOIN users u ON pt.assigned_to = u.id
        WHERE pt.id = ?
      `).get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error reporting defect:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при регистрации дефекта'
      });
    }
  });

  return router;
};
