const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // Helper to generate perfume batch number
  function generatePerfumeNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = db.prepare('SELECT COUNT(*) as count FROM perfume_batches WHERE created_at LIKE ?').get(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}%`);
    const nnn = String((counter.count % 1000) + 1).padStart(3, '0');
    return `PF-${dateStr}-${nnn}`;
  }

  // GET all perfume formulas
  router.get('/perfume/formulas', (req, res) => {
    try {
      const formulas = db.prepare('SELECT * FROM perfume_formulas ORDER BY name').all();

      res.json({
        success: true,
        data: formulas
      });
    } catch (error) {
      console.error('Error fetching perfume formulas:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении формул парфюма'
      });
    }
  });

  // GET single perfume formula by ID
  router.get('/perfume/formulas/:id', (req, res) => {
    try {
      const { id } = req.params;
      const formula = db.prepare('SELECT * FROM perfume_formulas WHERE id = ?').get(id);

      if (!formula) {
        return res.status(404).json({
          success: false,
          error: 'Формула парфюма не найдена'
        });
      }

      // Parse components JSON if present
      if (formula.components) {
        formula.components = JSON.parse(formula.components);
      }

      res.json({
        success: true,
        data: formula
      });
    } catch (error) {
      console.error('Error fetching perfume formula:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении формулы парфюма'
      });
    }
  });

  // POST create new perfume formula (admin only)
  router.post('/perfume/formulas', (req, res) => {
    try {
      const { name, components, deviationThresholdPct, createdBy, role } = req.body;

      // Admin check
      if (role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Только администраторы могут создавать формулы'
        });
      }

      if (!name || !components) {
        return res.status(400).json({
          success: false,
          error: 'name и components обязательны'
        });
      }

      const componentsJson = JSON.stringify(components);

      const result = db.prepare(`
        INSERT INTO perfume_formulas (name, components, deviation_threshold_pct, is_reference, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(name, componentsJson, deviationThresholdPct || 5, 0, createdBy || null);

      const formula = db.prepare('SELECT * FROM perfume_formulas WHERE id = ?').get(result.lastInsertRowid);
      formula.components = components;

      res.status(201).json({
        success: true,
        data: formula
      });
    } catch (error) {
      console.error('Error creating perfume formula:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании формулы парфюма'
      });
    }
  });

  // PUT update perfume formula
  router.put('/perfume/formulas/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, components, deviationThresholdPct, updatedBy, role } = req.body;

      const formula = db.prepare('SELECT * FROM perfume_formulas WHERE id = ?').get(id);
      if (!formula) {
        return res.status(404).json({
          success: false,
          error: 'Формула парфюма не найдена'
        });
      }

      // Check if reference formula and user is not admin
      if (formula.is_reference && role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Только администраторы могут редактировать эталонные формулы'
        });
      }

      const componentsJson = components ? JSON.stringify(components) : formula.components;

      db.prepare(`
        UPDATE perfume_formulas
        SET name = ?, components = ?, deviation_threshold_pct = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name || formula.name,
        componentsJson,
        deviationThresholdPct !== undefined ? deviationThresholdPct : formula.deviation_threshold_pct,
        id
      );

      const updated = db.prepare('SELECT * FROM perfume_formulas WHERE id = ?').get(id);
      updated.components = updated.components ? JSON.parse(updated.components) : [];

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating perfume formula:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении формулы парфюма'
      });
    }
  });

  // GET all perfume batches with optional filter
  router.get('/perfume/batches', (req, res) => {
    try {
      const { batchId } = req.query;
      let query = 'SELECT * FROM perfume_batches WHERE 1=1';
      const params = [];

      if (batchId) {
        query += ' AND batch_id = ?';
        params.push(batchId);
      }

      query += ' ORDER BY created_at DESC';

      const batches = db.prepare(query).all(...params);

      // Parse JSON fields
      const result = batches.map(batch => ({
        ...batch,
        actual_components: batch.actual_components ? JSON.parse(batch.actual_components) : [],
        deviation_details: batch.deviation_details ? JSON.parse(batch.deviation_details) : [],
        flip_log: batch.flip_log ? JSON.parse(batch.flip_log) : []
      }));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching perfume batches:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении партий парфюма'
      });
    }
  });

  // GET single perfume batch by ID
  router.get('/perfume/batches/:id', (req, res) => {
    try {
      const { id } = req.params;
      const batch = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(id);

      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия парфюма не найдена'
        });
      }

      batch.actual_components = batch.actual_components ? JSON.parse(batch.actual_components) : [];
      batch.deviation_details = batch.deviation_details ? JSON.parse(batch.deviation_details) : [];
      batch.flip_log = batch.flip_log ? JSON.parse(batch.flip_log) : [];

      res.json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error fetching perfume batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении партии парфюма'
      });
    }
  });

  // POST create new perfume batch
  router.post('/perfume/batches', (req, res) => {
    try {
      const { batchId, formulaId, quantityPlanned, actualComponents, operatorId } = req.body;

      if (!batchId || !formulaId || !quantityPlanned || !operatorId) {
        return res.status(400).json({
          success: false,
          error: 'batchId, formulaId, quantityPlanned и operatorId обязательны'
        });
      }

      const formula = db.prepare('SELECT * FROM perfume_formulas WHERE id = ?').get(formulaId);
      if (!formula) {
        return res.status(404).json({
          success: false,
          error: 'Формула парфюма не найдена'
        });
      }

      const perfumeNumber = generatePerfumeNumber();
      const actualComponentsJson = JSON.stringify(actualComponents || []);

      // Check for deviations
      const formulaComponents = JSON.parse(formula.components);
      let hasDeviation = 0;
      const deviationDetails = [];

      if (actualComponents && Array.isArray(actualComponents)) {
        actualComponents.forEach(actual => {
          const formulaComp = formulaComponents.find(fc => fc.name === actual.name);
          if (formulaComp) {
            const deviation = Math.abs((actual.amount - formulaComp.amount) / formulaComp.amount * 100);
            if (deviation > (formula.deviation_threshold_pct || 5)) {
              hasDeviation = 1;
              deviationDetails.push({
                component: actual.name,
                planned: formulaComp.amount,
                actual: actual.amount,
                deviationPct: deviation.toFixed(2)
              });
            }
          }
        });
      }

      const deviationDetailsJson = JSON.stringify(deviationDetails);

      const result = db.prepare(`
        INSERT INTO perfume_batches (
          batch_id, perfume_number, formula_id, quantity_planned, actual_components,
          has_deviation, deviation_details, operator_id, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        batchId,
        perfumeNumber,
        formulaId,
        quantityPlanned,
        actualComponentsJson,
        hasDeviation,
        deviationDetailsJson,
        operatorId,
        'created'
      );

      const batch = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(result.lastInsertRowid);
      batch.actual_components = actualComponents || [];
      batch.deviation_details = deviationDetails;
      batch.flip_log = [];

      res.status(201).json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error creating perfume batch:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании партии парфюма'
      });
    }
  });

  // POST start homogenization
  router.post('/perfume/batches/:id/start-homogenization', (req, res) => {
    try {
      const { id } = req.params;

      const batch = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия парфюма не найдена'
        });
      }

      const now = new Date();
      let homogenizationEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: +24 hours

      // Check if current time > 17:00
      if (now.getHours() >= 17) {
        // Schedule for next business day 09:00 + remaining hours
        const remainingHours = 24 - now.getHours();
        homogenizationEndTime = new Date(now.getTime() + (24 - now.getHours() + 9) * 60 * 60 * 1000);
        // Ensure it's set to 09:00
        homogenizationEndTime.setHours(9, 0, 0, 0);
      }

      const saturationTaskScheduledFor = homogenizationEndTime.toISOString();

      db.prepare(`
        UPDATE perfume_batches
        SET homogenization_start = CURRENT_TIMESTAMP,
            homogenization_end = ?,
            saturation_task_scheduled_for = ?,
            status = 'homogenizing',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(homogenizationEndTime.toISOString(), saturationTaskScheduledFor, id);

      const updated = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(id);
      updated.actual_components = updated.actual_components ? JSON.parse(updated.actual_components) : [];
      updated.deviation_details = updated.deviation_details ? JSON.parse(updated.deviation_details) : [];
      updated.flip_log = updated.flip_log ? JSON.parse(updated.flip_log) : [];

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error starting homogenization:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при начале гомогенизации'
      });
    }
  });

  // POST log a container flip
  router.post('/perfume/batches/:id/flip', (req, res) => {
    try {
      const { id } = req.params;
      const { doneBy } = req.body;

      if (!doneBy) {
        return res.status(400).json({
          success: false,
          error: 'doneBy обязателен'
        });
      }

      const batch = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия парфюма не найдена'
        });
      }

      const flipLog = batch.flip_log ? JSON.parse(batch.flip_log) : [];
      flipLog.push({
        time: new Date().toISOString(),
        doneBy: doneBy
      });

      const flipLogJson = JSON.stringify(flipLog);

      db.prepare(`
        UPDATE perfume_batches
        SET flip_log = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(flipLogJson, id);

      const updated = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(id);
      updated.actual_components = updated.actual_components ? JSON.parse(updated.actual_components) : [];
      updated.deviation_details = updated.deviation_details ? JSON.parse(updated.deviation_details) : [];
      updated.flip_log = JSON.parse(updated.flip_log);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error logging flip:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при логировании переворота'
      });
    }
  });

  // POST complete homogenization
  router.post('/perfume/batches/:id/complete', (req, res) => {
    try {
      const { id } = req.params;
      const { result, notes } = req.body;

      const batch = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(id);
      if (!batch) {
        return res.status(404).json({
          success: false,
          error: 'Партия парфюма не найдена'
        });
      }

      db.prepare(`
        UPDATE perfume_batches
        SET saturation_result = ?,
            homogenization_end = CURRENT_TIMESTAMP,
            saturation_notes = ?,
            status = 'completed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(result || null, notes || null, id);

      // If batch_id exists, update production_batches status to 'packaging'
      if (batch.batch_id) {
        db.prepare(`
          UPDATE production_batches
          SET status = 'packaging'
          WHERE id = ?
        `).run(batch.batch_id);
      }

      const updated = db.prepare('SELECT * FROM perfume_batches WHERE id = ?').get(id);
      updated.actual_components = updated.actual_components ? JSON.parse(updated.actual_components) : [];
      updated.deviation_details = updated.deviation_details ? JSON.parse(updated.deviation_details) : [];
      updated.flip_log = updated.flip_log ? JSON.parse(updated.flip_log) : [];

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error completing homogenization:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при завершении гомогенизации'
      });
    }
  });

  return router;
};
