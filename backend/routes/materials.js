const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all materials with search and filter
  router.get('/materials', (req, res) => {
    try {
      const { search, category } = req.query;
      let query = 'SELECT * FROM materials WHERE 1=1';
      const params = [];

      if (search) {
        query += ' AND name LIKE ?';
        params.push(`%${search}%`);
      }

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY name';

      const materials = db.prepare(query).all(...params);

      res.json({
        success: true,
        data: materials
      });
    } catch (error) {
      console.error('Error fetching materials:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении материалов'
      });
    }
  });

  // GET materials below minimum quantity (alerts) - MUST be before :id route
  router.get('/materials/alerts', (req, res) => {
    try {
      const alerts = db.prepare(`
        SELECT id, name, category, unit, quantity, min_quantity
        FROM materials
        WHERE quantity < min_quantity
        ORDER BY quantity ASC
      `).all();

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error fetching material alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении оповещений о материалах'
      });
    }
  });

  // GET single material by ID
  router.get('/materials/:id', (req, res) => {
    try {
      const { id } = req.params;
      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Материал не найден'
        });
      }

      res.json({
        success: true,
        data: material
      });
    } catch (error) {
      console.error('Error fetching material:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении материала'
      });
    }
  });

  // POST create new material
  router.post('/materials', (req, res) => {
    try {
      const { name, category, unit, quantity, minQuantity, batchNumber } = req.body;

      if (!name || !category || !unit) {
        return res.status(400).json({
          success: false,
          error: 'Название, категория и единица измерения обязательны'
        });
      }

      const result = db.prepare(`
        INSERT INTO materials (name, category, unit, quantity, min_quantity, batch_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, category, unit, quantity || 0, minQuantity || 10, batchNumber || null);

      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        data: material
      });
    } catch (error) {
      console.error('Error creating material:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании материала'
      });
    }
  });

  // PUT update material
  router.put('/materials/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, unit, quantity, minQuantity, batchNumber } = req.body;

      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Материал не найден'
        });
      }

      db.prepare(`
        UPDATE materials
        SET name = ?, category = ?, unit = ?, quantity = ?, min_quantity = ?, batch_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name || material.name,
        category || material.category,
        unit || material.unit,
        quantity !== undefined ? quantity : material.quantity,
        minQuantity !== undefined ? minQuantity : material.min_quantity,
        batchNumber || material.batch_number,
        id
      );

      const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating material:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении материала'
      });
    }
  });

  // POST receive stock
  router.post('/materials/:id/receive', (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, userId } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Количество должно быть положительным числом'
        });
      }

      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Материал не найден'
        });
      }

      const newQuantity = material.quantity + quantity;

      db.prepare(`
        UPDATE materials
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQuantity, id);

      // Log event
      if (userId) {
        db.prepare(`
          INSERT INTO events_log (user_id, action, details)
          VALUES (?, ?, ?)
        `).run(userId, 'Материал получен', `${material.name} (+${quantity} ${material.unit})`);
      }

      const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated,
        message: `Материал получен: +${quantity} ${material.unit}`
      });
    } catch (error) {
      console.error('Error receiving material:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении материала'
      });
    }
  });

  // POST consume stock
  router.post('/materials/:id/consume', (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, userId } = req.body;

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Количество должно быть положительным числом'
        });
      }

      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);
      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Материал не найден'
        });
      }

      if (material.quantity < quantity) {
        return res.status(400).json({
          success: false,
          error: `Недостаточно материала. Доступно: ${material.quantity} ${material.unit}`
        });
      }

      const newQuantity = material.quantity - quantity;

      db.prepare(`
        UPDATE materials
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQuantity, id);

      // Log event
      if (userId) {
        db.prepare(`
          INSERT INTO events_log (user_id, action, details)
          VALUES (?, ?, ?)
        `).run(userId, 'Материал отпущен', `${material.name} (-${quantity} ${material.unit})`);
      }

      const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(id);

      res.json({
        success: true,
        data: updated,
        message: `Материал отпущен: -${quantity} ${material.unit}`
      });
    } catch (error) {
      console.error('Error consuming material:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при отпуске материала'
      });
    }
  });

  return router;
};
