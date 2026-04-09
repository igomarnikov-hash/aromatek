const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Helper function to generate batch number
  function generateBatchNumber(productName, date) {
    // Format: YYYYMMDD_PRODUCTCODE_NNN
    // Get first 3 chars of product name, uppercase
    const productCode = productName.substring(0, 3).toUpperCase();

    // Get count of batches created today
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

      // Get session counts for this batch
      const printSessions = db.prepare(`
        SELECT COUNT(*) as count FROM print_sessions WHERE batch_id = ?
      `).get(id);

      const diecutSessions = db.prepare(`
        SELECT COUNT(*) as count FROM diecut_sessions WHERE batch_id = ?
      `).get(id);

      const threadSessions = db.prepare(`
        SELECT COUNT(*) as count FROM thread_sessions WHERE batch_id = ?
      `).get(id);

      const packagingSessions = db.prepare(`
        SELECT COUNT(*) as count FROM packaging_sessions WHERE batch_id = ?
      `).get(id);

      const perfumeSessions = db.prepare(`
        SELECT COUNT(*) as count FROM perfume_sessions WHERE batch_id = ?
      `).get(id);

      res.json({
        success: true,
        data: {
          ...batch,
          sessions: {
            print: printSessions?.count || 0,
            diecut: diecutSessions?.count || 0,
            thread: threadSessions?.count || 0,
            packaging: packagingSessions?.count || 0,
            perfume: perfumeSessions?.count || 0
          }
        }
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

      // Validate required fields
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

      // Verify tech card exists if provided
      if (techCardId) {
        const techCard = db.prepare('SELECT * FROM tech_cards WHERE id = ?').get(techCardId);
        if (!techCard) {
          return res.status(404).json({
            success: false,
            error: 'Технологическая карта не найдена'
          });
        }
      }

      // Generate batch number
      const batchNumber = generateBatchNumber(productName, new Date());

      // Create batch
      const result = db.prepare(`
        INSERT INTO batches
        (batch_number, product_name, tech_card_id, quantity_planned, status, notes, created_by)
        VALUES (?, ?, ?, ?, 'open', ?, ?)
      `).run(batchNumber, productName, techCardId || null, qty, notes || null, creator);

      const batchId = result.lastInsertRowid;

      // Log event
      db.prepare(`
        INSERT INTO events_log (user_id, action, details)
        VALUES (?, ?, ?)
      `).run(creator, 'Партия создана', `${batchNumber} - ${productName} - Количество: ${qty} шт.`);

      // Fetch created batch
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
      `).get(batchId);

      res.status(201).json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании партии'
      });
    }
  });

  // PUT update batch status/notes/quantityProduced
  router.put('/batches/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, quantityProduced } = req.body;

      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия не найдена'
        });
      }

      // Update only provided fields
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

        db.prepare(`
          UPDATE batches
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `).run(...updateValues);
      }

      const updated = db.prepare(`
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

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении партии'
      });
    }
  });

  // GET operations for a batch (lightweight log from batch detail view)
  router.get('/batches/:id/operations', (req, res) => {
    try {
      const { id } = req.params;
      const ops = db.prepare(`
        SELECT o.id, o.batch_id, o.stage, o.quantity_processed, o.notes, o.created_at,
               u.name as operator_name
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

      if (!stage || !quantityProcessed || Number(quantityProcessed) <= 0) {
        return res.status(400).json({ success: false, error: 'Укажите этап и количество' });
      }

      const result = db.prepare(`
        INSERT INTO batch_operations (batch_id, stage, quantity_processed, notes, operator_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, stage, Number(quantityProcessed), notes || null, userId || null);

      // При упаковке — обновляем quantity_produced в партии
      if (stage === 'packaging') {
        db.prepare(`
          UPDATE batches SET
            quantity_produced = (
              SELECT COALESCE(SUM(quantity_processed), 0)
              FROM batch_operations WHERE batch_id = ? AND stage = 'packaging'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(id, id);
      }

      // Log event
      db.prepare(`
        INSERT INTO events_log (user_id, action, details) VALUES (?, ?, ?)
      `).run(userId || null, 'Операция добавлена', `Партия #${id}, этап: ${stage}, кол-во: ${quantityProcessed}`);

      const op = db.prepare('SELECT * FROM batch_operations WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ success: true, data: op });
    } catch (error) {
      console.error('Error creating batch operation:', error);
      res.status(500).json({ success: false, error: 'Ошибка при создании операции' });
    }
  });

  // GET full timeline of all operations for batch
  router.get('/batches/:id/timeline', (req, res) => {
    try {
      const { id } = req.params;

      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия не найдена'
        });
      }

      // Fetch all operations in chronological order
      const printOps = db.prepare(`
        SELECT id, 'print' as stage, status, created_at, started_at, completed_at, notes
        FROM print_sessions WHERE batch_id = ?
      `).all(id);

      const diecutOps = db.prepare(`
        SELECT id, 'diecut' as stage, status, created_at, started_at, completed_at, notes
        FROM diecut_sessions WHERE batch_id = ?
      `).all(id);

      const threadOps = db.prepare(`
        SELECT id, 'thread' as stage, status, created_at, started_at, completed_at, notes
        FROM thread_sessions WHERE batch_id = ?
      `).all(id);

      const packagingOps = db.prepare(`
        SELECT id, 'packaging' as stage, status, created_at, started_at, completed_at, notes
        FROM packaging_sessions WHERE batch_id = ?
      `).all(id);

      const perfumeOps = db.prepare(`
        SELECT id, 'perfume' as stage, status, created_at, started_at, completed_at, notes
        FROM perfume_sessions WHERE batch_id = ?
      `).all(id);

      // Combine and sort by created_at
      const timeline = [
        ...printOps,
        ...diecutOps,
        ...threadOps,
        ...packagingOps,
        ...perfumeOps
      ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      res.json({
        success: true,
        data: {
          batch: {
            id: batch.id,
            batchNumber: batch.batch_number,
            productName: batch.product_name,
            quantityPlanned: batch.quantity_planned,
            quantityProduced: batch.quantity_produced,
            status: batch.status
          },
          timeline: timeline
        }
      });
    } catch (error) {
      console.error('Error fetching batch timeline:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении графика партии'
      });
    }
  });

  return router;
};
