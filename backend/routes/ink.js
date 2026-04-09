const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Helper to generate ink batch number
  function generateInkBatchNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = db.prepare('SELECT COUNT(*) as count FROM ink_batches WHERE created_at LIKE ?').get(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}%`);
    const nnn = String((counter.count % 1000) + 1).padStart(3, '0');
    return `KR-${dateStr}-${nnn}`;
  }

  // GET all ink batches with optional filter
  router.get('/ink', (req, res) => {
    try {
      const { batchId, status } = req.query;
      let query = 'SELECT * FROM ink_batches WHERE 1=1';
      const params = [];

      if (batchId) {
        query += ' AND batch_id LIKE ?';
        params.push(`%${batchId}%`);
      }

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const batches = db.prepare(query).all(...params);

      // Parse components JSON for each batch
      const result = batches.map(batch => ({
        ...batch,
        components: batch.components ? JSON.parse(batch.components) : []
      }));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching ink batches:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении партий краски'
      });
    }
  });

  // GET single ink batch by ID
  router.get('/ink/:id', (req, res) => {
    try {
      const { id } = req.params;
      const batch = db.prepare('SELECT * FROM ink_batches WHERE id = ?').get(id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия краски не найдена'
        });
      }

      batch.components = batch.components ? JSON.parse(batch.components) : [];

      res.json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error fetching ink batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении партии краски'
      });
    }
  });

  // POST create new ink batch
  router.post('/ink', (req, res) => {
    try {
      const { batchId, productName, components, operatorId, notes } = req.body;

      if (!batchId || !productName || !operatorId) {
        return res.status(400).json({
          success: false,
          error: 'batchId, productName и operatorId обязательны'
        });
      }

      const inkBatchNumber = generateInkBatchNumber();
      const componentsJson = JSON.stringify(components || []);

      const result = db.prepare(`
        INSERT INTO ink_batches (batch_id, ink_batch_number, product_name, components, operator_id, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(batchId, inkBatchNumber, productName, componentsJson, operatorId, notes || null, 'created');

      const batch = db.prepare('SELECT * FROM ink_batches WHERE id = ?').get(result.lastInsertRowid);
      batch.components = components || [];

      res.status(201).json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error creating ink batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании партии краски'
      });
    }
  });

  // PUT update ink batch
  router.put('/ink/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { components, calibrationResult, photos, notes } = req.body;

      const batch = db.prepare('SELECT * FROM ink_batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия краски не найдена'
        });
      }

      const componentsJson = components ? JSON.stringify(components) : batch.components;
      const photosJson = photos ? JSON.stringify(photos) : batch.photos;

      db.prepare(`
        UPDATE ink_batches
        SET components = ?, calibration_result = ?, photos = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        componentsJson,
        calibrationResult || batch.calibration_result,
        photosJson,
        notes !== undefined ? notes : batch.notes,
        id
      );

      const updated = db.prepare('SELECT * FROM ink_batches WHERE id = ?').get(id);
      updated.components = updated.components ? JSON.parse(updated.components) : [];

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating ink batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении партии краски'
      });
    }
  });

  // POST calibrate ink batch
  router.post('/ink/:id/calibrate', (req, res) => {
    try {
      const { id } = req.params;
      const { result, notes } = req.body;

      if (!result || !['ok', 'needs_correction', 'defect'].includes(result)) {
        return res.status(400).json({
          success: false,
          error: 'result должен быть одним из: ok, needs_correction, defect'
        });
      }

      const batch = db.prepare('SELECT * FROM ink_batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия краски не найдена'
        });
      }

      db.prepare(`
        UPDATE ink_batches
        SET calibration_result = ?, calibration_notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(result, notes || null, result === 'ok' ? 'ready' : result, id);

      const updated = db.prepare('SELECT * FROM ink_batches WHERE id = ?').get(id);
      updated.components = updated.components ? JSON.parse(updated.components) : [];

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error calibrating ink batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при калибровке партии краски'
      });
    }
  });

  return router;
};
