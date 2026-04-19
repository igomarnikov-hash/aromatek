const express = require('express')
const router = express.Router()
const { db } = require('../database')

function getCardWithItems(id) {
  const card = db.prepare('SELECT * FROM tech_cards WHERE id = ?').get(id)
  if (!card) return null
  const items = db.prepare(`
    SELECT tci.*, m.name as material_name, m.unit 
    FROM tech_card_items tci 
    JOIN materials m ON tci.material_id = m.id 
    WHERE tci.tech_card_id = ?
  `).all(id)
  return { ...card, items, steps: JSON.parse(card.steps || '[]') }
}

router.get('/techcards', (req, res) => {
  try {
    const cards = db.prepare('SELECT * FROM tech_cards ORDER BY name').all()
    const result = cards.map(c => {
      const items = db.prepare(`
        SELECT tci.*, m.name as material_name, m.unit 
        FROM tech_card_items tci 
        JOIN materials m ON tci.material_id = m.id 
        WHERE tci.tech_card_id = ?
      `).all(c.id)
      return { ...c, items, steps: JSON.parse(c.steps || '[]') }
    })
    res.json({ success: true, data: result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/techcards/:id', (req, res) => {
  try {
    const card = getCardWithItems(req.params.id)
    if (!card) return res.status(404).json({ success: false, error: 'Тех. карта не найдена' })
    res.json({ success: true, data: card })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/techcards', (req, res) => {
  try {
    const { name, description, version, duration_minutes, steps, items } = req.body
    if (!name) return res.status(400).json({ success: false, error: 'Название обязательно' })
    const r = db.prepare('INSERT INTO tech_cards (name, description, version, duration_minutes, steps) VALUES (?, ?, ?, ?, ?)').run(name, description || '', version || '1.0', duration_minutes || 60, JSON.stringify(steps || []))
    if (items && items.length > 0) {
      const ins = db.prepare('INSERT INTO tech_card_items (tech_card_id, material_id, quantity_per_unit) VALUES (?, ?, ?)')
      items.forEach(item => ins.run(r.lastInsertRowid, item.material_id, item.quantity_per_unit))
    }
    res.status(201).json({ success: true, data: getCardWithItems(r.lastInsertRowid) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.put('/techcards/:id', (req, res) => {
  try {
    const { name, description, version, duration_minutes, steps, is_active } = req.body
    const card = db.prepare('SELECT * FROM tech_cards WHERE id = ?').get(req.params.id)
    if (!card) return res.status(404).json({ success: false, error: 'Тех. карта не найдена' })
    db.prepare('UPDATE tech_cards SET name=?, description=?, version=?, duration_minutes=?, steps=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name||card.name, description??card.description, version||card.version, duration_minutes||card.duration_minutes, JSON.stringify(steps||JSON.parse(card.steps||'[]')), is_active??card.is_active, req.params.id)
    res.json({ success: true, data: getCardWithItems(req.params.id) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
