const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Helper to generate session number
  function generateSessionNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = db.prepare('SELECT COUNT(*) as count FROM printing_sessions WHERE created_at LIKE ?').get(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}%`);
    const nnn = String((counter.count % 1000) + 1).padStart(3, '0');
    return `PR-${dateStr}-${nnn}`;
  }

  // GET all print sessions with optional filter
  router.get('/printing', (req, res) => {
    try {
      const { batchId, status } = req.query;
      let query = 'SELECT * FROM printing_sessions WHERE 1=1';
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
      console.error('Error fetching printing sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении сеансов печати'
      });
    }
  });

  // GET single print session with screen and ink details
  router.get('/printing/:id', (req, res) => {
    try {
      const { id } = req.params;
      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс печати не найден'
        });
      }

      // Get screen details if screenId exists
      let screen = null;
      if (session.screen_id) {
        screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(session.screen_id);
      }

      // Get ink batch details if inkBatchId exists
      let ink = null;
      if (session.ink_batch_id) {
        ink = db.prepare('SELECT * FROM ink_batches WHERE id = ?').get(session.ink_batch_id);
        if (ink && ink.components) {
          ink.components = JSON.parse(ink.components);
        }
      }

      res.json({
        success: true,
        data: {
          ...session,
          screen: screen,
          ink: ink
        }
      });
    } catch (error) {
      console.error('Error fetching printing session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении сеанса печати'
      });
    }
  });

  // POST create new print session
  router.post('/printing', (req, res) => {
    try {
      const { batchId, screenId, inkBatchId, sheetsPlanned, itemsPerSheet, operatorId } = req.body;

      if (!batchId || !screenId || !inkBatchId || !sheetsPlanned || !itemsPerSheet || !operatorId) {
        return res.status(400).json({
          success: false,
          error: 'batchId, screenId, inkBatchId, sheetsPlanned, itemsPerSheet и operatorId обязательны'
        });
      }

      const sessionNumber = generateSessionNumber();
      const quantityTotalPlanned = sheetsPlanned * itemsPerSheet;

      const result = db.prepare(`
        INSERT INTO printing_sessions (
          batch_id, session_number, screen_id, ink_batch_id, sheets_planned,
          items_per_sheet, quantity_total_planned, operator_id, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        batchId, sessionNumber, screenId, inkBatchId, sheetsPlanned,
        itemsPerSheet, quantityTotalPlanned, operatorId, 'created'
      );

      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error creating printing session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании сеанса печати'
      });
    }
  });

  // PUT update print session
  router.put('/printing/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { sheetsPlanned, itemsPerSheet } = req.body;

      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс печати не найден'
        });
      }

      const sheets = sheetsPlanned !== undefined ? sheetsPlanned : session.sheets_planned;
      const items = itemsPerSheet !== undefined ? itemsPerSheet : session.items_per_sheet;
      const quantityTotalPlanned = sheets * items;

      db.prepare(`
        UPDATE printing_sessions
        SET sheets_planned = ?, items_per_sheet = ?, quantity_total_planned = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sheets, items, quantityTotalPlanned, id);

      const updated = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating printing session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении сеанса печати'
      });
    }
  });

  // POST record side 1 start time
  router.post('/printing/:id/side1-start', (req, res) => {
    try {
      const { id } = req.params;

      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс печати не найден'
        });
      }

      db.prepare(`
        UPDATE printing_sessions
        SET side1_start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      const updated = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error recording side 1 start:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при записи времени начала стороны 1'
      });
    }
  });

  // POST record side 1 end time
  router.post('/printing/:id/side1-end', (req, res) => {
    try {
      const { id } = req.params;

      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс печати не найден'
        });
      }

      db.prepare(`
        UPDATE printing_sessions
        SET side1_end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      const updated = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error recording side 1 end:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при записи времени завершения стороны 1'
      });
    }
  });

  // POST record side 2 start time
  router.post('/printing/:id/side2-start', (req, res) => {
    try {
      const { id } = req.params;

      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс печати не найден'
        });
      }

      db.prepare(`
        UPDATE printing_sessions
        SET side2_start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      const updated = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error recording side 2 start:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при записи времени начала стороны 2'
      });
    }
  });

  // POST record side 2 end time and defects
  router.post('/printing/:id/side2-end', (req, res) => {
    try {
      const { id } = req.params;
      const {
        sheetsActual,
        defectSmear,
        defectUnderfill,
        defectOffset,
        defectScreen,
        defectOther,
        defectNotes
      } = req.body;

      if (sheetsActual === undefined) {
        return res.status(400).json({
          success: false,
          error: 'sheetsActual обязателен'
        });
      }

      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс печати не найден'
        });
      }

      // Calculate total defects
      const totalDefects = (defectSmear || 0) + (defectUnderfill || 0) + (defectOffset || 0) + (defectScreen || 0) + (defectOther || 0);
      const quantityTotalActual = sheetsActual * session.items_per_sheet - totalDefects;

      // Update screen print_cycles_used
      db.prepare(`
        UPDATE screens
        SET print_cycles_used = print_cycles_used + ?
        WHERE id = ?
      `).run(sheetsActual, session.screen_id);

      // Update printing session
      db.prepare(`
        UPDATE printing_sessions
        SET side2_end_time = CURRENT_TIMESTAMP,
            sheets_actual = ?,
            quantity_total_actual = ?,
            defect_smear = ?,
            defect_underfill = ?,
            defect_offset = ?,
            defect_screen = ?,
            defect_other = ?,
            defect_notes = ?,
            status = 'drying',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        sheetsActual,
        quantityTotalActual,
        defectSmear || 0,
        defectUnderfill || 0,
        defectOffset || 0,
        defectScreen || 0,
        defectOther || 0,
        defectNotes || null,
        id
      );

      const updated = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error recording side 2 end:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при записи времени завершения стороны 2'
      });
    }
  });

  // POST complete drying phase
  router.post('/printing/:id/drying-complete', (req, res) => {
    try {
      const { id } = req.params;
      const { dryingLoadTime, dryingUnloadTime, dryingTemperatureC, dryingResult } = req.body;

      const session = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс печати не найден'
        });
      }

      db.prepare(`
        UPDATE printing_sessions
        SET drying_load_time = ?,
            drying_unload_time = ?,
            drying_temperature_c = ?,
            drying_result = ?,
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(dryingLoadTime || null, dryingUnloadTime || null, dryingTemperatureC || null, dryingResult || null, id);

      // If batch_id exists, update production_batches status to 'diecut'
      if (session.batch_id) {
        db.prepare(`
          UPDATE production_batches
          SET status = 'diecut'
          WHERE id = ?
        `).run(session.batch_id);
      }

      const updated = db.prepare('SELECT * FROM printing_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error completing drying:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при завершении сушки'
      });
    }
  });

  return router;
};
