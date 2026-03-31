const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET all tech cards with items populated
  router.get('/techcards', (req, res) => {
    try {
      const techCards = db.prepare(`
        SELECT id, name, description, version, is_active, created_at, updated_at
        FROM tech_cards
        ORDER BY name
      `).all();

      // Populate items for each tech card
      const techCardsWithItems = techCards.map(card => {
        const items = db.prepare(`
          SELECT
            tci.id,
            tci.tech_card_id,
            tci.material_id,
            tci.quantity_per_unit,
            m.name as material_name,
            m.category,
            m.unit
          FROM tech_card_items tci
          JOIN materials m ON tci.material_id = m.id
          WHERE tci.tech_card_id = ?
        `).all(card.id);

        return {
          ...card,
          items: items
        };
      });

      res.json({
        success: true,
        data: techCardsWithItems
      });
    } catch (error) {
      console.error('Error fetching tech cards:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении технологических карт'
      });
    }
  });

  // GET single tech card with items and material names
  router.get('/techcards/:id', (req, res) => {
    try {
      const { id } = req.params;
      const techCard = db.prepare(`
        SELECT id, name, description, version, is_active, created_at, updated_at
        FROM tech_cards
        WHERE id = ?
      `).get(id);

      if (!techCard) {
        return res.status(404).json({
          success: false,
          error: 'Технологическая карта не найдена'
        });
      }

      const items = db.prepare(`
        SELECT
          tci.id,
          tci.tech_card_id,
          tci.material_id,
          tci.quantity_per_unit,
          m.name as material_name,
          m.category,
          m.unit,
          m.quantity as material_quantity
        FROM tech_card_items tci
        JOIN materials m ON tci.material_id = m.id
        WHERE tci.tech_card_id = ?
      `).all(id);

      res.json({
        success: true,
        data: {
          ...techCard,
          items: items
        }
      });
    } catch (error) {
      console.error('Error fetching tech card:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при получении технологической карты'
      });
    }
  });

  // POST create new tech card with items
  router.post('/techcards', (req, res) => {
    try {
      const { name, description, version, items } = req.body;

      if (!name || !version) {
        return res.status(400).json({
          success: false,
          error: 'Название и версия обязательны'
        });
      }

      const result = db.prepare(`
        INSERT INTO tech_cards (name, description, version, is_active)
        VALUES (?, ?, ?, 1)
      `).run(name, description || null, version);

      const techCardId = result.lastInsertRowid;

      // Add items if provided
      if (items && Array.isArray(items)) {
        const insertItem = db.prepare(`
          INSERT INTO tech_card_items (tech_card_id, material_id, quantity_per_unit)
          VALUES (?, ?, ?)
        `);

        items.forEach(item => {
          insertItem.run(techCardId, item.materialId, item.quantityPerUnit);
        });
      }

      // Fetch the complete card with items
      const techCard = db.prepare(`
        SELECT id, name, description, version, is_active, created_at, updated_at
        FROM tech_cards
        WHERE id = ?
      `).get(techCardId);

      const techCardItems = db.prepare(`
        SELECT
          tci.id,
          tci.tech_card_id,
          tci.material_id,
          tci.quantity_per_unit,
          m.name as material_name,
          m.category,
          m.unit
        FROM tech_card_items tci
        JOIN materials m ON tci.material_id = m.id
        WHERE tci.tech_card_id = ?
      `).all(techCardId);

      res.status(201).json({
        success: true,
        data: {
          ...techCard,
          items: techCardItems
        }
      });
    } catch (error) {
      console.error('Error creating tech card:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании технологической карты'
      });
    }
  });

  // PUT update tech card
  router.put('/techcards/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, version, isActive, items } = req.body;

      const techCard = db.prepare('SELECT * FROM tech_cards WHERE id = ?').get(id);
      if (!techCard) {
        return res.status(404).json({
          success: false,
          error: 'Технологическая карта не найдена'
        });
      }

      // Update main fields
      db.prepare(`
        UPDATE tech_cards
        SET name = ?, description = ?, version = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name || techCard.name,
        description !== undefined ? description : techCard.description,
        version || techCard.version,
        isActive !== undefined ? isActive : techCard.is_active,
        id
      );

      // Update items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        db.prepare('DELETE FROM tech_card_items WHERE tech_card_id = ?').run(id);

        // Insert new items
        const insertItem = db.prepare(`
          INSERT INTO tech_card_items (tech_card_id, material_id, quantity_per_unit)
          VALUES (?, ?, ?)
        `);

        items.forEach(item => {
          insertItem.run(id, item.materialId, item.quantityPerUnit);
        });
      }

      // Fetch updated card
      const updated = db.prepare(`
        SELECT id, name, description, version, is_active, created_at, updated_at
        FROM tech_cards
        WHERE id = ?
      `).get(id);

      const updatedItems = db.prepare(`
        SELECT
          tci.id,
          tci.tech_card_id,
          tci.material_id,
          tci.quantity_per_unit,
          m.name as material_name,
          m.category,
          m.unit
        FROM tech_card_items tci
        JOIN materials m ON tci.material_id = m.id
        WHERE tci.tech_card_id = ?
      `).all(id);

      res.json({
        success: true,
        data: {
          ...updated,
          items: updatedItems
        }
      });
    } catch (error) {
      console.error('Error updating tech card:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении технологической карты'
      });
    }
  });

  return router;
};
