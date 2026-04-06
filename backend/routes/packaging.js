const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Helper to generate session number
  function generateSessionNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = db.prepare('SELECT COUNT(*) as count FROM packaging_sessions WHERE created_at LIKE ?').get(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}%`);
    const nnn = String((counter.count % 1000) + 1).padStart(3, '0');
    return `UP-${dateStr}-${nnn}`;
  }

  // GET all packaging sessions with optional filter
  router.get('/packaging', (req, res) => {
    try {
      const { batchId, status } = req.query;
      let query = 'SELECT * FROM packaging_sessions WHERE 1=1';
      const params = [];

      if (batchId) {
        query += ' AND batch_id = ?';
        params.push(batchId);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const sessions = db.prepare(query).all(...params);

      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Error fetching packaging sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении сеансов упаковки'
      });
    }
  });

  // GET single packaging session by ID
  router.get('/packaging/:id', (req, res) => {
    try {
      const { id } = req.params;
      const session = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(id);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс упаковки не найден'
        });
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error fetching packaging session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении сеанса упаковки'
      });
    }
  });

  // POST create new packaging session
  router.post('/packaging', (req, res) => {
    try {
      const {
        batchId,
        threadOpId,
        quantityPlanned,
        packagingType,
        preDryRequired,
        operatorId
      } = req.body;

      if (!batchId || !operatorId || quantityPlanned === undefined) {
        return res.status(400).json({
          success: false,
          error: 'batchId, operatorId и quantityPlanned обязательны'
        });
      }

      const sessionNumber = generateSessionNumber();

      const result = db.prepare(`
        INSERT INTO packaging_sessions (
          batch_id, session_number, thread_op_id, quantity_planned,
          packaging_type, pre_dry_required, operator_id, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        batchId,
        sessionNumber,
        threadOpId || null,
        quantityPlanned,
        packagingType || null,
        preDryRequired ? 1 : 0,
        operatorId,
        'created'
      );

      const session = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error creating packaging session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании сеанса упаковки'
      });
    }
  });

  // PUT update packaging session
  router.put('/packaging/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { quantityPlanned, packagingType, preDryRequired, threadOpId } = req.body;

      const session = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс упаковки не найден'
        });
      }

      db.prepare(`
        UPDATE packaging_sessions
        SET quantity_planned = ?, packaging_type = ?, pre_dry_required = ?, thread_op_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        quantityPlanned !== undefined ? quantityPlanned : session.quantity_planned,
        packagingType !== undefined ? packagingType : session.packaging_type,
        preDryRequired !== undefined ? (preDryRequired ? 1 : 0) : session.pre_dry_required,
        threadOpId !== undefined ? threadOpId : session.thread_op_id,
        id
      );

      const updated = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating packaging session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении сеанса упаковки'
      });
    }
  });

  // POST start packaging session
  router.post('/packaging/:id/start', (req, res) => {
    try {
      const { id } = req.params;

      const session = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс упаковки не найден'
        });
      }

      db.prepare(`
        UPDATE packaging_sessions
        SET start_time = CURRENT_TIMESTAMP, status = 'packaging', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      const updated = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error starting packaging session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при начале сеанса упаковки'
      });
    }
  });

  // POST complete packaging session
  router.post('/packaging/:id/complete', (req, res) => {
    try {
      const { id } = req.params;
      const { quantityPacked, defectCount, defectNotes, endTime } = req.body;

      if (quantityPacked === undefined) {
        return res.status(400).json({
          success: false,
          error: 'quantityPacked обязателен'
        });
      }

      const session = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс упаковки не найден'
        });
      }

      db.prepare(`
        UPDATE packaging_sessions
        SET quantity_packed = ?,
            defect_count = ?,
            defect_notes = ?,
            end_time = ?,
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        quantityPacked,
        defectCount || 0,
        defectNotes || null,
        endTime || new Date().toISOString(),
        id
      );

      // If batch_id exists, update production_batches
      if (session.batch_id) {
        db.prepare(`
          UPDATE production_batches
          SET status = 'completed', quantity_produced = ?
          WHERE id = ?
        `).run(quantityPacked, session.batch_id);
      }

      const updated = db.prepare('SELECT * FROM packaging_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error completing packaging session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при завершении сеанса упаковки'
      });
    }
  });

  return router;
};
