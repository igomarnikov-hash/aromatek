const express = require('express')
const router = express.Router()
const { db } = require('../database')

router.get('/materials/alerts', (req, res) => {
  try {
    const alerts = db.prepare('SELECT * FROM materials WHERE quantity <= min_quantity ORDER BY quantity ASC').all()
    res.json({ success: true, data: alerts })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/materials', (req, res) => {
  try {
    let query = 'SELECT * FROM materials WHERE 1=1'
    const params = []
    if (req.query.search) { query += ' AND name LIKE ?'; params.push(`%${req.query.search}%`) }
    if (req.query.category) { query += ' AND category = ?'; params.push(req.query.category) }
    query += ' ORDER BY name'
    const materials = db.prepare(query).all(...params)
    res.json({ success: true, data: materials })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/materials/:id', (req, res) => {
  try {
    const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    if (!mat) return res.status(404).json({ success: false, error: 'Материал не найден' })
    res.json({ success: true, data: mat })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/materials', (req, res) => {
  try {
    const { name, category, unit, quantity, min_quantity, batch_number } = req.body
    if (!name || !category || !unit) return res.status(400).json({ success: false, error: 'Обязательные поля: name, category, unit' })
    const r = db.prepare('INSERT INTO materials (name, category, unit, quantity, min_quantity, batch_number) VALUES (?, ?, ?, ?, ?, ?)').run(name, category, unit, quantity || 0, min_quantity || 0, batch_number || null)
    const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(r.lastInsertRowid)
    res.status(201).json({ success: true, data: mat })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.put('/materials/:id', (req, res) => {
  try {
    const { name, category, unit, quantity, min_quantity, batch_number } = req.body
    const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    if (!mat) return res.status(404).json({ success: false, error: 'Материал не найден' })
    db.prepare('UPDATE materials SET name=?, category=?, unit=?, quantity=?, min_quantity=?, batch_number=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(name||mat.name, category||mat.category, unit||mat.unit, quantity??mat.quantity, min_quantity??mat.min_quantity, batch_number||mat.batch_number, req.params.id)
    const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/materials/:id/receive', (req, res) => {
  try {
    const { quantity, batch_number } = req.body
    if (!quantity || quantity <= 0) return res.status(400).json({ success: false, error: 'Укажите количество' })
    const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    if (!mat) return res.status(404).json({ success: false, error: 'Материал не найден' })
    db.prepare('UPDATE materials SET quantity = quantity + ?, batch_number = COALESCE(?, batch_number), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, batch_number || null, req.params.id)
    const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/materials/:id/consume', (req, res) => {
  try {
    const { quantity } = req.body
    if (!quantity || quantity <= 0) return res.status(400).json({ success: false, error: 'Укажите количество' })
    const mat = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    if (!mat) return res.status(404).json({ success: false, error: 'Материал не найден' })
    if (mat.quantity < quantity) return res.status(400).json({ success: false, error: 'Недостаточно материала на складе' })
    db.prepare('UPDATE materials SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, req.params.id)
    const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
