const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Helper to generate session number
  function generateSessionNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = db.prepare('SELECT COUNT(*) as count FROM diecut_sessions WHERE created_at LIKE ?').get(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}%`);
    const nnn = String((counter.count % 1000) + 1).padStart(3, '0');
    return `VR-${dateStr}-${nnn}`;
  }

  // GET all diecut sessions with optional filter
  router.get('/diecut', (req, res) => {
    try {
      const { batchId, status } = req.query;
      let query = 'SELECT * FROM diecut_sessions WHERE 1=1';
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
      console.error('Error fetching diecut sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении сеансов вырубки'
      });
    }
  });

  // GET single diecut session by ID
  router.get('/diecut/:id', (req, res) => {
    try {
      const { id } = req.params;
      const session = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(id);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс вырубки не найден'
        });
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error fetching diecut session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении сеанса вырубки'
      });
    }
  });

  // POST create new diecut session
  router.post('/diecut', (req, res) => {
    try {
      const {
        batchId,
        printSessionId,
        equipmentModel,
        equipmentSerial,
        sheetsPlanned,
        quantityPlanned,
        operatorId
      } = req.body;

      if (!batchId || !printSessionId || !operatorId || sheetsPlanned === undefined) {
        return res.status(400).json({
          success: false,
          error: 'batchId, printSessionId, operatorId и sheetsPlanned обязательны'
        });
      }

      const sessionNumber = generateSessionNumber();

      const result = db.prepare(`
        INSERT INTO diecut_sessions (
          batch_id, session_number, print_session_id, equipment_model,
          equipment_serial, sheets_planned, quantity_planned, operator_id,
          status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        batchId,
        sessionNumber,
        printSessionId,
        equipmentModel || null,
        equipmentSerial || null,
        sheetsPlanned,
        quantityPlanned || null,
        operatorId,
        'created'
      );

      const session = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error creating diecut session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании сеанса вырубки'
      });
    }
  });

  // PUT update diecut session
  router.put('/diecut/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { sheetsPlanned, quantityPlanned, equipmentModel, equipmentSerial } = req.body;

      const session = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс вырубки не найден'
        });
      }

      db.prepare(`
        UPDATE diecut_sessions
        SET sheets_planned = ?, quantity_planned = ?, equipment_model = ?, equipment_serial = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        sheetsPlanned !== undefined ? sheetsPlanned : session.sheets_planned,
        quantityPlanned !== undefined ? quantityPlanned : session.quantity_planned,
        equipmentModel !== undefined ? equipmentModel : session.equipment_model,
        equipmentSerial !== undefined ? equipmentSerial : session.equipment_serial,
        id
      );

      const updated = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating diecut session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении сеанса вырубки'
      });
    }
  });

  // POST start diecut session
  router.post('/diecut/:id/start', (req, res) => {
    try {
      const { id } = req.params;

      const session = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс вырубки не найден'
        });
      }

      db.prepare(`
        UPDATE diecut_sessions
        SET start_time = CURRENT_TIMESTAMP, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);

      const updated = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error starting diecut session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при начале сеанса вырубки'
      });
    }
  });

  // POST complete diecut session
  router.post('/diecut/:id/complete', (req, res) => {
    try {
      const { id } = req.params;
      const {
        sheetsActual,
        quantityActual,
        defectUnderpress,
        defectBurr,
        defectDeform,
        defectNotes,
        storageContainer,
        storageCell
      } = req.body;

      if (sheetsActual === undefined || quantityActual === undefined) {
        return res.status(400).json({
          success: false,
          error: 'sheetsActual и quantityActual обязательны'
        });
      }

      const session = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Сеанс вырубки не найден'
        });
      }

      db.prepare(`
        UPDATE diecut_sessions
        SET sheets_actual = ?,
            quantity_actual = ?,
            defect_underpress = ?,
            defect_burr = ?,
            defect_deform = ?,
            defect_notes = ?,
            storage_container = ?,
            storage_cell = ?,
            end_time = CURRENT_TIMESTAMP,
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        sheetsActual,
        quantityActual,
        defectUnderpress || 0,
        defectBurr || 0,
        defectDeform || 0,
        defectNotes || null,
        storageContainer || null,
        storageCell || null,
        id
      );

      // If batch_id exists, update production_batches status to 'threading'
      if (session.batch_id) {
        db.prepare(`
          UPDATE production_batches
          SET status = 'threading'
          WHERE id = ?
        `).run(session.batch_id);
      }

      const updated = db.prepare('SELECT * FROM diecut_sessions WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error completing diecut session:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при завершении сеанса вырубки'
      });
    }
  });

  return router;
};
