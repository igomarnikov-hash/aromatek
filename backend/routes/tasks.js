const express = require('express')
const router = express.Router()
const { db } = require('../database')

function getTask(id) {
  return db.prepare(`
    SELECT t.*, tc.name as tech_card_name, u.name as assigned_name, u.avatar_color
    FROM production_tasks t
    LEFT JOIN tech_cards tc ON t.tech_card_id = tc.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.id = ?
  `).get(id)
}

router.get('/tasks', (req, res) => {
  try {
    let query = `
      SELECT t.*, tc.name as tech_card_name, u.name as assigned_name, u.avatar_color
      FROM production_tasks t
      LEFT JOIN tech_cards tc ON t.tech_card_id = tc.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE 1=1
    `
    const params = []
    if (req.query.status) { query += ' AND t.status = ?'; params.push(req.query.status) }
    if (req.query.assigned_to) { query += ' AND t.assigned_to = ?'; params.push(req.query.assigned_to) }
    query += ' ORDER BY t.created_at DESC'
    const tasks = db.prepare(query).all(...params)
    res.json({ success: true, data: tasks })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.get('/tasks/:id', (req, res) => {
  try {
    const task = getTask(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' })
    res.json({ success: true, data: task })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/tasks', (req, res) => {
  try {
    const { tech_card_id, assigned_to, quantity_planned, priority, due_date } = req.body
    if (!tech_card_id || !quantity_planned) return res.status(400).json({ success: false, error: 'tech_card_id и quantity_planned обязательны' })
    const r = db.prepare('INSERT INTO production_tasks (tech_card_id, assigned_to, quantity_planned, priority, due_date) VALUES (?, ?, ?, ?, ?)').run(tech_card_id, assigned_to || null, quantity_planned, priority || 'medium', due_date || null)
    res.status(201).json({ success: true, data: getTask(r.lastInsertRowid) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.put('/tasks/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' })
    const { tech_card_id, assigned_to, quantity_planned, quantity_produced, priority, due_date, status } = req.body
    db.prepare('UPDATE production_tasks SET tech_card_id=?, assigned_to=?, quantity_planned=?, quantity_produced=?, priority=?, due_date=?, status=? WHERE id=?').run(tech_card_id||task.tech_card_id, assigned_to??task.assigned_to, quantity_planned||task.quantity_planned, quantity_produced??task.quantity_produced, priority||task.priority, due_date||task.due_date, status||task.status, req.params.id)
    res.json({ success: true, data: getTask(req.params.id) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/tasks/:id/start', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' })
    db.prepare('UPDATE production_tasks SET status=?, start_time=CURRENT_TIMESTAMP WHERE id=?').run('in_progress', req.params.id)
    db.prepare('INSERT INTO events (user_id, action, details) VALUES (?, ?, ?)').run(task.assigned_to, 'Задача запущена', `ID: ${task.id}`)
    res.json({ success: true, data: getTask(req.params.id) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/tasks/:id/complete', (req, res) => {
  try {
    const { quantity_produced } = req.body
    const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' })
    const produced = quantity_produced || task.quantity_planned
    db.prepare('UPDATE production_tasks SET status=?, quantity_produced=?, end_time=CURRENT_TIMESTAMP WHERE id=?').run('completed', produced, req.params.id)
    // Авто-списание материалов
    if (task.tech_card_id) {
      const items = db.prepare('SELECT * FROM tech_card_items WHERE tech_card_id = ?').all(task.tech_card_id)
      items.forEach(item => {
        const needed = item.quantity_per_unit * produced
        db.prepare('UPDATE materials SET quantity = MAX(0, quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(needed, item.material_id)
      })
    }
    db.prepare('INSERT INTO events (user_id, action, details) VALUES (?, ?, ?)').run(task.assigned_to, 'Задача завершена', `ID: ${task.id}, произведено: ${produced} шт.`)
    res.json({ success: true, data: getTask(req.params.id) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

router.post('/tasks/:id/defect', (req, res) => {
  try {
    const { quantity_defect, defect_reason } = req.body
    const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' })
    db.prepare('UPDATE production_tasks SET quantity_defect=?, defect_reason=?, status=? WHERE id=?').run(quantity_defect||0, defect_reason||'', 'quality_check', req.params.id)
    db.prepare('INSERT INTO events (user_id, action, details) VALUES (?, ?, ?)').run(task.assigned_to, 'Зафиксирован брак', `ID: ${task.id}, брак: ${quantity_defect} шт.`)
    res.json({ success: true, data: getTask(req.params.id) })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
