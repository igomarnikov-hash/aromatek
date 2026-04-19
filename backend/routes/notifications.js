const express = require('express')
const router = express.Router()
const { db } = require('../database')

// ─── Генерация уведомлений по текущему состоянию системы ───────────────────
function generateNotifications() {
  const now = new Date().toISOString()

  // 1. Критический уровень материалов (quantity <= min_quantity)
  const criticalMaterials = db.prepare(`
    SELECT name, quantity, min_quantity, unit
    FROM materials
    WHERE quantity <= min_quantity AND min_quantity > 0
  `).all()

  criticalMaterials.forEach(m => {
    const exists = db.prepare(`
      SELECT id FROM notifications
      WHERE category = 'stock' AND type = 'critical'
        AND message LIKE ? AND is_read = 0
    `).get(`%${m.name}%`)
    if (!exists) {
      db.prepare(`
        INSERT INTO notifications (type, category, title, message, link)
        VALUES ('critical', 'stock', 'Критический уровень запасов', ?, '/materials')
      `).run(`${m.name}: осталось ${m.quantity} ${m.unit} (мин. ${m.min_quantity} ${m.unit})`)
    }
  })

  // 2. Предупреждение — материал на уровне ≤ 150% от минимума, но выше минимума
  const warningMaterials = db.prepare(`
    SELECT name, quantity, min_quantity, unit
    FROM materials
    WHERE quantity > min_quantity
      AND quantity <= min_quantity * 1.5
      AND min_quantity > 0
  `).all()

  warningMaterials.forEach(m => {
    const exists = db.prepare(`
      SELECT id FROM notifications
      WHERE category = 'stock' AND type = 'warning'
        AND message LIKE ? AND is_read = 0
    `).get(`%${m.name}%`)
    if (!exists) {
      db.prepare(`
        INSERT INTO notifications (type, category, title, message, link)
        VALUES ('warning', 'stock', 'Запас подходит к минимуму', ?, '/materials')
      `).run(`${m.name}: ${m.quantity} ${m.unit} (мин. ${m.min_quantity} ${m.unit})`)
    }
  })

  // 3. Задачи в статусе in_progress более 8 часов — возможное зависание
  const staleTasks = db.prepare(`
    SELECT pt.id, tc.name as card_name, u.name as user_name, pt.start_time
    FROM production_tasks pt
    LEFT JOIN tech_cards tc ON pt.tech_card_id = tc.id
    LEFT JOIN users u ON pt.assigned_to = u.id
    WHERE pt.status = 'in_progress'
      AND pt.start_time IS NOT NULL
      AND (julianday('now') - julianday(pt.start_time)) * 24 > 8
  `).all()

  staleTasks.forEach(t => {
    const exists = db.prepare(`
      SELECT id FROM notifications
      WHERE category = 'task' AND message LIKE ? AND is_read = 0
    `).get(`%#${t.id}%`)
    if (!exists) {
      const hours = Math.round((Date.now() - new Date(t.start_time).getTime()) / 3600000)
      db.prepare(`
        INSERT INTO notifications (type, category, title, message, link)
        VALUES ('warning', 'task', 'Задача выполняется слишком долго', ?, '/tasks')
      `).run(`Задача #${t.id} «${t.card_name}» в работе уже ${hours} ч. (исполнитель: ${t.user_name || 'не назначен'})`)
    }
  })

  // 4. Задачи без исполнителя в статусе planned
  const unassignedTasks = db.prepare(`
    SELECT COUNT(*) as cnt FROM production_tasks
    WHERE status = 'planned' AND assigned_to IS NULL
  `).get()

  if (unassignedTasks.cnt > 0) {
    const exists = db.prepare(`
      SELECT id FROM notifications
      WHERE category = 'task' AND title = 'Задачи без исполнителя' AND is_read = 0
    `).get()
    if (!exists) {
      db.prepare(`
        INSERT INTO notifications (type, category, title, message, link)
        VALUES ('info', 'task', 'Задачи без исполнителя', ?, '/tasks')
      `).run(`${unassignedTasks.cnt} задач ожидают назначения исполнителя`)
    }
  }

  // 5. Задачи на проверке качества
  const qcTasks = db.prepare(`
    SELECT COUNT(*) as cnt FROM production_tasks WHERE status = 'quality_check'
  `).get()

  if (qcTasks.cnt > 0) {
    const exists = db.prepare(`
      SELECT id FROM notifications
      WHERE category = 'task' AND title = 'Контроль качества' AND is_read = 0
    `).get()
    if (!exists) {
      db.prepare(`
        INSERT INTO notifications (type, category, title, message, link)
        VALUES ('info', 'task', 'Контроль качества', ?, '/tasks')
      `).run(`${qcTasks.cnt} задач ожидают проверки качества`)
    }
  }
}

// ─── GET /notifications ─────────────────────────────────────────────────────
router.get('/notifications', (req, res) => {
  try {
    generateNotifications()

    const notifications = db.prepare(`
      SELECT * FROM notifications
      ORDER BY
        CASE type WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT 50
    `).all()

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0
    `).get().cnt

    res.json({ success: true, data: notifications, unread_count: unreadCount })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ─── PUT /notifications/:id/read ────────────────────────────────────────────
router.put('/notifications/:id/read', (req, res) => {
  try {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ─── PUT /notifications/read-all ────────────────────────────────────────────
router.put('/notifications/read-all', (req, res) => {
  try {
    db.prepare(`UPDATE notifications SET is_read = 1`).run()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ─── DELETE /notifications/read ─────────────────────────────────────────────
router.delete('/notifications/read', (req, res) => {
  try {
    db.prepare(`DELETE FROM notifications WHERE is_read = 1`).run()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

module.exports = router
